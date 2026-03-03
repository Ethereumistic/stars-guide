"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { z } from "zod";

// ─── SAFETY CONSTANTS ─────────────────────────────────────────────────────
const MAX_RETRIES_PER_SIGN = 2;       // Max 2 attempts per sign (1 original + 1 retry)
const RETRY_DELAY_MS = 3000;          // Wait 3s before retry
const MAX_TOTAL_FAILURES = 6;         // If 6+ signs fail, abort entire job
const INTER_SIGN_DELAY_MS = 2000;     // Sleep between signs to respect rate limits

// ─── ZOD VALIDATION SCHEMAS (The LLM Lie Defense) ────────────────────────
const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const HoroscopeEntrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    content: z.string().min(1, "Content cannot be empty"),
    // NOTE: Character length (330-460) is validated visually in the Review UI,
    // NOT here. This prevents discarding great AI content that's slightly
    // over/under the limit. The admin decides in the review step.
});

const LLMResponseSchema = z.object({
    sign: z.enum(VALID_SIGNS),
    horoscopes: z.array(HoroscopeEntrySchema).min(1).max(7),
});

// ─── UTILITIES ────────────────────────────────────────────────────────────

/**
 * sanitizeLLMJson — Strip markdown code block wrappers that LLMs
 * sometimes return despite explicit instructions not to.
 */
function sanitizeLLMJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
}

/**
 * sleep — Simple delay helper for rate limiting.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── COSMIC WEATHER FORMATTING ────────────────────────────────────────────

type CosmicWeatherData = {
    date: string;
    planetPositions: { planet: string; sign: string; degreeInSign: number; isRetrograde: boolean }[];
    moonPhase: { name: string; illuminationPercent: number };
    activeAspects: { planet1: string; planet2: string; aspect: string; orbDegrees: number }[];
};

/**
 * formatCosmicWeatherForPrompt — Converts computed astronomical data
 * into a human-readable block for the LLM.
 * v3: Includes retrograde felt-language guidance.
 */
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

/**
 * formatHookForPrompt — Formats the assigned hook archetype into a
 * prompt block that instructs the LLM on the opening style.
 */
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

/**
 * callOpenRouter — Makes a single API call to OpenRouter.
 * v3: Includes moon phase frame, hook archetype, and emotional zeitgeist.
 */
async function callOpenRouter(
    sign: string,
    dates: string[],
    emotionalZeitgeist: string,
    masterContext: string,
    modelId: string,
    apiKey: string,
    cosmicWeatherText?: string,
    moonPhaseFrame?: string,
    hookText?: string,
): Promise<unknown> {
    // Build the v3 user message with all context layers
    const moonPhaseBlock = moonPhaseFrame
        ? `\n\nMOON PHASE CONTEXT:\n${moonPhaseFrame}\nThis is the emotional container for all horoscopes in this run.\nEvery piece of copy should be coloured by this phase's energy.`
        : "";

    const cosmicWeatherBlock = cosmicWeatherText
        ? `\n\nCOSMIC WEATHER:\n${cosmicWeatherText}\nTranslate relevant planetary data into felt language per the Planet Felt-Language Guide.\nNever name a planet directly in the copy. Never list positions robotically.`
        : "";

    const hookBlock = hookText
        ? `\n\n${hookText}`
        : "";

    const payload = {
        model: modelId,
        messages: [
            {
                role: "system",
                content: masterContext,
            },
            {
                role: "user",
                content: `TARGET SIGN: ${sign}
TARGET DATES: ${dates.join(", ")}${moonPhaseBlock}${cosmicWeatherBlock}

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
${emotionalZeitgeist}
This is how the world FEELS right now — not what happened.
Map this emotional climate to the sign's Likely Felt State.
Never reference news events, countries, or headlines in the output.${hookBlock}

TASK:
Generate horoscopes for ${sign} for the dates above.
Each horoscope must feel like it was written specifically for this reader, today.
Apply the Core Principle: emotionally specific, circumstantially universal.
Output ONLY valid JSON matching the schema in the system prompt.`,
            },
        ],
        temperature: 0.75, // v3: raised from 0.7 for more natural language variation
        max_tokens: 2048,
        response_format: { type: "json_object" },
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://stars.guide",
            "X-Title": "Stars.Guide Horoscope Engine v3",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as any;

    // Extract the content from the response
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("OpenRouter returned empty content");
    }

    // Parse and sanitize the JSON response
    return sanitizeLLMJson(content);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CORE ENGINE — runGenerationJob (v3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * runGenerationJob — Internal action that runs entirely server-side.
 * 
 * v3 Changes:
 * - Uses emotionalZeitgeist (not raw events) in prompts
 * - Injects moon phase frame as first context layer
 * - Injects assigned hook archetype for opening style
 * - Updated prompt structure per v3 spec
 * 
 * Architecture: Fire-and-Forget with Progress Tracking
 * - The browser is ONLY a progress viewer, not a critical link.
 * - If the admin closes the tab, this action continues running.
 * - Every successful LLM response is persisted immediately.
 * - If the action crashes mid-way, all previously saved signs are safe.
 */
export const runGenerationJob = internalAction({
    args: { jobId: v.id("generationJobs") },
    handler: async (ctx, args) => {
        // 1. Fetch job details
        const job = await ctx.runQuery(internal.aiQueries.getJobDetails, { jobId: args.jobId });
        if (!job) {
            console.error(`Job ${args.jobId} not found`);
            return;
        }

        // 2. Fetch zeitgeist — use emotionalZeitgeist if available, fallback to raw
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

        // v3: Prefer emotionalZeitgeist from the job, fallback to zeitgeist.summary
        const emotionalZeitgeist = job.emotionalZeitgeist || zeitgeist.summary;

        const masterSetting = await ctx.runQuery(internal.aiQueries.getSystemSettingInternal, {
            key: "master_context",
        });
        const masterContext = masterSetting?.content || "";
        if (!masterContext) {
            await ctx.runMutation(internal.admin.failJob, {
                jobId: args.jobId,
                errors: ["Master context not configured. Please set it in the Context Editor."],
            });
            return;
        }

        // 3. Get API key from environment
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            await ctx.runMutation(internal.admin.failJob, {
                jobId: args.jobId,
                errors: ["OPENROUTER_API_KEY environment variable is not set"],
            });
            return;
        }

        // 3b. Fetch or compute Cosmic Weather + Moon Phase Frame
        let cosmicWeatherText: string | undefined;
        let moonPhaseFrame: string | undefined;
        let moonPhaseCategory: string | undefined;
        try {
            const targetDate = job.targetDates[0];
            let cosmicWeather = await ctx.runQuery(
                internal.aiQueries.getCosmicWeatherInternal,
                { date: targetDate }
            );
            if (!cosmicWeather) {
                // On-demand fallback: compute now if cron hasn't run yet
                console.log(`Cosmic weather missing for ${targetDate}, computing on-demand...`);
                await ctx.runAction(internal.cosmicWeather.computeAndStore, { date: targetDate });
                cosmicWeather = await ctx.runQuery(
                    internal.aiQueries.getCosmicWeatherInternal,
                    { date: targetDate }
                );
            }
            if (cosmicWeather) {
                cosmicWeatherText = formatCosmicWeatherForPrompt(cosmicWeather);
                // v3: Get moon phase frame from astronomyEngine
                // We import the frame text computation at runtime since this is a "use node" file
                const { getMoonPhaseFrame, getMoonPhaseCategory } = await import("./lib/astronomyEngine");
                moonPhaseFrame = getMoonPhaseFrame(cosmicWeather.moonPhase.name);
                moonPhaseCategory = getMoonPhaseCategory(cosmicWeather.moonPhase.name);
                console.log(`Cosmic weather + moon phase frame loaded for ${targetDate} (${cosmicWeather.moonPhase.name})`);
            }
        } catch (err) {
            // Non-fatal: generation proceeds without cosmic weather
            console.warn("Failed to fetch/compute cosmic weather, proceeding without:", err);
        }

        // 3c. Fetch assigned hook archetype
        let hookText: string | undefined;
        try {
            const hook = await ctx.runQuery(internal.hooks.getAssignedHook, {
                hookId: job.hookId || undefined,
                moonPhaseCategory: moonPhaseCategory,
            });
            if (hook) {
                hookText = formatHookForPrompt(hook);
                console.log(`Hook archetype assigned: ${hook.name}`);
            }
        } catch (err) {
            console.warn("Failed to fetch hook archetype, proceeding without:", err);
        }

        // 4. Process signs one at a time
        let completedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const sign of job.targetSigns) {
            try {
                // First attempt
                const result = await callOpenRouter(
                    sign, job.targetDates, emotionalZeitgeist, masterContext,
                    job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
                );
                const validated = LLMResponseSchema.safeParse(result);

                if (!validated.success) {
                    // Zod validation failed — retry once
                    console.warn(`Validation failed for ${sign}, retrying...`, validated.error.message);
                    await sleep(RETRY_DELAY_MS);

                    const retryResult = await callOpenRouter(
                        sign, job.targetDates, emotionalZeitgeist, masterContext,
                        job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
                    );
                    const retryValidated = LLMResponseSchema.safeParse(retryResult);

                    if (!retryValidated.success) {
                        // Second failure — mark as failed, move on
                        failedCount++;
                        errors.push(`${sign}: Validation failed after retry — ${retryValidated.error.message}`);
                        await ctx.runMutation(internal.admin.updateJobProgress, {
                            jobId: args.jobId,
                            failed: failedCount,
                            errors,
                        });

                        if (failedCount >= MAX_TOTAL_FAILURES) {
                            await ctx.runMutation(internal.admin.failJob, {
                                jobId: args.jobId,
                                errors,
                            });
                            return; // ABORT entire job
                        }
                        continue; // Move to next sign
                    }

                    // Retry succeeded — save
                    await ctx.runMutation(internal.admin.upsertHoroscopes, {
                        data: retryValidated.data,
                        zeitgeistId: job.zeitgeistId,
                        jobId: args.jobId,
                    });
                } else {
                    // First attempt succeeded — save immediately
                    await ctx.runMutation(internal.admin.upsertHoroscopes, {
                        data: validated.data,
                        zeitgeistId: job.zeitgeistId,
                        jobId: args.jobId,
                    });
                }

                completedCount++;
                await ctx.runMutation(internal.admin.updateJobProgress, {
                    jobId: args.jobId,
                    completed: completedCount,
                });

            } catch (error: unknown) {
                // Network error, timeout, 429, 500, etc.
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error processing ${sign}:`, errorMessage);

                // Retry once for network errors
                try {
                    await sleep(RETRY_DELAY_MS);
                    const retryResult = await callOpenRouter(
                        sign, job.targetDates, emotionalZeitgeist, masterContext,
                        job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
                    );
                    const retryValidated = LLMResponseSchema.safeParse(retryResult);

                    if (retryValidated.success) {
                        await ctx.runMutation(internal.admin.upsertHoroscopes, {
                            data: retryValidated.data,
                            zeitgeistId: job.zeitgeistId,
                            jobId: args.jobId,
                        });
                        completedCount++;
                        await ctx.runMutation(internal.admin.updateJobProgress, {
                            jobId: args.jobId,
                            completed: completedCount,
                        });
                        continue;
                    }
                    // Retry validation failed
                    failedCount++;
                    errors.push(`${sign}: ${retryValidated.error.message}`);
                } catch (retryError: unknown) {
                    const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
                    failedCount++;
                    errors.push(`${sign}: ${retryErrorMessage}`);
                }

                await ctx.runMutation(internal.admin.updateJobProgress, {
                    jobId: args.jobId,
                    failed: failedCount,
                    errors,
                });

                if (failedCount >= MAX_TOTAL_FAILURES) {
                    await ctx.runMutation(internal.admin.failJob, {
                        jobId: args.jobId,
                        errors,
                    });
                    return; // ABORT
                }
            }

            // Rate limit protection: sleep between signs
            await sleep(INTER_SIGN_DELAY_MS);
        }

        // 5. Determine final job status
        const finalStatus = failedCount === 0 ? "completed" : "partial";
        await ctx.runMutation(internal.admin.completeJob, {
            jobId: args.jobId,
            status: finalStatus,
        });
    },
});


// ═══════════════════════════════════════════════════════════════════════════
// ZEITGEIST AI SYNTHESIS (Original — 3-sentence psychological baseline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * synthesizeZeitgeist — Takes archetypal events and uses AI to create
 * a cohesive 3-sentence psychological summary.
 */
export const synthesizeZeitgeist = internalAction({
    args: {
        archetypes: v.array(v.string()),
        modelId: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

        const payload = {
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
            max_tokens: 300,
        };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stars.guide",
                "X-Title": "Stars.Guide Zeitgeist Synthesis",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenRouter returned empty synthesis");

        return content.trim();
    },
});


// ═══════════════════════════════════════════════════════════════════════════
// v3: EMOTIONAL ZEITGEIST TRANSLATION LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * synthesizeEmotionalZeitgeist — The two-pass Emotional Translation Layer.
 * Takes raw world events (or a 3-sentence psychological summary) and
 * converts them into a description of how people are FEELING — not what happened.
 *
 * This is the single highest-leverage change in v3. Headlines don't generate
 * empathy. Felt emotional states do.
 */
export const synthesizeEmotionalZeitgeist = internalAction({
    args: {
        rawEvents: v.string(),
        modelId: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

        const payload = {
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
            max_tokens: 400,
        };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stars.guide",
                "X-Title": "Stars.Guide Emotional Translation",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenRouter returned empty emotional translation");

        return content.trim();
    },
});
