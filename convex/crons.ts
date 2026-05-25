/**
 * crons.ts — Convex scheduled jobs.
 *
 * Currently runs:
 * - Cosmic Weather computation at 00:05 UTC daily
 * - Scheduled notification delivery every minute
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ─── COSMIC WEATHER ──────────────────────────────────────────────────────
// Compute astronomical data at 00:05 UTC daily (5-minute buffer after
// midnight to avoid UTC boundary edge cases). The wrapper action
// auto-computes today's date and calls computeAndStore.
crons.daily(
    "compute-cosmic-weather",
    { hourUTC: 0, minuteUTC: 5 },
    internal.cosmicWeather.dailyCosmicWeatherJob,
);

// ─── FELT LANGUAGE ───────────────────────────────────────────────────────
// Generate felt language from cosmic weather at 00:10 UTC daily
// (5-minute buffer for the snapshot to be written first).
crons.daily(
    "generate-felt-language",
    { hourUTC: 0, minuteUTC: 10 },
    internal.cosmicWeather.dailyFeltLanguageJob,
);

// ─── SCHEDULED NOTIFICATIONS ─────────────────────────────────────────────
// Check for campaigns due for delivery every minute.
crons.interval(
    "deliver-scheduled-notifications",
    { seconds: 60 },
    internal.notifications.delivery.processScheduledNotifications,
);

// ─── ANALYTICS: DAU AGGREGATION ────────────────────────────────────────────
// Aggregate daily activity at 03:00 UTC — fallback for client-side heartbeat gaps
crons.daily(
    "aggregate-daily-activity",
    { hourUTC: 3, minuteUTC: 0 },
    internal.analytics.aggregateDailyActivity,
);

// ─── ANALYTICS: ANOMALY DETECTION ─────────────────────────────────────────
// Check for traffic spikes/drops after aggregation runs
crons.daily(
    "detect-analytics-anomalies",
    { hourUTC: 4, minuteUTC: 0 },
    internal.analytics.detectAnalyticsAnomalies,
);

// ─── DAILY HOROSCOPE GENERATION ────────────────────────────────────────
// Queue all 12 sign generations at 02:00 UTC daily, staggered 30 s apart.
// The wrapper action calls computeDailyContext first then schedules the jobs.
crons.daily(
    "generate-daily-horoscopes",
    { hourUTC: 2, minuteUTC: 0 },
    internal.horoscopes.queueDailyGenerations.queueDailyGenerations,
);

export default crons;
