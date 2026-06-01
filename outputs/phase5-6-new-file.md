# Phase 5-6 Output: LIGHT TOUCH — 2 Files + New File

## Summary of Changes

### FILE 1: `AGENTS.md`
- **Line 52**: Removed `retrogradeCalc` from the directory contents comment
- **Before**: `lib/                      # Shared: astronomyEngine, astrology/contextBuilder, signTraits, retrogradeCalc`
- **After**: `lib/                      # Shared: astronomyEngine, astrology/contextBuilder, signTraits`
- **Verified**: `grep retrogradeCalc AGENTS.md` returns no matches ✅

### FILE 2: `tasks/rebuilding/horoscope_and_dashboard_info_rebuild.md`
- **Line 335**: Appended deletion note to the `retrogradeCalc.ts` reference
- **Before**: `retrogradeCalc.ts          ← retrograde window calculations via astronomy-engine`
- **After**: `retrogradeCalc.ts          ← retrograde window calculations via astronomy-engine (DELETED 2025-07-24 — logic moved to astronomyEngine.ts)`
- **Verified**: `grep retrogradeCalc` confirms the annotated line ✅

### FILE 3: `docs/horoscope/HOROSCOPES_EXPLAINED.md` (NEW)
- **Created**: 769 lines, comprehensive end-to-end guide
- **Covers all 16 required sections**:
  1. Title + Overview with ASCII pipeline diagram (all stages including Stage 1b Felt Language)
  2. Stage 1: Astronomy Engine — 10 bodies, geocentric methods, 1-min lookforward, noon UTC, active aspects
  3. Stage 1b: Felt Language — LLM translation, stored but unused ⚠️ warning
  4. Stage 2: Daily Context Enrichment — retrograde context, RetrogradePlanetDetail, VoC moon (Pluto included, Sun excluded), dominant element, stellium, energy signature
  5. Stage 3: Energy Signature — 5 axes, Pluto deep_transformation token, ASPECT_THEME_MODIFIERS unused note, tie-breaking iteration-order
  6. Stage 4: Retrograde Context — day-by-day scanning replacing deleted retrogradeCalc.ts, 8 candidates, phase classification table, RETROGRADE CYCLE POSITIONS in prompt
  7. Stage 5: Prompt Construction — Section A/B/C, 12 hook angles table, zero-jargon rules, v2.0 system prompt
  8. Stage 6: LLM Generation — provider resolution, params table, retry logic, Zod validation, content recovery, errorMessage→errors fix note
  9. Stage 7: Output Schema — v2.0 JSON example, field constraints table, 450-char limit
  10. Stage 8: Storage — 3 tables, idempotent upsert, contextSnapshotId reserved
  11. Stage 9: Public Serving & Paywall — status gate, tier date ranges, content stripping
  12. Stage 10: Admin Tools — dashboard, context viewer, admin API table
  13. User Feedback — ratings.ts thumbs up/down
  14. Cron Schedule — all 10+ cron jobs, 30s stagger config
  15. Known Issues — felt language unused, contextSnapshotId reserved, ASPECT_THEME_MODIFIERS unused, tie-breaking non-deterministic, errorMessage bug
  16. Recent Bug Fix — 3 bugs fixed 2025-07-24, retrogradeCalc.ts deleted

- **Ends with**: "This document summarizes the full pipeline. See individual docs in `docs/horoscope/` for detailed specifications."