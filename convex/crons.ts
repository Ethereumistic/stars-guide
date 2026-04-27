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

// ─── SCHEDULED NOTIFICATIONS ─────────────────────────────────────────────
// Check for campaigns due for delivery every minute.
crons.interval(
    "deliver-scheduled-notifications",
    { seconds: 60 },
    internal.notifications.delivery.processScheduledNotifications,
);

export default crons;
