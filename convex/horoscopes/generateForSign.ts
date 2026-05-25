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
import { internal } from "../_generated/api";
import { z } from "zod";
import {
    parseProvidersConfig,
    callLLMEndpoint,
    type LLMProvider,
} from "../lib/llmProvider";
import { buildHoroscopePrompt, VERSION as PROMPT_VERSION, type DailyAstrologyContext } from "./prompt";

// ─── Constants ─────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 3000;

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
    domainScores: z.array(DomainScoreSchema).min(4).max(6),
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
        errorMessage: v.optional(v.string()),
        modelUsed: v.optional(v.string()),
        promptVersion: v.optional(v.string()),
        generationDurationMs: v.optional(v.number()),
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
        }

        if (args.status === "failed" && args.errorMessage) {
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
                    { name: "Health" as const, score: 50 },
                    { name: "Social" as const, score: 50 },
                ],
            };
            fields.errorMessage = args.errorMessage;
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
                        { name: "Health", score: 50 },
                        { name: "Social", score: 50 },
                    ],
                },
                promptVersion: args.promptVersion,
                ...(args.modelUsed ? { modelUsed: args.modelUsed } : {}),
                ...(args.generationDurationMs !== undefined
                    ? { generationDurationMs: args.generationDurationMs }
                    : {}),
            } satisfies Record<string, unknown>);
        }
    },
});

// ─── Main Action ───────────────────────────────────────────────────────────

export const generateForSign = internalAction({
    args: {
        sign: v.string(),
        date: v.optional(v.string()),  // defaults to today
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
        };

        // ── 3. Build prompt ────────────────────────────────────────────────
        const { system, user } = buildHoroscopePrompt({ sign, context });

        // ── 4. Resolve LLM provider ─────────────────────────────────────────
        const rawConfig = await ctx.runQuery(
            internal.horoscopes.generateForSign.getOracleProvidersConfig,
            {},
        );
        const providers = parseProvidersConfig(rawConfig ?? undefined);

        const DEFAULT_MODEL = "gemma3:27b";
        // Prefer Ollama Cloud for horoscope generation
        const ollamaProvider = providers.find((p) => p.id === "ollama_cloud");
        const provider: LLMProvider = ollamaProvider
            ?? (providers.length > 0 ? providers[0] : {
                id: "ollama-cloud",
                name: "Ollama Cloud",
                type: "openai_compatible",
                baseUrl: "https://ollama.com/v1",
                apiKeyEnvVar: "OLLAMA_API_KEY",
            });

        // ── 5. Call LLM ────────────────────────────────────────────────────
        const startTime = Date.now();
        let rawOutput: string;
        let modelUsed = DEFAULT_MODEL;

        try {
            const result = await callLLMEndpoint({
                provider,
                model: DEFAULT_MODEL,
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
            if (result.raw?.model) {
                modelUsed = result.raw.model;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`[generateForSign] LLM call failed for ${sign} ${date}:`, errorMessage);

            // Retry once
            await sleep(RETRY_DELAY_MS);
            try {
                const result = await callLLMEndpoint({
                    provider,
                    model: DEFAULT_MODEL,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                    temperature: 0.75,
                    maxTokens: 4096,
                    thinkingMode: "disabled",
                    title: "Stars.Guide Horoscope Generator v2 (retry)",
                });

                if (!result.content) {
                    throw new Error("Empty response from LLM after retry");
                }
                rawOutput = result.content;
                if (result.raw?.model) {
                    modelUsed = result.raw.model;
                }
            } catch (retryErr) {
                const retryErrorMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
                console.error(`[generateForSign] Retry failed for ${sign} ${date}:`, retryErrorMessage);

                await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                    date,
                    sign,
                    status: "failed",
                    errorMessage: `LLM error: ${retryErrorMessage}`,
                    promptVersion: PROMPT_VERSION,
                });
                return;
            }
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
                errorMessage: "Malformed JSON response from LLM",
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
                    errorMessage: `Content validation failed: ${contentValidation.error.message}`,
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

            await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
                date,
                sign,
                status: "generated",
                content: recovered,
                modelUsed,
                promptVersion: PROMPT_VERSION,
                generationDurationMs,
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

        // ── 7. Write to daily_horoscopes ───────────────────────────────────
        await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
            date,
            sign,
            status: "generated",
            content: validatedContent,
            modelUsed,
            promptVersion: PROMPT_VERSION,
            generationDurationMs,
        });

        console.log(`[generateForSign] Generated ${sign} for ${date} (${generationDurationMs}ms, model=${modelUsed}, chars=${validatedContent.hook.length + validatedContent.bodyText.length})`);
    },
});

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
            const rawDomainScores = content?.domainScores ?? data?.domainScores;
            const VALID_DOMAINS = ["Love", "Career", "Family", "Health", "Finance", "Creativity", "Social", "Spirituality"] as const;
            type DomainName = typeof VALID_DOMAINS[number];
            let domainScores: { name: DomainName; score: number }[];
            if (Array.isArray(rawDomainScores) && rawDomainScores.length >= 4) {
                domainScores = rawDomainScores
                    .filter((d: any) => VALID_DOMAINS.includes(d?.name))
                    .slice(0, 6)
                    .map((d: any) => ({
                        name: d.name as DomainName,
                        score: Math.min(100, Math.max(0, Math.round(Number(d.score ?? 50)))),
                    }));
                // Ensure at least 4 scores
                while (domainScores.length < 4) {
                    const next = VALID_DOMAINS.find(v => !domainScores.some(ds => ds.name === v));
                    if (next) domainScores.push({ name: next, score: 50 });
                    else break;
                }
            } else {
                domainScores = [
                    { name: "Love", score: 50 },
                    { name: "Career", score: 50 },
                    { name: "Health", score: 50 },
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
                    { name: "Health" as const, score: 50 },
                    { name: "Social" as const, score: 50 },
                ],
            };
        }

        return null;
    } catch {
        return null;
    }
}