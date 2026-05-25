# Journal Integration — Astrological Context for Entries

Source: `convex/journal/astroContext.ts`

Journal entries receive an automatic astrological context snapshot at
creation time. This is a lighter-weight context than the daily horoscope
pipeline — it reads from `cosmicWeather` but does not use the enriched
`daily_astrology_context`.

## Build Function

`buildAstroContext(ctx, userId, entryDate)` is called during journal entry
creation.

## Output Structure

```typescript
{
  moonPhase: string;                    // e.g. "Waxing Gibbous"
  moonSign?: string;                    // e.g. "Libra"
  sunSign?: string;                      // e.g. "Cancer"
  retrogradePlanets?: string[];          // e.g. ["Mercury", "Saturn"]
  activeTransits?: Array<{               // Only if user has natal chart
    planet: string;                      // e.g. "Mars"
    sign: string;                        // e.g. "Libra"
    aspect?: string;                     // e.g. "square"
    house?: number;                      // e.g. 4
  }>;
}
```

Returns `null` if no `cosmicWeather` exists for the entry date.

## Computation Steps

### 1. Fetch Cosmic Weather

Queries `cosmicWeather.getForDate({ date: entryDate })`. If not yet computed
(e.g., future entries before the 00:05 UTC cron), returns null.

### 2. Extract Moon Phase

```typescript
result.moonPhase = cosmicWeather.moonPhase.name;
```

### 3. Extract Moon & Sun Signs

Searches `planetPositions` for Moon and Sun entries:

```typescript
const moonPos = cosmicWeather.planetPositions.find(p => p.planet === "Moon");
const sunPos  = cosmicWeather.planetPositions.find(p => p.planet === "Sun");
```

### 4. Extract Retrograde Planets

```typescript
const retrogrades = cosmicWeather.planetPositions
    .filter(p => p.isRetrograde)
    .map(p => p.planet);
```

### 5. Compute Active Transits (Optional)

Only computed if the user has `birthData.chart` in their user record. Uses
**whole-sign aspect** comparison between transiting planets and natal planets.

`signAspectType(signA, signB)` calculates the sign-to-sign zodiac distance:

| Distance (mod 12) | Aspect |
|--------------------|--------|
| 0 | conjunction (same sign) |
| 2 or 10 | sextile |
| 3 or 9 | square |
| 4 or 8 | trine |
| 6 | opposition |

Filtered to only high-priority aspects (conjunction, opposition, square) and
capped at 10 transits to keep the context compact.

Skips Sun and Moon as transiting planets — they move too fast for transit
significance to a natal chart.

## Key Differences from Horoscope Context

| Aspect | Horoscope Pipeline | Journal Astro Context |
|--------|---------------------|----------------------|
| Data source | `daily_astrology_context` (enriched) | `cosmicWeather` (raw) |
| Retrograde info | Structured (current/upcoming/recentDirect) | Simple string array |
| Energy signature | Yes (rule-based token string) | No |
| VoC moon / ingress | Yes (detailed windows) | No |
| Aspect influence | Categorized (challenging/harmonious) | Sign-level only |
| Natal chart integration | No | Yes (transit-to-natal aspects) |
| User-specific | No (all signs get same context) | Yes (natal chart varies per user) |