# Oracle AI System — Quota System V2

> Source: QUOTA_V2_COST_BASED_PLAN.md (Task 10)

---

## Overview

Quota V2 replaces session-count-based rate limiting with **token-cost-based budgets** measured in **microdollars** (1 USD = 1,000,000 microdollars). Each user has two rolling windows:

| Window | Duration | Purpose |
|--------|----------|---------|
| **Burst** | 5 hours | Prevents single-session abuse |
| **Weekly** | 7 days | Real budget — maps to subscription tier |

Every LLM response costs a calculable amount in microdollars. The user's quota is consumed as the cost accumulates within these windows.

---

## Microdollar Convention

All costs stored as **integers in microdollars** to avoid floating-point errors.

```
$0.03    → 30,000 microdollars
$0.001   → 1,000 microdollars
$1.50    → 1,500,000 microdollars
```

Cost formula per response:

```
costUsdMicro = (promptTokens × promptPricePerToken) + (completionTokens × completionPricePerToken)
pricePerToken = pricePer1MTokens / 1,000,000
```

---

## Tier Budgets

| Tier | 5h Burst Budget | 7d Weekly Budget |
|------|-----------------|------------------|
| free | $0.02 (20,000 µ$) | $0.10 (100,000 µ$) |
| popular | $0.10 (100,000 µ$) | $0.50 (500,000 µ$) |
| premium | $0.25 (250,000 µ$) | $1.50 (1,500,000 µ$) |
| moderator | $5.00 (5,000,000 µ$) | $25.00 (25,000,000 µ$) |
| admin | $50.00 (50,000,000 µ$) | $250.00 (250,000,000 µ$) |

The plan is determined by: `(user.role === "admin" || user.role === "moderator") ? user.role : user.tier`

---

## Model Pricing

Pricing is read from `oracle_settings` key `model_pricing` (JSON), with hardcoded fallbacks for unknown models.

### Default Pricing (USD per 1M tokens)

| Model | Prompt $/1M | Completion $/1M |
|-------|-------------|-----------------|
| google/gemini-2.5-flash | $0.15 | $0.60 |
| google/gemini-2.5-flash:free | $0.00 | $0.00 |
| google/gemini-2.5-pro | $1.25 | $10.00 |
| anthropic/claude-sonnet-4 | $3.00 | $15.00 |
| anthropic/claude-sonnet-4:free | $0.00 | $0.00 |
| x-ai/grok-4.1-fast | $0.20 | $1.00 |
| x-ai/grok-4.1 | $3.00 | $15.00 |
| deepseek/deepseek-r1-0528:free | $0.00 | $0.00 |
| deepseek/deepseek-chat-v3-0324:free | $0.00 | $0.00 |

**`:free`-suffix models cost $0** — they don't consume budget. If the model chain falls back to a `:free` model, the user's budget is untouched. A separate `burstMinCostMicro` setting (default: 100 µ$) applies as an anti-spam floor.

---

## Server-Authoritative Design

The quota check happens in `checkQuota` (`convex/oracle/quota.ts`). This is a **Convex query** — the server is the authority. Client-side displays are only UX hints.

A server-side pre-check also runs at the top of `invokeOracle` action to close the TOCTOU gap between client check and server enforcement.

---

## API Shapes

### `checkQuota` query (V2) — Return type

```typescript
{
  allowed: boolean;
  reason?: "unauthenticated" | "burst_cap" | "weekly_cap";
  burstRemaining: number;    // microdollars remaining in 5h window
  burstTotal: number;        // total 5h budget in microdollars
  burstResetsAt?: number;    // timestamp when 5h window resets
  weeklyRemaining: number;   // microdollars remaining in 7d window
  weeklyTotal: number;        // total 7d budget in microdollars
  weeklyResetsAt?: number;    // timestamp when 7d window resets
}
```

**Logic:**
1. Get user plan
2. Read burst/weekly budget limits from `oracle_settings` (with defaults)
3. Read window durations from `oracle_settings`
4. Fetch `oracle_quota_usage` for this user
5. If no usage record: `allowed=true`, all remaining = budget
6. If burst window expired: reset `burstCost` to 0, set `burstWindowStart = now`
7. If weekly window expired: reset `weeklyCost` to 0, set `weeklyWindowStart = now`
8. Check: `burstBudget - burstCost > 0` AND `weeklyBudget - weeklyCost > 0`
9. If either is ≤ 0: denied. `reason` = whichever window hit first.

### `incrementQuota` mutation (V2)

**Arg:** `costUsdMicro: number` (required)

**Logic:**
1. Auth check
2. Fetch existing usage record
3. If no record: create with `burstCost: costUsdMicro, burstWindowStart: now, weeklyCost: costUsdMicro, weeklyWindowStart: now`
4. If record exists:
   - Burst window expired → reset `burstCost = costUsdMicro`, `burstWindowStart = now`
   - Else: `burstCost += costUsdMicro`
   - Weekly window expired → reset `weeklyCost = costUsdMicro`, `weeklyWindowStart = now`
   - Else: `weeklyCost += costUsdMicro`
5. Update `lastQuestionAt`, `updatedAt`

---

## Schema

### `oracle_quota_usage` — fields

**Kept (for migration compat):**
- `userId`
- `lastQuestionAt`
- `updatedAt`

**Deprecated (V2 does not write these):**
- `dailyCount` — was count-based, replaced by cost windows
- `dailyWindowStart` — was single 24h window, replaced by two windows
- `lifetimeCount` — was free-tier lifetime cap, replaced by 7d window

**New:**
```typescript
burstCost: v.number(),        // microdollars spent in current 5h window
burstWindowStart: v.number(), // timestamp (ms) when current 5h window started
weeklyCost: v.number(),       // microdollars spent in current 7d window
weeklyWindowStart: v.number(), // timestamp (ms) when current 7d window started
```

### `oracle_messages` — new field

```typescript
costUsdMicro: v.optional(v.number()), // cost of this response in microdollars
```

---

## `oracle_settings` Keys

| Key | Default | Description |
|-----|---------|-------------|
| `quota_burst_budget_free` | 20000 | 5h budget in microdollars |
| `quota_burst_budget_popular` | 100000 | |
| `quota_burst_budget_premium` | 250000 | |
| `quota_burst_budget_moderator` | 5000000 | |
| `quota_burst_budget_admin` | 50000000 | |
| `quota_weekly_budget_free` | 100000 | 7d budget in microdollars |
| `quota_weekly_budget_popular` | 500000 | |
| `quota_weekly_budget_premium` | 1500000 | |
| `quota_weekly_budget_moderator` | 25000000 | |
| `quota_weekly_budget_admin` | 250000000 | |
| `quota_burst_window_ms` | 18000000 | 5 hours |
| `quota_weekly_window_ms` | 604800000 | 7 days |
| `model_pricing` | (JSON) | Per-model pricing overrides |

---

## Cost Calculation — `calculateCostMicro`

Pure function in `convex/oracle/pricing.ts`:

```typescript
export function calculateCostMicro(
  modelUsed: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  pricingTable?: Record<string, { promptPer1M: number; completionPer1M: number }>
): number
```

- Returns 0 for `:free`-suffix models
- Falls back to `defaultPromptPer1M` / `defaultCompletionPer1M` (default: $3.00/$15.00) if model not in table
- No DB reads — pricing table passed as argument

---

## Wiring — Quota Check and Increment Flow (V2)

```
invokeOracle entry
       │
       ├─ Kill switch check ──── if ON: return fallback (NO quota consumed)
       │
       ├─ Crisis detection ────── if triggered: return crisis response (NO quota consumed)
       │
       ├─ Server-side pre-check ── checkQuotaServerSide (action → internal query)
       │                            denied → return "upgrade" response (NO quota consumed)
       │
       ├─ ... prompt assembly, model chain iteration ...
       │
       ├─ Successful LLM response
       │       │
       │       ├── Is this the first response in the session? (isFirstResponse)
       │       │       │
       │       │       YES ──▶ calculateCostMicro(model, promptTokens, completionTokens)
       │       │                   │
       │       │                   ├── patchMessageCost(messageId, costUsdMicro)
       │       │                   │
       │       │                   └── incrementQuota(costUsdMicro)
       │       │                            │
       │       │                            ├── burst window expired? → reset burstCost = cost, burstWindowStart = now
       │       │                            ├── else: burstCost += cost
       │       │                            ├── weekly window expired? → reset weeklyCost = cost, weeklyWindowStart = now
       │       │                            ├── else: weeklyCost += cost
       │       │                            └── update lastQuestionAt, updatedAt
       │       │
       │       │       NO ──▶ skip (follow-ups in same session don't count extra)
       │       │
       │       └── Return response to client
       │
       └─ All models failed ──── return hardcoded fallback (NO quota consumed)
```

```
Client-side quota display:
       │
       ├── checkQuota query ────▶ reads oracle_quota_usage for current user
       │                            returns { allowed, burstRemaining, weeklyRemaining, ... }
       │
       └── UI shows budget remaining (e.g., "$0.08 / $0.10 remaining this week")
           only shows burst indicator when >50% of 5h budget used
```

**Key guarantee**: Quota is ONLY consumed after a genuine, successful LLM response. Crisis responses, kill switch responses, and all-models-failed responses do NOT consume quota. Free-tier models (`:free` suffix) cost $0 and also don't consume quota.

---

## Migration Path

### Phase 1: Add new fields (non-breaking)
- Add `burstCost`, `burstWindowStart`, `weeklyCost`, `weeklyWindowStart` to `oracle_quota_usage` as `v.optional(v.number())` with defaults
- Add `costUsdMicro` to `oracle_messages` as `v.optional(v.number())`
- Existing records work; missing cost fields = 0

### Phase 2: Dual-write
- Update `incrementQuota` to accept and write `costUsdMicro`
- Still increment `dailyCount` and `lifetimeCount` for backward compat
- `checkQuota` returns V2 format (with `burstRemaining`, `weeklyRemaining`) alongside old `remaining`

### Phase 3: Switch reads to V2
- Client components read new V2 quota response
- UI shows budget remaining instead of "X questions remaining"
- Admin panel shows per-message cost

### Phase 4: Remove V1 fields (after 2+ weeks of V2 stable)
- Remove `dailyCount`, `dailyWindowStart`, `lifetimeCount`
- Remove `quota_limit_*`, `quota_reset_*` from `oracle_settings`
- Keep migration compat fields as `v.optional()`

---

## Edge Cases

1. **Free models** → cost = 0, no budget consumed. Anti-spam floor (`burstMinCostMicro`, default 100 µ$) still applies.

2. **Window expiry race** → Convex mutations are serial per-document. Safe.

3. **Missing token counts** → Fall back to `burstMinCostMicro`.

4. **Model not in pricing table** → Fall back to `$3.00/$15.00` per 1M (conservative overestimate).

5. **TOCTOU gap** → Server-side pre-check at top of `invokeOracle` closes it.

6. **Microdollar overflow** → Max safe integer ≈ $9B. No risk.

7. **Existing V1 records** → Missing cost fields = $0. V2 accumulates normally on next call.

---

## Client-Side UX

| Tier | Display |
|------|---------|
| free | "Oracle budget: $0.08 / $0.10 remaining this week" |
| popular | "Cosmic energy: 80% remaining this week" |
| premium | "Oracle access: 85% this week" |

- Burst indicator: subtle, only shown when >50% of 5h budget used
- Countdown: whichever window resets sooner (5h or 7d)
- Free at 0% weekly → "Upgrade to Cosmic Flow for 5x more Oracle access"
- Free at 0% burst → "Rest and return — your 5h cosmic window refreshes soon"