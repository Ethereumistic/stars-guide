/**
 * Hero0 — shared constants & timing config
 */

/** How long each slide type stays visible (ms) */
export const SLIDE_DURATIONS: Record<string, number> = {
  chart: 6_000,
  placement: 4_000,
  retrograde: 4_000,
  oracle: 7_000,
};

/** Psychological weight ranking (highest personal impact first) */
export const PSYCHOLOGICAL_WEIGHT: Record<string, number> = {
  mercury: 1,
  venus: 2,
  mars: 3,
  saturn: 4,
  jupiter: 5,
  uranus: 6,
  neptune: 7,
  pluto: 8,
};

/** Planets that can go retrograde (in astrological order) */
export const RETROGRADE_PLANETS = [
  "mercury", "venus", "mars", "jupiter",
  "saturn", "uranus", "neptune", "pluto",
];

/** Max retrograde cards to show in the carousel */
export const MAX_RETROGRADE_SHOWN = 4;