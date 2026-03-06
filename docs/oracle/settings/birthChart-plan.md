# Birth Chart — `users.birthData` Enrichment Plan

## Overview

Rather than creating a new Convex table, all enriched birth chart data will be stored directly inside the existing `users.birthData` field. The current structure is expanded in-place with timezone, UTC timestamp, full chart data (aspects, house cusps, dignities), and the new bodies (North/South Node, Chiron, Part of Fortune). The total serialized size of the final JSON is approximately ~1,800 characters / ~1,800 tokens — well within Convex document limits and cheap to pass to AI prompts.

A separate `birthCharts` table will only be introduced later as a future feature for Popular/Premium tier users who can save additional charts (partner charts, relocation charts, etc.).

---

## 1. Storage: Keep Everything in `users.birthData`

No schema migration, no new table. The `birthData` field on the `users` document is simply updated to hold the richer structure described in this plan. The Convex schema for `birthData` should be updated from a loose object to the typed shape defined in Section 7.

---

## 2. Timezone Resolution

### The Problem

We store `date: "2000-06-05"` and `time: "10:20"` but no timezone. Without a timezone, the UTC moment is completely ambiguous — getting this wrong shifts every planetary position, sometimes across a full house.

### ⚠️ IMPORTANT: Check Existing Code First

The project already has `tz-lookup` installed (`"tz-lookup": "^6.1.25"`). There is likely already a timezone lookup happening somewhere in the onboarding flow, **but it is not being saved to `birthData`**. Before writing any new code, the AI implementing this must:

1. Search the codebase for `tz-lookup` or `tzlookup` usage
2. Find exactly where the timezone is being calculated
3. Confirm it is not being persisted anywhere
4. Add it to the `birthData` payload at the point of saving

### Resolution: Use `tz-lookup` with Coordinates

`tz-lookup` resolves an IANA timezone string from lat/lon — the same coordinates already collected during onboarding. This is strictly more reliable than using city/country name strings, which are ambiguous and don't account for DST.

```typescript
import tzlookup from "tz-lookup";

const timezone = tzlookup(lat, lon);
// e.g. "Europe/Sofia"
```

### Converting Local Time to UTC with `date-fns`

No need to add `luxon`. The project already has `date-fns` (`"date-fns": "^4.1.0"`). Install the companion timezone package if not already present:

```bash
pnpm add date-fns-tz
```

```typescript
import { fromZonedTime } from "date-fns-tz";

// Combine date and time into a local datetime string
const localDateTimeString = `${date}T${time}:00`; // "2000-06-05T10:20:00"

// Convert to UTC using the resolved IANA timezone
const utcDate = fromZonedTime(localDateTimeString, timezone);
const utcTimestamp = utcDate.toISOString();
// → "2000-06-05T07:20:00.000Z"
```

This UTC timestamp is what must be passed into `astronomy-engine` for all calculations. It also gets stored in `birthData` so it never needs to be re-derived.

### Why Not City/Country Strings?

- City names from onboarding input may not match any timezone database exactly
- Country-level offsets are wrong for large countries with multiple zones (Russia, USA, Brazil, etc.)
- Only an IANA timezone string (e.g. `"Europe/Sofia"`) correctly handles historical DST transitions
- Coordinates are already collected and are fully unambiguous

---

## 3. House System

Based on the current data (all house cusps exactly 30° apart), the system in use is **Whole Sign**. In Whole Sign houses, each house equals exactly one zodiac sign, and the sign containing the Ascendant degree becomes House 1. This requires no changes to the current calculation logic — it just needs to be declared explicitly in the stored data as `"houseSystem": "whole_sign"`.

---

## 4. Number Precision — Critical Rule

**All computed floating-point values (longitudes, angles, orbs) must be rounded to 2 decimal places before storage.** Never store raw JavaScript floats.

```typescript
// ❌ Never store raw floats
{ angle: 54.92888133100348, orb: 3.7173954581945168 }

// ✅ Always round to 2 decimal places
{ angle: 54.93, orb: 3.72 }
```

Use a small rounding helper and apply it to every longitude, angle, and orb before building the save object:

```typescript
const r2 = (n: number): number => Math.round(n * 100) / 100;
```

---

## 5. New Bodies to Calculate

### 5.1 North Node & South Node

The **True North Node** (Rahu) is the point where the Moon's orbit crosses the ecliptic going northward. The South Node (Ketu) is always exactly opposite at `+180°`.

`astronomy-engine` does not expose the Lunar Node by a single named method in all versions. The implementer must verify the correct API call for the installed version:

```typescript
import Astronomy from "astronomy-engine";

// Check the installed version's API — try one of:
// Astronomy.Moon(date).ascending_node_longitude
// Astronomy.EclipticGeoMoon(date)
// Print Object.keys(Astronomy) in a test script to find the right method

const northNodeLon = r2(/* resolved longitude */);
const southNodeLon = r2((northNodeLon + 180) % 360);
```

> **Note for implementer:** Run a quick test script to enumerate the `astronomy-engine` API surface and confirm which method returns the ascending node. The True Node is preferred over the Mean Node for modern chart readings. Both nodes are almost always retrograde — set `retrograde: true` for both by default.

### 5.2 Chiron — Precomputed Lookup Table

**`swisseph` cannot be used in the deployed application** for a commercial subscription product (stars.guide) without purchasing a commercial license from Astrodienst. Doing so without a license risks legal liability.

#### The Offline Generation Workaround (Legal ✅)

Running `swisseph` **locally in a one-time script** to precompute a data table is permissible. The rationale:

- The library and its ephemeris files are never committed to the repo or deployed
- The computed output — a table of Chiron's ecliptic longitudes — is factual astronomical data; celestial body positions are not copyrightable
- Only the resulting TypeScript constant (a plain array of numbers) ships in the product

**This approach is clean as long as:**
1. `swisseph` is only installed locally for the script run, never committed or deployed
2. The `.se1` ephemeris data files are never included in the repo or deployment
3. Only the derived coordinate table is committed to the codebase

#### Generating the Table (run once, locally)

```typescript
// scripts/generateChironTable.ts — run locally, then delete
import swisseph from "swisseph";

swisseph.swe_set_ephe_path("./ephe"); // local .se1 files, NOT committed

const results: { year: number; month: number; lon: number }[] = [];

for (let year = 1920; year <= 2050; year++) {
  for (let month = 1; month <= 12; month++) {
    const jd = swisseph.swe_julday(year, month, 1, 0, swisseph.SE_GREG_CAL);
    const r = swisseph.swe_calc_ut(jd, swisseph.SE_CHIRON, swisseph.SEFLG_SWIEPH);
    results.push({ year, month, lon: Math.round(r.longitude * 100) / 100 });
  }
}

// Paste this output into /src/data/chironEphemeris.ts as a const
console.log("export const CHIRON_TABLE = " + JSON.stringify(results) + ";");
```

After running: delete the script, uninstall `swisseph`, delete the `./ephe` folder.

#### Using the Table at Runtime

```typescript
import { CHIRON_TABLE } from "@/data/chironEphemeris";

function getChironLongitude(dateStr: string): number {
  const [year, month, dayStr] = dateStr.split("-").map(Number);

  const before = CHIRON_TABLE.find(e => e.year === year && e.month === month)!;
  const afterMonth = month === 12 ? 1 : month + 1;
  const afterYear  = month === 12 ? year + 1 : year;
  const after = CHIRON_TABLE.find(e => e.year === afterYear && e.month === afterMonth)!;

  const daysInMonth = new Date(year, month, 0).getDate();
  const t = (dayStr - 1) / daysInMonth;

  // Handle wrap-around at 0°/360°
  let delta = after.lon - before.lon;
  if (delta > 180)  delta -= 360;
  if (delta < -180) delta += 360;

  return r2((before.lon + t * delta + 360) % 360);
}
```

Chiron's full orbit is ~50 years, so monthly interpolation yields accuracy within ~0.3° — more than sufficient for sign and house placement in natal chart readings.

### 5.3 Part of Fortune

A purely derived point — no external library needed. The formula differs for day vs. night charts:

```typescript
// Day chart: Sun is in houses 7–12 (above the horizon)
const pof = r2((ascLon + moonLon - sunLon + 360) % 360);

// Night chart: Sun is in houses 1–6 (below the horizon)
const pof = r2((ascLon + sunLon - moonLon + 360) % 360);
```

Determine day vs. night by checking the Sun's `houseId` in the already-calculated planets array: 7–12 = day chart, 1–6 = night chart.

---

## 6. Planet Dignities

Each of the 10 classical/modern planets receives an essential dignity based on sign placement. Nodes, Chiron, and Part of Fortune receive `null` for dignity.

| Dignity | Meaning |
|---|---|
| `domicile` | Planet in its home sign — strongest |
| `exaltation` | Planet in its exaltation sign — very strong |
| `detriment` | Opposite of domicile — weakened |
| `fall` | Opposite of exaltation — weakened |
| `peregrine` | No essential dignity — neutral |

### Dignity Reference Table

| Planet | Domicile | Exaltation | Detriment | Fall |
|---|---|---|---|---|
| Sun | Leo | Aries | Aquarius | Libra |
| Moon | Cancer | Taurus | Capricorn | Scorpio |
| Mercury | Gemini, Virgo | Virgo | Sagittarius, Pisces | Pisces |
| Venus | Taurus, Libra | Pisces | Aries, Scorpio | Virgo |
| Mars | Aries, Scorpio | Capricorn | Taurus, Libra | Cancer |
| Jupiter | Sagittarius, Pisces | Cancer | Gemini, Virgo | Capricorn |
| Saturn | Capricorn, Aquarius | Libra | Cancer, Leo | Aries |
| Uranus | Aquarius | Scorpio | Leo | Taurus |
| Neptune | Pisces | Cancer | Virgo | Capricorn |
| Pluto | Scorpio | Aries | Taurus | Libra |

### Implementation

```typescript
type DignityMap = { domicile: string[]; exaltation: string[]; detriment: string[]; fall: string[] };

const DIGNITIES: Record<string, DignityMap> = {
  sun:     { domicile: ["leo"],                    exaltation: ["aries"],     detriment: ["aquarius"],              fall: ["libra"]     },
  moon:    { domicile: ["cancer"],                 exaltation: ["taurus"],    detriment: ["capricorn"],             fall: ["scorpio"]   },
  mercury: { domicile: ["gemini","virgo"],          exaltation: ["virgo"],     detriment: ["sagittarius","pisces"],  fall: ["pisces"]    },
  venus:   { domicile: ["taurus","libra"],          exaltation: ["pisces"],    detriment: ["aries","scorpio"],       fall: ["virgo"]     },
  mars:    { domicile: ["aries","scorpio"],         exaltation: ["capricorn"], detriment: ["taurus","libra"],        fall: ["cancer"]    },
  jupiter: { domicile: ["sagittarius","pisces"],   exaltation: ["cancer"],    detriment: ["gemini","virgo"],        fall: ["capricorn"] },
  saturn:  { domicile: ["capricorn","aquarius"],   exaltation: ["libra"],     detriment: ["cancer","leo"],          fall: ["aries"]     },
  uranus:  { domicile: ["aquarius"],               exaltation: ["scorpio"],   detriment: ["leo"],                   fall: ["taurus"]    },
  neptune: { domicile: ["pisces"],                 exaltation: ["cancer"],    detriment: ["virgo"],                 fall: ["capricorn"] },
  pluto:   { domicile: ["scorpio"],                exaltation: ["aries"],     detriment: ["taurus"],                fall: ["libra"]     },
};

function getDignity(planetId: string, signId: string): string | null {
  const d = DIGNITIES[planetId];
  if (!d) return null; // nodes, chiron, part_of_fortune
  if (d.domicile.includes(signId))   return "domicile";
  if (d.exaltation.includes(signId)) return "exaltation";
  if (d.detriment.includes(signId))  return "detriment";
  if (d.fall.includes(signId))       return "fall";
  return "peregrine";
}
```

---

## 7. Updated `users` Schema (`convex/schema.ts`)

Only the shape of the existing `birthData` field changes. No new tables are added.

```typescript
users: defineTable({
  // ... all existing fields unchanged ...

  birthData: v.optional(v.object({
    date: v.string(),
    time: v.string(),
    timezone: v.string(),
    utcTimestamp: v.string(),
    houseSystem: v.string(),

    location: v.object({
      city: v.string(),
      country: v.string(),
      lat: v.number(),
      lon: v.number(),
    }),

    chart: v.object({
      ascendant: v.object({
        longitude: v.number(),
        signId: v.string(),
      }),
      planets: v.array(v.object({
        id: v.string(),
        signId: v.string(),
        houseId: v.number(),
        longitude: v.number(),
        retrograde: v.boolean(),
        dignity: v.union(v.string(), v.null()),
      })),
      houses: v.array(v.object({
        id: v.number(),
        longitude: v.number(),
        signId: v.string(),
      })),
      aspects: v.array(v.object({
        planet1: v.string(),
        planet2: v.string(),
        type: v.string(),
        angle: v.number(),
        orb: v.number(),
      })),
    }),
  })),
})
```

---

## 8. Final `users.birthData` JSON (as stored in Convex)

```json
{
  "date": "2000-06-05",
  "time": "10:20",
  "timezone": "Europe/Sofia",
  "utcTimestamp": "2000-06-05T07:20:00.000Z",
  "houseSystem": "whole_sign",

  "location": {
    "city": "Gabrovo",
    "country": "Bulgaria",
    "lat": 42.9638895,
    "lon": 25.2119538
  },

  "chart": {
    "ascendant": {
      "longitude": 133.17,
      "signId": "leo"
    },
    "planets": [
      { "id": "sun",             "signId": "gemini",      "houseId": 11, "longitude": 74.93,  "retrograde": false, "dignity": "peregrine"  },
      { "id": "moon",            "signId": "cancer",      "houseId": 12, "longitude": 114.21, "retrograde": false, "dignity": "domicile"   },
      { "id": "mercury",         "signId": "cancer",      "houseId": 12, "longitude": 98.39,  "retrograde": false, "dignity": "peregrine"  },
      { "id": "venus",           "signId": "gemini",      "houseId": 11, "longitude": 73.27,  "retrograde": false, "dignity": "peregrine"  },
      { "id": "mars",            "signId": "gemini",      "houseId": 11, "longitude": 82.43,  "retrograde": false, "dignity": "peregrine"  },
      { "id": "jupiter",         "signId": "taurus",      "houseId": 10, "longitude": 54.49,  "retrograde": false, "dignity": "peregrine"  },
      { "id": "saturn",          "signId": "taurus",      "houseId": 10, "longitude": 53.68,  "retrograde": false, "dignity": "detriment"  },
      { "id": "uranus",          "signId": "aquarius",    "houseId": 7,  "longitude": 320.77, "retrograde": true,  "dignity": "domicile"   },
      { "id": "neptune",         "signId": "aquarius",    "houseId": 7,  "longitude": 306.37, "retrograde": true,  "dignity": "peregrine"  },
      { "id": "pluto",           "signId": "sagittarius", "houseId": 5,  "longitude": 251.44, "retrograde": true,  "dignity": "peregrine"  },
      { "id": "north_node",      "signId": "leo",         "houseId": 1,  "longitude": 128.54, "retrograde": true,  "dignity": null         },
      { "id": "south_node",      "signId": "aquarius",    "houseId": 7,  "longitude": 308.54, "retrograde": true,  "dignity": null         },
      { "id": "chiron",          "signId": "sagittarius", "houseId": 5,  "longitude": 240.12, "retrograde": false, "dignity": null         },
      { "id": "part_of_fortune", "signId": "cancer",      "houseId": 12, "longitude": 112.88, "retrograde": false, "dignity": null         }
    ],
    "houses": [
      { "id": 1,  "longitude": 120, "signId": "leo"         },
      { "id": 2,  "longitude": 150, "signId": "virgo"       },
      { "id": 3,  "longitude": 180, "signId": "libra"       },
      { "id": 4,  "longitude": 210, "signId": "scorpio"     },
      { "id": 5,  "longitude": 240, "signId": "sagittarius" },
      { "id": 6,  "longitude": 270, "signId": "capricorn"   },
      { "id": 7,  "longitude": 300, "signId": "aquarius"    },
      { "id": 8,  "longitude": 330, "signId": "pisces"      },
      { "id": 9,  "longitude": 0,   "signId": "aries"       },
      { "id": 10, "longitude": 30,  "signId": "taurus"      },
      { "id": 11, "longitude": 60,  "signId": "gemini"      },
      { "id": 12, "longitude": 90,  "signId": "cancer"      }
    ],
    "aspects": [
      { "planet1": "sun",     "planet2": "venus",   "type": "conjunction", "angle": 1.67,   "orb": 1.67 },
      { "planet1": "sun",     "planet2": "mars",    "type": "conjunction", "angle": 7.50,   "orb": 7.50 },
      { "planet1": "sun",     "planet2": "uranus",  "type": "trine",       "angle": 114.16, "orb": 5.84 },
      { "planet1": "sun",     "planet2": "pluto",   "type": "opposition",  "angle": 176.51, "orb": 3.49 },
      { "planet1": "moon",    "planet2": "jupiter", "type": "sextile",     "angle": 59.72,  "orb": 0.28 },
      { "planet1": "moon",    "planet2": "saturn",  "type": "sextile",     "angle": 60.54,  "orb": 0.54 },
      { "planet1": "venus",   "planet2": "uranus",  "type": "trine",       "angle": 112.49, "orb": 7.51 },
      { "planet1": "venus",   "planet2": "neptune", "type": "trine",       "angle": 126.89, "orb": 6.89 },
      { "planet1": "venus",   "planet2": "pluto",   "type": "opposition",  "angle": 178.18, "orb": 1.82 },
      { "planet1": "mars",    "planet2": "uranus",  "type": "trine",       "angle": 121.66, "orb": 1.66 },
      { "planet1": "jupiter", "planet2": "saturn",  "type": "conjunction", "angle": 0.81,   "orb": 0.81 },
      { "planet1": "jupiter", "planet2": "uranus",  "type": "square",      "angle": 93.72,  "orb": 3.72 },
      { "planet1": "saturn",  "planet2": "uranus",  "type": "square",      "angle": 92.90,  "orb": 2.90 },
      { "planet1": "neptune", "planet2": "pluto",   "type": "sextile",     "angle": 54.93,  "orb": 5.07 }
    ]
  }
}
```

---

## 9. Backfill Plan — Existing Users

Existing users have `birthData` in the old shape (flat `placements` array, no aspects, no timezone). These need to be reprocessed:

1. Write a Convex migration script querying all users where `birthData != null`
2. For each, re-run the full enriched pipeline using the stored `date`, `time`, `lat`, `lon`
3. Patch `users.birthData` in-place with the new enriched structure
4. The old `placements` array is replaced entirely by `chart.planets` — confirm mapping is correct before running on production

---

## 10. Calculation Pipeline Summary (Onboarding → Storage)

```
Onboarding input
  │  date, time (local), city, country, lat, lon
  ▼
⚠️  FIRST: search codebase for existing tz-lookup usage.
    Find where timezone is calculated. Confirm it is not
    being saved. Add it to the birthData save payload.
  │
tzlookup(lat, lon)
  │  → timezone: "Europe/Sofia"
  ▼
date-fns-tz: fromZonedTime(`${date}T${time}:00`, timezone)
  │  → utcTimestamp: "2000-06-05T07:20:00.000Z"
  ▼
astronomy-engine(utcTimestamp)
  │  → sun, moon, mercury, venus, mars, jupiter,
  │    saturn, uranus, neptune, pluto: longitude + retrograde
  │  → ascendant longitude
  │  → house cusps (whole sign: 12 × 30° from ASC sign start)
  │  → aspects + orbs between all planet pairs
  ▼
astronomy-engine (verify correct method for ascending node)
  │  → north_node longitude
  │  → south_node = r2((northNodeLon + 180) % 360)
  ▼
Precomputed Chiron table (offline swisseph → committed TS const)
  │  → chiron longitude via monthly linear interpolation
  ▼
Derived calculations
  │  → part_of_fortune (check Sun houseId for day/night formula)
  │  → signId for all bodies: Math.floor(lon / 30) → sign index
  │  → houseId (whole sign: sign index relative to ASC sign = house)
  │  → dignity for 10 planets via DIGNITIES lookup
  │  → null dignity for north_node, south_node, chiron, part_of_fortune
  ▼
r2() — round ALL floats to 2 decimal places
  ▼
patch users.birthData with the final enriched object
```

---

## 11. Repository-Specific Implementation Addendum (March 6, 2026)

This section supersedes any generic statements above where they conflict with the current Stars Guide codebase.

### Confirmed Current State

- `convex/schema.ts` currently validates `users.birthData` as only `{ date, time, location, placements }`.
- `convex/users.ts` currently accepts only that reduced shape in `updateBirthData`.
- Onboarding writes birth data from `src/app/onboarding/_components/steps/calculation-step.tsx`.
- Signup serializes the same reduced payload in `src/app/onboarding/_components/steps/password-step.tsx`.
- `tz-lookup` is already used in `src/lib/birth-chart/core.ts`, but the timezone string is not persisted.
- `src/lib/birth-chart/full-chart.ts` already computes ascendant, whole-sign houses, planets, retrograde flags, and aspects.
- Oracle birth-chart features currently read from `src/lib/oracle/featureContext.ts`, which only formats the flat `placements` array.
- UI types in `src/components/settings/chart-section.tsx` and `src/store/use-onboarding-store.ts` still assume the legacy `placements` shape.

### What This Means

This is not just a chart-calculation improvement. It is a phased migration across:

1. Chart calculation and serialization
2. Convex schema validation
3. Onboarding and signup write paths
4. Oracle feature-context consumption
5. Existing-user backfill
6. UI compatibility cleanup

### Canonical Rollout Order

#### Pass 1: Canonical Birth Data Shape

- Add `timezone` and `utcTimestamp` to the persisted payload.
- Expand the stored payload to include `houseSystem` and a `chart` object.
- Keep `users.birthData` as the single canonical source of truth.
- Preserve a compatibility `placements` projection during rollout so current readers do not break immediately.

#### Pass 2: Calculation Layer

- Replace the current offset-only UTC derivation in `src/lib/birth-chart/core.ts` with helpers that return both the IANA timezone and the UTC timestamp.
- Expand `src/lib/birth-chart/full-chart.ts` to produce the enriched chart payload needed for storage.
- Apply 2-decimal rounding at the chart builder layer so all persisted floats are normalized before they reach Convex.

#### Pass 3: Write Paths

- Update `convex/schema.ts` to validate the enriched `birthData` shape.
- Update `convex/users.ts:updateBirthData` to accept the enriched payload.
- Update `src/app/onboarding/_components/steps/calculation-step.tsx` to persist the enriched payload.
- Update `src/app/onboarding/_components/steps/password-step.tsx` to serialize the same enriched payload during signup.

#### Pass 4: Oracle Consumption

- Update `src/lib/oracle/featureContext.ts` to consume `birthData.chart` instead of relying only on the flat `placements` array.
- Remove the current fallback copy that says enrichment is unavailable in this build.
- Expose aspects, dignities, houses, nodes, Chiron, and Part of Fortune to Oracle as canonical stored data.

#### Pass 5: Backfill and Cleanup

- Backfill all existing users where `birthData != null` by recomputing the enriched payload from stored date/time/location.
- Reuse the same pure chart builder used by onboarding; do not duplicate chart logic inside the migration.
- Keep compatibility fields until all readers are migrated.
- After rollout, update `docs/oracle/ORACLE_EXPLAINED.md` so it matches the shipped data flow exactly.

### File-Level Implementation Sequence

1. `src/lib/birth-chart/core.ts`
   Add helpers that resolve and return `timezone` plus `utcTimestamp`.
2. `src/lib/birth-chart/full-chart.ts`
   Expand `ChartData` into the persisted enriched chart shape.
3. `convex/schema.ts`
   Expand the `birthData` validator.
4. `convex/users.ts`
   Accept and persist the enriched payload.
5. `src/app/onboarding/_components/steps/calculation-step.tsx`
   Save the enriched payload for authenticated onboarding.
6. `src/app/onboarding/_components/steps/password-step.tsx`
   Save the same payload during signup.
7. `src/store/use-onboarding-store.ts`
   Update onboarding cache typing to match the new chart payload or an intentional UI subset.
8. `src/lib/oracle/featureContext.ts`
   Switch Oracle birth-chart features to `birthData.chart`.
9. `src/components/settings/chart-section.tsx`
   Keep the settings UI compatible with the evolved `birthData` shape.
10. Backfill path
   Recompute and patch all existing users in place.

### Important Compatibility Note

The current persisted location key is `location.long`, not `location.lon`. Do not silently rename it in the first rollout unless all current readers and writers are updated together.
