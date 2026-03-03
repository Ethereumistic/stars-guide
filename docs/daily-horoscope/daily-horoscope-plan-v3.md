# Stars.Guide: Daily Horoscope Engine v3 — Full Implementation Plan

## Overview

This plan upgrades the horoscope generation engine from a news-mapped sign-profile system to an emotionally intelligent, astronomically grounded, psychologically precise engine. The goal: horoscopes that make readers feel *witnessed* — not just informed.

Every change in this plan serves one design principle:

> **Emotionally specific + Circumstantially universal = Feels personal**

Name the feeling precisely. Leave the circumstance open. The reader fills in the blank with their own life. That's empathy at scale.

---

## What's Changing and Why

| Problem | Root Cause | Fix |
|---|---|---|
| Sign profiles describe personality, not felt state | Static persona copy doesn't create the "it's reading my life" feeling | Add current emotional state priming per sign, driven by Zeitgeist |
| Zeitgeist is raw news, not emotional reality | News headlines ≠ how people feel | Add mandatory Emotional Translation Layer before generation |
| Few-shot example breaks the spell | References "the chaotic news this week" — a tell that copy is generic | Rewrite to reference felt experience only, never world events directly |
| Planet descriptions don't bridge to copy | List format gives LLM labels, not language | Replace with felt-language translation guide |
| Houses section is dead weight | No birth chart = houses irrelevant for mundane horoscopes | Remove entirely |
| Hook instruction models only one archetype | Anxiety-mirror hook repeated daily = copy fatigue by day 7 | Add all 4 hook archetypes with examples, managed via dedicated admin page |
| No continuity mechanism | Each day generated in isolation, no through-line | Promote moon phase cycle to primary narrative driver |
| Vagueness principle not stated explicitly | LLM defaults to generic platitudes without explicit instruction | Add "emotionally specific + circumstantially universal" as a named rule |
| Narrative arc (Impact→Processing→Pivot→Integration) adds token cost with low ROI in single-day mode | Arc rules bloat the system prompt and confuse single-day generation | Replace with a simpler Moon Phase-anchored tone guide; arc becomes optional metadata only |
| No retrograde awareness | Planet motion direction fundamentally changes the felt energy — ignoring it produces inaccurate copy | Add retrograde detection to `astronomyEngine.ts`; inject direction status into Cosmic Weather prompt block |

---

## Step 1 — Rewrite the Zeitgeist Engine: The Emotional Translation Layer

This is the highest-leverage change in the entire plan. Currently the Zeitgeist is either admin-typed bullet points or a manually written paragraph of news events. This is the wrong input format for generating emotionally resonant copy.

### The Problem

> ❌ Current Zeitgeist: "Massive tech layoffs, oil price surge, AI regulation debates"

This gives the LLM headlines. Headlines don't generate empathy. They generate journalism.

> ✅ Target Zeitgeist: "There's a widespread, low-grade anxiety about professional stability right now. A lot of people are quietly asking 'is my position safe?' even when nothing concrete has happened. Financial stress is up. People are craving certainty in a moment that isn't offering any. Underneath the busyness, there's a tiredness — like everyone's been running a race they didn't sign up for."

This gives the LLM a collective emotional state. That's what gets translated into personal copy.

### Implementation

Add a **two-pass Zeitgeist system**. The admin inputs raw events as before. Before generation begins, a separate LLM call converts those events into an Emotional Translation.

**New Convex internal action: `synthesizeEmotionalZeitgeist`**

```typescript
// convex/internal/zeitgeist.ts

export const synthesizeEmotional = internalAction({
  args: { rawEvents: v.string() },
  handler: async (ctx, { rawEvents }) => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "x-ai/grok-4.1-fast",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are an expert at translating world events into collective emotional states.
Your output is used as context for horoscope generation. It must describe how an average person
is FEELING right now — not what happened in the news.

Rules:
- Never mention country names, political figures, or specific events
- Never use the words: systemic, macro, geopolitical, structural
- Focus exclusively on felt human experience: fears, cravings, confusion, quiet hopes
- Write 4-6 sentences of plain, warm, human prose
- Output ONLY the emotional translation. No preamble, no labels.`
          },
          {
            role: "user",
            content: `World events this week:\n${rawEvents}\n\nDescribe the collective emotional state.`
          }
        ]
      })
    });
    const data = await response.json();
    return data.content[0].text;
  }
});
```

**Update the `generationJobs` flow:**

1. Admin inputs raw events → stored as `rawZeitgeist`
2. Before `runGenerationJob` fires, call `synthesizeEmotional` → store result as `emotionalZeitgeist`
3. Inject `emotionalZeitgeist` (not `rawZeitgeist`) into the horoscope generation prompt
4. Store both in the job record for auditability

**Schema addition to `generationJobs` table:**

```typescript
rawZeitgeist: v.string(),
emotionalZeitgeist: v.optional(v.string()), // populated before generation starts
```

### Manual Override

Manual Zeitgeist mode bypasses the translation pass entirely — the admin's text is assumed to already be emotionally framed. Add a checkbox in the admin UI: **"This is already emotionally written (skip translation)"**.

---

## Step 2 — Rewrite the Master Context: Sign Profiles

Replace the current "Their World" + DO/DON'T structure with a three-layer profile per sign:

1. **The Likely Felt State** — what this sign is probably feeling given collective anxiety right now. Written as emotional priming for the LLM. This is dynamic — it should acknowledge that the Zeitgeist will shift what's most relevant.
2. **The Hook Target** — what emotional nerve the opening question should poke. Not a personality trait — a current feeling.
3. **The One Action** — the single most grounding thing this sign can do today. Concrete, physical, doable in under an hour.

The DOs and DON'Ts are kept but reframed from personality rules to *copy rules* — they tell the LLM how to write, not who the person is.

**New profile format (example: Taurus):**

```
TAURUS (Earth: The Builder)

Likely Felt State:
When the world feels unstable, Taurus people feel it in their body first — a tightening,
a need to check on their things, a quiet inventory of what they have and what they might lose.
Right now they are probably carrying a low-grade financial anxiety even if nothing concrete
has gone wrong. They want to feel their feet on the ground.

Hook Target:
The gap between how stable things look on the outside and how unsettled they feel on the inside.

The One Action:
Something physical and countable: check their bank balance, reorganise a drawer, cook a meal
from scratch. Anything that proves the immediate world is still under their hands.

Copy Rules:
DO: Name the body sensation (tightening, heaviness, the urge to stockpile). Give one
    concrete, touchable action. End on quiet confidence, not forced optimism.
DON'T: Use the word "chaos." Don't tell them to embrace uncertainty. Don't be abstract.
       Don't reference world events directly — only their felt response to them.
```

Apply this new three-layer format to all 12 signs.

---

## Step 3 — Add the Four Hook Archetypes

The current system instructs the LLM to open with "a punchy, conversational, direct question" but only models one type. This produces copy fatigue within a week — every horoscope starts to sound the same.

Add the following to the master context as a named section:

### The Four Hook Archetypes

Instruct the LLM to rotate through these across the days of a multi-day generation run. For single-day generation, choose the archetype most appropriate to the emotional theme.

**1. The Mirror Hook**
Names something the reader is probably already doing or feeling. The reader's reaction should be "...how did you know?"

> *"Still refreshing that one app, hoping the news has changed?"*
> *"You've been moving fast lately — but do you actually know where you're going?"*

**2. The Permission Hook**
Gives the reader explicit permission to feel or do something they've been denying themselves. Deeply validating.

> *"You're allowed to not have a plan right now."*
> *"Resting isn't falling behind. You know that, right?"*

**3. The Gentle Provocation**
Challenges a pattern with warmth — not accusation. Creates a moment of self-recognition.

> *"When did you last do something just because it felt good — not because it was productive?"*
> *"You keep waiting for the right moment. What if this is it?"*

**4. The Observation Hook**
Describes the reader's current situation back to them as if the horoscope has been watching. Creates the strongest "it's reading my life" response.

> *"Something shifted for you recently. You might not be able to name it yet, but you feel it."*
> *"You've been carrying something you haven't told anyone about."*

**Rotation rule:**

For **single-day generation** (the default mode, especially during beta): the admin selects the hook archetype manually from the Hook Manager page, or the system picks the archetype that best matches the current moon phase frame. No arc logic is applied.

For **multi-day generation** (optional, when generating 3–7 days at once): the hook archetypes rotate across days based on position, not a named arc. The labels Impact/Processing/Pivot/Integration are dropped entirely — they added prompt weight without meaningfully changing output. Instead, the moon phase frame already supplies the emotional direction for each day. The hook rotation simply ensures variety:

```
Day 1: Mirror Hook
Day 2: Permission Hook
Day 3: Observation Hook
Day 4: Gentle Provocation
Day 5: Mirror Hook
Day 6: Observation Hook
Day 7: Permission Hook
```

The system injects only the assigned hook type for the day being generated — not the full rotation table. One line per date in the prompt: `"2026-03-10: Use the Mirror Hook."`

---

## Step 4 — Promote Moon Phase to Primary Narrative Driver + Add Retrograde Detection

### 4a. Moon Phase as Narrative Container

The moon cycle is the continuity engine that makes daily horoscopes feel like they're tracking a journey. It replaces the Impact→Processing→Pivot→Integration arc entirely. Here's why the arc was cut:

**The arc's token cost vs. output effect:**
- The arc rules added ~180 tokens to the system prompt
- In single-day generation (the primary mode during beta), the arc instructions were noise — the LLM had no multi-day context to follow them against
- The moon phase already encodes the same directional energy (building / peaking / releasing) without requiring explicit arc labelling
- Removing the arc simplifies the prompt, reduces hallucinated "pivot energy" references, and lets the moon phase do its job cleanly

The moon phase is now the **only** structural narrative signal. It sets the emotional tone for the day. Everything else — Zeitgeist, sign profile, cosmic weather — fills that container.

```
MOON PHASE NARRATIVE FRAMES — always establish this as the emotional backdrop first:

New Moon (0–7 days after):
Frame: Quiet beginnings. Things are seeding underground. Energy is inward, not outward.
Language: "Something is starting, even if you can't see it yet." "This is a reset, not a failure."
Avoid: Big dramatic declarations. This phase is subtle.

Waxing Crescent / First Quarter (7–14 days):
Frame: Building. Effort is accumulating. Results aren't visible yet but the work matters.
Language: "Keep going. The momentum is real even when it's invisible." "You're further along than you think."
Avoid: Impatience. Don't reinforce the urge to quit before the payoff.

Waxing Gibbous (14–17 days):
Frame: Almost there. Refinement energy. The gap between where you are and the goal feels frustrating.
Language: "You're in the final stretch. Don't change the plan now." "Finish the thing."
Avoid: Introducing new directions. This phase is completion energy.

Full Moon (17–20 days):
Frame: Peak intensity. What's been underground surfaces. Emotions are amplified. Revelations happen.
Language: "Something is coming to a head." "You're about to see something clearly that's been blurry."
Avoid: Minimising the emotional intensity. Let it be big.

Waning Gibbous / Last Quarter (20–27 days):
Frame: Release. What worked, keep. What didn't, let go. Integration energy.
Language: "What are you still carrying that you don't actually need?" "You get to put some of this down."
Avoid: Starting new things. This phase is the exhale.

Waning Crescent (27–29 days):
Frame: Rest. The cycle is ending. Quiet restoration before the next beginning.
Language: "This is the pause before the next chapter." "Rest is not nothing. It's preparation."
Avoid: Urgency, action, big moves. This phase is stillness.
```

**Implementation:** A `getMoonPhaseFrame(phaseName: string): string` helper in `astronomyEngine.ts` maps the phase name from the Cosmic Weather snapshot to the correct frame text. This gets injected into the prompt as the first context block after the system message.

---

### 4b. Retrograde Detection

Retrograde status is fundamental, not optional. A planet in retrograde **internalises its core drive** — the energy turns inward, gets delayed, revisited, or blocked. Ignoring this produces copy that tells someone to push forward on Mercury retrograde (when communication is breaking down) or expand boldly on Jupiter retrograde (when growth requires inner consolidation). Readers who know astrology will notice immediately and lose trust.

**Direct planet:** energy flows outward, forward, expressively.
**Retrograde planet:** energy turns inward, slows down, demands review rather than new action.

**Implementation: Update `astronomyEngine.ts`**

Astronomy-engine supports this via ecliptic longitude delta over 24 hours. If longitude decreases day-over-day, the planet is retrograde.

```typescript
// Add to astronomyEngine.ts

const RETROGRADE_ELIGIBLE: Astronomy.Body[] = [
  Astronomy.Body.Mercury, Astronomy.Body.Venus, Astronomy.Body.Mars,
  Astronomy.Body.Jupiter, Astronomy.Body.Saturn, Astronomy.Body.Uranus,
  Astronomy.Body.Neptune,
];
// Sun and Moon are never retrograde — always excluded.

export function isPlanetRetrograde(body: Astronomy.Body, date: Date): boolean {
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const lonToday = Astronomy.EclipticLongitude(body, date);
  const lonTomorrow = Astronomy.EclipticLongitude(body, tomorrow);

  // Handle 360°→0° wraparound
  let delta = lonTomorrow - lonToday;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  return delta < 0;
}
```

**Update `CosmicWeatherSnapshot` type and `computeSnapshot`:**

```typescript
// Updated planetPositions entry shape:
{
  planet: string;
  sign: string;
  degreeInSign: number;
  isRetrograde: boolean;  // ← new
}

// In computeSnapshot, update the planet map:
const planetPositions = TRACKED_PLANETS.map((body) => {
  const ecliptic = Astronomy.EclipticLongitude(body, date);
  const { sign, degreeInSign } = longitudeToSign(ecliptic);
  const isRetrograde = RETROGRADE_ELIGIBLE.includes(body)
    ? isPlanetRetrograde(body, date)
    : false;
  return { planet: PLANET_NAMES[body], sign, degreeInSign, isRetrograde };
});
```

**Update `upsertSnapshot` schema in Convex (`convex/schema.ts`):**

```typescript
planetPositions: v.array(
  v.object({
    planet: v.string(),
    sign: v.string(),
    degreeInSign: v.number(),
    isRetrograde: v.boolean(),  // ← new
  })
),
```

**Update `formatCosmicWeatherForPrompt`:**

```typescript
function formatCosmicWeatherForPrompt(snapshot: CosmicWeatherSnapshot): string {
  const planets = snapshot.planetPositions
    .map((p) => {
      const status = p.isRetrograde ? " (retrograde — energy turns inward, review not advance)" : "";
      return `${p.planet} in ${p.sign} (${p.degreeInSign}°)${status}`;
    })
    .join(", ");
  // ... rest of function unchanged
}
```

**The master context Planet Felt-Language Guide** (Step 5) includes a retrograde variant for each planet — see that section for the copy-level translations.

---

## Step 5 — Replace Planet Descriptions with Felt-Language Translation Guide (Including Retrograde)

Remove the current one-line planet definitions. Replace with a translation guide that gives the LLM actual copy language — both direct and retrograde variants — for every planet.

```
PLANET FELT-LANGUAGE GUIDE

For each planet, use the DIRECT language when isRetrograde = false.
Use the RETROGRADE language when isRetrograde = true.
Never name the planet directly in the copy. Translate always.

Sun (never retrograde):
"How you're showing up in the world right now."
"The version of yourself you're presenting vs. who you actually are."

Moon (never retrograde):
"What your gut is telling you." "The feeling underneath the feeling."
"What you need to feel okay today."

Mercury:
DIRECT: "The conversations that need to happen." "What you need to say out loud."
"Ideas that are ready to move."
RETROGRADE: "The conversation you keep replaying in your head." "Something from the past
asking to be reconsidered." "Now is for reviewing, not announcing."

Venus:
DIRECT: "What — or who — you're leaning toward." "What would actually feel good right now."
RETROGRADE: "What you thought you wanted, reconsidered." "An old connection resurfacing."
"This is a time to reassess what you value, not to start something new."

Mars:
DIRECT: "The itch you can't scratch." "The frustration that's actually fuel."
"What you're fighting for or fighting against."
RETROGRADE: "The energy that keeps turning back on itself." "Pushing harder isn't the answer
right now — the block is internal." "What old anger or unfinished business needs attention?"

Jupiter:
DIRECT: "The part of you that wants more than this." "Where life is trying to open a door."
RETROGRADE: "The growth that's happening quietly, invisibly." "This isn't the time to expand
outward — it's the time to deepen what you already have."

Saturn:
DIRECT: "The thing you've been avoiding." "The boundary you need to set or respect."
RETROGRADE: "A rule you made for yourself that might need revisiting." "Old responsibilities
coming back around." "What structure in your life has stopped working?"

Uranus:
DIRECT: "The update you didn't ask for." "What you thought was settled that suddenly isn't."
RETROGRADE: "The change that's happening on the inside before it shows up on the outside."
"Don't force the breakthrough. It's already in motion."

Neptune:
DIRECT: "What's hard to see clearly right now." "What you're sensing but can't prove yet."
RETROGRADE: "The fog is lifting on something." "An illusion you've been holding onto is
dissolving — let it." "Clarity is coming, but only if you stop pretending."

Pluto:
DIRECT: "What's changing at the deepest level." "The old version of this situation dying."
RETROGRADE: "The transformation that's happening in the shadows." "Something you buried is
asking to be looked at." "This isn't regression — it's excavation."

USAGE RULE: Only reference a planet if it appears in the COSMIC WEATHER block as active
(in an aspect to the ruling planet of the target sign, or directly ruling the sign).
Never force a planet reference. Translate — never name the planet in the copy.
```

---

## Step 6 — Remove the Houses Section

Delete Section 4 (The House Arenas) from the master context entirely.

**Reason:** Mundane horoscopes operate without birth charts. Houses require a natal chart to be meaningful. Including them in the generation context adds ~400 tokens of noise that the LLM may incorrectly pattern-match against, producing vague "12th house energy" references that mean nothing to a general reader. Remove cleanly.

---

## Step 7 — Rewrite the Few-Shot Examples

The current example breaks the spell by directly referencing "the chaotic news this week." The new examples demonstrate felt-language only, with hook archetypes labelled for reference but arc labels (Impact/Processing/Pivot/Integration) removed entirely.

**The Golden Rule for examples:**

> Never reference the world event. Only reference the emotional consequence of living through it.

**New Few-Shot Example — Single Day (Taurus):**

*Cosmic Weather: Waxing Gibbous Moon, 82%. Mars in Gemini (direct). Saturn in Pisces (retrograde).*
*Emotional Zeitgeist: widespread professional anxiety, craving for certainty, collective exhaustion.*
*Hook assigned: Mirror Hook.*

> "You've been quietly taking inventory, haven't you? Checking on your things, your savings, your plan — just to make sure it's still there. That low-grade unease isn't irrational. Something in you knows the ground has shifted, even if you can't name what changed. Don't spiral. Do one concrete thing today: make the list of what you actually have. Stability starts with what's real, not what you're afraid of losing."
*(Character count: 432)*

**New Few-Shot Example — Multi-Day Day 4 (Taurus, Gentle Provocation hook):**

*Cosmic Weather: Waxing Gibbous Moon, 96%. Mars opposition Saturn (both active).*

> "You've been holding on tightly to the plan. That's kept you steady — but is it keeping you stuck? There's a friction building between your drive to move and something that keeps pulling you back to review, reconsider, redo. Don't throw the plan out. But loosen your grip on the parts that stopped working. There's a version of security that's built on adaptability, not just endurance. That version is available to you right now."
*(Character count: 441)*

**New Few-Shot Example — Multi-Day Day 7 (Taurus, Permission Hook):**

*Cosmic Weather: Full Moon, 100%. Saturn in Pisces (retrograde).*

> "You made it through a genuinely hard stretch. You don't have to downplay that. You stayed grounded when everything around you was unsteady — and that cost you something. Rest is the next right move, not the next goal. An old responsibility is asking to be reconsidered, not re-executed. Your only job right now is to stop white-knuckling and let what you built actually hold you."
*(Character count: 406)*

---

## Step 8 — Add the Core Writing Principle to Section 1

Add this as a named, bolded rule at the top of the System Rules section. It must be the first thing the LLM reads:

```
**THE CORE PRINCIPLE — READ THIS FIRST:**

Every horoscope must feel personally relevant to a stranger you've never met.
The way you achieve this is not through vagueness. It is through emotional precision.

Name the feeling exactly. Leave the circumstance open.

WRONG: "Big changes are coming." (emotionally vague, circumstantially vague — means nothing)
WRONG: "The job market instability is affecting your finances." (circumstantially specific — breaks universality)
RIGHT: "That low-grade unease you've been carrying around? It's trying to tell you something." 
       (emotionally precise — the reader fills in what the unease is about)

The reader's brain is your co-writer. Give it an emotionally precise feeling to attach to.
It will do the rest.
```

---

## Step 9 — Updated Prompt Payload Architecture

With all changes in place, the full generation prompt structure becomes:

```typescript
const payload = {
  model: modelId,
  messages: [
    {
      role: "system",
      content: masterContext  // Updated v3 master-astrology-context.md
    },
    {
      role: "user",
      content: `
TARGET SIGN: ${sign}
TARGET DATES: ${dates.join(", ")}

MOON PHASE CONTEXT:
${moonPhaseFrame}
This is the emotional container for all horoscopes in this run.
Every piece of copy should be coloured by this phase's energy.

COSMIC WEATHER FOR ${targetDate}:
${formatCosmicWeatherForPrompt(cosmicWeather)}
Translate relevant planetary data into felt language per the Planet Felt-Language Guide.
Never name a planet directly in the copy. Never list positions robotically.

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
${emotionalZeitgeist}
This is how the world FEELS right now — not what happened.
Map this emotional climate to the sign's Likely Felt State.
Never reference news events, countries, or headlines in the output.

HOOK ROTATION FOR THIS RUN:
${hookRotationInstructions}
Follow the archetype assigned to each day's position in the narrative arc.

TASK:
Generate horoscopes for ${sign} for the dates above.
Each horoscope must feel like it was written specifically for this reader, today.
Apply the Core Principle: emotionally specific, circumstantially universal.
Output ONLY valid JSON matching the schema in the system prompt.
      `
    }
  ],
  temperature: 0.75,
  max_tokens: 2048,
  response_format: { type: "json_object" }
};
```

Note: temperature raised from 0.7 to 0.75 to allow more natural language variation while staying within the validated output schema.

---

## Step 10 — Admin UI Updates

### 10a. Zeitgeist Input Panel

Add a two-panel display after the admin submits raw events:
- **Left panel:** Raw events as typed
- **Right panel:** Emotional Translation (auto-generated, editable before generation fires)
- **"Regenerate Translation"** button in case the first pass isn't right
- **"Skip Translation"** checkbox for manual override mode

### 10b. Generation Preview

Before the admin fires the full 12-sign job, show a **single-sign preview**:
- Pick one sign (default: Taurus — the most legible test case)
- Generate one day
- Display the output with character count
- Let the admin approve or tweak the Zeitgeist translation before committing the full run

This catches bad Zeitgeist translations before they contaminate all 12 signs.

### 10c. Cosmic Weather Card (from v2 plan)

Display the day's planetary snapshot — including retrograde status for each planet — alongside the Zeitgeist panel so the admin sees exactly what the AI will see before triggering generation.

### 10d. Hook Manager Page — `app/admin/hooks/page.tsx`

A dedicated admin page for full granular control over hook archetypes. This is a first-class feature, not a settings drawer.

**Page structure:**

**Section 1: Active Hook Library**
A card grid showing all currently active hook archetypes. Each card displays:
- Hook type name (e.g. "The Mirror Hook")
- Description (one sentence)
- 2–3 example lines (editable inline)
- Toggle: Active / Inactive
- Edit button → opens a slide-over editor

**Section 2: Add New Hook Archetype**
A form with:
- Name field
- Description field
- 3 example lines (to show the LLM the target standard)
- Save as Draft / Publish buttons

**Section 3: Hook Assignment**

Two modes:

*Auto mode (default):* The system selects the hook archetype based on the current moon phase frame. Mapping is configurable:
```
New Moon → Permission Hook
Waxing → Mirror Hook
Full Moon → Observation Hook
Waning → Gentle Provocation
```

*Manual mode:* Admin selects the hook archetype for the next generation run from a dropdown. Selection persists until manually changed or until the generation job completes.

**Convex schema addition for hooks table:**

```typescript
hooks: defineTable({
  name: v.string(),
  description: v.string(),
  examples: v.array(v.string()),  // 2–5 example lines
  isActive: v.boolean(),
  moonPhaseMapping: v.optional(v.string()),  // e.g. "full_moon"
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_active", ["isActive"]),
```

**Seed the four initial hooks on first deploy.** The generation pipeline reads active hooks from the DB, not from hardcoded values. This means adding a new hook archetype in the admin UI immediately affects the next generation run — zero deploys required.

**Hook injection into the generation prompt:**

```typescript
// Fetch the assigned hook for this run
const hook = await ctx.runQuery(internal.hooks.getAssignedHook, { date, moonPhase });

// Inject into user message
`HOOK ARCHETYPE FOR THIS HOROSCOPE:
Type: ${hook.name}
Description: ${hook.description}
Examples of this hook style:
${hook.examples.map((e, i) => `${i + 1}. "${e}"`).join("\n")}
Open the horoscope with this hook type. Do not copy the examples — use them as tone reference only.`
```

---

## Full File Change Summary

| File | Action | Notes |
|---|---|---|
| `convex/schema.ts` | Update | Add `cosmicWeather` table, `hooks` table, update `generationJobs` with `rawZeitgeist` + `emotionalZeitgeist`, add `isRetrograde` to planet positions |
| `convex/lib/astronomyEngine.ts` | **Create** | `computeSnapshot`, `isPlanetRetrograde`, `getMoonPhaseFrame` helpers |
| `convex/internal/cosmicWeather.ts` | **Create** | `getForDate`, `upsertSnapshot`, `computeAndStore` |
| `convex/internal/zeitgeist.ts` | **Create** | `synthesizeEmotional` — the Emotional Translation Layer |
| `convex/internal/hooks.ts` | **Create** | `getAssignedHook`, `listActive`, `upsert`, `seed` |
| `convex/internal/ai.ts` | Update | Add `getOrComputeCosmicWeather`, moon phase frame injection, hook injection, retrograde-aware prompt, updated payload |
| `convex/internal/scheduledJobs.ts` | **Create** | Date-aware cron wrapper for daily cosmic weather |
| `convex/crons.ts` | Update | Add daily Cosmic Weather cron at 00:05 UTC |
| `master-astrology-context.md` | **Full rewrite → v3** | See separate document |
| `app/admin/hooks/page.tsx` | **Create** | Hook Manager — full CRUD, moon phase mapping, manual/auto assignment |
| `app/admin/zeitgeist/page.tsx` | Update | Two-panel Zeitgeist UI, translation preview, skip checkbox |
| `app/admin/generate/page.tsx` | Update | Single-sign preview, hook selection display before full run |
| `app/admin/dashboard/page.tsx` | Update | Cosmic Weather card with retrograde indicators |

---

## Non-Goals for v3

- No per-user personalisation (requires auth + birth data — separate roadmap item)
- No social sharing card generation (downstream feature)
- No A/B testing framework (validate the formula first, then optimise)

---

## Key Invariants

1. The emotional Zeitgeist — not the raw events — is what enters the generation prompt. Always.
2. No country names, political figures, or specific headlines ever appear in generated copy. The Emotional Translation Layer enforces this structurally, not just via instruction.
3. Moon phase is always the first context layer the LLM reads after the system prompt. It sets the container before any sign-specific or world-specific context is applied.
4. The Impact→Processing→Pivot→Integration arc is removed. Moon phase frame is the sole narrative direction signal.
5. Retrograde status is computed and injected for every eligible planet on every generation run, no exceptions.
6. Hook archetypes are DB-driven. New archetypes added via the Hook Manager are live immediately — no deploy required.
7. The Core Principle ("emotionally specific + circumstantially universal") appears at the top of the system prompt as a named, bolded rule — not buried in a list.
8. Planet names never appear verbatim in generated horoscope copy. They are always translated into felt language — with retrograde variant applied when applicable.
9. Single-day generation is the default mode during beta. Multi-day generation is available but hook rotation is optional, not required.