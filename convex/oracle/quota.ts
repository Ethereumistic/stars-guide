/**
 * Oracle Quota — Cost-Based V2
 *
 * Fixed-window cost-based rate limiting.
 * Burst window: 5 hours, Weekly window: 7 days.
 * All values in microdollars (1 USD = 1,000,000 µ$).
 *
 * Return shape:
 * {
 *   allowed: boolean,
 *   reason?: "unauthenticated" | "burst_cap" | "weekly_cap",
 *   burstRemaining: number,   // µ$ left in burst window
 *   burstTotal: number,       // total burst budget (µ$)
 *   burstResetsAt?: number,  // ms timestamp when burst window resets (only if active)
 *   weeklyRemaining: number,  // µ$ left in weekly window
 *   weeklyTotal: number,      // total weekly budget (µ$)
 *   weeklyResetsAt?: number,  // ms timestamp when weekly window resets (only if active)
 * }
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const { internal } = require("../_generated/api") as any;

// ─── Default burst budgets (microdollars) ─────────────────────────────────────
const DEFAULT_BURST_BUDGETS: Record<string, number> = {
  free: 50_000,        // $0.05
  popular: 500_000,    // $0.50
  premium: 2_000_000,  // $2.00
  moderator: 100_000_000, // $100
  admin: 100_000_000,     // $100
  user: 50_000,        // fallback
};

// ─── Default weekly budgets (microdollars) ─────────────────────────────────────
const DEFAULT_WEEKLY_BUDGETS: Record<string, number> = {
  free: 200_000,        // $0.20
  popular: 2_000_000,   // $2.00
  premium: 8_000_000,   // $8.00
  moderator: 500_000_000, // $500
  admin: 500_000_000,     // $500
  user: 200_000,        // fallback
};

// ─── Default window sizes (milliseconds) ─────────────────────────────────────
const DEFAULT_BURST_WINDOW_MS = 18_000_000;   // 5 hours
const DEFAULT_WEEKLY_WINDOW_MS = 604_800_000;  // 7 days

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getQuotaSetting(
  ctx: any,
  key: string,
): Promise<string | null> {
  const setting = await ctx.db
    .query("oracle_settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return setting?.value ?? null;
}

function resolveTier(user: any): string {
  if (user.role === "admin" || user.role === "moderator") return user.role;
  return (user.tier as string) ?? "free";
}

// ─── MAIN QUERY ───────────────────────────────────────────────────────────────

export const checkQuota = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        allowed: false,
        reason: "unauthenticated" as const,
        burstRemaining: 0,
        burstTotal: 0,
        burstResetsAt: undefined,
        weeklyRemaining: 0,
        weeklyTotal: 0,
        weeklyResetsAt: undefined,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        allowed: false,
        reason: "unauthenticated" as const,
        burstRemaining: 0,
        burstTotal: 0,
        burstResetsAt: undefined,
        weeklyRemaining: 0,
        weeklyTotal: 0,
        weeklyResetsAt: undefined,
      };
    }

    // Ensure quota settings exist (read-only check — no writes in query context)
    const { seeded } = await ctx.runQuery(internal.oracle.seedOracleQuotaSettings.ensureQuotaSettings, {});

    const tier = resolveTier(user);

    // Read budget + window settings
    const [burstBudgetRaw, weeklyBudgetRaw, burstWindowRaw, weeklyWindowRaw] =
      await Promise.all([
        getQuotaSetting(ctx, `quota_burst_budget_${tier}`),
        getQuotaSetting(ctx, `quota_weekly_budget_${tier}`),
        getQuotaSetting(ctx, "quota_burst_window_ms"),
        getQuotaSetting(ctx, "quota_weekly_window_ms"),
      ]);

    const burstTotal =
      burstBudgetRaw !== null
        ? parseInt(burstBudgetRaw, 10)
        : (DEFAULT_BURST_BUDGETS[tier] ?? 0);
    const weeklyTotal =
      weeklyBudgetRaw !== null
        ? parseInt(weeklyBudgetRaw, 10)
        : (DEFAULT_WEEKLY_BUDGETS[tier] ?? 0);
    const burstWindowMs =
      burstWindowRaw !== null
        ? parseInt(burstWindowRaw, 10)
        : DEFAULT_BURST_WINDOW_MS;
    const weeklyWindowMs =
      weeklyWindowRaw !== null
        ? parseInt(weeklyWindowRaw, 10)
        : DEFAULT_WEEKLY_WINDOW_MS;

    // Read usage record
    const usage = await ctx.db
      .query("oracle_quota_usage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    // ── Burst window ──────────────────────────────────────────────────────────
    let burstCost = 0;
    let burstWindowStart: number | undefined;
    if (usage?.burstCost != null && usage.burstCost > 0) {
      burstCost = usage.burstCost;
      burstWindowStart = usage.burstWindowStart;

      // Fixed window expiry — reset if burst window has passed
      if (burstWindowStart && now - burstWindowStart > burstWindowMs) {
        burstCost = 0;
        burstWindowStart = undefined;
      }
    }

    const burstRemaining = Math.max(0, burstTotal - burstCost);
    const burstResetsAt =
      burstCost > 0 && burstWindowStart ? burstWindowStart + burstWindowMs : undefined;

    // ── Weekly window ─────────────────────────────────────────────────────────
    let weeklyCost = 0;
    let weeklyWindowStart: number | undefined;
    if (usage?.weeklyCost != null && usage.weeklyCost > 0) {
      weeklyCost = usage.weeklyCost;
      weeklyWindowStart = usage.weeklyWindowStart;

      // Fixed window expiry — reset if weekly window has passed
      if (weeklyWindowStart && now - weeklyWindowStart > weeklyWindowMs) {
        weeklyCost = 0;
        weeklyWindowStart = undefined;
      }
    }

    const weeklyRemaining = Math.max(0, weeklyTotal - weeklyCost);
    const weeklyResetsAt =
      weeklyCost > 0 && weeklyWindowStart ? weeklyWindowStart + weeklyWindowMs : undefined;

    // ── Decision ──────────────────────────────────────────────────────────────
    const allowed = burstRemaining > 0 && weeklyRemaining > 0;
    const reason =
      !allowed
        ? burstRemaining <= 0
          ? ("burst_cap" as const)
          : ("weekly_cap" as const)
        : undefined;

    return {
      allowed,
      reason,
      burstRemaining,
      burstTotal,
      burstResetsAt,
      weeklyRemaining,
      weeklyTotal,
      weeklyResetsAt,
    };
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Increment quota after a successful Oracle call.
 * Called by the LLM invocation pipeline after costs are computed.
 *
 * Cost is expressed in microdollars — caller computes via calculateCostMicro().
 * Free models (costMicro = 0) still track activity via lastQuestionAt.
 */
export const incrementQuota = mutation({
  args: {
    /** Cost in microdollars (from calculateCostMicro). 0 = free model or crisis bypass. */
    costMicro: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Ensure quota settings are seeded (write-capable in mutation context)
    await ctx.runMutation(internal.oracle.seedOracleQuotaSettings.seedMut, {});

    // Read window sizes (may have been updated by admin)
    const [burstWindowRaw, weeklyWindowRaw] = await Promise.all([
      ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q: any) => q.eq("key", "quota_burst_window_ms"))
        .first(),
      ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q: any) => q.eq("key", "quota_weekly_window_ms"))
        .first(),
    ]);

    const burstWindowMs = burstWindowRaw
      ? parseInt(burstWindowRaw.value, 10)
      : 18_000_000;
    const weeklyWindowMs = weeklyWindowRaw
      ? parseInt(weeklyWindowRaw.value, 10)
      : 604_800_000;

    const now = Date.now();
    const costMicro = args.costMicro ?? 0;

    const existing = await ctx.db
      .query("oracle_quota_usage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    if (!existing) {
      // First ever Oracle call for this user
      await ctx.db.insert("oracle_quota_usage", {
        userId,
        lastQuestionAt: now,
        updatedAt: now,
        burstCost: costMicro > 0 ? costMicro : undefined,
        burstWindowStart: costMicro > 0 ? now : undefined,
        weeklyCost: costMicro > 0 ? costMicro : undefined,
        weeklyWindowStart: costMicro > 0 ? now : undefined,
      });
      return;
    }

    // ── Recompute fixed windows ───────────────────────────────────────────

    // Burst: if window expired, reset cost; otherwise accumulate
    const burstCostBefore = existing.burstCost ?? 0;
    const burstWindowStartBefore = existing.burstWindowStart;
    const burstElapsed = burstWindowStartBefore ? now - burstWindowStartBefore : Infinity;
    const burstWindowExpired = burstElapsed > burstWindowMs;
    const newBurstCost = burstWindowExpired ? costMicro : burstCostBefore + costMicro;
    const newBurstWindowStart = burstWindowExpired
      ? (costMicro > 0 ? now : undefined)
      : burstWindowStartBefore;

    // Weekly: same logic
    const weeklyCostBefore = existing.weeklyCost ?? 0;
    const weeklyWindowStartBefore = existing.weeklyWindowStart;
    const weeklyElapsed = weeklyWindowStartBefore ? now - weeklyWindowStartBefore : Infinity;
    const weeklyWindowExpired = weeklyElapsed > weeklyWindowMs;
    const newWeeklyCost = weeklyWindowExpired ? costMicro : weeklyCostBefore + costMicro;
    const newWeeklyWindowStart = weeklyWindowExpired
      ? (costMicro > 0 ? now : undefined)
      : weeklyWindowStartBefore;

    await ctx.db.patch(existing._id, {
      lastQuestionAt: now,
      updatedAt: now,
      burstCost: newBurstCost,
      burstWindowStart: newBurstWindowStart,
      weeklyCost: newWeeklyCost,
      weeklyWindowStart: newWeeklyWindowStart,
    });
  },
});
