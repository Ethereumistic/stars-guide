# Retrograde Context — Window Calculation

Source: `convex/lib/astrology/retrogradeCalc.ts`

## Retrograde Detection Strategy

The astronomy engine uses two complementary retrograde detection approaches:

### 1. Snapshot Detection (astronomyEngine.ts)

For the daily snapshot, retrograde is detected by comparing geocentric
longitude today vs tomorrow (diff < 0 = retrograde). This is fast and
sufficient for the snapshot's `isRetrograde` boolean per planet.

### 2. Window Calculation (retrogradeCalc.ts)

For the `daily_astrology_context.retrogradeContext`, the system uses
astronomy-engine's `SearchRelativeLongitude()` to find actual retrograde
station points. This provides structured window data (start/end dates).

## Retrograde Candidates

7 bodies (Sun and Moon never retrograde):
Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune

## Station Search Algorithm

Retrograde stations occur at specific relative longitude angles:

| Type | Planets | Station Angle | Explanation |
|------|---------|---------------|-------------|
| Inferior | Mercury, Venus | 0° (relative) | Retrograde at inferior conjunction |
| Superior | Mars–Neptune | 180° (relative) | Retrograde at opposition |

### Finding Next Station (forward search)

`findNextStation(body, after, targetRelativeLon)`:
- Uses `Astronomy.SearchRelativeLongitude(body, targetLon, after)`
- Returns the next date when the planet's relative longitude hits the target
- `targetRelativeLon` = 0° for inferior, 180° for superior

### Finding Previous Station (backward search)

`findPreviousStation(body, before, targetRelativeLon, stepMs)`:
- Steps backward from `before` in 30-day increments
- At each step, calls `SearchRelativeLongitude` with that cursor date
- If the found date ≤ `before`, it's the previous station
- Caps at 20 attempts (600 days lookback)

## Retrograde Window Duration

Each planet has an approximate retrograde window length:

| Planet | Duration |
|--------|----------|
| Mercury | ~24 days |
| Venus | ~22 days |
| Mars | ~72 days |
| Jupiter | ~121 days |
| Saturn | ~140 days |
| Uranus | ~151 days |
| Neptune | ~158 days |

The end of a retrograde window is estimated as `start + duration`. This is
an approximation — the actual direct station date varies each cycle.

## Window Filtering

`getRetrogradeWindows(today)` only returns windows that overlap with the
range [today − 14 days, today + 30 days]. This keeps the data relevant and
avoids returning windows from decades in the past or future.

## Context Output

`buildRetrogradeContext(today)` classifies windows into 3 buckets:

| Bucket | Condition | Example |
|--------|-----------|---------|
| `current` | `today` is within window [start, end] | Mercury retrograde Jun 2–24, today is Jun 10 |
| `upcoming` | `window.starts` is within 30 days of today | Saturn turns retrograde in 12 days |
| `recentDirect` | `window.ends` is within 14 days of today | Mercury turned direct 3 days ago |

A planet can appear in multiple buckets at boundary edges (e.g., just
turned direct and also upcoming). Deduplication is **not** applied since
each bucket has distinct semantic meaning.

## How Retrograde Context Is Used

1. **Written to `daily_astrology_context.retrogradeContext`** — persisted
2. **Injected into prompt Section A** as "RETROGRADE CONTEXT" — the LLM sees:
   - "Currently retrograde: Mercury, Saturn"
   - "Turning retrograde soon: Neptune"
   - "Recently turned direct: Venus"
3. **Energy signature** is modified: ≥ 2 retrogrades → `"internal"` token;
   Mercury retro → `"revisiting"`; Mars retro → `"delayed_action"`
4. **Admin Context Viewer** shows retrograde badges per bucket
5. **Planet positions** in both `cosmicWeather` and `daily_astrology_context`
   include `isRetrograde` / `retrograde` booleans (from snapshot detection)
6. **Journal astro context** includes `retrogradePlanets` array