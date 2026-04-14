# Rewrite Shooting Stars & Stars Background for Zero-Lag Performance

## Objective

Recreate `shooting-stars.tsx` and `stars-background.tsx` to eliminate all perceptible lag on high-end phones (iPhones) and low-end PCs. The components are used as a **site-wide fixed background** in the root layout (`src/app/layout.tsx:55-71`) and also inside **pricing cards** and **settings sections** (10+ import sites total). The visual result must be identical to the current appearance, but the underlying implementation must be dramatically more efficient.

---

## Root Cause Analysis

### Problem 1: `shooting-stars.tsx` — React state updates every animation frame (CRITICAL)

`src/components/hero/shooting-stars.tsx:84-118`

The shooting star calls `setStar()` inside a `requestAnimationFrame` loop. Every single frame (~60 times/second) triggers a React re-render of the entire SVG subtree. This is the single worst performance offender — React reconciliation on every frame for an animation is an anti-pattern.

**Why it hurts iPhones specifically:** Safari's JavaScript engine has higher per-frame overhead for React state updates than Chrome. On 120Hz ProMotion displays, the loop runs 120 times/second, doubling the already-expensive React re-renders.

### Problem 2: `stars-background.tsx` — Unthrottled canvas redraw loop (HIGH)

`src/components/hero/stars-background.tsx:109-141`

The canvas runs a `requestAnimationFrame` loop that calls `ctx.clearRect()` + redraws every star every frame. With `starDensity=0.0002` on a 1920x1080 screen, that's ~414 stars × 60fps = ~24,840 draw calls/second. On a 4K display it's even worse.

### Problem 3: Multiple concurrent instances (HIGH)

Both components run simultaneously in the root layout AND inside pricing cards. The pricing page (`src/components/pricing/pricing-card.tsx:60-86`) creates a new `StarsBackground` + `ShootingStars` per card. With 3 pricing cards visible, that's 4 canvas animation loops + 4 SVG animation loops running concurrently — all fighting for the same paint cycle.

### Problem 4: No GPU acceleration on shooting stars (MEDIUM)

`src/components/hero/shooting-stars.tsx:129-135`

The SVG `<rect>` uses `x`/`y` attributes for positioning instead of CSS `transform: translate()`. This forces layout recalculation rather than GPU-composited movement.

### Problem 5: No reduced-motion respect (LOW)

Neither component checks `prefers-reduced-motion`, meaning users who need reduced animations still get full motion.

---

## Implementation Plan

### Phase 1: Replace `shooting-stars.tsx` with Pure CSS Animations

**Strategy:** Eliminate React state and `requestAnimationFrame` entirely. Use CSS `@keyframes` animations on lightweight `<div>` elements. CSS animations run on the browser's compositor thread — completely off the JavaScript thread — making them immune to JS-side jank.

- [ ] **1.1** Create a new CSS keyframes animation for a shooting star trail. The animation should: start from a randomized edge position, translate diagonally across the viewport with a slight rotation, scale up slightly as it travels, and fade in/out at the start/end. Use `transform: translate() rotate() scale()` exclusively (GPU-composited properties only — no `left`/`top`/`width`/`height` which trigger layout).
- [ ] **1.2** Create a `useShootingStars` hook that manages a pool of 3-5 `<div>` elements (DOM nodes). Each div gets the CSS animation applied. When one animation ends (via `animationend` event), pick a new random start position/angle/delay and restart the animation. This avoids React re-renders entirely — the hook uses refs, not state, to manipulate DOM directly.
- [ ] **1.3** The shooting star visual: a thin `<div>` with a `linear-gradient` background (transparent → trail color → star color) and `border-radius` for the rounded head. Width ~80-150px, height 1-2px. The gradient creates the "tail" effect natively without SVG.
- [ ] **1.4** Randomize each star's properties by setting CSS custom properties (`--start-x`, `--start-y`, `--angle`, `--duration`, `--delay`) on each element before restarting the animation. The keyframes reference these variables via `var()`.
- [ ] **1.5** Add `will-change: transform, opacity` to each shooting star element to promote it to its own GPU layer.
- [ ] **1.6** Maintain the exact same component props interface (`ShootingStarsProps`) so all 10+ import sites work without changes: `minSpeed`, `maxSpeed`, `minDelay`, `maxDelay`, `starColor`, `trailColor`, `starWidth`, `starHeight`, `className`.

### Phase 2: Replace `stars-background.tsx` with a Static Canvas + CSS Twinkle Overlay

**Strategy:** Stop the continuous `requestAnimationFrame` loop. Render stars once onto a static canvas. Use a separate, lightweight CSS-animated overlay for the twinkle effect.

- [ ] **2.1** Render all stars onto the canvas **once** (no animation loop). Use `generateStars()` as-is to get star positions, then draw them all in a single pass. This canvas never redraws unless the viewport resizes.
- [ ] **2.2** For the twinkle effect, overlay a second canvas (or use a CSS approach): create a set of small `<div>` elements (or a single canvas with a periodic redraw at **much** lower frequency — e.g., every 200ms instead of every 16ms). The twinkle is just opacity oscillation — it does NOT need 60fps. A 5fps twinkle is visually indistinguishable from 60fps twinkle to the human eye.
- [ ] **2.3** Alternative twinkle approach (recommended): Instead of a second canvas, use CSS `@keyframes` on small absolutely-positioned `<span>` elements. Generate ~30-50 twinkle points (far fewer than the total star count — only a subset of stars twinkle visibly). Each gets a randomized `animation-duration` and `animation-delay`. This is 100% GPU-composited and costs zero JavaScript after initialization.
- [ ] **2.4** Debounce the `ResizeObserver` handler. Only regenerate stars after the resize has stopped for 200ms. This prevents the expensive star regeneration + canvas redraw from firing repeatedly during mobile address bar show/hide or orientation changes.
- [ ] **2.5** Maintain the exact same component props interface (`StarBackgroundProps`) so all import sites work without changes.

### Phase 3: Add Instance Deduplication for the Root Background

**Strategy:** The root layout renders both components as a fixed full-screen background. Pricing cards and other components render their own instances on top. The pricing card instances are the biggest performance drain because they create additional animation loops.

- [ ] **3.1** For the `StarsBackground` used inside pricing cards (`src/components/pricing/pricing-card.tsx:60-66`): since these are inside `opacity-0 group-hover:opacity-100` containers, add a `pointer-events-none` and use `IntersectionObserver` to only initialize the canvas when the card is actually visible on screen. Better yet, consider whether the card even needs its own star background — the root layout already provides one.
- [ ] **3.2** For `ShootingStars` inside pricing cards (`src/components/pricing/pricing-card.tsx:67-86`): these have very fast delays (`minDelay=200, maxDelay=300`), meaning a new shooting star every ~250ms. Reduce the frequency to `minDelay=1500, maxDelay=3000` for card instances — the visual effect is nearly identical but the work is 6x less.
- [ ] **3.3** Consider creating a lightweight `StarsEffect` wrapper component that accepts a `variant` prop (`"full"` for root layout, `"subtle"` for cards) and automatically adjusts density and frequency.

### Phase 4: Add `prefers-reduced-motion` Support

- [ ] **4.1** In both components, detect `prefers-reduced-motion: reduce` via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- [ ] **4.2** When reduced motion is preferred: render static stars only (no twinkle, no shooting stars). This is both an accessibility win and a performance safety net for users who need it.

### Phase 5: Final Polish and Verification

- [ ] **5.1** Ensure both components maintain their `"use client"` directive and the same export names (`ShootingStars`, `StarsBackground`).
- [ ] **5.2** Verify all 10+ import sites continue working without any import path or prop changes.
- [ ] **5.3** Test on Chrome DevTools with 6x CPU throttling to simulate low-end devices.
- [ ] **5.4** Test on Safari / iPhone simulator to verify ProMotion 120Hz behavior.
- [ ] **5.5** Run Lighthouse Performance audit and compare before/after scores.

---

## Verification Criteria

- [ ] **Zero `requestAnimationFrame` loops in `shooting-stars.tsx`** — the component uses only CSS animations
- [ ] **No continuous animation loop in `stars-background.tsx`** — canvas is drawn once; twinkle is CSS-based
- [ ] **No React state updates during animation** — both components use refs + direct DOM manipulation or CSS
- [ ] **All existing props accepted** — `ShootingStarsProps` and `StarBackgroundProps` interfaces unchanged
- [ ] **All 10+ import sites work without modification** — same component names, same file paths
- [ ] **Visual parity** — the starfield and shooting stars look identical to the current implementation
- [ ] **Chrome DevTools 6x CPU throttling**: no visible frame drops or jank
- [ ] **Lighthouse Performance score improvement** of at least 15+ points on mobile

---

## Potential Risks and Mitigations

1. **CSS animations may look slightly different from SVG**
   Mitigation: The `<div>` with `linear-gradient` background can replicate the SVG `<rect>` + `<linearGradient>` exactly. Test side-by-side before removing the old component.

2. **CSS custom properties in keyframes have limited browser support for `@property`**
   Mitigation: Don't use `@property` for animating custom properties. Instead, generate a few fixed keyframe variants (e.g., 8 different angle presets) and randomly assign one to each shooting star. This works in all browsers.

3. **Static canvas may look "frozen" without the twinkle**
   Mitigation: The CSS twinkle overlay on a subset of stars provides the same alive feeling. The key insight is that only ~10-15% of stars need to visibly twinkle — the rest can be static dots.

4. **Multiple pricing card instances still create DOM overhead**
   Mitigation: The CSS-based approach creates ~5 divs per card (not animation loops), which is negligible. Combined with the `IntersectionObserver` lazy-init, this is a non-issue.

---

## Alternative Approaches

1. **Single shared canvas via React Context**: Render all stars (background + shooting) on one global canvas managed via a provider. Eliminates duplicate instances entirely. Trade-off: more complex architecture, harder to customize per-component (different colors for different pricing tiers).

2. **WebGL / Three.js**: Maximum GPU performance. Trade-off: adds a heavy dependency (~150KB) for what is essentially dots and lines. Overkill for this use case and would increase initial page load.

3. **Pre-rendered video background**: Render the starfield once as a looping video. Trade-off: bandwidth cost, no interactivity, can't adapt to viewport size, poor quality on high-DPI screens.

4. **Pure CSS-only (no canvas at all)**: Use `box-shadow` on a single element to render all stars. Trade-off: `box-shadow` with hundreds of values is actually slower than canvas on low-end devices, and the CSS string becomes enormous on large viewports.

---

## Summary of Performance Impact

| Metric | Current | After Rewrite |
|--------|---------|---------------|
| JS-side rAF loops per page | 4-8 (layout + cards) | 0 |
| React re-renders per second | 60-120 (shooting stars) | 0 |
| Canvas redraws per second | 60-120 × instances | 1 (on resize only) |
| GPU-composited animations | No (SVG layout props) | Yes (CSS transforms) |
| JS thread involvement | Every frame | Only on init/resize |
| Memory per instance | Canvas buffer + rAF + React state | ~5 DOM nodes (CSS only) |
