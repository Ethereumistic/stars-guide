"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { z } from "zod";

// ─── SAFETY CONSTANTS ─────────────────────────────────────────────────────
const MAX_RETRIES_PER_SIGN = 2;       // Max 2 attempts per sign (1 original + 1 retry)
const RETRY_DELAY_MS = 3000;          // Wait 3s before retry
const MAX_TOTAL_FAILURES = 6;         // If 6+ signs fail, abort entire job
const INTER_DATE_DELAY_MS = 3000;     // Sleep between date batches (shared context switch)
const INTER_SIGN_DELAY_MS = 500;      // Sleep between signs within a date (minimal)

// ─── ZOD VALIDATION SCHEMAS (The LLM Lie Defense) ────────────────────────
const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const LLMResponseSchema = z.object({
    sign: z.enum(VALID_SIGNS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    content: z.string().min(1, "Content cannot be empty"),
    // NOTE: Character length (330-460) is validated visually in the Review UI,
    // NOT here. This prevents discarding great AI content that's slightly
    // over/under the limit. The admin decides in the review step.
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
    date: string,
    emotionalZeitgeist: string,
    masterContext: string,
    modelId: string,
    apiKey: string,
    cosmicWeatherText?: string,
    moonPhaseFrame?: string,
    hookText?: string,
): Promise<unknown> {
    // Build the v4 user message — one sign, one date
    const moonPhaseBlock = moonPhaseFrame
        ? `\n\nMOON PHASE FRAME: ${moonPhaseFrame}`
        : "";

    const cosmicWeatherBlock = cosmicWeatherText
        ? `\n\nCOSMIC WEATHER FOR THIS DATE:\n${cosmicWeatherText}`
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
        max_tokens: 1024,
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

        const masterContext = await ctx.runQuery(internal.aiQueries.assembleSystemPrompt, {});
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

        // 4. Process dates × signs — date-first axis
        //    All 12 signs share identical cosmic weather for a given date.
        //    Iterating date-first keeps the LLM context coherent.
        let completedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (let dateIdx = 0; dateIdx < job.targetDates.length; dateIdx++) {
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
                    // v4: Use felt language if available, fall back to raw data
                    if (cosmicWeather.feltLanguage) {
                        cosmicWeatherText = `COSMIC WEATHER FOR ${targetDate}:\n${cosmicWeather.feltLanguage}`;
                    } else {
                        cosmicWeatherText = formatCosmicWeatherForPrompt(cosmicWeather);
                    }
                    const { getMoonPhaseFrame, getMoonPhaseCategory } = await import("./lib/astronomyEngine");
                    moonPhaseFrame = getMoonPhaseFrame(cosmicWeather.moonPhase.name);
                    moonPhaseCategory = getMoonPhaseCategory(cosmicWeather.moonPhase.name);
                    console.log(`Cosmic weather + moon phase frame loaded for ${targetDate} (${cosmicWeather.moonPhase.name})`);
                }
            } catch (err) {
                console.warn(`Failed to fetch/compute cosmic weather for ${targetDate}, proceeding without:`, err);
            }

            // Fetch hook archetype ONCE per date (moon phase is date-specific)
            let hookText: string | undefined;
            let selectedHookId: string | undefined;
            try {
                // v4: Pass emotional register from zeitgeist to hook selection
                const emotionalRegister = zeitgeist.emotionalRegister
                    ? zeitgeist.emotionalRegister.split(",").map((r: string) => r.trim())
                    : undefined;
                const hook = await ctx.runQuery(internal.hooks.getAssignedHook, {
                    hookId: job.hookId || undefined,
                    moonPhaseCategory: moonPhaseCategory,
                    emotionalRegister,
                });
                if (hook) {
                    hookText = formatHookForPrompt(hook);
                    selectedHookId = hook._id;
                    console.log(`Hook archetype assigned: ${hook.name}`);
                }
            } catch (err) {
                console.warn("Failed to fetch hook archetype, proceeding without:", err);
            }

            // Inner loop: iterate signs for this date
            for (const sign of job.targetSigns) {
                try {
                    const result = await callOpenRouter(
                        sign, targetDate, emotionalZeitgeist, masterContext,
                        job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
                    );
                    const validated = LLMResponseSchema.safeParse(result);

                    if (!validated.success) {
                        console.warn(`Validation failed for ${sign} ${targetDate}, retrying...`, validated.error.message);
                        await sleep(RETRY_DELAY_MS);

                        const retryResult = await callOpenRouter(
                            sign, targetDate, emotionalZeitgeist, masterContext,
                            job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
                        );
                        const retryValidated = LLMResponseSchema.safeParse(retryResult);

                        if (!retryValidated.success) {
                            failedCount++;
                            errors.push(`${sign} ${targetDate}: Validation failed after retry — ${retryValidated.error.message}`);
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
                                return;
                            }
                            continue;
                        }

                        // Retry succeeded — save as single sign/date
                        await ctx.runMutation(internal.admin.upsertHoroscope, {
                            data: retryValidated.data,
                            zeitgeistId: job.zeitgeistId,
                            jobId: args.jobId,
                        });
                    } else {
                        // First attempt succeeded — save immediately as single sign/date
                        await ctx.runMutation(internal.admin.upsertHoroscope, {
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
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error processing ${sign} ${targetDate}:`, errorMessage);

                    // Retry once for network errors
                    try {
                        await sleep(RETRY_DELAY_MS);
                        const retryResult = await callOpenRouter(
                            sign, targetDate, emotionalZeitgeist, masterContext,
                            job.modelId, apiKey, cosmicWeatherText, moonPhaseFrame, hookText
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
                                jobId: args.jobId,
                                completed: completedCount,
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
                        jobId: args.jobId,
                        failed: failedCount,
                        errors,
                    });

                    if (failedCount >= MAX_TOTAL_FAILURES) {
                        await ctx.runMutation(internal.admin.failJob, {
                            jobId: args.jobId,
                            errors,
                        });
                        return;
                    }
                }

                // Rate limit: minimal delay between signs within same date
                await sleep(INTER_SIGN_DELAY_MS);
            }

            // Rate limit: longer delay between date batches
            if (dateIdx < job.targetDates.length - 1) {
                await sleep(INTER_DATE_DELAY_MS);
            }

            // v4: Increment hook usage count after the date batch completes
            if (selectedHookId) {
                try {
                    await ctx.runMutation(internal.hooks.incrementHookUsage, {
                        hookId: selectedHookId as any,
                    });
                } catch (err) {
                    console.warn("Failed to increment hook usage:", err);
                }
            }
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

        // Pass 1: Emotional Translation
        const emotionalPayload = {
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

        const emotionalResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stars.guide",
                "X-Title": "Stars.Guide Emotional Translation",
            },
            body: JSON.stringify(emotionalPayload),
        });

        if (!emotionalResponse.ok) {
            const errorBody = await emotionalResponse.text();
            throw new Error(`OpenRouter API error ${emotionalResponse.status}: ${errorBody}`);
        }

        const emotionalData = await emotionalResponse.json() as any;
        const emotionalContent = emotionalData?.choices?.[0]?.message?.content;
        if (!emotionalContent) throw new Error("OpenRouter returned empty emotional translation");

        // Pass 2: Emotional Register Classification
        let emotionalRegister = "";
        try {
            const classifyPayload = {
                model: "google/gemini-2.5-flash-lite",
                messages: [
                    {
                        role: "system",
                        content: `Classify the emotional register of this text.
Choose 1-2 from: anxious, expansive, tender, defiant, restless, hopeful, grief, clarity.
Output ONLY a JSON array, e.g. ["anxious", "restless"]`,
                    },
                    {
                        role: "user",
                        content: emotionalContent.trim(),
                    },
                ],
                temperature: 0.3,
                max_tokens: 100,
                response_format: { type: "json_object" },
            };

            const classifyResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://stars.guide",
                    "X-Title": "Stars.Guide Register Classification",
                },
                body: JSON.stringify(classifyPayload),
            });

            if (classifyResponse.ok) {
                const classifyData = await classifyResponse.json() as any;
                const classifyContent = classifyData?.choices?.[0]?.message?.content;
                if (classifyContent) {
                    const parsed = JSON.parse(classifyContent.replace(/```json\n?|```/g, "").trim());
                    const registers = Array.isArray(parsed) ? parsed : (parsed.registers ?? []);
                    emotionalRegister = registers.slice(0, 2).join(",");
                }
            }
        } catch {
            // Non-fatal: if classification fails, proceed without register
            console.warn("Emotional register classification failed, continuing without.");
        }

        // Return both the translation and the register (comma-separated)
        return JSON.stringify({
            translation: emotionalContent.trim(),
            emotionalRegister,
        });
    },
});
