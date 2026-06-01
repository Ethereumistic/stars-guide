# Phase 4A — Doc Edits Batch A: Findings

## Summary

Successfully applied all specified edits to 5 documentation files. Below is a per-file accounting of every change made.

---

## FILE 1: `docs/horoscope/01-pipeline-overview.md`

### Change 1 — Deleted `retrogradeCalc.ts` row from Key Files table
- **Removed:** `| convex/lib/astrology/retrogradeCalc.ts | Retrograde window detection |`
- **Reason:** Source file was deleted; doc row is stale.

### Change 2 — Added `ratings.ts` row to Key Files table
- **Added:** `| convex/horoscopes/ratings.ts | User thumbs-up/down feedback on horoscopes |`
- **Placed:** After the `helpers.ts` row, at the end of the table.

### Change 3 — Inserted Stage 1b box in pipeline diagram
- **Added:** Full ASCII-art box for "Stage 1b — Felt Language (optional emotional layer)" between the Stage 1 and Stage 2 boxes.
- Box specifies source (`convex/cosmicWeather.ts`, `generateFeltLanguage`), reads/writes details, and notes it's stored but not yet injected into prompts.

### Change 4 — No renumbering needed
- Stage 1b is a sub-stage; existing Stage 2, 3, 4 numbering is unchanged.

---

## FILE 2: `docs/horoscope/02-cron-schedule.md`

### Change 1 — Added 6 daily cron jobs to the Daily Cron Jobs table
| Job Name | UTC Time | Type | Internal Action | Purpose |
|----------|----------|------|-----------------|---------|
| `aggregate-daily-activity` | 03:00 UTC | daily | `analyticsInternal.aggregateDailyActivity` | DAU/MAU aggregation |
| `detect-analytics-anomalies` | 04:00 UTC | daily | `analyticsInternal.detectAnalyticsAnomalies` | Traffic spike/drop detection |
| `refresh-email-segments` | 00:30 UTC | daily | `email.crons.refreshEmailSegments` | Refresh email audience segments |
| `send-daily-horoscope-emails` | 06:00 UTC | daily | `email.crons.sendDailyHoroscopeEmails` | Daily horoscope email push |
| `send-welcome-emails` | 07:00 UTC | daily | `email.crons.sendWelcomeEmails` | Welcome series emails |
| `send-reengagement-emails` | 10:00 UTC | daily | `email.crons.sendReengagementEmails` | Re-engagement emails |

### Change 2 — Added Weekly Cron Jobs sub-section
- New `## Weekly Cron Jobs` section after the Failure Isolation section.
- Single entry: `send-weekly-cosmic-emails` — Saturday 09:00 UTC, weekly, `email.crons.sendWeeklyCosmicEmails`, Weekly cosmic digest email.

---

## FILE 3: `docs/horoscope/04-daily-context-enrichment.md`

### Change 1 — Step 4 planet range updated
- **Before:** `any tracked planet (Mercury–Neptune, excluding Sun)`
- **After:** `any tracked planet (Mercury–Pluto, excluding Sun)`
- **Reason:** Pluto is now tracked in the VoC algorithm.

### Change 2 — Step 4 note rewritten
- **Before:** "The Sun is excluded because `EclipticLongitude()` throws for it, and Sun-Moon aspects (New Moon/Full Moon) are not considered for VoC detection."
- **After:** "The Sun is excluded because Sun-Moon aspects (New Moon/Full Moon conjunction/opposition) are not considered for VoC detection in traditional astrology. The geocentric method can now compute Sun longitude (`SunPosition(date).elon`), so `EclipticLongitude()` throwing is no longer the reason. Pluto is included with the other planets."

### Change 3 — Step 3 return type expanded
- **Added bullet:** `planets: RetrogradePlanetDetail[]` — rich per-planet data with progress/phase/window info
- **Reason:** `buildRetrogradeContext` now returns detailed per-planet retrograde data.

---

## FILE 4: `docs/horoscope/05-energy-signature.md`

### Change 1 — Added Pluto to PLANET_THEMES
- **Added:** `Pluto: ["transformation", "power", "rebirth"],` after Neptune's entry.

### Change 2 — Axis 1 tie-breaking rule updated
- **Before:** "Ties go to 'earth' (default)"
- **After:** "Ties are broken by which element's planet appears first in the `planetPositions` array. If no planets exist, defaults to 'earth'. In practice, because the Sun is always first and is frequently in Fire or Water, ties rarely result in a predictable default."

### Change 3 — Axis 3 Pluto retrograde rule added
- **Added:** `If 2+ retrogrades and Pluto is among them → deep_transformation`
- **Placed:** After the existing Mars line in the Axis 3 section.

### Change 4 — Example 3 signature column updated
- **Before:** `"earth, outward, balanced"`
- **After:** `Tie result depends on iteration order (see Axis 1 rule)`
- **Reason:** The old example incorrectly assumed ties always fall to earth; the new rule makes the result iteration-order-dependent.

### Change 5 — Added "Unused: ASPECT_THEME_MODIFIERS" section
- New section at the end documenting the `ASPECT_THEME_MODIFIERS` map in `contextBuilder.ts`.
- Notes it is **currently not used** in `buildContext()` and exists as a future expansion point.

---

## FILE 5: `docs/horoscope/07-prompt-construction.md`

### Change 1 — Expanded RETROGRADE CONTEXT example in Section A
- After the existing "Currently retrograde" and "Recently turned direct" lines, added:
  ```
  RETROGRADE CYCLE POSITIONS (translate into felt experience):
    Mercury: deepening phase — 35% through retrograde (8d elapsed, 15d remaining of 24d window)
    Saturn: entering phase — 12% through retrograde (5d elapsed, 35d remaining of 42d window)
    Venus: aftermath — turned direct 3d ago (shadow period may linger)
  ```

### Change 2 — Added note about clear planets
- Added parenthetical note: `(Clear planets are omitted from cycle positions since they have no retrograde story to tell.)`
- Placed immediately after the cycle positions block.

---

## Verification

All 5 files were re-read after editing to confirm:
- No overlapping or duplicated edits
- ASCII art boxes render correctly
- Markdown table columns align
- All specified content was added/removed/changed exactly as requested