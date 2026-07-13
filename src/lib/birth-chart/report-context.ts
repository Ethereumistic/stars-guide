import type { StoredBirthData, StoredChartPlanet } from "./types";
import { detectChartPatterns, type DetectedChartPattern } from "./patterns";

export type ChartEvidenceKind = "placement" | "aspect" | "dignity" | "house" | "cluster" | "chart_ruler" | "nodal_axis";

export interface ChartEvidenceItem {
  id: string;
  kind: ChartEvidenceKind;
  label: string;
  bodyIds: string[];
  signIds: string[];
  houseIds: number[];
  orb?: number;
}

export interface BirthChartContextArtifact {
  schemaVersion: 1;
  source: "users.birthData";
  sourceFingerprint: string;
  birth: {
    date: string;
    time: string;
    timezone?: string;
    location: { city: string; country: string };
    houseSystem: "whole_sign";
  };
  ascendant: { signId: string; longitude: number } | null;
  placements: Array<{
    id: string;
    signId: string;
    houseId: number;
    longitude: number;
    degreeInSign: number;
    retrograde: boolean;
    dignity: string | null;
  }>;
  houses: Array<{ id: number; signId: string; longitude: number }>;
  aspects: Array<{ planet1: string; planet2: string; type: string; orb: number }>;
  derived: {
    chartRuler: { risingSignId: string; rulerBodyId: string; rulerSignId?: string; rulerHouseId?: number } | null;
    dominantElement: "fire" | "earth" | "air" | "water" | null;
    patterns: DetectedChartPattern[];
  };
  evidence: ChartEvidenceItem[];
}

const RULERS: Record<string, string> = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
  libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter",
};

const ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const CORE_PLANETS = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);

function title(value: string) {
  return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function ordinal(value: number) {
  if (value % 100 >= 11 && value % 100 <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}

function stableFingerprint(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function fingerprintBirthChart(birthData: StoredBirthData): string {
  return stableFingerprint({
    utcTimestamp: birthData.utcTimestamp,
    houseSystem: birthData.houseSystem ?? "whole_sign",
    ascendant: birthData.chart?.ascendant ?? null,
    planets: [...(birthData.chart?.planets ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    houses: [...(birthData.chart?.houses ?? [])].sort((a, b) => a.id - b.id),
    aspects: [...(birthData.chart?.aspects ?? [])].sort((a, b) => `${a.planet1}:${a.type}:${a.planet2}`.localeCompare(`${b.planet1}:${b.type}:${b.planet2}`)),
  });
}

function dominantElement(planets: StoredChartPlanet[]) {
  const counts = new Map<string, number>();
  for (const planet of planets.filter((item) => CORE_PLANETS.has(item.id))) {
    const element = ELEMENT[planet.signId];
    if (element) counts.set(element, (counts.get(element) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) return null;
  return ranked[0][0] as "fire" | "earth" | "air" | "water";
}

function buildEvidence(birthData: StoredBirthData): ChartEvidenceItem[] {
  const chart = birthData.chart;
  if (!chart) return [];
  const evidence: ChartEvidenceItem[] = [];
  if (chart.ascendant) {
    evidence.push({ id: "placement:ascendant", kind: "placement", label: `Ascendant in ${title(chart.ascendant.signId)}`, bodyIds: ["rising"], signIds: [chart.ascendant.signId], houseIds: [1] });
  }
  for (const planet of chart.planets) {
    evidence.push({
      id: `placement:${planet.id}`, kind: "placement",
      label: `${title(planet.id)} in ${title(planet.signId)} in the ${ordinal(planet.houseId)} house${planet.retrograde ? ", retrograde" : ""}`,
      bodyIds: [planet.id], signIds: [planet.signId], houseIds: [planet.houseId],
    });
    if (planet.dignity) {
      evidence.push({ id: `dignity:${planet.id}:${planet.dignity}`, kind: "dignity", label: `${title(planet.id)} ${planet.dignity} in ${title(planet.signId)}`, bodyIds: [planet.id], signIds: [planet.signId], houseIds: [planet.houseId] });
    }
  }
  for (const house of chart.houses) {
    evidence.push({ id: `house:${house.id}`, kind: "house", label: `${ordinal(house.id)} house in ${title(house.signId)}`, bodyIds: [], signIds: [house.signId], houseIds: [house.id] });
  }
  for (const aspect of chart.aspects) {
    const [first, second] = [aspect.planet1, aspect.planet2].sort();
    evidence.push({ id: `aspect:${first}:${aspect.type}:${second}`, kind: "aspect", label: `${title(aspect.planet1)} ${aspect.type} ${title(aspect.planet2)} (${aspect.orb.toFixed(2)}° orb)`, bodyIds: [aspect.planet1, aspect.planet2], signIds: [], houseIds: [], orb: aspect.orb });
  }
  const by = <K extends string | number>(key: (planet: StoredChartPlanet) => K) => {
    const map = new Map<K, StoredChartPlanet[]>();
    for (const planet of chart.planets) map.set(key(planet), [...(map.get(key(planet)) ?? []), planet]);
    return map;
  };
  for (const [signId, planets] of by((planet) => planet.signId)) {
    if (planets.length < 3) continue;
    evidence.push({ id: `cluster:sign:${signId}`, kind: "cluster", label: `${planets.map((planet) => title(planet.id)).join(", ")} concentrated in ${title(signId)}`, bodyIds: planets.map((planet) => planet.id), signIds: [signId], houseIds: [...new Set(planets.map((planet) => planet.houseId))] });
  }
  for (const [houseId, planets] of by((planet) => planet.houseId)) {
    if (planets.length < 3) continue;
    evidence.push({ id: `cluster:house:${houseId}`, kind: "cluster", label: `${planets.map((planet) => title(planet.id)).join(", ")} concentrated in the ${ordinal(houseId)} house`, bodyIds: planets.map((planet) => planet.id), signIds: [...new Set(planets.map((planet) => planet.signId))], houseIds: [houseId] });
  }
  const risingSignId = chart.ascendant?.signId;
  const rulerBodyId = risingSignId ? RULERS[risingSignId] : undefined;
  const ruler = rulerBodyId ? chart.planets.find((planet) => planet.id === rulerBodyId) : undefined;
  if (risingSignId && rulerBodyId) {
    evidence.push({ id: "chart_ruler", kind: "chart_ruler", label: `Chart ruler: ${title(risingSignId)} rising, ruled by ${title(rulerBodyId)}${ruler ? ` in ${title(ruler.signId)} in the ${ordinal(ruler.houseId)} house` : ""}`, bodyIds: [rulerBodyId], signIds: [risingSignId, ...(ruler ? [ruler.signId] : [])], houseIds: ruler ? [ruler.houseId] : [] });
  }
  const north = chart.planets.find((planet) => planet.id === "north_node");
  const south = chart.planets.find((planet) => planet.id === "south_node");
  if (north && south) {
    evidence.push({ id: "nodal_axis", kind: "nodal_axis", label: `North Node in ${title(north.signId)} in the ${ordinal(north.houseId)} house; South Node in ${title(south.signId)} in the ${ordinal(south.houseId)} house`, bodyIds: ["north_node", "south_node"], signIds: [north.signId, south.signId], houseIds: [north.houseId, south.houseId] });
  }
  return evidence;
}

export function buildBirthChartContextArtifact(birthData: StoredBirthData): BirthChartContextArtifact {
  const chart = birthData.chart;
  const planets = chart?.planets ?? [];
  const risingSignId = chart?.ascendant?.signId;
  const rulerBodyId = risingSignId ? RULERS[risingSignId] : undefined;
  const ruler = rulerBodyId ? planets.find((planet) => planet.id === rulerBodyId) : undefined;
  return {
    schemaVersion: 1,
    source: "users.birthData",
    sourceFingerprint: fingerprintBirthChart(birthData),
    birth: {
      date: birthData.date,
      time: birthData.time,
      timezone: birthData.timezone,
      location: { city: birthData.location.city, country: birthData.location.country },
      houseSystem: "whole_sign",
    },
    ascendant: chart?.ascendant ?? null,
    placements: planets.map((planet) => ({
      id: planet.id, signId: planet.signId, houseId: planet.houseId, longitude: planet.longitude,
      degreeInSign: Number((((planet.longitude % 30) + 30) % 30).toFixed(2)), retrograde: planet.retrograde, dignity: planet.dignity,
    })),
    houses: chart?.houses ?? [],
    aspects: [...(chart?.aspects ?? [])].sort((a, b) => a.orb - b.orb).map((aspect) => ({ planet1: aspect.planet1, planet2: aspect.planet2, type: aspect.type, orb: aspect.orb })),
    derived: {
      chartRuler: risingSignId && rulerBodyId ? { risingSignId, rulerBodyId, rulerSignId: ruler?.signId, rulerHouseId: ruler?.houseId } : null,
      dominantElement: dominantElement(planets),
      patterns: detectChartPatterns(birthData),
    },
    evidence: buildEvidence(birthData),
  };
}

export function serializeBirthChartForOracle(birthData: StoredBirthData): string {
  const artifact = buildBirthChartContextArtifact(birthData);
  return [
    "[DETERMINISTIC NATAL CHART CONTEXT]",
    "Source: direct server translation of users.birthData. This is canonical evidence, not prior interpretation.",
    "Use only facts present in this object. Treat derived patterns as deterministic helpers; keep interpretations non-deterministic.",
    JSON.stringify(artifact),
    "[END DETERMINISTIC NATAL CHART CONTEXT]",
  ].join("\n");
}
