# Journal Redesign — Implementation Plan

> Generated: 2026-05-22
> Status: Ready for implementation
> Parent tasks: t_772fcf60 (redesign plan analysis), t_47f693a8 (codebase inventory)

## Current State Assessment

The Phase 1 scaffolding is ALREADY DONE. These components exist and work:
- `JournalStreamPage` — main page with tab state + URL params
- `QuickCapture` — inline composer with textarea, mood, emotions, action bar
- `MoodBar` — two 1D sliders (valence + energy)
- `EmotionChips` — tap-to-cycle, max 3
- `CaptureActionBar` — voice, photo, location, type hints
- `TypeHints` — "Mark as dream" / "Mark as gratitude"
- `DreamFields`, `GratitudeFields` — type-specific fields
- `StreamEntryCard` — simplified timeline card
- `StreamTimeline` — date-grouped entry list
- `ModeBar` — bottom tab bar
- `StreakIndicator`, `DailyPromptInline`, `ConsentBanner`
- `DetailPanel` — slide-over entry detail (Sheet component)
- `CalendarTab`, `SearchTab`, `InsightsTab`

The architecture (one-URL stream, URL params for state, tab-based navigation) is in place.

## What's Actually Broken / Needs Work

Based on boss's feedback and visual inspection:

### P0 — Mobile Usability Problems
1. **QuickCapture textarea is too minimal on mobile** — no visible container boundaries, no visual warmth
2. **MoodBar sliders are hard to use on mobile touch** — thumb too small, track too thin
3. **No daily journaling prompts/topics** — we need a fresh set of prompts every day (hardcoded first, AI-generated later)
4. **Bottom ModeBar is too cramped on mobile** — 5 tabs in a row is too many, text labels get cut off
5. **No mobile-optimized keyboard handling** — when keyboard opens, content scrolls away

### P1 — Design Inconsistency with Oracle
6. **Sidebar design diverges from Oracle sidebar** — uses different `SidebarHeaderLayout` pattern but styling feels different
7. **QuickCapture card lacks the "Midnight Desk" warm aesthetic** — too cold/galactic, needs warmer paper feel
8. **ModeBar doesn't match Oracle's tab style** — Oracle uses a centered input with feature cards; Journal uses generic icon tabs
9. **Journal header ("Your Cosmic Diary" + "Journal") is tonally off** — feels generic, should feel intimate like Oracle
10. **Color system still uses galactic/cold palette** — needs journal-specific warm overrides per the redesign plan

### P2 — UX Polish Gaps
11. **No "Ask Oracle" CTA after saving** — redesign plan specifies 3-second fade button
12. **No post-save enrichment sheet** — tags, time-of-day, energy should be optional post-save
13. **No keyboard shortcuts** (/, Escape, Cmd+Enter)
14. **Detail panel edit mode not wired** — QuickCapture needs mode="edit" with pre-fill flow
15. **Stream entry cards don't swipe on mobile** — need swipe-to-delete with undo
16. **No entry save animation** — just silently appears in timeline
17. **Consent banner exists but needs "midnight desk" styling**

### P3 — Deferred (AI-generated prompts, accessibility audit)
18. Daily prompts AI generation — hardcoded initially, extendable later
19. Accessibility audit — keyboard nav, screen reader
20. Entry save animation polish

---

## Implementation Tasks

### Task Group A: Mobile-First QuickCapture Redesign
**Priority: P0** | **Scope**: redesign how the composer looks and feels on mobile, add warm "Midnight Desk" aesthetic

**Files to modify:**
- `src/components/journal/stream/quick-capture.tsx` — warm paper bg, better mobile layout
- `src/components/journal/stream/mood-bar.tsx` — larger touch targets, more visual warmth
- `src/components/journal/stream/emotion-chips.tsx` — better mobile spacing, tap feedback
- `src/components/journal/stream/capture-action-bar.tsx` — mobile-friendly layout
- `src/app/globals.css` or `tailwind.config.ts` — add journal-specific CSS custom properties

**Changes:**
1. QuickCapture gets a warm cream-tinted textarea area (--journal-paper: #f5f0e8 background on the text input, dark text)
2. MoodBar: increase thumb size from 16px to 24px (mobile touch), track height from 6px to 8px, add gradient fill
3. EmotionChips: ensure min-height 44px for touch targets, add subtle haptic feedback animation
4. CaptureActionBar: stack icons + TypeHints on mobile (row on desktop, wrapped on mobile)
5. Add journal theme variables: --journal-accent (amber), --journal-bg (deep navy), --journal-paper (cream)

### Task Group B: Daily Journaling Prompts/Topics
**Priority: P0** | **Scope**: add daily prompt system that rotates topics for journaling

**Files to create/modify:**
- `src/lib/journal/daily-prompts.ts` — NEW: prompt bank with topic categories
- `src/components/journal/stream/daily-prompt-inline.tsx` — MODIFY: show daily topics alongside prompts

**Changes:**
1. Create `daily-prompts.ts` with:
   - 7 topic categories (Reflection, Gratitude, Emotions, Relationships, Growth, Dreams, Mindfulness)
   - ~10 prompts per category (70 total, hardcoded)
   - `getDailyPrompts(date: Date)` function that deterministically picks 3 prompts per day
   - Extensible interface for AI-generated prompts later
2. Update `DailyPromptInline` to show 3 rotating daily topic cards above QuickCapture:
   - Each card: icon + short prompt text + "Write about this" button
   - Tapping "Write about this" fills the textarea and focuses it
   - Cards rotate daily based on date seed
   - Mobile: horizontal scrollable, Desktop: 3-column grid

### Task Group C: Sidebar + Header Unification with Oracle
**Priority: P1** | **Scope**: make journal sidebar match Oracle's design language

**Files to modify:**
- `src/components/journal/sidebar/journal-sidebar.tsx` — already uses shared sidebar layout
- `src/components/journal/sidebar/journal-nav-section.tsx` — unify tab icons/labels with journal mode bar
- `src/components/journal/stream/journal-stream-page.tsx` — header redesign

**Changes:**
1. Remove the "Your Cosmic Diary / Journal" generic header — replace with a date-aware greeting like Oracle uses
2. Ensure sidebar quick actions use same icon style as Oracle sidebar
3. ModeBar stays at bottom of content area (mobile bottom nav pattern), but sidebar gets matching nav section
4. Add warm amber accent to active journal nav items (matches Oracle's galactic accent pattern but in amber)

### Task Group D: Post-Save UX (Ask Oracle + Enrichment)
**Priority: P2** | **Scope**: add "Ask Oracle" fade button after save, optional enrichment sheet

**Files to modify:**
- `src/components/journal/stream/quick-capture.tsx` — add post-save state
- `src/components/journal/stream/journal-stream-page.tsx` — wire Ask Oracle button

**Files to create:**
- `src/components/journal/stream/post-save-actions.tsx` — "Ask Oracle" fade button + enrichment options

**Changes:**
1. After save, show a 3-second "Ask Oracle about this →" button that fades out
2. Optional: lightweight enrichment badge (tags, energy, time-of-day) that appears briefly

### Task Group E: Mobile Keyboard & Scroll Handling
**Priority: P0** | **Scope**: fix mobile browser keyboard issues

**Files to modify:**
- `src/components/journal/stream/quick-capture.tsx` — visual viewport handling
- `src/components/journal/stream/journal-stream-page.tsx` — scroll-into-view on focus

**Changes:**
1. Use `window.visualViewport` API to detect keyboard open
2. When textarea focuses, scroll QuickCapture into view above keyboard
3. Ensure ModeBar doesn't get pushed off screen by keyboard
4. Add `inputmode="text"` and proper `enterKeyHint` for mobile

---

## What We Do NOT Touch

- Convex backend — no schema changes
- Oracle code — only the `/journal/new?...` deep link in oracle chat page
- Admin pages
- Consensus: consent data model stays
- Streak tracking backend
- Astro context builder
- Search/stats backend queries
- Calendar backend queries

## Implementation Order

1. **Group A** (Mobile QuickCapture) — foundation for everything else
2. **Group B** (Daily Prompts) — standalone, high user value
3. **Group C** (Sidebar/Header) — visual consistency
4. **Group E** (Mobile Keyboard) — must fix for mobile usability
5. **Group D** (Post-Save UX) — polish, can ship later

## Worker Allocation

Each group is a self-contained unit that can be delegated to a worker:
- **Worker A**: Group A (QuickCapture mobile redesign + warm aesthetic)
- **Worker B**: Group B (Daily prompts/topics system)
- **Worker C**: Group C (Sidebar/header unification)
- **Worker D**: Group E (Mobile keyboard handling) — after A is done
- **Worker E**: Group D (Post-save UX) — after A is done

Groups A and B can run in parallel. Group C can run in parallel. Group E depends on A. Group D depends on A.