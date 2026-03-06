# v2-phase-3-tokens.md
## 6-Tier Token Length System

---

## The Problem with the Current Approach

Right now `max_tokens` is a single number in `oracle_settings`. It's also duplicated as a word count instruction inside the soul prompt text. Two problems:

1. **Double constraint, likely conflicting.** If the soul prompt says "maximum 450 words" and the settings say `max_tokens: 600`, one is going to win and it's not clear which. The Phase 2 soul rewrite removes the word count from the soul docs, solving the duplication. But the single `max_tokens` value is still too blunt.

2. **A fixed cap is wrong for the product.** "What does Mercury retrograde mean?" should get 3 sentences. "Read my full chart for this year" should get 600+ words. A single cap either wastes tokens on short answers or cuts off long ones.

---

## The Solution: Self-Selecting Tier System

The AI is instructed to **self-select a response length tier** based on the complexity of the question. Each tier has a token cap set in admin. The `max_tokens` value sent to OpenRouter is set to the highest cap in use for that session type, and the AI is trusted to stay within its self-selected tier.

This is SOTA for production AI products: rather than fighting the model with hard truncation mid-sentence, you give it a vocabulary of size options and let it pick appropriately. The hard cap on OpenRouter is a safety net, not the primary control.

---

## The 6 Tiers

| Tier | Token Cap | ~Word Count | When to Use |
|------|-----------|-------------|-------------|
| `extra_short` | 80 | ~60 words | Direct factual questions, yes/no with brief context, one-word answers that need one sentence of explanation |
| `short` | 200 | ~150 words | Simple single-topic questions, "what does X mean", quick chart observations |
| `medium` | 400 | ~300 words | Most standard Oracle questions — relationship readings, career questions, life pattern questions |
| `long` | 700 | ~525 words | Complex multi-part questions, deep chart readings, questions that genuinely need nuance |
| `hard_limit` | 1000 | ~750 words | Standard hard cap — Oracle never exceeds this in normal conversation |
| `extra_hard_limit` | 2000 | ~1500 words | Reserved for special session types (future year predictions, full natal readings). Normal Oracle never reaches this. |

**The `max_tokens` value sent to OpenRouter** for a normal Oracle session is always set to `hard_limit`. The AI picks a tier at or below that. For special extended sessions, `extra_hard_limit` is used instead.

---

## How the AI Self-Selects

Add a length selection instruction to `output-format.md` (from Phase 2):

```
LENGTH SELECTION:
Before writing your response, decide which length it needs. Pick one:

- EXTRA_SHORT: The question needs a direct, brief answer. 1–3 sentences maximum.
- SHORT: A focused answer on one topic. 1–2 short paragraphs.
- MEDIUM: A real answer that needs some space. 2–3 paragraphs. This is your default.
- LONG: The question is genuinely complex or multi-layered and shortchanging it would be unhelpful.

Do not announce which tier you chose. Just write accordingly.

Never write more than the question deserves. Padding a short answer with filler to seem thorough is worse than a short answer that lands.
```

Note: `extra_hard_limit` is never in the Oracle instruction text — it's a server-side cap for special session types, invisible to the model.

---

## Database Changes

In `oracle_settings`, replace the single `max_tokens` key with these 6 keys (all `group: "token_limits"`, `valueType: "number"`):

| key | label | default |
|-----|-------|---------|
| `tokens_extra_short` | Extra Short Cap | `80` |
| `tokens_short` | Short Cap | `200` |
| `tokens_medium` | Medium Cap | `400` |
| `tokens_long` | Long Cap | `700` |
| `tokens_hard_limit` | Hard Limit (Normal Chat) | `1000` |
| `tokens_extra_hard_limit` | Extra Hard Limit (Extended Sessions) | `2000` |

The `max_tokens` key in `oracle_settings` is deleted after migration.

---

## promptBuilder.ts Changes

```typescript
// For normal Oracle sessions:
const maxTokensForCall = settings['tokens_hard_limit']; // e.g. 1000

// For special extended sessions (future: year prediction feature):
// const maxTokensForCall = settings['tokens_extra_hard_limit']; // e.g. 2000

// Sent to OpenRouter:
{
  model: settings.model_a,
  temperature: settings.temperature,
  max_tokens: maxTokensForCall,  // ← hard ceiling for this call
  top_p: settings.top_p,
  stream: true,
  messages: [...]
}
```

The AI picks its length tier from the output-format instruction. OpenRouter's `max_tokens` acts only as the ceiling. The model won't be truncated mid-response for normal questions.

---

## Admin UI: Multi-Thumb Slider

**Location:** `/admin/oracle/settings` → "Token Limits" section (replaces the single `max_tokens` input)

### Component Spec

A single track with 6 colored thumbs. Range: 0 → 2500 tokens.

```
Track: ─────●──────────●───────────────●──────────────────●────────────────────────────────●
Color:      cyan       green           yellow             orange                          red
Tier:    extra_short  short           medium              long                         hard_limit

                                                                                              ●
                                                                                           purple
                                                                                       extra_hard_limit
```

Each thumb:
- Labeled with tier name above the thumb
- Token value shown below the thumb
- Cannot cross the thumb to its left (enforce ordering: extra_short < short < medium < long < hard_limit < extra_hard_limit)
- Minimum gap between any two adjacent thumbs: 50 tokens (prevents stacking)

Below the slider, 6 small number inputs (one per tier) for precise value entry. Editing an input moves its corresponding thumb. Editing a slider moves its corresponding input. They are in sync.

Color coding (consistent across slider and inputs):
- `extra_short`: cyan / `#06b6d4`
- `short`: green / `#22c55e`
- `medium`: yellow / `#eab308`
- `long`: orange / `#f97316`
- `hard_limit`: red / `#ef4444`
- `extra_hard_limit`: purple / `#a855f7`

Approximate word count shown next to each input: `~{Math.round(value / 1.33)} words`

**Save behavior:** One "Save Token Limits" button saves all 6 values as a batch. Not individual per-tier saves — they're related and should be reviewed together before committing.

**Warning state:** If `hard_limit` is set lower than `long`, show an inline warning: "Hard limit is lower than Long cap — the AI may be cut off mid-response on long answers."

### Implementation Notes

Use a custom React component. No existing slider library handles 6 independent thumbs with ordering constraints cleanly. Build it with:
- A single `<div>` track
- 6 absolutely-positioned thumb elements driven by percentage values
- Mouse/touch drag handlers per thumb
- `motion` (Framer Motion, already in stack) for smooth thumb animations on drag
- Zustand local state for the 6 values during editing (unsaved changes)

---

## Checklist for This Phase

- [ ] Write Convex migration: delete `max_tokens` from `oracle_settings`, insert 6 new tier keys with defaults
- [ ] Update `promptBuilder.ts` to read `tokens_hard_limit` (or `tokens_extra_hard_limit` for extended sessions) and use as `max_tokens` in OpenRouter payload
- [ ] Add length selection instruction to `soul_output_format` in oracle_settings (the paragraph from this doc)
- [ ] Remove any token/word-count instruction from other soul documents (should already be clean after Phase 2)
- [ ] Build multi-thumb slider component
- [ ] Add "Token Limits" section to `/admin/oracle/settings` replacing the old single `max_tokens` input
- [ ] Test: ask "what's 2+2" → Oracle responds in 1-2 sentences (extra_short tier self-selection)
- [ ] Test: ask a complex relationship question → Oracle responds in 2-3 paragraphs (medium tier)
- [ ] Test: verify OpenRouter call never receives a `max_tokens` value above `tokens_hard_limit` for normal sessions
