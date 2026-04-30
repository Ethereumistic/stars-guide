# Horoscope Engine — v4 Implementation Task Document

**Project**: stars.guide  
**Prepared for**: AI implementation agent  
**Scope**: Upgrade the horoscope generation pipeline from v3 to v4 across backend (Convex) and admin UI (Next.js)  
**Do not change**: Public-facing API (`convex/horoscopes.ts`), paywall logic, DB schema for `horoscopes` table, fire-and-forget job scheduler architecture, Zod response schema, `astronomyEngine.ts` pure computation functions.

---

## Overview of All Changes

This document covers 5 independent but sequentially recommended tasks:

| # | Task | Files Affected | Risk |
|---|---|---|---|
| 1 | Flip generation axis: date × 12 signs | `convex/ai.ts`, `convex/admin.ts`, `src/app/admin/horoscope/generator/` | Medium |
| 2 | Split & version the master context | `convex/admin.ts`, `convex/aiQueries.ts`, `src/app/admin/horoscope/context/` | Medium |
| 3 | Add zeitgeist freshness window | `convex/admin.ts`, `src/app/admin/horoscope/zeitgeist/`, `src/app/admin/horoscope/generator/` | Low |
| 4 | Pre-translate cosmic weather to felt language | `convex/cosmicWeather.ts`, `convex/ai.ts`, `convex/lib/astronomyEngine.ts` | Low |
| 5 | Expand hook library + emotion-register matching | `convex/hooks.ts`, `convex/ai.ts`, `src/app/admin/horoscope/hooks/` | Medium |

Implement tasks in order. Each task is self-contained and testable independently.

---

## Task 1 — Flip Generation Axis: One Date × 12 Signs

### Why

Currently `runGenerationJob` iterates: for each sign → generate N dates. This is backwards. All 12 signs share identical cosmic weather, moon phase, and zeitgeist for a given date. Generating one date at a time keeps the LLM's context coherent — it holds "the energy of Tuesday" and expresses it through 12 different sign lenses in sequence, producing a tonally unified daily edition.

### What Changes

**`convex/ai.ts` — `runGenerationJob`**

Change the outer loop from iterating over signs to iterating over dates. Inner loop iterates over signs.

Current (simplified):
```
for each sign in targetSigns:
  for each date in targetDates:
    buildPrompt(sign, [date]) → callOpenRouter → upsert
```

New:
```
for each date in targetDates:
  fetch cosmicWeather for this date (one fetch, shared by all signs)
  compute moonPhaseFrame for this date (one compute, shared)
  for each sign in targetSigns:
    buildPrompt(sign, date) → callOpenRouter → upsert
  sleep INTER_DATE_DELAY_MS between dates (not between signs)
```

Key structural changes:
- Each LLM call now generates **one sign, one date** (not one sign, many dates)
- The `LLMResponseSchema` simplifies: `{ sign, date, content }` instead of `{ sign, horoscopes: [{date, content}] }`
- Cosmic weather and moon phase frame are fetched/computed **once per date**, then reused for all 12 signs in that date's loop
- `INTER_SIGN_DELAY_MS` (currently 2000ms) moves to between dates, not between signs, since signs within the same date share context and can run with minimal delay (500ms)
- Progress tracking: `total` = `targetDates.length × targetSigns.length` (unchanged), `completed` increments per sign×date (unchanged)

**`convex/admin.ts` — `startGeneration`**

No structural changes needed. The job still stores `targetDates[]` and `targetSigns[]`. The loop order change is internal to `runGenerationJob`.

**`src/app/admin/horoscope/generator/page.tsx`**

- Update progress display copy: currently shows "Processing Aries..." — change to "Processing [date] — Aries..." to reflect the new date-first axis
- The progress bar logic is unchanged (completed/total ratio)

**Timing constants** — update in `convex/ai.ts`:
```typescript
const INTER_DATE_DELAY_MS = 3000;   // between date batches (was INTER_SIGN_DELAY_MS)
const INTER_SIGN_DELAY_MS = 500;    // within a date batch (new, minimal)
```

### New Zod Schema

```typescript
const LLMResponseSchema = z.object({
  sign: z.enum(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().min(1),
});
```

### New Prompt Structure (one sign, one date)

System message: `[assembled master context — see Task 2]`

User message:
```
TARGET SIGN: Aries
TARGET DATE: 2025-03-10

MOON PHASE FRAME: [frame text]

COSMIC WEATHER FOR THIS DATE:
[pre-translated felt language — see Task 4]

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
[emotional zeitgeist text]
This is how the world FEELS right now — not what happened.
Map this emotional climate to Aries's Likely Felt State.
Never reference news events, countries, or headlines in the output.

HOOK ARCHETYPE FOR THIS HOROSCOPE:
[hook block — see Task 5]

TASK:
Generate one horoscope for Aries for 2025-03-10.
Output ONLY valid JSON: { "sign": "Aries", "date": "2025-03-10", "content": "..." }
Content must be 330–460 characters.
```

### Acceptance Criteria

- A generation job for 1 date × 12 signs produces 12 horoscopes, one per sign
- A generation job for 7 dates × 12 signs produces 84 horoscopes, processed date by date
- Re-running a job for same sign×date triggers the existing upsert/overwrite/skip logic correctly
- Job progress counter increments correctly throughout

---

## Task 2 — Split & Version the Master Context

### Why

The current `master_context` is a single unsaved blob. One bad keystroke destroys it with no undo. At ~6,000 tokens it also triggers Lost-in-the-Middle degradation where instructions buried in the middle of the prompt are under-weighted by the LLM. Splitting into named slots lets each section be edited independently, versioned, and assembled in priority order at generation time.

### New DB Schema

Add a new table `contextSlots` to `convex/schema.ts`:

```typescript
contextSlots: defineTable({
  slotKey: v.string(),       // "identity" | "output_rules" | "sign_voices" | "format_schema"
  label: v.string(),         // human-readable: "AI Identity & Persona", etc.
  content: v.string(),       // the prompt text for this slot
  order: v.number(),         // assembly order (lower = earlier in prompt)
  isEnabled: v.boolean(),    // soft disable without deleting
  // versioning
  version: v.number(),       // increments on each save
  previousContent: v.optional(v.string()),  // one level of undo
  updatedAt: v.number(),
  updatedBy: v.id("users"),
}).index("by_slotKey", ["slotKey"])
  .index("by_order", ["order"]),
```

The four initial slots (seeded via a `seedContextSlots` mutation, idempotent):

| slotKey | label | order | Description |
|---|---|---|---|
| `identity` | AI Identity & Persona | 1 | Who the AI is, its voice, its astrological authority |
| `sign_voices` | Sign Voice Guidelines | 2 | The Likely Felt State column and per-sign personality notes |
| `output_rules` | Output Rules | 3 | Tone rules, what to never say, length, cultural neutrality |
| `format_schema` | JSON Format Schema | 4 | The exact JSON output schema the LLM must follow |

**Why this order**: Identity first (sets the frame), sign voices second (the most sign-specific content, close to the front), rules third, schema last (LLMs follow format instructions better when they appear close to the end of the system message).

### New Backend Functions in `convex/admin.ts`

```typescript
// Queries
getAllContextSlots()              // returns all slots ordered by `order`
getContextSlot(slotKey)          // single slot

// Mutations  
upsertContextSlot({ slotKey, content })
  // before saving: copy current content → previousContent, increment version
  // then update content + updatedAt + updatedBy

revertContextSlot(slotKey)
  // swap content ↔ previousContent, decrement version
  // only works once (no deep history)

toggleContextSlot(slotKey)
  // flip isEnabled
  
reorderContextSlot(slotKey, newOrder)
  // update order value
```

### Assembling the Prompt at Generation Time

In `convex/aiQueries.ts`, replace `getSystemSettingInternal` with:

```typescript
export const assembleSystemPrompt = internalQuery(async (ctx) => {
  const slots = await ctx.db
    .query("contextSlots")
    .withIndex("by_order")
    .filter(q => q.eq(q.field("isEnabled"), true))
    .collect();

  if (slots.length === 0) throw new Error("No context slots configured");

  return slots
    .map(slot => `## ${slot.label}\n\n${slot.content}`)
    .join("\n\n---\n\n");
});
```

In `convex/ai.ts` → `runGenerationJob`: replace the single `master_context` fetch with `assembleSystemPrompt()`.

**Backward compatibility**: Keep the old `systemSettings` table and `getSystemSetting`/`upsertSystemSetting` functions intact. When `contextSlots` is empty AND `master_context` exists in `systemSettings`, fall back to the old monolith. This means zero downtime during migration — the admin migrates slot by slot.

### UI Changes in `src/app/admin/horoscope/context/page.tsx`

Replace the single textarea with a tabbed or accordion interface, one tab/section per slot:

- Each slot shows: label, token count estimate, version number ("v3"), last updated timestamp, last updated by
- "Revert to v[N-1]" button appears if `previousContent` exists
- Enabled/disabled toggle per slot
- Token count warning threshold: 1,500 tokens per slot (total across 4 slots ≈ 6,000)
- A "Preview Assembled Prompt" button that calls `assembleSystemPrompt` and shows the full composed output in a read-only modal — this replaces the current single textarea view

### Acceptance Criteria

- Saving one slot does not affect other slots
- Revert restores exactly the previous content
- Disabled slots are excluded from assembly
- Assembled prompt is identical in structure to the old monolith when all 4 slots are enabled and content is migrated
- If all `contextSlots` are empty, generation falls back to `master_context` from `systemSettings` and logs a deprecation warning
- `assembleSystemPrompt` throws a clear error if both `contextSlots` and `master_context` are empty

---

## Task 3 — Zeitgeist Freshness Window

### Why

There is currently no signal indicating whether a zeitgeist is still relevant to the dates being generated. An admin can accidentally select a 9-day-old zeitgeist for tomorrow's horoscopes with no warning. This is a silent quality failure.

### Schema Change

Add two fields to the `zeitgeists` table in `convex/schema.ts`:

```typescript
validFrom: v.optional(v.string()),   // "YYYY-MM-DD" — start of relevance window
validUntil: v.optional(v.string()),  // "YYYY-MM-DD" — end of relevance window
```

Both are optional so existing records remain valid. When creating a new zeitgeist, default `validFrom` to today and `validUntil` to today + 6 days.

### Backend Changes in `convex/admin.ts`

Update `createZeitgeist` mutation to accept and store `validFrom` and `validUntil`.

Add a new internal utility (not exposed as a query, used inline):
```typescript
function getZeitgeistFreshnessStatus(
  zeitgeist: { validFrom?: string, validUntil?: string },
  targetDates: string[]
): "fresh" | "partial" | "stale" | "unknown"
```

Logic:
- `"unknown"` — no `validFrom`/`validUntil` set (legacy record)
- `"fresh"` — all targetDates fall within [validFrom, validUntil]
- `"partial"` — some targetDates are outside the window
- `"stale"` — all targetDates are outside the window

### UI Changes

**`src/app/admin/horoscope/zeitgeist/page.tsx`**

When creating a new zeitgeist, show two date pickers: "Valid From" and "Valid Until" with smart defaults (today → today+6). Display the validity window on each card in the zeitgeist history list: a green/yellow/red badge showing "Active", "Expiring soon" (≤1 day remaining), or "Expired".

**`src/app/admin/horoscope/generator/page.tsx`**

When the admin selects a zeitgeist from the dropdown and has also selected target dates, compute and display a freshness status badge inline:

- 🟢 **Fresh** — all selected dates within the zeitgeist's window
- 🟡 **Partial** — some selected dates outside the window. Show which dates are uncovered.
- 🔴 **Stale** — no overlap. Show a blocking warning: "This zeitgeist was written for [validFrom–validUntil]. Your target dates are outside this range. Consider creating a new zeitgeist."
- ⚪ **No window set** — legacy zeitgeist, no warning shown

The stale warning is **non-blocking** — the admin can proceed. It is a warning, not an error. Never prevent generation.

### Acceptance Criteria

- New zeitgeists save with `validFrom` and `validUntil`
- Old zeitgeists without these fields show "No window set" in the UI, no errors
- Freshness badge in the generator correctly reflects the overlap between selected dates and the zeitgeist window
- Stale warning appears but does not prevent job creation

---

## Task 4 — Pre-Translate Cosmic Weather to Felt Language

### Why

Currently, the generation prompt contains raw astronomical data (`Mars in Gemini (12.5°)`) and instructs the LLM to translate it into felt language mid-generation. This is extra cognitive work during the most important call, and it produces inconsistent translations across signs and runs. The translation should happen once, upstream, and be stored alongside the raw data.

### Concept

Every cosmic weather snapshot should have a `feltLanguage` field — a paragraph of human emotional language derived from the planetary positions, written before generation runs. At generation time, the LLM receives only the pre-written felt language, never raw planet positions.

### Schema Change

Add to `cosmicWeather` table in `convex/schema.ts`:

```typescript
feltLanguage: v.optional(v.string()),   // pre-translated emotional prose
feltLanguageGeneratedAt: v.optional(v.number()),
```

Optional so existing snapshots remain valid.

### New Function in `convex/cosmicWeather.ts`

```typescript
export const generateFeltLanguage = internalAction(async (ctx, { date }: { date: string }) => {
  // 1. Fetch the cosmicWeather snapshot for this date
  // 2. If feltLanguage already exists, skip (idempotent)
  // 3. Build a translation prompt (see below)
  // 4. Call OpenRouter with low temperature (0.4) — this is factual translation, not creative
  // 5. Store result in cosmicWeather.feltLanguage
});
```

The translation prompt (system message):
```
You are an astrology translator. Your job is to convert raw astronomical data 
into emotionally resonant felt language for horoscope writers.
Rules:
- Never name a planet directly
- Never name a sign directly  
- Write 4-6 sentences of felt human experience
- Focus on collective mood: what energy is in the air
- No prediction, no advice — only description of the energetic climate
- No mention of degrees, orbs, or technical terms
Output only the paragraph, no preamble.
```

User message:
```
Translate this astronomical snapshot to felt language:

Moon: [phase name], [illumination]%
Active Aspects: [list of aspect descriptions with orbs]
Retrogrades: [list or "none"]
Moon Phase Frame: [frame description from astronomyEngine.getMoonPhaseFrame()]
```

Note: planet positions by sign are intentionally excluded from the translation prompt — only aspects and moon phase matter for the felt-language paragraph. This keeps the output from becoming a list of planet traits.

### Integration Into Daily Cron

In `convex/crons.ts`, after the existing `cosmicWeather` computation at 00:05 UTC, schedule `generateFeltLanguage` for 00:10 UTC (5-minute buffer for the snapshot to be written first).

### Integration Into Generation

In `convex/ai.ts` → `runGenerationJob`, when fetching cosmic weather for a date:

```typescript
const weather = await ctx.runQuery(internal.cosmicWeather.getForDate, { date });

// Use felt language if available, fall back to raw data with inline instruction
const cosmicWeatherBlock = weather?.feltLanguage
  ? `COSMIC WEATHER FOR ${date}:\n${weather.feltLanguage}`
  : `COSMIC WEATHER FOR ${date} (raw — translate to felt language):\n${formatRawWeather(weather)}`;
```

The fallback ensures zero downtime during rollout.

### On-Demand Generation

Add an admin button to the cosmic weather overview page: "Generate Felt Language" — calls `generateFeltLanguage` for a specific date on demand. Useful when the cron-generated version needs a rewrite.

### Acceptance Criteria

- `cosmicWeather` records written after this deployment include `feltLanguage`
- Generation prompts use `feltLanguage` when available, raw data when not
- `generateFeltLanguage` is idempotent — calling it twice for the same date does not overwrite existing `feltLanguage` (skip if already present, unless forced)
- Add a `force: boolean` parameter to override existing felt language if the admin wants a fresh translation

---

## Task 5 — Expand Hook Library + Emotion-Register Matching

### Why

Four hooks mapped 1:1 to moon phases means users encounter the same hook every full moon, every new moon. The pattern becomes visible within weeks. The fix is not AI-generated hooks (too risky for a first-impression element) but a larger curated library with intelligent selection based on emotional register, not just lunar phase.

### The New Model

Each hook has two selection dimensions:
1. **Moon phase affinity** (existing) — `new_moon | waxing | full_moon | waning | any`
2. **Emotional register** (new) — one or two tags from: `anxious | expansive | tender | defiant | restless | hopeful | grief | clarity`

At selection time, the zeitgeist's detected emotional register is used to filter the candidate pool, then moon phase preference is used as a secondary filter within that pool, then a random selection is made. This makes hook selection feel non-deterministic to readers while staying contextually appropriate.

### Schema Changes

In `convex/schema.ts`, update `hooks` table:

```typescript
hooks: defineTable({
  name: v.string(),
  description: v.string(),
  examples: v.array(v.string()),
  isActive: v.boolean(),
  moonPhaseMapping: v.optional(v.string()),   // keep existing
  // NEW fields:
  emotionalRegisters: v.array(v.string()),     // ["anxious", "restless"] etc. — empty = matches any
  source: v.string(),                          // "curated" | "ai_proposed" | "admin_written"
  approvedAt: v.optional(v.number()),          // null = pending approval (for ai_proposed)
  usageCount: v.number(),                      // incremented each time hook is used in generation
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

Add index: `.index("by_active_and_source", ["isActive", "source"])`

### Zeitgeist Emotional Register Detection

Add a new field to the `zeitgeists` table:
```typescript
emotionalRegister: v.optional(v.string()),   // detected or manually set
```

When `synthesizeEmotionalZeitgeistAction` runs, add a lightweight classification step after emotional translation:

```typescript
// After generating the emotional translation, call a second small prompt:
// System: "Classify the emotional register of this text. 
//          Choose 1-2 from: anxious, expansive, tender, defiant, restless, hopeful, grief, clarity.
//          Output ONLY a JSON array, e.g. [\"anxious\", \"restless\"]"
// User: [the emotional translation text]
// Store result as zeitgeist.emotionalRegister
```

Also add a manual override dropdown in the zeitgeist UI — the admin can correct the detected register before saving.

### New Hook Selection Logic in `convex/hooks.ts`

Replace `getAssignedHook` with:

```typescript
export const getAssignedHook = internalQuery(async (ctx, {
  hookId,           // manual override
  moonPhaseCategory,
  emotionalRegister,  // from zeitgeist, e.g. ["anxious", "restless"]
}: {
  hookId?: Id<"hooks">,
  moonPhaseCategory: string,
  emotionalRegister: string[],
}) => {
  // 1. Manual override: if hookId provided, use it (if active)
  if (hookId) { ... }

  // 2. Get all active, approved hooks
  const allActive = await ctx.db.query("hooks")
    .withIndex("by_active_and_source")
    .filter(q => q.eq(q.field("isActive"), true))
    .collect();

  // 3. Filter by emotional register match (OR logic — any overlap counts)
  //    Hooks with empty emotionalRegisters match everything
  const registerMatches = allActive.filter(h =>
    h.emotionalRegisters.length === 0 ||
    h.emotionalRegisters.some(r => emotionalRegister.includes(r))
  );

  // 4. Within register matches, prefer moon phase alignment
  const moonMatches = registerMatches.filter(h =>
    h.moonPhaseMapping === moonPhaseCategory || h.moonPhaseMapping === "any" || !h.moonPhaseMapping
  );

  // 5. Select from best pool, falling back up the chain
  const pool = moonMatches.length > 0 ? moonMatches :
               registerMatches.length > 0 ? registerMatches :
               allActive;

  // 6. Weighted random selection (hooks with lower usageCount get higher weight)
  return weightedRandomSelect(pool);
});

function weightedRandomSelect(hooks: Hook[]): Hook {
  // Invert usage count for weight: weight = 1 / (usageCount + 1)
  // This gives newer/less-used hooks a higher chance without fully excluding popular ones
  const weights = hooks.map(h => 1 / (h.usageCount + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < hooks.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return hooks[i];
  }
  return hooks[hooks.length - 1];
}
```

After a hook is selected and used in a generation job, increment `usageCount`:
```typescript
await ctx.db.patch(hook._id, { usageCount: hook.usageCount + 1 });
```

### AI Hook Proposal Feature

Add a new admin action `proposeHooksAction` in `convex/hooks.ts`:

```typescript
// Input: emotionalRegister[], count (how many to generate, default 5)
// Generates candidate hooks via OpenRouter
// Saves them with source: "ai_proposed", isActive: false, approvedAt: null
// Admin reviews proposed hooks in the Hook Manager UI and approves/discards them
```

The generation prompt:
```
System: You are a copywriter for a premium astrology platform. 
Write opening hooks for daily horoscopes.
A hook is 1-2 sentences. It is the first thing a reader sees.
Hook types: mirror (names what reader is doing), permission (validates a feeling),
            provocation (gentle challenge), observation (describes their situation).
Rules:
- No astrology jargon
- No mention of planets, signs, or dates
- Universal — must resonate with any nationality
- Present tense
- No questions unless rhetorical
Output ONLY a JSON array of strings.

User: Generate 5 hooks for emotional register: ["anxious", "restless"]
```

### UI Changes in `src/app/admin/horoscope/hooks/page.tsx`

- Add "Emotional Registers" multi-select chips to the create/edit form
- Add "Source" badge to each hook card: "Curated", "AI Proposed", "Admin Written"
- Add a "Pending Approval" section for `ai_proposed` hooks with Approve / Discard buttons
  - Approve: sets `isActive: true`, `approvedAt: Date.now()`, `source: "ai_proposed"` (keep for tracking)
  - Discard: permanent delete
- Add "Propose New Hooks" button that opens a modal: select emotional registers + count → calls `proposeHooksAction`
- Show `usageCount` on each hook card
- Update the moon phase auto-assignment grid to also show emotional register tags

### Minimum Hook Library Size

Seed 40 curated hooks across all emotional registers (10 per register pair is a reasonable starting point). The `seed` function should be updated to insert these. Have the implementation agent generate them inline during seeding — or leave a `TODO: populate with 40 curated hooks` comment and handle as a separate content task.

### Acceptance Criteria

- Hook selection uses emotional register when available, moon phase as secondary filter
- Weighted random selection means the same hook does not repeat for consecutive days
- AI-proposed hooks never reach production without admin approval
- `usageCount` increments correctly after each generation run
- Hooks with no `emotionalRegisters` set still work (match everything — backwards compatible with existing 4 hooks)
- The existing 4 default hooks continue to function with no emotional register set

---

## Task 6 — Review Page: Edit Reason Capture (Optional, Low Effort)

### Why

Every time an admin edits a horoscope before publishing, that signal disappears. Over weeks this data could tell you which signs fail most, which models produce the most edits, and which emotional weather types need prompt tuning. This task is a small addition with high long-term value.

### Schema Change

Add to `horoscopes` table:
```typescript
editReason: v.optional(v.string()),   
// "too_vague" | "wrong_tone" | "hook_missed" | "off_zeitgeist" | "too_long" | "too_short" | "other"
editCount: v.optional(v.number()),    // number of times this horoscope was edited post-generation
```

### Backend Change in `convex/admin.ts`

Update `updateHoroscopeContent` mutation signature:
```typescript
updateHoroscopeContent({ id, content, editReason?: string })
```

When saving: store `editReason`, increment `editCount`.

### UI Change in `src/app/admin/horoscope/review/page.tsx`

When the admin clicks "Save" after inline editing, show a non-blocking one-tap reason picker before closing the edit mode:

```
Why did you edit this?
[Too vague] [Wrong tone] [Hook missed] [Off zeitgeist] [Too long] [Too short] [Skip]
```

"Skip" closes without storing a reason. The picker appears inline below the textarea, not as a modal. It should feel like a 1-second afterthought, not a form.

### Acceptance Criteria

- Edit reason is stored when provided, null when skipped
- `editCount` correctly reflects the number of post-generation edits
- The reason picker is optional — saving without selecting a reason works fine
- No changes to the public API

---

## Implementation Order & Dependencies

```
Task 1 (flip axis)         — no dependencies, do first
Task 2 (context slots)     — no dependencies, do second  
Task 3 (zeitgeist window)  — no dependencies, do third
Task 4 (felt language)     — depends on Task 1 (prompt structure must be in place)
Task 5 (hook expansion)    — depends on Task 3 (zeitgeist needs emotionalRegister field)
Task 6 (edit reasons)      — no dependencies, do last (lowest priority)
```

Tasks 1, 2, and 3 can be done in parallel if multiple agents are working. Tasks 4 and 5 should follow their respective dependencies.

---

## Things to Never Change

- `convex/horoscopes.ts` — public API, paywall logic, tier enforcement
- `convex/lib/astronomyEngine.ts` — pure astronomy functions (no side effects, no DB)
- `convex/lib/adminGuard.ts` — auth guard
- `horoscopes` table schema — core data model used by public API
- `generationJobs` table schema — only additive changes allowed
- The fire-and-forget scheduler architecture in `startGeneration`
- The upsert/overwrite/skip logic in `upsertHoroscopes`
- OpenRouter as the LLM gateway (all calls continue through `OPENROUTER_API_KEY`)

---

## Testing Checklist (per task)

**Task 1**
- [ ] Generate 1 date × 12 signs → 12 horoscopes created
- [ ] Generate 3 dates × 6 signs → 18 horoscopes, processed date-by-date
- [ ] Re-run same job → identical content skipped, different content overwrites to draft
- [ ] Progress counter reaches 100% correctly

**Task 2**
- [ ] Save slot A, slot B remains unchanged
- [ ] Revert slot A restores previous content exactly
- [ ] Disable slot C → assembled prompt excludes it
- [ ] Empty contextSlots + non-empty master_context → falls back correctly
- [ ] Empty both → generation throws "Master context not configured"

**Task 3**
- [ ] New zeitgeist saves with validFrom/validUntil
- [ ] Old zeitgeist (no window) shows "No window set" badge, no errors
- [ ] Generator shows 🟢 when all selected dates in window
- [ ] Generator shows 🔴 when no overlap, but job still starts

**Task 4**
- [ ] Cron at 00:10 UTC writes feltLanguage to cosmicWeather record
- [ ] Generation prompt uses feltLanguage when present
- [ ] Generation prompt falls back to raw data format when feltLanguage absent
- [ ] `generateFeltLanguage` with force=false skips existing records
- [ ] `generateFeltLanguage` with force=true overwrites

**Task 5**
- [ ] Hook with matching emotionalRegister is preferred over non-matching
- [ ] Hook with empty emotionalRegisters matches any zeitgeist register
- [ ] AI-proposed hook with isActive=false never appears in generation
- [ ] Approved hook appears in selection pool
- [ ] usageCount increments after each job that uses the hook
- [ ] Weighted selection: hook with usageCount=0 selected more often than usageCount=20

**Task 6**
- [ ] Saving edit without reason picker → editReason null, editCount increments
- [ ] Saving edit with reason → editReason stored, editCount increments
- [ ] Public API unaffected by new fields