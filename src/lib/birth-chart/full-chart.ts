import * as Astronomy from "astronomy-engine";
import { compositionalSigns } from "../../astrology/signs";
import { calculateAspects } from "../aspects/calculations";
import { calculateAscendant } from "./calculations";
import { eclipticLongitudeToSign, localBirthTimeToUTC } from "./core";
import type {
  ChartAspectType,
  PlanetDignity,
  StoredBirthChart,
  StoredChartAspect,
  StoredChartHouse,
  StoredChartPlanet,
} from "./types";

export interface ChartPlanet extends StoredChartPlanet {}

export interface ChartHouse extends StoredChartHouse {}

export interface ChartAspect extends StoredChartAspect {}

export interface ChartData extends StoredBirthChart {}

type DignityMap = {
  domicile: string[];
  exaltation: string[];
  detriment: string[];
  fall: string[];
};

const DIGNITIES: Record<string, DignityMap> = {
  sun: { domicile: ["leo"], exaltation: ["aries"], detriment: ["aquarius"], fall: ["libra"] },
  moon: { domicile: ["cancer"], exaltation: ["taurus"], detriment: ["capricorn"], fall: ["scorpio"] },
  mercury: { domicile: ["gemini", "virgo"], exaltation: ["virgo"], detriment: ["sagittarius", "pisces"], fall: ["pisces"] },
  venus: { domicile: ["taurus", "libra"], exaltation: ["pisces"], detriment: ["aries", "scorpio"], fall: ["virgo"] },
  mars: { domicile: ["aries", "scorpio"], exaltation: ["capricorn"], detriment: ["taurus", "libra"], fall: ["cancer"] },
  jupiter: { domicile: ["sagittarius", "pisces"], exaltation: ["cancer"], detriment: ["gemini", "virgo"], fall: ["capricorn"] },
  saturn: { domicile: ["capricorn", "aquarius"], exaltation: ["libra"], detriment: ["cancer", "leo"], fall: ["aries"] },
  uranus: { domicile: ["aquarius"], exaltation: ["scorpio"], detriment: ["leo"], fall: ["taurus"] },
  neptune: { domicile: ["pisces"], exaltation: ["cancer"], detriment: ["virgo"], fall: ["capricorn"] },
  pluto: { domicile: ["scorpio"], exaltation: ["aries"], detriment: ["taurus"], fall: ["libra"] },
};

const PRIMARY_BODIES: Array<{ id: string; body: Astronomy.Body }> = [
  { id: "sun", body: Astronomy.Body.Sun },
  { id: "moon", body: Astronomy.Body.Moon },
  { id: "mercury", body: Astronomy.Body.Mercury },
  { id: "venus", body: Astronomy.Body.Venus },
  { id: "mars", body: Astronomy.Body.Mars },
  { id: "jupiter", body: Astronomy.Body.Jupiter },
  { id: "saturn", body: Astronomy.Body.Saturn },
  { id: "uranus", body: Astronomy.Body.Uranus },
  { id: "neptune", body: Astronomy.Body.Neptune },
  { id: "pluto", body: Astronomy.Body.Pluto },
];

const NODE_SEARCH_WINDOW_DAYS = 40;
const RETROGRADE_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function getDignity(planetId: string, signId: string): PlanetDignity | null {
  const dignity = DIGNITIES[planetId];
  if (!dignity) {
    return null;
  }
  if (dignity.domicile.includes(signId)) {
    return "domicile";
  }
  if (dignity.exaltation.includes(signId)) {
    return "exaltation";
  }
  if (dignity.detriment.includes(signId)) {
    return "detriment";
  }
  if (dignity.fall.includes(signId)) {
    return "fall";
  }
  return "peregrine";
}

function getGeocentricLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    return Astronomy.SunPosition(date).elon;
  }
  if (body === Astronomy.Body.Moon) {
    return Astronomy.EclipticGeoMoon(date).lon;
  }
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}

function calculateAscendantLongitude(dateUTC: Date, latitude: number, longitude: number): number {
  const gast = Astronomy.SiderealTime(dateUTC);
  const lstHours = gast + longitude / 15;
  const lstDeg = normalizeLongitude(lstHours * 15);
  const lstRad = lstDeg * (Math.PI / 180);
  const time = Astronomy.MakeTime(dateUTC);
  const oblRad = Astronomy.e_tilt(time).tobl * (Math.PI / 180);
  const latRad = latitude * (Math.PI / 180);
  const y = Math.cos(lstRad);
  const x = -(Math.sin(oblRad) * Math.tan(latRad)) - Math.cos(oblRad) * Math.sin(lstRad);
  return r2(normalizeLongitude((Math.atan2(y, x) * 180) / Math.PI));
}

function buildWholeSignHouses(ascendantSignId: string): ChartHouse[] {
  const ascendantSignIndex = compositionalSigns.findIndex((sign) => sign.id === ascendantSignId);

  return Array.from({ length: 12 }, (_, index) => {
    const houseSignIndex = (ascendantSignIndex + index) % 12;
    return {
      id: index + 1,
      signId: compositionalSigns[houseSignIndex].id,
      longitude: r2(houseSignIndex * 30),
    };
  });
}

function getHouseId(longitude: number, houses: ChartHouse[]): number {
  const signIndex = Math.floor(normalizeLongitude(longitude) / 30);
  const signId = compositionalSigns[signIndex].id;
  return houses.find((house) => house.signId === signId)?.id ?? 1;
}

function isRetrograde(body: Astronomy.Body, dateUTC: Date): boolean {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) {
    return false;
  }

  const currentLongitude = normalizeLongitude(getGeocentricLongitude(body, dateUTC));
  const nextLongitude = normalizeLongitude(
    getGeocentricLongitude(body, new Date(dateUTC.getTime() + RETROGRADE_LOOKAHEAD_MS)),
  );

  let diff = nextLongitude - currentLongitude;
  if (diff > 180) {
    diff -= 360;
  }
  if (diff < -180) {
    diff += 360;
  }

  return diff < 0;
}

function findNearestAscendingNodeTime(dateUTC: Date): Date {
  const searchStart = new Date(dateUTC.getTime() - NODE_SEARCH_WINDOW_DAYS * RETROGRADE_LOOKAHEAD_MS);
  let node = Astronomy.SearchMoonNode(searchStart);
  let nearestAscending: Astronomy.NodeEventInfo | null = null;

  for (let index = 0; index < 8; index += 1) {
    if (node.kind === Astronomy.NodeEventKind.Ascending) {
      if (
        nearestAscending === null ||
        Math.abs(node.time.date.getTime() - dateUTC.getTime()) <
          Math.abs(nearestAscending.time.date.getTime() - dateUTC.getTime())
      ) {
        nearestAscending = node;
      }
    }

    node = Astronomy.NextMoonNode(node);
  }

  return nearestAscending?.time.date ?? dateUTC;
}

function calculateAscendingNodeLongitude(dateUTC: Date): number {
  const nodeTime = findNearestAscendingNodeTime(dateUTC);
  return r2(normalizeLongitude(Astronomy.EclipticGeoMoon(nodeTime).lon));
}

function createPoint(
  id: string,
  longitude: number,
  houses: ChartHouse[],
  retrograde: boolean,
): ChartPlanet {
  const normalizedLongitude = r2(normalizeLongitude(longitude));
  const signId = eclipticLongitudeToSign(normalizedLongitude).id;

  return {
    id,
    signId,
    houseId: getHouseId(normalizedLongitude, houses),
    longitude: normalizedLongitude,
    retrograde,
    dignity: getDignity(id, signId),
  };
}

function calculatePartOfFortuneLongitude(
  ascendantLongitude: number,
  sun: ChartPlanet,
  moon: ChartPlanet,
): number {
  const isDayChart = sun.houseId >= 7;
  const rawLongitude = isDayChart
    ? ascendantLongitude + moon.longitude - sun.longitude
    : ascendantLongitude + sun.longitude - moon.longitude;

  return r2(normalizeLongitude(rawLongitude));
}

export function calculateFullChartFromUtcDate(
  dateUTC: Date,
  latitude: number,
  longitude: number,
): ChartData {
  const ascendantSign = calculateAscendant(dateUTC, latitude, longitude);
  const ascendantLongitude = calculateAscendantLongitude(dateUTC, latitude, longitude);
  const houses = buildWholeSignHouses(ascendantSign.id);
  const ascendant = {
    signId: ascendantSign.id,
    longitude: ascendantLongitude,
  };

  const primaryPlanets = PRIMARY_BODIES.map(({ id, body }) =>
    createPoint(id, getGeocentricLongitude(body, dateUTC), houses, isRetrograde(body, dateUTC)),
  );

  const sun = primaryPlanets.find((planet) => planet.id === "sun");
  const moon = primaryPlanets.find((planet) => planet.id === "moon");

  if (!sun || !moon) {
    throw new Error("Full chart calculation failed to produce Sun and Moon placements.");
  }

  const northNodeLongitude = calculateAscendingNodeLongitude(dateUTC);
  const southNodeLongitude = normalizeLongitude(northNodeLongitude + 180);
  const partOfFortuneLongitude = calculatePartOfFortuneLongitude(
    ascendantLongitude,
    sun,
    moon,
  );

  const planets: ChartPlanet[] = [
    ...primaryPlanets,
    createPoint("north_node", northNodeLongitude, houses, true),
    createPoint("south_node", southNodeLongitude, houses, true),
    createPoint("part_of_fortune", partOfFortuneLongitude, houses, false),
  ];

  const aspects = calculateAspects(primaryPlanets).map((aspect) => ({
    ...aspect,
    angle: r2(aspect.angle),
    orb: r2(aspect.orb),
  }));

  return {
    ascendant,
    planets,
    houses,
    aspects,
  };
}

/**
 * Calculates a complete natal chart using the Whole Sign house system.
 */
export function calculateFullChart(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  latitude: number,
  longitude: number,
): ChartData {
  const dateUTC = localBirthTimeToUTC(year, month, day, hours, minutes, latitude, longitude);
  return calculateFullChartFromUtcDate(dateUTC, latitude, longitude);
}


