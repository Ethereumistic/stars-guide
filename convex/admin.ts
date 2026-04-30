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
// CONTEXT SLOTS (Split & Versioned Master Context)
// ═══════════════════════════════════════════════════════════════════════════

export const getAllContextSlots = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("contextSlots")
            .withIndex("by_order")
            .collect();
    },
});

export const getContextSlot = query({
    args: { slotKey: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db
            .query("contextSlots")
            .withIndex("by_slotKey", (q) => q.eq("slotKey", args.slotKey))
            .unique();
    },
});

export const upsertContextSlot = mutation({
    args: {
        slotKey: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        const existing = await ctx.db
            .query("contextSlots")
            .withIndex("by_slotKey", (q) => q.eq("slotKey", args.slotKey))
            .unique();

        if (existing) {
            // Copy current content → previousContent, increment version
            await ctx.db.patch(existing._id, {
                content: args.content,
                previousContent: existing.content,
                version: existing.version + 1,
                updatedAt: Date.now(),
                updatedBy: userId,
            });
            return existing._id;
        } else {
            throw new Error(`Context slot "${args.slotKey}" not found. Use seedContextSlots to create initial slots.`);
        }
    },
});

export const revertContextSlot = mutation({
    args: { slotKey: v.string() },
    handler: async (ctx, args) => {
        const { userId } = await requireAdmin(ctx);

        const slot = await ctx.db
            .query("contextSlots")
            .withIndex("by_slotKey", (q) => q.eq("slotKey", args.slotKey))
            .unique();

        if (!slot) throw new Error(`Context slot "${args.slotKey}" not found.`);
        if (!slot.previousContent) throw new Error("No previous content to revert to.");

        await ctx.db.patch(slot._id, {
            content: slot.previousContent,
            previousContent: slot.content, // Keep what we just reverted FROM as the new previous
            version: slot.version + 1,
            updatedAt: Date.now(),
            updatedBy: userId,
        });
    },
});

export const toggleContextSlot = mutation({
    args: { slotKey: v.string() },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const slot = await ctx.db
            .query("contextSlots")
            .withIndex("by_slotKey", (q) => q.eq("slotKey", args.slotKey))
            .unique();

        if (!slot) throw new Error(`Context slot "${args.slotKey}" not found.`);

        await ctx.db.patch(slot._id, {
            isEnabled: !slot.isEnabled,
            updatedAt: Date.now(),
        });
    },
});

export const reorderContextSlot = mutation({
    args: {
        slotKey: v.string(),
        newOrder: v.number(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const slot = await ctx.db
            .query("contextSlots")
            .withIndex("by_slotKey", (q) => q.eq("slotKey", args.slotKey))
            .unique();

        if (!slot) throw new Error(`Context slot "${args.slotKey}" not found.`);

        await ctx.db.patch(slot._id, {
            order: args.newOrder,
            updatedAt: Date.now(),
        });
    },
});

/**
 * seedContextSlots — Populate the 4 initial context slots.
 * Idempotent: skips slots that already exist.
 */
export const seedContextSlots = mutation({
    args: {},
    handler: async (ctx) => {
        const { userId } = await requireAdmin(ctx);

        const existing = await ctx.db.query("contextSlots").first();
        if (existing) return { status: "skipped", message: "Context slots already seeded" };

        const now = Date.now();
        const initialSlots = [
            {
                slotKey: "identity",
                label: "AI Identity & Persona",
                content: "You are an expert astrologer and empathetic writer for stars.guide, a premium daily horoscope platform. You write horoscopes that feel personal, specific, and emotionally resonant — never generic. You speak with warmth, authority, and subtle wit. You never lecture. You never predict catastrophes. You describe energies, not outcomes.",
                order: 1,
                isEnabled: true,
                version: 1,
                updatedAt: now,
                updatedBy: userId,
            },
            {
                slotKey: "sign_voices",
                label: "Sign Voice Guidelines",
                content: "Each sign has a Likely Felt State — the emotional posture a reader of this sign is probably holding today. Use the zeitgeist to map the collective mood onto each sign's unique psychology. Aries feels the world through impulse and courage; Taurus through the body and stability; Gemini through language and curiosity; Cancer through memory and protection; Leo through identity and expression; Virgo through analysis and service; Libra through relationship and aesthetics; Scorpio through intensity and truth; Sagittarius through meaning and freedom; Capricorn through structure and legacy; Aquarius through vision and rebellion; Pisces through imagination and dissolution.",
                order: 2,
                isEnabled: true,
                version: 1,
                updatedAt: now,
                updatedBy: userId,
            },
            {
                slotKey: "output_rules",
                label: "Output Rules",
                content: "TONE RULES:\n- Write in second person (\"you\")\n- Present tense\n- No questions unless rhetorical\n- No astrology jargon visible to the reader (translate planet names into felt language)\n- No medical, financial, or legal advice\n- No mention of specific countries, leaders, or news events\n- Cultural neutrality: must resonate across nationalities\n- Length: 330–460 characters (strict — this is for mobile push notifications)\n- Never start with \"Today...\" or \"This week...\" — open with the hook\n- End without a cliché (no \"trust the universe\", no \"stay strong\")",
                order: 3,
                isEnabled: true,
                version: 1,
                updatedAt: now,
                updatedBy: userId,
            },
            {
                slotKey: "format_schema",
                label: "JSON Format Schema",
                content: "OUTPUT FORMAT:\nYou must output ONLY valid JSON, no markdown, no preamble:\n{ \"sign\": \"[Sign Name]\", \"date\": \"YYYY-MM-DD\", \"content\": \"[Your horoscope text]\" }\n\nThe content field must contain your horoscope text, 330–460 characters.\nDo not include any other fields. Do not wrap in code blocks.",
                order: 4,
                isEnabled: true,
                version: 1,
                updatedAt: now,
                updatedBy: userId,
            },
        ];

        for (const slot of initialSlots) {
            await ctx.db.insert("contextSlots", slot);
        }

        return { status: "seeded", message: "4 context slots created" };
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
        validFrom: v.optional(v.string()),
        validUntil: v.optional(v.string()),
        emotionalRegister: v.optional(v.string()),
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
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            emotionalRegister: args.emotionalRegister,
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
                total: args.targetSigns.length * args.targetDates.length,
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
 * upsertHoroscopes — Legacy batch mutation (kept for backward compat).
 * The v4 engine uses upsertHoroscope (singular) instead.
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
                if (existing.content === entry.content) continue;
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

/**
 * upsertHoroscope — v4 single sign/date mutation.
 * Called once per LLM response (one sign, one date).
 * 1. Content identical → skip
 * 2. Content different → overwrite, reset status to "draft"
 * 3. No existing record → insert as "draft"
 */
export const upsertHoroscope = internalMutation({
    args: {
        data: v.object({
            sign: v.string(),
            date: v.string(),
            content: v.string(),
        }),
        zeitgeistId: v.id("zeitgeists"),
        jobId: v.id("generationJobs"),
    },
    handler: async (ctx, args) => {
        const { sign, date, content } = args.data;

        const existing = await ctx.db
            .query("horoscopes")
            .withIndex("by_sign_and_date", (q) =>
                q.eq("sign", sign).eq("targetDate", date)
            )
            .first();

        if (existing) {
            // Skip if content is identical
            if (existing.content === content) return;

            // Overwrite — reset to draft if previously published
            await ctx.db.patch(existing._id, {
                content,
                status: "draft",
                zeitgeistId: args.zeitgeistId,
                generatedBy: args.jobId,
            });
        } else {
            await ctx.db.insert("horoscopes", {
                sign,
                targetDate: date,
                content,
                status: "draft",
                zeitgeistId: args.zeitgeistId,
                generatedBy: args.jobId,
            });
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
        editReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const horoscope = await ctx.db.get(args.horoscopeId);
        if (!horoscope) throw new Error("Horoscope not found");

        const patch: Record<string, unknown> = {
            content: args.content,
            status: "draft", // Force re-review after edit
            editCount: (horoscope.editCount ?? 0) + 1,
        };

        if (args.editReason) {
            patch.editReason = args.editReason;
        }

        await ctx.db.patch(args.horoscopeId, patch);
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
