"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  parseTitleFromResponse,
  parseJournalPromptFromResponse,
  deriveTitleFromContent,
  sanitizeUserQuestion,
  ORACLE_TITLE_DIRECTIVE,
  JOURNAL_PROMPT_DIRECTIVE,
} from "../../lib/oracle/promptBuilder";
import {
  type BirthChartDepth,
} from "../../lib/oracle/features";
import { buildUniversalBirthContext } from "../../lib/oracle/featureContext";
import { buildTimespaceContext } from "./timespace";
import {
  type ProviderConfig,
  type ModelChainEntry,
  buildProviderHeaders,
  buildProviderUrl,
  tierForIndex,
} from "../../lib/oracle/providers";
import { selectProvider, releaseProvider } from "./providerRouter";
import { scoreIntentsWithLLM } from "../../lib/oracle/intentRouter";
import { getPipeline } from "../../lib/oracle/pipelines/index";
import { calculateCostMicro, PRICING_TABLE_SETTINGS_KEY } from "./pricing";
import type {
  OraclePipeline,
  PipelineContext,
  SystemPromptBlock,
  UserMessageBlock,
  PostResponseAction,
} from "../../lib/oracle/pipelineTypes";
import type { SynastryPayload } from "../../lib/oracle/pipelineTypes";
import { ORACLE_SAFETY_RULES } from "../../lib/oracle/safetyRules";

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

interface TimingMetrics {
  promptBuildMs: number;
  requestQueueMs: number;
  ttftMs: number;
  initialDecodeMs: number;
  totalMs: number;
}

interface LLMResponse {
  content: string;
  modelUsed: string;
  fallbackTier: string;
  promptTokens?: number;
  completionTokens?: number;
  title?: string | null;
  timingMetrics?: TimingMetrics;
  debugModelUsed?: string | null;
}

export const invokeOracle = action({
  args: {
    sessionId: v.id("oracle_sessions"),
    userQuestion: v.string(),
    timezone: v.optional(v.string()),
    debugModelOverride: v.optional(
      v.object({
        providerId: v.string(),
        model: v.string(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    const actionStartTime = Date.now();

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 0: SAFETY GATES (unchanged from original)
    // ════════════════════════════════════════════════════════════════════════

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

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1: LOAD CONTEXT (unchanged from original)
    // ════════════════════════════════════════════════════════════════════════

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

    const user = await ctx.runQuery(api.users.current, {});

    // ── Legacy feature key migration ──────────────────────────────────────
    let resolvedFeatureKey = session.featureKey;
    if (resolvedFeatureKey === "birth_chart_core" || resolvedFeatureKey === "birth_chart_full") {
      resolvedFeatureKey = "birth_chart";
      await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
        sessionId: args.sessionId,
        featureKey: "birth_chart",
      });
      const legacyDepth: BirthChartDepth = session.featureKey === "birth_chart_full" ? "full" : "core";
      if (!session.birthChartDepth) {
        await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
          sessionId: args.sessionId,
          depth: legacyDepth,
        });
      }
    }

    // ── Journal consent ──────────────────────────────────────────────────
    let hasJournalConsent = false;
    if (user?._id) {
      try {
        const consent = await ctx.runQuery(api.journal.consent.getConsent, {});
        hasJournalConsent = consent?.oracleCanReadJournal === true;
      } catch (e) {
        console.error("Journal consent check failed (non-blocking):", e);
      }
    }

    // ── Determine if this is the first response ────────────────────────────
    const isFirstResponse = !session.messages.some(
      (message: any) => message.role === "assistant",
    );

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2: INTENT ROUTING (NEW — replaces classifyOracleToolIntent)
    // ════════════════════════════════════════════════════════════════════════

    const intentResult = await scoreIntentsWithLLM({
      question: args.userQuestion,
      hasBirthData: Boolean(user?.birthData),
      hasJournalConsent,
      currentFeatureKey: resolvedFeatureKey ?? null,
      providers: config.providers,
      modelChain: config.intentModelChain,
    });

    console.log(`[Oracle] Intent: ${JSON.stringify(intentResult.intents.map(i => `${i.pipelineKey}(${i.confidence.toFixed(2)}:${i.reason})`))}, hasBirthData=${Boolean(user?.birthData)}, hasJournalConsent=${hasJournalConsent}`);

    // Resolve pipelines for all matched intents
    const activePipelines: OraclePipeline[] = intentResult.intents
      .filter((i) => i.confidence >= 0.5)
      .map((intent) => getPipeline(intent.pipelineKey))
      .filter((p): p is OraclePipeline => p !== undefined);

    // If no pipeline matched (shouldn't happen — scoreIntents always returns at least generic_chat)
    if (activePipelines.length === 0) {
      const fallback = getPipeline("generic_chat");
      if (fallback) activePipelines.push(fallback);
    }

    console.log(`[Oracle] Active pipelines: ${activePipelines.map(p => `${p.key}[needsBirth=${p.dataRequirements.needsBirthData}]`).join(', ')}`);

    // Primary pipeline determines model hint
    const primaryPipeline = activePipelines[0];
    const primaryIntent = intentResult.primary;

    // ── Persist auto-activated feature to session ──────────────────────────
    if (!session.featureKey && primaryIntent && primaryIntent.pipelineKey !== "generic_chat") {
      await ctx.runMutation(api.oracle.sessions.updateSessionFeature, {
        sessionId: args.sessionId,
        featureKey: primaryIntent.pipelineKey,
      });
      // If birth_chart with depth, persist that too
      if (primaryIntent.pipelineKey === "birth_chart" && primaryIntent.metadata?.depth) {
        await ctx.runMutation(internal.oracle.sessions.updateSessionBirthChartDepth, {
          sessionId: args.sessionId,
          depth: primaryIntent.metadata.depth as BirthChartDepth,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3: GATHER DATA (pipeline-driven)
    // ════════════════════════════════════════════════════════════════════════

    // Merge data requirements from ALL active pipelines
    const needsBirth = activePipelines.some((p) => p.dataRequirements.needsBirthData);
    const needsJournal = activePipelines.some((p) => p.dataRequirements.needsJournalContext);
    const expandedJournal = activePipelines.some((p) => p.dataRequirements.expandedJournalBudget);
    const needsTimespace = activePipelines.some((p) => p.dataRequirements.needsTimespace);
    const needsSynastryData = activePipelines.some((p) => p.dataRequirements.needsSynastryData);

    // Gather birth data ONLY if a pipeline needs it
    let birthData: string | null = null;
    if (needsBirth && user?.birthData) {
      birthData = buildUniversalBirthContext(user.birthData);
    }

    // Gather journal context (if any pipeline needs it and consent exists)
    let journalContext: string | null = null;
    if (needsJournal && user?._id && hasJournalConsent) {
      try {
        journalContext = await ctx.runQuery(
          internal.journal.context.assembleJournalContext,
          { userId: user._id, expandedBudget: expandedJournal },
        );
      } catch (e) {
        console.error("Journal context assembly failed (non-blocking):", e);
      }
    }

    // Gather timespace context
    let timespaceContext: string | null = null;
    if (needsTimespace) {
      try {
        const tsResult = buildTimespaceContext(
          args.timezone || "UTC",
          args.userQuestion,
        );
        timespaceContext = tsResult.context;
      } catch (e) {
        console.error("Timespace context assembly failed (non-blocking):", e);
      }
    }

    // Load feature injection from DB (for pipelines that use it)
    let featureInjection: string | null = null;
    if (primaryIntent?.pipelineKey === "birth_chart") {
      const depth = (primaryIntent.metadata?.depth as BirthChartDepth) ?? session.birthChartDepth ?? "core";
      try {
        const depthRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
          featureKey: `birth_chart_depth_${depth}`,
        });
        featureInjection = depthRecord?.contextText ?? null;
      } catch (e) {
        // Fall back to hardcoded — pipeline handles this
      }
    } else if (primaryIntent?.pipelineKey === "journal_recall") {
      try {
        const record = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
          featureKey: "journal_recall",
        });
        featureInjection = record?.contextText ?? null;
      } catch (e) {
        // Fall back to hardcoded — pipeline handles this
      }
    }
    // binaural_beats pipeline generates its own injection internally via buildPromptBlocks

    // ── Gather synastry data ────────────────────────────────────────────────────
    let synastryData: SynastryPayload | null = null;
    if (needsSynastryData) {
      // Synastry data comes from the session (stored when the user created it)
      synastryData = (session as any).synastryPayload ?? null;
      if (!synastryData) {
        console.warn("[Oracle] Synastry pipeline active but no synastry payload on session");
      }
    }

    console.log(`[Oracle] Data gathered: birthDataLen=${birthData?.length ?? 0} journalLen=${journalContext?.length ?? 0} timespaceLen=${timespaceContext?.length ?? 0} featureInjection=${featureInjection ? 'yes' : 'no'} synastry=${synastryData ? 'yes' : 'no'}`);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 4: BUILD PROMPT (pipeline-driven)
    // ════════════════════════════════════════════════════════════════════════

    const pipelineCtx: PipelineContext = {
      userQuestion: args.userQuestion,
      timezone: args.timezone || "UTC",
      isFirstResponse,
      featureKey: session.featureKey ?? null,
      birthChartDepth: session.birthChartDepth ?? (primaryIntent?.metadata?.depth as BirthChartDepth | null) ?? null,
      birthData,
      journalContext,
      timespaceContext,
      soulDoc: config.soulDoc,
      featureInjection,
      rawBirthData: user?.birthData ?? null,
      synastryData,
    };

    // Collect prompt blocks from ALL pipelines
    const allSystemBlocks: SystemPromptBlock[] = [];
    const allUserBlocks: UserMessageBlock[] = [];
    for (const pipeline of activePipelines) {
      const blocks = pipeline.buildPromptBlocks(pipelineCtx);
      allSystemBlocks.push(...blocks.systemBlocks);
      allUserBlocks.push(...blocks.userBlocks);
    }

    // Sort system blocks by priority (descending — highest priority first)
    allSystemBlocks.sort((a, b) => b.priority - a.priority);

    console.log(`[Oracle] Prompt blocks: system=[${allSystemBlocks.map(b => `${b.label}(${b.priority})`).join(',')}] user=[${allUserBlocks.map(b => b.label).join(',')}]`);

    // Build the final system prompt
    // Safety rules are ALWAYS first (prepended, not a pipeline concern)
    const systemPromptParts: string[] = [
      ORACLE_SAFETY_RULES,                                                    // Always first, hardcoded
    ];

    for (const block of allSystemBlocks) {
      if (block.content) {
        systemPromptParts.push(block.content);
      }
    }

    // Title directive on first response only
    if (isFirstResponse) {
      systemPromptParts.push(ORACLE_TITLE_DIRECTIVE);
    }

    // Journal prompt directive on first response when journal context is present
    if (isFirstResponse && journalContext) {
      systemPromptParts.push(JOURNAL_PROMPT_DIRECTIVE);
    }

    const systemPrompt = systemPromptParts.join("\n\n");

    // Build the user message
    const sanitizedQuestion = sanitizeUserQuestion(args.userQuestion);
    const userMessageParts: string[] = [];

    for (const block of allUserBlocks) {
      if (block.content) {
        userMessageParts.push(block.content);
      }
    }
    userMessageParts.push(sanitizedQuestion);

    const userMessage = userMessageParts.join("\n\n");

    const promptBuildEndTime = Date.now();

    // Hash the system prompt for observability
    const systemPromptHash = simpleHash(systemPrompt);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 5: QUOTA PRE-CHECK (server-side gate before spending compute)
    // ════════════════════════════════════════════════════════════════════════

    // Read pricing table from DB (defaults to built-in if not set)
    let pricingTable: Record<string, { promptPer1M: number; completionPer1M: number }> = {};
    try {
      const pricingSetting = await ctx.runQuery(
        internal.oracle.settings.getSettingInternal,
        { key: PRICING_TABLE_SETTINGS_KEY },
      );
      if (pricingSetting?.value) {
        try {
          pricingTable = JSON.parse(pricingSetting.value);
        } catch {
          // Use default table if parsing fails
        }
      }
    } catch (e) {
      // Use default table on error
    }

    // Server-side quota gate — reject before making any LLM API calls
    if (user?._id) {
      try {
        const quota = await ctx.runQuery(api.oracle.quota.checkQuota, {});
        if (!quota.allowed) {
          // Return a quota-exceeded message instead of calling the LLM
          const exceededText = "You've reached your quota limit. Please try again later. ->";
          await ctx.runMutation(api.oracle.sessions.addMessage, {
            sessionId: args.sessionId,
            role: "assistant",
            content: exceededText,
            fallbackTierUsed: "D",
          });
          await ctx.runMutation(api.oracle.sessions.updateSessionStatus, {
            sessionId: args.sessionId,
            status: "active",
          });
          return {
            content: exceededText,
            modelUsed: "quota_gate",
            fallbackTier: "D",
          };
        }
      } catch (e) {
        console.error("Quota pre-check failed (non-blocking):", e);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 6: PROVIDER SELECTION + LLM CALL
    // ════════════════════════════════════════════════════════════════════════

    // ── Conversation history ───────────────────────────────────────────────
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

    const providers = config.providers;
    let modelChain = config.modelChain;
    let debugModelUsed: string | null = null;

    // If debug model override is specified, prepend it to the chain
    if (args.debugModelOverride) {
      const overrideEntry: ModelChainEntry = {
        providerId: args.debugModelOverride.providerId,
        model: args.debugModelOverride.model,
      };
      modelChain = [overrideEntry, ...modelChain];
      debugModelUsed = `${args.debugModelOverride.providerId}/${args.debugModelOverride.model}`;
    }

    // ── Try provider router first, then fallback chain ──────────────────────
    const prompt = { systemPrompt, userMessage };
    let result: Awaited<ReturnType<typeof callProviderStreaming>> = null;
    let usedProviderId: string | null = null;
    let usedModel: string | null = null;
    let usedTier: string | null = null;

    // Attempt 1: Use the provider router for concurrency-aware selection
    const selection = selectProvider(modelChain, providers, primaryPipeline?.modelHint);

    if (selection) {
      usedProviderId = selection.provider.id;
      usedModel = selection.entry.model;
      usedTier = selection.tier;

      try {
        result = await callProviderStreaming(
          ctx,
          selection.provider,
          selection.entry.model,
          prompt,
          llmConfig,
          conversationHistory,
          args.sessionId,
          selection.tier,
          systemPromptHash,
          { actionStartTime, promptBuildEndTime },
        );
      } catch (error) {
        console.error(`Oracle ${selection.provider.id}/${selection.entry.model} failed:`, error);
      } finally {
        releaseProvider(selection.provider.id);
      }
    }

    // Attempt 2: If router-selected provider failed, try remaining chain entries
    if (!result) {
      for (let i = 0; i < modelChain.length; i++) {
        const entry = modelChain[i];

        // Skip the provider we already tried via the router
        if (selection && entry.providerId === selection.provider.id && entry.model === selection.entry.model) {
          continue;
        }

        const provider = providers.find((p: ProviderConfig) => p.id === entry.providerId);
        if (!provider) {
          console.error(`Oracle: Provider "${entry.providerId}" not found for model "${entry.model}", skipping`);
          continue;
        }

        const tier = tierForIndex(i);

        // Try concurrency-aware selection for this specific provider
        const retrySelection = selectProvider([entry], [provider]);
        if (!retrySelection) {
          // Provider at capacity — skip
          continue;
        }

        try {
          result = await callProviderStreaming(
            ctx,
            provider,
            entry.model,
            prompt,
            llmConfig,
            conversationHistory,
            args.sessionId,
            tier,
            systemPromptHash,
            { actionStartTime, promptBuildEndTime },
          );

          if (result) {
            usedProviderId = provider.id;
            usedModel = entry.model;
            usedTier = tier;
            break; // finally will release
          }
        } catch (error) {
          console.error(`Oracle ${provider.id}/${entry.model} (tier ${tier}) failed:`, error);
        } finally {
          releaseProvider(provider.id);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // FALLBACK — all providers failed
    // ════════════════════════════════════════════════════════════════════════

    if (!result) {
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
    }

    // ════════════════════════════════════════════════════════════════════════
    // POST-PROCESS: Quota, Title, Timing, Pipeline Hooks
    // ════════════════════════════════════════════════════════════════════════

    // ── Quota increment (first response only) ──────────────────────────────
    if (isFirstResponse) {
      // Compute the model string — use debug override if active, otherwise the actual provider/model
      const costModelUsed =
        debugModelUsed && usedProviderId === args.debugModelOverride?.providerId
          ? debugModelUsed
          : `${usedProviderId ?? "unknown"}/${usedModel ?? "unknown"}`;

      // Compute cost in microdollars after successful LLM response
      const costMicro = calculateCostMicro(
        costModelUsed,
        result.promptTokens,
        result.completionTokens,
        Object.keys(pricingTable).length > 0 ? pricingTable : undefined,
      );

      // Store cost on the message record
      if (result.messageId) {
        await ctx.runMutation(internal.oracle.sessions.patchMessageCost, {
          messageId: result.messageId,
          costUsdMicro: costMicro,
        });
      }

      // Increment quota with the computed cost
      await ctx.runMutation(api.oracle.quota.incrementQuota, {
        costMicro,
      });
    }

    // ── Title generation (first response only) ────────────────────────────
    if (isFirstResponse) {
      const hasAI = Boolean(result.title);
      const title = result.title || deriveTitleFromContent(result.contentWithoutTitle);
      await ctx.runMutation(internal.oracle.sessions.updateSessionTitle, {
        sessionId: args.sessionId,
        title,
        titleGenerated: hasAI,
      });
    }

    // ── Timing metrics ────────────────────────────────────────────────────
    const totalEndTime = Date.now();
    const timingMetrics: TimingMetrics = {
      promptBuildMs: promptBuildEndTime - actionStartTime,
      requestQueueMs: (result.fetchStartTime ?? totalEndTime) - promptBuildEndTime,
      ttftMs: result.firstTokenTime
        ? result.firstTokenTime - (result.fetchStartTime ?? promptBuildEndTime)
        : 0,
      initialDecodeMs: result.initialDecodeTime
        ? result.initialDecodeTime - (result.firstTokenTime ?? result.fetchStartTime ?? promptBuildEndTime)
        : 0,
      totalMs: totalEndTime - actionStartTime,
    };

    // Determine actual model used (check if debug override was used)
    const actualModelUsed =
      debugModelUsed && usedProviderId === args.debugModelOverride?.providerId
        ? debugModelUsed
        : `${usedProviderId}/${usedModel}`;

    // ── Store timing metrics on the message ────────────────────────────────
    if (result.messageId) {
      await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, {
        messageId: result.messageId,
        timingPromptBuildMs: timingMetrics.promptBuildMs,
        timingRequestQueueMs: timingMetrics.requestQueueMs,
        timingTtftMs: timingMetrics.ttftMs,
        timingInitialDecodeMs: timingMetrics.initialDecodeMs,
        timingTotalMs: timingMetrics.totalMs,
        debugModelUsed: debugModelUsed && usedProviderId === args.debugModelOverride?.providerId
          ? debugModelUsed
          : undefined,
      });
    }

    // ── Pipeline afterResponse hooks ───────────────────────────────────────
    for (const pipeline of activePipelines) {
      if (pipeline.afterResponse) {
        try {
          const actions = pipeline.afterResponse(result.contentWithoutTitle, pipelineCtx);
          for (const action of actions) {
            if (action.type === "store_binaural_params" && result.messageId) {
              await ctx.runMutation(internal.oracle.sessions.patchMessageBinauralParams, {
                messageId: result.messageId,
                binauralParams: action.payload,
              });
            }
          }
        } catch (e) {
          console.error(`Pipeline ${pipeline.key} afterResponse hook failed:`, e);
        }
      }
    }

    // ── Update session status ──────────────────────────────────────────────
    await ctx.runMutation(api.oracle.sessions.updateSessionStatus, {
      sessionId: args.sessionId,
      status: "active",
    });

    return {
      content: result.contentWithoutTitle,
      modelUsed: actualModelUsed,
      fallbackTier: usedTier ?? "A",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      timingMetrics,
      debugModelUsed: debugModelUsed && usedProviderId === args.debugModelOverride?.providerId
        ? debugModelUsed
        : null,
    };
  },
});

/**
 * Generic streaming call to any OpenAI-compatible chat completions endpoint.
 * Works with OpenRouter, Ollama, and any OpenAI-compatible API.
 *
 * COMPLETELY UNCHANGED from the original implementation.
 * Do not modify this function — it handles SSE parsing, streaming mutations,
 * flush throttling, and error recovery.
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
  timingContext?: { actionStartTime: number; promptBuildEndTime: number },
): Promise<{ content: string; contentWithoutTitle: string; title: string | null; promptTokens?: number; completionTokens?: number; fetchStartTime?: number; firstTokenTime?: number; initialDecodeTime?: number; messageId?: Id<"oracle_messages"> } | null> {
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
  const fetchStartTime = Date.now();
  const fetchController = new AbortController();
  const fetchTimeoutId = setTimeout(() => fetchController.abort(), 120_000);
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: fetchController.signal,
    });
  } catch (error: any) {
    clearTimeout(fetchTimeoutId);
    if (error?.name === "AbortError") {
      console.error(`Oracle ${provider.id}/${model} fetch timed out after 120s`);
    } else {
      console.error(`Oracle ${provider.id}/${model} fetch failed:`, error);
    }
    return null;
  }
  clearTimeout(fetchTimeoutId);

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
    const { journalPrompt, contentWithoutPrompt } = parseJournalPromptFromResponse(contentWithoutTitle);
    const promptTokens: number | undefined = data.usage?.prompt_tokens;
    const completionTokens: number | undefined = data.usage?.completion_tokens;
    const firstTokenTime = Date.now();

    const messageId: Id<"oracle_messages"> = await ctx.runMutation(
      internal.oracle.sessions.createStreamingMessage,
      { sessionId },
    );

    // Immediately patch model info and early timing for debug panel visibility
    const nonStreamModelStr = `${provider.id}/${model}`;
    const nonStreamEarlyPatch: any = { messageId, modelUsed: nonStreamModelStr };
    if (["A", "B", "C", "D"].includes(tier)) {
      nonStreamEarlyPatch.fallbackTierUsed = tier as "A" | "B" | "C" | "D";
    }
    if (timingContext) {
      nonStreamEarlyPatch.timingPromptBuildMs = timingContext.promptBuildEndTime - timingContext.actionStartTime;
      nonStreamEarlyPatch.timingRequestQueueMs = fetchStartTime - timingContext.promptBuildEndTime;
    }
    try {
      await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, nonStreamEarlyPatch);
    } catch (e) {
      console.error("Oracle: failed to write early timing patch (non-streaming, non-blocking):", e);
    }

    await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
      messageId,
      sessionId,
      content: contentWithoutPrompt,
      modelUsed: `${provider.id}/${model}`,
      promptTokens,
      completionTokens,
      fallbackTierUsed: tier,
      systemPromptHash,
      journalPrompt: journalPrompt ?? undefined,
    });

    return { content, contentWithoutTitle: contentWithoutPrompt, title, promptTokens, completionTokens, fetchStartTime, firstTokenTime, initialDecodeTime: firstTokenTime, messageId };
  }

  // For streaming mode, process SSE chunks
  const messageId: Id<"oracle_messages"> = await ctx.runMutation(
    internal.oracle.sessions.createStreamingMessage,
    { sessionId },
  );

  // Immediately patch model info and early timing metrics so the debug panel
  // can display them while streaming is in progress.
  const modelUsedStr = `${provider.id}/${model}`;
  const tierLiteral = tier as "A" | "B" | "C" | "D";
  const earlyTimingPatch: any = {
    messageId,
    modelUsed: modelUsedStr,
  };
  // Only set fallbackTierUsed if it's a valid literal so Convex validation doesn't reject it
  if (["A", "B", "C", "D"].includes(tier)) {
    earlyTimingPatch.fallbackTierUsed = tierLiteral;
  }
  if (timingContext) {
    earlyTimingPatch.timingPromptBuildMs = timingContext.promptBuildEndTime - timingContext.actionStartTime;
    earlyTimingPatch.timingRequestQueueMs = fetchStartTime - timingContext.promptBuildEndTime;
  }
  try {
    await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, earlyTimingPatch);
  } catch (e) {
    console.error("Oracle: failed to write early timing patch (non-blocking):", e);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let lastFlushedContent = "";
  let lastFlushTime = 0;
  const MIN_FLUSH_INTERVAL_MS = 50;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let firstTokenTime: number | undefined;
  let initialDecodeTime: number | undefined;
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
            // Track timing: first token received
            if (firstTokenTime === undefined) {
              firstTokenTime = Date.now();
              // Patch TTFT immediately so the debug panel shows it during streaming
              try {
                const ttftPatch: any = {
                  messageId,
                  timingTtftMs: firstTokenTime - fetchStartTime,
                };
                await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, ttftPatch);
              } catch (e) {
                console.error("Oracle: failed to write TTFT timing patch (non-blocking):", e);
              }
            }
            // Track timing: initial decode complete (~200 chars)
            if (initialDecodeTime === undefined && fullContent.length >= 200) {
              initialDecodeTime = Date.now();
              // Patch initial decode timing immediately
              try {
                const decodePatch: any = {
                  messageId,
                  timingInitialDecodeMs: initialDecodeTime - (firstTokenTime ?? fetchStartTime),
                };
                await ctx.runMutation(internal.oracle.sessions.patchMessageTiming, decodePatch);
              } catch (e) {
                console.error("Oracle: failed to write initial decode timing patch (non-blocking):", e);
              }
            }
          }

          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens;
            completionTokens = parsed.usage.completion_tokens;
          }
        } catch {
          // Ignore partial JSON frames.
        }
      }

      // Flush after every SSE chunk, throttled to MIN_FLUSH_INTERVAL_MS.
      const now = Date.now();
      if (fullContent !== lastFlushedContent && (now - lastFlushTime >= MIN_FLUSH_INTERVAL_MS || lastFlushTime === 0)) {
        await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
          messageId,
          content: fullContent,
        });
        lastFlushTime = now;
        lastFlushedContent = fullContent;
      }
    }
    // Final flush: ensure all remaining content is written before finalizing
    if (fullContent !== lastFlushedContent) {
      await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
        messageId,
        content: fullContent,
      });
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
  const { journalPrompt, contentWithoutPrompt } = parseJournalPromptFromResponse(contentWithoutTitle);

  // Final flush: update streaming content with the title+prompt-stripped version
  await ctx.runMutation(internal.oracle.sessions.updateStreamingContent, {
    messageId,
    content: contentWithoutPrompt,
  });

  await ctx.runMutation(internal.oracle.sessions.finalizeStreamingMessage, {
    messageId,
    sessionId,
    content: contentWithoutPrompt,
    modelUsed: `${provider.id}/${model}`,
    promptTokens,
    completionTokens,
    fallbackTierUsed: tier,
    systemPromptHash,
    journalPrompt: journalPrompt ?? undefined,
  });

  // If initial decode time was never set (short responses), use stream end time
  if (initialDecodeTime === undefined) {
    initialDecodeTime = Date.now();
  }

  return { content: fullContent, contentWithoutTitle: contentWithoutPrompt, title, promptTokens, completionTokens, fetchStartTime, firstTokenTime, initialDecodeTime, messageId };
}