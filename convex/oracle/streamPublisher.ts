import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { assertOracleTurnTransition } from "../../src/lib/oracle/streaming/publicationState";
import type { OracleTurnStatus } from "../../src/lib/oracle/streaming/types";

const MAX_VISIBLE_CONTENT_CHARS = 300_000;
const DEFAULT_BURST_WINDOW_MS = 18_000_000;
const DEFAULT_WEEKLY_WINDOW_MS = 604_800_000;
const DEFAULT_BURST_BUDGETS: Record<string, number> = {
  free: 50_000, popular: 500_000, premium: 2_000_000,
  moderator: 100_000_000, admin: 100_000_000,
};
const DEFAULT_WEEKLY_BUDGETS: Record<string, number> = {
  free: 200_000, popular: 2_000_000, premium: 8_000_000,
  moderator: 500_000_000, admin: 500_000_000,
};

const sectionSpec = v.object({
  key: v.string(),
  ordinal: v.number(),
  title: v.string(),
});

const sectionState = v.union(
  v.literal("validating"),
  v.literal("published"),
  v.literal("repairing"),
  v.literal("failed"),
);

const terminalStatus = v.union(
  v.literal("complete"),
  v.literal("incomplete"),
  v.literal("failed"),
  v.literal("cancelled"),
);

function assertVisibleContent(content: string): void {
  if (content.length > MAX_VISIBLE_CONTENT_CHARS) {
    throw new Error("Approved Oracle content exceeds the persistence limit");
  }
}

function terminalTimestamp(status: OracleTurnStatus, now: number) {
  if (status === "complete") return { completedAt: now };
  if (status === "cancelled") return { cancelledAt: now };
  return { failedAt: now };
}

function appendStage(
  timeline: Array<{ stage: OracleTurnStatus; at: number }> | undefined,
  stage: OracleTurnStatus,
  at: number,
): Array<{ stage: OracleTurnStatus; at: number }> {
  if (timeline?.[timeline.length - 1]?.stage === stage) return timeline;
  return [...(timeline ?? []), { stage, at }].slice(-32);
}

export const getTurnExecutionState = internalQuery({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) return null;
    const [userMessage, assistantMessage, user, session, messages, sections, journalConsent] = await Promise.all([
      ctx.db.get(turn.userMessageId),
      ctx.db.get(turn.assistantMessageId),
      ctx.db.get(turn.userId),
      ctx.db.get(turn.sessionId),
      ctx.db
        .query("oracle_messages")
        .withIndex("by_session_created", (q) => q.eq("sessionId", turn.sessionId))
        .order("asc")
        .collect(),
      ctx.db
        .query("oracle_turn_sections")
        .withIndex("by_turn_ordinal", (q) => q.eq("turnId", turn._id))
        .order("asc")
        .collect(),
      ctx.db
        .query("journal_consent")
        .withIndex("by_user", (q) => q.eq("userId", turn.userId))
        .first(),
    ]);
    if (
      !userMessage
      || !assistantMessage
      || userMessage.sessionId !== turn.sessionId
      || assistantMessage.sessionId !== turn.sessionId
      || assistantMessage.turnId !== turn._id
      || !user
      || !session
      || session.userId !== turn.userId
    ) {
      throw new Error("Turn message linkage is invalid");
    }
    return {
      turn,
      userMessage: {
        _id: userMessage._id,
        content: userMessage.content,
        role: userMessage.role,
      },
      assistantMessage: {
        _id: assistantMessage._id,
        content: assistantMessage.content,
        role: assistantMessage.role,
      },
      user,
      session: { ...session, messages },
      sections,
      hasJournalConsent: journalConsent?.oracleCanReadJournal === true,
    };
  },
});

function positiveSetting(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const checkTurnQuota = internalQuery({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    const user = await ctx.db.get(turn.userId);
    if (!user) throw new Error("User not found");
    const tier = user.role === "admin" || user.role === "moderator"
      ? user.role
      : user.tier === "popular" || user.tier === "premium"
        ? user.tier
        : "free";
    const keys = [
      `quota_burst_budget_${tier}`,
      `quota_weekly_budget_${tier}`,
      "quota_burst_window_ms",
      "quota_weekly_window_ms",
    ];
    const [settings, usage] = await Promise.all([
      Promise.all(keys.map((key) => ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first())),
      ctx.db
        .query("oracle_quota_usage")
        .withIndex("by_user", (q) => q.eq("userId", turn.userId))
        .first(),
    ]);
    const setting = new Map(settings.filter(Boolean).map((row) => [row!.key, row!.value]));
    const burstBudget = positiveSetting(
      setting.get(keys[0]),
      DEFAULT_BURST_BUDGETS[tier] ?? DEFAULT_BURST_BUDGETS.free,
    );
    const weeklyBudget = positiveSetting(
      setting.get(keys[1]),
      DEFAULT_WEEKLY_BUDGETS[tier] ?? DEFAULT_WEEKLY_BUDGETS.free,
    );
    const burstWindow = positiveSetting(setting.get(keys[2]), DEFAULT_BURST_WINDOW_MS);
    const weeklyWindow = positiveSetting(setting.get(keys[3]), DEFAULT_WEEKLY_WINDOW_MS);
    const now = Date.now();
    const burstCost = usage?.burstWindowStart && now - usage.burstWindowStart <= burstWindow
      ? usage.burstCost ?? 0
      : 0;
    const weeklyCost = usage?.weeklyWindowStart && now - usage.weeklyWindowStart <= weeklyWindow
      ? usage.weeklyCost ?? 0
      : 0;
    return {
      allowed: burstCost < burstBudget && weeklyCost < weeklyBudget,
      reason: burstCost >= burstBudget ? "burst_cap" : weeklyCost >= weeklyBudget ? "weekly_cap" : undefined,
    };
  },
});

export const patchTurnSession = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    featureKey: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"))),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    await ctx.db.patch(turn.sessionId, {
      ...(args.featureKey !== undefined ? { featureKey: args.featureKey } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      updatedAt: Date.now(),
    });
  },
});

/** Honest terminal path for hardcoded responses that never contact a provider. */
export const finalizeDeterministicBypass = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    content: v.string(),
    modelUsed: v.string(),
    safeCode: v.string(),
  },
  handler: async (ctx, args) => {
    assertVisibleContent(args.content);
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (!turn.active && turn.status === "complete") return { applied: false };
    if (turn.status !== "planning") {
      throw new Error(`Deterministic bypass requires planning status, received ${turn.status}`);
    }
    const assistant = await ctx.db.get(turn.assistantMessageId);
    if (!assistant || assistant.turnId !== turn._id || assistant.role !== "assistant") {
      throw new Error("Assistant placeholder linkage is invalid");
    }
    const now = Date.now();
    await Promise.all([
      ctx.db.patch(assistant._id, {
        content: args.content,
        modelUsed: args.modelUsed,
        fallbackTierUsed: "D",
      }),
      ctx.db.patch(turn._id, {
        status: "complete",
        active: false,
        partial: false,
        safeErrorCode: args.safeCode,
        lastSequence: Math.max(turn.lastSequence, 1),
        publishedChars: args.content.length,
        firstApprovedAt: now,
        firstPersistedAt: now,
        completedAt: now,
        stageTimeline: appendStage(turn.stageTimeline, "complete", now),
        updatedAt: now,
      }),
    ]);
    return { applied: true };
  },
});

export const initializeSections = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    sections: v.array(sectionSpec),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    const now = Date.now();
    const keys = new Set<string>();
    for (const spec of args.sections) {
      if (!spec.key || keys.has(spec.key) || !Number.isSafeInteger(spec.ordinal) || spec.ordinal < 0) {
        throw new Error("Invalid or duplicate section specification");
      }
      keys.add(spec.key);
      const existing = await ctx.db
        .query("oracle_turn_sections")
        .withIndex("by_turn_key", (q) => q.eq("turnId", turn._id).eq("key", spec.key))
        .unique();
      if (!existing) {
        await ctx.db.insert("oracle_turn_sections", {
          turnId: turn._id,
          sessionId: turn.sessionId,
          key: spec.key,
          ordinal: spec.ordinal,
          title: spec.title,
          status: "pending",
          attemptCount: 0,
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(turn._id, {
      requiredSectionKeys: args.sections
        .slice()
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((section) => section.key),
      updatedAt: now,
    });
    return { initialized: args.sections.length };
  },
});

export const setPublicationMode = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    mode: v.union(
      v.literal("guarded_batches"),
      v.literal("validated_sections"),
      v.literal("buffered"),
    ),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (!turn.active) return { applied: false };
    await ctx.db.patch(turn._id, { publicationMode: args.mode, updatedAt: Date.now() });
    return { applied: true };
  },
});

export const recordAutomaticResume = internalMutation({
  args: { turnId: v.id("oracle_turns") },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (turn.resumeCount >= 1) return { applied: false, resumeCount: turn.resumeCount };
    await ctx.db.patch(turn._id, {
      resumeCount: turn.resumeCount + 1,
      updatedAt: Date.now(),
    });
    return { applied: true, resumeCount: turn.resumeCount + 1 };
  },
});

export const markProviderAttemptStarted = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    providerId: v.string(),
    model: v.string(),
    tier: v.string(),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (turn.status !== "planning" && turn.status !== "retrying") {
      return { applied: false, status: turn.status };
    }
    assertOracleTurnTransition(turn.status, "connecting");
    const now = Date.now();
    const replacingUnpublishedAttempt = turn.status === "retrying"
      && turn.firstApprovedAt === undefined;
    await ctx.db.patch(turn._id, {
      status: "connecting",
      providerId: args.providerId.slice(0, 128),
      model: args.model.slice(0, 256),
      tier: args.tier.slice(0, 32),
      providerStartedAt: replacingUnpublishedAttempt
        ? Math.min(args.startedAt, now)
        : turn.providerStartedAt ?? Math.min(args.startedAt, now),
      ...(replacingUnpublishedAttempt
        ? { providerConnectedAt: undefined, providerFirstTokenAt: undefined }
        : {}),
      lastProviderEventAt: now,
      stageTimeline: appendStage(turn.stageTimeline, "connecting", now),
      updatedAt: now,
    });
    return { applied: true, status: "connecting" as const };
  },
});

export const markProviderConnected = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    connectedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (!turn.active) return { applied: false };
    const now = Date.now();
    const connectedAt = Math.max(
      turn.providerStartedAt ?? turn.createdAt,
      Math.min(args.connectedAt, now),
    );
    await ctx.db.patch(turn._id, {
      providerConnectedAt: turn.providerConnectedAt ?? connectedAt,
      lastProviderEventAt: Math.max(turn.lastProviderEventAt ?? 0, connectedAt),
      updatedAt: now,
    });
    return { applied: true };
  },
});

export const markProviderActivity = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    firstText: v.optional(v.boolean()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (!turn.active || turn.status === "cancel_requested") {
      return { applied: false, status: turn.status };
    }
    const now = Date.now();
    const patch: Record<string, unknown> = {
      lastProviderEventAt: now,
      updatedAt: now,
    };
    if (args.firstText && turn.status === "connecting") {
      assertOracleTurnTransition(turn.status, "generating");
      patch.status = "generating";
      patch.providerFirstTokenAt = turn.providerFirstTokenAt
        ?? Math.min(args.receivedAt ?? now, now);
      patch.stageTimeline = appendStage(turn.stageTimeline, "generating", now);
    }
    await ctx.db.patch(turn._id, patch);
    return { applied: true, status: (patch.status ?? turn.status) as OracleTurnStatus };
  },
});

export const publishSnapshot = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    sequence: v.number(),
    content: v.string(),
    final: v.boolean(),
    approvedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (!Number.isSafeInteger(args.sequence) || args.sequence <= 0) {
      throw new Error("Invalid publisher sequence");
    }
    assertVisibleContent(args.content);
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (args.sequence <= turn.lastSequence) {
      return { applied: false, stale: true, lastSequence: turn.lastSequence };
    }
    if (!turn.active && !args.final) {
      return { applied: false, stale: false, lastSequence: turn.lastSequence };
    }
    const assistant = await ctx.db.get(turn.assistantMessageId);
    if (!assistant || assistant.turnId !== turn._id || assistant.role !== "assistant") {
      throw new Error("Assistant placeholder linkage is invalid");
    }
    const now = Date.now();
    const approvedAt = Math.max(turn.createdAt, Math.min(args.approvedAt, now));
    await Promise.all([
      ctx.db.patch(assistant._id, { content: args.content }),
      ctx.db.patch(turn._id, {
        lastSequence: args.sequence,
        publishedChars: args.content.length,
        firstApprovedAt: turn.firstApprovedAt ?? approvedAt,
        firstPersistedAt: turn.firstPersistedAt ?? now,
        updatedAt: now,
      }),
    ]);
    return { applied: true, stale: false, lastSequence: args.sequence };
  },
});

export const persistSectionState = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    key: v.string(),
    status: sectionState,
    content: v.optional(v.string()),
    evidenceKeys: v.optional(v.array(v.string())),
    violationCodes: v.optional(v.array(v.string())),
    approvedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    const section = await ctx.db
      .query("oracle_turn_sections")
      .withIndex("by_turn_key", (q) => q.eq("turnId", turn._id).eq("key", args.key))
      .unique();
    if (!section) throw new Error("Section is not in the deterministic turn plan");
    const now = Date.now();
    const published = args.status === "published";
    if (published) assertVisibleContent(args.content ?? "");
    const patch = {
      status: args.status,
      // Only approved published prose may enter a durable section row.
      content: published ? (args.content ?? "") : undefined,
      evidenceKeys: published ? args.evidenceKeys : undefined,
      violationCodes: args.violationCodes,
      attemptCount: args.status === "validating"
        ? section.attemptCount + 1
        : section.attemptCount,
      startedAt: section.startedAt ?? now,
      publishedAt: published ? (section.publishedAt ?? now) : undefined,
      updatedAt: now,
    };
    await ctx.db.patch(section._id, patch);
    const publishedSectionKeys = published
      ? [...new Set([...(turn.publishedSectionKeys ?? []), section.key])]
      : turn.publishedSectionKeys;
    await ctx.db.patch(turn._id, {
      currentSectionKey: section.key,
      publishedSectionKeys,
      firstSectionCompletedAt: published
        ? (turn.firstSectionCompletedAt ?? now)
        : turn.firstSectionCompletedAt,
      repairCount: args.status === "repairing" ? turn.repairCount + 1 : turn.repairCount,
      ...(published
        ? {
            firstApprovedAt: turn.firstApprovedAt
              ?? Math.max(turn.createdAt, Math.min(args.approvedAt ?? now, now)),
            firstPersistedAt: turn.firstPersistedAt ?? now,
          }
        : {}),
      updatedAt: now,
    });
    return { applied: true, status: args.status };
  },
});

export const finalizePublishedTurn = internalMutation({
  args: {
    turnId: v.id("oracle_turns"),
    status: terminalStatus,
    content: v.string(),
    partial: v.boolean(),
    safeErrorCode: v.optional(v.string()),
    safeErrorMessage: v.optional(v.string()),
    persistenceWriteCount: v.number(),
    maxQueuedChars: v.number(),
    malformedProviderFrameCount: v.optional(v.number()),
    droppedProviderFrameCount: v.optional(v.number()),
    sectionProtocolFallback: v.optional(v.boolean()),
    modelUsed: v.optional(v.string()),
    journalPrompt: v.optional(v.string()),
    fallbackTierUsed: v.optional(v.union(
      v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"),
    )),
  },
  handler: async (ctx, args) => {
    assertVisibleContent(args.content);
    const turn = await ctx.db.get(args.turnId);
    if (!turn) throw new Error("Turn not found");
    if (turn.status === args.status && !turn.active) {
      return { applied: false, status: turn.status };
    }
    assertOracleTurnTransition(turn.status, args.status);
    const assistant = await ctx.db.get(turn.assistantMessageId);
    if (!assistant || assistant.turnId !== turn._id || assistant.role !== "assistant") {
      throw new Error("Assistant placeholder linkage is invalid");
    }
    const now = Date.now();
    await Promise.all([
      ctx.db.patch(assistant._id, {
        content: args.content,
        modelUsed: args.modelUsed,
        journalPrompt: args.journalPrompt,
        fallbackTierUsed: args.fallbackTierUsed,
        promptTokens: turn.promptTokens,
        completionTokens: turn.completionTokens,
      }),
      ctx.db.patch(turn._id, {
        status: args.status,
        active: false,
        partial: args.partial,
        publishedChars: args.content.length,
        persistenceWriteCount: args.persistenceWriteCount,
        maxQueuedChars: args.maxQueuedChars,
        malformedProviderFrameCount: args.malformedProviderFrameCount,
        droppedProviderFrameCount: args.droppedProviderFrameCount,
        sectionProtocolFallback: args.sectionProtocolFallback,
        safeErrorCode: args.safeErrorCode,
        safeErrorMessage: args.safeErrorMessage,
        stageTimeline: appendStage(turn.stageTimeline, args.status, now),
        updatedAt: now,
        ...terminalTimestamp(args.status, now),
      }),
    ]);
    return { applied: true, status: args.status };
  },
});
