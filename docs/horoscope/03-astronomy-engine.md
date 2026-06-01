# Astronomy Engine — Raw Position & Aspect Computation

Source: `convex/lib/astronomyEngine.ts`

This is a **pure computation layer** with zero Convex dependencies. It takes a
UTC date string and returns a structured snapshot. It can be unit tested in
isolation.

## Tracked Bodies

10 classical + modern bodies:

| Body | Method Used | Notes |
|------|-------------|-------|
| Sun | `SunPosition(date).elon` | Geocentric ecliptic longitude |
| Moon | `EclipticGeoMoon(date).lon` | Geocentric ecliptic longitude |
| Mercury–Pluto | `GeoVector(body, date) + Ecliptic()` | True geocentric ecliptic longitude |

> **Important:** All planets now use `GeoVector() + Ecliptic()` for true geocentric
> longitude. The previous implementation used `EclipticLongitude()` which returns
> heliocentric longitude — off by up to 50° for inner planets. Sun and Moon use
> their dedicated geocentric APIs. Pluto is now included.

## Longitude → Zodiac Sign

```typescript
function longitudeToSign(lon: number): { sign: string; degreeInSign: number }
```

1. Normalize longitude: `((lon % 360) + 360) % 360`
2. Sign index: `Math.floor(normalized / 30)` → maps to `ZODIAC_SIGNS[index]`
3. Degree in sign: `normalized % 30` (rounded to 2 decimal places)

Zodiac signs are in canonical order starting at 0° Aries:
Aries (0°), Taurus (30°), Gemini (60°), ... Pisces (330°).

## Computation Timestamp

All positions use **noon UTC** (`${date}T12:00:00Z`) for positional stability.
Midnight positions can land on sign boundaries and cause edge-case errors;
noon is safely in the middle of the day.

## Moon Phase Calculation

```typescript
function getMoonPhaseName(date: Date): { name: string; illuminationPercent: number }
```

Uses `Astronomy.MoonPhase(date)` which returns elongation 0–360°:
- 0° = New Moon
- 90° = First Quarter
- 180° = Full Moon
- 270° = Last Quarter

**Illumination** is derived from elongation:
```
illumPct = ((1 - cos(elongation × π / 180)) / 2) × 100
```

**Phase name** is determined by elongation ranges (22.5° bands):

| Range | Phase Name |
|-------|------------|
| 0°–22.5° | New Moon |
| 22.5°–67.5° | Waxing Crescent |
| 67.5°–112.5° | First Quarter |
| 112.5°–157.5° | Waxing Gibbous |
| 157.5°–202.5° | Full Moon |
| 202.5°–247.5° | Waning Gibbous |
| 247.5°–292.5° | Last Quarter |
| 292.5°–337.5° | Waning Crescent |
| 337.5°+ | New Moon (wraps) |

## Retrograde Detection

```typescript
function isRetrograde(body: Astronomy.Body, date: Date): boolean
```

Sun and Moon are excluded (never retrograde).

Algorithm: Compare geocentric longitude now vs 1 minute from now.
Uses a 1-minute lookforward window for better station-point resolution.
The old 24-hour window could miss brief stationary periods at the exact
retrograde/direct station point.

- Compute `lon` and `lon + 1 minute` via `getGeocentricLongitude()`
- Handle 360°→0° wrap: if diff > 180°, subtract 360°; if diff < -180°, add 360°
- If diff < 0, planet moved backward → retrograde

## Active Aspects

```typescript
const ORB_THRESHOLD = 3; // degrees
```

Aspect types detected:

| Aspect | Angle | Orb |
|--------|-------|-----|
| Conjunction | 0° | ≤ 3° |
| Sextile | 60° | ≤ 3° |
| Square | 90° | ≤ 3° |
| Trine | 120° | ≤ 3° |
| Opposition | 180° | ≤ 3° |

Algorithm:
1. Compute longitude for all 10 tracked bodies
2. For every pair (i, j) where j > i:
   - Calculate angular difference: `|lon_i - lon_j|`
   - Normalize: if diff > 180°, use `360 - diff`
   - For each aspect angle, check if `|difference - aspectAngle| ≤ 3°`
3. If within orb → add to `activeAspects` array

This gives a **snapshot of exact aspects at noon UTC**. It does not track
aspects that are applying or separating — only those within orb at the
computation timestamp.

## Moon Phase Narrative Frames

The engine also exports `getMoonPhaseFrame(phaseName)` and
`getMoonPhaseCategory(phaseName)` which are used by the felt language
generator and prompt builder to set emotional tone.

| Category | Phase Names | Emotional Frame |
|----------|-------------|-----------------|
| `new_moon` | New Moon | Quiet beginnings, seeding |
| `waxing` | Waxing Crescent, First Quarter, Waxing Gibbous | Building, accumulating |
| `full_moon` | Full Moon | Peak intensity, surfacing |
| `waning` | Waning Gibbous, Last Quarter, Waning Crescent | Release, rest, restoration |

## Output Type

```typescript
type CosmicWeatherSnapshot = {
    planetPositions: { planet: string; sign: string; degreeInSign: number; isRetrograde: boolean }[];
    moonPhase: { name: string; illuminationPercent: number };
    activeAspects: { planet1: string; planet2: string; aspect: string; orbDegrees: number }[];
};
```

Since the Pluto fix, `planetPositions` contains 10 entries. The `isRetrograde`
field applies to 8 retrograde candidates (Mercury–Pluto, excluding Sun and Moon).

## Additional Exports

The following retrograde-related functions and types are also exported from
`astronomyEngine.ts` (replacing the deleted `retrogradeCalc.ts`):

### Functions

| Export | Signature | Purpose |
|--------|-----------|--------|
| `buildRetrogradeContext` | `(today: Date) → RetrogradeContext` | Build full retrograde context with per-planet detail |
| `findRetrogradeStart` | `(body, fromDate, maxDays=200) → Date \| null` | Scan backward to find retrograde window start |
| `findRetrogradeEnd` | `(body, fromDate, maxDays=250) → Date \| null` | Scan forward to find retrograde window end |
| `findNextRetrogradeStart` | `(body, fromDate, maxDays=730) → Date \| null` | Scan forward to find next retrograde start |

### Types

| Export | Description |
|--------|------------|
| `RetrogradeContext` | 3-bucket summary (`current`, `upcoming`, `recentDirect`) + rich `planets` array |
| `RetrogradePlanetDetail` | Per-planet retrograde data: status, window dates, progress, phase |

See [06-retrograde-context.md](./06-retrograde-context.md) for full documentation
of the retrograde scanning system.