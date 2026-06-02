import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import type { PlacementInfo } from "./sign-card";

/**
 * Sample natal chart used by the hero carousel.
 * Replace with real user data once onboarding is complete.
 */
export const SAMPLE_CHART = calculateFullChart(1995, 6, 15, 12, 0, 40.7128, -74.006);

/**
 * Derive the Big Three placements (Sun, Moon, Rising)
 * from the sample chart.
 */
export function getPlacements(): PlacementInfo[] {
  const placements: PlacementInfo[] = [];
  const sunP = SAMPLE_CHART.planets.find((p) => p.id === "sun");
  const moonP = SAMPLE_CHART.planets.find((p) => p.id === "moon");
  const ascP = SAMPLE_CHART.ascendant;

  if (sunP) placements.push({ label: "Sun Sign", symbol: "☉", signId: sunP.signId });
  if (moonP) placements.push({ label: "Moon Sign", symbol: "☽", signId: moonP.signId });
  if (ascP) placements.push({ label: "Rising Sign", symbol: "↑", signId: ascP.signId });

  return placements;
}

/** Pre-computed Big Three */
export const PLACEMENTS = getPlacements();