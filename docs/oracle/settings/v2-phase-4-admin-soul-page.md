# v2-phase-4-admin-soul-page.md
## New `/admin/oracle/soul` Page

---

## Overview

This page replaces the soul prompt editing that currently lives inside `/admin/oracle/context-injection`. It gives each of the 7 soul documents its own dedicated editor panel, with independent versioning per document.

Add `soul` to the admin sidebar navigation under Oracle:
```
/admin/oracle/
/admin/oracle/categories
/admin/oracle/templates
/admin/oracle/follow-ups
/admin/oracle/context-injection
/admin/oracle/soul              ← NEW
/admin/oracle/settings
```

---

## Page Layout

Left sidebar (within the soul page): 7 document tabs, stacked vertically.

```
[ Identity          ]
[ Tone & Voice      ]  ← default selected on page load
[ Capabilities      ]
[ Hard Constraints  ]
[ Special Questions ]
[ Output Format     ]
[ Closing Anchor    ]
```

Right panel: the editor for the selected document.

---

## Each Document Editor (Right Panel)

Every document has the same editor structure:

**Header row:**
- Document name (e.g., "Tone & Voice")
- Version badge: `v{number}` — current active version
- Last saved: "2 hours ago by admin@stars.guide"
- Three buttons: `Save`, `View History`, `Preview in Full Prompt`

**Editor:**
- Full-width monospace textarea, minimum 300px height, grows with content
- No markdown rendering in the editor — raw text only
- Character count shown bottom-right of textarea (not a hard limit, just informational)

**Guidance panel** (collapsible, below the editor):
- Each document has a short purpose description and 2–3 "what belongs here / what doesn't" notes
- Collapsed by default to save vertical space, user expands if needed
- This is static text, not editable

---

## Guidance Panel Content Per Document

**Identity:**
> What belongs: Who Oracle is, what it does, its relationship to astrology and to the user. Keep it short — this sets the frame, it shouldn't be long.
> What doesn't belong: Tone instructions (→ Tone & Voice), capability details (→ Capabilities), rules (→ Hard Constraints).

**Tone & Voice:**
> What belongs: How Oracle sounds. Sentence style, word choice rules, banned phrases, emotional register, how to handle different user moods.
> What doesn't belong: What Oracle can do (→ Capabilities), what Oracle must never do (→ Hard Constraints).
> Warning: This is the highest-leverage document for user experience. Changes here affect every single response Oracle gives.

**Capabilities:**
> What belongs: What data Oracle has access to and how to use it. What Oracle is genuinely good at. Where its limits are as a product (not as a safety matter — safety is hardcoded).
> What doesn't belong: Safety prohibitions (those are hardcoded, not here). Tone instructions.

**Hard Constraints:**
> What belongs: Product-level behavioral rules. Quality floors. How Oracle handles edge cases as a product (not safety edge cases).
> What doesn't belong: Safety prohibitions — those are hardcoded and cannot be changed here. If you want to add a safety rule, it requires a code change to `lib/oracle/safetyRules.ts`.
> Note at top of guidance: "The hardcoded safety rules always run above this document. This document shapes Oracle's personality and product behavior — not its safety rails."

**Special Questions:**
> What belongs: Specific question types that need special handling — horoscope requests, retrograde questions, timing questions, compatibility requests, prediction requests. The validation logic for what counts as a valid zodiac sign.
> What doesn't belong: General tone or format instructions.

**Output Format:**
> What belongs: How to structure a response. When to use the default structure vs when to deviate. Formatting rules (no bullet points, paragraph length, bold usage). The length tier selection instruction.
> What doesn't belong: Tone (→ Tone & Voice), identity (→ Identity).

**Closing Anchor:**
> What belongs: A short behavioral reminder Oracle "reads" right before generating its response. Keep it under 5 sentences. It should be a grounding statement, not a list of rules.
> What doesn't belong: New rules or instructions that belong in other documents. Long text.

---

## Version History Drawer

Clicking "View History" opens a right-side drawer (not a modal — the editor should stay visible):

**Contents:**
- List of all saved versions for this specific document, newest first
- Per version row: version number, timestamp, saved by (user email), optional label
- "Label this version" inline input (editable after save)
- "Preview" button per row: expands to show the full content of that version in a read-only textarea
- "Restore" button per row: opens a confirmation dialog — "Restore v{N}? This will make it the active version and save the current version as a new entry in history." Confirm → restores, drawer closes, editor shows restored content.

Drawer slides in from the right. Does not cover the left document tab list.

---

## "Preview in Full Prompt" Modal

This is the most useful feature on this page for quality control.

Clicking "Preview in Full Prompt" opens a full-width modal that shows:

1. **Hardcoded Safety Block** — shown collapsed with a label "Hardcoded Safety Rules (not editable)" and a toggle to expand/collapse. Read-only.
2. **All 7 soul documents concatenated** — shown in assembly order, each section labeled with its document name and visually separated by a horizontal rule. The currently-selected document is highlighted with a subtle left border.
3. **Sample Natal Context Block** — a fake but realistic natal context using dummy data (e.g., "Sun: Aries 24°, Moon: Virgo 8°...") so the admin can see how the data will look in context.

This gives a complete view of what the LLM will receive as its system prompt. It answers the question "if I save this change, what does Oracle actually see?" without needing to run a live test.

---

## Save Behavior

Clicking "Save" on any document:
1. Validates the textarea is not empty
2. Reads the current active version number for this document key
3. Creates a new row in `oracle_prompt_versions` with the old content (backup)
4. Patches the `oracle_settings` row for this key with the new content
5. Shows a success toast: "Tone & Voice saved — v{N+1}"
6. Updates the version badge in the header

No global save — each document saves independently. This is intentional: you should be able to update tone without touching identity.

---

## Convex Functions Needed

```typescript
// In convex/oracle/soul.ts (new file):

// Query: get all 7 soul docs in one call
getAllSoulDocs()  // returns Record<soulKey, { value, version, updatedAt, updatedBy }>

// Mutation: save one soul doc (creates version, patches setting)
saveSoulDoc(key: SoulDocKey, content: string, savedBy: UserId)

// Query: get version history for one soul doc
getSoulDocVersionHistory(key: SoulDocKey)  // returns version list

// Mutation: restore a soul doc version
restoreSoulDocVersion(key: SoulDocKey, version: number)
```

`SoulDocKey` is a union type of the 7 valid keys:
```typescript
type SoulDocKey = 
  | 'soul_identity'
  | 'soul_tone_voice'
  | 'soul_capabilities'
  | 'soul_hard_constraints'
  | 'soul_special_questions'
  | 'soul_output_format'
  | 'soul_closing_anchor';
```

---

## What to Remove After This Phase

- Remove the "Soul Prompt" section from `/admin/oracle/context-injection` — it no longer exists as a single document
- Update the admin sidebar label if "context-injection" becomes confusing without the soul prompt section — it now only contains category contexts and scenario injections
- Update the Oracle admin dashboard overview card that showed "last soul prompt update" — change it to show the last update across any of the 7 soul documents

---

## Checklist for This Phase

- [ ] Create `convex/oracle/soul.ts` with `getAllSoulDocs`, `saveSoulDoc`, `getSoulDocVersionHistory`, `restoreSoulDocVersion`
- [ ] Create `/admin/oracle/soul/page.tsx` with 7-tab left nav and right panel editor
- [ ] Build the version history drawer component (reusable — same pattern as context-injection history)
- [ ] Build the "Preview in Full Prompt" modal with hardcoded safety block (collapsed), all 7 docs labeled, and dummy natal data sample
- [ ] Add guidance panel content per document (static, collapsible)
- [ ] Add `soul` link to Oracle admin sidebar navigation
- [ ] Remove soul prompt section from `/admin/oracle/context-injection`
- [ ] Update admin dashboard "last soul update" card to reflect any of the 7 docs
