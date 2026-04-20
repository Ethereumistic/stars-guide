"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  buildPrompt,
  parseTitleFromResponse,
  deriveTitleFromContent,
} from "../../lib/oracle/promptBuilder";
import { buildFeatureContext } from "../../lib/oracle/featureContext";
import {
  getOracleFeature,
  isOracleFeatureKey,
  classifyUserIntent,
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

const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicide|suicidal)\b/i,
  /\b(kill\s+myself|kms)\b/i,
  /\b(end\s+my\s+life)\b/i,
  /\b(don'?t\s+want\s+to\s+(be\s+)?here)\b/i,
  /\b(want\s+to\s+die)\b/i,
  /\b(better\s+off\s+dead)\b/i,
  /\b(no\s+reason\s+to\s+live)\b/i,
  /\b(self[-\s]?harm|hurting\s+myself|hurt\s+myself)\b/i,
  /\b(end\s+it\s+all)\b/i,
  /\b(can'?t\s+go\s+on|can'?t\s+keep\s+going)\b/i,
  /\b(no\s+point\s+(in\s+)?living)\b/i,
  /\b(overdose|od\s+on)\b/i,
  /\b(cut\s+myself|cutting\s+myself)\b/i,
  /\b(not\s+worth\s+living)\b/i,
  /\b(give\s+up\s+on\s+life)\b/i,
  /\b(want\s+to\s+disappear|wish\s+i\s+(could|would)\s+disappear)\b/i,
  /\b(wish\s+i\s+was\s+dead|wish\s+i\s+were\s+dead)\b/i,
  /\b(jump\s+off|throw\s+myself)\b/i,
  /\b(nothing\s+left\s+to\s+live\s+for)\b/i,
  /\b(the\s+world\s+(would\s+be\s+)?better\s+without\s+me)\b/i,
  /\b(i\s+(just\s+)?want\s+(it\s+)?to\s+(end|stop|be\s+over))\b/i,
  /\b(take\s+my\s+(own\s+)?life)\b/i,
];


const MAX_USER_QUESTION_LENGTH = 2000;

/** Simple, fast hash for system prompt observability (not cryptographic) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

interface LLMResponse {
  content: string;
  modelUsed: string;
  fallbackTier: string;
  promptTokens?: number;
  completionTokens?: number;
  title?: string | null;
}

export const invokeOracle = action({
  args: {
    sessionId: v.id("oracle_sessions"),
    userQuestion: v.string(),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    // ── Input validation ──────────────────────────────────────────────────
    if (args.userQuestion.length > MAX_USER_QUESTION_LENGTH) {
      throw new Error(
        `Question is too long (${args.userQuestion.length} characters). Maximum is ${MAX_USER_QUESTION_LENGTH} characters.`,
      );
    }

    // ── Kill switch ───────────────────────────────────────────────────────
    const killSwitch = await ctx.runQuery(internal.oracle.settings.getSettingInternal, {
      key: "kill_switch",
    });

    if (killSwitch?.value === "true") {
      const fallbackText = await ctx.runQuery(internal.oracle.settings.getSettingInternal, {
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

    // ── Crisis detection ───────────────────────────────────────────────────
    const hasCrisisSignal = CRISIS_PATTERNS.some((pattern) =>
      pattern.test(args.userQuestion),
    );
    if (hasCrisisSignal) {
      const crisisResponse = await ctx.runQuery(internal.oracle.settings.getSettingInternal, {
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

    // ── Load session and runtime settings ─────────────────────────────────
    const session = await ctx.runQuery(api.oracle.sessions.getSessionWithMessages, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new Error("Session not found");
    }

    const config = await ctx.runQuery(
      internal.oracle.settings.getPromptRuntimeSettingsInternal,
      {},
    );

    // ── Build feature injection and natal context ─────────────────────────
    let featureInjection = "";
    let natalContext = "";

    // Always fetch user data early so intent classifier can check for birth data
    const user = await ctx.runQuery(api.users.current, {});

    let activeFeature = isOracleFeatureKey(session.featureKey)
      ? getOracleFeature(session.featureKey)
      : null;

    // ── Implicit feature activation (intent classification) ────────────────
    if (!activeFeature) {
      const intent = classifyUserIntent(
        args.userQuestion,
        session.featureKey ?? null,
        Boolean(user?.birthData),
      );

      if (intent.autoFeatureKey) {
        // Auto-activate the feature on the session
        await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
          sessionId: args.sessionId,
          featureKey: intent.autoFeatureKey,
        });
        activeFeature = getOracleFeature(intent.autoFeatureKey);
      }
    }

    if (activeFeature) {
      const featureRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
        featureKey: activeFeature.key,
      });

      featureInjection = featureRecord?.contextText ?? activeFeature.fallbackInjectionText ?? "";

      if (activeFeature.requiresBirthData && user?.birthData) {
        natalContext = buildFeatureContext(activeFeature.key, user.birthData);
      } else if (activeFeature.requiresBirthData) {
        natalContext = [
          "[BIRTH CHART ANALYSIS MODE]",
          `Feature: ${activeFeature.label}`,
          "Birth data status: unavailable for this user.",
          "Do not pretend you know their chart. Say plainly that the birth chart data is missing.",
          "[END BIRTH CHART ANALYSIS MODE]",
        ].join("\n");
      }
    }

    // ── Determine if this is the first response ────────────────────────────
    const isFirstResponse = !session.messages.some(
      (message: any) => message.role === "assistant",
    );

    // ── Build prompt (4 params instead of 7) ──────────────────────────────
    const prompt = buildPrompt({
      soulDoc: config.soulDoc,
      featureInjection: featureInjection || null,
      natalContext: natalContext || null,
      userQuestion: args.userQuestion,
      isFirstResponse,
    });

    // Hash the system prompt for observability (stored on each assistant message)
    const systemPromptHash = simpleHash(prompt.systemPrompt);

    // ── Conversation history (truncated to maxContextMessages and maxContextTokens) ─
    const allHistory = session.messages
      .filter((message: any) => message.role === "user" || message.role === "assistant")
      .map((message: any) => ({
        role: message.role,
        content: message.content,
      }));

    // Remove the current question from history if it's the last entry
    const lastHistoryMessage = allHistory[allHistory.length - 1];
    const historyWithoutCurrentQuestion =
      lastHistoryMessage?.role === "user" && lastHistoryMessage.content === args.userQuestion
        ? allHistory.slice(0, -1)
        : allHistory;

    // Truncate to maxContextMessages first
    let conversationHistory = historyWithoutCurrentQuestion.slice(-config.maxContextMessages);

    // Then truncate further to fit within a token budget (~4 chars per token)
    // This prevents token explosion from very long messages
    const MAX_CONTEXT_CHARS = 16000; // ~4000 tokens
    let totalChars = conversationHistory.reduce((sum: number, m: { content: string }) => sum + m.content.length, 0);
    while (totalChars > MAX_CONTEXT_CHARS && conversationHistory.length > 1) {
      totalChars -= conversationHistory[0].content.length;
      conversationHistory = conversationHistory.slice(1);
    }

    const llmConfig = {
      temperature: config.modelSettings.temperature,
      maxTokens: config.maxResponseTokens,
      topP: config.modelSettings.topP,
      stream: config.modelSettings.streamEnabled,
    };

    // ── Multi-Provider Model Chain ─────────────────────────────────────────
    const providers = config.providers;
    const modelChain = config.modelChain;

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
          llmConfig,
          conversationHistory,
          args.sessionId,
          tier,
          systemPromptHash,
        );

        if (result) {
          if (isFirstResponse) {
            await ctx.runMutation(api.oracle.quota.incrementQuota, {});
          }

          // Persist title on first response
          if (isFirstResponse) {
            const hasAI = Boolean(result.title);
            const title = result.title || deriveTitleFromContent(result.contentWithoutTitle);
            await ctx.runMutation(internal.oracle.sessions.updateSessionTitle, {
              sessionId: args.sessionId,
              title,
              titleGenerated: hasAI,
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

    // ── Hardcoded fallback ────────────────────────────────────────────────
    const fallbackText = await ctx.runQuery(internal.oracle.settings.getSettingInternal, {
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
  systemPromptHash?: string,
): Promise<{ content: string; contentWithoutTitle: string; title: string | null; promptTokens?: number; completionTokens?: number } | null> {
  const apiKey = process.env[provider.apiKeyEnvVar];

  // Ollama (local) may not need an API key; others require one
  if (provider.type !== "ollama" && !apiKey) {
    console.error(`Oracle: ${provider.apiKeyEnvVar} not set for provider "${provider.id}"`);
    return null;
  }

  // Build messages — enable prompt caching for cloud providers (OpenRouter, etc.)
  const supportsCacheControl = provider.type !== "ollama";
  const messages: { role: string; content: string; cache_control?: { type: string } }[] = [
    ...(supportsCacheControl
      ? [{ role: "system", content: prompt.systemPrompt, cache_control: { type: "ephemeral" } as const }]
      : [{ role: "system", content: prompt.systemPrompt }]),
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
    stream: config.stream,
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

  // For non-streaming mode, process the complete response
  if (!config.stream) {
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) {
      console.error(`Oracle ${provider.id}/${model}: non-streaming response had no content`);
      return null;
    }

    const { title, contentWithoutTitle } = parseTitleFromResponse(content);
    const promptTokens: number | undefined = data.usage?.prompt_tokens;
    const completionTokens: number | undefined = data.usage?.completion_tokens;

    const messageId: Id<"oracle_messages"> = await ctx.runMutation(
      internal.oracle.sessions.createStreamingMessage,
      { sessionId },
    );

    await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
      messageId,
      sessionId,
      content: contentWithoutTitle,
      modelUsed: `${provider.id}/${model}`,
      promptTokens,
      completionTokens,
      fallbackTierUsed: tier,
      systemPromptHash,
    });

    return { content, contentWithoutTitle, title, promptTokens, completionTokens };
  }

  // For streaming mode, process SSE chunks
  const messageId: Id<"oracle_messages"> = await ctx.runMutation(
    internal.oracle.sessions.createStreamingMessage,
    { sessionId },
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let lastFlushTime = Date.now();
  const streamStartTime = Date.now();
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
      const elapsed = now - streamStartTime;
      const flushInterval = elapsed < 2000 ? 100 : 300;
      if (fullContent && now - lastFlushTime >= flushInterval) {
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
        systemPromptHash,
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
      systemPromptHash,
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
    systemPromptHash,
  });

  return { content: fullContent, contentWithoutTitle, title, promptTokens, completionTokens };
}