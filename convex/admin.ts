import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/adminGuard";

// ─── VALID SIGNS (Canonical list) ─────────────────────────────────────────
const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM SETTINGS (Master Context CRUD)
// ═══════════════════════════════════════════════════════════════════════════

export const getSystemSetting = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        // Admin guard for reading settings
        await requireAdmin(ctx);
        return await ctx.db
            .query("systemSettings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();
    },
});

export const upsertSystemSetting = mutation({
    args: {
        key: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        const existing = await ctx.db
            .query("systemSettings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("systemSettings", {
                key: args.key,
                content: args.content,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ZEITGEIST CRUD
// ═══════════════════════════════════════════════════════════════════════════

export const getZeitgeists = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("zeitgeists")
            .withIndex("by_createdAt")
            .order("desc")
            .take(50);
    },
});

export const getZeitgeist = query({
    args: { id: v.id("zeitgeists") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.get(args.id);
    },
});

export const createZeitgeist = mutation({
    args: {
        title: v.string(),
        isManual: v.boolean(),
        archetypes: v.optional(v.array(v.string())),
        summary: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);
        return await ctx.db.insert("zeitgeists", {
            title: args.title,
            isManual: args.isManual,
            archetypes: args.archetypes,
            summary: args.summary,
            createdBy: userId,
            createdAt: Date.now(),
        });
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION JOBS — Fire-and-Forget Pattern
// ═══════════════════════════════════════════════════════════════════════════

/**
 * startGeneration — Lightweight mutation called by the client.
 * 1. Validates admin role
 * 2. Checks for conflicting running jobs (concurrency guard)
 * 3. Creates a generationJobs record
 * 4. Schedules the internal action to run server-side
 * 5. Returns the jobId for the client to subscribe to progress
 */
export const startGeneration = mutation({
    args: {
        zeitgeistId: v.id("zeitgeists"),
        modelId: v.string(),
        targetDates: v.array(v.string()),
        targetSigns: v.array(v.string()),
        // v3: Emotional Translation Layer fields
        rawZeitgeist: v.optional(v.string()),
        emotionalZeitgeist: v.optional(v.string()),
        hookId: v.optional(v.id("hooks")),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        // Validate signs
        for (const sign of args.targetSigns) {
            if (!(VALID_SIGNS as readonly string[]).includes(sign)) {
                throw new Error(`Invalid sign: ${sign}`);
            }
        }

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const date of args.targetDates) {
            if (!dateRegex.test(date)) {
                throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
            }
        }

        // Concurrency guard: Check for existing running jobs with overlapping dates
        const runningJobs = await ctx.db
            .query("generationJobs")
            .withIndex("by_status", (q) => q.eq("status", "running"))
            .collect();

        for (const job of runningJobs) {
            const overlap = job.targetDates.some((d) => args.targetDates.includes(d));
            if (overlap) {
                throw new Error(
                    "A generation job for overlapping dates is already running. " +
                    "Please wait for it to complete or cancel it first."
                );
            }
        }

        // Verify zeitgeist exists
        const zeitgeist = await ctx.db.get(args.zeitgeistId);
        if (!zeitgeist) throw new Error("Zeitgeist not found");

        // Create the job record
        const jobId = await ctx.db.insert("generationJobs", {
            adminUserId: userId,
            zeitgeistId: args.zeitgeistId,
            modelId: args.modelId,
            targetDates: args.targetDates,
            targetSigns: args.targetSigns,
            status: "running",
            progress: {
                completed: 0,
                failed: 0,
                total: args.targetSigns.length,
            },
            startedAt: Date.now(),
            // v3: Store raw + emotional zeitgeist and hook assignment
            rawZeitgeist: args.rawZeitgeist,
            emotionalZeitgeist: args.emotionalZeitgeist,
            hookId: args.hookId,
        });

        // Fire-and-forget: schedule the AI action to run server-side
        await ctx.scheduler.runAfter(0, internal.ai.runGenerationJob, { jobId });

        return jobId;
    },
});

/**
 * getJobProgress — Reactive query for live progress display.
 * The client subscribes to this and gets real-time updates via Convex reactivity.
 */
export const getJobProgress = query({
    args: { jobId: v.id("generationJobs") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.get(args.jobId);
    },
});

/**
 * getRecentJobs — List recent generation jobs for the admin dashboard.
 */
export const getRecentJobs = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("generationJobs")
            .order("desc")
            .take(20);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS (Called only by server-side actions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * updateJobProgress — Called by the AI action after each sign completes.
 */
export const updateJobProgress = internalMutation({
    args: {
        jobId: v.id("generationJobs"),
        completed: v.optional(v.number()),
        failed: v.optional(v.number()),
        errors: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.jobId);
        if (!job) return;

        const progress = { ...job.progress };
        if (args.completed !== undefined) progress.completed = args.completed;
        if (args.failed !== undefined) progress.failed = args.failed;

        const patch: Record<string, unknown> = { progress };
        if (args.errors) patch.errors = args.errors;

        await ctx.db.patch(args.jobId, patch);
    },
});

/**
 * completeJob — Called when all signs have been processed successfully.
 */
export const completeJob = internalMutation({
    args: {
        jobId: v.id("generationJobs"),
        status: v.union(v.literal("completed"), v.literal("partial")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.jobId, {
            status: args.status,
            completedAt: Date.now(),
        });
    },
});

/**
 * failJob — Called when the failure cap is exceeded or a fatal error occurs.
 */
export const failJob = internalMutation({
    args: {
        jobId: v.id("generationJobs"),
        errors: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.jobId, {
            status: "failed",
            errors: args.errors,
            completedAt: Date.now(),
        });
    },
});

/**
 * upsertHoroscopes — The Smart Overwrite mutation.
 * 1. Content identical → skip
 * 2. Content different → overwrite, reset status to "draft"
 * 3. No existing record → insert as "draft"
 */
export const upsertHoroscopes = internalMutation({
    args: {
        data: v.object({
            sign: v.string(),
            horoscopes: v.array(v.object({
                date: v.string(),
                content: v.string(),
            })),
        }),
        zeitgeistId: v.id("zeitgeists"),
        jobId: v.id("generationJobs"),
    },
    handler: async (ctx, args) => {
        for (const entry of args.data.horoscopes) {
            const existing = await ctx.db
                .query("horoscopes")
                .withIndex("by_sign_and_date", (q) =>
                    q.eq("sign", args.data.sign).eq("targetDate", entry.date)
                )
                .first();

            if (existing) {
                // Skip if content is identical (avoid unnecessary writes)
                if (existing.content === entry.content) continue;

                // Overwrite — reset to draft if previously published
                await ctx.db.patch(existing._id, {
                    content: entry.content,
                    status: "draft",
                    zeitgeistId: args.zeitgeistId,
                    generatedBy: args.jobId,
                });
            } else {
                await ctx.db.insert("horoscopes", {
                    sign: args.data.sign,
                    targetDate: entry.date,
                    content: entry.content,
                    status: "draft",
                    zeitgeistId: args.zeitgeistId,
                    generatedBy: args.jobId,
                });
            }
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// HOROSCOPE REVIEW & PUBLISH (Admin-facing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getHoroscopesByDate — Fetch all horoscopes for a date range (admin review).
 */
export const getHoroscopesByDate = query({
    args: {
        dates: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const results = [];
        for (const date of args.dates) {
            const horoscopes = await ctx.db
                .query("horoscopes")
                .withIndex("by_date", (q) => q.eq("targetDate", date))
                .collect();
            results.push(...horoscopes);
        }
        return results;
    },
});

/**
 * publishHoroscopes — Bulk update status from "draft" to "published".
 */
export const publishHoroscopes = mutation({
    args: {
        horoscopeIds: v.array(v.id("horoscopes")),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        for (const id of args.horoscopeIds) {
            const horoscope = await ctx.db.get(id);
            if (horoscope && horoscope.status === "draft") {
                await ctx.db.patch(id, { status: "published" });
            }
        }
    },
});

/**
 * unpublishHoroscope — Revert a published horoscope back to draft.
 */
export const unpublishHoroscope = mutation({
    args: { horoscopeId: v.id("horoscopes") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const horoscope = await ctx.db.get(args.horoscopeId);
        if (horoscope && horoscope.status === "published") {
            await ctx.db.patch(args.horoscopeId, { status: "draft" });
        }
    },
});

/**
 * updateHoroscopeContent — Inline edit a horoscope's content from the review table.
 * Resets status to "draft" if the horoscope was previously published.
 */
export const updateHoroscopeContent = mutation({
    args: {
        horoscopeId: v.id("horoscopes"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const horoscope = await ctx.db.get(args.horoscopeId);
        if (!horoscope) throw new Error("Horoscope not found");

        await ctx.db.patch(args.horoscopeId, {
            content: args.content,
            status: "draft", // Force re-review after edit
        });
    },
});

/**
 * deleteHoroscope — Permanently delete a horoscope entry.
 */
export const deleteHoroscope = mutation({
    args: { horoscopeId: v.id("horoscopes") },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const horoscope = await ctx.db.get(args.horoscopeId);
        if (!horoscope) throw new Error("Horoscope not found");
        await ctx.db.delete(args.horoscopeId);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// ZEITGEIST AI SYNTHESIS (Public action wrapper)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * synthesizeZeitgeistAction — Public action wrapper for AI zeitgeist synthesis.
 * Validates admin auth, then delegates to the internal action in ai.ts.
 */
export const synthesizeZeitgeistAction = action({
    args: {
        archetypes: v.array(v.string()),
        modelId: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        // Validate admin auth via internal query
        const userId = await ctx.runQuery(internal.aiQueries.validateAdmin, {});
        if (!userId) {
            throw new Error("UNAUTHORIZED: Admin access required");
        }

        // Delegate to the internal synthesis action
        const summary: string = await ctx.runAction(internal.ai.synthesizeZeitgeist, {
            archetypes: args.archetypes,
            modelId: args.modelId,
        });

        return summary;
    },
});

/**
 * synthesizeEmotionalZeitgeistAction — Public action wrapper for the v3
 * Emotional Translation Layer. Converts raw events into how people FEEL.
 */
export const synthesizeEmotionalZeitgeistAction = action({
    args: {
        rawEvents: v.string(),
        modelId: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        const userId = await ctx.runQuery(internal.aiQueries.validateAdmin, {});
        if (!userId) {
            throw new Error("UNAUTHORIZED: Admin access required");
        }

        const result: string = await ctx.runAction(internal.ai.synthesizeEmotionalZeitgeist, {
            rawEvents: args.rawEvents,
            modelId: args.modelId,
        });

        return result;
    },
});
