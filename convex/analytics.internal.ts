/**
 * analytics.internal.ts — Internal mutations and queries called by cron jobs.
 */
import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

function getDateStr(offsetDays = 0): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

// ─── CRON: DAILY ACTIVITY AGGREGATION ────────────────────────────────────

/**
 * Upsert user_activity rows for all users who had feature events yesterday.
 * Runs as a daily cron at 03:00 UTC as a fallback aggregation mechanism.
 * Primary activity tracking happens via client-side heartbeats.
 */
export const aggregateDailyActivity = internalMutation({
    args: {},
    handler: async (ctx) => {
        const yesterday = getDateStr(-1);

        const events = await ctx.db
            .query("feature_events")
            .withIndex("by_date", (q) => q.eq("eventDate", yesterday))
            .collect();

        // Group events by userId
        const userEvents: Record<string, typeof events> = {};
        for (const evt of events) {
            if (!evt.userId) continue;
            const key = evt.userId.toString();
            if (!userEvents[key]) userEvents[key] = [];
            userEvents[key].push(evt);
        }

        for (const [uidStr, evts] of Object.entries(userEvents)) {
            // Group by session
            const sessions = new Set<string>();
            let pageViews = 0;
            const featuresUsed = new Set<string>();
            const sessionTimestamps: Record<string, number[]> = {};

            for (const evt of evts) {
                sessions.add(evt.sessionId);
                if (evt.eventName === "page_view") pageViews++;
                if (!evt.eventName.startsWith("session_")) {
                    featuresUsed.add(evt.eventName);
                }
                if (!sessionTimestamps[evt.sessionId]) {
                    sessionTimestamps[evt.sessionId] = [];
                }
                sessionTimestamps[evt.sessionId].push(evt.timestamp);
            }

            // Compute total session duration across all sessions
            let totalDurationMs = 0;
            for (const [, timestamps] of Object.entries(sessionTimestamps)) {
                timestamps.sort((a, b) => a - b);
                if (timestamps.length >= 2) {
                    totalDurationMs += timestamps[timestamps.length - 1] - timestamps[0];
                }
            }

            const existing = await ctx.db
                .query("user_activity")
                .withIndex("by_user_date", (q) =>
                    q.eq("userId", uidStr as any).eq("date", yesterday)
                )
                .first();

            const row = {
                userId: uidStr as any,
                date: yesterday,
                sessionsCount: sessions.size,
                totalSessionDurationMs: totalDurationMs,
                pageViews,
                featuresUsed: Array.from(featuresUsed),
            };

            if (existing) {
                await ctx.db.patch(existing._id, row);
            } else {
                await ctx.db.insert("user_activity", row);
            }
        }
    },
});

// ─── CRON: ANOMALY DETECTION ──────────────────────────────────────────────

/**
 * Compare yesterday's signups to the 7-day trailing average.
 * Send admin notifications if a spike (>3x) or drop (<30%) is detected.
 */
export const detectAnalyticsAnomalies = internalMutation({
    args: {},
    handler: async (ctx) => {
        const today = getDateStr(0); // "YYYY-MM-DD"
        const dates = Array.from({ length: 7 }, (_, i) => getDateStr(-i - 1)); // -1 to -7

        // Get all signup events for yesterday and the prior 7 days
        const allEvents = await ctx.db
            .query("feature_events")
            .withIndex("by_event_date", (q) => q.eq("eventName", "signup_completed"))
            .collect();

        const eventsByDate: Record<string, number> = {};
        for (const evt of allEvents) {
            if (!eventsByDate[evt.eventDate]) eventsByDate[evt.eventDate] = 0;
            eventsByDate[evt.eventDate]++;
        }

        const yesterday = getDateStr(-1);
        const todayCount = eventsByDate[today] ?? 0;
        const yesterdayCount = eventsByDate[yesterday] ?? 0;

        // Compute 7-day average (excluding today and yesterday)
        const priorCounts = dates
            .map((d) => eventsByDate[d] ?? 0)
            .filter((c) => c > 0);
        const priorAvg = priorCounts.length > 0
            ? priorCounts.reduce((a, b) => a + b, 0) / priorCounts.length
            : 0;

        const spike = yesterdayCount > priorAvg * 3 && yesterdayCount > 10;
        const drop = priorAvg > 5 && yesterdayCount < priorAvg * 0.3;

        if (spike || drop) {
            const allAdmins = await ctx.db
                .query("users")
                .withIndex("by_role", (q) => q.eq("role", "admin"))
                .collect();

            const pct = priorAvg > 0
                ? ((yesterdayCount / priorAvg - 1) * 100).toFixed(0)
                : "n/a";

            for (const admin of allAdmins) {
                await ctx.db.insert("notifications", {
                    userId: admin._id,
                    type: "admin_broadcast",
                    fromUserId: undefined,
                    referralId: undefined,
                    friendshipId: undefined,
                    scheduledNotificationId: undefined,
                    message: spike
                        ? `[SPIKE] ${yesterdayCount} signups on ${yesterday} — ${pct}% above 7-day avg (${priorAvg.toFixed(1)}). Check for a viral moment!`
                        : `[DROP] ${yesterdayCount} signups on ${yesterday} — ${Math.abs(Number(pct))}% below 7-day avg (${priorAvg.toFixed(1)}). Investigate channel performance.`,
                    read: false,
                    createdAt: Date.now(),
                });
            }
        }
    },
});

// ─── INTERNAL QUERY: dashboardSnapshot ────────────────────────────────────

/**
 * Internal version of the dashboardSnapshot query — used by the HTTP action
 * to expose analytics data to external tools (Google Sheets, etc.).
 */
export const dashboardSnapshotQuery = internalQuery({
    args: {
        startDate: v.string(),
        endDate: v.string(),
    },
    handler: async (ctx, args) => {
        // Signups by channel
        const signupEvents = await ctx.db
            .query("feature_events")
            .withIndex("by_event_date", (q) =>
                q
                    .eq("eventName", "signup_completed")
                    .gte("eventDate", args.startDate)
                    .lte("eventDate", args.endDate)
            )
            .collect();

        const byChannel: Record<string, number> = { direct: 0 };
        const byDate: Record<string, number> = {};
        for (const evt of signupEvents) {
            byDate[evt.eventDate] = (byDate[evt.eventDate] ?? 0) + 1;
            if (evt.utmEventId) {
                const utm = await ctx.db.get(evt.utmEventId);
                const src = utm?.utmSource ?? "direct";
                byChannel[src] = (byChannel[src] ?? 0) + 1;
            } else {
                byChannel["direct"]++;
            }
        }

        // WAU
        const activityRows = await ctx.db
            .query("user_activity")
            .withIndex("by_date", (q) =>
                q.gte("date", args.startDate).lte("date", args.endDate)
            )
            .collect();
        const uniqueUsers = new Set(activityRows.map((r) => r.userId.toString()));

        // Top features
        const featureEvents = await ctx.db
            .query("feature_events")
            .withIndex("by_date", (q) =>
                q.gte("eventDate", args.startDate).lte("eventDate", args.endDate)
            )
            .collect();
        const featureCounts: Record<string, number> = {};
        for (const evt of featureEvents) {
            featureCounts[evt.eventName] = (featureCounts[evt.eventName] ?? 0) + 1;
        }
        const topFeatures = Object.entries(featureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Referrals
        const allReferrals = await ctx.db.query("referrals").collect();
        const completed = allReferrals.filter((r) => r.status === "completed").length;
        const pending = allReferrals.filter((r) => r.status === "pending").length;

        // Tier distribution
        const allUsers = await ctx.db.query("users").collect();
        const byTier = { free: 0, popular: 0, premium: 0 };
        for (const u of allUsers) {
            if (u.tier in byTier) {
                byTier[u.tier as keyof typeof byTier]++;
            }
        }

        return {
            signups: { total: signupEvents.length, byChannel, byDate },
            wau: uniqueUsers.size,
            topFeatures,
            referrals: { total: allReferrals.length, completed, pending },
            byTier,
            generatedAt: Date.now(),
        };
    },
});
