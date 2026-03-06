"use node";

import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Oracle LLM Action — Full Prompt Assembly + Streaming via OpenRouter
 *
 * Assembles the complete prompt stack server-side, then streams the response
 * from OpenRouter, periodically saving partial content to Convex so the
 * reactive frontend query shows tokens appearing progressively.
 */

const CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "don't want to be here",
    "want to die", "better off dead", "no reason to live",
];

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const STREAM_FLUSH_INTERVAL_MS = 300; // Flush accumulated tokens to DB every 300ms

interface LLMResponse {
    content: string;
    modelUsed: string;
    fallbackTier: "A" | "B" | "C" | "D";
    promptTokens?: number;
    completionTokens?: number;
}

export const invokeOracle = action({
    args: {
        sessionId: v.id("oracle_sessions"),
        userQuestion: v.string(),
    },
    handler: async (ctx, args): Promise<LLMResponse> => {
        // ─── 0. Kill switch ──────────────────────────────────────────────
        const killSwitch = await ctx.runQuery(api.oracle.settings.getSetting, {
            key: "kill_switch",
        });
        if (killSwitch?.value === "true") {
            const fallbackText = await ctx.runQuery(api.oracle.settings.getSetting, {
                key: "fallback_response_text",
            });
            const offlineMsg = fallbackText?.value ??
                "The Oracle rests. Return soon. ✦";

            await ctx.runMutation(api.oracle.sessions.addMessage, {
                sessionId: args.sessionId,
                role: "assistant",
                content: offlineMsg,
                fallbackTierUsed: "D",
            });

            return {
                content: offlineMsg,
                modelUsed: "kill_switch",
                fallbackTier: "D",
            };
        }

        // ─── 1. Crisis pre-check ─────────────────────────────────────────
        const hasCrisisSignal = CRISIS_KEYWORDS.some((kw) =>
            args.userQuestion.toLowerCase().includes(kw)
        );

        if (hasCrisisSignal) {
            const crisisResponse = await ctx.runQuery(api.oracle.settings.getSetting, {
                key: "crisis_response_text",
            });
            const crisisText = crisisResponse?.value ??
                "I see you, and what you're carrying right now matters deeply. Please reach out to the Crisis Text Line — text HOME to 741741 — or call the 988 Suicide & Crisis Lifeline. 💜";

            await ctx.runMutation(api.oracle.sessions.addMessage, {
                sessionId: args.sessionId,
                role: "assistant",
                content: crisisText,
                fallbackTierUsed: "D",
            });

            return {
                content: crisisText,
                modelUsed: "crisis_response",
                fallbackTier: "D",
            };
        }

        // ─── 2. Fetch session data ───────────────────────────────────────
        const session = await ctx.runQuery(api.oracle.sessions.getSessionWithMessages, {
            sessionId: args.sessionId,
        });
        if (!session) throw new Error("Session not found");

        // ─── 3. Assemble prompt layers ───────────────────────────────────
        // Layer 1: Soul Prompt
        const soulPromptSetting = await ctx.runQuery(api.oracle.settings.getSetting, {
            key: "soul_prompt",
        });
        const soulPrompt = soulPromptSetting?.value ??
            "You are Oracle, a mystical astrological guide embedded within Stars.Guide. You speak with cosmic wisdom, warmth, and psychological depth. You never claim to predict the future definitively — instead you illuminate patterns, energies, and possibilities through the lens of astrology.";

        // Layer 2: Category Context
        let categoryContext = "";
        if (session.categoryId) {
            const catCtx = await ctx.runQuery(api.oracle.injections.getCategoryContext, {
                categoryId: session.categoryId,
            });
            if (catCtx) categoryContext = catCtx.contextText;
        }

        // Layer 3: Scenario Injection
        let scenarioBlock = "";
        if (session.templateId) {
            const injection = await ctx.runQuery(api.oracle.injections.getScenarioInjection, {
                templateId: session.templateId,
            });
            if (injection) {
                if (injection.useRawText && injection.rawInjectionText) {
                    scenarioBlock = injection.rawInjectionText;
                } else {
                    const parts: string[] = ["[SCENARIO INJECTION]"];
                    if (injection.toneModifier) parts.push(`Tone: ${injection.toneModifier}`);
                    if (injection.psychologicalFrame) parts.push(`Psychological Frame: ${injection.psychologicalFrame}`);
                    if (injection.avoid) parts.push(`Avoid: ${injection.avoid}`);
                    if (injection.emphasize) parts.push(`Emphasize: ${injection.emphasize}`);
                    if (injection.openingAcknowledgmentGuide) parts.push(`Opening: ${injection.openingAcknowledgmentGuide}`);
                    scenarioBlock = parts.join("\n");
                }
            }
        }

        // Layer 4: User Context from follow-up answers
        let userContextBlock = "";
        const categoryName = session.categoryName ?? "General";
        if (session.followUpAnswers && session.followUpAnswers.length > 0) {
            const contextLines: string[] = ["---USER CONTEXT---", `Category: ${categoryName}`, ""];
            for (const answer of session.followUpAnswers) {
                if (answer.skipped) continue;
                const followUp = await ctx.runQuery(api.oracle.followUps.getFollowUpsByTemplate, {
                    templateId: session.templateId!,
                });
                const fu = followUp?.find((f: any) => f._id === answer.followUpId);
                const label = fu?.contextLabel ?? "response";
                contextLines.push(`  - ${label}: ${answer.answer}`);
            }
            contextLines.push("---END USER CONTEXT---");
            userContextBlock = contextLines.join("\n");
        }

        // ─── 4. Assemble system + conversation messages ──────────────────
        const systemParts = [soulPrompt];
        if (categoryContext) systemParts.push(categoryContext);
        if (scenarioBlock) systemParts.push(scenarioBlock);
        const systemPrompt = systemParts.join("\n\n---\n\n");

        const conversationMessages: { role: string; content: string }[] = [
            { role: "system", content: systemPrompt },
        ];

        for (const msg of session.messages) {
            if (msg.role === "user" || msg.role === "assistant") {
                let content = msg.content;
                if (msg.role === "user" && msg === session.messages.find((m: any) => m.role === "user") && userContextBlock) {
                    content = userContextBlock + "\n\n" + content;
                }
                conversationMessages.push({ role: msg.role, content });
            }
        }

        const lastUserMsg = conversationMessages.filter((m) => m.role === "user").pop();
        if (!lastUserMsg || lastUserMsg.content !== args.userQuestion) {
            conversationMessages.push({ role: "user", content: args.userQuestion });
        }

        // ─── 5. Read model configuration ─────────────────────────────────
        const [modelA, modelB, modelC, tempSetting, maxTokensSetting, topPSetting, fallbackText] =
            await Promise.all([
                ctx.runQuery(api.oracle.settings.getSetting, { key: "model_a" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "model_b" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "model_c" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "temperature" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "max_tokens" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "top_p" }),
                ctx.runQuery(api.oracle.settings.getSetting, { key: "fallback_response_text" }),
            ]);

        const config = {
            temperature: tempSetting ? parseFloat(tempSetting.value) : 0.82,
            maxTokens: maxTokensSetting ? parseInt(maxTokensSetting.value) : 600,
            topP: topPSetting ? parseFloat(topPSetting.value) : 0.92,
        };

        const models = [
            { model: modelA?.value ?? "google/gemini-2.5-flash", tier: "A" as const },
            { model: modelB?.value ?? "anthropic/claude-sonnet-4", tier: "B" as const },
            { model: modelC?.value ?? "x-ai/grok-4.1-fast", tier: "C" as const },
        ];

        // ─── 6. Try each model with STREAMING ───────────────────────────
        for (const { model, tier } of models) {
            // Skip if model is "NONE"
            if (model === "NONE") continue;

            try {
                const result = await callOpenRouterStreaming(
                    ctx,
                    model,
                    conversationMessages,
                    config,
                    args.sessionId,
                    tier,
                );

                if (result) {
                    // Quota increment only on first response
                    const isFirstResponse = !session.messages.some((m: any) => m.role === "assistant");
                    if (isFirstResponse) {
                        await ctx.runMutation(api.oracle.quota.incrementQuota, {});
                    }

                    // Session status updated by finalizeStreamingMessage
                    return {
                        content: result.content,
                        modelUsed: model,
                        fallbackTier: tier,
                        promptTokens: result.promptTokens,
                        completionTokens: result.completionTokens,
                    };
                }
            } catch (error) {
                console.error(`Oracle Model ${tier} (${model}) failed:`, error);
            }
        }

        // ─── 7. All models failed → Response D ──────────────────────────
        const fallbackContent = fallbackText?.value ??
            "The stars are momentarily beyond my reach — cosmic interference is rare, but it happens. Please try again in a moment. ✦";

        await ctx.runMutation(api.oracle.sessions.addMessage, {
            sessionId: args.sessionId,
            role: "assistant",
            content: fallbackContent,
            fallbackTierUsed: "D",
        });

        await ctx.runMutation(api.oracle.sessions.updateSessionStatus, {
            sessionId: args.sessionId,
            status: "active",
        });

        return {
            content: fallbackContent,
            modelUsed: "fallback_hardcoded",
            fallbackTier: "D",
        };
    },
});

/**
 * Streams from OpenRouter, periodically saving partial content to the DB.
 * The frontend's reactive query auto-updates as the message grows.
 *
 * Returns null on failure (allows fallback chain to continue).
 */
async function callOpenRouterStreaming(
    ctx: any,
    model: string,
    messages: { role: string; content: string }[],
    config: { temperature: number; maxTokens: number; topP: number },
    sessionId: Id<"oracle_sessions">,
    tier: "A" | "B" | "C",
): Promise<{ content: string; promptTokens?: number; completionTokens?: number } | null> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("OPENROUTER_API_KEY not set");
        return null;
    }

    let response: Response;
    try {
        response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stars.guide",
                "X-Title": "Stars.Guide Oracle",
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                top_p: config.topP,
                stream: true,
            }),
        });
    } catch (error) {
        console.error(`OpenRouter ${model} fetch failed:`, error);
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter ${model} error: ${response.status} — ${errorText}`);
        return null;
    }

    if (!response.body) {
        console.error(`OpenRouter ${model}: no response body for stream`);
        return null;
    }

    // ─── Response OK — create the streaming message in DB ────────────
    const messageId: Id<"oracle_messages"> = await ctx.runMutation(
        internal.oracle.sessions.createStreamingMessage,
        { sessionId },
    );

    // ─── Stream tokens ──────────────────────────────────────────────
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let lastFlushTime = Date.now();
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let buffer = ""; // SSE line buffer for partial chunks

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // Keep incomplete last line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content;
                    if (token) fullContent += token;

                    // Capture usage from the final chunk
                    if (parsed.usage) {
                        promptTokens = parsed.usage.prompt_tokens;
                        completionTokens = parsed.usage.completion_tokens;
                    }
                } catch {
                    // Partial JSON, skip
                }
            }

            // Flush accumulated content to DB periodically
            const now = Date.now();
            if (fullContent && now - lastFlushTime >= STREAM_FLUSH_INTERVAL_MS) {
                await ctx.runMutation(
                    internal.oracle.sessions.updateStreamingContent,
                    { messageId, content: fullContent },
                );
                lastFlushTime = now;
            }
        }
    } catch (error) {
        console.error(`OpenRouter ${model} stream read error:`, error);
        // If we got some content, finalize with what we have
        if (!fullContent) {
            // Delete the empty message
            await ctx.runMutation(
                internal.oracle.sessions.updateStreamingContent,
                { messageId, content: "The cosmic channels wavered. Please try again. ✦" },
            );
            await ctx.runMutation(
                internal.oracle.sessions.finalizeStreamingMessage,
                { messageId, sessionId, content: "The cosmic channels wavered. Please try again. ✦", fallbackTierUsed: "D" },
            );
            return null;
        }
    }

    if (!fullContent) {
        console.error(`OpenRouter ${model}: stream completed with no content`);
        await ctx.runMutation(
            internal.oracle.sessions.updateStreamingContent,
            { messageId, content: "The stars fell silent. Please try again. ✦" },
        );
        await ctx.runMutation(
            internal.oracle.sessions.finalizeStreamingMessage,
            { messageId, sessionId, content: "The stars fell silent. Please try again. ✦", fallbackTierUsed: "D" },
        );
        return null;
    }

    // ─── Finalize: save complete content + metadata ──────────────────
    await ctx.runMutation(
        internal.oracle.sessions.finalizeStreamingMessage,
        {
            messageId,
            sessionId,
            content: fullContent,
            modelUsed: model,
            promptTokens,
            completionTokens,
            fallbackTierUsed: tier,
        },
    );

    return { content: fullContent, promptTokens, completionTokens };
}
