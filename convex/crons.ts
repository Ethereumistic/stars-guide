/**
 * crons.ts — Convex scheduled jobs.
 *
 * Currently runs:
 * - Cosmic Weather computation at 00:05 UTC daily
 * - Scheduled notification delivery every minute
 */
import { cronJobs } from "convex/server";

const { internal } = require("./_generated/api") as any;

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
// NOTE: Felt language generation from 00:10 UTC is REMOVED as of v2.1.
// The felt language is now generated on-demand inside computeDailyContext
// when cosmic weather is missing, and is consumed directly from the
// cosmicWeather record by generateForSign. The dedicated cron was burning
// tokens daily with no consumer — deleting it stops wasted LLM calls.
// (Previously: generate-felt-language at 00:10 UTC)

// ─── DAILY ASTROLOGY CONTEXT PRE-COMPUTE ─────────────────────────────
// Pre-compute daily_astrology_context at 01:30 UTC so the 02:00
// horoscope generation window does not cascade on context failures.
crons.daily(
    "precompute-daily-context",
    { hourUTC: 1, minuteUTC: 30 },
    internal.horoscopes.computeDailyContext.computeDailyContextJob,
);

// ─── BIRTH CHART REPORT GENERATION ───────────────────────────────────────
// Process the durable report queue; enqueue also schedules an immediate pass.
crons.interval(
    "process-birth-chart-report-jobs",
    { minutes: 5 },
    internal.birthChartReport.worker.processNextJobs,
    { limit: 1 },
);

// Make abandoned durable Oracle turns terminal without automatically invoking
// another model. Explicit user Retry/Resume remains the only recovery trigger.
crons.interval(
    "recover-stale-oracle-turns",
    { minutes: 5 },
    internal.oracle.turns.recoverStaleTurns,
    {},
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
// The wrapper action now ASSUMES daily_astrology_context already exists
// (pre-computed at 01:30). It will still compute on-demand if missing.
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

// Compute engagement status at 00:15 UTC daily (after midnight, before horoscope precompute)
crons.daily(
    "compute-engagement-status",
    { hourUTC: 0, minuteUTC: 15 },
    internal.users.crons.computeEngagementStatus,
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
