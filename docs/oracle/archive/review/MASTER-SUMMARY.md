# Oracle Documentation Audit — Master Misalignment Summary

> **Date**: 2026-06-04  
> **Reviewers**: Orchestrator (deepseek-v4-pro) + 3 subagents (2× Ollama worker + 1× z.AI hard-worker)  
> **Docs audited**: ORACLE_EXPLAINED.md (94KB), 00-MASTER-WIRING-GUIDE.md, and 22 individual docs in `/docs/oracle/`  
> **Code verified**: All files in `convex/oracle/`, `lib/oracle/`, `src/lib/oracle/`, `convex/schema.ts`

---

## Severity Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 7 | Non-existent modules/functions described as core architecture; fundamental architectural claims are false |
| **HIGH** | 15 | Wrong values, wrong file paths, incorrect function signatures, feature list wrong |
| **MEDIUM** | 14 | Stale details, outdated counts, misleading descriptions |
| **LOW** | 6 | Minor inconsistencies, naming, wording |
| **TOTAL** | **42** | |

---

## CRITICAL (7)

### C1. `promptComposer.ts` / `PromptComposer` class does NOT exist
- **Docs say**: `src/lib/oracle/promptComposer.ts` is a key file with a `PromptComposer` class that collects, sorts, applies gates, and renders blocks
- **Reality**: No such file or class exists anywhere. Composition is done **inline in `convex/oracle/llm.ts`** (lines ~380-450)
- **Sources**: ORACLE_EXPLAINED.md §4, 00-MASTER-WIRING-GUIDE.md "Map 2"

### C2. Streaming flush interval is 50ms, NOT 100ms→300ms
- **Docs say**: "100ms first 2 seconds, then 300ms" — described in 8+ locations, including Design Decision #10 explaining the rationale
- **Reality**: Single flat `MIN_FLUSH_INTERVAL_MS = 50` — no two-phase algorithm
- **Sources**: ORACLE_EXPLAINED.md lines 86, 508, 517, 1184, 1193; MASTER-WIRING-GUIDE lines 400, 531; 06-streaming-architecture.md; 18-design-decisions.md

### C3. "Birth data is ALWAYS injected" is architecturally FALSE
- **Docs say**: "Birth data is ALWAYS injected regardless of which feature is active" — repeated 8+ times across §1, §11, §14, 00-MASTER-WIRING-GUIDE.md invariant #5, 14-cross-context-mixing.md
- **Reality**: Birth data is pipeline-gated: `if (activePipelines.some(p => p.dataRequirements.needsBirthData))`. `generic_chat` and `journal_recall` have `needsBirthData: false` (with the comment "THIS IS THE FIX FOR THE LOBOTOMIZATION")
- **Sources**: llm.ts lines 298-300

### C4. `convex/lib/oracle/` directory does NOT exist
- **Docs say**: Architecture diagram shows `convex/lib/oracle/features.ts` and `convex/lib/oracle/featureContext.ts`
- **Reality**: This directory doesn't exist. Files are split between `lib/oracle/` (project root) and `src/lib/oracle/` with cross-re-exports
- **Sources**: ORACLE_EXPLAINED.md §1 architecture diagram

### C5. `buildPrompt()` function doesn't exist in `promptBuilder.ts`
- **Docs say**: `journalContext is passed to buildPrompt()` (line 943), `promptBuildEndTime (after buildPrompt() returns)` (line 1444)
- **Reality**: No `buildPrompt` function in `src/lib/oracle/promptBuilder.ts`. Old monolithic function removed in v3 migration. Docs still reference it in timing instrumentation and journal integration sections
- **Sources**: ORACLE_EXPLAINED.md lines 943, 1444

### C6. `checkQuotaServerSide` function does NOT exist
- **Docs say**: "A server-side pre-check at the top of invokeOracle... called `checkQuotaServerSide`"
- **Reality**: No such function. Actual code uses `api.oracle.quota.checkQuota` (the public query)
- **Sources**: ORACLE_EXPLAINED.md §9, 09-quota-system.md, 00-MASTER-WIRING-GUIDE.md step 4d

### C7. Journal context is NOT "always injected when consented" — it's pipeline-gated
- **Docs say**: "journal context is ALWAYS assembled when consent is granted — not just in Cosmic Recall sessions"
- **Reality**: `if (activePipelines.some(p => p.dataRequirements.needsJournalContext) && hasJournalConsent)`. `binauralBeats` and `synastry` pipelines set `needsJournalContext: false`
- **Sources**: ORACLE_EXPLAINED.md §12

---

## HIGH (15)

### H1. Default quota budgets are 2.5x–5x higher in code than docs

| Tier | Docs Burst | Code Burst | Docs Weekly | Code Weekly |
|------|-----------|------------|-------------|-------------|
| free | 20,000 µ$ | **50,000 µ$** | 100,000 µ$ | **200,000 µ$** |
| popular | 100,000 µ$ | **500,000 µ$** | 500,000 µ$ | **2,000,000 µ$** |
| premium | 250,000 µ$ | **2,000,000 µ$** | 1,500,000 µ$ | **8,000,000 µ$** |
| moderator | 5,000,000 µ$ | **100,000,000 µ$** | 25,000,000 µ$ | **500,000,000 µ$** |
| admin | 50,000,000 µ$ | **100,000,000 µ$** | 250,000,000 µ$ | **500,000,000 µ$** |

- **Note**: moderator and admin are equal in code, different in docs
- **Sources**: quota.ts DEFAULT_BURST_BUDGETS, seedOracleQuotaSettings.ts

### H2. Schema line numbers are all stale (off by 200–450 lines)
- **Docs**: oracle tables at lines 268-354
- **Reality**: oracle tables at lines 519-834. Also, table numbers are wrong (19-22, 28 vs docs' 11-15)

### H3. `oracle_settings.group` — three different sets documented
- **Docs claim**: `"soul"|"model"|"token_limits"|"provider"|"quota"|"operations"|"safety"`
- **Schema comment**: `"model"|"quota"|"content"|"safety"|"operational"`
- **Code actually queries**: `"soul"`, `"model"`, `"token_limits"`, `"provider"`, `"quota"`

### H4. Feature list is wrong — 6 features, not 7; single `synastry`, not `synastry_core`/`synastry_full`
- **Docs**: `attach_files`, `birth_chart`, `synastry_core`, `synastry_full`, `sign_card_image`, `binaural_beat`, `journal_recall`
- **Reality**: `attach_files`, `birth_chart`, `synastry`, `sign_card_image`, `binaural_beats`, `journal_recall`
- `binaural_beats` is `implemented: true, menuGroup: "primary"` (not `"more"`)
- `synastry` is `implemented: true, menuGroup: "primary"` (not two disabled features)

### H5. `incrementQuota` argument is `costMicro` not `costUsdMicro` (and is optional)
- **Docs**: `costUsdMicro: number` (required)
- **Reality**: `costMicro: v.optional(v.number())`

### H6. Crisis keywords: docs list 7 phrases, code has 22 regex patterns
- **Docs**: 7 exact-match phrases
- **Reality**: 22 regex patterns covering suicidal ideation, self-harm, hopelessness, overdose, jumping — but NOT domestic violence, substance abuse, or child abuse (contrary to doc 07 claim)

### H7. Deprecated V1 quota fields don't exist in schema at all
- **Docs**: `dailyCount`, `dailyWindowStart`, `lifetimeCount` are "deprecated, kept for backward compat"
- **Reality**: These fields do NOT exist in the schema. Clean migration with no backward compat.

### H8. `oracle_quota_usage` fields are `v.optional(v.float64())` not `v.number()`
- **Docs**: `v.number()` for burstCost, burstWindowStart, weeklyCost, weeklyWindowStart
- **Reality**: `v.optional(v.float64())` for all four

### H9. `calculateCostMicro` returns 0 for `:free` — NO `burstMinCostMicro` applied
- **Docs**: "Free models cost $0.00 but still consume burstMinCostMicro (100µ$)"
- **Reality**: `if (modelUsed.endsWith(":free")) return 0;` — zero cost, `BURST_MIN_COST_MICRO` exported but unused

### H10. `PromptBlock` type doesn't match actual types
- **Docs**: Single `PromptBlock` interface with `type`, `label`, `priority`, `scope`, `content`
- **Reality**: Two separate types: `SystemPromptBlock` (content, priority, label) and `UserMessageBlock` (content, label). No `type` field, no `scope` field.

### H11. invokeOracle execution steps 17-23 are conflated
- **Docs**: Lists streaming, title parsing, journal prompt parsing, quota, timing, hooks, finalization as sequential post-processing steps
- **Reality**: Streaming contains title parsing + journal prompt parsing + finalization internally. The actual post-processing order is: quota → title → timing → hooks → status

### H12. `upsertProviders` only handles `model_chain` & `providers_config` — not `intent_model_chain`
- **Docs**: "Save All" button atomically saves both model chains + temperature + top_p + stream_enabled
- **Reality**: Only upserts `providers_config` and `model_chain`. `intent_model_chain` has no write mutation.

### H13. Safety rules are ~50+ lines, not 32
- **Docs**: "a 32-line block"
- **Reality**: `ORACLE_SAFETY_RULES` is ~50+ lines covering additional topics (identity protection, manipulation resistance, mid-response safety)

### H14. `MAX_RESPONSE_TOKENS_DEFAULT` and `MAX_CONTEXT_MESSAGES_DEFAULT` exported from `soul.ts`
- **Docs**: Describe `soul.ts` as just the Oracle personality document
- **Reality**: Also exports limit constants (1000, 20) used by `settings.ts`

### H15. Regex fallback gates birth_chart/synastry behind `hasBirthData`
- **Docs**: "Intent detection is never gated on data availability"
- **Reality**: The **regex fallback** in `classifyOracleToolIntent` gates `birth_chart` and `synastry` behind `hasBirthData === true`. The LLM router doesn't gate, but the regex fallback does.

---

## MEDIUM (14)

| # | Misalignment | Source |
|---|-------------|--------|
| M1 | Steps 1-3 order reversed in Master Wiring Guide (validation before safety in docs; safety before validation in code) | 00-MASTER-WIRING-GUIDE.md |
| M2 | Server-side quota pre-check (PHASE 5) omitted from Master Wiring Guide's 30-step list | 00-MASTER-WIRING-GUIDE.md |
| M3 | `binauralBeatsPipeline.needsBirthData` is `false` in code, docs say `true` in Map 3 and Map 5 | 00-MASTER-WIRING-GUIDE.md |
| M4 | Doc references `convex/oracle/features.ts` — file doesn't exist; real feature definitions are at `src/lib/oracle/features.ts` | ORACLE_EXPLAINED.md architecture diagram |
| M5 | `convex/oracle/features.ts` exists but only contains a feature INJECTION query — not the feature definitions docs imply | ORACLE_EXPLAINED.md §1 |
| M6 | `oracle_messages` has undocumented fields: `audioData` (deprecated), `audioStorageId`, `audioUrl`, `binauralParams`, `rating`, `ratingAt` | ORACLE_EXPLAINED.md §2 |
| M7 | Journal context budget numbers (4000/8000 chars, 500/1000 per entry, 10/20 entries) — uses constants from separate file, doubling logic correct but exact values unverified | ORACLE_EXPLAINED.md §12 |
| M8 | `buildUniversalBirthContext` block label: docs say `[BIRTH CHART DATA]`, synastry pipeline uses `[YOUR CHART DATA]` | ORACLE_EXPLAINED.md §11 |
| M9 | `cosmic_weather` pipeline key exists in `PipelineKey` type but never registered in pipeline index | pipelineTypes.ts vs index.ts |
| M10 | Oracle table numbering comments in `schema.ts` itself are stale ("13. ORACLE QUOTA USAGE" is actually the 21st table) | schema.ts comments |
| M11 | `settings.ts` has 3 versions of `getSetting` (admin-guarded, internal, public) — docs only mention admin-guarded | 03-admin-configuration.md |
| M12 | `upsertProviders` mutation signature: docs say `providersConfig + modelChain`, but doesn't handle `intent_model_chain` | 03-admin-configuration.md |
| M13 | `DEFAULT_ORACLE_SOUL` described as "~62 lines" — actual length needs verification against current soul.ts | ORACLE_EXPLAINED.md §4 |
| M14 | `checkQuota` return type includes `burstUsed` and `weeklyUsed` fields not in documented interface | 09-quota-system.md |

---

## LOW (6)

| # | Misalignment | Source |
|---|-------------|--------|
| L1 | `soul.ts` / `safetyRules.ts` under `src/lib/oracle/` are re-exports → real content at `lib/oracle/` (project root) | Multiple docs |
| L2 | `ORACLE_TITLE_DIRECTIVE` wrapped in `[SESSION TITLE]` tags not mentioned in docs | ORACLE_EXPLAINED.md §17 |
| L3 | Prompt block priority values: Timespace is 50 (not 70), Journal is 40 (not 60), Chart unavailable is 75 (not documented) | ORACLE_EXPLAINED.md §4 |
| L4 | `JOURNAL_PROMPT_DIRECTIVE` uses `[JOURNAL PROMPT SUGGESTION]` tag names, docs imply `[JOURNAL PROMPT DIRECTIVE]` | ORACLE_EXPLAINED.md §12 |
| L5 | `requestQueueMs` timing metric includes provider lookup, URL building, and header construction — not just queue time as described | ORACLE_EXPLAINED.md §19 |
| L6 | `ORACLE_TITLE_DIRECTIVE` wording: docs say "This line will be used as metadata" — code says "not shown to the user" | ORACLE_EXPLAINED.md §17 vs promptBuilder.ts |

---

## Correctly Documented (Verified)

- ✅ All 5 pipeline files exist at correct paths with `buildPromptBlocks` methods
- ✅ `callProviderStreaming` is a named function
- ✅ All 5 timing metrics correctly instrumented (promptBuildMs, requestQueueMs, ttftMs, initialDecodeMs, totalMs)
- ✅ `TIER_FETCH_TIMEOUT_MS = 25_000`, `STREAM_IDLE_TIMEOUT_MS = 15_000`, `MAX_REFUSAL_RETRIES = 1`
- ✅ Unified `attemptOrder` loop with router selection + chain fallback
- ✅ Provider router (`selectProvider`/`releaseProvider`) correctly wired
- ✅ `DEFAULT_INTENT_MODEL_CHAIN` with separate defaults from main chain
- ✅ `tierForIndex()` tier labeling (0→A, 1→B, ..., 25→Z)
- ✅ All 21 session mutations exist
- ✅ All oracle schema fields exist with correct types (core fields)
- ✅ Oracle schema indexes: `by_key`, `by_group`, `by_user`, `by_feature`
- ✅ `adminGuard.ts` at `convex/lib/adminGuard.ts` with `requireAdmin()`
- ✅ `validateProvidersConfig()` and `validateModelChain()` in `upsertProviders.ts`
- ✅ All documented setting keys exist
- ✅ `buildUniversalBirthContext()` correctly reads from both legacy and chart birth data formats
- ✅ Journal consent server-enforced via `assembleJournalContext()`
- ✅ Journal context is non-blocking (try/catch)
- ✅ Quota only incremented on success
- ✅ Refusal detection with retry exists in llm.ts
- ✅ Output safety scanner (`scanResponse`) exists

---

## Recommendations for Documentation Fix

### Immediate (fix first)
1. **Remove all references to `promptComposer.ts`** — it doesn't exist
2. **Remove all references to `convex/lib/oracle/`** — this directory doesn't exist
3. **Correct the "birth data is always injected" claim** → birth data is pipeline-gated
4. **Correct the "journal context is always injected" claim** → journal is pipeline-gated
5. **Fix flush interval** → 50ms flat, not 100ms→300ms
6. **Remove references to `checkQuotaServerSide`** → it's `checkQuota` (public query)
7. **Remove references to `buildPrompt()`** → function doesn't exist in promptBuilder.ts

### High Priority
8. Update all quota budget numbers to match code defaults
9. Remove all schema line number references (they go stale)
10. Fix feature list: 6 features, single `synastry`, `binaural_beats` (plural), correct implemented/menuGroup
11. Fix `incrementQuota` arg name: `costMicro` not `costUsdMicro`
12. Fix `oracle_settings.group` values
13. Update crisis keywords list to match code's 22 patterns
14. Fix `PromptBlock` type description → `SystemPromptBlock` + `UserMessageBlock`
15. Fix `oracle_quota_usage` field types: `v.optional(v.float64())`

### Medium Priority
16. Fix 30-step execution order in Master Wiring Guide
17. Add missing step: server-side quota pre-check (PHASE 5) to Master Wiring Guide
18. Document `oracle_messages` audio and rating fields
19. Fix `convex/oracle/features.ts` path references
20. Remove deprecated V1 field claims from quota docs
21. Document that `:free` models cost 0 µ$ with no minimum
22. Fix `calculateCostMicro` description

---

## Review Files

Detailed per-area reviews saved at:
- `/docs/oracle/review/pipeline-streaming-review.md` — 13 misalignments (pipeline, streaming, sessions, model chain)
- `/docs/oracle/review/quota-safety-features-review.md` — 28 misalignments (quota, safety, features, intent router, journal)
- `/docs/oracle/review/schema-settings-review.md` — 8 misalignments (schema, settings, admin config)
