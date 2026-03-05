# PHASE 1 — Content Architecture
## Categories · Template Questions · Follow-up Questions

---

## Overview

This document defines the complete content layer of Oracle:
- 6 **Categories** (matching the UI badges)
- 2 **Template Questions** per category (12 total) — high-curiosity, universally relatable
- 2–3 **Follow-up Questions** per template — deterministic, hardcoded, targeting **third-party context only**

### The Critical Rule: We Already Know Who the User Is

Every Oracle user has provided their full birth data at onboarding (`users.birthData`): date of birth, exact birth time, and geographic birth location. From this we already know their Sun sign, Moon sign, Rising sign, and can calculate their full natal chart via `astronomy-engine`. **We never ask the user about themselves.**

Follow-up questions serve exactly one purpose: **gathering astrological and situational data about another person** involved in the question. If a template question is purely about the user's inner world (career path, self-identity, spiritual gifts), it is flagged `requiresThirdParty: false` and skips follow-ups entirely — going directly to the Oracle with the user's natal profile as context.

All content is **seeded into Convex on first deploy** and fully editable from `/admin/oracle/*`.

The selection principle for template questions: **every human alive has wondered this at some point**. Questions must trigger emotional resonance before the user even reads the answer.

---

## Categories + Template Questions + Follow-ups

---

### 🧍 SELF

**Template 1: "Why do I keep self-sabotaging the things I want most?"**
`requiresThirdParty: false` — follow-ups skipped, Oracle uses natal profile directly.

> Oracle will draw on the user's Saturn placement, Pluto aspects, 8th/12th house themes, and South Node to interpret this pattern astrologically.

---

**Template 2: "Am I living as my true self, or performing a version of myself for others?"**
`requiresThirdParty: false` — follow-ups skipped, Oracle uses natal profile directly.

> Oracle will draw on the Sun/Rising tension, Neptune aspects, and 1st/12th house themes.

*Optional single follow-up (non-astrological context):*
1. In what environment does the "performance" feel most intense? *(options: Work/Career, Family, Romantic relationships, Social settings, Online/public)*

---

### ❤️ LOVE

**Template 3: "Will I find my person — or have I already met them and let them go?"**
`requiresThirdParty: false` — focuses on the user's own Venus/7th house pattern.

*Optional single follow-up (situational, not astrological):*
1. What is your current relationship status? *(options: Single and searching, In something complicated, Recently ended something, In a relationship but questioning it)*

---

**Template 4: "Why do I keep attracting the same type of person who ends up hurting me?"**
`requiresThirdParty: false` — the pattern is in the user's own chart (Venus, Mars, 7th/8th house).

*Optional single follow-up:*
1. How would you describe the pattern in the people you attract? *(options: Emotionally unavailable, Controlling or jealous, Inconsistent — hot and cold, Charming then disappearing, Someone who needs saving)*

---

**Template 5 (LOVE): "Is this the right person for me, or am I holding on out of fear?"**
`requiresThirdParty: true` — Oracle needs the other person's chart data for synastry.

Follow-up questions:
1. Do you know this person's date of birth? *(options: Yes — I know it, Approximately — I know the year/month, No — I don't know it)*
   - If yes: *What is their birth date?* *(date picker)*
   - If approximate: *What year were they born?* *(year input)*
2. Do you know their Sun sign, Moon sign, or Rising sign? *(free text — enter any they know, e.g. "Sun Scorpio, Moon unknown")*
3. How long have you been in this dynamic? *(options: Less than 6 months, 6 months – 2 years, 2–5 years, 5+ years)*

---

### 💼 WORK

**Template 6: "Am I in the right career, or am I wasting my potential?"**
`requiresThirdParty: false` — career path is in the user's Midheaven, 10th house, North Node.

*Optional single follow-up (situational context):*
1. What feeling dominates your workday right now? *(options: Boredom, Anxiety, A sense of emptiness, Occasional sparks of meaning, Mostly fine but something's missing)*

---

**Template 7: "Is this the year I finally take the leap and bet on myself?"**
`requiresThirdParty: false` — timing question, Oracle uses current transits against natal chart.

*Optional single follow-up (clarifies what "the leap" is):*
1. What is the leap you're considering? *(options: Starting a business, Leaving a stable job, Going freelance/independent, A major creative project, Moving to a new place, Something else)*

---

### 👥 SOCIAL

**Template 8: "Why do I feel deeply alone even when surrounded by people?"**
`requiresThirdParty: false` — Moon placement, 11th/4th house tension, Neptune aspects.

> No follow-ups. Oracle uses natal profile directly. Asking more of someone who already feels unseen is the wrong UX move.

---

**Template 9: "Is this friendship or relationship worth saving, or has it run its course?"**
`requiresThirdParty: true` — Oracle benefits from the other person's chart for compatibility analysis.

Follow-up questions:
1. Is this a friendship, romantic relationship, or family connection? *(options: Close friendship, Romantic partner or ex, Family member, Work relationship)*
2. Do you know their birth date or Sun sign? *(options: Yes — I know their birth date, I only know their Sun sign, I don't know either)*
   - If birth date: *(date picker)*
   - If Sun sign only: *(sign picker)*
3. What changed in this relationship? *(options: A specific event or betrayal, We gradually drifted, They changed significantly, I changed and outgrew it, Both of us changed)*

---

### 🌀 DESTINY

**Template 10: "What is my actual life purpose — am I on the right path?"**
`requiresThirdParty: false` — North Node, Midheaven, Saturn return timing, Chiron placement.

> No follow-ups needed. The natal chart is the entire answer to this question. Oracle uses the full calculated profile.

---

**Template 11: "Are the hardships I've faced meaningless — or are they shaping me for something?"**
`requiresThirdParty: false` — Chiron, Pluto transits, 12th house, Saturn cycles.

*Optional single follow-up (so Oracle can contextualize the domain):*
1. What area of life has the hardship primarily been in? *(options: Health or body, Loss and grief, Betrayal by someone trusted, Financial collapse, Identity — not knowing who I am, Multiple areas at once)*

---

### 🔮 SPIRITUALITY

**Template 12: "Do I have a spiritual gift I'm not fully aware of or using?"**
`requiresThirdParty: false` — Neptune, Pisces placements, 12th house, Moon aspects.

> No follow-ups. Oracle uses natal profile directly — the answer is entirely in the chart.

---

**Template 13 (SPIRITUALITY): "Is there a past life or karmic pattern playing out in my life right now — and is it connected to someone specific?"**
`requiresThirdParty: true` — when karma involves a specific person, their chart data deepens the reading.

Follow-up questions:
1. Is there a specific person you feel this karmic pattern is tied to? *(options: Yes — a specific person, I sense it but can't name a person, It feels more like a life pattern than a person)*
   - If yes: Do you know their birth date or Sun sign? *(date picker or sign picker)*
2. What makes you feel this pattern is karmic? *(options: Inexplicable instant connection or recognition, A painful pattern that keeps repeating, An irrational fear or pull I can't explain, Vivid dreams involving this person or theme, Just a very strong feeling)*
3. Which area of life is this pattern most active in? *(options: Love and relationships, Family and lineage, Career and calling, Health and body, Identity and self-worth)*

---

## Implementation Notes

### `requiresThirdParty` Flag
Every template has a boolean `requiresThirdParty` field in the `oracle_templates` table. When `false`, the follow-up collection phase is skipped entirely and Oracle is invoked immediately with the user's natal profile. This flag is editable from admin.

### Follow-up Question Types (revised)
Since we no longer ask users about their own astrological data, the remaining types are:

- `single_select` — clickable pill options (most common)
- `multi_select` — multiple toggleable pills
- `free_text` — short text for free-form answers
- `date` — date picker (for third party's birth date)
- `sign_picker` — 12-sign zodiac picker (when user only knows third party's Sun sign)
- `conditional` — a question that only appears based on the previous answer (e.g. "if yes, enter their birth date")

`date_time` and `age_range` types are **removed** — we never need birth time or age range for a third party with this level of precision, and birth time for third parties is rarely known.

### Max Follow-ups Per Template
Hard limit: **3 follow-up questions** (including conditional branches). Enforced at the Convex mutation level — `createFollowUp` throws if template already has 3 active follow-ups.

### Required vs Optional
- `requiresThirdParty: true` templates: the "do you know their birth date?" question is always `isRequired: false` — Oracle answers with less astrological precision if the third party's data is unknown
- Situational follow-ups (relationship status, career domain) are always `isRequired: false`
- Oracle must gracefully handle all skipped optionals

### Context Assembly Output (third-party)
When follow-ups are completed, `contextAssembler` produces:

```
---THIRD PARTY CONTEXT---
Relationship to user: Romantic partner
Birth Date: 1995-08-22 (if provided)
Sun Sign: Leo (derived or stated)
Moon Sign: Unknown
Notes: Together 3 years, relationship drifted gradually
---END THIRD PARTY CONTEXT---
```

This is injected as Layer 5 in the prompt. See PHASE2 for full assembly logic.

### Seeding Strategy
On first deploy, run a Convex seed mutation that inserts all 13 templates (6 categories × 2, plus 1 additional for Love and Spirituality's third-party variants) with their follow-ups. Each record gets `isActive: true` and `isDefault: true`.