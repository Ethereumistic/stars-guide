// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { convexTestModules } from "../test.setup";

const { api: apiRef, internal: internalRef } = require("../_generated/api") as any;

function harness(): any {
  return convexTest(schema as any, convexTestModules as any);
}

async function setupTurn(t: any) {
  const { userId, sessionId } = await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", {
      tier: "free",
      subscriptionStatus: "none",
      role: "user",
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("oracle_sessions", {
      userId,
      title: "Publisher test",
      status: "active",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });
    return { userId, sessionId };
  });
  const turn = await t.withIdentity({ subject: userId as Id<"users"> }).mutation(
    apiRef.oracle.turns.beginTurn,
    {
      sessionId,
      content: "Explain my Sun",
      clientRequestId: "publisher-test",
    },
  );
  await t.mutation(internalRef.oracle.turns.claimQueuedTurn, { turnId: turn.turnId });
  return turn;
}

describe("Oracle publisher persistence boundary", () => {
  it("ignores stale snapshots, stores approved sections only, and finalizes the placeholder", async () => {
    const t = harness();
    const turn = await setupTurn(t);
    await t.mutation(internalRef.oracle.streamPublisher.markProviderAttemptStarted, {
      turnId: turn.turnId,
      providerId: "fixture",
      model: "fixture-model",
      tier: "A",
      startedAt: Date.now(),
    });
    await t.mutation(internalRef.oracle.streamPublisher.markProviderActivity, {
      turnId: turn.turnId,
      firstText: true,
      receivedAt: Date.now(),
    });
    await t.mutation(internalRef.oracle.streamPublisher.initializeSections, {
      turnId: turn.turnId,
      sections: [{ key: "sun", ordinal: 0, title: "Your Sun" }],
    });

    await t.mutation(internalRef.oracle.streamPublisher.persistSectionState, {
      turnId: turn.turnId,
      key: "sun",
      status: "validating",
      content: "rejected candidate must not be stored",
      violationCodes: ["contradictory_natal_sign"],
    });
    let section = await t.run(async (ctx: any) => ctx.db
      .query("oracle_turn_sections")
      .withIndex("by_turn_key", (q: any) => q.eq("turnId", turn.turnId).eq("key", "sun"))
      .unique());
    expect(section.content).toBeUndefined();

    await t.mutation(internalRef.oracle.streamPublisher.persistSectionState, {
      turnId: turn.turnId,
      key: "sun",
      status: "published",
      content: "## Your Sun\nYour Sun in Aries supports direct initiative.",
      evidenceKeys: ["placement:sun"],
      approvedAt: Date.now() - 5,
    });
    await t.mutation(internalRef.oracle.streamPublisher.publishSnapshot, {
      turnId: turn.turnId,
      sequence: 2,
      content: "new approved snapshot",
      final: false,
      approvedAt: Date.now() - 5,
    });
    const stale = await t.mutation(internalRef.oracle.streamPublisher.publishSnapshot, {
      turnId: turn.turnId,
      sequence: 1,
      content: "stale content",
      final: false,
      approvedAt: Date.now() - 5,
    });
    expect(stale).toMatchObject({ applied: false, stale: true, lastSequence: 2 });

    await t.mutation(internalRef.oracle.turns.transitionTurn, {
      turnId: turn.turnId,
      expectedStatus: "generating",
      status: "validating",
    });
    await t.mutation(internalRef.oracle.streamPublisher.finalizePublishedTurn, {
      turnId: turn.turnId,
      status: "complete",
      content: "## Your Sun\nYour Sun in Aries supports direct initiative.",
      partial: false,
      persistenceWriteCount: 2,
      maxQueuedChars: 80,
      sectionProtocolFallback: false,
      modelUsed: "fixture-model",
      fallbackTierUsed: "A",
    });

    const snapshot = await t.run(async (ctx: any) => ({
      turn: await ctx.db.get(turn.turnId),
      assistant: await ctx.db.get(turn.assistantMessageId),
      section: await ctx.db
        .query("oracle_turn_sections")
        .withIndex("by_turn_key", (q: any) => q.eq("turnId", turn.turnId).eq("key", "sun"))
        .unique(),
    }));
    expect(snapshot.turn).toMatchObject({
      status: "complete",
      active: false,
      lastSequence: 2,
      persistenceWriteCount: 2,
      maxQueuedChars: 80,
      publishedSectionKeys: ["sun"],
      firstApprovedAt: expect.any(Number),
      firstPersistedAt: expect.any(Number),
    });
    expect(snapshot.turn.firstPersistedAt).toBeGreaterThanOrEqual(snapshot.turn.firstApprovedAt);
    expect(snapshot.assistant.content).toContain("Sun in Aries");
    expect(snapshot.section).toMatchObject({
      status: "published",
      content: expect.stringContaining("Sun in Aries"),
      evidenceKeys: ["placement:sun"],
    });
  });
});
