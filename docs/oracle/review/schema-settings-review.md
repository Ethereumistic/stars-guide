# Oracle Schema & Settings Documentation Review

> Verification against actual Convex schema and settings code. Date: 2026-06-04.

---

## CRITICAL Misalignments

### 1. Schema line numbers are all stale (off by 200-450 lines)

**DOCS CLAIM** (ORACLE_EXPLAINED.md §2):
| Table | Doc Line Range |
|-------|---------------|
| `oracle_feature_injections` (11) | 268-276 |
| `oracle_settings` (12) | 279-295 |
| `oracle_quota_usage` (13) | 298-309 |
| `oracle_sessions` (14) | 312-332 |
| `oracle_messages` (15) | 334-354 |

**CODE REALITY** (schema.ts):
| Table | Actual Line | Table # |
|-------|------------|---------|
| `oracle_feature_injections` | 519 | 19th |
| `oracle_settings` | 530 | 20th |
| `oracle_quota_usage` | 549 | 21st |
| `oracle_sessions` | 563 | 22nd |
| `oracle_messages` | 787 | 28th |

**SEVERITY: CRITICAL** — Every line number and table number in §2 is wrong. The schema has 40 tables; oracle tables are 19-22 and 28, not 11-15.

---

### 2. `oracle_settings.group` values in docs don't match schema comment or actual usage

**DOCS CLAIM** (§2): `"soul" | "model" | "token_limits" | "provider" | "quota" | "operations" | "safety"`

**SCHEMA COMMENT** (line 543): `"model" | "quota" | "content" | "safety" | "operational"`

**CODE REALITY** (settings.ts `_buildPromptRuntimeSettings` queries by group): `"soul"`, `"model"`, `"token_limits"`, `"provider"`

Three different sets of groups — none matching. The actual code uses `"soul"`, `"model"`, `"token_limits"`, `"provider"` for prompt runtime. The quota settings (in seed file) use `"quota"`. The schema comment is inconsistent with both docs and code.

**SEVERITY: HIGH**

---

## HIGH Misalignments

### 3. `oracle_quota_usage` — deprecated V1 fields don't exist

**DOCS CLAIM** (§2, 09-quota-system.md): Deprecated fields `dailyCount`, `dailyWindowStart`, `lifetimeCount` exist but are "no longer written".

**CODE REALITY** (schema.ts line 549-562): Only V2 fields exist:
```
userId, lastQuestionAt, updatedAt, burstCost (optional float64),
burstWindowStart (optional float64), weeklyCost (optional float64),
weeklyWindowStart (optional float64)
```
NO deprecated V1 fields. Not even as optional. The schema was cleanly migrated without backward compat.

**SEVERITY: HIGH**

---

### 4. `upsertProviders` only handles `model_chain` and `providers_config` — no `intent_model_chain`

**DOCS CLAIM** (§3, 03-admin-configuration.md): Admin Model tab has "Save All" button that atomically saves both model chains + temperature + top_p + stream_enabled.

**CODE REALITY** (upsertProviders.ts): Only upserts `providers_config` and `model_chain`. The `intent_model_chain` is read from oracle_settings in `_buildPromptRuntimeSettings()` but there's no corresponding mutation to write it. Temperature, top_p, and stream_enabled are also NOT written by this mutation — they're separate `upsertSetting` calls.

**SEVERITY: HIGH** — Admin UI flow is misrepresented.

---

### 5. `costUsdMicro` is `v.optional(v.number())` — not `v.float64()`

**DOCS CLAIM** (ORACLE_EXPLAINED.md §19.8): Not documented as a field type.

**CODE REALITY** (schema.ts line 824): `costUsdMicro: v.optional(v.number())`

This is `v.number()` while quota cost fields use `v.float64()`. Inconsistent but functional.

**SEVERITY: LOW**

---

## MEDIUM Misalignments

### 6. `oracle_messages` has undocumented fields

**DOCS CLAIM** (§2): Lists only these fields for oracle_messages: sessionId, role, content, modelUsed, promptTokens, completionTokens, costUsdMicro, fallbackTierUsed, systemPromptHash, journalPrompt, timing fields, debugModelUsed, createdAt.

**CODE REALITY** (schema.ts lines 787-834): Additionally has:
- `audioData` (string, DEPRECATED)
- `audioStorageId` (id("_storage"))
- `audioUrl` (string)
- `binauralParams` (v.any())
- `rating` (optional union of "thumbs_up" | "thumbs_down"), `ratingAt` (optional number)

These audio and rating fields are completely undocumented.

**SEVERITY: MEDIUM**

---

### 7. `oracle_sessions` table # is wrong in schema.ts itself

The schema comment says "13. ORACLE QUOTA USAGE" at line 548 but it's actually the 21st table. The comment says "14. ORACLE SESSIONS" at line 563 but it's the 22nd table. These internal comments haven't been updated as the schema grew.

**SEVERITY: MEDIUM**

---

### 8. `settings.ts` has 3 versions of getSetting

**DOCS CLAIM** (§3 admin auth): `requireAdmin()` is called for admin queries.

**CODE REALITY**: There are three versions:
- `getSetting` — admin-guarded (uses `requireAdmin`)
- `getSettingInternal` — no admin guard (internalQuery, used by llm.ts)
- `getSettingPublic` — no admin guard (regular query, used by client)

Docs only mention the admin-guarded version.

**SEVERITY: MEDIUM**

---

## CORRECTLY DOCUMENTED

- ✅ `oracle_feature_injections` fields: featureKey, contextText, isActive, version, createdAt, updatedAt — ALL CORRECT
- ✅ `oracle_settings` fields: key, value, valueType, label, description, group, updatedAt, updatedBy — ALL CORRECT
- ✅ `oracle_sessions` fields: all documented fields exist with correct types (featureKey optional, birthChartDepth optional, synastryPayload optional with correct shape, starType optional, etc.)
- ✅ `oracle_messages` core fields: sessionId, role, content, modelUsed, promptTokens, completionTokens, fallbackTierUsed, systemPromptHash, journalPrompt — ALL CORRECT
- ✅ `oracle_messages` timing fields: timingPromptBuildMs, timingRequestQueueMs, timingTtftMs, timingInitialDecodeMs, timingTotalMs — ALL CORRECT
- ✅ `oracle_messages` debug field: debugModelUsed — CORRECT
- ✅ `oracle_messages` cost field: costUsdMicro — EXISTS (line 824)
- ✅ adminGuard.ts exists at `convex/lib/adminGuard.ts`
- ✅ `requireAdmin()` returns `{ userId, user }`
- ✅ Settings indexes: `by_key` and `by_group` — CORRECT
- ✅ `upsertProviders` calls `validateProvidersConfig()` and `validateModelChain()` — CORRECT
- ✅ All documented setting keys exist (oracle_soul, temperature, top_p, stream_enabled, model_chain, etc.)
