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

async function createTurn(t: any, content: string, requestId: string) {
  const { userId, sessionId } = await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", {
      tier: "free",
      subscriptionStatus: "none",
      role: "user",
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("oracle_sessions", {
      userId,
      title: "Runner fixture",
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
    { sessionId, content, clientRequestId: requestId },
  );
  return { ...turn, sessionId };
}

describe("durable Oracle turn runner", () => {
  it("finalizes the existing placeholder through the kill switch without a provider call", async () => {
    const t = harness();
    const turn = await createTurn(t, "A normal question", "kill-switch-turn");
    await t.run(async (ctx: any) => {
      const now = Date.now();
      await ctx.db.insert("oracle_settings", {
        key: "kill_switch",
        value: "true",
        valueType: "boolean",
        label: "Kill switch",
        group: "operational",
        updatedAt: now,
      });
      await ctx.db.insert("oracle_settings", {
        key: "fallback_response_text",
        value: "The Oracle is resting safely.",
        valueType: "string",
        label: "Fallback",
        group: "content",
        updatedAt: now,
      });
    });

    const result = await t.action(internalRef.oracle.turnRunner.invokeOracleTurn, {
      turnId: turn.turnId,
    });
    expect(result).toMatchObject({ claimed: true, completed: true });
    const snapshot = await t.run(async (ctx: any) => ({
      turn: await ctx.db.get(turn.turnId),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", turn.sessionId))
        .collect(),
    }));
    expect(snapshot.turn).toMatchObject({
      status: "complete",
      active: false,
      safeErrorCode: "kill_switch",
      quotaChargedAt: expect.any(Number),
    });
    expect(snapshot.messages).toHaveLength(2);
    expect(snapshot.messages.filter((message: any) => message.role === "assistant"))
      .toEqual([expect.objectContaining({
        _id: turn.assistantMessageId,
        content: "The Oracle is resting safely.",
      })]);
  });

  it("keeps crisis handling hardcoded and terminal on the linked placeholder", async () => {
    const t = harness();
    const turn = await createTurn(t, "I want to end my life", "crisis-turn");
    const result = await t.action(internalRef.oracle.turnRunner.invokeOracleTurn, {
      turnId: turn.turnId,
    });
    expect(result).toMatchObject({ claimed: true, completed: true });
    const snapshot = await t.run(async (ctx: any) => ({
      turn: await ctx.db.get(turn.turnId),
      assistant: await ctx.db.get(turn.assistantMessageId),
      messages: await ctx.db
        .query("oracle_messages")
        .withIndex("by_session", (q: any) => q.eq("sessionId", turn.sessionId))
        .collect(),
    }));
    expect(snapshot.turn).toMatchObject({
      status: "complete",
      active: false,
      safeErrorCode: "crisis_response",
      providerAttemptCount: 0,
    });
    expect(snapshot.assistant.content).toContain("988 Suicide & Crisis Lifeline");
    expect(snapshot.messages).toHaveLength(2);
  });
});
