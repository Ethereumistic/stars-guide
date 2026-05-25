/**
 * Seed Oracle Quota Budget Settings
 *
 * Run once to populate oracle_settings with Cost-Based Quota V2 budget
 * configuration:
 *   - quota_burst_budget_{tier}   per-user burst budgets (microdollars)
 *   - quota_weekly_budget_{tier}  per-user weekly budgets (microdollars)
 *   - quota_burst_window_ms       burst window (5 h)
 *   - quota_weekly_window_ms      weekly window (7 days)
 *   - model_pricing               JSON pricing table (USD per 1M tokens)
 *
 * Idempotent — re-running is safe (upserts).
 *
 * Usage:
 *   npx convex run oracle/seedOracleQuotaSettings:seed
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { DEFAULT_MODEL_PRICING } from "./pricing";

const TIERS = ["free", "popular", "premium", "moderator", "admin"] as const;
type Tier = (typeof TIERS)[number];

// Burst budgets: $0.05 / $0.50 / $2.00 / $100 / $100
const BURST_BUDGETS: Record<Tier, number> = {
  free: 50_000,       // $0.05
  popular: 500_000,   // $0.50
  premium: 2_000_000, // $2.00
  moderator: 100_000_000, // $100
  admin: 100_000_000,     // $100
};

// Weekly budgets: $0.20 / $2.00 / $8.00 / $500 / $500
const WEEKLY_BUDGETS: Record<Tier, number> = {
  free: 200_000,         // $0.20
  popular: 2_000_000,    // $2.00
  premium: 8_000_000,   // $8.00
  moderator: 500_000_000,  // $500
  admin: 500_000_000,      // $500
};

/**
 * Read-only check — returns whether quota settings have been seeded.
 * Used by checkQuota query (queries can't write).
 */
export const ensureQuotaSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sentinel = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "quota_burst_budget_free"))
      .first();
    return { seeded: sentinel !== null };
  },
});

/**
 * Write-seed — actually inserts/updates all quota settings.
 * Must be called as a mutation (from seed mutation or incrementQuota mutation).
 */
export const seedMut = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Fast path: if the first budget key already exists, skip writes
    const sentinel = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "quota_burst_budget_free"))
      .first();
    if (sentinel) return { seeded: false };

    // Seed all settings (upsert so re-running is safe)
    // ── Burst budgets
    for (const tier of TIERS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", `quota_burst_budget_${tier}`))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: String(BURST_BUDGETS[tier]),
          valueType: "number",
          label: `Burst budget — ${tier}`,
          description: `Max spend allowed in one burst window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("oracle_settings", {
          key: `quota_burst_budget_${tier}`,
          value: String(BURST_BUDGETS[tier]),
          valueType: "number",
          label: `Burst budget — ${tier}`,
          description: `Max spend allowed in one burst window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
      }
    }

    // ── Weekly budgets
    for (const tier of TIERS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", `quota_weekly_budget_${tier}`))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: String(WEEKLY_BUDGETS[tier]),
          valueType: "number",
          label: `Weekly budget — ${tier}`,
          description: `Max spend allowed in one rolling 7-day window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("oracle_settings", {
          key: `quota_weekly_budget_${tier}`,
          value: String(WEEKLY_BUDGETS[tier]),
          valueType: "number",
          label: `Weekly budget — ${tier}`,
          description: `Max spend allowed in one rolling 7-day window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
      }
    }

    // ── Window sizes
    const windows: Array<[string, string, string]> = [
      ["quota_burst_window_ms", "18000000", "Burst window (ms)"],
      ["quota_weekly_window_ms", "604800000", "Weekly window (ms)"],
    ];
    for (const [key, value, label] of windows) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value,
          valueType: "number",
          label,
          description: key === "quota_burst_window_ms"
            ? "Duration of the burst budget window: 18,000,000 ms = 5 hours."
            : "Duration of the rolling weekly budget window: 604,800,000 ms = 7 days.",
          group: "quota",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("oracle_settings", {
          key,
          value,
          valueType: "number",
          label,
          description: key === "quota_burst_window_ms"
            ? "Duration of the burst budget window: 18,000,000 ms = 5 hours."
            : "Duration of the rolling weekly budget window: 604,800,000 ms = 7 days.",
          group: "quota",
          updatedAt: now,
        });
      }
    }

    // ── Model pricing table
    const pricingJson = JSON.stringify(DEFAULT_MODEL_PRICING, null, 2);
    const existingPricing = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "model_pricing"))
      .first();
    const now = Date.now();
    if (existingPricing) {
      await ctx.db.patch(existingPricing._id, {
        value: pricingJson,
        valueType: "json",
        label: "Model pricing table",
        description: "USD price per 1,000,000 tokens (prompt + completion) per model. Editable from /admin/ai.",
        group: "quota",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("oracle_settings", {
        key: "model_pricing",
        value: pricingJson,
        valueType: "json",
        label: "Model pricing table",
        description: "USD price per 1,000,000 tokens (prompt + completion) per model. Editable from /admin/ai.",
        group: "quota",
        updatedAt: now,
      });
    }

    return { seeded: true };
  },
});

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding oracle quota budget settings...");

    // ── Burst budgets
    for (const tier of TIERS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", `quota_burst_budget_${tier}`))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: String(BURST_BUDGETS[tier]),
          valueType: "number",
          label: `Burst budget — ${tier}`,
          description: `Max spend allowed in one burst window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
        console.log(`Updated: quota_burst_budget_${tier}`);
      } else {
        await ctx.db.insert("oracle_settings", {
          key: `quota_burst_budget_${tier}`,
          value: String(BURST_BUDGETS[tier]),
          valueType: "number",
          label: `Burst budget — ${tier}`,
          description: `Max spend allowed in one burst window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
        console.log(`Inserted: quota_burst_budget_${tier}`);
      }
    }

    // ── Weekly budgets
    for (const tier of TIERS) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", `quota_weekly_budget_${tier}`))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: String(WEEKLY_BUDGETS[tier]),
          valueType: "number",
          label: `Weekly budget — ${tier}`,
          description: `Max spend allowed in one rolling 7-day window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
        console.log(`Updated: quota_weekly_budget_${tier}`);
      } else {
        await ctx.db.insert("oracle_settings", {
          key: `quota_weekly_budget_${tier}`,
          value: String(WEEKLY_BUDGETS[tier]),
          valueType: "number",
          label: `Weekly budget — ${tier}`,
          description: `Max spend allowed in one rolling 7-day window for ${tier} tier (microdollars).`,
          group: "quota",
          updatedAt: now,
        });
        console.log(`Inserted: quota_weekly_budget_${tier}`);
      }
    }

    // ── Window sizes
    const windows: Array<[string, string, string]> = [
      ["quota_burst_window_ms", "18000000", "Burst window (ms)"],
      ["quota_weekly_window_ms", "604800000", "Weekly window (ms)"],
    ];
    for (const [key, value, label] of windows) {
      const existing = await ctx.db
        .query("oracle_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value,
          valueType: "number",
          label,
          description: key === "quota_burst_window_ms"
            ? "Duration of the burst budget window: 18,000,000 ms = 5 hours."
            : "Duration of the rolling weekly budget window: 604,800,000 ms = 7 days.",
          group: "quota",
          updatedAt: now,
        });
        console.log(`Updated: ${key}`);
      } else {
        await ctx.db.insert("oracle_settings", {
          key,
          value,
          valueType: "number",
          label,
          description: key === "quota_burst_window_ms"
            ? "Duration of the burst budget window: 18,000,000 ms = 5 hours."
            : "Duration of the rolling weekly budget window: 604,800,000 ms = 7 days.",
          group: "quota",
          updatedAt: now,
        });
        console.log(`Inserted: ${key}`);
      }
    }

    // ── Model pricing table
    const pricingJson = JSON.stringify(DEFAULT_MODEL_PRICING, null, 2);
    const existingPricing = await ctx.db
      .query("oracle_settings")
      .withIndex("by_key", (q) => q.eq("key", "model_pricing"))
      .first();
    const now = Date.now();
    if (existingPricing) {
      await ctx.db.patch(existingPricing._id, {
        value: pricingJson,
        valueType: "json",
        label: "Model pricing table",
        description: "USD price per 1,000,000 tokens (prompt + completion) per model. Editable from /admin/ai.",
        group: "quota",
        updatedAt: now,
      });
      console.log("Updated: model_pricing");
    } else {
      await ctx.db.insert("oracle_settings", {
        key: "model_pricing",
        value: pricingJson,
        valueType: "json",
        label: "Model pricing table",
        description: "USD price per 1,000,000 tokens (prompt + completion) per model. Editable from /admin/ai.",
        group: "quota",
        updatedAt: now,
      });
      console.log("Inserted: model_pricing");
    }

    console.log("Done seeding oracle quota budget settings.");
    return { ok: true };
  },
});