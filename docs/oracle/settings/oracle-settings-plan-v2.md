# oracle-settings-plan-v2.md
## Orchestration Document — Oracle Soul & Settings Redesign

---

## What This Plan Covers

This plan redesigns three interconnected things in Oracle:

1. **The soul document** — split from a single editable blob into a structured multi-file system, with a hardcoded safety layer and an admin-editable personality layer
2. **The prompt assembly architecture** — updated layer order and how the soul files are loaded and concatenated
3. **The token length system** — replaced with a smart multi-tier cap system controlled from admin, with the AI determining its own output length within those caps

**What this plan does NOT touch:** categories, template questions, follow-up flows, natal chart calculation, quota system, model fallback chain, streaming, or routing. Those are unchanged.

---

## The Core Problem Being Solved

**Problem 1 — The gambling incident:**
Oracle said "RED" when pushed hard enough. The current soul prompt is a single editable text blob stored in `oracle_settings`. Because it's one document trying to do everything (persona, tone, constraints, format), the constraints get diluted by the personality text and the LLM treats them as suggestions. A user who pushes hard enough breaks through.

**Solution:** Hard constraints move to a hardcoded TypeScript constant in `lib/oracle/safetyRules.ts`. They are concatenated into the system prompt first, before everything else, and are never in the database. They cannot be changed without a code deploy. No admin, no LLM instruction, no user pressure overrides them.

**Problem 2 — The tone:**
Oracle currently writes like a 1990s astrology book. Dense, clinical, inaccessible. The target user is a burned-out 25-year-old on a phone at midnight. They need clarity, punch, and warmth — not "the cosmic invitation to explore your Plutonian shadow self."

**Solution:** The admin-editable soul documents are rewritten with strict tone directives. A new `tone-voice.md` doc constrains language choices at the sentence level.

**Problem 3 — Token output is double-capped and dumb:**
`max_tokens` is set in both the soul prompt text ("maximum 450 words") and in the admin model settings. They conflict. More importantly, a fixed cap is wrong — a "yes or no" question should get 2 sentences, a full natal reading should get 400 words.

**Solution:** The word-count instruction is removed from all soul documents. Token limits are replaced with a 6-tier system. The AI is instructed to self-select its response length tier based on question complexity, and the admin sets the token cap per tier.

---

## Phase Documents

| File | What It Covers |
|------|---------------|
| `v2-phase-1-safety.md` | Hardcoded safety rules — what they are, where they live in code, how they're prepended |
| `v2-phase-2-soul.md` | The 7 admin-editable soul documents — content, tone directives, special-questions spec |
| `v2-phase-3-tokens.md` | The 6-tier token system — admin UI, DB changes, prompt instruction, promptBuilder changes |
| `v2-phase-4-admin-soul-page.md` | The new `/admin/oracle/soul` page — UI spec for editing all 7 soul documents |

---

## Architecture After This Plan

### System prompt assembly order (updated)

```
[HARDCODED - never in DB]
  safetyRules.ts constant   ← ALWAYS FIRST, ALWAYS WINS

[FROM DB - admin-editable, versioned]
  identity.md
  tone-voice.md
  capabilities.md
  hard-constraints.md       ← personality/soul constraints (NOT safety — safety is above)
  special-questions.md
  output-format.md
  closing-anchor.md

[RUNTIME - calculated per session]
  natal context block
  third-party context (if applicable)
  user question
```

The hardcoded safety block is prepended in `promptBuilder.ts` before any database content. Even if an admin wipes every soul document, the safety rules survive.

### What moves where

| Currently | After This Plan |
|-----------|----------------|
| `soul_prompt` key in `oracle_settings` | Deleted |
| Soul editing at `/admin/oracle/context-injection` | Moved to new `/admin/oracle/soul` page |
| `max_tokens` single value in `oracle_settings` | Replaced with 6 tier values |
| Word count limit inside soul prompt text | Removed from soul docs entirely |
| Single `oracle_prompt_versions` table covers everything | Now also covers each soul doc independently |

---

## Implementation Order

Execute the phase documents in sequence. Each phase is independently deployable.

1. **Phase 1 first** — hardcoded safety goes in before anything else. This fixes the gambling incident immediately.
2. **Phase 2** — rewrite and split soul documents, seed them into DB, update promptBuilder assembly
3. **Phase 3** — token tier system, DB changes, admin UI for the slider
4. **Phase 4** — new `/admin/oracle/soul` page

Do not implement Phase 4 before Phase 2 — the page has nothing to edit until the documents exist.
