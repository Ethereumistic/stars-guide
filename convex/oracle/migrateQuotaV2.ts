/**
 * One-shot migration: Backfill oracle_quota_usage V2 cost fields
 * and remove V1 session-count fields.
 *
 * Run once:
 *   npx convex run oracle/migrateQuotaV2:migrate
 */

import { mutation } from "../_generated/server";

export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsage = await ctx.db.query("oracle_quota_usage").collect();
    let migrated = 0;

    for (const doc of allUsage) {
      const d = doc as any;
      const patch: Record<string, any> = {};

      // Add V2 fields if missing
      if (d.burstCost === undefined) {
        patch.burstCost = 0;
      }
      if (d.burstWindowStart === undefined) {
        patch.burstWindowStart = undefined; // will be set on first paid call
      }
      if (d.weeklyCost === undefined) {
        patch.weeklyCost = 0;
      }
      if (d.weeklyWindowStart === undefined) {
        patch.weeklyWindowStart = undefined; // will be set on first paid call
      }

      // Remove V1 fields (setting to undefined removes them from Convex docs)
      if (d.dailyCount !== undefined) {
        patch.dailyCount = undefined;
      }
      if (d.dailyWindowStart !== undefined) {
        patch.dailyWindowStart = undefined;
      }
      if (d.lifetimeCount !== undefined) {
        patch.lifetimeCount = undefined;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(doc._id, patch);
        migrated++;
      }
    }

    return { total: allUsage.length, migrated };
  },
});