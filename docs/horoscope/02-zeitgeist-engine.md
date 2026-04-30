# Zeitgeist Engine

**Route**: `/admin/horoscope/zeitgeist`
**Backend file**: `convex/admin.ts` → `createZeitgeist`, `synthesizeZeitgeistAction`, `synthesizeEmotionalZeitgeistAction`
**AI file**: `convex/ai.ts` → `synthesizeZeitgeist`, `synthesizeEmotionalZeitgeist`
**DB table**: `zeitgeists`

## What It Does

Defines the collective emotional state — "how the world is feeling right now." This is the v3 highest-leverage context layer. It gets injected into every horoscope generation prompt as the `COLLECTIVE EMOTIONAL STATE (ZEITGEIST)` block.

## The Two-Pass System (v3)

```
Pass 1: Raw Events → Psychological Summary
  Input:  3-7 archetypal world events (admin-typed or described)
  Output: 3-sentence psychological baseline (no country names, no specifics)

Pass 2: Psychological Summary → Emotional Translation
  Input:  The raw summary from Pass 1
  Output: 4-6 sentences of felt human experience — fears, cravings, quiet hopes
```

Only the **emotional translation** is used in the generation prompt. The raw summary is for admin review only.

## Modes

**AI Synthesis Mode** (default):
1. Admin enters 3-7 world event archetypes (e.g., "massive tech layoffs", "oil price surge")
2. Selects an LLM model from the picker
3. Clicks "Synthesize & Translate" → calls `synthesizeZeitgeistAction` → then `synthesizeEmotionalZeitgeistAction`
4. Left panel shows the raw summary, right panel shows the emotional translation
5. Both are editable before saving
6. Admin can regenerate just the emotional translation with the "Regenerate" button
7. "Skip emotional translation" checkbox uses the raw summary directly (not recommended)

**Manual Mode** (toggle switch):
1. Admin writes the emotional state directly
2. Should already be emotionally framed — describe feelings, not events
3. Skips both AI passes entirely

## How It Gets Used At Generation Time

In `ai.ts` → `runGenerationJob`:
```typescript
const emotionalZeitgeist = job.emotionalZeitgeist || zeitgeist.summary;
```
This is injected into the user message as:
```
COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
${emotionalZeitgeist}
This is how the world FEELS right now — not what happened.
Map this emotional climate to the sign's Likely Felt State.
Never reference news events, countries, or headlines in the output.
```

## Data Model

```
zeitgeists table:
  title: string              // e.g., "Week of March 10 — Economic Uncertainty"
  isManual: boolean          // true = admin wrote directly, false = AI-synthesized
  archetypes: string[]       // the raw world events (AI mode only)
  summary: string            // the final text (emotional translation or manual text)
  createdBy: Id("users")
  createdAt: number
```
Index: `by_createdAt` on `["createdAt"]`, ordered desc, capped at 50

## Generation Job Storage

When a zeitgeist is selected for generation, the job stores both versions:
```
generationJobs:
  rawZeitgeist: string          // original events/summary
  emotionalZeitgeist: string    // the emotional translation (what goes into the prompt)
```

## Anti-Pattern Defenses

- Prompt injection warning: the UI checks for suspicious patterns (`ignore previous`, `disregard all`, etc.) and warns the admin
- The zeitgeist text is placed in the **user** message (not system) to reduce injection risk
- AI synthesis prompts explicitly forbid: country names, political figures, specific events, and the words: systemic, macro, geopolitical, structural

## History

The bottom of the page shows the 10 most recent zeitgeists. There's no delete or edit — zeitgeists are append-only records. If you make a mistake, just create a new one.
