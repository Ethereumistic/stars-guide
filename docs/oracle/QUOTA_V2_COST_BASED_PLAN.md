# Oracle Quota V2 — Cost-Based Rate Limiting Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace session-count-based quota with token-cost-based quota. Rate limits become dollar-denominated budgets per 5-hour and 7-day rolling windows, with per-tier caps that map naturally to subscription pricing.

**Architecture:** Each LLM response already reports `promptTokens` + `completionTokens` + `modelUsed`. We add a pricing lookup table (in-mem + DB-admin-overridable) to compute USD cost per response. The existing `oracle_quota_usage` table gets new cost-tracking fields. The `checkQuota` query and `incrementQuota` mutation shift from counting sessions to summing costs within rolling windows.

**Tech Stack:** Convex (mutations, queries, actions), TypeScript, existing `oracle_settings` + `oracle_quota_usage` tables.

---

## Current State (V1)

| What | How Now | Problem |
|------|---------|---------|
| Free tier | 5 lifetime questions | Too rigid. A short "hi" and a deep birth chart reading both count as 1. |
| Popular tier | 5 questions / 24h rolling | Same — a cheap call and an expensive call are identical. |
| Premium tier | 10 questions / 24h rolling | Same problem. |
| Tracking field | `dailyCount` + `lifetimeCount` | No cost awareness. No multi-window. |
| Reset logic | Single 24h window or never | No 5h burst protection. No weekly budget. |

## Target State (V2)

| Tier | 5h Burst Budget | 7d Weekly Budget | Rationale |
|------|-----------------|-------------------|-----------|
| free | $0.02 (2 cents) | $0.10 (10 cents) | ~5-10 short chats or 1-2 deep readings per week |
| popular | $0.10 (10 cents) | $0.50 (50 cents) | ~20-40 short chats or 5-8 deep readings per week |
| premium | $0.25 (25 cents) | $1.50 (150 cents) | ~50+ short chats or 15+ deep readings per week |
| moderator | $5.00 | $25.00 | Effectively unlimited for ops |
| admin | $50.00 | $250.00 | Effectively unlimited |

**Why 5h + 7d?**  
- 5h prevents a free user from burning their whole week in one sitting (burst abuse protection).
- 7d is the real budget — generous enough for normal use, tight enough to cap costs.
- Standard SaaS pattern: short-window rate limit + long-window quota.

**Why cost not count?**  
- gemini-2.5-flash prompt+completion might cost ~$0.001.  
- claude-sonnet-4 might cost ~$0.03 per Oracle call.  
- Same "1 question" can cost 30x differently depending on model chain fallback. Cost is the honest unit.

---

## Pricing Data — Model Cost Table

OpenRouter returns `usage.prompt_tokens`, `usage.completion_tokens`, and per-model pricing is available at `openrouter.ai/api/v1/models`. We maintain a local pricing table that can be overridden via `oracle_settings`.

### Default Pricing (USD per 1M tokens, approximate as of mid-2025)

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

Free-suffix models cost $0 — they don't consume budget. This is a nice emergent property: if the model chain falls back to a :free model, the user's budget is untouched.

### Cost formula per response

```
costUsd = (promptTokens * promptPricePerToken) + (completionTokens * completionPricePerToken)
```

Price per token = price per 1M tokens / 1,000,000.

Stored as **microdollars** (1 USA = 1,000,000 microdollars) to avoid floating point. So $0.03 = 30,000 microdollars.

---

## Schema Changes

### 1. `oracle_quota_usage` table — add cost fields

**Current fields to KEEP:**
- `userId`
- `lastQuestionAt`
- `updatedAt`

**Current fields to DEPRECATE (keep for migration, stop writing):**
- `dailyCount` — was count-based, replaced by cost windows
- `dailyWindowStart` — was single 24h window, replaced by two windows
- `lifetimeCount` — was free-tier lifetime cap, replaced by 7d window

**New fields:**
```typescript
// Cost spent in the current 5-hour burst window (microdollars)
burstCost: v.number(),        // microdollars spent in current 5h window
burstWindowStart: v.number(), // timestamp (ms) when current 5h window started

// Cost spent in the current 7-day weekly window (microdollars)
weeklyCost: v.number(),       // microdollars spent in current 7d window  
weeklyWindowStart: v.number(), // timestamp (ms) when current 7d window started
```

### 2. `oracle_messages` table — add costUsdMicro field

```typescript
// Cost of this specific response in microdollars (0 if free model or fallback)
costUsdMicro: v.optional(v.number()),
```

This gives per-message cost observability. The admin debug panel can show "this response cost $0.032".

### 3. New `oracle_settings` keys

| Key | Default | Description |
|-----|---------|-------------|
| `quota_burst_budget_free` | 50000 | 5h budget in microdollars (50000 = $0.05) |
| `quota_burst_budget_popular` | 500000 | 5h budget in microdollars ($0.50) |
| `quota_burst_budget_premium` | 2000000 | 5h budget in microdollars ($2.00) |
| `quota_burst_budget_moderator` | 100000000 | 5h budget in microdollars ($100.00) |
| `quota_burst_budget_admin` | 100000000 | 5h budget in microdollars ($100.00) |
| `quota_weekly_budget_free` | 200000 | 7d budget in microdollars ($0.20) |
| `quota_weekly_budget_popular` | 2000000 | 7d budget in microdollars ($2.00) |
| `quota_weekly_budget_premium` | 8000000 | 7d budget in microdollars ($8.00) |
| `quota_weekly_budget_moderator` | 500000000 | 7d budget in microdollars ($500.00) |
| `quota_weekly_budget_admin` | 500000000 | 7d budget in microdollars ($500.00) |
| `quota_burst_window_ms` | 18000000 | 5 hours in ms (5 * 60 * 60 * 1000) |
| `quota_weekly_window_ms` | 604800000 | 7 days in ms (7 * 24 * 60 * 60 * 1000) |
| `model_pricing` | (JSON — see default table above) | Per-model pricing overrides as JSON. If model missing, fall back to hardcoded defaults. |

---

## API Changes

### `checkQuota` query (V2)

**Return type:**
```typescript
{
  allowed: boolean;
  reason?: "unauthenticated" | "burst_cap" | "weekly_cap";
  burstRemaining: number;    // microdollars remaining in 5h window
  burstTotal: number;        // total 5h budget in microdollars
  burstResetsAt?: number;    // timestamp when 5h window resets
  weeklyRemaining: number;   // microdollars remaining in 7d window
  weeklyTotal: number;       // total 7d budget in microdollars
  weeklyResetsAt?: number;   // timestamp when 7d window resets
}
```

**Logic:**
1. Get user plan (same as V1)
2. Read burst/weekly budget limits from oracle_settings (with defaults)
3. Read window durations from oracle_settings
4. Fetch `oracle_quota_usage` for this user
5. If no usage record: allowed=true, remaining = budget
6. If burst window expired: reset `burstCost` to 0, set `burstWindowStart` = now
7. If weekly window expired: reset `weeklyCost` to 0, set `weeklyWindowStart` = now
8. Check: `burstBudget - burstCost > 0` AND `weeklyBudget - weeklyCost > 0`
9. If either is $0 or less: denied. Reason = whichever window hit first.

### `incrementQuota` mutation (V2)

**New arg:** `costMicro: v.optional(v.number())` (optional)

**Logic:**
1. Auth check (same as V1)
2. Fetch existing usage record
3. If no record: create with `burstCost: costUsdMicro, burstWindowStart: now, weeklyCost: costUsdMicro, weeklyWindowStart: now`
4. If record exists:
   - Check if burst window expired → reset burstCost to `costUsdMicro`, update burstWindowStart
   - Else: add costUsdMicro to burstCost
   - Check if weekly window expired → reset weeklyCost to `costUsdMicro`, update weeklyWindowStart
   - Else: add costUsdMicro to weeklyCost
5. Update `lastQuestionAt`, `updatedAt`

### `calculateCost` helper (pure function, in `convex/oracle/quota.ts`)

```typescript
/**
 * Calculate USD cost in microdollars for an LLM response.
 * Uses model pricing table from oracle_settings (with hardcoded fallbacks).
 * Returns 0 for free-suffix models (e.g. ":free") or if tokens not reported.
 */
export function calculateCostMicro(
  modelUsed: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  pricingTable?: Record<string, { promptPer1M: number; completionPer1M: number }>
): number
```

This is a pure function — no DB reads inside. It takes the pricing table as an argument. The caller (`invokeOracle`) reads pricing from settings and passes it in.

### Changes to `invokeOracle` action (in `llm.ts`)

After successful LLM response + before quota increment:

```typescript
// Calculate cost of this response
const costMicro = calculateCostMicro(
  actualModelUsed,
  result.promptTokens,
  result.completionTokens,
  pricingTable, // read from oracle_settings earlier
);

// Store per-message cost
if (result.messageId && costMicro > 0) {
  await ctx.runMutation(internal.oracle.sessions.patchMessageCost, {
    messageId: result.messageId,
    costUsdMicro: costMicro,
  });
}

// Quota increment now takes cost
if (isFirstResponse) {
  await ctx.runMutation(api.oracle.quota.incrementQuota, { costUsdMicro: costMicro });
}
```

**IMPORTANT:** The quota check (`checkQuota`) happens BEFORE `invokeOracle` on the client side. The server-side quota enforcement happens inside `invokeOracle` via the public `checkQuota` query (`ctx.runQuery(api.oracle.quota.checkQuota, {})`). There is no separate `checkQuotaServerSide` function — the same query is used for both client and server checks.

---

## Migration Strategy

### Phase 1: Add new fields (non-breaking)

1. Add new fields to `oracle_quota_usage` schema as `v.optional(v.number())` with defaults
2. Add `costUsdMicro` to `oracle_messages` schema as `v.optional(v.number())`
3. Deploy — existing records keep working, new fields absent = 0 cost

### Phase 2: Write to both old and new (dual-write)

1. Update `incrementQuota` to accept and use `costMicro`
2. V1 fields no longer exist in schema — no backward compat needed
3. Update `checkQuota` to use new cost-based logic (already returns V2 format)

### Phase 3: Switch reads to V2

1. Client-side components read new V2 quota response
2. UI shows budget remaining instead of "X questions remaining"
3. Admin panel shows cost data per message

### Phase 4: Remove V1 fields (DONE)

1. `dailyCount`, `dailyWindowStart`, `lifetimeCount` already removed from schema — no backward-compat fields exist
2. Schema fields use `v.optional(v.float64())` for cost fields
3. Old keys (`quota_limit_*`, `quota_reset_*`) cleaned up

---

## Client-Side UI Changes

### Before (V1)
- "5 Oracle Questions remaining" (free)
- "3 questions remaining today" (popular/premium)
- Countdown timer until reset

### After (V2)
- "Oracle budget: $0.08 / $0.10 remaining this week" (free)
- "Cosmic energy: 80% remaining this week" (popular — friendlier wording)
- "Oracle access: 85% this week" (premium)
- Burst: Subtle indicator "Slow down — 5h limit at 60%" — only shows when burst >50%
- Countdown timer to whichever window resets sooner (5h or 7d)

### Upgrade CTA
- Free at 0% weekly: "Upgrade to Cosmic Flow for 5x more Oracle access"
- Free at 0% burst: "Rest and return — your 5h cosmic window refreshes soon"

---

## Task Breakdown

### Task 1: Model pricing table — `convex/oracle/pricing.ts`
- Create pure pricing lookup module
- Hardcode default pricing table (model → prompt+completion $/1M tokens)
- Export `calculateCostMicro()` pure function
- Export `DEFAULT_MODEL_PRICING` and `PRICING_TABLE_SETTINGS_KEY`
- No DB reads inside — table passed as argument

### Task 2: Schema migration — add cost fields
- Add `burstCost`, `burstWindowStart`, `weeklyCost`, `weeklyWindowStart` to `oracle_quota_usage` (all optional with defaults = 0 / now)
- Add `costUsdMicro` to `oracle_messages` (optional with default = undefined)
- Keep old V1 fields as-is (they're still in use)

### Task 3: Default quota budget settings
- Seed `oracle_settings` with burst and weekly budget keys for all tiers
- Seed `quota_burst_window_ms` and `quota_weekly_window_ms`
- Seed `model_pricing` as JSON blob (the default pricing table)
- Create migration script or admin seed button

### Task 4: Rewrite `checkQuota` query (V2)
- New return type with burst/weekly remaining
- Read settings from DB with fallback to hardcoded defaults
- Rolling window expiry logic for both 5h and 7d
- Return V2 format (backward compat: also include `remaining` for old clients)

### Task 5: Rewrite `incrementQuota` mutation (V2)
- Accept `costUsdMicro` argument
- Dual-write: update both old `dailyCount`/`lifetimeCount` AND new cost fields
- Rolling window reset logic for both 5h and 7d

### Task 6: Add `patchMessageCost` internal mutation
- New mutation in `convex/oracle/sessions.ts`
- Patches `costUsdMicro` on an oracle_messages document

### Task 7: Wire cost calculation into `invokeOracle`
- Read pricing table from `oracle_settings` at top of action
- After LLM response: calculate cost, store on message, pass to incrementQuota
- Add server-side quota pre-check before LLM call (action → internal query)

### Task 8: Update client-side quota display
- Update `use-oracle-store.ts` or relevant hooks to consume V2 quota format
- Update chat page quota indicator from "X questions" to budget percentage
- Show burst limit indicator when >50% of 5h budget used
- Update upgrade CTA messaging

### Task 9: Update pricing page features list
- `pricing-data.ts`: Change "5 Oracle Questions" → "Oracle AI — weekly budget"
- Free: "$0.10/week Oracle AI access"
- Popular: "$0.50/week Oracle AI access"
- Premium: "$1.50/week Oracle AI access"

### Task 10: Update quota docs
- Update `docs/oracle/09-quota-system.md` to V2 spec
- Update flow diagram
- Document microdollar convention
- Document migration path

### Task 11: Admin debug panel — cost visibility
- Show per-message cost in admin debug viewer
- Show aggregate cost per user in quota section
- Show which model was used (already exists)

---

## Pitfalls & Edge Cases

1. **Free models cost $0** — models with `:free` suffix or Ollama local models. The pricing table returns 0 for these. They DO still consume the 5h burst window (1 microdollar minimum) to prevent infinite-spam even on free models. Actually no — let's be precise: if cost is 0, we don't add to budget. But we still need spam protection. **Solution:** Add a separate `burstMinCostMicro` setting (default: 100 = $0.0001). Every call costs at least this much, even if the model is free. This prevents infinite API spam on free models.

2. **Window expiry race** — Two concurrent requests could both see the window as expired and both reset it. Convex mutations are serial per-document, so this is safe: the second mutation will see the first's window reset and add to it normally.

3. **Missing token counts** — Some providers or error recovery paths may not return `promptTokens`/`completionTokens`. **Solution:** Fall back to estimated cost based on model's typical usage. If no estimate possible, use `burstMinCostMicro`.

4. **Model not in pricing table** — If a new model is added via admin panel and not in the pricing table, fall back to a `defaultPromptPer1M` / `defaultCompletionPer1M` setting (default: $3.00/$15.00 — conservative). This overcharges slightly for cheap models but prevents under-billing.

5. **Very long conversations** — Follow-up messages within the same session don't increment quota (unchanged from V1 — only `isFirstResponse` triggers increment). But the token count on follow-ups can be large due to conversation history. This is fine — each session is one quota "charge" regardless of follow-up length.

6. **Convex action isolation** — `checkQuota` is a query (reads), `incrementQuota` is a mutation (writes). There's a TOCTOU gap: a user could pass checkQuota but exceed budget between check and increment. **Mitigation:** Server-side pre-check at the top of `invokeOracle` action. After increment, if budget exceeded, the excess is small (one response) — acceptable.

7. **Microdollar overflow** — JavaScript numbers are 64-bit floats. Max safe integer is 2^53 ≈ 9e15 microdollars = $9 billion. No overflow risk.

8. **Migration: existing V1 records** — Users with `dailyCount: 3, lifetimeCount: 3` and no cost fields. Treat missing cost fields as $0. They'll accumulate cost on their next call. The old limits stop mattering since V2 logic takes over.