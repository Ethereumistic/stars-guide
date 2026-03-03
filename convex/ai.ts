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
 */
function formatCosmicWeatherForPrompt(snapshot: CosmicWeatherData): string {
    const planets = snapshot.planetPositions
        .map((p) => {
            const retro = p.isRetrograde ? " ℞ (RETROGRADE)" : "";
            return `${p.planet} in ${p.sign} (${p.degreeInSign}°)${retro}`;
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

/**
 * callOpenRouter — Makes a single API call to OpenRouter.
 * Handles the HTTP request, error checking, and JSON extraction.
 * Now includes cosmic weather data in the prompt when available.
 */
async function callOpenRouter(
    sign: string,
    dates: string[],
    zeitgeistSummary: string,
    masterContext: string,
    modelId: string,
    apiKey: string,
    cosmicWeatherText?: string
): Promise<unknown> {
    // Build the user message with cosmic weather injected
    const cosmicWeatherBlock = cosmicWeatherText
        ? `\n\nCOSMIC WEATHER (USE THIS TO GROUND THE HOROSCOPE IN TODAY'S ACTUAL SKY):\n${cosmicWeatherText}\nWeave the relevant planetary data naturally into the copy.\nDo NOT list planets robotically. Reference them the way a real astrologer would —\nas felt energies, not data points.`
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
TARGET DATES: ${dates.join(", ")}${cosmicWeatherBlock}

CURRENT WORLD VIBE (ZEITGEIST):
${zeitgeistSummary}

TASK: Generate horoscopes for the above sign and dates.
Map both the Cosmic Weather and the Zeitgeist to this sign's psychological wiring.
Output ONLY valid JSON matching the schema in the system prompt.`,
            },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" },
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://stars.guide",
            "X-Title": "Stars.Guide Horoscope Engine",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Extract the content from the response
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("OpenRouter returned empty content");
    }

    // Parse and sanitize the JSON response
    return sanitizeLLMJson(content);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CORE ENGINE — runGenerationJob
// ═══════════════════════════════════════════════════════════════════════════

/**
 * runGenerationJob — Internal action that runs entirely server-side.
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

        // 2. Fetch zeitgeist and master context
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

        // 3b. Fetch or compute Cosmic Weather for the first target date
        //     (all dates in a batch are typically sequential, so we use the first)
        let cosmicWeatherText: string | undefined;
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
                console.log(`Cosmic weather loaded for ${targetDate}`);
            }
        } catch (err) {
            // Non-fatal: generation proceeds without cosmic weather
            console.warn("Failed to fetch/compute cosmic weather, proceeding without:", err);
        }

        // 4. Process signs one at a time
        let completedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const sign of job.targetSigns) {
            try {
                // First attempt
                const result = await callOpenRouter(
                    sign, job.targetDates, zeitgeist.summary, masterContext, job.modelId, apiKey, cosmicWeatherText
                );
                const validated = LLMResponseSchema.safeParse(result);

                if (!validated.success) {
                    // Zod validation failed — retry once
                    console.warn(`Validation failed for ${sign}, retrying...`, validated.error.message);
                    await sleep(RETRY_DELAY_MS);

                    const retryResult = await callOpenRouter(
                        sign, job.targetDates, zeitgeist.summary, masterContext, job.modelId, apiKey, cosmicWeatherText
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
                        sign, job.targetDates, zeitgeist.summary, masterContext, job.modelId, apiKey, cosmicWeatherText
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
// ZEITGEIST AI SYNTHESIS
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

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenRouter returned empty synthesis");

        return content.trim();
    },
});
