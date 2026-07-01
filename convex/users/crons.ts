/**
 * convex/users/crons.ts — User engagement cron jobs.
 *
 * Computes engagement status for all active users daily.
 */
import { internalAction } from "../_generated/server";

const { internal } = require("../_generated/api") as any;

/** Compute engagement status for all active users (daily, 00:15 UTC) */
export const computeEngagementStatus = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.users.admin.getAllActiveUsers);
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;

        let updated = 0;
        for (const user of users) {
            const accountAgeMs = now - user._creationTime;
            const accountAgeDays = Math.floor(accountAgeMs / msPerDay);

            const lastActive = user.lastActiveAt ?? user._creationTime;
            const daysSinceActive = Math.floor((now - lastActive) / msPerDay);

            let newStatus: "new" | "active" | "dormant" | "churned";

            if (accountAgeDays <= 7) {
                newStatus = "new";
            } else if (daysSinceActive <= 14) {
                newStatus = "active";
            } else if (daysSinceActive <= 60) {
                newStatus = "dormant";
            } else {
                newStatus = "churned";
            }

            if (user.engagementStatus !== newStatus) {
                await ctx.runMutation(internal.users.admin.patchEngagementStatus, {
                    userId: user._id,
                    engagementStatus: newStatus,
                });
                updated++;
            }
        }

        console.log(`[computeEngagementStatus] Updated ${updated}/${users.length} users`);
    },
});
