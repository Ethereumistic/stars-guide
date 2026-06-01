# Hero0 — Slide System Explained

## Overview

`hero0.tsx` is a 3-slide auto-rotating hero component. The right column cycles through content while the left column (text, CTAs, trust indicators) stays static.

## Slides & Timing

| Slide | Duration | Content |
|-------|----------|---------|
| 0 — Chart | 4s total | Full natal birth chart (`ChartCircleView`) |
| 1 — Big Three | 3 × 2.5s = 7.5s | Sun Sign → Moon Sign → Rising Sign (one sub-slide each) |
| 2 — Retrogrades | up to 4 × 2.5s | Retrograde planets (active first, then upcoming, by psych weight) |

Cycle: **0 → 1 → 2 → 0 → …** (if no retrogrades exist, 1 → 0 directly)

## State Management

- **`phase: 0 | 1 | 2`** — which slide is active
- **`placementIdx: 0–2`** — sub-index within Big Three (Sun/Moon/Rising)
- **`retroIdx: 0–3`** — sub-index within Retrogrades
- **`revealed: boolean`** — triggers the reveal animation (glow fade-in, icon scale, text slide-up) on sign cards; flipped `false` → `true` on each sub-slide transition with a small delay

## Timer Logic (single `useEffect`)

The main `useEffect` watches `[mounted, phase, placementIdx, retroIdx, retroCount]` and sets a single `setTimeout` based on the current phase:

- **Phase 0**: fires after `SLIDE_DURATIONS.chart` (4s) → transitions to phase 1
- **Phase 1**: fires after `SLIDE_DURATIONS.placement` (2.5s) → advances `placementIdx`, or if last placement → transitions to phase 2 (or back to 0 if no retrogrades)
- **Phase 2**: fires after `SLIDE_DURATIONS.retrograde` (2.5s) → advances `retroIdx`, or if last retrograde → transitions back to phase 0

A separate `useEffect` re-triggers `revealed = true` with a 200ms delay when `phase` or sub-index changes inside phases 1/2.

## Dot Indicators

3 dots at the bottom (absolutely positioned so they don't displace the chart). Clicking a dot jumps to that slide's first sub-item, regardless of internal cycling.

## Retrograde Ordering (Psychological Weight)

```ts
PSYCHOLOGICAL_WEIGHT = { mercury:1, venus:2, mars:3, saturn:4, jupiter:5, uranus:6, neptune:7, pluto:8 }
```

All detected retrograde windows are sorted: **active retrogrades first** (by weight), then **upcoming retrogrades** (by weight). Capped at 4 total.

Mercury is #1 because Mercury retrograde has the most immediate personal impact (communication, tech, travel). Pluto is last because it's a slow generational planet whose retrograde is least personally felt.

## Visual Layout per Slide

All 3 slides share the same outer container with decorative rings and ambient glow.

### Slide 0 (Chart)
- `ChartCircleView` at `max-w-[400/500/560px]` — bigger than original hero1
- No "Rising" label overlay (removed)

### Slide 1 (Big Three)
- `SignCard` component — constellation watermark, zodiac icon in element frame, reveal animation via `isRevealed`
- **Label text** (`☉ Sun Sign` etc.) → **white** (`#ffffff`), not elemental color
- Icon frame: `w-40 h-40`, icon: `w-[4.5rem] h-[4.5rem]`
- Container: `max-w-[420/520/580px]`
- `AnimatePresence mode="wait"` for smooth blur/scale transitions between sub-slides

### Slide 2 (Retrogrades)
- `RetrogradeCard` — **mirrors the Big Three layout exactly**:
  1. Top: `☿ Retrograde Active` / `☿ Next Retrograde` — white label
  2. Center: planet image in `w-40 h-40` container with glow
  3. Below: planet name (`text-5xl lg:text-[4.25rem]`) with theme-color text-shadow on reveal
  4. Bottom: `14 days left · Jun 1 – Jul 5` — uses **primary color**, not per-planet color
- Badge and info card from hero3 have been **removed** — everything is in the same vertical stack as Big Three
- Uses `isRevealed` for glow/name/duration reveal animation, same as SignCard

## Key Config

```ts
SLIDE_DURATIONS = { chart: 4000, placement: 2500, retrograde: 2500 }
MAX_RETROGRADE_SHOWN = 4
```

These are constants at the top of the file for easy tuning.