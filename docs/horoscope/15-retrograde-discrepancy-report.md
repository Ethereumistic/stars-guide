# Retrograde Discrepancy — RESOLVED

## Original Problem (fixed 2025-07-24)

Two different UIs showed **different** retrograde planets for the same date.
The admin Context Viewer showed Saturn/Uranus/Neptune (wrong), while the
landing page CosmicToday showed Pluto (correct — the only planet actually
retrograde at the time).

## Root Causes (3 bugs)

### Bug 1: Pluto missing from backend
`TRACKED_PLANETS` and `RETROGRADE_CANDIDATES` in `astronomyEngine.ts`
excluded `Astronomy.Body.Pluto`. The one planet that WAS retrograde was
invisible to the entire horoscope pipeline.

**Fix:** Added `Astronomy.Body.Pluto` to both arrays, plus `"Pluto"` to
`PLANET_NAMES` map.

### Bug 2: Heliocentric longitude in backend
`getGeocentricLongitude()` used `Astronomy.EclipticLongitude()` which
returns **heliocentric** longitude. This was off by up to 50° for inner
planets — Mercury showed in Cancer when it was actually in Gemini.

**Fix:** Replaced with `Astronomy.GeoVector()` + `Astronomy.Ecliptic()`
which returns true geocentric ecliptic longitude, matching the frontend's
`src/lib/planets/telemetry.ts` method.

### Bug 3: Approximate retrograde windows
`retrogradeCalc.ts` used `SearchRelativeLongitude()` to find station
dates, then estimated window end dates by adding a fixed duration
(e.g. "Saturn retrograde lasts ~140 days"). This produced stale results
— planets showed as retrograde for days/weeks after they turned direct.

**Fix:** Deleted `retrogradeCalc.ts` entirely. Retrograde window
computation now lives in `astronomyEngine.ts` using the same day-by-day
geocentric scanning approach as the frontend's CosmicToday component
(`findRetrogradeStart`, `findRetrogradeEnd`, `findNextRetrogradeStart`).

## Changes Made

| File | Change |
|------|--------|
| `convex/lib/astronomyEngine.ts` | Rewrote longitude method to geocentric; added Pluto; added `buildRetrogradeContext()` + window scanning functions |
| `convex/lib/astrology/retrogradeCalc.ts` | **DELETED** — replaced by functions in astronomyEngine.ts |
| `convex/horoscopes/computeDailyContext.ts` | Changed import from `retrogradeCalc` to `astronomyEngine`; fixed VoC moon to use geocentric `GeoVector()+Ecliptic()` instead of `EclipticLongitude()`; added Pluto to VoC tracked planets |
| `convex/lib/astrology/contextBuilder.ts` | Added Pluto to `PLANET_THEMES` catalog |

## Verification

After the fix, backend and frontend produce **identical** results for
all 8 retrograde candidates (the full system tracks 10 bodies but only 8
can be retrograde — the Sun and Moon never retrograde):

| Planet | Longitude | Sign | Retrograde |
|--------|-----------|------|------------|
| Mercury | 75.70° | Gemini | no |
| Venus | 96.90° | Cancer | no |
| Mars | 34.42° | Taurus | no |
| Jupiter | 112.75° | Cancer | no |
| Saturn | 11.61° | Aries | no |
| Uranus | 61.65° | Gemini | no |
| Neptune | 3.91° | Aries | no |
| Pluto | 305.43° | Aquarius | **YES** ✓ |

## Migration Note

The `cosmicWeather` and `daily_astrology_context` tables now contain 10
planet positions instead of 9 (Pluto added). The `retrogradeContext`
field is now computed by the geocentric day-scan method, producing
accurate current/upcoming/recentDirect data.

Existing records in the database are **not automatically updated** — they
still contain the old 9-planet data. They will be overwritten on the next
cron run (00:05 UTC for cosmicWeather, 02:00 UTC for context) or when
an admin clicks "Recompute Context".