import { getPlanetTelemetry } from "@/lib/planets/telemetry";
import { differenceInDays } from "date-fns";
import type { RetrogradeWindow } from "./retrograde-card";
import {
  PSYCHOLOGICAL_WEIGHT,
  RETROGRADE_PLANETS,
  MAX_RETROGRADE_SHOWN,
} from "./constants";

/**
 * Scan forward from `fromDate` to find the next retrograde window
 * for a given planet. Returns `null` if nothing is found within ~2 years.
 */
export function findNextRetrogradeWindow(
  planetId: string,
  fromDate: Date,
): RetrogradeWindow | null {
  const maxScanDays = 730;
  let d = new Date(fromDate);

  const todayTelemetry = getPlanetTelemetry(planetId, d);
  let currentlyRetro = todayTelemetry?.retrograde ?? false;

  /* ── Already retro → find when it ends ── */
  if (currentlyRetro) {
    let scanEnd = new Date(d);
    for (let i = 0; i < maxScanDays; i++) {
      scanEnd.setDate(scanEnd.getDate() + 1);
      const t = getPlanetTelemetry(planetId, scanEnd);
      if (!t?.retrograde) {
        return {
          planetId,
          planetName: planetId.charAt(0).toUpperCase() + planetId.slice(1),
          startDate: new Date(d),
          endDate: new Date(scanEnd),
          isActive: true,
          daysLeft: differenceInDays(scanEnd, new Date()),
        };
      }
    }
    return null;
  }

  /* ── Not retro → scan for next start ── */
  let scanStart = new Date(d);
  for (let i = 0; i < maxScanDays; i++) {
    scanStart.setDate(scanStart.getDate() + 1);
    const t = getPlanetTelemetry(planetId, scanStart);
    if (t?.retrograde) {
      const startDate = new Date(scanStart);
      let scanEnd = new Date(startDate);
      for (let j = 0; j < maxScanDays; j++) {
        scanEnd.setDate(scanEnd.getDate() + 1);
        const endT = getPlanetTelemetry(planetId, scanEnd);
        if (!endT?.retrograde) {
          return {
            planetId,
            planetName: planetId.charAt(0).toUpperCase() + planetId.slice(1),
            startDate,
            endDate: new Date(scanEnd),
            isActive: false,
            daysLeft: differenceInDays(startDate, new Date()),
          };
        }
      }
      break;
    }
  }
  return null;
}

/**
 * Collect up to MAX_RETROGRADE_SHOWN retrograde windows, sorted:
 *  active first (by psychological weight), then upcoming (by weight).
 */
export function getRetrogradeSlides(): RetrogradeWindow[] {
  const windows: RetrogradeWindow[] = [];
  for (const planetId of RETROGRADE_PLANETS) {
    const w = findNextRetrogradeWindow(planetId, new Date());
    if (w) windows.push(w);
  }

  const active = windows
    .filter((w) => w.isActive)
    .sort(
      (a, b) =>
        (PSYCHOLOGICAL_WEIGHT[a.planetId] ?? 99) -
        (PSYCHOLOGICAL_WEIGHT[b.planetId] ?? 99),
    );
  const upcoming = windows
    .filter((w) => !w.isActive)
    .sort(
      (a, b) =>
        (PSYCHOLOGICAL_WEIGHT[a.planetId] ?? 99) -
        (PSYCHOLOGICAL_WEIGHT[b.planetId] ?? 99),
    );

  return [...active, ...upcoming].slice(0, MAX_RETROGRADE_SHOWN);
}