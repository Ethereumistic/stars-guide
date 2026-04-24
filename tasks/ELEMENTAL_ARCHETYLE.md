# Elemental Archetype Spider Chart — Implementation Spec

## Overview

Replace (or augment) the existing `ElementalBalanceCard` circular donut chart with a **spider / radar chart** that maps 12 archetypal trait axes derived from a weighted elemental + sign-specific scoring model. The chart should feel like a character ability radar from a dark fantasy game — think the image reference (12-sided spider web, bold lines, glowing polygon fill) but rendered in the project's existing dark astronomical aesthetic.

---

## Design Language (inherit from existing codebase)

| Token | Value |
|---|---|
| Background | `bg-black/40` with `border border-white/5` |
| Grid lines | `rgba(255,255,255,0.08)` — thin, white, ghosted |
| Axis labels | `rgba(255,255,255,0.55)`, font-serif, small caps |
| Polygon fill | Element color at `0.15` opacity |
| Polygon stroke | Element color at full opacity, `strokeWidth: 1.5` |
| Polygon glow | `feGaussianBlur stdDeviation="6"` filter, element color |
| Data points | Small filled circles, element color, `r=3` |
| Axis tick rings | 5 concentric rings at 20 / 40 / 60 / 80 / 100% of max radius |
| Dominant ambient | Radial gradient glow behind chart, dominant element color at `opacity-10` |

Element colors (from existing file):
```
Fire:  stroke #FF6B35 | glow rgba(255,107,53,0.35)  | dim rgba(255,107,53,0.08)
Earth: stroke #8BA840 | glow rgba(139,168,64,0.35)  | dim rgba(139,168,64,0.08)
Air:   stroke #87CEEB | glow rgba(135,206,235,0.35) | dim rgba(135,206,235,0.08)
Water: stroke #4AA3FF | glow rgba(74,163,255,0.35)  | dim rgba(74,163,255,0.08)
```

The **polygon color** should be the dominant element's color. If scores are close (within 10 pts of each other across elements) blend toward a neutral white glow.

---

## The 12 Spider Axes

The reference image uses 12 axes. We map them to astrological archetypes. Each axis has a name, a **suit symbol** (♠ ♥ ♦ ♣ mirroring the reference), and a **primary element association**:

| # | Axis Name | Symbol | Primary Element |
|---|---|---|---|
| 1 | Vitality & Drive | ♦ Fire | Fire |
| 2 | Intuition | ♥ Water | Water |
| 3 | Intellect | ♠ Air | Air |
| 4 | Groundedness | ♣ Earth | Earth |
| 5 | Magnetism / Charisma | ♥ Fire | Fire |
| 6 | Endurance | ♣ Earth | Earth |
| 7 | Emotional Depth | ♥ Water | Water |
| 8 | Communication | ♠ Air | Air |
| 9 | Transformation | ♦ Water | Water |
| 10 | Adaptability | ♠ Air | Air |
| 11 | Willpower | ♦ Fire | Fire |
| 12 | Sensitivity / Empathy | ♥ Water | Water |

Axes are evenly distributed at 30° increments (360 / 12 = 30°). Start at top (−90° / 270°), go clockwise.

---

## Scoring Model

### Step 1 — Base element weights (from placements)

For each planet placement, score its element:

```
Fire signs:  Aries, Leo, Sagittarius  → Fire
Earth signs: Taurus, Virgo, Capricorn → Earth
Air signs:   Gemini, Libra, Aquarius  → Air
Water signs: Cancer, Scorpio, Pisces  → Water
```

**Planet weight multipliers** (personal planets count more):

| Planet | Weight |
|---|---|
| Sun | 3 |
| Moon | 3 |
| Ascendant | 2.5 |
| Mercury | 2 |
| Venus | 2 |
| Mars | 2 |
| Jupiter | 1.5 |
| Saturn | 1.5 |
| Uranus | 1 |
| Neptune | 1 |
| Pluto | 1 |
| North Node | 0.5 |
| South Node | 0.5 |
| Part of Fortune | 0.5 |
| Chiron | 0.5 |

Compute weighted totals per element: `fireScore`, `earthScore`, `airScore`, `waterScore`.
Normalize to 0–100 using `max(all four)` as denominator.

### Step 2 — Sign-specific archetype modifiers

Each of the 12 signs adds a **targeted bonus** to specific axes. This is what differentiates Aries from Leo from Sagittarius even though they are all Fire.

```
ARIES (Fire — Cardinal)
  Vitality & Drive      +25
  Willpower             +20
  Adaptability          +8
  Magnetism             +5

LEO (Fire — Fixed)
  Magnetism/Charisma    +25
  Vitality & Drive      +15
  Willpower             +10
  Endurance             +8

SAGITTARIUS (Fire — Mutable)
  Adaptability          +20
  Intellect             +15
  Vitality & Drive      +10
  Communication         +8

TAURUS (Earth — Fixed)
  Groundedness          +25
  Endurance             +20
  Sensitivity/Empathy   +8
  Magnetism             +5

VIRGO (Earth — Mutable)
  Groundedness          +18
  Communication         +15
  Intellect             +12
  Endurance             +10

CAPRICORN (Earth — Cardinal)
  Endurance             +25
  Willpower             +18
  Groundedness          +15
  Transformation        +5

GEMINI (Air — Mutable)
  Communication         +25
  Intellect             +20
  Adaptability          +15
  Intuition             +5

LIBRA (Air — Cardinal)
  Magnetism/Charisma    +20
  Communication         +15
  Sensitivity/Empathy   +10
  Intellect             +8

AQUARIUS (Air — Fixed)
  Intellect             +22
  Adaptability          +18
  Transformation        +10
  Communication         +8

CANCER (Water — Cardinal)
  Emotional Depth       +25
  Sensitivity/Empathy   +22
  Intuition             +15
  Groundedness          +5

SCORPIO (Water — Fixed)
  Transformation        +25
  Emotional Depth       +20
  Willpower             +15
  Intuition             +10

PISCES (Water — Mutable)
  Intuition             +25
  Sensitivity/Empathy   +20
  Emotional Depth       +15
  Adaptability          +8
```

For each planet in a sign, apply these bonuses **multiplied by that planet's weight** (scaled down by factor 10 to keep values sane — i.e. `bonus × weight / 10`).

### Step 3 — Aspect bonuses

Certain aspect types amplify specific axes:

| Aspect | Axes boosted | Bonus |
|---|---|---|
| Conjunction | Both planets' primary axes | +8 |
| Trine | Both planets' primary axes | +5 |
| Sextile | Both planets' primary axes | +3 |
| Square | Willpower, Transformation | +4 (tension = depth) |
| Opposition | Emotional Depth, Adaptability | +3 |

### Step 4 — Final normalization

After summing base + sign modifiers + aspect bonuses for each of the 12 axes, **normalize all 12 values to 0–100** using the max observed value as ceiling. This ensures the chart always has at least one axis at 100 and avoids flat/collapsed charts.

---

## Sample Calculation for Provided Birth Data

**Birth data summary:**
- Sun in Gemini (H11) — Air ✦ weight 3
- Moon in Cancer (H12) — Water ✦ weight 3
- Mercury in Cancer (H12) — Water ✦ weight 2
- Venus in Gemini (H11) — Air ✦ weight 2
- Mars in Gemini (H11) — Air ✦ weight 2
- Jupiter in Taurus (H10) — Earth ✦ weight 1.5
- Saturn in Taurus (H10) — Earth ✦ weight 1.5
- Uranus in Aquarius (H7) — Air ✦ weight 1 (retrograde)
- Neptune in Aquarius (H7) — Air ✦ weight 1 (retrograde)
- Pluto in Sagittarius (H5) — Fire ✦ weight 1 (retrograde)
- Ascendant in Leo — Fire ✦ weight 2.5
- North Node in Cancer — Water ✦ weight 0.5
- South Node in Capricorn — Earth ✦ weight 0.5
- Part of Fortune in Virgo — Earth ✦ weight 0.5
- Chiron in Sagittarius — Fire ✦ weight 0.5

**Raw weighted element totals:**
```
Fire:  Pluto(1) + ASC(2.5) + Chiron(0.5) = 4.0
Earth: Jupiter(1.5) + Saturn(1.5) + SouthNode(0.5) + PoF(0.5) = 4.0
Air:   Sun(3) + Venus(2) + Mars(2) + Uranus(1) + Neptune(1) = 9.0  ← dominant
Water: Moon(3) + Mercury(2) + NorthNode(0.5) = 5.5
```

**Dominant element: AIR** → polygon color `#87CEEB`

**Expected approximate axis profile** (before normalization, illustrative):
- Communication: very high (Sun+Venus+Mars all Gemini + Mercury Cancer boosts)
- Intellect: high (Gemini stellium + Aquarius outer planets)
- Adaptability: high (Gemini mutable + Sagittarius mutable placements)
- Emotional Depth: medium-high (Moon+Mercury in Cancer)
- Sensitivity/Empathy: medium (Cancer placements)
- Intuition: medium (Cancer Moon, some Pisces echo from Water)
- Magnetism/Charisma: medium (Leo ASC gives +25 to Magnetism)
- Vitality & Drive: medium-low (only Pluto+Chiron in Sag for Fire)
- Willpower: medium-low (Saturn in Taurus helps, but limited Fire)
- Transformation: medium (Pluto + Scorpio-flavored aspects)
- Groundedness: low-medium (Jupiter+Saturn Taurus + PoF Virgo)
- Endurance: low-medium (Taurus placements)

**Key aspects that influence axes:**
- Sun conjunct Venus (+8 to Communication, Magnetism)
- Moon sextile Jupiter/Saturn (+3 to Emotional Depth, Groundedness)
- Mars trine Uranus (+5 to Adaptability, Vitality)
- Jupiter conjunct Saturn (+8 to Endurance, Groundedness)
- Sun opposition Pluto (+3 to Emotional Depth, Adaptability — tension axis)

---

## Component Architecture

### File: `ElementalSpiderChart.tsx`

```
Props:
  birthData: {
    placements: LegacyPlacement[]   // same as existing
    chart: {
      aspects: Aspect[]
      planets: Planet[]
      ascendant: { signId: string }
    }
  }
  delay?: number
```

### Internal structure:

```
<motion.div>  ← fade-in wrapper
  <div>  ← card shell (border-white/5, bg-black/40, rounded-2xl)
    
    [Header section]
      TbHexagon icon + "Elemental Archetype Profile" title + body count

    [Chart + Stats grid — lg:grid-cols-2]

      LEFT: SVG spider chart
        <defs>
          <filter id="glow-web"> feGaussianBlur stdDeviation="6"
          <filter id="glow-poly"> feGaussianBlur stdDeviation="8"
        </defs>

        <!-- Concentric rings (5 rings) -->
        {[0.2,0.4,0.6,0.8,1.0].map(r =>
          <polygon points={getRegularPolygon(cx,cy,maxR*r,12)} 
                   stroke="rgba(255,255,255,0.06)" fill="none" />
        )}

        <!-- Axis lines (12 spokes) -->
        {axes.map((axis, i) =>
          <line from center to edge, stroke="rgba(255,255,255,0.08)" />
        )}

        <!-- Element color "zone" rings on outer ring only -->
        <!-- The outermost ring is segmented by element color like the existing arc chart -->
        <!-- 3 axes per element (12 / 4), colored arcs at outer boundary -->

        <!-- Score polygon (filled, glowing) -->
        <polygon points={computedScorePoints}
                 fill={dominantColor at 0.15 opacity}
                 stroke={dominantColor}
                 strokeWidth="1.5"
                 filter="url(#glow-poly)" />

        <!-- Data point dots on polygon vertices -->
        {scores.map((s, i) =>
          <circle r="3" fill={dominantColor} />
        )}

        <!-- Axis labels (outside outermost ring) -->
        {axes.map((axis, i) =>
          <text>{axis.symbol} {axis.name}</text>
          <text fontSize="8" opacity="0.4">{score}/100</text>
        )}

        <!-- Center label -->
        <text>dominant element name</text>

      RIGHT: Axis breakdown list
        <!-- 12 axes grouped by element -->
        <!-- Each row: element color dot + axis name + score bar + score value -->
        <!-- 4 element sections with headers -->

    [Dominant Principle footer]
      Same pattern as existing — colored element name + description prose

```

---

## SVG Spider Geometry Helpers

```typescript
// Regular 12-gon vertex at index i
function spiderPoint(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number = 12
): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

// Build SVG polygon points string from score array (0-100)
function buildPolygonPoints(
  cx: number,
  cy: number,
  maxRadius: number,
  scores: number[]  // length 12, values 0-100
): string {
  return scores
    .map((score, i) => {
      const r = (score / 100) * maxRadius
      const { x, y } = spiderPoint(cx, cy, r, i)
      return `${x},${y}`
    })
    .join(' ')
}
```

---

## Outer Ring Element Color Segments

The outermost pentagon ring should have colored segments (3 consecutive axes per element), matching the existing donut chart's visual language. Implementation: draw 4 colored `<polygon>` arcs between the 4th and 5th concentric rings, one per element group, clipped/masked to their 3-axis sector. Use `rgba(color, 0.25)` fill, full-opacity stroke on the outer edge only.

Element-to-axis grouping (axes 0-indexed):

```
Fire axes:   0 (Vitality), 4 (Magnetism), 10 (Willpower)     → but spread around circle, NOT contiguous
```

> **Important:** Do NOT cluster all fire axes together. They should be **distributed around the chart** so the spider shape is visually interesting and the color ring segments reflect the elemental flavor at each position, not a pie chart. The element colors on the outermost ring appear AS THE AXIS LABEL BACKGROUND or a small colored dot/pip next to the label — matching the reference image's suit symbol coloring (red = hearts/diamonds, black = clubs/spades). Map as: Fire=red, Water=red-blue, Air=blue, Earth=green.

---

## Responsive Sizing

| Breakpoint | SVG size | maxRadius | Label font |
|---|---|---|---|
| Mobile (<640px) | 300×300 | 100 | 8px |
| Desktop | 380×380 | 130 | 9px |

---

## Animation

Follow existing pattern — `motion/react`:
- Chart polygon: `initial={{ scale: 0, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}` with `duration: 0.9, ease: [0.22, 1, 0.36, 1]`
- Right-side axis bars: stagger `delay + 0.05 * i` per row
- Score dots: fade in `delay + 0.8` after polygon

---

## File Location & Integration

```
src/
  components/
    charts/
      ElementalSpiderChart.tsx   ← new file
  astrology/
    spiderScoring.ts             ← scoring model logic (pure functions, no React)
```

Import `ElementalSpiderChart` wherever `ElementalBalanceCard` is currently used. Props are backward compatible (same `birthData.placements` shape, extended with `birthData.chart` for aspects).

The scoring logic in `spiderScoring.ts` should export:

```typescript
export function computeSpiderScores(
  placements: LegacyPlacement[],
  aspects: Aspect[],
  ascendantSignId: string
): Record<AxisName, number>  // normalized 0-100
```

---

## Axes Order Around the Chart (clockwise from top)

To create visually interesting polygon shapes rather than element-clustered blobs, distribute axes so adjacent axes tend to belong to **different elements**:

```
Position 0  (top, 12 o'clock):      Intuition            [Water ♥]
Position 1  (1 o'clock):            Communication        [Air ♠]
Position 2  (2 o'clock):            Vitality & Drive     [Fire ♦]
Position 3  (3 o'clock):            Emotional Depth      [Water ♥]
Position 4  (4 o'clock):            Intellect            [Air ♦]
Position 5  (5 o'clock):            Endurance            [Earth ♣]
Position 6  (6 o'clock, bottom):    Transformation       [Water ♦]
Position 7  (7 o'clock):            Groundedness         [Earth ♣]
Position 8  (8 o'clock):            Magnetism/Charisma   [Fire ♥]
Position 9  (9 o'clock):            Sensitivity/Empathy  [Water ♥]
Position 10 (10 o'clock):           Willpower            [Fire ♦]
Position 11 (11 o'clock):           Adaptability         [Air ♠]
```

This alternating distribution means the polygon will have a complex, non-symmetric shape — more visually compelling and unique per chart.

---

## Label Color Mapping (matching reference image suit system)

| Element | Color | Suit analog |
|---|---|---|
| Fire | `#FF6B35` (orange-red) | ♦ Red diamond |
| Water | `#4AA3FF` (blue) | ♥ Blue heart |
| Air | `#87CEEB` (sky blue) | ♠ Light spade |
| Earth | `#8BA840` (olive green) | ♣ Green club |

Axis labels that belong to Fire or Water use their respective element colors (making them "pop" as in the reference). Air and Earth labels use slightly dimmer versions or white/gray at 60% opacity.

---

## Tooltip / Hover Interaction (optional enhancement)

On hover of each axis label or data point dot:
- Show a small tooltip (absolute positioned div) with:
  - Axis name
  - Score (0–100)
  - Which placements contributed most (top 2 planet + sign combos)
  - One-line archetype description

---

## Archetype Descriptions (for tooltip / footer)

```
Vitality & Drive:      Raw life force, initiative, the will to begin
Intuition:             Access to unseen currents, gut wisdom
Intellect:             Pattern recognition, analytical clarity
Groundedness:          Embodied presence, material mastery
Magnetism/Charisma:    Radiance, drawing power, natural authority
Endurance:             Capacity to persist, structural resilience
Emotional Depth:       Range of feeling, capacity for intimacy
Communication:         Articulation, connection through language
Transformation:        Capacity to die and be reborn, phoenix force
Adaptability:          Fluidity, the ability to shift and pivot
Willpower:             Focused determination, inner fire discipline
Sensitivity/Empathy:   Psychic attunement, compassion, receptivity
```

---

## Expected Output for Provided Birth Data (approximate normalized scores)

Given the Gemini-heavy Air-dominant chart with Cancer Water placements and Leo Ascendant:

```
Communication:       ~95   (Gemini stellium + aspect boosts)
Intellect:           ~82   (Gemini + Aquarius outer planets)
Adaptability:        ~78   (Gemini mutable + Sag Pluto/Chiron)
Magnetism/Charisma:  ~72   (Leo ASC dominates this axis)
Emotional Depth:     ~65   (Moon+Mercury Cancer)
Sensitivity/Empathy: ~60   (Cancer placements)
Intuition:           ~55   (Cancer Moon)
Transformation:      ~50   (Pluto Sag + Sun opp Pluto)
Willpower:           ~45   (Saturn Taurus, limited Fire)
Groundedness:        ~42   (Jupiter+Saturn Taurus, PoF Virgo)
Endurance:           ~40   (Taurus placements)
Vitality & Drive:    ~35   (minimal Fire — only Pluto/ASC/Chiron)
```

This produces a polygon that juts strongly toward the Air/Communication sector, has a moderate Water bulge, and recedes sharply in the Fire/Endurance quadrant — a distinctive and accurate shape for this natal chart.