import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { resolveOracleRouteForUser } from "../aiGateway/userModelOptions";
import {
  ORACLE_STREAM_PROTOCOL_VERSION,
  ORACLE_TERMINAL_TURN_STATUSES,
  type OraclePublicationMode,
  type OracleTurnStatus,
} from "../../src/lib/oracle/streaming/types";
import { assertOracleTurnTransition } from "../../src/lib/oracle/streaming/publicationState";
import {
  ORACLE_STREAMING_V2_ENABLED_KEY,
  ORACLE_STREAMING_V2_ROLLOUT_PERCENT_KEY,
  ORACLE_STREAMING_V2_SHADOW_PERCENT_KEY,
  resolveOracleStreamingRollout,
} from "../../src/lib/oracle/streaming/rollout";

const { internal: internalRef } = require("../_generated/api") as any;

const MAX_USER_QUESTION_LENGTH = 2_000;
const MAX_CLIENT_REQUEST_ID_LENGTH = 200;
const MAX_TIMEZONE_LENGTH = 128;
const MAX_USAGE_KEY_LENGTH = 200;
const DEFAULT_BURST_WINDOW_MS = 18_000_000;
const DEFAULT_WEEKLY_WINDOW_MS = 604_800_000;

const reasoningEffort = v.union(
  v.literal("auto"),
  v.literal("disabled"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const turnStatus = v.union(
  v.literal("queued"),
  v.literal("planning"),
  v.literal("connecting"),
  v.literal("generating"),
  v.literal("validating"),
  v.literal("repairing"),
  v.literal("retrying"),
  v.literal("cancel_requested"),
  v.literal("complete"),
  v.literal("incomplete"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const debugModelOverride = v.object({
  providerId: v.string(),
  model: v.string(),
});

const synastryPayload = v.object({
  chartB: v.any(),
  source: v.union(v.literal("friend"), v.literal("custom")),
  friendUserId: v.optional(v.id("users")),
  relationship: v.string(),
  relationshipCategory: v.optional(v.string()),
  chartBName: v.string(),
});

type TurnMutationCtx = Pick<MutationCtx, "db" | "scheduler">;

function normalizeContent(content: string): string {
  const normalized = content.trim();
  if (!normalized) throw new Error("Message cannot be empty");
  if (normalized.length > MAX_USER_QUESTION_LENGTH) {
    throw new Error(
      `Question is too long (${normalized.length} characters). Maximum is ${MAX_USER_QUESTION_LENGTH} characters.`,
    );
  }
  return normalized;
}

function normalizeClientRequestId(clientRequestId: string): string {
  const normalized = clientRequestId.trim();
  if (!normalized || normalized.length > MAX_CLIENT_REQUEST_ID_LENGTH) {
    throw new Error("clientRequestId must be between 1 and 200 characters");
  }
  return normalized;
}

function normalizeTimezone(timezone?: string): string {
  const normalized = timezone?.trim() || "UTC";
  if (normalized.length > MAX_TIMEZONE_LENGTH) {
    throw new Error("Timezone is too long");
  }
  return normalized;
}

function normalizeDebugOverride(
  override?: { providerId: string; model: string },
): { providerId: string; model: string } | undefined {
  if (!override) return undefined;
  const providerId = override.providerId.trim();
  const model = override.model.trim();
  if (!providerId || !model || providerId.length > 128 || model.length > 256) {
    throw new Error("Invalid debug model override");
  }
  return { providerId, model };
}

function publicationModeForFeature(featureKey?: string): OraclePublicationMode {
  return featureKey === "birth_chart" || featureKey === "birth_chart_report"
    ? "validated_sections"
    : "guarded_batches";
}

function isTerminal(status: OracleTurnStatus): boolean {
  return (ORACLE_TERMINAL_TURN_STATUSES as readonly OracleTurnStatus[]).includes(status);
}

function terminalPatch(status: OracleTurnStatus, now: number): Record<string, unknown> {
  if (status === "complete") return { active: false, completedAt: now };
  if (status === "failed" || status === "incomplete") {
    return { active: false, failedAt: now };
  }
  if (status === "cancelled") return { active: false, cancelledAt: now };
  return {};
}

function appendStage(
  timeline: Array<{ stage: OracleTurnStatus; at: number }> | undefined,
  stage: OracleTurnStatus,
  at: number,
): Array<{ stage: OracleTurnStatus; at: number }> {
  if (timeline?.[timeline.length - 1]?.stage === stage) return timeline;
  return [...(timeline ?? []), { stage, at }].slice(-32);
}

async function getStreamingRollout(ctx: Pick<MutationCtx, "db">, userId: Id<"users">) {
  const keys = [
    ORACLE_STREAMING_V2_ENABLED_KEY,
    ORACLE_STREAMING_V2_ROLLOUT_PERCENT_KEY,
    ORACLE_STREAMING_V2_SHADOW_PERCENT_KEY,
  ];
  const rows = await Promise.all(keys.map((key) => ctx.db
    .query("oracle_settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first()));
  return resolveOracleStreamingRollout(
    String(userId),
    Object.fromEntries(rows.filter(Boolean).map((row) => [row!.key, row!.value])),
  );
}

async function getExistingRequest(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  clientRequestId: string,
): Promise<Doc<"oracle_turns"> | null> {
  return await ctx.db
    .query("oracle_turns")
    .withIndex("by_client_request", (q) =>
      q.eq("userId", userId).eq("clientRequestId", clientRequestId),
    )
    .first();
}

async function getActiveUserTurn(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
): Promise<Doc<"oracle_turns"> | null> {
  return await ctx.db
    .query("oracle_turns")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
    .first();
}

function turnResult(
  turn: Doc<"oracle_turns">,
  flags?: { reused?: boolean; existingActive?: boolean },
) {
  return {
    turnId: turn._id,
    sessionId: turn.sessionId,
    userMessageId: turn.userMessageId,
    assistantMessageId: turn.assistantMessageId,
    reused: flags?.reused ?? false,
    existingActive: flags?.existingActive ?? false,
  };
}

async function scheduleTurn(ctx: TurnMutationCtx, turnId: Id<"oracle_turns">): Promise<void> {
  await ctx.scheduler.runAfter(0, internalRef.oracle.turnRunner.invokeOracleTurn, { turnId });
}

export const getTurn = query({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.userId !== userId) return null;
    const sections = await ctx.db
      .query("oracle_turn_sections")
      .withIndex("by_turn_ordinal", (q) => q.eq("turnId", turn._id))
      .order("asc")
      .collect();
    return { ...turn, sections };
  },
});

export const getActiveTurn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("oracle_turns")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .first();
  },
});

/**
 * Atomically appends a user message, its assistant placeholder, and a queued
 * durable turn. This API is intentionally unused by the Phase B client.
 */
export const beginTurn = mutation({
  args: {
    sessionId: v.id("oracle_sessions"),
    content: v.string(),
    clientRequestId: v.string(),
    modelOptionKey: v.optional(v.string()),
    reasoningEffort: v.optional(reasoningEffort),
    timezone: v.optional(v.string()),
    debugModelOverride: v.optional(debugModelOverride),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const clientRequestId = normalizeClientRequestId(args.clientRequestId);
    const duplicate = await getExistingRequest(ctx, userId, clientRequestId);
    if (duplicate) return turnResult(duplicate, { reused: true });

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    const activeTurn = await getActiveUserTurn(ctx, userId);
    if (activeTurn) return turnResult(activeTurn, { existingActive: true });

    const content = normalizeContent(args.content);
    const timezone = normalizeTimezone(args.timezone);
    const effectiveDebugOverride = normalizeDebugOverride(args.debugModelOverride);
    if (effectiveDebugOverride && user.role !== "admin") {
      throw new Error("Admin access is required for a debug model override");
    }
    const route = await resolveOracleRouteForUser(
      ctx,
      user,
      args.modelOptionKey ?? session.modelOptionKey,
      args.reasoningEffort ?? session.reasoningEffort,
    );
    const rollout = await getStreamingRollout(ctx, userId);
    const now = Date.now();
    const userMessageId = await ctx.db.insert("oracle_messages", {
      sessionId: session._id,
      role: "user",
      content,
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      requestedModelOptionKey: args.modelOptionKey,
      requestedReasoningEffort: args.reasoningEffort,
      createdAt: now,
    });
    const assistantMessageId = await ctx.db.insert("oracle_messages", {
      sessionId: session._id,
      role: "assistant",
      content: "",
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      createdAt: now + 1,
    });
    const turnId = await ctx.db.insert("oracle_turns", {
      userId,
      sessionId: session._id,
      userMessageId,
      assistantMessageId,
      clientRequestId,
      status: "queued",
      active: true,
      publicationMode: publicationModeForFeature(session.featureKey),
      rolloutMode: rollout.mode,
      rolloutBucket: rollout.bucket,
      protocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      timezone,
      modelOptionKey: route.optionKey,
      reasoningEffort: route.reasoningEffort,
      debugModelOverride: effectiveDebugOverride,
      lastSequence: 0,
      publishedChars: 0,
      partial: false,
      providerAttemptCount: 0,
      repairCount: 0,
      resumeCount: 0,
      createdAt: now,
      queuedAt: now,
      stageTimeline: [{ stage: "queued", at: now }],
      updatedAt: now,
    });
    await Promise.all([
      ctx.db.patch(userMessageId, { turnId }),
      ctx.db.patch(assistantMessageId, { turnId }),
      ctx.db.patch(session._id, {
        messageCount: session.messageCount + 2,
        modelOptionKey: route.optionKey,
        modelRouteFallbackReason: route.fallbackReason,
        reasoningEffort: route.reasoningEffort,
        updatedAt: now,
        lastMessageAt: now,
      }),
    ]);
    await scheduleTurn(ctx, turnId);
    return {
      turnId,
      sessionId: session._id,
      userMessageId,
      assistantMessageId,
      reused: false,
      existingActive: false,
    };
  },
});

/** Atomic V2 new-session path. The legacy createSession remains untouched until Phase D. */
export const createSessionWithTurn = mutation({
  args: {
    featureKey: v.optional(v.string()),
    questionText: v.string(),
    clientRequestId: v.string(),
    modelOptionKey: v.optional(v.string()),
    reasoningEffort: v.optional(reasoningEffort),
    timezone: v.optional(v.string()),
    debugModelOverride: v.optional(debugModelOverride),
    synastryPayload: v.optional(synastryPayload),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (args.featureKey === "binaural_beats") {
      throw new Error("Deterministic binaural sessions do not create Oracle LLM turns");
    }

    const clientRequestId = normalizeClientRequestId(args.clientRequestId);
    const duplicate = await getExistingRequest(ctx, userId, clientRequestId);
    if (duplicate) return turnResult(duplicate, { reused: true });
    const activeTurn = await getActiveUserTurn(ctx, userId);
    if (activeTurn) return turnResult(activeTurn, { existingActive: true });

    const content = normalizeContent(args.questionText);
    const timezone = normalizeTimezone(args.timezone);
    const effectiveDebugOverride = normalizeDebugOverride(args.debugModelOverride);
    if (effectiveDebugOverride && user.role !== "admin") {
      throw new Error("Admin access is required for a debug model override");
    }
    const route = await resolveOracleRouteForUser(
      ctx,
      user,
      args.modelOptionKey,
      args.reasoningEffort,
    );
    const rollout = await getStreamingRollout(ctx, userId);
    const now = Date.now();
    const title = content.length > 40 ? `${content.slice(0, 40)}...` : content;
    const sessionId = await ctx.db.insert("oracle_sessions", {
      userId,
      title,
      featureKey: args.featureKey,
      modelOptionKey: route.optionKey,
      modelRouteFallbackReason: route.fallbackReason,
      reasoningEffort: route.reasoningEffort,
      status: "active",
      messageCount: 2,
      synastryPayload: args.synastryPayload,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });
    const userMessageId = await ctx.db.insert("oracle_messages", {
      sessionId,
      role: "user",
      content,
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      requestedModelOptionKey: args.modelOptionKey,
      requestedReasoningEffort: args.reasoningEffort,
      createdAt: now,
    });
    const assistantMessageId = await ctx.db.insert("oracle_messages", {
      sessionId,
      role: "assistant",
      content: "",
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      createdAt: now + 1,
    });
    const turnId = await ctx.db.insert("oracle_turns", {
      userId,
      sessionId,
      userMessageId,
      assistantMessageId,
      clientRequestId,
      status: "queued",
      active: true,
      publicationMode: publicationModeForFeature(args.featureKey),
      rolloutMode: rollout.mode,
      rolloutBucket: rollout.bucket,
      protocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      timezone,
      modelOptionKey: route.optionKey,
      reasoningEffort: route.reasoningEffort,
      debugModelOverride: effectiveDebugOverride,
      lastSequence: 0,
      publishedChars: 0,
      partial: false,
      providerAttemptCount: 0,
      repairCount: 0,
      resumeCount: 0,
      createdAt: now,
      queuedAt: now,
      stageTimeline: [{ stage: "queued", at: now }],
      updatedAt: now,
    });
    await Promise.all([
      ctx.db.patch(userMessageId, { turnId }),
      ctx.db.patch(assistantMessageId, { turnId }),
    ]);
    await scheduleTurn(ctx, turnId);
    return {
      sessionId,
      turnId,
      userMessageId,
      assistantMessageId,
      reused: false,
      existingActive: false,
    };
  },
});

/** Compatibility bridge for a historical session whose final user message is unanswered. */
export const ensureTurnForUnansweredMessage = mutation({
  args: {
    sessionId: v.id("oracle_sessions"),
    clientRequestId: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    const clientRequestId = normalizeClientRequestId(args.clientRequestId);
    const duplicate = await getExistingRequest(ctx, userId, clientRequestId);
    if (duplicate) return turnResult(duplicate, { reused: true });

    const messages = await ctx.db
      .query("oracle_messages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(1);
    const userMessage = messages[0];
    if (!userMessage || userMessage.role !== "user") {
      throw new Error("Session has no unanswered final user message");
    }
    const existingForMessage = await ctx.db
      .query("oracle_turns")
      .withIndex("by_user_message", (q) => q.eq("userMessageId", userMessage._id))
      .first();
    if (existingForMessage) return turnResult(existingForMessage, { reused: true });
    const activeTurn = await getActiveUserTurn(ctx, userId);
    if (activeTurn) return turnResult(activeTurn, { existingActive: true });

    const rollout = await getStreamingRollout(ctx, userId);
    const now = Date.now();
    const assistantMessageId = await ctx.db.insert("oracle_messages", {
      sessionId: session._id,
      role: "assistant",
      content: "",
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      createdAt: now,
    });
    const turnId = await ctx.db.insert("oracle_turns", {
      userId,
      sessionId: session._id,
      userMessageId: userMessage._id,
      assistantMessageId,
      clientRequestId,
      status: "queued",
      active: true,
      publicationMode: publicationModeForFeature(session.featureKey),
      rolloutMode: rollout.mode,
      rolloutBucket: rollout.bucket,
      protocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      timezone: normalizeTimezone(args.timezone),
      modelOptionKey: session.modelOptionKey,
      reasoningEffort: session.reasoningEffort,
      lastSequence: 0,
      publishedChars: 0,
      partial: false,
      providerAttemptCount: 0,
      repairCount: 0,
      resumeCount: 0,
      createdAt: now,
      queuedAt: now,
      stageTimeline: [{ stage: "queued", at: now }],
      updatedAt: now,
    });
    await Promise.all([
      ctx.db.patch(userMessage._id, {
        turnId,
        streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      }),
      ctx.db.patch(assistantMessageId, { turnId }),
      ctx.db.patch(session._id, {
        messageCount: session.messageCount + 1,
        updatedAt: now,
        lastMessageAt: now,
      }),
    ]);
    await scheduleTurn(ctx, turnId);
    return {
      turnId,
      sessionId: session._id,
      userMessageId: userMessage._id,
      assistantMessageId,
      reused: false,
      existingActive: false,
    };
  },
});

export const requestStop = mutation({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.userId !== userId) throw new Error("Turn not found");
    if (isTerminal(turn.status)) return { status: turn.status, changed: false };
    if (turn.status === "cancel_requested") {
      return { status: turn.status, changed: false };
    }
    assertOracleTurnTransition(turn.status, "cancel_requested");
    const now = Date.now();
    await ctx.db.patch(turn._id, {
      status: "cancel_requested",
      stopRequestedAt: turn.stopRequestedAt ?? now,
      stageTimeline: appendStage(turn.stageTimeline, "cancel_requested", now),
      updatedAt: now,
    });
    return { status: "cancel_requested" as const, changed: true };
  },
});

/** Best-effort browser timing only; never changes lifecycle or publication state. */
export const recordFirstClientVisible = mutation({
  args: {
    turnId: v.id("oracle_turns"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.userId !== userId) throw new Error("Turn not found");
    if (turn.firstClientVisibleAt !== undefined) {
      return { recorded: false, timestamp: turn.firstClientVisibleAt };
    }
    if (!Number.isFinite(args.timestamp)) throw new Error("Invalid client timestamp");
    const now = Date.now();
    const timestamp = Math.min(now, Math.max(turn.createdAt, Math.round(args.timestamp)));
    await ctx.db.patch(turn._id, { firstClientVisibleAt: timestamp });
    return { recorded: true, timestamp };
  },
});

/**
 * Bounded maintenance for abandoned active turns. It never invokes a model or
 * retries content; it only makes the existing durable state honestly terminal.
 */
export const recoverStaleTurns = internalMutation({
  args: {
    now: v.optional(v.number()),
    staleAfterMs: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Number.isFinite(args.now) ? Math.round(args.now!) : Date.now();
    const staleAfterMs = Number.isFinite(args.staleAfterMs)
      ? Math.max(1, Math.round(args.staleAfterMs!))
      : 11 * 60_000;
    const limit = Number.isFinite(args.limit)
      ? Math.min(100, Math.max(1, Math.round(args.limit!)))
      : 50;
    const staleTurns = await ctx.db
      .query("oracle_turns")
      .withIndex("by_active_updated", (q) => q
        .eq("active", true)
        .lt("updatedAt", now - staleAfterMs))
      .take(limit);
    let failed = 0;
    let incomplete = 0;
    let cancelled = 0;
    for (const turn of staleTurns) {
      const assistant = await ctx.db.get(turn.assistantMessageId);
      if (!assistant || assistant.role !== "assistant" || assistant.turnId !== turn._id) continue;
      const hasApprovedContent = assistant.content.length > 0 || turn.publishedChars > 0;
      const status: "failed" | "incomplete" | "cancelled" = turn.status === "cancel_requested"
        ? "cancelled"
        : hasApprovedContent
          ? "incomplete"
          : "failed";
      const content = assistant.content || (status === "cancelled"
        ? "Stopped"
        : "The stars are momentarily beyond my reach. Please try again in a moment. ->");
      await Promise.all([
        ctx.db.patch(assistant._id, {
          content,
          ...(!hasApprovedContent && status === "failed"
            ? { modelUsed: "stale_turn_recovery", fallbackTierUsed: "D" as const }
            : {}),
        }),
        ctx.db.patch(turn._id, {
          status,
          active: false,
          partial: hasApprovedContent,
          publishedChars: content.length,
          safeErrorCode: status === "cancelled" ? "cancelled" : "stale_turn_recovered",
          safeErrorMessage: status === "cancelled"
            ? undefined
            : hasApprovedContent
              ? "The response was interrupted before Oracle could finish it."
              : "Oracle generation did not finish within the allowed liveness window.",
          stageTimeline: appendStage(turn.stageTimeline, status, now),
          updatedAt: now,
          ...terminalPatch(status, now),
        }),
      ]);
      await ctx.scheduler.runAfter(0, internalRef.oracle.turns.chargeTurnQuota, {
        turnId: turn._id,
      });
      if (status === "failed") failed += 1;
      else if (status === "incomplete") incomplete += 1;
      else cancelled += 1;
    }
    return { scanned: staleTurns.length, recovered: failed + incomplete + cancelled, failed, incomplete, cancelled };
  },
});

export const retryTurn = mutation({
  args: {
    turnId: v.id("oracle_turns"),
    clientRequestId: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const original = await ctx.db.get(args.turnId);
    if (!original || original.userId !== userId) throw new Error("Turn not found");
    const clientRequestId = normalizeClientRequestId(args.clientRequestId);
    const duplicate = await getExistingRequest(ctx, userId, clientRequestId);
    if (duplicate) return turnResult(duplicate, { reused: true });
    if (!isTerminal(original.status)) throw new Error("Only terminal turns can be retried");
    const activeTurn = await getActiveUserTurn(ctx, userId);
    if (activeTurn) return turnResult(activeTurn, { existingActive: true });
    const session = await ctx.db.get(original.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found");
    const userMessage = await ctx.db.get(original.userMessageId);
    if (!userMessage || userMessage.role !== "user") throw new Error("Original user message not found");

    const rollout = await getStreamingRollout(ctx, userId);
    const now = Date.now();
    const assistantMessageId = await ctx.db.insert("oracle_messages", {
      sessionId: session._id,
      role: "assistant",
      content: "",
      streamProtocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      createdAt: now,
    });
    const turnId = await ctx.db.insert("oracle_turns", {
      userId,
      sessionId: session._id,
      userMessageId: userMessage._id,
      assistantMessageId,
      clientRequestId,
      retryOfTurnId: original._id,
      status: "queued",
      active: true,
      publicationMode: original.publicationMode,
      rolloutMode: rollout.mode,
      rolloutBucket: rollout.bucket,
      protocolVersion: ORACLE_STREAM_PROTOCOL_VERSION,
      timezone: normalizeTimezone(args.timezone ?? original.timezone),
      modelOptionKey: original.modelOptionKey,
      reasoningEffort: original.reasoningEffort,
      debugModelOverride: original.debugModelOverride,
      requiredSectionKeys: original.requiredSectionKeys,
      lastSequence: 0,
      publishedChars: 0,
      partial: false,
      providerAttemptCount: 0,
      repairCount: 0,
      resumeCount: 0,
      createdAt: now,
      queuedAt: now,
      stageTimeline: [{ stage: "queued", at: now }],
      updatedAt: now,
    });
    await Promise.all([
      ctx.db.patch(assistantMessageId, { turnId }),
      ctx.db.patch(session._id, {
        messageCount: session.messageCount + 1,
        updatedAt: now,
        lastMessageAt: now,
      }),
    ]);
    await scheduleTurn(ctx, turnId);
    return {
      turnId,
      sessionId: session._id,
      userMessageId: userMessage._id,
      assistantMessageId,
      reused: false,
      existingActive: false,
    };
  },
});

/**
 * Reopens the same validated-section turn and schedules generation for only
 * the deterministic keys that still lack approved content.
 */
export const resumeIncompleteTurn = mutation({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const turn = await ctx.db.get(args.turnId);
    if (!turn || turn.userId !== userId) throw new Error("Turn not found");
    if (turn.active && turn.resumeSectionKeys?.length) {
      return {
        ...turnResult(turn, { reused: true, existingActive: true }),
        missingSectionKeys: turn.resumeSectionKeys,
      };
    }
    if (turn.status !== "incomplete" || turn.publicationMode !== "validated_sections") {
      throw new Error("Only incomplete validated-section turns can be resumed");
    }
    const activeTurn = await getActiveUserTurn(ctx, userId);
    if (activeTurn) return {
      ...turnResult(activeTurn, { reused: true, existingActive: true }),
      missingSectionKeys: activeTurn.resumeSectionKeys ?? [],
    };
    const sections = await ctx.db
      .query("oracle_turn_sections")
      .withIndex("by_turn_ordinal", (q) => q.eq("turnId", turn._id))
      .collect();
    const published = new Set(
      sections.filter((section) => section.status === "published" && section.content)
        .map((section) => section.key),
    );
    const missingSectionKeys = (turn.requiredSectionKeys ?? [])
      .filter((key) => !published.has(key));
    if (missingSectionKeys.length === 0) {
      throw new Error("This turn has no missing sections to resume");
    }
    const now = Date.now();
    await ctx.db.patch(turn._id, {
      status: "queued",
      active: true,
      partial: true,
      resumeSectionKeys: missingSectionKeys,
      resumeCount: turn.resumeCount + 1,
      quotaChargedCostUsdMicro: turn.quotaChargedCostUsdMicro
        ?? (turn.quotaChargedAt !== undefined ? turn.costUsdMicro ?? 0 : undefined),
      safeErrorCode: undefined,
      safeErrorMessage: undefined,
      failedAt: undefined,
      stageTimeline: appendStage(turn.stageTimeline, "queued", now),
      updatedAt: now,
    });
    await scheduleTurn(ctx, turn._id);
    return {
      ...turnResult(turn),
      missingSectionKeys,
    };
  },
});

/** Atomic execution claim: exactly one queued worker can advance to planning. */
export const claimQueuedTurn = internalMutation({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) return { claimed: false, reason: "not_found" as const };
    if (turn.status === "cancel_requested") {
      const now = Date.now();
      await ctx.db.patch(turn._id, {
        status: "cancelled",
        active: false,
        cancelledAt: now,
        stageTimeline: appendStage(turn.stageTimeline, "cancelled", now),
        updatedAt: now,
      });
      return { claimed: false, reason: "cancelled" as const };
    }
    if (turn.status !== "queued") {
      return {
        claimed: false,
        reason: isTerminal(turn.status) ? "terminal" as const : "already_claimed" as const,
      };
    }
    assertOracleTurnTransition(turn.status, "planning");
    const now = Date.now();
    await ctx.db.patch(turn._id, {
      status: "planning",
      actionStartedAt: turn.actionStartedAt ?? now,
      stageTimeline: appendStage(turn.stageTimeline, "planning", now),
      updatedAt: now,
    });
    return { claimed: true, turnId: turn._id, userMessageId: turn.userMessageId };
  },
});

export const transitionTurn = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    expectedStatus: turnStatus,
    status: turnStatus,
    safeErrorCode: v.optional(v.string()),
    safeErrorMessage: v.optional(v.string()),
    partial: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (turn.status !== args.expectedStatus) {
      return { applied: false, status: turn.status };
    }
    assertOracleTurnTransition(turn.status, args.status);
    const now = Date.now();
    await ctx.db.patch(turn._id, {
      status: args.status,
      stageTimeline: appendStage(turn.stageTimeline, args.status, now),
      ...(args.status === "validating" && turn.validationStartedAt === undefined
        ? { validationStartedAt: now }
        : {}),
      updatedAt: now,
      ...(args.safeErrorCode !== undefined ? { safeErrorCode: args.safeErrorCode } : {}),
      ...(args.safeErrorMessage !== undefined ? { safeErrorMessage: args.safeErrorMessage } : {}),
      ...(args.partial !== undefined ? { partial: args.partial } : {}),
      ...terminalPatch(args.status, now),
    });
    return { applied: true, status: args.status };
  },
});

/** Adds one provider attempt's usage once, keyed by the runner's stable attempt ID. */
export const accumulateTurnUsage = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    usageKey: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    costUsdMicro: v.number(),
  },
  handler: async (ctx, args) => {
    const usageKey = args.usageKey.trim();
    if (!usageKey || usageKey.length > MAX_USAGE_KEY_LENGTH) {
      throw new Error("Invalid usage key");
    }
    for (const value of [args.promptTokens, args.completionTokens, args.costUsdMicro]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
        throw new Error("Usage values must be non-negative safe integers");
      }
    }
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    const accountedUsageKeys = turn.accountedUsageKeys ?? [];
    if (accountedUsageKeys.includes(usageKey)) {
      return {
        applied: false,
        promptTokens: turn.promptTokens ?? 0,
        completionTokens: turn.completionTokens ?? 0,
        costUsdMicro: turn.costUsdMicro ?? 0,
      };
    }
    const promptTokens = (turn.promptTokens ?? 0) + (args.promptTokens ?? 0);
    const completionTokens = (turn.completionTokens ?? 0) + (args.completionTokens ?? 0);
    const costUsdMicro = (turn.costUsdMicro ?? 0) + args.costUsdMicro;
    await ctx.db.patch(turn._id, {
      accountedUsageKeys: [...accountedUsageKeys, usageKey],
      providerAttemptCount: turn.providerAttemptCount + 1,
      promptTokens,
      completionTokens,
      costUsdMicro,
      updatedAt: Date.now(),
    });
    return { applied: true, promptTokens, completionTokens, costUsdMicro };
  },
});

function parsePositiveWindow(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nextFixedWindow(
  existingCost: number,
  existingStart: number | undefined,
  windowMs: number,
  addedCost: number,
  now: number,
): { cost: number; start: number | undefined } {
  const active = existingStart !== undefined && now - existingStart <= windowMs;
  if (active) return { cost: existingCost + addedCost, start: existingStart };
  return { cost: addedCost, start: addedCost > 0 ? now : undefined };
}

/** Charges only previously uncharged turn cost after each terminal execution. */
export const chargeTurnQuota = internalMutation({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (!isTerminal(turn.status)) throw new Error("Quota can only be charged for a terminal turn");
    const costUsdMicro = turn.costUsdMicro ?? 0;
    const previouslyCharged = turn.quotaChargedCostUsdMicro
      ?? (turn.quotaChargedAt !== undefined ? costUsdMicro : 0);
    const incrementalCostUsdMicro = Math.max(0, costUsdMicro - previouslyCharged);
    if (turn.quotaChargedAt !== undefined && incrementalCostUsdMicro === 0) {
      return { charged: false, chargedAt: turn.quotaChargedAt, costUsdMicro };
    }
    const user = await ctx.db.get(turn.userId);
    if (!user) throw new Error("User not found");

    const [burstSetting, weeklySetting, existing] = await Promise.all([
      ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", "quota_burst_window_ms"))
        .first(),
      ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", "quota_weekly_window_ms"))
        .first(),
      ctx.db
        .query("oracle_quota_usage")
        .withIndex("by_user", (q) => q.eq("userId", turn.userId))
        .first(),
    ]);
    const burstWindowMs = parsePositiveWindow(burstSetting?.value, DEFAULT_BURST_WINDOW_MS);
    const weeklyWindowMs = parsePositiveWindow(weeklySetting?.value, DEFAULT_WEEKLY_WINDOW_MS);
    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("oracle_quota_usage", {
        userId: turn.userId,
        lastQuestionAt: now,
        updatedAt: now,
        burstCost: incrementalCostUsdMicro > 0 ? incrementalCostUsdMicro : undefined,
        burstWindowStart: incrementalCostUsdMicro > 0 ? now : undefined,
        weeklyCost: incrementalCostUsdMicro > 0 ? incrementalCostUsdMicro : undefined,
        weeklyWindowStart: incrementalCostUsdMicro > 0 ? now : undefined,
      });
    } else {
      const burst = nextFixedWindow(
        existing.burstCost ?? 0,
        existing.burstWindowStart,
        burstWindowMs,
        incrementalCostUsdMicro,
        now,
      );
      const weekly = nextFixedWindow(
        existing.weeklyCost ?? 0,
        existing.weeklyWindowStart,
        weeklyWindowMs,
        incrementalCostUsdMicro,
        now,
      );
      await ctx.db.patch(existing._id, {
        lastQuestionAt: now,
        updatedAt: now,
        burstCost: burst.cost,
        burstWindowStart: burst.start,
        weeklyCost: weekly.cost,
        weeklyWindowStart: weekly.start,
      });
    }
    await Promise.all([
      ctx.db.patch(turn._id, {
        quotaChargedAt: turn.quotaChargedAt ?? now,
        quotaChargedCostUsdMicro: costUsdMicro,
        updatedAt: now,
      }),
      ctx.db.patch(turn.assistantMessageId, { costUsdMicro }),
    ]);
    return { charged: true, chargedAt: turn.quotaChargedAt ?? now, costUsdMicro };
  },
});
