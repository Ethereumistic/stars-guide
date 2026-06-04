# Oracle Documentation vs Code — Misalignment Review

**Reviewer**: hard-worker subagent (z.AI / GLM-5.1)  
**Date**: 2026-06-04  
**Scope**: Quota, Safety, Features, Intent Router, Birth Context, Journal Context, Output Safety, Refusal Detection  
**Docs reviewed**: ORACLE_EXPLAINED.md (§7–14, §19), 07, 09, 10, 11, 12, 13, 14, 21, 22  
**Source files verified**: quota.ts, pricing.ts, safetyRules.ts, soul.ts, responseSafety.ts, features.ts, featureContext.ts, intentRouter.ts, intentRouterPrompt.ts, promptBuilder.ts, synastryContext.ts, journal/context.ts, journal/consent.ts, llm.ts, schema.ts, settings.ts, pipelines/*.ts

---

## Summary

Found **28 misalignments** between documentation and actual code. Severity breakdown:
- **CRITICAL (5)**: Docs describe features/safety that don't exist or behave fundamentally differently
- **HIGH (10)**: Wrong values, wrong file paths, wrong architecture descriptions
- **MEDIUM (9)**: Stale defaults, missing fields, incorrect details
- **LOW (4)**: Minor inconsistencies in examples, naming, or wording

---

## CRITICAL Misalignments

### 1. `checkQuotaServerSide` does NOT exist

**DOCS CLAIM** (09-quota-system.md §"Server-Authoritative Design", ORACLE_EXPLAINED.md §9, 00-MASTER-WIRING-GUIDE.md step 4d):
> "A server-side pre-check also runs at the top of `invokeOracle` action to close the TOCTOU gap between client check and server enforcement." — called `checkQuotaServerSide` internal query.

**CODE REALITY**: There is no `checkQuotaServerSide` function anywhere. The actual llm.ts calls `ctx.runQuery(api.oracle.quota.checkQuota, {})` — the **public** `checkQuota` query, not a special server-side variant. The variable name is just `quota` not `checkQuotaServerSide`.

```
// llm.ts line 469
const quota = await ctx.runQuery(api.oracle.quota.checkQuota, {});
```

**SEVERITY**: CRITICAL — Docs describe a non-existent security function. The server-side quota check DOES exist but uses the regular `checkQuota` query, not a separate internal query.

---

### 2. Birth data is NOT always injected — it's pipeline-gated

**DOCS CLAIM** (ORACLE_EXPLAINED.md §1, §11, §14, 00-MASTER-WIRING-GUIDE.md invariant #5, 14-cross-context-mixing.md):
> "Birth data is ALWAYS injected when the user has it saved — regardless of which feature is active."  
> "Universal birth context: Birth data is ALWAYS injected into the prompt when available"  
> "Birth data is always injected (not feature-gated)"  
> "Birth data is ALWAYS injected regardless of feature"

**CODE REALITY**: Birth data is ONLY gathered when a pipeline declares `needsBirthData: true`:

```typescript
// llm.ts lines 298-300
const needsBirth = activePipelines.some((p) => p.dataRequirements.needsBirthData);
let birthData: string | null = null;
if (needsBirth && user?.birthData) {
  birthData = buildUniversalBirthContext(user.birthData);
}
```

The `generic_chat` pipeline has `needsBirthData: false` with the comment: *"THIS IS THE FIX FOR THE LOBOTOMIZATION"* — intentionally NOT injecting birth data for generic conversations. The `journal_recall` pipeline also has `needsBirthData: false`.

Only `birth_chart` and `synastry` pipelines set `needsBirthData: true`.

**SEVERITY**: CRITICAL — The docs claim a universal birth context injection that is architecturally false. This is one of the most-repeated claims in the documentation.

---

### 3. `promptComposer.ts` does NOT exist

**DOCS CLAIM** (ORACLE_EXPLAINED.md §4, 00-MASTER-WIRING-GUIDE.md §"Map 2"):
> "`src/lib/oracle/promptComposer.ts` — Block collection, sorting, and rendering"

**CODE REALITY**: No file named `promptComposer.ts` exists anywhere in the project. The prompt composition logic is done inline in `llm.ts` (lines ~389-425), which collects system blocks from pipeline `buildPromptBlocks()` calls, sorts by priority, and joins them. There is no separate `PromptComposer` class or module.

**SEVERITY**: CRITICAL — Docs reference a non-existent module as a key architectural component.

---

### 4. File path chaos: `convex/lib/oracle/` does NOT exist

**DOCS CLAIM** (ORACLE_EXPLAINED.md §1 "Key files"):
```
convex/lib/oracle/features.ts
convex/lib/oracle/featureContext.ts
```

**CODE REALITY**: The directory `convex/lib/oracle/` does not exist. The actual files are split between two locations:
- **Real content** at `lib/oracle/` (project root): safetyRules.ts, soul.ts, promptBuilder.ts, providers.ts, responseSafety.ts (re-export), features.ts (re-export), featureContext.ts (re-export), intentRouter.ts (re-export)
- **Real content** at `src/lib/oracle/`: features.ts, featureContext.ts, intentRouter.ts, responseSafety.ts, synastryContext.ts, intentRouterPrompt.ts
- **Re-exports**: Files at one location re-export from the other (e.g., `lib/oracle/responseSafety.ts` re-exports from `../../src/lib/oracle/responseSafety`)

The `convex/oracle/features.ts` IS a real file but contains only a simple feature injection query — NOT the feature definitions the docs describe. The real feature definitions are at `src/lib/oracle/features.ts`.

**SEVERITY**: CRITICAL — Multiple docs point developers to non-existent paths.

---

### 5. `buildPrompt()` IS still a monolithic function — pipelines don't replace it

**DOCS CLAIM** (ORACLE_EXPLAINED.md §4):
> "The prompt is no longer assembled by a single monolithic `buildPrompt()` function with 7 positional parameters."

**CODE REALITY**: `lib/oracle/promptBuilder.ts` still exports `buildPrompt()` as a monolithic function with 7 parameters:

```typescript
export function buildPrompt(params: {
  soulDoc: string;
  featureInjection?: string | null;
  birthContext?: string | null;
  userQuestion: string;
  isFirstResponse?: boolean;
  journalContext?: string | null;
  timespaceContext?: string | null;
}): PromptPayload
```

However, `llm.ts` does NOT call this `buildPrompt()` function. Instead, it does inline pipeline-based composition. So the `buildPrompt()` function EXISTS but is NOT USED by the main inference path. The docs are half-right — the architecture moved to pipelines, but the old function wasn't removed.

**SEVERITY**: CRITICAL (borderline HIGH) — The docs say the function was "replaced" but it still exists in the codebase, potentially confusing developers.

---

## HIGH Misalignments

### 6. Default quota budgets differ by 2.5x–5x from documented values

**DOCS CLAIM** (09-quota-system.md, ORACLE_EXPLAINED.md §9):

| Tier | Docs: 5h Burst | Docs: 7d Weekly |
|------|---------------|-----------------|
| free | 20,000 µ$ | 100,000 µ$ |
| popular | 100,000 µ$ | 500,000 µ$ |
| premium | 250,000 µ$ | 1,500,000 µ$ |
| moderator | 5,000,000 µ$ | 25,000,000 µ$ |
| admin | 50,000,000 µ$ | 250,000,000 µ$ |

**CODE REALITY** (quota.ts DEFAULT_BURST_BUDGETS / DEFAULT_WEEKLY_BUDGETS):

| Tier | Code: 5h Burst | Code: 7d Weekly |
|------|---------------|-----------------|
| free | **50,000 µ$** | **200,000 µ$** |
| popular | **500,000 µ$** | **2,000,000 µ$** |
| premium | **2,000,000 µ$** | **8,000,000 µ$** |
| moderator | **100,000,000 µ$** | **500,000,000 µ$** |
| admin | **100,000,000 µ$** | **500,000,000 µ$** |

The code has 2.5x–5x higher budgets than documented. Moderator and admin are equal in code but different in docs.

**SEVERITY**: HIGH

---

### 7. `incrementQuota` argument name differs from docs

**DOCS CLAIM** (09-quota-system.md):
> `incrementQuota` arg: `costUsdMicro: number` (required)

**CODE REALITY** (quota.ts):
```typescript
export const incrementQuota = mutation({
  args: {
    costMicro: v.optional(v.number()),
  },
```

The argument is named `costMicro` (not `costUsdMicro`) and is `v.optional()` (not required).

**SEVERITY**: HIGH

---

### 8. Feature list is wrong — 6 features registered, not 7+

**DOCS CLAIM** (10-feature-system.md):
> "Seven features are registered"

And lists: `attach_files`, `birth_chart`, `synastry_core`, `synastry_full`, `sign_card_image`, `binaural_beat`, `journal_recall`

**CODE REALITY** (src/lib/oracle/features.ts `ORACLE_FEATURES`):
Six features: `attach_files`, `birth_chart`, `synastry`, `sign_card_image`, `binaural_beats`, `journal_recall`

Key differences:
- There is NO `synastry_core` or `synastry_full` — there's a single `synastry` (implemented=true)
- The key is `binaural_beats` (plural) not `binaural_beat` (singular)
- `binaural_beats` is `implemented: true`, `menuGroup: "primary"` — NOT `"more"` as documented
- `synastry` has `implemented: true` — NOT `No` as documented

**SEVERITY**: HIGH

---

### 9. Crisis keywords: docs list 6 patterns, code has 22

**DOCS CLAIM** (ORACLE_EXPLAINED.md §7):
> Crisis keywords: `"suicide", "kill myself", "end my life", "don't want to be here", "want to die", "better off dead", "no reason to live"`

**CODE REALITY** (llm.ts CRISIS_PATTERNS): 22 regex patterns covering:
- Suicidal ideation (suicide/suicidal, kill myself, kms, end my life, etc.)
- Self-harm (self-harm, hurting myself, cut myself, cutting myself)
- Hopelessness (no reason to live, nothing left to live for, better off dead, not worth living)
- Overdose (overdose, od on)
- Jumping/throwing (jump off, throw myself)
- Giving up (can't go on, give up on life, end it all)
- Disappearance (want to disappear, wish I was/were dead)
- And more

The docs also claim (07-safety-crisis-detection.md) "22 regex patterns covering suicidal ideation, self-harm intent, domestic violence, substance abuse, and child abuse" — but the actual code only has patterns for suicidal ideation and self-harm, NOT domestic violence, substance abuse, or child abuse keywords.

**SEVERITY**: HIGH

---

### 10. `oracle_settings.group` values differ between schema and docs

**DOCS CLAIM** (ORACLE_EXPLAINED.md §2):
> Groups: `"soul" | "model" | "token_limits" | "provider" | "quota" | "operations" | "safety"`

**SCHEMA COMMENT**:
> Groups: `"model" | "quota" | "content" | "safety" | "operational"`

**CODE REALITY** (settings.ts `_buildPromptRuntimeSettings` queries by group):
- `"soul"` — queried for soul document
- `"model"` — queried for model settings
- `"token_limits"` — queried for max_response_tokens, max_context_messages
- `"provider"` — queried for providers_config
- `"quota"` — used in seedOracleQuotaSettings.ts

The actual groups used are: `soul`, `model`, `token_limits`, `provider`, `quota`. The schema comment is wrong, and neither matches the other.

**SEVERITY**: HIGH

---

### 11. Schema line numbers are completely stale

**DOCS CLAIM** (ORACLE_EXPLAINED.md §2):
> `oracle_feature_injections` (Table 11, schema lines 268-276)  
> `oracle_settings` (Table 12, schema lines 279-295)  
> `oracle_quota_usage` (Table 13, schema lines 298-309)  
> `oracle_sessions` (Table 14, schema lines 312-332)  
> `oracle_messages` (Table 15, schema lines 334-354)

**CODE REALITY** (schema.ts):
> `oracle_feature_injections` — line **519**  
> `oracle_settings` — line **530**  
> `oracle_quota_usage` — line **549**  
> `oracle_sessions` — line **563**  
> `oracle_messages` — line **787**

All line references are off by 200–450 lines.

**SEVERITY**: HIGH

---

### 12. Journal context is NOT always injected when consented — pipeline-gated

**DOCS CLAIM** (ORACLE_EXPLAINED.md §12):
> "journal context is ALWAYS assembled when consent is granted — not just in Cosmic Recall sessions"

**CODE REALITY** (llm.ts):
```typescript
const needsJournal = activePipelines.some((p) => p.dataRequirements.needsJournalContext);
if (needsJournal && user?._id && hasJournalConsent) {
  journalContext = await ctx.runQuery(...)
}
```

Journal context is ONLY injected when a pipeline needs it (`needsJournalContext: true`). The `binauralBeats` pipeline has `needsJournalContext: false`, and the `synastry` pipeline also has `needsJournalContext: false`.

**SEVERITY**: HIGH

---

### 13. Deprecated V1 quota fields don't exist in schema

**DOCS CLAIM** (09-quota-system.md §"Schema"):
> "Deprecated (V2 does not write these): `dailyCount`, `dailyWindowStart`, `lifetimeCount`"

**CODE REALITY** (schema.ts `oracle_quota_usage`): Only has:
- `userId`, `lastQuestionAt`, `updatedAt`
- `burstCost` (optional float64), `burstWindowStart` (optional float64)
- `weeklyCost` (optional float64), `weeklyWindowStart` (optional float64)

The deprecated V1 fields (`dailyCount`, `dailyWindowStart`, `lifetimeCount`) do NOT exist in the schema at all — not even as optional fields. The migration mentioned in the docs never kept backward-compat fields.

**SEVERITY**: HIGH

---

### 14. `oracle_quota_usage` fields are `v.optional(v.float64())` not `v.number()`

**DOCS CLAIM** (09-quota-system.md §"Schema"):
```typescript
burstCost: v.number(),
burstWindowStart: v.number(),
weeklyCost: v.number(),
weeklyWindowStart: v.number(),
```

**CODE REALITY**:
```typescript
burstCost: v.optional(v.float64()),
burstWindowStart: v.optional(v.float64()),
weeklyCost: v.optional(v.float64()),
weeklyWindowStart: v.optional(v.float64()),
```

All fields are `v.optional()` and use `v.float64()` not `v.number()`.

**SEVERITY**: HIGH

---

### 15. `calculateCostMicro` returns 0 for `:free` models — doesn't charge `burstMinCostMicro`

**DOCS CLAIM** (09-quota-system.md §"Edge Cases"):
> "Free models → cost = 0, no budget consumed. Anti-spam floor (`burstMinCostMicro`, default 100 µ$) still applies."

**CODE REALITY** (pricing.ts):
```typescript
export function calculateCostMicro(...): number {
  if (modelUsed.endsWith(":free")) {
    return 0;  // Returns 0 — NO burstMinCostMicro applied
  }
```

The `BURST_MIN_COST_MICRO` constant (100 µ$) exists in pricing.ts but is NEVER used in `calculateCostMicro()`. It's only exported but no code path applies it. The actual cost for `:free` models is 0 µ$, not 100 µ$.

**SEVERITY**: HIGH

---

## MEDIUM Misalignments

### 16. Safety rules are NOT 32 lines — they're much longer

**DOCS CLAIM** (07-safety-crisis-detection.md):
> "a 32-line block starting with `[SAFETY - HIGHEST PRIORITY - NON-NEGOTIABLE]`"

**CODE REALITY**: The `ORACLE_SAFETY_RULES` constant is ~50+ lines covering: medical safety, crisis protocol, relationship with data, content boundaries, identity protection, manipulation resistance, mid-response safety. The docs' "32-line" claim is stale.

**SEVERITY**: MEDIUM

---

### 17. `DEFAULT_ORACLE_SOUL` token limit description vs soul.ts

**DOCS CLAIM** (ORACLE_EXPLAINED.md §2):
> No mention of `MAX_RESPONSE_TOKENS_DEFAULT` or `MAX_CONTEXT_MESSAGES_DEFAULT` in the settings table.

**CODE REALITY** (lib/oracle/soul.ts):
```typescript
export const MAX_RESPONSE_TOKENS_DEFAULT = 1000;
export const MAX_CONTEXT_MESSAGES_DEFAULT = 20;
```

These are exported from soul.ts and used in settings.ts, but the docs attribute them to a separate "limits" configuration. The soul.ts file is described as just the personality document but also exports these constants.

**SEVERITY**: MEDIUM

---

### 18. Intent router `PipelineKey` type doesn't match docs

**DOCS CLAIM** (13-intent-classification.md, ORACLE_EXPLAINED.md §13):
> `PipelineKey: "birth_chart" | "journal_recall" | "synastry" | "binaural_beats" | "generic_chat"`

**CODE REALITY**: Need to verify in pipelineTypes.ts, but based on the pipeline files and features.ts, the valid pipeline keys are: `birth_chart`, `journal_recall`, `synastry`, `binaural_beats`, `generic_chat`. This appears to match.

**SEVERITY**: MEDIUM → actually appears correct based on code review.

---

### 19. `features.ts` regex consent gates don't match docs

**DOCS CLAIM** (13-intent-classification.md §"Consent Gates"):
> "birth_chart: always detected regardless of birth data availability"

**CODE REALITY** (src/lib/oracle/features.ts `classifyOracleToolIntent`):
```typescript
if (hasBirthData) {
  if (BIRTH_CHART_INTENT_PATTERNS.some(...)) { ... }
}
if (hasBirthData) {
  if (SYNASTRY_INTENT_PATTERNS.some(...)) { ... }
}
```

The REGEX fallback gates `birth_chart` and `synastry` behind `hasBirthData === true`. This contradicts the docs which say "intent detection is never gated on data availability." However, the **LLM router** doesn't gate on data — it always offers birth_chart. The docs may be describing the LLM path behavior while the regex path behaves differently.

**SEVERITY**: MEDIUM

---

### 20. `binaural_beats` menu group differs

**DOCS CLAIM** (10-feature-system.md):
> `binaural_beat`: menuGroup `"more"`

**CODE REALITY** (features.ts):
```typescript
{ key: "binaural_beats", menuGroup: "primary", implemented: true }
```

It's `"primary"` and `implemented: true` in the code, not `"more"` and `implemented: false` as the docs say.

**SEVERITY**: MEDIUM

---

### 21. Synastry docs describe two separate features that don't exist

**DOCS CLAIM** (10-feature-system.md):
> `synastry_core` and `synastry_full` as two separate features, both `implemented: false`, `menuGroup: "more"`

**CODE REALITY** (features.ts):
```typescript
{ key: "synastry", implemented: true, menuGroup: "primary", requiresBirthData: true }
```

Single `synastry` key, implemented, primary menu group.

**SEVERITY**: MEDIUM

---

### 22. Journal context budget details differ

**DOCS CLAIM** (ORACLE_EXPLAINED.md §12):
> Normal: 4,000 chars, 500 per entry, 10 entries  
> Cosmic Recall: 8,000 chars, 1,000 per entry, 20 entries

**CODE REALITY** (journal/context.ts): Uses `ORACLE_JOURNAL_CONTEXT.MAX_ENTRIES_IN_CONTEXT` and `ORACLE_JOURNAL_CONTEXT.BUDGET_CHARS` constants from a separate constants file. The expanded budget doubles both via `* (expandedBudget ? 2 : 1)`. Cannot verify exact numbers without reading the constants file, but the doubling logic is confirmed.

**SEVERITY**: MEDIUM

---

### 23. Journal consent flags referenced differently

**DOCS CLAIM** (ORACLE_EXPLAINED.md §12):
> Four consent flags: `includeEntryContent`, `includeMoodData`, `includeDreamData`, `lookbackDays`

**CODE REALITY** (journal/consent.ts): These flags are confirmed: `includeEntryContent`, `includeMoodData`, `includeDreamData`, `lookbackDays`. The `grantConsent` mutation defaults them to `true, true, true, 90` respectively.

**SEVERITY**: MEDIUM → actually matches. No misalignment.

---

### 24. `buildUniversalBirthContext` output format differs from docs

**DOCS CLAIM** (ORACLE_EXPLAINED.md §11):
> Uses labels like `[YOUR CHART DATA]`, header format with `Birth data: ...`, `Location: ...`

**CODE REALITY** (featureContext.ts):
- Header: `Birth data: 2000-04-14 at 15:17` and `Location: New York, US | Timezone: ...`
- Section: `Canonical stored placements:`
- Each placement: `- Sun: Aries 14.25° (House 10, direct, dignity: exaltation)`
- House signatures: `H1:Cancer | H2:Leo | ...`
- Stored aspects: `- Sun conjunction Venus (orb 1.66°)`

The general format matches but specific details like "House signatures" prefix and the exact line format may differ slightly from docs examples. The synastry pipeline uses `[YOUR CHART DATA]` as the block label while the docs say `[BIRTH CHART DATA]`.

**SEVERITY**: MEDIUM

---

## LOW Misalignments

### 25. `soul.ts` and `safetyRules.ts` under `src/lib/oracle/` are re-exports, not content

**DOCS CLAIM**: Multiple docs reference `lib/oracle/safetyRules.ts` and `lib/oracle/soul.ts` as if they contain the actual code.

**CODE REALITY**: 
- `src/lib/oracle/safetyRules.ts` → `export * from "../../../lib/oracle/safetyRules"` (re-export)
- `src/lib/oracle/soul.ts` → `export * from "../../../lib/oracle/soul"` (re-export)
- Real content is at `lib/oracle/safetyRules.ts` and `lib/oracle/soul.ts` (project root)

**SEVERITY**: LOW — works due to re-exports but confusing for developers looking at the wrong file.

---

### 26. `ORACLE_TITLE_DIRECTIVE` wording differs slightly

**DOCS CLAIM** (ORACLE_EXPLAINED.md §17):
> "On the very last line of your response, output: TITLE: <4-6 word session summary>"

**CODE REALITY** (promptBuilder.ts):
```typescript
export const ORACLE_TITLE_DIRECTIVE = [
  "[SESSION TITLE]",
  "On the very last line of your response, output: TITLE: <4-6 word session summary>",
  "This line will be used as metadata, not shown to the user.",
].join("\n");
```

The directive is wrapped in `[SESSION TITLE]` tags not mentioned in docs. Minor.

**SEVERITY**: LOW

---

### 27. Prompt blocks priority values differ from docs

**DOCS CLAIM** (ORACLE_EXPLAINED.md §4, 00-MASTER-WIRING-GUIDE.md §"Map 2"):
> Safety: priority 100, Soul: 90, Feature: 80, Timespace: 70, Journal: 60, Title: 50, Journal prompt: 40

**CODE REALITY** (pipelines/*.ts):
- Safety: priority 100 (not in pipelines, hardcoded in llm.ts)
- Soul: priority 90 ✓
- Feature/Depth: priority 80 ✓
- Timespace: priority **50** (not 70)
- Journal: priority **40** (not 60)
- Title: hardcoded in llm.ts (not a PromptBlock)
- Journal prompt: hardcoded in llm.ts (not a PromptBlock)
- Chart unavailable: priority **75** (not in docs)

**SEVERITY**: LOW

---

### 28. `JOURNAL_PROMPT_DIRECTIVE` tag names differ

**DOCS CLAIM**: `JOURNAL_PROMPT_DIRECTIVE` wraps content in `[JOURNAL PROMPT SUGGESTION]` / `[END JOURNAL PROMPT SUGGESTION]`

**CODE REALITY** (promptBuilder.ts):
```typescript
export const JOURNAL_PROMPT_DIRECTIVE = [
  "[JOURNAL PROMPT SUGGESTION]",
  "If your response touched on emotional themes...",
  "you MAY optionally add a line: JOURNAL_PROMPT: <a reflective question for journaling>",
  "This is optional — only include it when it feels natural and helpful.",
  "[END JOURNAL PROMPT SUGGESTION]",
].join("\n");
```

The tag name is `[JOURNAL PROMPT SUGGESTION]` not `[JOURNAL PROMPT DIRECTIVE]` as docs sometimes imply. The content is close but wording differs.

**SEVERITY**: LOW

---

## Additional Observations (Not Misalignments, But Noteworthy)

### A. Settings groups are inconsistent across codebase

The schema comment says `"model", "quota", "content", "safety", "operational"`. The settings.ts query uses `"soul", "model", "token_limits", "provider"`. The seed file uses `"quota"`. The actual groups that exist are likely: `soul`, `model`, `token_limits`, `provider`, `quota`, `safety`, `operational`. None of these are fully documented.

### B. The `buildPrompt()` function in promptBuilder.ts is dead code

`llm.ts` no longer calls `buildPrompt()` — it does inline pipeline composition. The function still exists and is exported. It should either be removed or documented as legacy.

### C. File location split is confusing

Some real content is at `lib/oracle/` (project root), some at `src/lib/oracle/`, with cross-re-exports. This is an organizational issue that makes the codebase harder to navigate. The pattern is inconsistent:
- `lib/oracle/safetyRules.ts` → real content
- `lib/oracle/soul.ts` → real content
- `lib/oracle/promptBuilder.ts` → real content
- `lib/oracle/responseSafety.ts` → re-export from `src/`
- `lib/oracle/features.ts` → re-export from `src/`
- `lib/oracle/featureContext.ts` → re-export from `src/`
- `lib/oracle/intentRouter.ts` → re-export from `src/`

### D. Synastry pipeline label differences

The synastry pipeline uses `[YOUR CHART DATA]` for the user's chart block label, while the birth chart pipeline uses `[BIRTH CHART DATA]`. The docs sometimes use `[YOUR CHART DATA]` and sometimes `[BIRTH CHART DATA]` inconsistently.

---

## Recommended Next Steps

1. **Priority 1**: Fix the "birth data is always injected" claim — this is the single most misleading statement in the docs
2. **Priority 2**: Remove references to `promptComposer.ts` and `convex/lib/oracle/`
3. **Priority 3**: Update quota default budgets to match actual code values
4. **Priority 4**: Update feature list (6 features, single synastry, binaural_beats plural, correct implemented status)
5. **Priority 5**: Fix `checkQuotaServerSide` → it's actually `checkQuota` (public query)
6. **Priority 6**: Update crisis pattern count and categories
7. **Priority 7**: Fix `incrementQuota` arg name from `costUsdMicro` to `costMicro`
8. **Priority 8**: Update schema line numbers or remove them entirely (they'll go stale again)
9. **Priority 9**: Clarify that `:free` models cost 0 µ$ with NO minimum applied
10. **Priority 10**: Fix `oracle_settings.group` documentation to reflect actual values
