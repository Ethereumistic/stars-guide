# Retrograde Context — Day-by-Day Geocentric Scanning

Source: `convex/lib/astronomyEngine.ts` (functions `buildRetrogradeContext`,
`isRetrograde`, `findRetrogradeStart`, `findRetrogradeEnd`, `findNextRetrogradeStart`)

## Background

Previously, retrograde detection used `retrogradeCalc.ts` which relied on
`SearchRelativeLongitude()` to find station dates, then estimated window
end dates by adding fixed durations. This produced inaccurate results
(see [15-retrograde-discrepancy-report.md](./15-retrograde-discrepancy-report.md)). That file was deleted on
2025-07-24 and all retrograde logic now lives in `astronomyEngine.ts`.

## Retrograde Candidates

8 bodies (Sun and Moon never retrograde):
Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto

## Snapshot Detection

`isRetrograde(body, date)` — the quick check used for the per-planet
`isRetrograde` boolean in the daily snapshot.

Algorithm:
- Compute geocentric longitude now and 1 minute from now
- If longitude decreased (moved backward), planet is retrograde
- Uses the same 1-minute lookforward as `src/lib/planets/telemetry.ts`
- More accurate than the old 24-hour window near station points

## Window Calculation

For the `daily_astrology_context.retrogradeContext`, the system uses
day-by-day geocentric scanning instead of `SearchRelativeLongitude()`:

### findRetrogradeStart(body, fromDate, maxDays=200)
- Scan backward from `fromDate` day-by-day
- First day where `isRetrograde()` returns false → the previous day is the start
- Returns the start date as a Date object

### findRetrogradeEnd(body, fromDate, maxDays=250)
- Scan forward from `fromDate` day-by-day
- First day where `isRetrograde()` returns false → that day is the end
- Returns the end date as a Date object

### findNextRetrogradeStart(body, fromDate, maxDays=730)
- Scan forward from `fromDate` day-by-day
- First day where `isRetrograde()` returns true → retrograde about to begin
- Returns that date as a Date object

These functions find **exact** station dates rather than estimating from
fixed durations. No approximations.

## Rich Per-Planet Detail

`buildRetrogradeContext(today)` returns a `RetrogradeContext` object:

- `current`: string[] — planet names currently retrograde
- `upcoming`: string[] — planets turning retrograde within 120 days
- `recentDirect`: string[] — planets that turned direct within 14 days
- `planets`: RetrogradePlanetDetail[] — rich per-planet data

### RetrogradePlanetDetail

Each candidate gets an entry in the `planets` array:

| Field | Type | Description |
|-------|------|-------------|
| planet | string | Planet name |
| status | "active" \| "upcoming" \| "recently_direct" \| "clear" | Current retrograde status |
| startDate | string | ISO date of window start |
| endDate | string | ISO date of window end |
| totalDays | number | Total days in retrograde window |
| daysElapsed | number | Days since retrograde started (0 for upcoming) |
| daysRemaining | number | Days until retrograde ends or begins |
| progressPercent | number | 0–100 through the window |
| phase | "entering" \| "deepening" \| "peak" \| "exiting" \| "approaching" \| "aftermath" \| "clear" | Named position in cycle |

### Phase Classification

| Progress | Status | Phase | Felt Experience |
|----------|--------|-------|----------------|
| 0–15% | active | entering | The shift is just beginning, things feel "off" |
| 15–40% | active | deepening | The retrograde energy intensifies, themes surface |
| 40–60% | active | peak | Full intensity, the core of the retrograde |
| 60–90% | active | exiting | The energy is waning but still present |
| — | upcoming | approaching | Not yet started, will begin soon |
| — | recently_direct | aftermath | Just turned direct, shadow period lingers |
| — | clear | clear | No retrograde activity nearby |

## Window Filtering

- **Upcoming threshold:** 120 days (planets turning retrograde within 120 days)
- **Recent direct threshold:** 14 days (planets that turned direct in the last 14 days)
- Planets with next retrograde beyond 120 days and no recent direct activity
  get status "clear" but still include their next window dates
- A planet can appear in both `recentDirect` and the `planets` array
  since each bucket has distinct semantic meaning

## How Retrograde Context Is Used

1. **Written to `daily_astrology_context.retrogradeContext`** (3 bucket summary)
   and `daily_astrology_context.retrogradePlanets` (rich detail array)
2. **Injected into prompt Section A** as "RETROGRADE CONTEXT" including
   the "RETROGRADE CYCLE POSITIONS" block with progress/phase for active planets
3. **Energy signature** modified: ≥ 2 retrogrades → "internal" token;
   Mercury retro → "revisiting"; Mars retro → "delayed_action";
   Pluto retro → "deep_transformation"
4. **Admin Context Viewer** shows retrograde badges per bucket and rich planet cards
5. **Planet positions** in both `cosmicWeather` and `daily_astrology_context`
   include `isRetrograde` / `retrograde` booleans
6. **Journal astro context** includes `retrogradePlanets` string array