# Cron Schedule — Timing and Time Zone

All cron jobs run in **UTC**. Convex does not have a configurable time zone for
cron definitions — the `hourUTC` / `minuteUTC` fields are absolute UTC.

## Daily Cron Jobs

Defined in `convex/crons.ts`:

| Job Name | UTC Time | Convex Cron Type | Internal Action | Purpose |
|----------|----------|------------------|-----------------|---------|
| `compute-cosmic-weather` | 00:05 UTC | `daily` | `cosmicWeather.dailyCosmicWeatherJob` | Compute raw astronomical snapshot |
| `generate-felt-language` | 00:10 UTC | `daily` | `cosmicWeather.dailyFeltLanguageJob` | Translate snapshot to felt language (LLM) |
| `generate-daily-horoscopes` | 02:00 UTC | `daily` | `horoscopes.queueDailyGenerations.queueDailyGenerations` | Queue 12 sign generation jobs |
| `deliver-scheduled-notifications` | Every 60s | `interval` | `notifications.delivery.processScheduledNotifications` | Push notification delivery (unrelated) |

## Why These Times

- **00:05 UTC** — 5-minute buffer after midnight UTC avoids edge cases at the
  date boundary. The astronomical engine uses noon UTC for positional
  stability, but the date string must resolve to the correct day.

- **00:10 UTC** — 5-minute buffer after cosmic weather is written. Felt
  language generation reads the `cosmicWeather` record, so it must run
  after the snapshot is stored.

- **02:00 UTC** — 2-hour gap gives the cosmic weather + felt language
  pipeline plenty of time to complete before horoscope generation begins.

## Date Resolution

The cron wrappers resolve "today" dynamically at runtime because Convex crons
cannot pass dynamic arguments. Each wrapper does:

```typescript
const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD" in UTC
```

This means all date strings in the pipeline are **UTC-derived**. The
astronomical engine uses `${date}T12:00:00Z` (noon UTC) for position
computation to minimize sign-boundary edge cases at midnight.

## 12-Sign Stagger

The `queueDailyGenerations` action does **not** call `generateForSign` directly.
Instead it schedules 12 independent Convex functions via `ctx.scheduler.runAt`,
each offset by a stagger interval:

```
Aries   @ baseTime + 0  × stagger
Taurus  @ baseTime + 1  × stagger
Gemini  @ baseTime + 2  × stagger
...
Pisces  @ baseTime + 11 × stagger
```

**Default stagger:** 30 seconds. Override via `oracle_settings` key
`horoscope_stagger_seconds`.

Total wall time: 11 × 30s = 5.5 minutes from the first sign to the last,
plus each individual LLM generation time (~3–8s per sign).

### Stagger Config Query

```typescript
// convex/horoscopes/queueDailyGenerations.ts
export const getHoroscopeCronSettings = internalQuery({
    args: {},
    handler: async (ctx) => {
        const staggerRow = await ctx.db
            .query("oracle_settings")
            .withIndex("by_key", (q) => q.eq("key", "horoscope_stagger_seconds"))
            .first();
        return { staggerSeconds: staggerRow ? Number(staggerRow.value) : 30 };
    },
});
```

## Failure Isolation

Each sign generation is an independent Convex action invocation. If one sign
fails (LLM error, malformed JSON, validation failure), it does **not** block
the other 11 signs. Failed signs get `status: "failed"` and can be retried
individually from the admin panel.