Now I have a full picture. Let me do a thorough analysis.Good — I have everything I need. Here's a thorough analysis:

---

## Bug & Design Analysis of `LiveSkyRadar`

### 🔴 Critical Bug: Tooltip Clipping

**Root cause:** The tooltip is positioned with `bottom-full` (above the planet dot) and the entire radar container has `overflow-hidden` on it — `className="relative w-full aspect-square overflow-hidden"`. Any planet near the top edge (top ~0–15% of the container) will have its tooltip clipped hard by that boundary.

**Fix:** Remove `overflow-hidden` from the radar container and instead clip only the orbit rings using a separate wrapper. The planets and their tooltips need to overflow freely. Additionally, you need **smart tooltip flip logic** — when a planet is in the top half of the radar, the tooltip should render *below* the planet, not above.

```tsx
// Instead of bottom-full always, compute quadrant:
const isTopHalf = offset.top < 50%; // from longitudeToOffset
// Render tooltip above if bottom half, below if top half
```

---

### 🟠 Design Flaws

**1. Pluto radius is 47% — but `overflow-hidden` clips it at the edge anyway**
Pluto at radius 47 means its center is at 47% from center (94% of the container width), so the planet image (28px) is literally half-outside. Even without the tooltip problem, the planet itself may be partially clipped on smaller screens.

**2. Sun is always centered but has no orbit label or longitude shown**
Every other planet shows sign + longitude on hover. The Sun's tooltip is missing entirely — it just links to `/learn/planets/sun` with no data shown.

**3. Mobile ecliptic strip is a dead end UX-wise**
The horizontal strip is basically just a row of tiny icons at arbitrary X positions along a line. There's no zodiac reference, no sense of what 0°–360° means, and planets that are close in longitude completely overlap each other. No visual hierarchy.

**4. No zodiac wheel reference**
The radar shows orbits as concentric circles but has zero ecliptic/zodiac reference. A user with no astrology knowledge has no idea what they're looking at — where is Aries, where is 0°? This is a *landing page* component — it needs immediate legibility.

**5. Planets can stack on top of each other**
Two planets at similar longitudes on adjacent orbits can visually collide since they're positioned purely by longitude with no collision avoidance.

**6. Retrograde highlight only auto-selects one planet**
`setHighlightedId` picks the *first* retrograde planet and highlights it on load, but the ring only appears on `highlightedId`. Multiple retrogrades create no visual distinction on the radar itself — the orange pulse ring is on all retrograde planets, but the highlight ring only on one.

---

### 💡 Missing Display Mode: **Earth-Centered Zodiac Wheel**

The current view is a **heliocentric orbital map** (Sun at center, planets on their orbital paths). This is physically intuitive but astrologically *wrong* — astrology uses a **geocentric** perspective. You're missing the display that actually matters to users:

**The Zodiac Wheel (Earth-centered)**
- Earth at the center (or implied center)
- 12 zodiac signs arranged around the circumference like a clock (each sign = 30°)
- Planets placed at their ecliptic longitude on the wheel's rim
- This is exactly what a birth chart looks like — it's instantly recognizable and emotionally engaging

This view would:
- Show *which sign* each planet is in visually, not just in a tooltip
- Be far more meaningful to the astrology-curious user
- Create a direct bridge to "your birth chart looks like this"

---

### 🟡 Third Display Idea: **Live Telemetry Data Table / Ticker**

A secondary display (below the radar or as a tab) showing a scannable table:

| Planet | Sign | Longitude | Distance | Status |
|--------|------|-----------|----------|--------|
| ☿ Mercury | ♈ Aries | 14.2° | 0.81 AU | ℞ Retrograde |
| ♀ Venus | ♊ Gemini | 3.7° | 1.23 AU | Direct |

This adds credibility ("real astronomical data") and serves users who want precision, not just visuals.

---

### Summary of Recommended Changes

| Priority | Issue | Fix |
|----------|-------|-----|
| 🔴 Critical | Tooltip clipped by `overflow-hidden` | Remove from radar container; add tooltip flip logic |
| 🔴 Critical | Pluto/outer planets near edge | Reduce max radius to ~42%, or add padding to container |
| 🟠 High | No zodiac wheel view | Add Earth-centered wheel as primary or togglable display |
| 🟠 High | No ecliptic reference on radar | Add faint 12-segment zodiac ring to outer edge |
| 🟠 High | Sun missing tooltip data | Add same hover tooltip with longitude/sign |
| 🟡 Medium | Mobile strip has overlap + no reference | Replace with zodiac arc or vertical list |
| 🟡 Medium | No collision avoidance for stacked planets | Offset overlapping planets radially or angularly |
| 🟡 Medium | Missing telemetry table | Add expandable data table below radar |

---

Want me to rewrite the component with these fixes applied — including the tooltip flip logic, the Earth-centered zodiac wheel as a toggle, and the outer orbit clipping fix?