"use node";

import type { Id } from "../_generated/dataModel";
import { streamAIGateway } from "../aiGateway/streaming";
import { calculateCostMicro } from "./pricing";
import type {
  OracleEvidenceBundle,
  OracleRequestPlan,
} from "../../src/lib/oracle/capabilities";
import {
  OraclePublicationError,
  OracleStreamPublisher,
} from "../../src/lib/oracle/streaming/streamPublisher";
import {
  buildOracleSectionPlan,
  buildOracleSectionProtocolInstruction,
  selectOracleResumeSectionPlan,
} from "../../src/lib/oracle/streaming/sectionPlan";
import { OracleSectionStreamParser } from "../../src/lib/oracle/streaming/sectionParser";
import type {
  GatewayStreamEvent,
  OracleSectionPlan,
  ParsedOracleSection,
} from "../../src/lib/oracle/streaming/types";
import { deriveTitleFromContent } from "../../lib/oracle/promptBuilder";
import { OUTPUT_SAFETY_BLOCK_MESSAGE } from "../../lib/oracle/responseSafety";

const { internal: internalRef } = require("../_generated/api") as any;

type Route = {
  chain: Array<{ providerId: string; model: string }>;
  optionKey?: string;
  reasoningEffort: "auto" | "disabled" | "low" | "medium" | "high";
  effectiveUserTier: string;
};

type AttemptUsage = {
  key: string;
  providerId: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  completionChars: number;
};

export type DurableOracleExecutionArgs = {
  turnId: Id<"oracle_turns">;
  sessionId: Id<"oracle_sessions">;
  assistantMessageId: Id<"oracle_messages">;
  prompt: { systemPrompt: string; userMessage: string };
  conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  requestPlan: OracleRequestPlan;
  evidence?: OracleEvidenceBundle;
  journalContext?: string | null;
  streamEnabled: boolean;
  rolloutMode?: "v2" | "shadow" | "buffered";
  temperature: number;
  topP?: number;
  maxTokens: number;
  route: Route;
  debugModelOverride?: { providerId: string; model: string };
  pricingTable?: Record<string, { promptPer1M: number; completionPer1M: number }>;
  actionStartTime: number;
  promptBuildEndTime: number;
  resumeSectionKeys?: string[];
  existingPublishedSections?: ParsedOracleSection[];
  initialSequence?: number;
  initialPersistedChars?: number;
  existingPersistenceWriteCount?: number;
  existingMaxQueuedChars?: number;
  executionOrdinal?: number;
};

function fallbackTier(tier: string): "A" | "B" | "C" | "D" {
  return tier === "A" || tier === "B" || tier === "C" ? tier : "D";
}

function collectSections(content: string, plan: OracleSectionPlan): ParsedOracleSection[] {
  const parser = new OracleSectionStreamParser({ plan });
  const events = [...parser.push(content), ...parser.finish()];
  return events.flatMap((event) => event.type === "section" ? [event.section] : []);
}

export async function executeDurableOracleGeneration(
  ctx: any,
  args: DurableOracleExecutionArgs,
) {
  const validatedSections = args.requestPlan.responseContract.requiresFullNatalCoverage;
  const sectionPlan = validatedSections
    ? buildOracleSectionPlan(args.requestPlan, args.evidence)
    : undefined;
  const resumeSectionKeys = args.resumeSectionKeys ?? [];
  const isExplicitResume = resumeSectionKeys.length > 0;
  const requestedSectionPlan = sectionPlan && isExplicitResume
    ? selectOracleResumeSectionPlan(sectionPlan, resumeSectionKeys)
    : sectionPlan;
  if (isExplicitResume && (!requestedSectionPlan || requestedSectionPlan.sections.length === 0)) {
    throw new Error("Resume requested section keys outside the deterministic plan");
  }
  const systemPrompt = requestedSectionPlan
    ? `${args.prompt.systemPrompt}\n\n${buildOracleSectionProtocolInstruction(requestedSectionPlan)}`
    : args.prompt.systemPrompt;
  const providerUserMessage = isExplicitResume
    ? `${args.prompt.userMessage}\n\n[RESUME ONLY MISSING SECTIONS]\nReturn only these section keys: ${resumeSectionKeys.join(", ")}. Do not repeat already approved sections.`
    : args.prompt.userMessage;
  const progressivePublication = args.streamEnabled && (args.rolloutMode ?? "v2") === "v2";
  await ctx.runMutation(internalRef.oracle.streamPublisher.setPublicationMode, {
    turnId: args.turnId,
    // Keep the response contract mode distinct from its visibility policy so
    // buffered validated-section turns remain eligible for missing-key Resume.
    mode: sectionPlan
      ? "validated_sections"
      : progressivePublication
        ? "guarded_batches"
        : "buffered",
  });
  if (sectionPlan) {
    await ctx.runMutation(internalRef.oracle.streamPublisher.initializeSections, {
      turnId: args.turnId,
      sections: sectionPlan.sections.map((section) => ({
        key: section.key,
        ordinal: section.ordinal,
        title: section.title,
      })),
    });
  }

  const attempts: AttemptUsage[] = [];
  let currentAttempt: AttemptUsage | undefined;
  let activityWrites: Promise<unknown> = Promise.resolve();
  let lastActivityWriteAt = 0;
  let firstTextActivityQueued = false;
  const recordEvent = (event: GatewayStreamEvent) => {
    if (event.type === "attempt_started") {
      firstTextActivityQueued = false;
      currentAttempt = {
        key: `execution:${args.executionOrdinal ?? 0}:attempt:${attempts.length + 1}:${event.providerId}:${event.model}`,
        providerId: event.providerId,
        model: event.model,
        completionChars: 0,
      };
      attempts.push(currentAttempt);
    } else if (event.type === "text_delta") {
      if (currentAttempt) currentAttempt.completionChars += event.text.length;
      if (!firstTextActivityQueued || event.receivedAt - lastActivityWriteAt >= 500) {
        firstTextActivityQueued = true;
        lastActivityWriteAt = event.receivedAt;
        activityWrites = activityWrites.then(() => ctx.runMutation(
          internalRef.oracle.streamPublisher.markProviderActivity,
          { turnId: args.turnId, firstText: true, receivedAt: event.receivedAt },
        ));
      }
    } else if (event.type === "usage" && currentAttempt) {
      currentAttempt.promptTokens = event.promptTokens ?? currentAttempt.promptTokens;
      currentAttempt.completionTokens = event.completionTokens ?? currentAttempt.completionTokens;
      const receivedAt = Date.now();
      if (receivedAt - lastActivityWriteAt >= 500) {
        lastActivityWriteAt = receivedAt;
        activityWrites = activityWrites.then(() => ctx.runMutation(
          internalRef.oracle.streamPublisher.markProviderActivity,
          { turnId: args.turnId, firstText: false, receivedAt },
        ));
      }
    } else if (event.type === "reasoning_delta" || event.type === "usage" || event.type === "done") {
      const receivedAt = Date.now();
      if (receivedAt - lastActivityWriteAt >= 500) {
        lastActivityWriteAt = receivedAt;
        activityWrites = activityWrites.then(() => ctx.runMutation(
          internalRef.oracle.streamPublisher.markProviderActivity,
          { turnId: args.turnId, firstText: false, receivedAt },
        ));
      }
    }
  };

  const getState = async () => await ctx.runQuery(
    internalRef.oracle.streamPublisher.getTurnExecutionState,
    { turnId: args.turnId },
  );
  const cancelled = async () => (await getState())?.turn.status === "cancel_requested";
  const transition = async (from: string, to: string) => await ctx.runMutation(
    internalRef.oracle.turns.transitionTurn,
    { turnId: args.turnId, expectedStatus: from, status: to },
  );
  const ensureValidating = async () => {
    await activityWrites;
    const status = (await getState())?.turn.status;
    if (status === "generating") await transition("generating", "validating");
    else if (status === "repairing") await transition("repairing", "validating");
  };
  const enterRepair = async () => {
    await ensureValidating();
    if ((await getState())?.turn.status === "validating") {
      await transition("validating", "repairing");
    }
  };

  const targetedCall = async (
    targetSystemPrompt: string,
    targetUserMessage: string,
  ): Promise<string> => {
    if (await cancelled()) return "";
    await enterRepair();
    try {
      const result = await streamAIGateway(ctx, {
        feature: "oracle_chat",
        messages: [
          { role: "system", content: targetSystemPrompt },
          { role: "user", content: targetUserMessage },
        ],
        route: args.route,
        overrides: {
          ...args.debugModelOverride,
          temperature: 0,
          topP: args.topP,
          maxTokens: args.maxTokens,
          thinkingMode: args.route.reasoningEffort,
        },
        callbacks: {
          onEvent: recordEvent,
          onConnected: async ({ connectedAt }) => {
            await ctx.runMutation(internalRef.oracle.streamPublisher.markProviderConnected, {
              turnId: args.turnId,
              connectedAt,
            });
          },
          shouldCancel: cancelled,
          canFallbackAfterError: () => true,
        },
      });
      return result.partial ? "" : result.content;
    } catch {
      return "";
    } finally {
      if ((await getState())?.turn.status === "repairing") {
        await transition("repairing", "validating");
      }
    }
  };

  const publisher = new OracleStreamPublisher({
    mode: sectionPlan ? "validated_sections" : "guarded_batches",
    requestPlan: args.requestPlan,
    evidence: args.evidence,
    sectionPlan,
    journalContext: args.journalContext,
    progressivePublication,
    initialPublishedSections: args.existingPublishedSections,
    initialSequence: args.initialSequence,
    initialPersistedChars: args.initialPersistedChars,
    dependencies: {
      persistSnapshot: async (snapshot) => {
        await activityWrites;
        await ctx.runMutation(internalRef.oracle.streamPublisher.publishSnapshot, {
          turnId: args.turnId,
          ...snapshot,
        });
      },
      persistSection: sectionPlan
        ? async ({ section, status, violationCodes, approvedAt }) => {
            await activityWrites;
            await ctx.runMutation(internalRef.oracle.streamPublisher.persistSectionState, {
              turnId: args.turnId,
              key: section.key,
              status,
              content: status === "published" ? section.content : undefined,
              evidenceKeys: status === "published" ? section.evidenceKeys : undefined,
              violationCodes,
              approvedAt,
            });
          }
        : undefined,
      repairSection: sectionPlan
        ? async ({ section, spec, violations }) => {
            const repairPlan: OracleSectionPlan = {
              version: "oracle-section-plan-v2",
              sections: [spec],
            };
            const repaired = await targetedCall(
              `${args.prompt.systemPrompt}\n\n${buildOracleSectionProtocolInstruction(repairPlan)}`,
              [
                `Repair only section ${section.key}.`,
                `Violations: ${violations.map((violation) => violation.code).join(", ")}.`,
                `Canonical evidence: ${JSON.stringify(args.evidence?.natalChart ?? {})}`,
              ].join("\n"),
            );
            return collectSections(repaired, repairPlan)[0] ?? null;
          }
        : undefined,
      resumeMissingSections: sectionPlan
        ? async ({ missingKeys, plan }) => {
            const resume = await ctx.runMutation(
              internalRef.oracle.streamPublisher.recordAutomaticResume,
              { turnId: args.turnId },
            );
            if (!resume.applied) return [];
            const missingPlan: OracleSectionPlan = {
              version: "oracle-section-plan-v2",
              sections: plan.sections.filter((section) => missingKeys.includes(section.key)),
            };
            const resumed = await targetedCall(
              `${args.prompt.systemPrompt}\n\n${buildOracleSectionProtocolInstruction(missingPlan)}`,
              [
                `Return only the missing sections: ${missingKeys.join(", ")}.`,
                `Canonical evidence: ${JSON.stringify(args.evidence?.natalChart ?? {})}`,
              ].join("\n"),
            );
            return collectSections(resumed, missingPlan);
          }
        : undefined,
    },
  });

  let gatewayResult: Awaited<ReturnType<typeof streamAIGateway>> | undefined;
  let executionError: unknown;
  try {
    gatewayResult = await streamAIGateway(ctx, {
      feature: "oracle_chat",
      messages: [
        { role: "system", content: systemPrompt, cache_control: { type: "ephemeral" } },
        ...args.conversationHistory,
        { role: "user", content: providerUserMessage },
      ],
      route: args.route,
      overrides: {
        ...args.debugModelOverride,
        temperature: args.temperature,
        topP: args.topP,
        maxTokens: args.maxTokens,
        thinkingMode: args.route.reasoningEffort,
      },
        callbacks: {
          onStart: async (metadata) => {
          const state = await getState();
          if (state?.turn.status === "connecting" || state?.turn.status === "generating") {
            await transition(state.turn.status, "retrying");
          }
          await ctx.runMutation(internalRef.oracle.streamPublisher.markProviderAttemptStarted, {
            turnId: args.turnId,
            providerId: metadata.providerId,
            model: metadata.model,
            tier: metadata.tier,
            startedAt: metadata.fetchStartTime,
          });
          },
          onConnected: async ({ connectedAt }) => {
            await ctx.runMutation(internalRef.oracle.streamPublisher.markProviderConnected, {
              turnId: args.turnId,
              connectedAt,
            });
          },
        onEvent: (event) => {
          recordEvent(event);
          publisher.handleEvent(event);
        },
        shouldCancel: cancelled,
        canFallbackAfterError: () => publisher.canFallbackBeforePublication,
      },
    });
  } catch (error) {
    executionError = error;
  }
  await activityWrites;

  const estimatedPromptTokens = Math.ceil((
    systemPrompt.length
    + providerUserMessage.length
    + args.conversationHistory.reduce((sum, message) => sum + message.content.length, 0)
  ) / 4);
  let accumulatedAttempts = 0;
  const accumulateAttempts = async () => {
    for (; accumulatedAttempts < attempts.length; accumulatedAttempts += 1) {
      const attempt = attempts[accumulatedAttempts];
      const promptTokens = attempt.promptTokens ?? estimatedPromptTokens;
      const completionTokens = attempt.completionTokens ?? Math.ceil(attempt.completionChars / 4);
      const costUsdMicro = calculateCostMicro(
        `${attempt.providerId}/${attempt.model}`,
        promptTokens,
        completionTokens,
        args.pricingTable,
      );
      await ctx.runMutation(internalRef.oracle.turns.accumulateTurnUsage, {
        turnId: args.turnId,
        usageKey: attempt.key,
        promptTokens,
        completionTokens,
        costUsdMicro,
      });
    }
  };

  if (executionError || !gatewayResult) {
    await accumulateAttempts();
    const state = await getState();
    const fallback = "The stars are momentarily beyond my reach. Please try again in a moment. ->";
    if (state?.turn.status === "cancel_requested") {
      await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
        turnId: args.turnId,
        status: "cancelled",
        content: state.assistantMessage.content || "Stopped",
        partial: Boolean(state.assistantMessage.content),
        safeErrorCode: "cancelled",
        persistenceWriteCount: state.turn.persistenceWriteCount ?? 0,
        maxQueuedChars: state.turn.maxQueuedChars ?? 0,
      });
    } else if (state) {
      const preserveValidatedPartial = Boolean(
        sectionPlan
        && state.assistantMessage.content
        && ["connecting", "generating", "validating", "repairing", "retrying"]
          .includes(state.turn.status),
      );
      if (preserveValidatedPartial && state.turn.status === "connecting") {
        await transition("connecting", "retrying");
      }
      await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
        turnId: args.turnId,
        status: preserveValidatedPartial ? "incomplete" : "failed",
        content: state.assistantMessage.content || fallback,
        partial: Boolean(state.assistantMessage.content),
        safeErrorCode: "provider_failed",
        safeErrorMessage: preserveValidatedPartial
          ? "The missing sections could not be completed; approved sections remain available."
          : "Oracle generation could not be completed.",
        persistenceWriteCount: state.turn.persistenceWriteCount ?? 0,
        maxQueuedChars: state.turn.maxQueuedChars ?? 0,
        fallbackTierUsed: "D",
      });
    }
    await ctx.runMutation(internalRef.oracle.turns.chargeTurnQuota, { turnId: args.turnId });
    return { content: fallback, modelUsed: "fallback_hardcoded", fallbackTier: "D" as const };
  }

  if (gatewayResult.errorCode === "cancelled" || (await getState())?.turn.status === "cancel_requested") {
    let content = (await getState())?.assistantMessage.content || "Stopped";
    let writeCount = 0;
    let maxQueuedChars = 0;
    try {
      const cancelledPublication = await publisher.finalize(true, false);
      content = cancelledPublication.content || content;
      writeCount = cancelledPublication.writeCount;
      maxQueuedChars = cancelledPublication.maxQueuedChars;
    } catch {
      content = (await getState())?.assistantMessage.content || "Stopped";
    }
    await accumulateAttempts();
    await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
      turnId: args.turnId,
      status: "cancelled",
      content,
      partial: content !== "Stopped",
      safeErrorCode: "cancelled",
      persistenceWriteCount: (args.existingPersistenceWriteCount ?? 0) + writeCount,
      maxQueuedChars: Math.max(args.existingMaxQueuedChars ?? 0, maxQueuedChars),
      modelUsed: `${gatewayResult.providerId}/${gatewayResult.model}`,
      fallbackTierUsed: fallbackTier(gatewayResult.tier),
    });
    await ctx.runMutation(internalRef.oracle.turns.chargeTurnQuota, { turnId: args.turnId });
    return {
      content,
      modelUsed: `${gatewayResult.providerId}/${gatewayResult.model}`,
      fallbackTier: fallbackTier(gatewayResult.tier),
    };
  }

  await ensureValidating();
  let published;
  try {
    published = await publisher.finalize(gatewayResult.partial, !isExplicitResume);
  } catch (error) {
    await accumulateAttempts();
    if (error instanceof OraclePublicationError) {
      const state = await getState();
      if (state?.turn.status === "repairing") await transition("repairing", "validating");
      const preserveValidatedPartial = Boolean(
        isExplicitResume && state?.assistantMessage.content,
      );
      await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
        turnId: args.turnId,
        status: preserveValidatedPartial ? "incomplete" : "complete",
        content: preserveValidatedPartial
          ? state!.assistantMessage.content
          : OUTPUT_SAFETY_BLOCK_MESSAGE,
        partial: preserveValidatedPartial,
        safeErrorCode: error.code,
        safeErrorMessage: preserveValidatedPartial
          ? "The missing sections did not pass validation; approved sections remain available."
          : undefined,
        persistenceWriteCount: state?.turn.persistenceWriteCount ?? 0,
        maxQueuedChars: state?.turn.maxQueuedChars ?? 0,
        fallbackTierUsed: "D",
      });
      await ctx.runMutation(internalRef.oracle.turns.chargeTurnQuota, { turnId: args.turnId });
      return { content: OUTPUT_SAFETY_BLOCK_MESSAGE, modelUsed: "safety_blocked", fallbackTier: "D" as const };
    }
    throw error;
  }

  await accumulateAttempts();
  const terminalStatus = published.complete ? "complete" : "incomplete";
  const actualModel = `${gatewayResult.providerId}/${gatewayResult.model}`;
  await ctx.runMutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
    turnId: args.turnId,
    status: terminalStatus,
    content: published.content,
    partial: published.partial,
    safeErrorCode: published.complete ? undefined : gatewayResult.errorCode ?? "incomplete_response",
    safeErrorMessage: published.complete ? undefined : "The response ended before every approved section was complete.",
    persistenceWriteCount: (args.existingPersistenceWriteCount ?? 0) + published.writeCount,
    maxQueuedChars: Math.max(args.existingMaxQueuedChars ?? 0, published.maxQueuedChars),
    malformedProviderFrameCount: gatewayResult.diagnostics.malformedFrameCount,
    droppedProviderFrameCount: gatewayResult.diagnostics.droppedFrameCount,
    sectionProtocolFallback: published.protocolFallback,
    modelUsed: actualModel,
    journalPrompt: published.journalPrompt ?? undefined,
    fallbackTierUsed: fallbackTier(gatewayResult.tier),
  });
  await ctx.runMutation(internalRef.oracle.turns.chargeTurnQuota, { turnId: args.turnId });
  await ctx.runMutation(internalRef.oracle.sessions.updateSessionTitle, {
    sessionId: args.sessionId,
    title: published.title || deriveTitleFromContent(published.content),
    titleGenerated: Boolean(published.title),
  });
  const totalEndTime = Date.now();
  await ctx.runMutation(internalRef.oracle.sessions.patchMessageTiming, {
    messageId: args.assistantMessageId,
    timingPromptBuildMs: args.promptBuildEndTime - args.actionStartTime,
    timingRequestQueueMs: gatewayResult.fetchStartTime - args.promptBuildEndTime,
    timingTtftMs: gatewayResult.firstTokenTime
      ? gatewayResult.firstTokenTime - gatewayResult.fetchStartTime
      : 0,
    timingInitialDecodeMs: gatewayResult.initialDecodeTime
      ? gatewayResult.initialDecodeTime - (gatewayResult.firstTokenTime ?? gatewayResult.fetchStartTime)
      : 0,
    timingTotalMs: totalEndTime - args.actionStartTime,
  });
  return {
    content: published.content,
    modelUsed: actualModel,
    fallbackTier: fallbackTier(gatewayResult.tier),
    promptTokens: gatewayResult.promptTokens,
    completionTokens: gatewayResult.completionTokens,
  };
}
