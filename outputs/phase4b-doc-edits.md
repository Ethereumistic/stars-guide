# Phase 4B — Doc Edits Batch B: Summary of Changes

All 7 files edited successfully on $(date -u +%Y-%m-%dT%H:%M:%SZ).

---

## FILE 1: `docs/horoscope/08-llm-generation.md`

1. **Added** new section `## Known Bug: errorMessage vs errors Field Mismatch` after the Retry Logic section. Explains that `upsertHoroscope` originally defined `errorMessage` (string) but the schema expects `errors` (array), causing error messages to never persist on failed horoscopes. Documents the fix (`errors: v.optional(v.array(v.string()))`), and notes `markQueued` was unaffected.
2. **Added** note after Success Path code block: `contextSnapshotId` exists in schema but is never populated by current code — reserved for future improvement.

---

## FILE 2: `docs/horoscope/09-output-schema.md`

1. **Added** new section `## Record-Level Metadata (not part of content)` after v2.0 Content Structure. Documents 6 table-level fields: `contextSnapshotId` (reserved/never populated), `modelUsed`, `promptVersion`, `errors` (with bug cross-reference to 08-llm-generation.md), `generatedAt`, `generationDurationMs`.

---

## FILE 3: `docs/horoscope/10-database-storage.md`

1. **Added** `retrogradePlanets` row to `daily_astrology_context` table: optional array of `{ planet, status, startDate, endDate, totalDays, daysElapsed, daysRemaining, progressPercent, phase }` — Rich per-planet retrograde detail.
2. **Augmented** `errors` field description in `daily_horoscopes` table with bug note: `upsertHoroscope` previously wrote `errorMessage` (string) instead of `errors` (string[]), so the field was never populated. Now fixed. Cross-references 08-llm-generation.md.
3. **Augmented** `contextSnapshotId` field description in `daily_horoscopes` table: **Reserved** — never written by current code.

---

## FILE 4: `docs/horoscope/11-admin-panel.md`

1. **Changed** Retrograde Context row in Collapsible Sections table from "3 sub-sections: current/upcoming/recentDirect" to "3 sub-sections: current/upcoming/recentDirect + per-planet detail cards (progress bar, phase label, days remaining)".
2. **Added** note after "error message (truncated)" in Failed Generations Panel: may be empty if the `errors` field was never persisted due to the `errorMessage`/`errors` schema mismatch bug.

---

## FILE 5: `docs/horoscope/12-public-queries.md`

1. **Added** new section `## Content Stripping (Paywall Enforcement)` after Status Filtering. Explains how `getPublished`/`getTodayForSign` return partial objects with `content: undefined` when paywalled, and `getAllSignsForDate` explicitly sets `content: undefined` for paywalled entries so the frontend can render paywall prompts with correct sign/date context rather than hiding signs.

---

## FILE 6: `docs/horoscope/14-felt-language.md`

1. **Added** prominent blockquote callout at the top of the document (right after the title): ⚠️ STATUS: Currently unused in the horoscope generation pipeline. Felt language is generated and stored daily but is NOT injected into the horoscope prompt. The prompt uses structured astronomical context from `daily_astrology_context` instead. References "How Felt Language Is Used" section for potential future integration paths.

---

## FILE 7: `docs/horoscope/15-retrograde-discrepancy-report.md`

1. **Expanded** `computeDailyContext.ts` entry in Changes Made table: "Changed import from `retrogradeCalc` to `astronomyEngine`; fixed VoC moon to use geocentric `GeoVector()+Ecliptic()` instead of `EclipticLongitude()`; added Pluto to VoC tracked planets".
2. **Clarified** verification table text: now reads "all 8 retrograde candidates (the full system tracks 10 bodies but only 8 can be retrograde — the Sun and Moon never retrograde)".