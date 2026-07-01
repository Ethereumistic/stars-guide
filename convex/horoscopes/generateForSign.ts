/**
 * convex/horoscopes/generateForSign.ts — Sign-level horoscope generation action.
 *
 * v2.0 — Updated to match new prompt output schema:
 *   - hook + bodyText (≤ 450 chars combined) replaces insight/energy/navigate
 *   - mantra is now required (replaces static motto on sign page)
 *   - dailyPillars replaces cosmicDetails (4-grid on sign page)
 *   - Zod validation matches v2.0 prompt output
 *
 * Flow:
 *   1. Validate sign + resolve date
 *   2. Load cosmic weather data
 *   3. Build prompt via buildHoroscopePrompt (v2.0)
 *   4. Resolve LLM provider + model
 *   5. Call LLM
 *   6. Sanitize + parse JSON
 *   7. Validate against HoroscopeContent Zod schema (v2.0)
 *   8. Upsert daily_horoscopes record
 *   9. Retry once on failure
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import {
    parseProvidersConfig,
    callLLMEndpoint,
    resolveProvider,
    getDefaultFallbackModel,
    type LLMProvider,
    type ProviderType,
} from "../lib/llmProvider";
import { buildHoroscopePrompt, VERSION as PROMPT_VERSION, type DailyAstrologyContext } from "./prompt";

const { internal } = require("../_generated/api") as any;

// ─── Constants ─────────────────────────────────────────────────────────────

const RETRY_DELAYS = [3000, 10000, 30000]; // exponential backoff: 3s, 10s, 30s

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

/** v2.0 output schema — matches the prompt in prompt.ts */
const DailyPillarsSchema = z.object({
    vibe: z.string().min(2).max(50),
    powerMove: z.string().min(2).max(50),
    blindSpot: z.string().min(2).max(50),
    luckySpark: z.string().min(2).max(50),
});

const DomainScoreSchema = z.object({
    name: z.enum(["Love", "Career", "Family", "Health", "Finance", "Creativity", "Social", "Spirituality"]),
    score: z.number().int().min(0).max(100),
});

const HoroscopeContentSchema = z.object({
    hook: z.string().min(10).max(120),
    bodyText: z.string().min(50).max(400),
    mantra: z.string().min(5).max(80),
    dailyPillars: DailyPillarsSchema,
    domainScores: z.array(DomainScoreSchema).min(6).max(6),
});

// ─── Utilities ─────────────────────────────────────────────────────────────

function sanitizeLLMJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Internal Query — resolve providers_config from oracle_settings ─────────

export const getOracleProvidersConfig = internalQuery({
    args: {},
    handler: async (ctx) => {
        const row = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "providers_config"))
            .first();
        return row?.value ?? undefined;
    },
});

// ─── Internal Query — resolve horoscope-specific model settings ───────────

export const getHoroscopeModelSettings = internalQuery({
    args: {},
    handler: async (ctx) => {
        const [providerRow, modelRow, fallbackProviderRow, fallbackModelRow] = await Promise.all([
            ctx.db
                .query("oracle_settings")
                .withIndex("by_key", (q) => q.eq("key", "horoscope_provider"))
                .first(),
            ctx.db
                .query("oracle_settings")
                .withIndex("by_key", (q) => q.eq("key", "horoscope_model"))
                .first(),
            ctx.db
                .query("oracle_settings")
                .withIndex("by_key", (q) => q.eq("key", "horoscope_fallback_provider"))
                .first(),
            ctx.db
                .query("oracle_settings")
                .withIndex("by_key", (q) => q.eq("key", "horoscope_fallback_model"))
                .first(),
        ]);
        return {
            providerId: providerRow?.value ?? undefined,
            modelId: modelRow?.value ?? undefined,
            fallbackProviderId: fallbackProviderRow?.value ?? undefined,
            fallbackModelId: fallbackModelRow?.value ?? undefined,
        };
    },
});

// ─── Internal Query — get cosmic weather for felt language ──────────────────

export const getCosmicWeatherForFelt = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, { date }) => {
        return await ctx.db
            .query("cosmicWeather")
            .withIndex("by_date", (q) => q.eq("date", date))
            .unique();
    },
});

// ─── Internal Query — get already-generated horoscopes for similarity guard ─

export const getGeneratedHoroscopesForDate = internalQuery({
    args: { date: v.string(), excludeSign: v.string() },
    handler: async (ctx, { date, excludeSign }) => {
        return await ctx.db
            .query("daily_horoscopes")
            .withIndex("by_date", (q) => q.eq("date", date))
            .collect()
            .then((rows) =>
                rows
                    .filter((r) => r.sign !== excludeSign && (r.status === "generated" || r.status === "overridden"))
                    .map((r) => ({
                        sign: r.sign,
                        hook: (r.content as any)?.hook ?? "",
                        bodyText: (r.content as any)?.bodyText ?? "",
                    }))
            );
    },
});

// ─── Internal Mutation — upsert daily_horoscopes ───────────────────────────

export const upsertHoroscope = internalMutation({
    args: {
        date: v.string(),
        sign: v.string(),
        status: v.union(
            v.literal("generated"),
            v.literal("failed"),
        ),
        content: v.optional(v.any()),
        errors: v.optional(v.array(v.string())),
        modelUsed: v.optional(v.string()),
        promptVersion: v.optional(v.string()),
        generationDurationMs: v.optional(v.number()),
        contextSnapshotId: v.optional(v.id("daily_astrology_context")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("daily_horoscopes")
            .withIndex("by_date_sign", (q) =>
                q.eq("date", args.date).eq("sign", args.sign)
            )
            .first();

        const fields: Record<string, unknown> = {
            status: args.status,
            promptVersion: args.promptVersion,
        };

        if (args.status === "generated" && args.content) {
            fields.content = args.content;
            fields.generatedAt = Date.now();
            fields.modelUsed = args.modelUsed;
            fields.generationDurationMs = args.generationDurationMs;
            fields.contextSnapshotId = args.contextSnapshotId ?? undefined;
        }

        if (args.status === "failed" && args.errors && args.errors.length > 0) {
            fields.content = {
                hook: "Generation failed.",
                bodyText: "Please check back shortly.",
                mantra: "I am patient with the process.",
                dailyPillars: {
                    vibe: "recovering",
                    powerMove: "Try again later",
                    blindSpot: "Temporary disruption",
                    luckySpark: "A fresh start",
                },
                domainScores: [
                    { name: "Love" as const, score: 50 },
                    { name: "Career" as const, score: 50 },
                    { name: "Family" as const, score: 50 },
                    { name: "Health" as const, score: 50 },
                    { name: "Finance" as const, score: 50 },
                    { name: "Social" as const, score: 50 },
                ],
            };
            fields.errors = args.errors;
        }

        if (existing) {
            if (["pending", "failed"].includes(existing.status)) {
                await ctx.db.patch(existing._id, fields);
            }
        } else {
            await ctx.db.insert("daily_horoscopes", {
                date: args.date,
                sign: args.sign,
                status: args.status,
                content: args.content ?? {
                    hook: "Not yet generated.",
                    bodyText: "Pending generation.",
                    mantra: "I trust the timing.",
                    dailyPillars: {
                        vibe: "pending",
                        powerMove: "Awaiting forecast",
                        blindSpot: "Coming soon",
                        luckySpark: "On the way",
                    },
                    domainScores: [
                        { name: "Love", score: 50 },
                        { name: "Career", score: 50 },
                        { name: "Family", score: 50 },
                        { name: "Health", score: 50 },
                        { name: "Finance", score: 50 },
                        { name: "Social", score: 50 },
                    ],
                },
                promptVersion: args.promptVersion,
                ...(args.modelUsed ? { modelUsed: args.modelUsed } : {}),
                ...(args.generationDurationMs !== undefined
                    ? { generationDurationMs: args.generationDurationMs }
                    : {}),
                ...(args.contextSnapshotId ? { contextSnapshotId: args.contextSnapshotId } : {}),
            } satisfies Record<string, unknown>);
        }
    },
});

// ─── Main Action ───────────────────────────────────────────────────────────

export const generateForSign = internalAction({
    args: {
        sign: v.string(),
        date: v.optional(v.string()),  // defaults to today
        providerId: v.optional(v.string()),   // admin override
        modelId: v.optional(v.string()),      // admin override
    },
    handler: async (ctx, args) => {
        const sign = args.sign;
        // Use UTC date to avoid timezone mismatches with context data
        const date = args.date ?? new Date().toISOString().split("T")[0];

        // ── 1. Validate sign ────────────────────────────────────────────────
        if (!(VALID_SIGNS as readonly string[]).includes(sign)) {
            throw new Error(
                `Invalid sign: "${sign}". Must be one of: ${VALID_SIGNS.join(", ")}`
            );
        }

        // ── 2. Load daily_astrology_context ──────────────────────────────────
        let ctxRecord = await ctx.runQuery(
            internal.horoscopes.computeDailyContext.getDailyAstrologyContext,
            { date },
        );

        // If not populated yet, compute it now
        if (!ctxRecord) {
            console.log(`[generateForSign] No daily_astrology_context for ${date}, computing...`);
            await ctx.runAction(internal.horoscopes.computeDailyContext.computeDailyContext, { date });
            ctxRecord = await ctx.runQuery(
                internal.horoscopes.computeDailyContext.getDailyAstrologyContext,
                { date },
            );
            if (!ctxRecord) {
                throw new Error(`Failed to compute daily_astrology_context for ${date}`);
            }
        }

        // Fetch felt language from cosmic weather
        const cosmicWeather = await ctx.runQuery(
            internal.horoscopes.generateForSign.getCosmicWeatherForFelt,
            { date },
        );

        // Map daily_astrology_context -> DailyAstrologyContext for the prompt builder
        const context: DailyAstrologyContext = {
            date: ctxRecord.date,
            planetPositions: ctxRecord.planetPositions.map((p: any) => ({
                planet: p.planet,
                sign: p.sign,
                degreeInSign: p.degree,
                isRetrograde: p.retrograde,
            })),
            moonPhase: {
                name: ctxRecord.moonPhase.name,
                illumination: ctxRecord.moonPhase.illumination,
                emoji: ctxRecord.moonPhase.emoji ?? "🌙",
            },
            activeAspects: ctxRecord.activeAspects.map((a: any) => ({
                planetA: a.planetA,
                planetB: a.planetB,
                aspectType: a.aspectType,
                orb: a.orb,
                influence: a.influence,
            })),
            retrogradeContext: ctxRecord.retrogradeContext ?? { current: [], upcoming: [], recentDirect: [] },
            retrogradePlanets: ctxRecord.retrogradePlanets ?? undefined,
            dominantThemes: ctxRecord.dominantThemes ?? [],
            energySignature: ctxRecord.energySignature ?? "dynamic",
            voidOfCourseMoon: ctxRecord.voidOfCourseMoon
                ? { isVoid: ctxRecord.voidOfCourseMoon.isVoid, inSign: ctxRecord.voidOfCourseMoon.inSign, untilSign: ctxRecord.voidOfCourseMoon.untilSign }
                : undefined,
            moonNextIngress: ctxRecord.moonNextIngress ?? undefined,
            dominantElement: ctxRecord.dominantElement ?? undefined,
            stelliumSign: ctxRecord.stelliumSign ?? undefined,
            aspectSummary: ctxRecord.aspectSummary ?? undefined,
            feltLanguage: cosmicWeather?.feltLanguage ?? undefined,
        };

        // ── 3. Build prompt ────────────────────────────────────────────────
        const { system, user } = buildHoroscopePrompt({ sign, context });

        // ── 4. Resolve LLM provider + model ─────────────────────────────────────────
        const rawConfig = await ctx.runQuery(
            internal.horoscopes.generateForSign.getOracleProvidersConfig,
            {},
        );
        const providers = parseProvidersConfig(rawConfig ?? undefined);
        const modelSettings = await ctx.runQuery(
            internal.horoscopes.generateForSign.getHoroscopeModelSettings,
            {},
        );

        // Build provider chain: primary first, then admin-configured fallback,
        // then smart defaults from remaining providers, then ultimate fallback.
        // Each entry uses a model appropriate for its provider type.
        const overrideProviderId = args.providerId ?? modelSettings.providerId;
        const overrideModelId = args.modelId ?? modelSettings.modelId;
        const fallbackProviderId = modelSettings.fallbackProviderId;
        const fallbackModelId = modelSettings.fallbackModelId;

        const providerChain: { provider: LLMProvider; model: string }[] = [];
        const usedProviderIds = new Set<string>();

        // 1. Primary: admin-configured or arg-passed provider+model
        if (overrideProviderId && overrideModelId) {
            const p = resolveProvider(providers, overrideProviderId);
            providerChain.push({ provider: p, model: overrideModelId });
            usedProviderIds.add(p.id);
        }

        // 2. Admin-configured fallback (explicitly chosen by admin)
        if (fallbackProviderId && fallbackModelId) {
            const p = resolveProvider(providers, fallbackProviderId);
            if (!usedProviderIds.has(p.id) || providerChain.length === 0) {
                providerChain.push({ provider: p, model: fallbackModelId });
                usedProviderIds.add(p.id);
            }
        }

        // 3. Smart defaults: use remaining configured providers with per-type
        //    default models (avoids putting OpenRouter model IDs on Ollama providers)
        for (const prov of providers) {
            if (usedProviderIds.has(prov.id)) continue;
            const defaultModel = getDefaultFallbackModel(prov.type as ProviderType);
            providerChain.push({ provider: prov, model: defaultModel });
            usedProviderIds.add(prov.id);
        }

        // 4. Ultimate fallback: if no providers configured at all
        if (providerChain.length === 0) {
            providerChain.push({
                provider: {
                    id: "openrouter",
                    name: "OpenRouter (fallback)",
                    type: "openrouter",
                    baseUrl: "https://openrouter.ai/api/v1",
                    apiKeyEnvVar: "OPENROUTER_API_KEY",
                },
                model: "google/gemini-2.5-flash",
            });
        }

        // ── 5. Call LLM with exponential backoff + provider fallback ─────────
        const startTime = Date.now();
        let rawOutput: string | undefined = undefined;
        let modelUsed = providerChain[0].model;
        let usedProvider = providerChain[0].provider;
        let lastError = "";

        let attempt = 0;
        let providerIndex = 0;
        let hasOutput = false;

        while (attempt < RETRY_DELAYS.length && providerIndex < providerChain.length) {
            const chainEntry = providerChain[providerIndex];
            try {
                const result = await callLLMEndpoint({
                    provider: chainEntry.provider,
                    model: chainEntry.model,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                    temperature: 0.75,
                    maxTokens: 4096,
                    thinkingMode: "disabled",
                    title: "Stars.Guide Horoscope Generator v2",
                });

                if (!result.content) {
                    throw new Error("Empty response from LLM");
                }

                rawOutput = result.content;
                hasOutput = true;
                if (result.raw?.model) {
                    modelUsed = result.raw.model;
                } else {
                    modelUsed = chainEntry.model;
                }
                usedProvider = chainEntry.provider;
                break;
            } catch (err) {
                const errorDetail = err instanceof Error ? err.message : String(err);
                lastError = errorDetail;
                console.error(`[generateForSign] LLM call failed for ${sign} ${date} (provider=${chainEntry.provider.id}, model=${chainEntry.model}, attempt=${attempt}):`, errorDetail);

                attempt++;
                if (attempt < RETRY_DELAYS.length) {
                    // Retry same provider with exponential backoff
                    // Use attempt - 1 because we already incremented: first retry uses delay[0]
                    await sleep(RETRY_DELAYS[attempt - 1]);
                } else {
                    // Move to next provider in chain
                    attempt = 0;
                    providerIndex++;
                    if (providerIndex < providerChain.length) {
                        console.log(`[generateForSign] Falling back to provider ${providerChain[providerIndex].provider.id} / ${providerChain[providerIndex].model}`);
                    }
                }
            }
        }

        if (!hasOutput || !rawOutput) {
            console.error(`[generateForSign] All providers exhausted for ${sign} ${date}`);
            await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                date,
                sign,
                status: "failed",
                errors: [`All providers failed. Last error: ${lastError}`],
                promptVersion: PROMPT_VERSION,
            });
            return;
        }

        const generationDurationMs = Date.now() - startTime;

        // ── 6. Parse + validate ────────────────────────────────────────────
        let parsed: unknown;
        try {
            parsed = sanitizeLLMJson(rawOutput);
        } catch {
            console.error(`[generateForSign] Malformed JSON for ${sign} ${date}`);
            await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                date,
                sign,
                status: "failed",
                errors: ["Malformed JSON response from LLM"],
                promptVersion: PROMPT_VERSION,
                generationDurationMs,
            });
            return;
        }

        // Extract content object (LLM may output { sign, date, content } or just the content directly)
        const contentObj = (parsed as any)?.content ?? parsed;

        // ── Validate total character count (hook + bodyText ≤ 450) ──────────
        const totalChars = ((contentObj?.hook ?? "") + (contentObj?.bodyText ?? "")).length;
        const contentValidation = HoroscopeContentSchema.safeParse(contentObj);

        if (!contentValidation.success) {
            console.warn(`[generateForSign] Content validation failed for ${sign} ${date}: ${contentValidation.error.message}`);
            const recovered = tryRecoverContent(parsed);
            if (!recovered) {
                await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                    date,
                    sign,
                    status: "failed",
                    errors: [`Content validation failed: ${contentValidation.error.message}`],
                    promptVersion: PROMPT_VERSION,
                    generationDurationMs,
                });
                return;
            }

            // If recovered content exceeds 450 chars, truncate bodyText
            if ((recovered.hook.length + recovered.bodyText.length) > 450) {
                const maxBodyLen = 450 - recovered.hook.length;
                recovered.bodyText = recovered.bodyText.slice(0, Math.max(maxBodyLen, 50));
            }

            // Run similarity guard on recovered content
            const similar = await checkSimilarity(ctx, date, sign, recovered.hook, recovered.bodyText);
            if (similar) {
                recovered.bodyText = `${recovered.bodyText} (Additional texture for ${sign} — make it distinct from other signs today.)`;
            }

            await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                date,
                sign,
                status: "generated",
                content: recovered,
                modelUsed: `${usedProvider.id}/${modelUsed}`,
                promptVersion: PROMPT_VERSION,
                generationDurationMs,
                contextSnapshotId: ctxRecord._id,
            });
            console.log(`[generateForSign] Generated ${sign} for ${date} (recovered from malformed output)`);
            return;
        }

        // Validate total char count
        const validatedContent = contentValidation.data;
        const validatedTotalChars = validatedContent.hook.length + validatedContent.bodyText.length;
        if (validatedTotalChars > 450) {
            console.warn(`[generateForSign] Hook+body exceeds 450 chars (${validatedTotalChars}) for ${sign} ${date}, truncating bodyText`);
            validatedContent.bodyText = validatedContent.bodyText.slice(0, 450 - validatedContent.hook.length);
        }

        // ── Similarity guard ────────────────────────────────────────────────
        const similar = await checkSimilarity(ctx, date, sign, validatedContent.hook, validatedContent.bodyText);
        if (similar) {
            console.warn(`[generateForSign] Similarity guard triggered for ${sign} ${date}`);
            validatedContent.bodyText = `${validatedContent.bodyText} (Distinct perspective for ${sign})`;
        }

        // ── 7. Write to daily_horoscopes ───────────────────────────────────
        await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
            date,
            sign,
            status: "generated",
            content: validatedContent,
            modelUsed: `${usedProvider.id}/${modelUsed}`,
            promptVersion: PROMPT_VERSION,
            generationDurationMs,
            contextSnapshotId: ctxRecord._id,
        });

        console.log(`[generateForSign] Generated ${sign} for ${date} (${generationDurationMs}ms, model=${usedProvider.id}/${modelUsed}, chars=${validatedContent.hook.length + validatedContent.bodyText.length})`);
    },
});

// ─── Similarity guard helper ────────────────────────────────────────────────

/**
 * Check whether this sign's content is too similar to already-generated signs.
 * Returns true if 2+ signs share >60% token overlap.
 */
async function checkSimilarity(
    ctx: any,
    date: string,
    sign: string,
    hook: string,
    bodyText: string,
): Promise<boolean> {
    try {
        const others = await ctx.runQuery(
            internal.horoscopes.generateForSign.getGeneratedHoroscopesForDate,
            { date, excludeSign: sign },
        );
        if (!others || others.length === 0) return false;

        const myText = `${hook} ${bodyText}`.toLowerCase().split(/\s+/);
        const mySet = new Set(myText);

        for (const other of others) {
            const otherText = `${other.hook ?? ""} ${other.bodyText ?? ""}`.toLowerCase().split(/\s+/);
            const otherSet = new Set(otherText);
            const intersection = new Set([...mySet].filter((x) => otherSet.has(x)));
            const union = new Set([...mySet, ...otherSet]);
            const overlap = intersection.size / Math.max(union.size, 1);
            if (overlap > 0.60) {
                console.warn(`[generateForSign] Similarity overlap ${(overlap * 100).toFixed(1)}% with ${other.sign}`);
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

// ─── Recovery helper ───────────────────────────────────────────────────────

/**
 * Try to extract valid v2.0 horoscope content from a malformed LLM response.
 * Handles wrong field names, v1 format data, missing wrappers, etc.
 */
function tryRecoverContent(parsed: unknown): z.infer<typeof HoroscopeContentSchema> | null {
    try {
        const data = parsed as any;
        const content = data?.content ?? data;

        // Try v2.0 format first
        const hook = content?.hook ?? data?.hook;
        const bodyText = content?.bodyText ?? data?.bodyText;
        const mantra = content?.mantra ?? data?.mantra;
        const dailyPillars = content?.dailyPillars ?? data?.dailyPillars ?? content?.cosmicDetails ?? {};

        // If we have hook + bodyText, we're in v2.0 format
        if (hook && bodyText) {
            // Recover domainScores from LLM output or generate defaults
            // Requires exactly 6 domain scores for consistent UI grid layout
            const rawDomainScores = content?.domainScores ?? data?.domainScores;
            const VALID_DOMAINS = ["Love", "Career", "Family", "Health", "Finance", "Creativity", "Social", "Spirituality"] as const;
            type DomainName = typeof VALID_DOMAINS[number];
            let domainScores: { name: DomainName; score: number }[];
            if (Array.isArray(rawDomainScores) && rawDomainScores.length > 0) {
                domainScores = rawDomainScores
                    .filter((d: any) => VALID_DOMAINS.includes(d?.name))
                    .slice(0, 6)
                    .map((d: any) => ({
                        name: d.name as DomainName,
                        score: Math.min(100, Math.max(0, Math.round(Number(d.score ?? 50)))),
                    }));
                // Pad to exactly 6 scores if short
                while (domainScores.length < 6) {
                    const next = VALID_DOMAINS.find(v => !domainScores.some(ds => ds.name === v));
                    if (next) domainScores.push({ name: next, score: 50 });
                    else break;
                }
            } else {
                domainScores = [
                    { name: "Love", score: 50 },
                    { name: "Career", score: 50 },
                    { name: "Family", score: 50 },
                    { name: "Health", score: 50 },
                    { name: "Finance", score: 50 },
                    { name: "Social", score: 50 },
                ];
            }

            return {
                hook: String(hook).slice(0, 120),
                bodyText: String(bodyText).slice(0, 400),
                mantra: mantra ? String(mantra).slice(0, 80) : "I trust the process.",
                dailyPillars: {
                    vibe: String(dailyPillars?.vibe ?? "shifting").slice(0, 50),
                    powerMove: String(dailyPillars?.powerMove ?? "Take the next step").slice(0, 50),
                    blindSpot: String(dailyPillars?.blindSpot ?? "The obvious path").slice(0, 50),
                    luckySpark: String(dailyPillars?.luckySpark ?? "An unexpected opening").slice(0, 50),
                },
                domainScores,
            };
        }

        // Try v1.0 format — convert insight/energy/navigate → hook + bodyText
        const insight = content?.insight ?? data?.insight;
        const energy = content?.energy ?? data?.energy;
        const navigate = content?.navigate ?? data?.navigate;
        const v1Mantra = content?.mantra ?? data?.mantra;
        const v1CosmicDetails = content?.cosmicDetails ?? data?.cosmicDetails ?? {};

        if (insight) {
            // Extract first sentence as hook, rest as bodyText
            const firstSentenceMatch = insight.match(/^([^.!?]+[.!?])\s*/);
            const hookText = firstSentenceMatch ? firstSentenceMatch[1].trim() : insight.split('.')[0] + '.';
            const bodyParts = [
                ...(energy ? [energy] : []),
                ...(navigate ? [navigate] : []),
            ];
            const bodyContent = firstSentenceMatch
                ? insight.slice(firstSentenceMatch[0].length).trim()
                : '';
            const combinedBody = [bodyContent, ...bodyParts].filter(Boolean).join(' ');

            return {
                hook: hookText.slice(0, 120),
                bodyText: combinedBody.slice(0, 400) || "Today brings a shift in energy. Trust your instincts and stay open to unexpected developments.",
                mantra: v1Mantra ? String(v1Mantra).slice(0, 80) : "I trust the timing of my life.",
                dailyPillars: {
                    vibe: String(v1CosmicDetails?.keyThemes?.[0] ?? energy?.split(' ').slice(0, 3).join(' ') ?? "shifting").slice(0, 50),
                    powerMove: "Listen to your instincts",
                    blindSpot: String(v1CosmicDetails?.watchFor ?? "Assumptions").slice(0, 50),
                    luckySpark: "An unexpected connection",
                },
                domainScores: [
                    { name: "Love" as const, score: 50 },
                    { name: "Career" as const, score: 50 },
                    { name: "Family" as const, score: 50 },
                    { name: "Health" as const, score: 50 },
                    { name: "Finance" as const, score: 50 },
                    { name: "Social" as const, score: 50 },
                ],
            };
        }

        return null;
    } catch {
        return null;
    }
}
