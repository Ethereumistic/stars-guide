"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { z } from "zod";
import {
    LLMProvider,
    parseProvidersConfig,
    resolveProvider,
    callLLMEndpoint,
    DEFAULT_PROVIDER,
} from "./lib/llmProvider";

// ─── SAFETY CONSTANTS ─────────────────────────────────────────────────────
const MAX_RETRIES_PER_SIGN = 2;
const RETRY_DELAY_MS = 3000;
const MAX_TOTAL_FAILURES = 6;
const INTER_DATE_DELAY_MS = 3000;
const INTER_SIGN_DELAY_MS = 500;

// ─── ZOD VALIDATION SCHEMAS ───────────────────────────────────────────────
const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const LLMResponseSchema = z.object({
    sign: z.enum(VALID_SIGNS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    content: z.string().min(1, "Content cannot be empty"),
});

// ─── UTILITIES ────────────────────────────────────────────────────────────

function sanitizeLLMJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── COSMIC WEATHER FORMATTING ────────────────────────────────────────────

type CosmicWeatherData = {
    date: string;
    planetPositions: { planet: string; sign: string; degreeInSign: number; isRetrograde: boolean }[];
    moonPhase: { name: string; illuminationPercent: number };
    activeAspects: { planet1: string; planet2: string; aspect: string; orbDegrees: number }[];
    feltLanguage?: string;
};

function formatCosmicWeatherForPrompt(snapshot: CosmicWeatherData): string {
    const planets = snapshot.planetPositions
        .map((p) => {
            const status = p.isRetrograde
                ? " (retrograde — energy turns inward, review not advance)"
                : "";
            return `${p.planet} in ${p.sign} (${p.degreeInSign}°)${status}`;
        })
        .join(", ");

    const retrogrades = snapshot.planetPositions.filter((p) => p.isRetrograde);
    const retroLine = retrogrades.length > 0
        ? `Retrogrades: ${retrogrades.map((p) => p.planet).join(", ")}`
        : "No planets currently retrograde.";

    const aspects = snapshot.activeAspects.length > 0
        ? snapshot.activeAspects
            .map((a) => `${a.planet1} ${a.aspect} ${a.planet2} (orb: ${a.orbDegrees}°)`)
            .join("; ")
        : "No exact aspects today.";

    return `COSMIC WEATHER FOR ${snapshot.date}:
Planet Positions: ${planets}
${retroLine}
Moon: ${snapshot.moonPhase.name}, ${snapshot.moonPhase.illuminationPercent}% illuminated
Active Aspects: ${aspects}`;
}

// ─── HOOK FORMATTING ──────────────────────────────────────────────────────

type HookData = {
    name: string;
    description: string;
    examples: string[];
};

function formatHookForPrompt(hook: HookData): string {
    const exampleLines = hook.examples
        .map((e, i) => `${i + 1}. "${e}"`)
        .join("\n");

    return `HOOK ARCHETYPE FOR THIS HOROSCOPE:
Type: ${hook.name}
Description: ${hook.description}
Examples of this hook style:
${exampleLines}
Open the horoscope with this hook type. Do not copy the examples — use them as tone reference only.`;
}

// ─── PROVIDER-AWARE LLM CALLS ─────────────────────────────────────────────

/**
 * generateHoroscope — Makes a single provider-aware LLM call.
 * Routes to the correct provider endpoint based on provider config.
 */
async function generateHoroscope(
    sign: string,
    date: string,
    emotionalZeitgeist: string,
    masterContext: string,
    modelId: string,
    provider: LLMProvider,
    cosmicWeatherText?: string,
    moonPhaseFrame?: string,
    hookText?: string,
): Promise<unknown> {
    const moonPhaseBlock = moonPhaseFrame
        ? `\n\nMOON PHASE FRAME: ${moonPhaseFrame}`
        : "";

    const cosmicWeatherBlock = cosmicWeatherText
        ? `\n\nCOSMIC WEATHER FOR THIS DATE:\n${cosmicWeatherText}`
        : "";

    const hookBlock = hookText
        ? `\n\n${hookText}`
        : "";

    const { content } = await callLLMEndpoint({
        provider,
        model: modelId,
        messages: [
            {
                role: "system",
                content: masterContext,
            },
            {
                role: "user",
                content: `TARGET SIGN: ${sign}
TARGET DATE: ${date}${moonPhaseBlock}${cosmicWeatherBlock}

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
${emotionalZeitgeist}
This is how the world FEELS right now — not what happened.
Map this emotional climate to ${sign}'s Likely Felt State.
Never reference news events, countries, or headlines in the output.${hookBlock}

TASK:
Generate one horoscope for ${sign} for ${date}.
Output ONLY valid JSON: { "sign": "${sign}", "date": "${date}", "content": "..." }
Content must be 330–460 characters.`,
            },
        ],
        temperature: 0.75,
        maxTokens: 4096,
        jsonMode: true,
        title: "Stars.Guide Horoscope Engine v4",
    });

    return sanitizeLLMJson(content);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CORE ENGINE — runGenerationJob (v4)
// ═══════════════════════════════════════════════════════════════════════════

export const runGenerationJob = internalAction({
    args: { jobId: v.id("generationJobs") },
    handler: async (ctx, args) => {
        // 1. Fetch job details
        const job = await ctx.runQuery(internal.aiQueries.getJobDetails, { jobId: args.jobId });
        if (!job) {
            console.error(`Job ${args.jobId} not found`);
            return;
        }

        // 2. Fetch zeitgeist
        const zeitgeist = await ctx.runQuery(internal.aiQueries.getZeitgeistInternal, {
            zeitgeistId: job.zeitgeistId,
        });
        if (!zeitgeist) {
            await ctx.runMutation(internal.admin.failJob, {
                jobId: args.jobId,
                errors: ["Zeitgeist not found"],
            });
            return;
        }

        const emotionalZeitgeist = job.emotionalZeitgeist || zeitgeist.summary;

        // 3. Assemble system prompt (context slots with fallback)
        const masterContext = await ctx.runQuery(internal.aiQueries.assembleSystemPrompt, {});
        if (!masterContext) {
            await ctx.runMutation(internal.admin.failJob, {
                jobId: args.jobId,
                errors: ["Master context not configured. Please set it in the Context Editor."],
            });
            return;
        }

        // 4. Resolve LLM provider from oracle_settings
        const providersRaw = (await ctx.runQuery(internal.aiQueries.getOracleProvidersConfig, {})) ?? undefined;
        const providers = parseProvidersConfig(providersRaw);
        const provider = resolveProvider(providers, (job as any).providerId);
        console.log(`Using provider: ${provider.name} (${provider.baseUrl}) with model: ${job.modelId}`);

        // Verify API key exists
        const apiKey = process.env[provider.apiKeyEnvVar];
        if (!apiKey && provider.type !== "ollama") {
            await ctx.runMutation(internal.admin.failJob, {
                jobId: args.jobId,
                errors: [`API key ${provider.apiKeyEnvVar} not set in environment. Provider: ${provider.name}`],
            });
            return;
        }

        // 5. Date-first generation loop
        let completedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (let dateIdx = 0; dateIdx < job.targetDates.length; dateIdx++) {
            // ── Cancellation check at each date boundary ──
            const currentJobState = await ctx.runQuery(
                internal.aiQueries.getJobDetails,
                { jobId: args.jobId }
            );
            if (!currentJobState || currentJobState.status === "cancelled") {
                console.log(`Job ${args.jobId} was cancelled, stopping.`);
                return;
            }

            const targetDate = job.targetDates[dateIdx];

            // Fetch cosmic weather + moon phase frame ONCE per date
            let cosmicWeatherText: string | undefined;
            let moonPhaseFrame: string | undefined;
            let moonPhaseCategory: string | undefined;
            try {
                let cosmicWeather = await ctx.runQuery(
                    internal.aiQueries.getCosmicWeatherInternal,
                    { date: targetDate }
                );
                if (!cosmicWeather) {
                    console.log(`Cosmic weather missing for ${targetDate}, computing on-demand...`);
                    await ctx.runAction(internal.cosmicWeather.computeAndStore, { date: targetDate });
                    cosmicWeather = await ctx.runQuery(
                        internal.aiQueries.getCosmicWeatherInternal,
                        { date: targetDate }
                    );
                }
                if (cosmicWeather) {
                    cosmicWeatherText = cosmicWeather.feltLanguage
                        ? `COSMIC WEATHER FOR ${targetDate}:\n${cosmicWeather.feltLanguage}`
                        : formatCosmicWeatherForPrompt(cosmicWeather);

                    const { getMoonPhaseFrame, getMoonPhaseCategory } = await import("./lib/astronomyEngine");
                    moonPhaseFrame = getMoonPhaseFrame(cosmicWeather.moonPhase.name);
                    moonPhaseCategory = getMoonPhaseCategory(cosmicWeather.moonPhase.name);
                    console.log(`Cosmic weather loaded for ${targetDate} (${cosmicWeather.moonPhase.name})`);
                }
            } catch (err) {
                console.warn(`Cosmic weather failed for ${targetDate}:`, err);
            }

            // Fetch hook archetype ONCE per date
            let hookText: string | undefined;
            let selectedHookId: string | undefined;
            try {
                const emotionalRegister = zeitgeist.emotionalRegister
                    ? zeitgeist.emotionalRegister.split(",").map((r: string) => r.trim())
                    : undefined;
                const hook = await ctx.runQuery(internal.hooks.getAssignedHook, {
                    hookId: job.hookId || undefined,
                    moonPhaseCategory,
                    emotionalRegister,
                });
                if (hook) {
                    hookText = formatHookForPrompt(hook);
                    selectedHookId = hook._id;
                }
            } catch (err) {
                console.warn("Hook fetch failed:", err);
            }

            // Inner loop: signs for this date
            for (const sign of job.targetSigns) {
                try {
                    const result = await generateHoroscope(
                        sign, targetDate, emotionalZeitgeist, masterContext,
                        job.modelId, provider,
                        cosmicWeatherText, moonPhaseFrame, hookText
                    );
                    const validated = LLMResponseSchema.safeParse(result);

                    if (!validated.success) {
                        console.warn(`Validation failed for ${sign} ${targetDate}, retrying...`);
                        await sleep(RETRY_DELAY_MS);

                        const retryResult = await generateHoroscope(
                            sign, targetDate, emotionalZeitgeist, masterContext,
                            job.modelId, provider,
                            cosmicWeatherText, moonPhaseFrame, hookText
                        );
                        const retryValidated = LLMResponseSchema.safeParse(retryResult);

                        if (!retryValidated.success) {
                            failedCount++;
                            errors.push(`${sign} ${targetDate}: Validation failed after retry — ${retryValidated.error.message}`);
                            await ctx.runMutation(internal.admin.updateJobProgress, {
                                jobId: args.jobId, failed: failedCount, errors,
                            });
                            if (failedCount >= MAX_TOTAL_FAILURES) {
                                await ctx.runMutation(internal.admin.failJob, { jobId: args.jobId, errors });
                                return;
                            }
                            continue;
                        }

                        await ctx.runMutation(internal.admin.upsertHoroscope, {
                            data: retryValidated.data,
                            zeitgeistId: job.zeitgeistId,
                            jobId: args.jobId,
                        });
                    } else {
                        await ctx.runMutation(internal.admin.upsertHoroscope, {
                            data: validated.data,
                            zeitgeistId: job.zeitgeistId,
                            jobId: args.jobId,
                        });
                    }

                    completedCount++;
                    await ctx.runMutation(internal.admin.updateJobProgress, {
                        jobId: args.jobId, completed: completedCount,
                    });

                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error processing ${sign} ${targetDate}:`, errorMessage);

                    try {
                        await sleep(RETRY_DELAY_MS);
                        const retryResult = await generateHoroscope(
                            sign, targetDate, emotionalZeitgeist, masterContext,
                            job.modelId, provider,
                            cosmicWeatherText, moonPhaseFrame, hookText
                        );
                        const retryValidated = LLMResponseSchema.safeParse(retryResult);

                        if (retryValidated.success) {
                            await ctx.runMutation(internal.admin.upsertHoroscope, {
                                data: retryValidated.data,
                                zeitgeistId: job.zeitgeistId,
                                jobId: args.jobId,
                            });
                            completedCount++;
                            await ctx.runMutation(internal.admin.updateJobProgress, {
                                jobId: args.jobId, completed: completedCount,
                            });
                            continue;
                        }
                        failedCount++;
                        errors.push(`${sign} ${targetDate}: ${retryValidated.error.message}`);
                    } catch (retryError: unknown) {
                        const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
                        failedCount++;
                        errors.push(`${sign} ${targetDate}: ${retryErrorMessage}`);
                    }

                    await ctx.runMutation(internal.admin.updateJobProgress, {
                        jobId: args.jobId, failed: failedCount, errors,
                    });
                    if (failedCount >= MAX_TOTAL_FAILURES) {
                        await ctx.runMutation(internal.admin.failJob, { jobId: args.jobId, errors });
                        return;
                    }
                }

                await sleep(INTER_SIGN_DELAY_MS);
            }

            // Rate limit between date batches
            if (dateIdx < job.targetDates.length - 1) {
                await sleep(INTER_DATE_DELAY_MS);
            }

            // Increment hook usage
            if (selectedHookId) {
                try {
                    await ctx.runMutation(internal.hooks.incrementHookUsage, {
                        hookId: selectedHookId as any,
                    });
                } catch {}
            }
        }

        const finalStatus = failedCount === 0 ? "completed" : "partial";
        await ctx.runMutation(internal.admin.completeJob, {
            jobId: args.jobId, status: finalStatus,
        });
    },
});


// ═══════════════════════════════════════════════════════════════════════════
// ZEITGEIST AI SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════

export const synthesizeZeitgeist = internalAction({
    args: {
        archetypes: v.array(v.string()),
        modelId: v.string(),
        providerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const providersRaw = (await ctx.runQuery(internal.aiQueries.getOracleProvidersConfig, {})) ?? undefined;
        const providers = parseProvidersConfig(providersRaw);
        const provider = resolveProvider(providers, args.providerId);

        const { content } = await callLLMEndpoint({
            provider,
            model: args.modelId,
            messages: [
                {
                    role: "system",
                    content: "You are a geopolitical psychologist. Synthesize world events into a concise, archetypal psychological summary. No country names. No specific leaders. Only universal human psychological patterns. Output ONLY a 3-sentence summary. No JSON. No markdown. Plain text only.",
                },
                {
                    role: "user",
                    content: `Synthesize these world events into a unified psychological baseline:\n\n${args.archetypes.map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
                },
            ],
            temperature: 0.6,
            maxTokens: 300,
            title: "Stars.Guide Zeitgeist Synthesis",
        });

        return content.trim();
    },
});


// ═══════════════════════════════════════════════════════════════════════════
// EMOTIONAL ZEITGEIST TRANSLATION LAYER
// ═══════════════════════════════════════════════════════════════════════════

export const synthesizeEmotionalZeitgeist = internalAction({
    args: {
        rawEvents: v.string(),
        modelId: v.string(),
        providerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const providersRaw = (await ctx.runQuery(internal.aiQueries.getOracleProvidersConfig, {})) ?? undefined;
        const providers = parseProvidersConfig(providersRaw);
        const provider = resolveProvider(providers, args.providerId);

        // Pass 1: Emotional Translation
        const { content: emotionalContent } = await callLLMEndpoint({
            provider,
            model: args.modelId,
            messages: [
                {
                    role: "system",
                    content: `You are an expert at translating world events into collective emotional states.
Your output is used as context for horoscope generation. It must describe how an average person
is FEELING right now — not what happened in the news.

Rules:
- Never mention country names, political figures, or specific events
- Never use the words: systemic, macro, geopolitical, structural
- Focus exclusively on felt human experience: fears, cravings, confusion, quiet hopes
- Write 4-6 sentences of plain, warm, human prose
- Output ONLY the emotional translation. No preamble, no labels.`,
                },
                {
                    role: "user",
                    content: `World events / current vibe:\n${args.rawEvents}\n\nDescribe the collective emotional state.`,
                },
            ],
            temperature: 0.65,
            maxTokens: 400,
            title: "Stars.Guide Emotional Translation",
        });

        // Pass 2: Emotional Register Classification
        let emotionalRegister = "";
        try {
            const { content: classifyContent } = await callLLMEndpoint({
                provider,
                model: args.modelId,
                messages: [
                    {
                        role: "system",
                        content: `Classify the emotional register of this text.
Choose 1-2 from: anxious, expansive, tender, defiant, restless, hopeful, grief, clarity.
Output ONLY a JSON array, e.g. ["anxious", "restless"]`,
                    },
                    { role: "user", content: emotionalContent.trim() },
                ],
                temperature: 0.3,
                maxTokens: 100,
                jsonMode: true,
                title: "Stars.Guide Register Classification",
            });

            const parsed = JSON.parse(classifyContent.replace(/```json\n?|```/g, "").trim());
            const registers = Array.isArray(parsed) ? parsed : (parsed.registers ?? []);
            emotionalRegister = registers.slice(0, 2).join(",");
        } catch {
            console.warn("Emotional register classification failed, continuing without.");
        }

        return JSON.stringify({
            translation: emotionalContent.trim(),
            emotionalRegister,
        });
    },
});
