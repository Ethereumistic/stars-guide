// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { convexTestModules } from "../test.setup";

const { api: apiRef, internal: internalRef } = require("../_generated/api") as any;
const turnApi = apiRef.oracle.turns;
const sessionApi = apiRef.oracle.sessions;
const turnInternal = internalRef.oracle.turns;
const turnRunnerInternal = internalRef.oracle.turnRunner;
const routeInternal = internalRef.aiGateway.userModelOptions;

// This repository's full schema exceeds TypeScript's generic instantiation
// depth in convex-test; runtime schema validation remains enabled.
function createTestHarness(): any {
  return convexTest(schema as any, convexTestModules as any);
}

async function createUserAndSession(t: any) {
  return await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", {
      tier: "free",
      subscriptionStatus: "none",
      role: "user",
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("oracle_sessions", {
      userId,
      title: "Legacy session",
      status: "active",
      messageCount: 1,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });
    const legacyMessageId = await ctx.db.insert("oracle_messages", {
      sessionId,
      role: "assistant",
      content: "Historical answer",
      createdAt: now,
    });
    return { userId, sessionId, legacyMessageId };
  });
}

function asUser(t: any, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

describe("Oracle durable turns", () => {
  it("resolves a scheduled turn route from the stored user without browser auth", async () => {
    const t = createTestHarness();
    const { userId } = await createUserAndSession(t);
    const route = await t.query(routeInternal.resolveOracleRouteInternal, { userId });
    expect(route).toMatchObject({
      effectiveTier: "free",
      fallbackReason: "profile_unavailable",
    });
  });

  it("creates one atomic turn for duplicate begin requests and preserves legacy messages", async () => {
    const t = createTestHarness();
    const { userId, sessionId, legacyMessageId } = await createUserAndSession(t);
    const user = asUser(t, userId);

    const [first, duplicate] = await Promise.all([
      user.mutation(turnApi.beginTurn, {
        sessionId,
        content: "What should I understand now?",
        clientRequestId: "request-1",
        timezone: "UTC",
      }),
      user.mutation(turnApi.beginTurn, {
        sessionId,
        content: "What should I understand now?",
        clientRequestId: "request-1",
        timezone: "UTC",
      }),
    ]);
    const activeConflict = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "A second active turn must not be inserted",
      clientRequestId: "request-2",
      timezone: "UTC",
    });

    expect(duplicate.turnId).toBe(first.turnId);
    expect(duplicate.reused).toBe(true);
    expect(activeConflict.turnId).toBe(first.turnId);
    expect(activeConflict.existingActive).toBe(true);

    const snapshot = await t.run(async (ctx: any) => ({
      turns: await ctx.db.query("oracle_turns").collect(),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session_created", (q: any) => q.eq("sessionId", sessionId))
        .order("asc")
        .collect(),
      session: await ctx.db.get(sessionId),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(snapshot.turns).toHaveLength(1);
    expect(snapshot.messages).toHaveLength(3);
    expect(snapshot.messages[0]._id).toBe(legacyMessageId);
    expect(snapshot.messages[0].turnId).toBeUndefined();
    expect(snapshot.messages[1].turnId).toBe(first.turnId);
    expect(snapshot.messages[2].turnId).toBe(first.turnId);
    expect(snapshot.session?.messageCount).toBe(3);
    expect(snapshot.scheduled).toHaveLength(1);

    const queried = await user.query(sessionApi.getSessionWithMessages, { sessionId });
    expect(queried?.messages.map((message: any) => message.content)).toEqual([
      "Historical answer",
      "What should I understand now?",
      "",
    ]);
    const conversation = await user.query(sessionApi.getSessionConversation, { sessionId });
    expect(conversation?.activeTurn?._id).toBe(first.turnId);
    expect(conversation?.turns).toHaveLength(1);
    expect(conversation?.sections).toEqual([]);
  });

  it("returns one ownership-checked conversation subscription with approved sections", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const turn = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Read my chart in sections",
      clientRequestId: "conversation-query-1",
    });
    await t.run(async (ctx: any) => {
      await ctx.db.insert("oracle_turn_sections", {
        turnId: turn.turnId,
        sessionId,
        key: "sun",
        ordinal: 0,
        title: "Core self",
        status: "published",
        content: "Approved Sun section.",
        attemptCount: 1,
        publishedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const conversation = await user.query(sessionApi.getSessionConversation, { sessionId });
    expect(conversation?.messages).toHaveLength(3);
    expect(conversation?.turns).toHaveLength(1);
    expect(conversation?.sections).toMatchObject([
      { turnId: turn.turnId, key: "sun", status: "published", content: "Approved Sun section." },
    ]);

    const foreignUserId = await t.run(async (ctx: any) => await ctx.db.insert("users", {
      tier: "free",
      subscriptionStatus: "none",
      role: "user",
    }));
    const foreign = asUser(t, foreignUserId);
    expect(await foreign.query(sessionApi.getSessionConversation, { sessionId })).toBeNull();
  });

  it("atomically creates and deduplicates a new V2 session", async () => {
    const t = createTestHarness();
    const { userId } = await createUserAndSession(t);
    const user = asUser(t, userId);

    const first = await user.mutation(turnApi.createSessionWithTurn, {
      featureKey: "general_conversation",
      questionText: "Start a fresh conversation",
      clientRequestId: "new-session-1",
    });
    const duplicate = await user.mutation(turnApi.createSessionWithTurn, {
      featureKey: "general_conversation",
      questionText: "Do not create this session",
      clientRequestId: "new-session-1",
    });
    expect(duplicate.turnId).toBe(first.turnId);
    expect(duplicate.sessionId).toBe(first.sessionId);

    const created = await t.run(async (ctx: any) => ({
      session: await ctx.db.get(first.sessionId),
      turns: await ctx.db
        .query("oracle_turns")
        .withIndex("by_client_request", (q: any) =>
          q.eq("userId", userId).eq("clientRequestId", "new-session-1"),
        )
        .collect(),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", first.sessionId))
        .collect(),
    }));
    expect(created.session?.messageCount).toBe(2);
    expect(created.turns).toHaveLength(1);
    expect(created.messages).toHaveLength(2);
  });

  it("allows exactly one claim and converts a pre-claim stop into cancellation", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const turn = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Claim this once",
      clientRequestId: "claim-1",
    });

    const claims = await Promise.all([
      t.action(turnRunnerInternal.invokeOracleTurn, { turnId: turn.turnId }),
      t.mutation(turnInternal.claimQueuedTurn, { turnId: turn.turnId }),
    ]);
    expect(claims.filter((claim: any) => claim.claimed)).toHaveLength(1);
    expect(claims.filter((claim: any) => !claim.claimed)).toHaveLength(1);

    await t.mutation(turnInternal.transitionTurn, {
      turnId: turn.turnId,
      expectedStatus: "planning",
      status: "failed",
    });
    const retry = await user.mutation(turnApi.retryTurn, {
      turnId: turn.turnId,
      clientRequestId: "retry-to-stop",
    });
    const stopped = await user.mutation(turnApi.requestStop, { turnId: retry.turnId });
    const stoppedAgain = await user.mutation(turnApi.requestStop, { turnId: retry.turnId });
    const cancelledClaim = await t.mutation(turnInternal.claimQueuedTurn, {
      turnId: retry.turnId,
    });
    expect(stopped).toMatchObject({ status: "cancel_requested", changed: true });
    expect(stoppedAgain).toMatchObject({ status: "cancel_requested", changed: false });
    expect(cancelledClaim).toMatchObject({ claimed: false, reason: "cancelled" });
    const cancelled = await t.run(async (ctx: any) => await ctx.db.get(retry.turnId));
    expect(cancelled).toMatchObject({ status: "cancelled", active: false });
    expect(cancelled?.cancelledAt).toEqual(expect.any(Number));
  });

  it("retries with a linked assistant placeholder without duplicating user text", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const original = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Use this user message once",
      clientRequestId: "original",
    });
    await t.mutation(turnInternal.claimQueuedTurn, { turnId: original.turnId });
    await t.mutation(turnInternal.transitionTurn, {
      turnId: original.turnId,
      expectedStatus: "planning",
      status: "failed",
      safeErrorCode: "provider_unavailable",
    });

    const retry = await user.mutation(turnApi.retryTurn, {
      turnId: original.turnId,
      clientRequestId: "retry-1",
    });
    const retryDuplicate = await user.mutation(turnApi.retryTurn, {
      turnId: original.turnId,
      clientRequestId: "retry-1",
    });
    expect(retryDuplicate.turnId).toBe(retry.turnId);

    const snapshot = await t.run(async (ctx: any) => ({
      retryTurn: await ctx.db.get(retry.turnId),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
        .collect(),
    }));
    expect(snapshot.retryTurn?.retryOfTurnId).toBe(original.turnId);
    expect(snapshot.retryTurn?.userMessageId).toBe(original.userMessageId);
    expect(snapshot.messages.filter((message: any) => message.role === "user")).toHaveLength(1);
    expect(snapshot.messages.filter((message: any) => message.role === "assistant")).toHaveLength(3);
  });

  it("resumes only missing validated sections on the same durable turn", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const original = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Read my complete chart",
      clientRequestId: "resume-original",
    });
    await t.run(async (ctx: any) => {
      const now = Date.now();
      await ctx.db.patch(original.turnId, {
        publicationMode: "validated_sections",
        requiredSectionKeys: ["sun", "moon"],
        publishedSectionKeys: ["sun"],
        status: "incomplete",
        active: false,
        partial: true,
        failedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(original.assistantMessageId, { content: "Approved Sun section." });
      await ctx.db.insert("oracle_turn_sections", {
        turnId: original.turnId,
        sessionId,
        key: "sun",
        ordinal: 0,
        title: "Sun",
        status: "published",
        content: "Approved Sun section.",
        evidenceKeys: ["placement:sun"],
        attemptCount: 1,
        publishedAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("oracle_turn_sections", {
        turnId: original.turnId,
        sessionId,
        key: "moon",
        ordinal: 1,
        title: "Moon",
        status: "failed",
        violationCodes: ["section_missing_end"],
        attemptCount: 1,
        updatedAt: now,
      });
    });

    const resumed = await user.mutation(turnApi.resumeIncompleteTurn, { turnId: original.turnId });
    const duplicate = await user.mutation(turnApi.resumeIncompleteTurn, { turnId: original.turnId });
    expect(resumed).toMatchObject({
      turnId: original.turnId,
      assistantMessageId: original.assistantMessageId,
      missingSectionKeys: ["moon"],
    });
    expect(duplicate).toMatchObject({
      turnId: original.turnId,
      reused: true,
      existingActive: true,
      missingSectionKeys: ["moon"],
    });
    const snapshot = await t.run(async (ctx: any) => ({
      turn: await ctx.db.get(original.turnId),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
        .collect(),
    }));
    expect(snapshot.turn).toMatchObject({
      status: "queued",
      active: true,
      resumeSectionKeys: ["moon"],
      resumeCount: 1,
    });
    expect(snapshot.messages.filter((message: any) => message.role === "user")).toHaveLength(1);
    expect(snapshot.messages.filter((message: any) => message.role === "assistant")).toHaveLength(2);
  });

  it("creates one compatibility turn for an unanswered historical user message", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const legacyUserMessageId = await t.run(async (ctx: any) => {
      const now = Date.now() + 10;
      const messageId = await ctx.db.insert("oracle_messages", {
        sessionId,
        role: "user",
        content: "Historical unanswered question",
        createdAt: now,
      });
      const session = await ctx.db.get(sessionId);
      await ctx.db.patch(sessionId, {
        messageCount: session.messageCount + 1,
        updatedAt: now,
        lastMessageAt: now,
      });
      return messageId;
    });

    const first = await user.mutation(turnApi.ensureTurnForUnansweredMessage, {
      sessionId,
      clientRequestId: "compat-1",
    });
    const duplicate = await user.mutation(turnApi.ensureTurnForUnansweredMessage, {
      sessionId,
      clientRequestId: "compat-1",
    });
    expect(duplicate.turnId).toBe(first.turnId);
    expect(first.userMessageId).toBe(legacyUserMessageId);

    const snapshot = await t.run(async (ctx: any) => ({
      turns: await ctx.db
        .query("oracle_turns")
        .withIndex("by_user_message", (q: any) => q.eq("userMessageId", legacyUserMessageId))
        .collect(),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
        .collect(),
    }));
    expect(snapshot.turns).toHaveLength(1);
    expect(snapshot.messages.filter((message: any) => message.role === "user")).toHaveLength(1);
    expect(snapshot.messages.filter((message: any) => message.role === "assistant")).toHaveLength(2);
  });

  it("accumulates attempt usage and charges quota exactly once per turn", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const turn = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Account for every attempt",
      clientRequestId: "quota-1",
    });
    await t.mutation(turnInternal.claimQueuedTurn, { turnId: turn.turnId });

    const firstUsage = await t.mutation(turnInternal.accumulateTurnUsage, {
      turnId: turn.turnId,
      usageKey: "primary:1",
      promptTokens: 100,
      completionTokens: 40,
      costUsdMicro: 700,
    });
    const duplicateUsage = await t.mutation(turnInternal.accumulateTurnUsage, {
      turnId: turn.turnId,
      usageKey: "primary:1",
      promptTokens: 100,
      completionTokens: 40,
      costUsdMicro: 700,
    });
    await t.mutation(turnInternal.accumulateTurnUsage, {
      turnId: turn.turnId,
      usageKey: "repair:1",
      promptTokens: 20,
      completionTokens: 10,
      costUsdMicro: 300,
    });
    expect(firstUsage.applied).toBe(true);
    expect(duplicateUsage.applied).toBe(false);

    await t.mutation(turnInternal.transitionTurn, {
      turnId: turn.turnId,
      expectedStatus: "planning",
      status: "failed",
    });
    const firstCharge = await t.mutation(turnInternal.chargeTurnQuota, {
      turnId: turn.turnId,
    });
    const duplicateCharge = await t.mutation(turnInternal.chargeTurnQuota, {
      turnId: turn.turnId,
    });
    expect(firstCharge).toMatchObject({ charged: true, costUsdMicro: 1_000 });
    expect(duplicateCharge).toMatchObject({ charged: false, costUsdMicro: 1_000 });

    const snapshot = await t.run(async (ctx: any) => ({
      turn: await ctx.db.get(turn.turnId),
      usage: await ctx.db
        .query("oracle_quota_usage")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .unique(),
      assistant: await ctx.db.get(turn.assistantMessageId),
    }));
    expect(snapshot.turn).toMatchObject({
      promptTokens: 120,
      completionTokens: 50,
      costUsdMicro: 1_000,
      providerAttemptCount: 2,
    });
    expect(snapshot.turn?.quotaChargedAt).toEqual(expect.any(Number));
    expect(snapshot.usage).toMatchObject({ burstCost: 1_000, weeklyCost: 1_000 });
    expect(snapshot.assistant?.costUsdMicro).toBe(1_000);

    await t.mutation(turnInternal.accumulateTurnUsage, {
      turnId: turn.turnId,
      usageKey: "resume:1",
      promptTokens: 20,
      completionTokens: 10,
      costUsdMicro: 300,
    });
    const incrementalCharge = await t.mutation(turnInternal.chargeTurnQuota, {
      turnId: turn.turnId,
    });
    expect(incrementalCharge).toMatchObject({ charged: true, costUsdMicro: 1_300 });
    const incrementedUsage = await t.run(async (ctx: any) => ctx.db
      .query("oracle_quota_usage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique());
    expect(incrementedUsage).toMatchObject({ burstCost: 1_300, weeklyCost: 1_300 });
  });

  it("records first client-visible timing once with ownership and timestamp clamping", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    const user = asUser(t, userId);
    const turn = await user.mutation(turnApi.beginTurn, {
      sessionId,
      content: "Observe this turn",
      clientRequestId: "visible-1",
    });
    const stored = await t.run(async (ctx: any) => await ctx.db.get(turn.turnId));
    const first = await user.mutation(turnApi.recordFirstClientVisible, {
      turnId: turn.turnId,
      timestamp: stored.createdAt - 10_000,
    });
    const second = await user.mutation(turnApi.recordFirstClientVisible, {
      turnId: turn.turnId,
      timestamp: Date.now() + 10_000,
    });
    expect(first).toEqual({ recorded: true, timestamp: stored.createdAt });
    expect(second).toEqual({ recorded: false, timestamp: stored.createdAt });

    const foreignUserId = await t.run(async (ctx: any) => await ctx.db.insert("users", {
      tier: "free",
      subscriptionStatus: "none",
      role: "user",
    }));
    await expect(asUser(t, foreignUserId).mutation(turnApi.recordFirstClientVisible, {
      turnId: turn.turnId,
      timestamp: Date.now(),
    })).rejects.toThrow("Turn not found");
  });

  it("recovers stale turns without invoking or retrying a model", async () => {
    const t = createTestHarness();
    const first = await createUserAndSession(t);
    const second = await createUserAndSession(t);
    const failedTurn = await asUser(t, first.userId).mutation(turnApi.beginTurn, {
      sessionId: first.sessionId,
      content: "This never started",
      clientRequestId: "stale-empty",
    });
    const partialTurn = await asUser(t, second.userId).mutation(turnApi.beginTurn, {
      sessionId: second.sessionId,
      content: "This stopped after approved content",
      clientRequestId: "stale-partial",
    });
    const now = Date.now() + 20_000;
    await t.run(async (ctx: any) => {
      await ctx.db.patch(failedTurn.turnId, { updatedAt: now - 10_000 });
      await ctx.db.patch(partialTurn.turnId, {
        status: "generating",
        updatedAt: now - 10_000,
        publishedChars: 17,
      });
      await ctx.db.patch(partialTurn.assistantMessageId, { content: "Approved fragment" });
    });
    const recovered = await t.mutation(turnInternal.recoverStaleTurns, {
      now,
      staleAfterMs: 1_000,
    });
    expect(recovered).toMatchObject({ recovered: 2, failed: 1, incomplete: 1 });
    const snapshot = await t.run(async (ctx: any) => ({
      failed: await ctx.db.get(failedTurn.turnId),
      partial: await ctx.db.get(partialTurn.turnId),
      partialMessage: await ctx.db.get(partialTurn.assistantMessageId),
    }));
    expect(snapshot.failed).toMatchObject({ active: false, status: "failed", safeErrorCode: "stale_turn_recovered" });
    expect(snapshot.partial).toMatchObject({ active: false, status: "incomplete", partial: true });
    expect(snapshot.partialMessage?.content).toBe("Approved fragment");
  });

  it("uses the rollout kill switch for one-setting buffered rollback", async () => {
    const t = createTestHarness();
    const { userId, sessionId } = await createUserAndSession(t);
    await t.run(async (ctx: any) => ctx.db.insert("oracle_settings", {
      key: "oracle_streaming_v2_enabled",
      value: "false",
      valueType: "boolean",
      label: "V2 enabled",
      group: "operations",
      updatedAt: Date.now(),
    }));
    const turn = await asUser(t, userId).mutation(turnApi.beginTurn, {
      sessionId,
      content: "Use buffered rollback",
      clientRequestId: "rollout-buffered",
    });
    const stored = await t.run(async (ctx: any) => await ctx.db.get(turn.turnId));
    expect(stored).toMatchObject({ rolloutMode: "buffered" });
    expect(stored.rolloutBucket).toEqual(expect.any(Number));
  });
});
