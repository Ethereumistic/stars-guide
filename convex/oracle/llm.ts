"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  buildPrompt,
  type ScenarioInjection,
  parseTitleFromResponse,
} from "../../lib/oracle/promptBuilder";
import { buildFeatureContext } from "../../lib/oracle/featureContext";
import {
  getOracleFeature,
  isOracleFeatureKey,
} from "../../lib/oracle/features";
import {
  type ProviderConfig,
  type ModelChainEntry,
  parseProvidersConfig,
  parseModelChain,
  buildProviderHeaders,
  buildProviderUrl,
  tierForIndex,
} from "../../lib/oracle/providers";

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "don't want to be here",
  "want to die",
  "better off dead",
  "no reason to live",
];

const STREAM_FLUSH_INTERVAL_MS = 300;

interface LLMResponse {
  content: string;
  modelUsed: string;
  fallbackTier: string;
  promptTokens?: number;
  completionTokens?: number;
  title?: string | null;
}

function buildUserContextBlock(params: {
  categoryName: string;
  followUpAnswers: Array<{
    followUpId: Id<"oracle_follow_ups">;
    answer: string;
    skipped: boolean;
  }>;
  followUps: Array<{
    _id: Id<"oracle_follow_ups">;
    contextLabel: string;
  }>;
}): string {
  if (!params.followUpAnswers.length) {
    return "";
  }

  const followUpById = new Map(
    params.followUps.map((followUp) => [followUp._id, followUp]),
  );

  const lines = ["---USER CONTEXT---", `Category: ${params.categoryName}`, ""];

  for (const answer of params.followUpAnswers) {
    if (answer.skipped) {
      continue;
    }

    const followUp = followUpById.get(answer.followUpId);
    const label = followUp?.contextLabel ?? "response";
    lines.push(`- ${label}: ${answer.answer}`);
  }

  lines.push("---END USER CONTEXT---");
  return lines.join("\n");
}

export const invokeOracle = action({
  args: {
    sessionId: v.id("oracle_sessions"),
    userQuestion: v.string(),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    const killSwitch = await ctx.runQuery(api.oracle.settings.getSetting, {
      key: "kill_switch",
    });

    if (killSwitch?.value === "true") {
      const fallbackText = await ctx.runQuery(api.oracle.settings.getSetting, {
        key: "fallback_response_text",
      });
      const offlineMessage =
        fallbackText?.value ??
        "The Oracle rests. Return soon. ->";

      await ctx.runMutation(api.oracle.sessions.addMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: offlineMessage,
        fallbackTierUsed: "D",
      });

      return {
        content: offlineMessage,
        modelUsed: "kill_switch",
        fallbackTier: "D",
      };
    }

    const hasCrisisSignal = CRISIS_KEYWORDS.some((keyword) =>
      args.userQuestion.toLowerCase().includes(keyword),
    );

    if (hasCrisisSignal) {
      const crisisResponse = await ctx.runQuery(api.oracle.settings.getSetting, {
        key: "crisis_response_text",
      });
      const crisisText =
        crisisResponse?.value ??
        "I see you, and what you're carrying right now matters deeply. Please reach out to the Crisis Text Line - text HOME to 741741 - or call the 988 Suicide & Crisis Lifeline.";

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

    const session = await ctx.runQuery(api.oracle.sessions.getSessionWithMessages, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new Error("Session not found");
    }

    const runtimeSettings = await ctx.runQuery(
      api.oracle.settings.getPromptRuntimeSettings,
      {},
    );

    let categoryContext = "";
    if (session.categoryId) {
      const categoryRecord = await ctx.runQuery(api.oracle.injections.getCategoryContext, {
        categoryId: session.categoryId,
      });
      categoryContext = categoryRecord?.contextText ?? "";
    }

    let scenarioInjection: ScenarioInjection | null = null;
    let featureInjection = "";
    let natalContext = "";
    let followUps: Array<{ _id: Id<"oracle_follow_ups">; contextLabel: string }> = [];
    const activeFeature = isOracleFeatureKey(session.featureKey)
      ? getOracleFeature(session.featureKey)
      : null;

    if (session.templateId || activeFeature) {
      const [injection, templateFollowUps, featureRecord] = await Promise.all([
        session.templateId
          ? ctx.runQuery(api.oracle.injections.getScenarioInjection, {
              templateId: session.templateId,
            })
          : Promise.resolve(null),
        session.templateId
          ? ctx.runQuery(api.oracle.followUps.getFollowUpsByTemplate, {
              templateId: session.templateId,
            })
          : Promise.resolve([]),
        activeFeature
          ? ctx.runQuery(api.oracle.injections.getFeatureInjection, {
              featureKey: activeFeature.key,
            })
          : Promise.resolve(null),
      ]);

      if (injection) {
        scenarioInjection = {
          toneModifier: injection.toneModifier,
          psychologicalFrame: injection.psychologicalFrame,
          avoid: injection.avoid,
          emphasize: injection.emphasize,
          openingAcknowledgmentGuide: injection.openingAcknowledgmentGuide,
          rawInjectionText: injection.rawInjectionText,
          useRawText: injection.useRawText,
        };
      }

      followUps = (templateFollowUps ?? []).map((followUp: any) => ({
        _id: followUp._id,
        contextLabel: followUp.contextLabel,
      }));
      featureInjection = featureRecord?.contextText ?? "";
    }

    if (activeFeature?.requiresBirthData) {
      const user = await ctx.runQuery(api.users.current, {});

      if (user?.birthData) {
        natalContext = buildFeatureContext(activeFeature.key, user.birthData);
      } else {
        natalContext = [
          "[FEATURE CONTEXT]",
          `Feature: ${activeFeature.label}`,
          "Birth data status: unavailable for this user.",
          "Do not pretend you know their chart. Say plainly that the birth chart data is missing.",
          "[END FEATURE CONTEXT]",
        ].join("\n");
      }
    }

    const userContext = buildUserContextBlock({
      categoryName: session.categoryName ?? "General",
      followUpAnswers: session.followUpAnswers,
      followUps,
    });

    const prompt = buildPrompt({
      soulDocs: runtimeSettings.soulDocs,
      categoryContext,
      scenarioInjection,
      featureInjection,
      natalContext,
      userContext,
      userQuestion: args.userQuestion,
    });

    const conversationHistory = session.messages
      .filter((message: any) => message.role === "user" || message.role === "assistant")
      .map((message: any) => ({
        role: message.role,
        content: message.content,
      }));

    const lastHistoryMessage = conversationHistory[conversationHistory.length - 1];
    const historyWithoutCurrentQuestion =
      lastHistoryMessage?.role === "user" && lastHistoryMessage.content === args.userQuestion
        ? conversationHistory.slice(0, -1)
        : conversationHistory;

    const config = {
      temperature: runtimeSettings.modelSettings.temperature,
      maxTokens: runtimeSettings.tokenLimits.tokens_hard_limit,
      topP: runtimeSettings.modelSettings.topP,
      stream: runtimeSettings.modelSettings.streamEnabled,
    };

    // ── Multi-Provider Model Chain ──
    const providers = runtimeSettings.providers;
    const modelChain = runtimeSettings.modelChain;

    for (let i = 0; i < modelChain.length; i++) {
      const entry = modelChain[i];
      const provider = providers.find((p: ProviderConfig) => p.id === entry.providerId);

      if (!provider) {
        console.error(`Oracle: Provider "${entry.providerId}" not found for model "${entry.model}", skipping`);
        continue;
      }

      const tier = tierForIndex(i);

      try {
        const result = await callProviderStreaming(
          ctx,
          provider,
          entry.model,
          prompt,
          config,
          historyWithoutCurrentQuestion,
          args.sessionId,
          tier,
        );

        if (result) {
          const isFirstResponse = !session.messages.some(
            (message: any) => message.role === "assistant",
          );
          if (isFirstResponse) {
            await ctx.runMutation(api.oracle.quota.incrementQuota, {});
          }

          // Persist title on first response if model provided one
          if (isFirstResponse && result.title) {
            await ctx.runMutation(internal.oracle.sessions.updateSessionTitle, {
              sessionId: args.sessionId,
              title: result.title,
            });
          }

          return {
            content: result.contentWithoutTitle,
            modelUsed: `${provider.id}/${entry.model}`,
            fallbackTier: tier,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
          };
        }
      } catch (error) {
        console.error(`Oracle ${provider.id}/${entry.model} (tier ${tier}) failed:`, error);
      }
    }

    const fallbackText = await ctx.runQuery(api.oracle.settings.getSetting, {
      key: "fallback_response_text",
    });
    const fallbackContent =
      fallbackText?.value ??
      "The stars are momentarily beyond my reach - cosmic interference is rare, but it happens. Please try again in a moment. ->";

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
 * Generic streaming call to any OpenAI-compatible chat completions endpoint.
 * Works with OpenRouter, Ollama, and any OpenAI-compatible API.
 */
async function callProviderStreaming(
  ctx: any,
  provider: ProviderConfig,
  model: string,
  prompt: { systemPrompt: string; userMessage: string },
  config: { temperature: number; maxTokens: number; topP: number; stream: boolean },
  conversationHistory: { role: string; content: string }[],
  sessionId: Id<"oracle_sessions">,
  tier: string,
): Promise<{ content: string; contentWithoutTitle: string; title: string | null; promptTokens?: number; completionTokens?: number } | null> {
  const apiKey = process.env[provider.apiKeyEnvVar];

  // Ollama (local) may not need an API key; others require one
  if (provider.type !== "ollama" && !apiKey) {
    console.error(`Oracle: ${provider.apiKeyEnvVar} not set for provider "${provider.id}"`);
    return null;
  }

  // Build messages
  const messages: { role: string; content: string }[] = [
    { role: "system", content: prompt.systemPrompt },
    ...conversationHistory,
    { role: "user", content: prompt.userMessage },
  ];

  const url = buildProviderUrl(provider);
  const headers = buildProviderHeaders(provider, apiKey);

  const requestBody = {
    model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error(`Oracle ${provider.id}/${model} fetch failed:`, error);
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Oracle ${provider.id}/${model} error: ${response.status} - ${errorText}`);
    return null;
  }

  if (!response.body) {
    console.error(`Oracle ${provider.id}/${model}: no response body for stream`);
    return null;
  }

  const messageId: Id<"oracle_messages"> = await ctx.runMutation(
    internal.oracle.sessions.createStreamingMessage,
    { sessionId },
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let lastFlushTime = Date.now();
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) {
          continue;
        }

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullContent += token;
          }

          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens;
            completionTokens = parsed.usage.completion_tokens;
          }
        } catch {
          // Ignore partial JSON frames.
        }
      }

      const now = Date.now();
      if (fullContent && now - lastFlushTime >= STREAM_FLUSH_INTERVAL_MS) {
        await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
          messageId,
          content: fullContent,
        });
        lastFlushTime = now;
      }
    }
  } catch (error) {
    console.error(`Oracle ${provider.id}/${model} stream read error:`, error);
    if (!fullContent) {
      const recoveryText = "The cosmic channels wavered. Please try again. ->";
      await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
        messageId,
        content: recoveryText,
      });
      await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
        messageId,
        sessionId,
        content: recoveryText,
        fallbackTierUsed: "D",
      });
      return null;
    }
  }

  if (!fullContent) {
    const emptyText = "The stars fell silent. Please try again. ->";
    console.error(`Oracle ${provider.id}/${model}: stream completed with no content`);
    await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
      messageId,
      content: emptyText,
    });
    await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
      messageId,
      sessionId,
      content: emptyText,
      fallbackTierUsed: "D",
    });
    return null;
  }

  // Parse title from the complete response before finalizing
  const { title, contentWithoutTitle } = parseTitleFromResponse(fullContent);

  // Final flush: update streaming content with the title-stripped version
  await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
    messageId,
    content: contentWithoutTitle,
  });

  await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
    messageId,
    sessionId,
    content: contentWithoutTitle,
    modelUsed: `${provider.id}/${model}`,
    promptTokens,
    completionTokens,
    fallbackTierUsed: tier,
  });

  return { content: fullContent, contentWithoutTitle, title, promptTokens, completionTokens };
}