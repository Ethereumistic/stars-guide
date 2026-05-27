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
    internal.analyticsInternal.aggregateDailyActivity,
);

// ─── ANALYTICS: ANOMALY DETECTION ─────────────────────────────────────────
// Check for traffic spikes/drops after aggregation runs
crons.daily(
    "detect-analytics-anomalies",
    { hourUTC: 4, minuteUTC: 0 },
    internal.analyticsInternal.detectAnalyticsAnomalies,
);

// ─── DAILY HOROSCOPE GENERATION ────────────────────────────────────────
// Queue all 12 sign generations at 02:00 UTC daily, staggered 30 s apart.
// The wrapper action calls computeDailyContext first then schedules the jobs.
crons.daily(
    "generate-daily-horoscopes",
    { hourUTC: 2, minuteUTC: 0 },
    internal.horoscopes.queueDailyGenerations.queueDailyGenerations,
);

// ─── EMAIL MARKETING ────────────────────────────────────────────────────
// Refresh user segments at 00:30 UTC (after cosmic weather + horoscopes)
crons.daily(
    "refresh-email-segments",
    { hourUTC: 0, minuteUTC: 30 },
    internal.email.crons.refreshEmailSegments,
);

// Send daily horoscope emails at 06:00 UTC
crons.daily(
    "send-daily-horoscope-emails",
    { hourUTC: 6, minuteUTC: 0 },
    internal.email.crons.sendDailyHoroscopeEmails,
);

// Send welcome emails at 07:00 UTC
crons.daily(
    "send-welcome-emails",
    { hourUTC: 7, minuteUTC: 0 },
    internal.email.crons.sendWelcomeEmails,
);

// Send weekly cosmic digest Saturdays at 09:00 UTC
crons.weekly(
    "send-weekly-cosmic-emails",
    { dayOfWeek: "saturday", hourUTC: 9, minuteUTC: 0 },
    internal.email.crons.sendWeeklyCosmicEmails,
);

// Send re-engagement emails at 10:00 UTC
crons.daily(
    "send-reengagement-emails",
    { hourUTC: 10, minuteUTC: 0 },
    internal.email.crons.sendReengagementEmails,
);

export default crons;
