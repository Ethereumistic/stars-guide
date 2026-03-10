# Chiron Implementation Plan

## Goal
Add Chiron to `users.birthData.chart.planets` using a precomputed ephemeris table.
No `swisseph` dependency in the deployed app — ever.

---

## The Strategy

Chiron moves slowly (~50 year full orbit). We generate a table of its longitude for
every month from 1900–2050 using `swisseph` in a **one-time local script**, commit
only the resulting TypeScript constant, then delete everything swisseph-related.
At runtime, the app interpolates within that table — zero native dependencies.

---

## Step 1 — Generate the Chiron Table (Local Only)

Do this on your local machine, NOT in the deployed codebase.

### 1a. Install swisseph temporarily (do not commit)

```bash
pnpm add swisseph
```

Add `swisseph` and `ephe/` to `.gitignore` immediately so they can never be accidentally committed:

```
# .gitignore — add these lines now
swisseph
node_modules/swisseph
ephe/
```

### 1b. Download the ephemeris data files

Download the Swiss Ephemeris asteroid files from:
https://www.astro.com/ftp/swisseph/ephe/

You need these files in a local `./ephe/` folder (not committed):
- `seas_18.se1` — covers asteroids including Chiron for 1800–2400

### 1c. Create the generation script

Create `scripts/generateChironEphemeris.ts` (do NOT commit this file either — add it to `.gitignore`):

```typescript
import swisseph from "swisseph";
import { writeFileSync } from "fs";

swisseph.swe_set_ephe_path("./ephe");

const r2 = (n: number) => Math.round(n * 100) / 100;

const entries: { year: number; month: number; lon: number; retrograde: boolean }[] = [];

for (let year = 1900; year <= 2050; year++) {
  for (let month = 1; month <= 12; month++) {
    const jd = swisseph.swe_julday(year, month, 1, 0.0, swisseph.SE_GREG_CAL);

    // SE_CHIRON = 15
    const result = swisseph.swe_calc_ut(
      jd,
      swisseph.SE_CHIRON,
      swisseph.SEFLG_SWIEPH
    );

    if (result.error) {
      throw new Error(`swisseph error at ${year}-${month}: ${result.error}`);
    }

    // result.longitudeSpeed < 0 means retrograde
    entries.push({
      year,
      month,
      lon: r2(result.longitude),
      retrograde: result.longitudeSpeed < 0,
    });
  }
}

const output = `// AUTO-GENERATED — do not edit manually
// Chiron ecliptic longitudes, 1900–2050, sampled on the 1st of each month
// Generated offline using Swiss Ephemeris (not a runtime dependency)
export const CHIRON_TABLE: {
  year: number;
  month: number;
  lon: number;
  retrograde: boolean;
}[] = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync("src/data/chironEphemeris.ts", output);
console.log(`Generated ${entries.length} entries → src/data/chironEphemeris.ts`);
```

### 1d. Run the script

```bash
npx ts-node scripts/generateChironEphemeris.ts
```

This writes `src/data/chironEphemeris.ts` — **this file IS committed to the repo**.

### 1e. Clean up everything swisseph-related

```bash
pnpm remove swisseph
rm -rf ephe/
rm scripts/generateChironEphemeris.ts
```

Confirm `swisseph` no longer appears in `package.json` or `node_modules`.
The only artifact that remains is `src/data/chironEphemeris.ts`.

---

## Step 2 — Runtime Chiron Lookup Utility

Create `src/lib/chiron.ts`:

```typescript
import { CHIRON_TABLE } from "@/data/chironEphemeris";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function getChironForDate(dateStr: string): {
  longitude: number;
  retrograde: boolean;
} {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day   = parseInt(dayStr, 10);

  // Find the two surrounding monthly samples
  const before = CHIRON_TABLE.find(
    (e) => e.year === year && e.month === month
  );

  const afterMonth = month === 12 ? 1 : month + 1;
  const afterYear  = month === 12 ? year + 1 : year;
  const after = CHIRON_TABLE.find(
    (e) => e.year === afterYear && e.month === afterMonth
  );

  if (!before || !after) {
    throw new Error(
      `Chiron table does not cover date: ${dateStr}. Table range is 1900–2050.`
    );
  }

  // Linear interpolation based on day of month
  const daysInMonth = new Date(year, month, 0).getDate();
  const t = (day - 1) / daysInMonth; // 0.0 on the 1st, ~1.0 on the last day

  // Handle 0°/360° wrap-around
  let delta = after.lon - before.lon;
  if (delta >  180) delta -= 360;
  if (delta < -180) delta += 360;

  const longitude = r2(((before.lon + t * delta) + 360) % 360);

  // Retrograde: use the "before" sample's flag
  // (Chiron changes retrograde status slowly — monthly resolution is fine)
  return { longitude, retrograde: before.retrograde };
}
```

---

## Step 3 — Map Longitude to Sign and House

These helpers should already exist in the codebase for other planets.
If not, here they are — add to `src/lib/astroUtils.ts` or equivalent:

```typescript
const SIGNS = [
  "aries", "taurus", "gemini", "cancer",
  "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

export function longitudeToSign(lon: number): string {
  return SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
}

// Whole sign house: 
// ascendantSignIndex = Math.floor(ascendantLon / 30)
// houseId = ((signIndex - ascendantSignIndex + 12) % 12) + 1
export function longitudeToHouseWholeSign(
  lon: number,
  ascendantLon: number
): number {
  const signIndex = Math.floor(((lon % 360) + 360) % 360 / 30);
  const ascSignIndex = Math.floor(((ascendantLon % 360) + 360) % 360 / 30);
  return ((signIndex - ascSignIndex + 12) % 12) + 1;
}
```

---

## Step 4 — Add Chiron to the Onboarding Birth Chart Calculation

Find the existing onboarding calculation function (wherever `chart.planets` is being
built and `users.birthData` is saved). Add Chiron to that array:

```typescript
import { getChironForDate } from "@/lib/chiron";
import { longitudeToSign, longitudeToHouseWholeSign } from "@/lib/astroUtils";

// Inside the chart calculation — after ascendant and planets are calculated:

const chiron = getChironForDate(date); // date = "YYYY-MM-DD"

const chironPlanet = {
  id: "chiron",
  signId: longitudeToSign(chiron.longitude),
  houseId: longitudeToHouseWholeSign(chiron.longitude, ascendantLongitude),
  longitude: chiron.longitude,
  retrograde: chiron.retrograde,
  dignity: null,
};

// Add to the planets array alongside sun, moon, etc.
planets.push(chironPlanet);
```

---

## Step 5 — Update the Convex Schema

In `convex/schema.ts`, confirm `birthData.chart.planets` items allow `dignity` to be
`null` (it already should be, since `north_node` and `south_node` also use `null`):

```typescript
planets: v.array(v.object({
  id: v.string(),
  signId: v.string(),
  houseId: v.number(),
  longitude: v.number(),
  retrograde: v.boolean(),
  dignity: v.union(v.string(), v.null()),  // null is valid for chiron, nodes, pof
})),
```

No other schema changes needed.

---

## Step 6 — Backfill Existing Users

Existing `birthData` records won't have Chiron. Write a Convex migration:

```typescript
// convex/migrations/addChironToExistingUsers.ts
import { internalMutation } from "../_generated/server";
import { getChironForDate } from "../../src/lib/chiron";
import { longitudeToSign, longitudeToHouseWholeSign } from "../../src/lib/astroUtils";

export const addChironToExistingUsers = internalMutation(async ({ db }) => {
  const users = await db.query("users").collect();

  for (const user of users) {
    const bd = user.birthData;
    if (!bd || !bd.chart || !bd.date) continue;

    // Skip if chiron already exists
    const alreadyHas = bd.chart.planets.some((p: any) => p.id === "chiron");
    if (alreadyHas) continue;

    const chiron = getChironForDate(bd.date);
    const ascLon = bd.chart.ascendant.longitude;

    const chironPlanet = {
      id: "chiron",
      signId: longitudeToSign(chiron.longitude),
      houseId: longitudeToHouseWholeSign(chiron.longitude, ascLon),
      longitude: chiron.longitude,
      retrograde: chiron.retrograde,
      dignity: null,
    };

    await db.patch(user._id, {
      birthData: {
        ...bd,
        chart: {
          ...bd.chart,
          planets: [...bd.chart.planets, chironPlanet],
        },
      },
    });
  }
});
```

Run this once after deploying the updated onboarding code.

---

## Final Result in `birthData.chart.planets`

```json
{
  "id": "chiron",
  "signId": "sagittarius",
  "houseId": 5,
  "longitude": 240.12,
  "retrograde": false,
  "dignity": null
}
```

---

## Summary Checklist

- [ ] `swisseph` installed locally (not committed)
- [ ] `ephe/` and `swisseph` added to `.gitignore`
- [ ] `seas_18.se1` downloaded to local `./ephe/`
- [ ] `scripts/generateChironEphemeris.ts` created and run
- [ ] `src/data/chironEphemeris.ts` generated and committed
- [ ] `scripts/generateChironEphemeris.ts` deleted
- [ ] `swisseph` uninstalled (`pnpm remove swisseph`)
- [ ] `./ephe/` deleted
- [ ] `src/lib/chiron.ts` created with `getChironForDate()`
- [ ] `longitudeToSign` and `longitudeToHouseWholeSign` helpers confirmed or created
- [ ] Chiron added to onboarding calculation and pushed to `chart.planets`
- [ ] Convex schema confirmed to allow `dignity: null`
- [ ] Backfill migration written and run for existing users
