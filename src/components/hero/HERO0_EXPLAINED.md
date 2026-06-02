# Hero0 — Slide System Explained

## Overview

`hero0.tsx` is a 3-phase auto-rotating hero component. The right column cycles through slide content while the left column (headline, CTAs, social proof) stays static. Everything is decomposed into focused, single-responsibility files under `slides/`.

---

## File Architecture

```
src/components/hero/
├── hero0.tsx                          # Orchestrator — state machine + layout only
└── slides/
    ├── constants.ts                    # Timing, weights, planet lists
    ├── placements.ts                   # Sample chart + Big Three derivation
    ├── retrograde-logic.ts            # Retrograde scanning & sorting
    ├── hero-text.tsx                   # Left column — headline, CTAs, social proof
    ├── slide-frame.tsx                 # Decorative rings + ambient glow wrapper
    ├── chart-slide.tsx                 # Phase 0 — natal chart
    ├── sign-card.tsx                   # Phase 1 — zodiac sign card
    ├── retrograde-card.tsx            # Phase 2 — retrograde planet card
    └── slide-indicators.tsx           # 3-dot phase selector
```

| File | Lines | Job |
|---|---|---|
| `hero0.tsx` | 151 | Imports + state machine + JSX layout. No business logic, no inline UI. |
| `constants.ts` | 30 | All magic numbers in one place — timing, weights, caps. |
| `placements.ts` | 27 | Sample chart creation + Big Three (Sun/Moon/Rising) extraction. |
| `retrograde-logic.ts` | 98 | Scans 2 years forward per planet to find retrograde windows; sorts by weight. |
| `hero-text.tsx` | 117 | Left-column block — badge, headline, sub-copy, CTA buttons, avatar social proof. |
| `slide-frame.tsx` | 52 | Animated ambient glow + two counter-rotating decorative rings. |
| `chart-slide.tsx` | 23 | Thin wrapper — `motion.div` entrance/exit + `ChartCircleView`. |
| `sign-card.tsx` | 135 | Big Three reveal — constellation bg, zodiac icon in element frame, name, archetype. |
| `retrograde-card.tsx` | 117 | Retrograde reveal — planet image, name, days-left, date range. |
| `slide-indicators.tsx` | 37 | 3 clickable dot indicators — active dot expands + scaleX animation. |

---

## Slides & Timing

| Phase | Duration | Content | Visual |
|---|---|---|---|
| 0 — Chart | 6s | Full natal birth chart (`ChartCircleView`) | Astrological wheel with planets |
| 1 — Big Three | 3 × 4s = 12s | Sun Sign → Moon Sign → Rising Sign | Constellation bg, zodiac icon in element frame, name reveal |
| 2 — Retrogrades | up to 4 × 4s | Retrograde planets (active first, then upcoming) | Planet image, name with themed glow, days-left badge |

Cycle: **0 → 1 → 2 → 0 → …** (if no retrogrades exist, phase 1 → 0 directly)

### Key Config (`constants.ts`)

```ts
SLIDE_DURATIONS = { chart: 6_000, placement: 4_000, retrograde: 4_000 }
PSYCHOLOGICAL_WEIGHT = { mercury:1, venus:2, mars:3, saturn:4, jupiter:5, uranus:6, neptune:7, pluto:8 }
RETROGRADE_PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
MAX_RETROGRADE_SHOWN = 4
```

All tuning values in one file — change durations, caps, or weight ranking without touching any component.

---

## State Management (`hero0.tsx`)

| State | Type | Purpose |
|---|---|---|
| `mounted` | `boolean` | Gates entrance animations + timer start (hydration guard) |
| `phase` | `0 \| 1 \| 2` | Which slide is active |
| `placementIdx` | `0–2` | Sub-index within Big Three (Sun/Moon/Rising) |
| `retroIdx` | `0–3` | Sub-index within Retrogrades |
| `retroSlides` | `RetrogradeWindow[]` | Populated on mount via `getRetrogradeSlides()` |

### Timer Logic (single `useEffect`)

The main `useEffect` watches `[mounted, phase, placementIdx, retroIdx, retroCount]` and sets a single `setTimeout` based on the current phase:

- **Phase 0**: fires after `SLIDE_DURATIONS.chart` (6s) → transitions to phase 1
- **Phase 1**: fires after `SLIDE_DURATIONS.placement` (4s):
  - Not last placement → advances `placementIdx`
  - Last placement + retrogrades exist → transitions to phase 2
  - Last placement + no retrogrades → transitions back to phase 0
- **Phase 2**: fires after `SLIDE_DURATIONS.retrograde` (4s):
  - Not last retrograde → advances `retroIdx`
  - Last retrograde → transitions back to phase 0, resets `retroIdx`

Cleanup clears the timer on every re-render (no stale timers).

---

## Layout Structure

```
<section>                                          ← full viewport height
  <div>  background radial gradient                ← subtle sun-colored radial
  <div>  max-w-7xl container
    <div>  2-col grid
      <HeroText mounted={mounted} />               ← LEFT COLUMN (static)
      <div>                                         ← RIGHT COLUMN
        <SlideFrame>                               ← decorative rings + ambient glow
          <div aspect-square overflow-clip>        ← FIXED SIZE CONTAINER
            <AnimatePresence mode="wait">
              <ChartSlide />                        ← phase 0
              <SignCard />                          ← phase 1 (wrapped in motion.div)
              <RetrogradeCard />                    ← phase 2 (wrapped in motion.div)
            </AnimatePresence>
          </div>
        </SlideFrame>
        <SlideIndicators />                         ← pinned below slides (never moves)
      </div>
    </div>
  </div>
</section>
```

### Why the Fixed Container?

The `aspect-square max-w-[580px] overflow-clip mx-auto` div is **the single source of truth for slide dimensions**. Without it, each slide defined its own `max-w` + `aspect-square` (ChartSlide was 560px, SignCard/RetrogradeCard were 580px), causing the indicators to shift down on phase changes. Now:

- The container owns the size — all slides fill it with `w-full h-full`
- `overflow-clip` prevents content from pushing the container taller
- Indicators stay in the exact same position regardless of phase
- ChartSlide, SignCard, and RetrogradeCard all inherit this container's dimensions

---

## Data Flow

```
constants.ts ────────────────────────────────┐
  SLIDE_DURATIONS                            │
  PSYCHOLOGICAL_WEIGHT  ──┐                  │
  RETROGRADE_PLANETS     ──┼──┐               │
  MAX_RETROGRADE_SHOWN ───┘  │               │
                              ▼               ▼
placements.ts            retrograde-logic.ts  hero0.tsx
  SAMPLE_CHART              getRetrogradeSlides()  ─► phase / idx state
  PLACEMENTS[]              findNextRetrogradeWindow()
                              │
                              ▼
                        RetrogradeWindow[]
                              │
       ┌──────────────┬───────┴──────┬──────────────┐
       ▼              ▼              ▼              ▼
   ChartSlide     SignCard     RetrogradeCard   SlideIndicators
   (data prop)    (placement)  (retroWindow)   (active + onSelect)
```

---

## Component Details

### `HeroText` — Left Column

Self-contained static block. Accepts `mounted` prop to gate entrance animations (staggered: badge 0.05s → headline 0.1s → sub-copy 0.2s → CTAs 0.3s → social proof 0.4s).

Contains:
- **Badge** — "Precision Astronomy" with pulse dot
- **Headline** — two-line serif hero, gradient text on "Cosmic Journey"
- **Sub-copy** — paragraph with *wisdom* / *fortune-telling* emphasis
- **CTAs** — "Birth Chart" (primary) + "Ask Oracle" (galactic variant)
- **Social proof** — 4 avatar stack, "Join 10,000+", star rating

### `SlideFrame` — Decorative Wrapper

Renders three animated layers behind slide content:

1. **Ambient golden glow** — pulsing `bg-primary/10` circle, scales 1→1.15→1 over 6s
2. **Outer ring** — solid `border-primary/10`, rotates clockwise over 120s, two small dot markers
3. **Inner ring** — dashed `border-primary/[0.07]`, counter-rotates over 180s

Entrance animation: scale 0.85→1 + slight -5° rotation straighten (1s, spring ease).

### `ChartSlide` — Phase 0

Minimal wrapper. `motion.div` with scale/opacity entrance + exit (0.6s). Renders `ChartCircleView` — fills the fixed container via `w-full h-full`.

### `SignCard` — Phase 1

Exports `PlacementInfo` type (shared with `placements.ts`).

Visual stack (top to bottom):
1. **Constellation watermark** — full-bleed background, fades 35%→12% + zooms out 2x→1.5x on reveal
2. **Element glow** — `w-72 h-72 blur-[80px]` at 40% opacity, themed by sign's element
3. **Label** — "☉ Sun Sign" / "☽ Moon Sign" / "↑ Rising Sign" (white, uppercase, serif)
4. **Icon + Frame** — zodiac icon (`w-[6rem] h-[6rem]`) centered in `w-56 h-56` container
   - Element frame image rotates 0°→45° on reveal (1.4s)
   - Inner blur glow at 30% opacity
5. **Sign name** — `text-5xl lg:text-[4.25rem]`, white on reveal, text-shadow with element glow
6. **Archetype · Element** — tiny uppercase meta line, fades in

Self-managed `revealed` state — resets to `false` on every `signId` change, then `true` after 300ms delay.

### `RetrogradeCard` — Phase 2

Exports `RetrogradeWindow` type (shared with `retrograde-logic.ts`).

Visual stack (top to bottom):
1. **Theme glow** — `w-48 h-48 blur-[64px]` at 20% opacity (toned down — was 72px/45%)
2. **Label** — "☿ Retrograde Active" / "☿ Next Retrograde" (white, uppercase, serif)
3. **Planet image** — `w-56 h-56` container, scales 0.8→1 on enter (0.5s)
   - Inner blur glow at 12% opacity (toned down — was 3xl/30%)
   - Planet image has `brightness(0.85→1.1)` transition on reveal
   - Fallback: symbol character in bordered circle if no imageUrl
4. **Planet name** — `text-5xl lg:text-[4.25rem]`, white on reveal
   - Text shadow: `12px` + `28px` spread (toned down — was 24px/48px)
5. **Days badge + date range** — "14 days left · Jun 1 – Jul 5", primary color

Self-managed `revealed` state — resets on every `planetId` change, then `true` after 150ms delay.

### `SlideIndicators` — Dots

3 clickable dots. Active dot is `28px` wide, inactive `8px`. Active dot gets a `scaleX` reveal animation. Clicking a dot jumps to that phase's first sub-item.

---

## Retrograde Ordering (Psychological Weight)

```ts
PSYCHOLOGICAL_WEIGHT = {
  mercury: 1,   // communication, tech, travel — most personally felt
  venus: 2,     // love, money, aesthetics
  mars: 3,      // action, energy, conflict
  saturn: 4,    // discipline, structure
  jupiter: 5,   // growth, expansion
  uranus: 6,    // sudden change, revolution
  neptune: 7,   // illusion, spirituality
  pluto: 8,     // slowest, generational — least personally felt
}
```

Active retrogrades always sort first (by weight ascending), then upcoming retrogrades (by weight ascending). Capped at 4 via `MAX_RETROGRADE_SHOWN`.

---

## Data: Sample Chart & Placements (`placements.ts`)

The hero uses a **hardcoded sample chart** (June 15, 1995, noon, NYC) so the carousel works for first-time visitors. Replace with real user data after onboarding:

```ts
SAMPLE_CHART = calculateFullChart(1995, 6, 15, 12, 0, 40.7128, -74.006)
```

`PLACEMENTS` is derived once at module load — an array of up to 3 `PlacementInfo` objects (Sun, Moon, Rising sign IDs extracted from the chart).

---

## Retrograde Scanning (`retrograde-logic.ts`)

`findNextRetrogradeWindow(planetId, fromDate)` scans up to 730 days forward:

1. **If the planet is currently retrograde**: scan day-by-day until retrograde ends → return the window with `isActive: true`
2. **If not retrograde**: scan forward until retrograde starts, then scan forward until it ends → return the window with `isActive: false`

`getRetrogradeSlides()` calls this for every planet in `RETROGRADE_PLANETS`, sorts by active-first + psychological weight, and caps at `MAX_RETROGRADE_SHOWN`.

---

## Animation Strategy

| Layer | Technique |
|---|---|
| Entrance (page load) | `motion.div` with `initial`/`animate` + staggered delays — gated by `mounted` flag |
| Slide transitions | `AnimatePresence mode="wait"` — current slide exits before new one enters |
| Slide enter/exit | Scale 0.95→1 in, 1→1.04 out (0.4s, spring ease) |
| Content reveal (SignCard, RetrogradeCard) | Self-managed `revealed` boolean — resets on content change, fires after short delay |
| Decorative rings | Infinite CSS rotation via `motion.div` (120s clockwise, 180s counter) |
| Ambient glow | Infinite scale+opacity pulse (6s loop) |
| Indicators | Active dot `scaleX` wipe (0.4s) |