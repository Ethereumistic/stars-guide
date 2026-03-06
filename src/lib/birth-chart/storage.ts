import { compositionalSigns } from "../../astrology/signs";
import { resolveBirthDateTime } from "./core";
import { calculateFullChartFromUtcDate } from "./full-chart";
import type { BirthLocation, EnrichedBirthData, LegacyPlacement } from "./types";

function getSignName(signId: string): string {
  return compositionalSigns.find((sign) => sign.id === signId)?.name ?? signId;
}

function getBodyLabel(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildLegacyPlacements(chart: EnrichedBirthData["chart"]): LegacyPlacement[] {
  const placements: LegacyPlacement[] = [];

  if (chart.ascendant) {
    placements.push({
      body: "Ascendant",
      sign: getSignName(chart.ascendant.signId),
      house: 1,
    });
  }

  for (const planet of chart.planets) {
    placements.push({
      body: getBodyLabel(planet.id),
      sign: getSignName(planet.signId),
      house: planet.houseId,
    });
  }

  return placements;
}

export function buildStoredBirthData(input: {
  date: string;
  time: string;
  location: BirthLocation;
}): EnrichedBirthData {
  const [year, month, day] = input.date.split("-").map(Number);
  const [hours, minutes] = input.time.split(":").map(Number);

  const { timezone, utcDate, utcTimestamp } = resolveBirthDateTime(
    year,
    month,
    day,
    hours,
    minutes,
    input.location.lat,
    input.location.long,
  );

  const chart = calculateFullChartFromUtcDate(
    utcDate,
    input.location.lat,
    input.location.long,
  );

  return {
    date: input.date,
    time: input.time,
    timezone,
    utcTimestamp,
    houseSystem: "whole_sign",
    location: input.location,
    placements: buildLegacyPlacements(chart),
    chart,
  };
}


