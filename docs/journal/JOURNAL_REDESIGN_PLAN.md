# Journal Redesign Plan

> **Goal**: Eliminate every ounce of friction between the user's thoughts and their journal. The current composer is a wall of decisions — entry type, mood pad, emotion clusters, intensity selectors, expandable extras sections — before a single word is written. We are rebuilding the journal around one principle: **write first, enrich later**.

---

## Table of Contents

1. [Problem Diagnosis](#1-problem-diagnosis)
2. [Design Philosophy](#2-design-philosophy)
3. [Core Experience: The Stream](#3-core-experience-the-stream)
4. [The Composer Redesign](#4-the-composer-redesign)
5. [Mood & Emotion: Post-Writing Enrichment](#5-mood--emotion-post-writing-enrichment)
6. [Entry Types → Smart Detection](#6-entry-types--smart-detection)
7. [Timeline Rework](#7-timeline-rework)
8. [Detail View Rework](#8-detail-view-rework)
9. [Calendar & Search Simplification](#9-calendar--search-simplification)
10. [Settings → Consent Simplification](#10-settings--consent-simplification)
11. [Sidebar Diet](#11-sidebar-diet)
12. [Daily Prompts Integration](#12-daily-prompts-integration)
13. [Oracle ↔ Journal Touchpoints](#13-oracle--journal-touchpoints)
14. [Backend & Schema Changes](#14-backend--schema-changes)
15. [Zustand Store Simplification](#15-zustand-store-simplification)
16. [New Component Map](#16-new-component-map)
17. [Implementation Phases](#17-implementation-phases)
18. [What We Do NOT Touch](#18-what-we-do-not-touch)

---

## 1. Problem Diagnosis

### What's Broken

| # | Problem | Why It Hurts |
|---|---------|-------------|
| 1 | **4 entry types up front** — Users must pick Freeform / Check-in / Dream / Gratitude *before* they can write. This is a decision wall that kills impulse writing. | Decision paralysis at the moment of highest intent. |
| 2 | **Mood pad as mandatory first step** (for check-ins) — The 2D draggable pad is novel but imprecise on mobile and forces the user to translate feelings into coordinates before they've expressed anything. | Translating emotion to a 2D plane is cognitive work, not expressive work. |
| 3 | **14 emotions + intensity dots** — Tapping an emotion reveals 3 intensity dots. That's 42 tap targets, grouped by cluster headers that add visual noise. | Overchoice. Nobody wants to do homework when journaling. |
| 4 | **"Extras" buried behind a toggle** — Voice, photo, location, tags, energy, time-of-day are all hidden behind a collapsed "Show more" section. These features may as well not exist. | Features that are hidden are features that aren't used. |
| 5 | **6 separate routes** (`/journal/new`, `/journal/[entryId]`, `/journal/[entryId]/edit`, `/journal/calendar`, `/journal/search`, `/journal/stats`) — Users get lost. The sidebar lists all of them. Each has its own layout quirks. | Navigation sprawl with no coherent flow. |
| 6 | **Timeline cards are eye candy, not scannable** — Glow effects, watermarks, animated borders. Beautiful but hard to quickly scan 10+ entries. | Form over function in the place users spend the most time. |
| 7 | **Detail page is a data dump** — Mood card, emotion badges, energy pill, time-of-day pill, astro strip, content, dream data card, gratitude card, tags, location, voice transcript, metadata. One. Long. Scroll. | No hierarchy. Every detail gets equal visual weight. |
| 8 | **Daily prompt is a standalone card** that just sits on the timeline — no direct path to writing. The "Write about this →" link navigates away to the full composer, losing context. | Disconnected from the actual writing experience. |
| 9 | **Sidebar is doing too much** — Entry list with rename/delete dialogs, streak counter, navigation to 4 sub-pages. It's a mini-app inside a sidebar. | Cluttered navigation competes with the main content area. |
| 10 | **Zustand store holds UI state for things that should be ephemeral** — `isComposing`, `isRecording`, `interimTranscript`, search filters are all in a global store but are only relevant on one page at a time. | Unnecessary global state that complicates the mental model. |

### What's Working

- **2D mood model** — Valence × Arousal is scientifically richer than a 1-5 scale. The data model is right; the *input method* is wrong.
- **Astro context auto-attach** — Zero-friction sky snapshot. Perfect.
- **Consent-gated Oracle integration** — The consent model is solid. We simplify the UI, not the data model.
- **Cosmic Recall** — Great feature. We just improve the entry point.
- **Streak tracking** — Good motivation. We make it more visible, less intrusive.

---

## 2. Design Philosophy

### Aesthetic Direction: **Midnight Desk**

Think of opening a leather journal on a dark wooden desk under dim starlight. Paper is warm cream against deep navy. Ink is dark but legible. Accents come from the cosmos — a streak of amber, an emerald glow, a copper highlight — never fluorescent or synthetic.

**Tone**: Intimate, warm, unhurried. This is a private space. The UI should *recede* and let the words be the focus.

**Key Principles**:

1. **Write first, enrich later** — The text input appears instantly. Everything else is a gentle slide-up or popover *after* writing.
2. **Progressive disclosure** — Show the minimum. Reveal on interaction. Never front-load decisions.
3. **One flow, not six routes** — The journal lives in one view. Calendar, search, stats are tabs/modes within that view — not separate pages.
4. **Emotion as feeling, not data** — Replace coordinates and intensity dots with visual, tactile metaphors. Users should *feel* their selection, not calculate it.
5. **Cosmic warmth, not cosmic cold** — The current design is galactic-on-black (#galactic is a cool purple). We shift toward warm amber (#c8a45c), soft copper (#b87333), and cream paper (#f5f0e8) against deep navy (#0f1628). Stars are points of light, not neon.

### Typography

| Role | Font | Why |
|------|------|-----|
| **Journal text** (content input + entry body) | `Crimson Pro` (variable, serif) | Warm, humanist serif that reads like real journal ink. Variable weight for emphasis without markup. |
| **UI chrome** (labels, nav, metadata) | `DM Sans` (sans) | Clean geometric sans that doesn't compete with the serif. Sharp enough for tiny labels, warm enough for the space. |
| **Big headlines** (empty states, section titles) | `Playfair Display` | Dramatic high-contrast serif for single powerful moments. Used sparingly. |

### Color System

```
--journal-bg:       #0f1628    (deep navy)
--journal-paper:    #f5f0e8    (warm cream — used for text input background areas)
--journal-ink:      #1a1a2e    (near-black for text on paper)
--journal-accent:   #c8a45c    (amber gold)
--journal-accent2:  #b87333    (warm copper)
--journal-muted:    #5a607a    (muted slate for secondary text on dark)
--journal-border:   #1e2640    (subtle dark border)
--journal-glow:     #c8a45c    (amber glow for active states)
--mood-excited:     #34d399    (emerald)
--mood-content:     #22c55e    (green)
--mood-tense:       #f97316    (orange)
--mood-low:         #ef4444    (red)
```

**Note**: These are journal-specific overrides. The rest of the app (`--galactic`, `--primary`, etc.) stays untouched. The journal section can scope its own variables via a `.journal-theme` wrapper class or CSS cascade.

---

## 3. Core Experience: The Stream

### Current State (Broken)

6 separate routes, sidebar navigation, each page feels disconnected.

### New State: The Stream

**One URL**: `/journal` — everything lives here.

The Stream is a vertically scrolling page with these sections in order:

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌ Streak indicator ─ 7-day dots + current count ──────────────┐ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌ Quick Capture ──────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  What's on your mind?                                       │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │  (auto-expanding textarea, always focused)              │  │ │
│  │  │  ...                                                    │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌ Mood Bar ─────────────────────────────────────────────┐  │ │
│  │  │  😢 ○──○──○──○──○──○──○ 😊   (1D valence slider)      │  │ │
│  │  │  ☁️  Low    •••    🔥 High   (1D energy slider)        │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌ Emotion Chips (quick-tap, max 3) ────────────────────┐  │ │
│  │  │ [Grateful] [Peaceful] [Anxious] [Inspired] [Restless] │  │ │
│  │  │ [more ▾]                                               │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌ Action row ───────────────────────────────────────────┐  │ │
│  │  │  🎙️ Voice   📷 Photo   📍 Location   [Save Entry]    │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌ Today's Prompt (collapsible, inline) ──────────────────────┐ │
│  │  ✦ "What pattern has been repeating this week?"            │ │
│  │  [Write about this →]                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌ Timeline ──────────────────────────────────────────────────┐ │
│  │  Today                                                       │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ ▎ Excited · "Had the best conversation with..."       │  │ │
│  │  │ ▎ 12:34 PM · 🌕 Waxing Gibbous · Moon in Scorpio     │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ ▎ Content · Check-in · Grateful, Peaceful              │  │ │
│  │  │ ▎ 9:02 AM · 🌑 New Moon · Sun in Taurus               │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  Yesterday                                                   │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ ▎ Tense · "Work stress is getting to me..."            │  │ │
│  │  │ ▎ 6:15 PM · ☿ Mercury Retrograde · Mars in Gemini     │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌ Mode Bar ─────────────────────────────────────────────────────┐
│  │  [Stream]  [Calendar]  [Search]  [Insights]                  │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Key changes**:
- The composer is *inline* on the stream page, not a separate `/new` route.
- Entry types are removed from the front. The system auto-detects or the user enriches post-save.
- Calendar, search, and stats are **tabs** at the bottom of the stream, not separate routes.
- `/journal/new` continues to exist but only as a deep-link target (from Oracle prompts, external links). It renders the same `QuickCapture` component in a dedicated page context.
- `/journal/[entryId]` becomes a **slide-over panel** from the right (on desktop) or **full-screen overlay** (on mobile), keeping the stream visible underneath. No more navigating away.

---

## 4. The Composer Redesign

### Current Composer → New QuickCapture

**Remove entirely**: `entry-composer.tsx` as it exists today.

**Replace with**: `QuickCapture` — a single component that lives *inline on the stream page*.

#### QuickCapture Structure

```
QuickCapture
├── TextArea (auto-expanding, auto-focused, always ready)
├── MoodBar
│   ├── ValenceSlider (1D: negative ←→ positive)
│   └── EnergySlider (1D: low ←→ high)
├── EmotionChips (quick-tap, initial set of 8, expandable to all 14)
└── ActionBar
    ├── VoiceButton (inline, not buried in extras)
    ├── PhotoButton (inline)
    ├── LocationButton (inline)
    ├── TypeHint ("Mark as dream" / "Mark as gratitude")
    └── SaveButton
```

#### TextArea

- **Appears immediately** with a warm cream-tinted background and `Crimson Pro` font
- Auto-expanding from 3 lines to max 20 lines
- Placeholder: *"What's on your mind?"*
- Auto-focuses on page load or after pressing keyboard shortcut `/` (when on journal page)
- Title is **optional** — first line becomes the title if the user doesn't explicitly set one. Detected automatically: if the first line is short (<60 chars) and the second line starts, treat line 1 as title.
- No type selector visible. The entry type defaults to `"freeform"`. Dream and gratitude are accessed via **type hints** (see below).

#### MoodBar (replaces MoodPad)

The 2D draggable pad is replaced by **two 1D sliders** side by side. Reasoning:

- The 2D pad maps to valence (x) and arousal (y). But dragging a dot on a 2D plane on mobile is imprecise and awkward. Two sliders are faster, more precise, and more intuitive.
- **Valence slider**: 😢 ←————○————→ 😊 (negative to positive, -2 to +2)
- **Energy slider**: ☁️ Low ←————○————→ 🔥 High (calm/low energy to activated/high energy, -2 to +2 mapped linearly)
- The `moodZone` is still **derived from the two slider positions** — same formula as before. We don't lose any data fidelity.
- Both sliders are **optional** — the user can skip them entirely. An unmooded entry is valid (type `"checkin"` can be mood-only OR text-only).
- Visual: sliders use the mood zone color dynamically — as you slide, the track color shifts from grey to the zone color. When both sliders are set, the zone label + emoji appears between them: *"🤩 Excited"*

#### EmotionChips (replaces EmotionSelector)

Instead of 14 emotions grouped by cluster with intensity dots, we do:

- **Initial set**: 8 most common emotions visible as tappable chips: `Grateful`, `Peaceful`, `Inspired`, `Anxious`, `Restless`, `Confident`, `Lonely`, `Confused`
- **"More" button**: Expands to show all 14 emotions
- **Intensity is simplified**: Tap once to select (moderate/2), tap again to increase to strong/3, tap a third time to cycle back to mild/1. No separate intensity selector. The chip border thickness or fill opacity shows the level.
- **Max 3 emotions** per entry (reduced from 7 — less is more for emotional honesty)
- The cluster groupings still exist in the data model but aren't shown in the UI. The expanded list shows all emotions in a single row, sorted by the user's most-used emotions (we track this for future personalization).

#### ActionBar

- Voice, photo, location are **inline buttons** in the action bar, not buried in an "extras" section.
- **Type hints**: Small text links at the right side of the action bar:
  - *"✨ Mark as dream"* — clicking this sets `entryType` to `"dream"` and reveals the dream-specific fields (lucid toggle, dream signs, emotional tone) as a slide-down section.
  - *"🙏 Mark as gratitude"* — sets type to `"gratitude"` and shows 3 gratitude input slots.
  - Default is `"freeform"`. Check-ins are derived (no content + mood only = check-in).
- **Save button**: Always visible. Disabled only when content is empty AND mood is unset.

#### After Save: Enrichment Sheet

When the user saves an entry, they see a **brief confirmation animation** (entry card flies into the timeline). Then optionally:

- A **slide-up enrichment sheet** with:
  - Auto-detected astro context (already attached server-side, just shown now)
  - Tags input (with suggested tags based on content keywords)
  - Time-of-day (auto-detected, editable)
  - Energy level (if not set via the energy slider)
  - Edit button to jump into full edit mode
- The user can dismiss this immediately. Enrichment is **never mandatory**.

---

## 5. Mood & Emotion: Post-Writing Enrichment

### Data Model: Unchanged

The `mood` (valence × arousal), `moodZone`, `emotions[]` (key + intensity 1-3) data model remains exactly the same. The Convex schema doesn't change.

### Input Model: Two 1D Sliders

```typescript
// QuickMoodBar component
interface MoodBarProps {
  valence: number | null;   // -2 to +2
  energy: number | null;     // -2 to +2 (maps to arousal in data)
  onValenceChange: (v: number | null) => void;
  onEnergyChange: (v: number | null) => void;
  moodZone: MoodZone | null; // derived client-side
}
```

- `valence` maps directly to `mood.valence`
- `energy` maps directly to `mood.arousal` (same data, friendlier label)
- `moodZone` is derived via the same `deriveMoodZone()` function — no backend change.
- The `mood` object sent to Convex is still `{ valence, arousal }` — the rename to "energy" is purely cosmetic on the UI side.

### Emotion Input: Tap-to-cycle

```typescript
// New EmotionChips component
interface EmotionChipsProps {
  value: EmotionEntry[];
  onChange: (emotions: EmotionEntry[]) => void;
  maxEmotions?: number; // default 3
}
```

- **Tap once** → add with intensity 2 (moderate)
- **Tap again** → intensity 3 (strong)
- **Tap again** → intensity 1 (mild)
- **Tap again** → remove
- Visual: chip border thickness or inner fill dots represent intensity. No separate dot selector.

### MoodPad: Keep for Detail/Read View

The existing `MoodPad` component is **relocated, not deleted**. It becomes a read-only visualization in the entry detail view. When editing an entry, the user can open the MoodPad as a **popover** for precise adjustment. It's no longer the primary input.

---

## 6. Entry Types → Smart Detection

### Problem

Users must choose a type before writing. This is the biggest friction point.

### Solution

**Default type is always `freeform`**. Other types are accessed via type hints in the action bar:

- Entry type `checkin` is **auto-derived** at save time: if the entry has mood/emotion data but the content is empty or very short (<20 chars), it becomes a check-in. The user doesn't choose this explicitly.
- Entry type `dream` is activated by clicking *"✨ Mark as dream"* — this reveals dream-specific fields inline (lucid toggle, dream signs, emotional tone).
- Entry type `gratitude` is activated by clicking *"🙏 Mark as gratitude"* — this reveals 3-5 gratitude input slots.

### The Entry Type Selector

The 4-button type selector (`Freeform` | `Check-in` | `Dream` | `Gratitude`) in the current composer is **removed**.

Instead, the `QuickCapture` component has a subtle type indicator in the action bar:

```
│  [🎙️] [📷] [📍]            freeform ✓  ✨ dream  🙏 gratitude  │
│                                                    [Save Entry] │
```

The current type is shown with a checkmark. Clicking another type switches and reveals its specific fields. The type hint links are styled as subtle text, not prominent buttons — they don't compete with the writing flow.

### Backend Compatibility

The `entryType` field remains in the schema. The `createEntry` mutation still accepts `"freeform" | "checkin" | "dream" | "gratitude"`. The only change is in the UX — no upfront type selection required.

The auto-derivation logic for check-ins:
```typescript
// In createEntry mutation (client-side, before call):
if (entryType === "freeform" && (!content || content.trim().length < 20) && (mood || emotions?.length)) {
  entryType = "checkin";
}
```

---

## 7. Timeline Rework

### Current Problems

- Cards are visually heavy (glow effects, watermarks, gradients) — hard to scan quickly
- Astro badges, emotion chips, tags, voice badge, pin badge all fight for attention
- Date separators are fine but the card density is too high

### New Timeline Card

Simplified, scannable entry card:

```
┌─────────────────────────────────────────────────────┐
│ ▎ Excited · "Had the best conversation with..."    │
│ ▎ 12:34 PM · 🌕 Waxing Gibbous · Moon in Scorpio  │
│ ▎ Grateful · Inspired                              │
└─────────────────────────────────────────────────────┘
```

**Structure**:
1. **Left accent bar**: 3px solid color from mood zone (same as current)
2. **Line 1**: Zone label + title/content preview (max 1 line)
3. **Line 2**: Time + astro context (moon phase + moon sign)
4. **Line 3** (optional): Top 2-3 emotion chips, tags, or photo indicator

**Removals from card**:
- Large scroll watermark icon (`GiScrollUnfurled`) — too heavy when scanning 10+ entries
- Hover glow/blur effects — replaced with a subtle border-color transition
- 3-line card height — compressed to 2-3 lines maximum
- Inline emotion badges component — replaced with simple text labels

**Additions**:
- Swipe-to-delete on mobile (with undo)
- Pin indicator is a simple `📌` in the top-right, not an interactive element on the card

### Interaction

- **Tap card** → slide-over detail panel (desktop) or full-screen detail (mobile)
- **Long-press/right-click** → context menu: Edit, Delete, Pin, Ask Oracle
- No separate `/journal/[entryId]` page load — the detail panel slides over the stream

---

## 8. Detail View Rework

### Current Problems

- Full page with back button, action bar, and a long scroll of data sections
- Every piece of data gets equal visual weight
- The mood card, emotion badges, energy pill, time pill, astro strip, dream data card, gratitude section — it's a list, not a story

### New Detail View: Slide-Over Panel

Instead of navigating to a separate page, entries open in a **slide-over panel** from the right edge of the stream.

**Desktop**: Stream narrows to 60%, detail panel takes 40% from the right.
**Mobile**: Detail panel covers the full screen with a slide-in animation and a back arrow.

### Panel Layout

```
┌────────────────────────────────────────────────────────┐
│  ← Back    · · ·  (context menu: Edit, Pin, Delete)   │
│                                                        │
│  Excited                                               │  ← mood zone, large
│  12:34 PM · Thursday, Apr 18                          │  ← time + date
│  🌕 Waxing Gibbous · Moon in Scorpio                  │  ← astro context
│                                                        │
│  ────────────────────────────────────────────────       │
│                                                        │
│  Had the best conversation with Sarah today.           │  ← content (full)
│  We talked about everything — work, dreams,            │
│  our plans for the summer. It felt like a weight        │
│  lifted off my shoulders.                              │
│                                                        │
│  ────────────────────────────────────────────────       │
│                                                        │
│  Grateful · Inspired · Confident                       │  ← emotions
│  ⚡ Energy: 4/5  ·  🌙 Evening  ·  📍 Prague          │  ← context badges
│  #friends #deep-talks                                  │  ← tags
│                                                        │
│  ────────────────────────────────────────────────       │
│                                                        │
│  [✦ Ask Oracle about this]                            │  ← Oracle CTA
│                                                        │
│  ────────────────────────────────────────────────       │
│                                                        │
│  Created Apr 18, 2026 · 247 words                     │  ← metadata (small, muted)
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Key design principles**:
- Content is **primary**. It gets the most space, the best typography, and the least decoration.
- Context (mood, emotions, astro, energy, time, location, tags) is **secondary** — shown as inline badges below the content.
- Dream data and gratitude items appear as a **section** only if the entry type is dream/gratitude.
- Voice transcript, photo, and location are shown **inline** with the content, not in separate cards.
- The mood zone is shown as a **large word** (e.g., "Excited" in emerald color) at the top — not a card with valence/arousal numbers.
- The "Ask Oracle" CTA is prominent but not overwhelming.

### Edit Mode

When the user taps "Edit" from the context menu, the panel transitions into **edit mode** — the `QuickCapture` component renders inside the panel with the entry data pre-filled. No more separate `/journal/[entryId]/edit` route.

### Dream & Gratitude Detail Sections

For dream entries, add a section between content and context:

```
🌙 Lucid Dream · Recurring
Dream signs: teeth, flying, water
Emotional tone: eerie
```

For gratitude entries:

```
🙏 Grateful for:
  ✦ The morning light through my window
  ✦ Sarah's call
  ✦ This body of mine
```

---

## 9. Calendar & Search Simplification

### Current Problems

- `/journal/calendar`, `/journal/search`, `/journal/stats` are separate pages requiring navigation
- Each has its own layout, no visual continuity
- Calendar mood dots + moon phases are a nice touch but trapped in a separate page

### New Approach: Tab Modes

The bottom of the Stream page has a **mode bar**:

```
[Stream]  [Calendar]  [Search]  [Insights]
```

Clicking a tab swaps the *content area* of the stream page — no navigation, no page load, no layout shift.

**Stream** (default): QuickCapture + Timeline
**Calendar**: Calendar grid (existing `CalendarView` component, adapted)
**Search**: Search bar + filters + results
**Insights**: Stats + streak + astro correlations

### Calendar Adaptation

- The calendar grid stays mostly the same
- Moon phase indicators remain
- Mood dots remain
- **Add**: Tap a date → scroll the stream to that date's entries (or open the first entry of that day in the detail panel)
- **Remove**: Separate `/journal/calendar` route (redirect to `/journal?tab=calendar`)

### Search Adaptation

- Search bar is always visible at the top of the search tab
- Filters are shown as inline chips (not a collapsible panel)
- Results use the same `EntryCard` component as the timeline
- **Remove**: Separate `/journal/search` route (redirect to `/journal?tab=search`)

### Insights Adaptation

- Renamed from "Stats" to "Insights" — sounds warmer
- Shows streak prominently at the top
- Mood trend chart, entry frequency, astro correlations below
- **Remove**: Separate `/journal/stats` route (redirect to `/journal?tab=insights`)

### URL Handling

| Old Route | New Destination |
|-----------|----------------|
| `/journal` | `/journal` (Stream tab) |
| `/journal/new` | `/journal?compose=true` (focuses QuickCapture) |
| `/journal/new?type=dream` | `/journal?compose=true&type=dream` |
| `/journal/new?presetPrompt=...` | `/journal?compose=true&prompt=...` |
| `/journal/calendar` | `/journal?tab=calendar` |
| `/journal/search` | `/journal?tab=search` |
| `/journal/stats` | `/journal?tab=insights` |
| `/journal/[entryId]` | `/journal?entry=entryId` (opens detail panel) |
| `/journal/[entryId]/edit` | `/journal?entry=entryId&edit=true` |
| `/journal/settings` | `/journal?tab=settings` (or stays separate — see below) |

**Backwards compatibility**: The old routes redirect to the new URL format using `next.config.ts` redirects or middleware.

---

## 10. Settings → Consent Simplification

### Current Problems

- Consent modal is a separate page (`/journal/settings`) with toggles and a lookback window selector
- Granular permissions are confusing for users who just want to "let Oracle see my journal"

### New Consent Flow

**Inline consent prompt** — the first time a user opens the Stream and has no consent record, a warm, concise banner appears:

```
┌──────────────────────────────────────────────────────────────┐
│  ✦ Oracle + Journal                                          │
│                                                              │
│  Let Oracle read your journal entries to give you            │
│  more personalized readings. You control what's shared.      │
│                                                              │
│  [Enable access]        [Customize]        [Not now]         │
└──────────────────────────────────────────────────────────────┘
```

- **Enable access**: Grants consent with default settings (full text + mood + dreams, 90-day lookback)
- **Customize**: Opens the existing `ConsentModal` with granular toggles
- **Not now**: Dismisses, never blocks the UI, can re-trigger from a settings link

### Settings Tab

Settings becomes a tab in the mode bar, visible only if the user has already granted consent or explicitly navigated there. It contains:

- Oracle consent status + manage button
- Streak preferences (opt-in to streak notifications)
- Data export (future)

This is a **stripped-down settings** — no admin controls. Admin stays at `/admin/journal/settings`.

---

## 11. Sidebar Diet

### Current Problems

- Sidebar has too many features: recent entries with rename/delete, streak display, navigation to 4 sub-pages
- The recent entries list with dropdown menus competes for attention
- It's doing work that the stream timeline should do

### New Sidebar

Simplified to **navigation + streak only**:

```
┌─ Journal ─────────────────────┐
│  [+ New Entry]                 │  ← primary action
│                                │
│  🔥 7-day streak               │  ← 7 dots, filled for active days
│                                │
│  ──────────────                │
│  📜 Stream                      │  ← active by default
│  📅 Calendar                    │
│  🔍 Search                      │
│  📊 Insights                    │
│  ⚙ Settings                     │
│                                │
│  ──────────────                │
│  ← Oracle                     │  ← back to oracle
│  ← Dashboard                  │  ← back to dashboard
│                                │
│  ──────────────                │
│  [avatar] username             │
│   free tier                    │
└────────────────────────────────┘
```

**Removed from sidebar**:
- Recent entries list → now visible in the stream
- Entry rename/delete dialogs → now in the detail panel's context menu
- Long entry title with timestamps → the stream timeline handles this

**Kept in sidebar**:
- New Entry button (always visible, above everything)
- Streak indicator (7-day dot row)
- Tab navigation (Stream, Calendar, Search, Insights, Settings)
- Navigation back to Oracle/Dashboard

The sidebar collapses to icons only when the window is narrow, and each icon has a tooltip.

---

## 12. Daily Prompts Integration

### Current Problems

- Daily prompt is a card on the timeline that says "Write about this →" which links to the full composer
- This navigates away from the stream

### New Integration

The daily prompt becomes an **inline element** in the `QuickCapture`:

- When the stream loads, if there's a daily prompt, it appears as a **ghost text** in the textarea:
  ```
  "What pattern has been repeating this week?" ← press Tab to use this prompt
  ```
- Or as a **subtle banner** just above the textarea:
  ```
  ✦ Today's reflection: "What pattern has been repeating this week?" [Use this ↵]
  ```
- Clicking "Use this" fills the textarea with the prompt text and focuses it for continued writing
- The prompt is also shown on the stream timeline as a card, but clicking it scrolls up to the QuickCapture and fills it in — no page navigation

---

## 13. Oracle ↔ Journal Touchpoints

### Existing Touchpoints (Preserved, UI Improved)

1. **Cosmic Recall** (Oracle feature that searches journal entries)
   - No changes to backend logic
   - UI: The consent check in Oracle's feature menu stays as-is
   - If user hasn't consented, clicking "Cosmic Recall" shows a brief inline prompt to enable access, not a link to a settings page

2. **JOURNAL_PROMPT from Oracle responses**
   - No backend changes
   - UI: The "✦ Journal about this" CTA in Oracle chat now navigates to `/journal?compose=true&prompt=...` — this pre-fills the QuickCapture instead of opening a separate composer page

3. **"Ask Oracle about this" on journal entries**
   - Stays in the detail panel
   - URL changes to `/oracle/new?journalEntryId=...` (unchanged)

4. **Oracle consent inline prompt** (new)
   - When Oracle generates a reading that references journal context, a subtle indicator appears: *"Reading informed by your journal ✦"*
   - This builds trust and shows value without being obtrusive

### New Touchpoint: Quick Oracle Ask

On the QuickCapture action bar, after saving an entry, a **"Ask Oracle"** button appears briefly (3-second fade):

```
[Entry saved ✓]  [Ask Oracle about this →]
```

This routes to `/oracle/new?journalEntryId=...` — same as the existing flow, just surfaced more prominently at the moment of maximum relevance (right after writing).

---

## 14. Backend & Schema Changes

### What Changes

| Area | Change | Reason |
|------|--------|--------|
| `createEntry` mutation | Accept `entryType: "freeform"` as default; auto-derive `"checkin"` if content is empty/short and mood is set | Remove type selection friction |
| `createEntry` mutation | First line detection: if `content` has no explicit `title`, auto-set `title` to the first line (truncated at 60 chars) | Titles become optional, auto-derived |
| Client-side | Remove entry type selector from composer | UX simplification |
| Client-side | Replace MoodPad with two 1D sliders (valence + energy) | Same data, better input UX |
| Client-side | Replace EmotionSelector with EmotionChips (tap-to-cycle, max 3) | Reduce friction |
| `createEntry` mutation | Update validation: `checkin` type content can be empty | Allow mood-only check-ins |
| No schema changes | All fields remain the same; no Convex table modifications | Backward compatibility |

### What Does NOT Change

- All Convex tables and their schemas remain the same
- All mutations and queries remain the same (with minor client-side changes)
- `astroContext.ts`, `streaks.ts`, `consent.ts`, `context.ts` — untouched
- The `assembleJournalContext` logic remains identical
- Daily prompt algorithm remains identical
- Streak tracking remains identical

---

## 15. Zustand Store Simplification

### Current Store (Removed Fields)

```typescript
// REMOVE these fields:
activeView: "timeline" | "calendar" | "search" | "stats"  // → URL search params
isComposing: boolean                                       // → URL param ?compose=true
entryType: EntryType                                       // → URL param ?type=dream
```

### Simplified Store

```typescript
interface JournalStore {
  // Voice input state (still useful to be global — recording can continue across views)
  isRecording: boolean;
  interimTranscript: string;
  finalTranscript: string;
  setRecording: (v: boolean) => void;
  setInterimTranscript: (text: string) => void;
  setFinalTranscript: (text: string) => void;

  // Search state (useful to persist across tab switches)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchFilters: JournalSearchFilters;
  setSearchFilters: (filters: Partial<JournalSearchFilters>) => void;
  resetSearchFilters: () => void;

  // Active tab (reflects URL, but also controls tab state)
  activeTab: "stream" | "calendar" | "search" | "insights" | "settings";
  setActiveTab: (tab: JournalStore["activeTab"]) => void;

  // Detail panel state
  activeEntryId: string | null;
  setActiveEntryId: (id: string | null) => void;
  isEditingEntry: boolean;
  setIsEditingEntry: (v: boolean) => void;
}
```

**URL as state**: The active tab, compose mode, and entry selection are all reflected in URL search params (`?tab=`, `?compose=`, `?entry=`) so they're shareable, bookmarkable, and survive refreshes.

---

## 16. New Component Map

### Components to Create

| Component | Purpose |
|-----------|---------|
| `src/components/journal/stream/journal-stream-page.tsx` | Main stream page (owns tab state, QuickCapture, timeline) |
| `src/components/journal/stream/quick-capture.tsx` | The inline composer (textarea, mood bar, emotion chips, action bar) |
| `src/components/journal/stream/mood-bar.tsx` | Two 1D sliders (valence + energy) replacing MoodPad as primary input |
| `src/components/journal/stream/emotion-chips.tsx` | Quick-tap emotion chips (max 3, tap-to-cycle intensity) |
| `src/components/journal/stream/capture-action-bar.tsx` | Voice, photo, location, type hints, save button |
| `src/components/journal/stream/type-hints.tsx` | "Mark as dream" / "Mark as gratitude" links |
| `src/components/journal/stream/stream-timeline.tsx` | Replaces `TimelineView` — simplified card rendering |
| `src/components/journal/stream/stream-entry-card.tsx` | Simplified timeline card |
| `src/components/journal/detail/detail-panel.tsx` | Slide-over panel for entry detail |
| `src/components/journal/detail/detail-context-menu.tsx` | Edit, Delete, Pin, Ask Oracle context menu |
| `src/components/journal/stream/mode-bar.tsx` | Bottom tab bar: Stream, Calendar, Search, Insights |
| `src/components/journal/stream/streak-indicator.tsx` | 7-day streak dots (replaces full `StreakDisplay`) |
| `src/components/journal/stream/daily-prompt-inline.tsx` | Prompt ghost text or banner in QuickCapture |
| `src/components/journal/consent/consent-banner.tsx` | Inline consent prompt on first visit |
| `src/components/journal/composer/dream-fields.tsx` | Extracted from `dream-editor.tsx` — lucid/recurring toggles + dream signs + emotional tone |
| `src/components/journal/composer/gratitude-fields.tsx` | Extracted from `gratitude-editor.tsx` — gratitude items list |

### Components to Heavily Modify

| Component | Changes |
|-----------|---------|
| `src/components/journal/composer/entry-composer.tsx` | Gut and repurpose as `QuickCapture` or delete entirely |
| `src/components/journal/composer/mood-pad.tsx` | Keep as read-only detail view visualization + optional popover for precise editing |
| `src/components/journal/composer/emotion-selector.tsx` | Replace with `EmotionChips` — keep as a fallback for edit mode |
| `src/components/journal/timeline/timeline-view.tsx` | Simplify — use `StreamEntryCard` |
| `src/components/journal/timeline/entry-card.tsx` | Simplify — remove glow effects, watermark, compress height |
| `src/components/journal/sidebar/journal-nav-section.tsx` | Strip down — remove recent entries list, remove rename/delete dialogs |
| `src/components/journal/sidebar/journal-sidebar.tsx` | Simplify — fewer buttons, cleaner hierarchy |
| `src/app/journal/page.tsx` | Rework as Stream page host |
| `src/app/journal/layout.tsx` | Adapt to new slide-over panel architecture |
| `src/app/journal/[entryId]/page.tsx` | Convert to redirect: `/journal?entry=entryId` |
| `src/app/journal/[entryId]/edit/page.tsx` | Convert to redirect: `/journal?entry=entryId&edit=true` |
| `src/app/journal/new/page.tsx` | Convert to redirect: `/journal?compose=true` |
| `src/app/journal/calendar/page.tsx` | Convert to redirect: `/journal?tab=calendar` |
| `src/app/journal/search/page.tsx` | Convert to redirect: `/journal?tab=search` |
| `src/app/journal/stats/page.tsx` | Convert to redirect: `/journal?tab=insights` |
| `src/store/use-journal-store.ts` | Simplify as described in §15 |

### Components to Delete (Once Replaced)

| Component | Reason |
|-----------|--------|
| `src/components/journal/composer/checkin-widget.tsx` | Absorbed into QuickCapture (mood-only entries don't need a separate widget) |
| `src/components/journal/composer/freeform-editor.tsx` | Absorbed into QuickCapture's textarea |
| `src/components/journal/timeline/date-separator.tsx` | Replaced with simpler date heading in stream |

### Components Unchanged

| Component | Reason |
|-----------|--------|
| `src/components/journal/composer/voice-input-button.tsx` | Moved inline into action bar |
| `src/components/journal/composer/photo-uploader.tsx` | Moved inline into action bar |
| `src/components/journal/composer/location-input.tsx` | Moved inline into action bar |
| `src/components/journal/composer/astro-context-strip.tsx` | Shown in detail panel + enrichment sheet |
| `src/components/journal/composer/energy-level-picker.tsx` | Shown in enrichment sheet after save |
| `src/components/journal/composer/time-of-day-picker.tsx` | Auto-detected, shown in enrichment sheet |
| `src/components/journal/composer/tag-input.tsx` | Shown in enrichment sheet after save |
| `src/components/journal/consent/consent-modal.tsx` | Reused from "Customize" button in banner |
| `src/components/journal/consent/consent-settings.tsx` | Reused in settings tab |
| `src/components/journal/calendar/*` | Kept, adapted for inline tab rendering |
| `src/components/journal/search/*` | Kept, adapted for inline tab rendering |
| `src/components/journal/stats/*` | Kept, adapted for inline tab rendering |
| `src/components/journal/prompt/daily-prompt-card.tsx` | Replaced by inline prompt in QuickCapture |
| `src/components/journal/detail/emotion-badges.tsx` | Kept for detail panel |
| All convex backend components | No changes |
| `src/lib/journal/constants.ts` | Minor additions (initial emotion set, max 3 emotions default) |
| `src/lib/journal/voiceInput.ts` | No changes |
| `src/lib/journal/location.ts` | No changes |

---

## 17. Implementation Phases

### Phase 1: QuickCapture + Stream Foundation

**Goal**: Replace the composer with QuickCapture. Unify the stream.

**Tasks**:
1. Create `JournalStreamPage` component that owns tab state
2. Create `QuickCapture` component (textarea + mood bar + emotion chips + action bar)
3. Create `MoodBar` component (two 1D sliders)
4. Create `EmotionChips` component (tap-to-cycle, max 3)
5. Create `CaptureActionBar` (voice, photo, location, type hints, save)
6. Create `TypeHints` sub-component ("Mark as dream" / "Mark as gratitude")
7. Create `DreamFields` (extracted from `dream-editor.tsx`)
8. Create `GratitudeFields` (extracted from `gratitude-editor.tsx`)
9. Refactor `/journal/page.tsx` to host `JournalStreamPage`
10. Update `useJournalStore` to new shape
11. Add URL param handling (`?compose=`, `?type=`, `?prompt=`)
12. Wire up `createEntry` mutation from QuickCapture

### Phase 2: Stream Timeline + Entry Cards

**Goal**: Simplify timeline cards, implement slide-over detail panel.

**Tasks**:
1. Create `StreamEntryCard` (simplified 2-3 line card)
2. Create `StreamTimeline` (date groups + simplified cards)
3. Create `DetailPanel` (slide-over panel for entry detail)
4. Create `DetailContextMenu` (edit, delete, pin, ask Oracle)
5. Implement panel open/close state in store + URL params (`?entry=`)
6. Repurpose `MoodPad` as read-only visualization in detail panel
7. Remove `/journal/[entryId]/page.tsx` — redirect to `?entry=entryId`
8. Remove `/journal/[entryId]/edit/page.tsx` — redirect to `?entry=entryId&edit=true`
9. Adapt `StreakDisplay` → `StreakIndicator` (7-day dots)

### Phase 3: Tabs + Navigation

**Goal**: Consolidate calendar, search, and insights into tabs.

**Tasks**:
1. Create `ModeBar` (bottom tab bar)
2. Implement tab switching with URL params (`?tab=`)
3. Adapt `CalendarView` for inline rendering
4. Adapt search components for inline rendering
5. Adapt stats/insights for inline rendering
6. Redirect `/journal/calendar` → `/journal?tab=calendar`
7. Redirect `/journal/search` → `/journal?tab=search`
8. Redirect `/journal/stats` → `/journal?tab=insights`
9. Simplify sidebar (remove recent entries, remove rename/delete)
10. Settings tab with consent banner integration

### Phase 4: Polish + Delight

**Goal**: Animations, transitions, the creative details that make it feel alive.

**Tasks**:
1. Entry save animation (card flies into timeline position)
2. Tab switch transitions (fade + slide)
3. Detail panel slide-in/out animation
4. Mood slider color transitions (track color follows zone)
5. Emotion chip tap animation (scale + glow)
6. QuickCapture auto-focus behavior
7. Daily prompt inline integration (ghost text or banner)
8. Keyboard shortcuts: `/` to focus QuickCapture, `Escape` to close detail panel, `Cmd+Enter` to save
9. Mobile gesture: swipe entry card for context menu
10. Empty state redesign (when no entries exist)
11. Consent banner first-visit flow
12. Accessibility audit (keyboard nav, screen reader)

---

## 18. What We Do NOT Touch

The following are **explicitly out of scope** for this redesign:

| Area | Reason |
|------|--------|
| Convex backend (all `convex/journal/*` files) | Backend is solid. No schema changes, no mutation/query changes (except minor `createEntry` validation adjustment for check-in auto-derivation) |
| Astro context builder (`astroContext.ts`) | Working perfectly, zero-touch |
| Oracle integration (`context.ts`, `llm.ts`, `sessions.ts`) | Journal context assembly, consent enforcement, feature injection — all untouched |
| Cosmic Recall feature | Logic unchanged, only the entry point UI improves |
| Streak tracking (`streaks.ts`) | Logic unchanged |
| Admin configuration (`admin.ts`, `settings.ts`, admin UI) | Unchanged |
| Consent data model (`consent.ts`) | Unchanged, just the UI prompt surface changes |
| Daily prompt algorithm (`prompts.ts`) | Unchanged, just the display surface changes |
| Search & stats backend | Unchanged, only frontend rendering adapts |
| Photo upload flow | Unchanged, just moved inline |
| Voice input logic | Unchanged, just moved inline |
| Location logic | Unchanged, just moved inline |
| Any page outside `/journal/*` | This redesign is scoped to the journal feature only |

---

## 19. External References — Mandatory Compatibility Checklist

Every external file that links into the journal **must** be updated alongside the redesign. Missing any of these will cause broken links, 404s, or runtime errors.

### 19.1 Oracle → Journal deep link

**File**: `src/app/oracle/chat/[sessionId]/page.tsx` (line 848)

```
current: router.push("/journal/new?oracleSessionId=" + sessionId + "&presetPrompt=" + encodeURIComponent(msg.journalPrompt!) + "&type=freeform")
```

**Must change to**: `router.push("/journal?compose=true&oracleSessionId=" + sessionId + "&prompt=" + encodeURIComponent(msg.journalPrompt!))`

Note: The `type=freeform` param is removed because QuickCapture defaults to freeform. The `oracleSessionId` and `prompt` params are retained and consumed by the new `JournalStreamPage`.

### 19.2 Oracle sidebar → Journal navigation

**File**: `src/components/oracle/sidebar/oracle-sidebar.tsx` (lines 120, 165)

Both reference `href: "/journal"` — this requires **no change** since `/journal` remains the primary URL.

### 19.3 Oracle input — Journal consent check

**File**: `src/components/oracle/input/oracle-input.tsx` (lines 56, 70)

References `api.journal.consent.getConsent` — this Convex query is **unchanged**. The line that says `"Requires journal access — enable in Journal Settings"` should be updated to say `"Requires journal access — enable in Journal Settings"` (same message, but the link should go to `/journal?tab=settings` instead of `/journal/settings`). This is a minor text/link change, not a functional change.

### 19.4 Layout navbar → Journal link

**File**: `src/components/layout/navbar.tsx` (line 68)

References `href: "/journal"` — **no change needed**.

### 19.5 Layout footer → Journal link

**File**: `src/components/layout/footer.tsx` (line 27, 66)

References `href: "/journal"` — **no change needed**.

### 19.6 Admin sidebar & top bar → Journal

**Files**: `src/components/admin/sidebar/admin-sidebar.tsx`, `src/components/admin/sidebar/admin-top-bar.tsx`

These reference `/admin/journal` and `/admin/journal/settings` — **no change needed** because admin pages are out of scope.

### 19.7 Calendar page — entry click

**File**: `src/app/journal/calendar/page.tsx` (line 84)

```
current: onEntryClick={(entryId) => router.push(`/journal/${entryId}`)}
```

**Must change to**: `onEntryClick={(entryId) => router.push(`/journal?entry=${entryId}`)}`

### 19.8 Search page — entry click

**File**: `src/app/journal/search/page.tsx` (line 99)

```
current: onClick={() => router.push(`/journal/${entry._id}`)}
```

**Must change to**: `onClick={() => router.push(`/journal?entry=${entry._id}`)}`

### 19.9 Entry detail page — "Ask Oracle" link

**File**: `src/app/journal/[entryId]/page.tsx` (line 329)

```
current: router.push(`/oracle/new?journalEntryId=${entryId}`)
```

**No change needed** — this links *out* of journal to Oracle, and Oracle is not being redesigned. However, if the detail view moves to a panel, this link must be preserved in the `DetailPanel` component.

### 19.10 Entry detail page — back + edit buttons

**File**: `src/app/journal/[entryId]/page.tsx` (lines 61, 97, 120)

- `router.push("/journal")` → should become closing the detail panel
- `router.push(`/journal/${entryId}/edit`)` → should become switching the panel to edit mode

These redirects become state changes instead of navigation when the detail view is a panel.

### 19.11 Journal layout — "New Entry" button

**File**: `src/app/journal/layout.tsx` (line 42)

```
current: router.push("/journal/new")
```

**Must change to**: Focus the QuickCapture input on the stream page (since it's inline, no navigation needed). Or keep as `/journal?compose=true` if opening from the sidebar.

### 19.12 Timeline — empty state "New Entry" button

**File**: `src/components/journal/timeline/timeline-view.tsx` (line 69)

```
current: onClick={() => router.push("/journal/new")
```

**Must change to**: Focus the QuickCapture on the stream page.

### 19.13 Sidebar — Quick Create links

**File**: `src/components/journal/journal-sidebar.tsx` (lines 36-39)

References `/journal/new?type=freeform`, `/journal/new?type=checkin`, `/journal/new?type=dream`, `/journal/new?type=gratitude`

**Must change to**: `/journal?compose=true&type=freeform`, `/journal?compose=true&type=dream`, `/journal?compose=true&type=gratitude`. The check-in type is removed since it's auto-derived.

### 19.14 Sidebar — nav links

**File**: `src/components/journal/sidebar/journal-nav-section.tsx`

```
current NAV_ITEMS reference:
  /journal, /journal/calendar, /journal/search, /journal/stats, /journal/settings
```

**Must change to**: `/journal`, `/journal?tab=calendar`, `/journal?tab=search`, `/journal?tab=insights`, `/journal?tab=settings`

### 19.15 Journal store — voice state consumers

**File**: `src/components/journal/composer/voice-input-button.tsx`

Currently imports `useJournalStore` for `isRecording`, `setRecording`, `interimTranscript`, `setInterimTranscript`, `setFinalTranscript`.

The plan says the store is simplified but retains these voice fields. **The `VoiceInputButton` component must still be able to read/write these fields from the store, or the voice state must be lifted into `QuickCapture` local state.** The plan's simplified store (§15) includes `isRecording`, `interimTranscript`, and `setRecording`/`setInterimTranscript`/`setFinalTranscript` — so this is compatible. The implementing agent just needs to know that `VoiceInputButton` remains a store consumer.

---

## 20. Identified Gaps & Ambiguities in the Original Plan

These are issues I found after cross-referencing the plan against every file in the codebase. An implementing agent must address these.

### 20.1 Route Redirects Are Missing

The plan says old routes should redirect to new URL formats, but **no redirect mechanism is specified**. Next.js App Router doesn't have built-in route redirects — you need either:

- **Option A**: Add `redirects` in `next.config.ts` for permanent redirects
- **Option B**: Keep the old page files as thin wrappers that call `router.replace()` or `redirect()` from `next/navigation`
- **Option C**: Use `next.config.ts` `rewrites` for URL rewriting

**Recommended**: Use `next.config.ts` `redirects` for the simple cases and keep thin wrapper pages for entries (`/journal/[entryId]`) since entry IDs are dynamic.

Add this to `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: "/journal/new",
      destination: "/journal?compose=true",
      permanent: true,
    },
    {
      source: "/journal/calendar",
      destination: "/journal?tab=calendar",
      permanent: true,
    },
    {
      source: "/journal/search",
      destination: "/journal?tab=search",
      permanent: true,
    },
    {
      source: "/journal/stats",
      destination: "/journal?tab=insights",
      permanent: true,
    },
    {
      source: "/journal/settings",
      destination: "/journal?tab=settings",
      permanent: true,
    },
  ];
},
```

For `/journal/[entryId]` and `/journal/[entryId]/edit`, keep the page files but redirect dynamically:

```typescript
// src/app/journal/[entryId]/page.tsx
import { redirect } from "next/navigation";

export default function EntryRedirectPage({ params }: { params: { entryId: string } }) {
  redirect(`/journal?entry=${params.entryId}`);
}
```

### 20.2 Backend Validation Gap — Freeform Entries Require Content

The `createEntry` mutation (convex/journal/entries.ts line 109) validates:

```typescript
if (args.entryType === "freeform") {
  if (!args.content.trim()) {
    throw new Error("Freeform entries require content");
  }
}
```

The plan says entries default to `freeform` and check-ins are auto-derived when content is empty/short + mood is set. However, **the current backend throws an error if a freeform entry has empty content**. There are two ways to handle this:

- **Option A (Client-side)**: Before calling `createEntry`, if content is empty and mood/emotions are present, the client sets `entryType` to `"checkin"`. This avoids any backend change.
- **Option B (Backend change)**: Modify `createEntry` to allow empty content for freeform entries when mood is provided, or remove the validation for freeform and auto-derive the type server-side.

**Recommended**: Option A (client-side). No backend changes needed. The QuickCapture component should check: if content is empty/short AND mood or emotions exist, set `entryType: "checkin"` before calling `createEntry`. This preserves backward compatibility.

### 20.3 Oracle Prompt Deep Link — Dual Route Support

The Oracle chat's "Journal about this" button currently links to `/journal/new?oracleSessionId=...&presetPrompt=...&type=freeform`.

The new URL format is `/journal?compose=true&oracleSessionId=...&prompt=...`.

**Both URL formats must work during the transition.** The simplest approach:
1. `next.config.ts` redirects `/journal/new` → `/journal?compose=true`
2. Query params (`oracleSessionId`, `presetPrompt`) are preserved through the redirect
3. The `JournalStreamPage` component reads both `presetPrompt` and `prompt` query params for backward compatibility

**However**: `next.config.ts` redirects may strip query params. Verify this. If they do, keep the `/journal/new/page.tsx` as a thin wrapper that reads the old params and redirects programmatically.

### 20.4 URL Params vs. State — Entry Detail Panel

The plan says entry detail will be a slide-over panel controlled by `?entry=entryId`. This works for opening entries from the timeline, but there's a subtlety:

- **When the page loads with `?entry=entryId`**, the stream must also render (it's the background). This means `JournalStreamPage` must render *and* the detail panel must open simultaneously on initial load.
- **When navigating between entries** (clicking a different entry in the stream while the panel is open), only the panel content changes. The stream should not re-render. This requires state management that shares the stream data between the stream and the panel.

**Implementation note**: Use `useSearchParams()` for the panel state and `useQuery` for both the stream entries and the selected entry. The stream query is independent of the `entry` param — it always fetches the timeline. The panel query depends on the `entry` param.

### 20.5 Cosmic Weather Query in Composer

**File**: `src/components/journal/composer/entry-composer.tsx` (lines 92-106)

The current composer fetches `cosmicWeather` to display the `AstroContextStrip` client-side. In the new QuickCapture, the `AstroContextStrip` is not shown in the capture area — it's shown in the enrichment sheet after save, or in the detail panel. **But**: the astro context is auto-attached by the backend during `createEntry`. The client-side fetch is only for display, not for saving.

**Action**: Remove the `cosmicWeather` query from `QuickCapture`. The enrichment sheet after save can display the astro context from the `createEntry` mutation response (the backend returns the full entry). If the enrichment sheet needs astro data immediately, use the returned entry's `astroContext` field.

### 20.6 Journal Store — `entryType` Removal

The plan removes `entryType` from the Zustand store (it becomes a URL param or local component state). Currently:

- `useJournalStore().entryType` is set by `src/app/journal/new/page.tsx` from the `?type=` URL param
- `useJournalStore().setEntryType()` is called from `entry-composer.tsx` when the user picks a type

**Action**: Move `entryType` to local component state in `QuickCapture`. The only external consumer is the Oracle deep link (`?type=freeform`), which the `JournalStreamPage` reads from `useSearchParams()`.

### 20.7 Journal Store — `isComposing` Removal

`isComposing` is currently in the store but only used in `entry-composer.tsx` (implicitly) and not read elsewhere. Safe to remove.

### 20.8 VoiceInputButton — Store Dependency

The `VoiceInputButton` component reads `isRecording`, `interimTranscript` from the store. The plan's simplified store keeps these fields. **No issue**, but the implementing agent should be aware that `VoiceInputButton` is a store consumer and must not be broken during the store refactor.

### 20.9 Duplicate Sidebar Components

There are **two** sidebar components:
- `src/components/journal/journal-sidebar.tsx` — older, standalone sidebar with nav items only (used in `Footer`/`Navbar`? No — appears unused)
- `src/components/journal/sidebar/journal-sidebar.tsx` — the active sidebar used in `src/app/journal/layout.tsx`

**Action**: The plan should clarify which sidebar is being modified. Based on the layout file, `sidebar/journal-sidebar.tsx` is the active one. The older `journal-sidebar.tsx` appears to be dead code and should be removed.

### 20.10 Edit Mode — Entry Composer Reuse

The plan says editing should work via the QuickCapture inside the detail panel. Currently, editing goes to `/journal/[entryId]/edit` which renders `EntryComposer` with `editEntry` and `editEntryId` props.

**The `EntryComposer` receives `editEntry` and `editEntryId` props for edit mode**, calling `updateEntry` instead of `createEntry`. The new `QuickCapture` must support the same edit mode — receiving an existing entry's data to pre-fill, and calling `updateEntry` when in edit mode.

**Implementation note**: QuickCapture needs an `mode: "create" | "edit"` prop, and when `mode === "edit"`, it receives `editEntryId` and pre-fills all fields from the existing entry.

### 20.11 Page Files Must Not Be Deleted Immediately

The plan says to delete or redirect old page files (`/journal/new`, `/journal/[entryId]`, etc.). During implementation, **old page files should be kept as redirect wrappers** until the new stream page is fully tested. Delete the old files only after the new flow is verified.

### 20.12 Search Params vs. Hash Navigation

The plan uses URL search params (`?tab=`, `?entry=`, `?compose=`, `?edit=`). On a single-page stream, this means the URL changes as the user interacts. Next.js App Router with `useSearchParams()` requires wrapping the page in `<Suspense>` boundaries. The implementing agent must handle this.

Additionally, search params cause full page re-renders when they change. Consider using `window.history.replaceState()` for tab switches and panel opens to avoid full re-renders while still keeping the URL in sync.

### 20.13 Photo Upload — Convex Flow Must Be Preserved

The photo upload flow in `photo-uploader.tsx` calls `api.files.generateUploadUrl` and then POSTs to Convex storage. The `photo-uploader` component handles the entire client-side upload flow. When moving it inline into the action bar, **the same flow must be preserved** — the component can be rendered inline, but the upload logic stays identical.

### 20.14 Consent Check in Oracle Feature Menu

**File**: `src/components/oracle/input/oracle-input.tsx` (line 70)

Currently shows `"Requires journal access — enable in Journal Settings"` when consent is not granted. The link target should change from `/journal/settings` to `/journal?tab=settings`, but this is **outside the journal scope**. The implementing agent should note this as a **follow-up change** but not include it in the journal redesign PR to avoid scope creep.

---

## 21. Implementation Order — Updated Checklist

This revised implementation order accounts for the external references and gaps identified in §§19-20.

### Phase 1: QuickCapture + Stream Foundation (No breaking changes)

**Prerequisite**: All changes in this phase are additive. The old routes and components remain functional.

1. Create `JournalStreamPage` component that reads `useSearchParams()` for `tab`, `compose`, `entry`, `edit`, `prompt`, `type`, `oracleSessionId`
2. Create `QuickCapture` component (textarea + mood bar + emotion chips + action bar)
3. Create `MoodBar` component (two 1D sliders)
4. Create `EmotionChips` component (tap-to-cycle, max 3)
5. Create `CaptureActionBar` component (voice, photo, location, type hints, save)
6. Create `TypeHints` sub-component
7. Create `DreamFields` (extracted from `dream-editor.tsx`)
8. Create `GratitudeFields` (extracted from `gratitude-editor.tsx`)
9. Update `useJournalStore` — add `activeTab`, `activeEntryId`, `isEditingEntry`; remove `entryType`, `isComposing`, `activeView`
10. Add URL param reading in `JournalStreamPage`
11. Wire `createEntry` from QuickCapture with auto-derivation logic (empty content + mood → checkin)
12. Keep `VoiceInputButton` as store consumer (verify `isRecording` fields still exist)

### Phase 2: Stream Timeline + Detail Panel (Additive)

1. Create `StreamEntryCard` (simplified)
2. Create `StreamTimeline` component
3. Create `DetailPanel` (slide-over)
4. Create `DetailContextMenu`
5. Wire panel open/close via URL params (`?entry=`) and store state
6. Wire edit mode via URL params (`?edit=true`)
7. Repurpose `MoodPad` as read-only in detail panel
8. Create `StreakIndicator` (7-day dots)
9. **Do NOT remove old routes yet** — verify new flow works first

### Phase 3: Tab Consolidation + Sidebar (Starts to replace old pages)

1. Create `ModeBar` component
2. Integrate `CalendarView` into stream tab
3. Integrate search components into stream tab
4. Integrate stats/insights into stream tab
5. Add `next.config.ts` redirects for old routes
6. Keep old page files as wrapper redirects
7. Simplify `journal-sidebar.tsx` — remove recent entries, remove rename/delete dialogs
8. Add settings tab with consent banner
9. Update `journal-layout.tsx` to use new sidebar and new top bar

### Phase 4: External Reference Updates

1. Update Oracle chat deep link: `/journal/new?oracleSessionId=...&presetPrompt=...` → `/journal?compose=true&oracleSessionId=...&prompt=...`
2. Update calendar entry click: `/journal/${entryId}` → `/journal?entry=${entryId}`
3. Update search entry click: `/journal/${entryId}` → `/journal?entry=${entryId}`
4. Update sidebar nav links to use `?tab=` format
5. Update sidebar Quick Create links to use `?compose=true` format
6. Update Oracle input consent message link (optional, note as follow-up)
7. Remove dead `journal-sidebar.tsx` file

### Phase 5: Cleanup + Old Route Removal

1. Remove old page files that are now redirect wrappers:
   - `src/app/journal/new/page.tsx` → redirect wrapper only
   - `src/app/journal/[entryId]/page.tsx` → redirect wrapper only
   - `src/app/journal/[entryId]/edit/page.tsx` → redirect wrapper only
   - `src/app/journal/calendar/page.tsx` → redirect wrapper only
   - `src/app/journal/search/page.tsx` → redirect wrapper only
   - `src/app/journal/stats/page.tsx` → redirect wrapper only
   - `src/app/journal/settings/page.tsx` → redirect wrapper only
2. Remove old components that have been fully replaced:
   - `entry-composer.tsx` (replaced by QuickCapture)
   - `checkin-widget.tsx` (absorbed into QuickCapture)
   - `freeform-editor.tsx` (absorbed into QuickCapture)
   - `daily-prompt-card.tsx` (replaced by inline prompt)
   - `date-separator.tsx` (replaced by simpler heading)
   - Old `timeline-view.tsx` (replaced by StreamTimeline)
   - Old `entry-card.tsx` (replaced by StreamEntryCard)
3. Update `src/app/journal/page.tsx` to render `JournalStreamPage`
4. Full regression test of all journal flows

### Phase 6: Polish + Delight

1. Entry save animation
2. Tab switch transitions
3. Detail panel slide-in/out animation
4. Mood slider color transitions
5. Emotion chip tap animation
6. QuickCapture auto-focus
7. Daily prompt inline integration
8. Keyboard shortcuts
9. Empty state redesign
10. Consent banner first-visit flow
11. Accessibility audit

---

## 22. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Old routes break during transition | Keep old page files as redirect wrappers until Phase 5. Never delete a page file until its replacement is verified. |
| Oracle "Journal about this" deep link breaks | Update the Oracle link in Phase 4. During Phase 1-3, keep old `/journal/new` route functional. |
| `createEntry` validation rejects empty-content freeform entries | Client-side auto-derivation: if content is empty/short + mood exists, set `entryType: "checkin"` before calling backend. No backend changes needed. |
| URL params cause full page re-renders on every interaction | Use `window.history.replaceState()` for state changes that shouldn't trigger a full render. Use `useSearchParams()` only for shareable/bookmarkable state. |
| Photo upload flow breaks when moving inline | The `PhotoUploader` component is self-contained. Move it into the action bar without modification to its upload logic. |
| Voice input recording across panel open/close | The voice state is in the Zustand store. If the user starts recording in QuickCapture and opens a detail panel, the recording continues. Ensure the recording UI state is visible regardless of which panel is open. |
| Calendar page currently queries `cosmicWeather` separately | When embedding CalendarView into the stream tab, the cosmic weather query moves with it. No functional change, just a component relocation. |
| Search page uses its own Convex query (`searchEntries`) | Same as calendar — the query moves with the component. |
| `useJournalSidebarEntries` hook is used in sidebar nav section | When the sidebar removes the recent entries list, this hook is no longer needed. Delete it along with `use-journal-entries.ts`. |
| Edit mode needs to pre-fill QuickCapture from existing entry data | QuickCapture must accept `mode: "create" | "edit"` and `editEntry` data. The `useQuery(api.journal.entries.getEntry)` call for the selected entry feeds into QuickCapture when `?edit=true`. |