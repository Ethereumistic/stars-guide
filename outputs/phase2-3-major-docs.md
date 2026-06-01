# Phase 2.3 — Major Doc Rewrites: Findings

## Files Modified

### 1. `docs/horoscope/06-retrograde-context.md` — COMPLETE REWRITE

**Before:** Documented `convex/lib/astrology/retrogradeCalc.ts` (deleted 2025-07-24). Referenced `SearchRelativeLongitude()`, estimated window durations, 7 retrograde candidates, 24-hour detection window, 30-day upcoming threshold.

**After:** Documents `convex/lib/astronomyEngine.ts` functions (`buildRetrogradeContext`, `isRetrograde`, `findRetrogradeStart`, `findRetrogradeEnd`, `findNextRetrogradeStart`). Day-by-day geocentric scanning, 8 retrograde candidates (Pluto added), 1-minute lookforward detection, 120-day upcoming threshold, rich per-planet detail with `RetrogradePlanetDetail` type and phase classification.

### 2. `docs/horoscope/03-astronomy-engine.md` — TARGETED EDITS

Six changes applied:

| # | Change | Old | New |
|---|--------|-----|-----|
| 1 | Body count | "9 classical + modern bodies" | "10 classical + modern bodies" |
| 2 | Tracked Bodies table | Mercury–Neptune row: `EclipticLongitude(body, date)` / "Heliocentric ≈ geocentric for sign" | Mercury–Pluto row: `GeoVector(body, date) + Ecliptic()` / "True geocentric ecliptic longitude" |
| 3 | Important note | `EclipticLongitude()` is heliocentric, "close-enough approximation" | All planets now use `GeoVector() + Ecliptic()` for true geocentric; previous `EclipticLongitude()` off by up to 50°; Pluto now included |
| 4 | Retrograde detection | "today vs tomorrow", 24-hour window | "now vs 1 minute from now", 1-minute lookforward, better station-point resolution |
| 5 | After Output Type | (nothing) | Note: `planetPositions` has 10 entries; `isRetrograde` applies to 8 candidates |
| 6 | New section | (nothing) | "Additional Exports" section: `buildRetrogradeContext`, `findRetrogradeStart`, `findRetrogradeEnd`, `findNextRetrogradeStart`, `RetrogradeContext`, `RetrogradePlanetDetail` |

Also corrected: "all 9 tracked bodies" → "all 10 tracked bodies" in aspects algorithm step.

## Verification Results

```
$ grep -n '9 classical' docs/horoscope/03-astronomy-engine.md
(zero matches — PASS)

$ grep -n 'EclipticLongitude' docs/horoscope/03-astronomy-engine.md
20:> longitude. The previous implementation used `EclipticLongitude()` which returns
```

The single `EclipticLongitude` hit is in the "previous implementation" context — not mentioned as a current method. This satisfies the requirement that the old method only appears as 'previous/old'.

## Source Verification

Confirmed in `convex/lib/astronomyEngine.ts`:
- `buildRetrogradeContext(today: Date): RetrogradeContext` — exported ✓
- `isRetrograde(body, date): boolean` — present ✓
- `findRetrogradeStart(body, fromDate, maxDays=200)` — present ✓
- `findRetrogradeEnd(body, fromDate, maxDays=250)` — present ✓
- `findNextRetrogradeStart(body, fromDate, maxDays=730)` — present ✓
- `RetrogradeContext` type — exported ✓
- `RetrogradePlanetDetail` type — exported ✓
- `TRACKED_PLANETS` includes Pluto (10 bodies) ✓
- `RETROGRADE_CANDIDATES` includes Pluto (8 candidates) ✓
- 1-minute lookforward for `isRetrograde` ✓
- `getGeocentricLongitude` uses `GeoVector() + Ecliptic()` for planets ✓