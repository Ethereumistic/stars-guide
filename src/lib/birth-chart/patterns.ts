import type { StoredBirthData, StoredChartAspect, StoredChartPlanet } from "./types";

export type ChartPatternKind = "aspect_pattern" | "chart_shape" | "structural" | "signature";

export interface DetectedChartPattern {
  id: string;
  kind: ChartPatternKind;
  name: string;
  rarity: "Common" | "Fairly common" | "Uncommon" | "Rare" | "Very rare" | "Personal signature";
  definition: string;
  mechanics: string;
  planetIds: string[];
  signIds: string[];
  houseIds: number[];
  evidenceIds: string[];
  confidence: "exact" | "strong";
}

const CORE_PLANETS = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);

const SIGN_ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const SIGN_MODALITY: Record<string, "cardinal" | "fixed" | "mutable"> = {
  aries: "cardinal", cancer: "cardinal", libra: "cardinal", capricorn: "cardinal",
  taurus: "fixed", leo: "fixed", scorpio: "fixed", aquarius: "fixed",
  gemini: "mutable", virgo: "mutable", sagittarius: "mutable", pisces: "mutable",
};

const TRADITIONAL_RULERS: Record<string, string> = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
  libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter",
};

const PATTERN_COPY = {
  grand_trine: {
    name: "Grand Trine", rarity: "Uncommon" as const,
    definition: "Three planets form a closed triangle of trines.",
    mechanics: "A self-reinforcing circuit of natural ease and talent that becomes most valuable when used deliberately.",
  },
  t_square: {
    name: "T-Square", rarity: "Fairly common" as const,
    definition: "An opposition releases through a third planet that squares both ends.",
    mechanics: "Concentrated friction creates drive; the apex planet becomes a recurring outlet for action and growth.",
  },
  grand_cross: {
    name: "Grand Cross", rarity: "Rare" as const,
    definition: "Two oppositions interlock through four squares.",
    mechanics: "Four competing demands create sustained pressure that can mature into resilience and exceptional coordination.",
  },
  mystic_rectangle: {
    name: "Mystic Rectangle", rarity: "Rare" as const,
    definition: "Two oppositions are connected by two trines and two sextiles.",
    mechanics: "Built-in supportive pathways help turn polarity and tension into practical, creative integration.",
  },
  kite: {
    name: "Kite", rarity: "Rare" as const,
    definition: "A Grand Trine is activated by a fourth planet in opposition to one corner.",
    mechanics: "The opposing planet gives direction and productive friction to talents that might otherwise remain passive.",
  },
  minor_grand_trine: {
    name: "Minor Grand Trine", rarity: "Uncommon" as const,
    definition: "A trine is focused through a third planet that sextiles both ends.",
    mechanics: "A compact circuit coordinates three planetary functions into a specific, usable talent.",
  },
} satisfies Record<string, { name: string; rarity: DetectedChartPattern["rarity"]; definition: string; mechanics: string }>;

function title(id: string) {
  return id.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

function aspectId(aspect: StoredChartAspect) {
  const [first, second] = [aspect.planet1, aspect.planet2].sort();
  return `aspect:${first}:${aspect.type}:${second}`;
}

function combinations<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      output.push(selected);
      return;
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      visit(index + 1, [...selected, items[index]]);
    }
  };
  visit(0, []);
  return output;
}

function details(planets: StoredChartPlanet[], ids: string[]) {
  const selected = ids.map((id) => planets.find((planet) => planet.id === id)).filter((planet): planet is StoredChartPlanet => Boolean(planet));
  return {
    planetIds: [...new Set(ids)].sort(),
    signIds: [...new Set(selected.map((planet) => planet.signId))],
    houseIds: [...new Set(selected.map((planet) => planet.houseId))].sort((a, b) => a - b),
  };
}

function makeAspectPattern(
  id: keyof typeof PATTERN_COPY,
  planets: StoredChartPlanet[],
  planetIds: string[],
  aspects: StoredChartAspect[],
): DetectedChartPattern {
  return {
    id: `${id}:${[...planetIds].sort().join(":")}`,
    kind: "aspect_pattern",
    ...PATTERN_COPY[id],
    ...details(planets, planetIds),
    evidenceIds: aspects.map(aspectId),
    confidence: "exact",
  };
}

function coveringSpan(longitudes: number[]) {
  if (longitudes.length < 2) return 0;
  const sorted = longitudes.map((value) => ((value % 360) + 360) % 360).sort((a, b) => a - b);
  const gaps = sorted.map((value, index) => {
    const next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
    return next - value;
  });
  return 360 - Math.max(...gaps);
}

function detectChartShape(planets: StoredChartPlanet[]): DetectedChartPattern | null {
  if (planets.length < 8) return null;
  const span = coveringSpan(planets.map((planet) => planet.longitude));
  const sorted = planets.map((planet) => ((planet.longitude % 360) + 360) % 360).sort((a, b) => a - b);
  const maxGap = Math.max(...sorted.map((value, index) => (index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1]) - value));
  let shape: { id: string; name: string; rarity: DetectedChartPattern["rarity"]; definition: string; mechanics: string } | null = null;
  if (span <= 125) {
    shape = { id: "bundle", name: "Bundle", rarity: "Rare", definition: "The ten core planets occupy a compact arc of about 120 degrees or less.", mechanics: "The chart concentrates attention into a narrow set of life arenas, favoring specialization and depth." };
  } else if (span <= 185) {
    shape = { id: "bowl", name: "Bowl", rarity: "Common", definition: "The ten core planets occupy one hemisphere of the chart.", mechanics: "A self-contained field of focus meets an open frontier represented by the unoccupied half." };
  } else if (maxGap >= 105 && maxGap <= 135) {
    shape = { id: "locomotive", name: "Locomotive", rarity: "Uncommon", definition: "The planets fill roughly two-thirds of the wheel, leaving a distinct open trine-sized space.", mechanics: "The occupied arc behaves like a self-propelling engine, with the planet beside the opening setting its direction." };
  } else if (maxGap <= 55) {
    shape = { id: "splash", name: "Splash", rarity: "Uncommon", definition: "The planets are distributed broadly around the full chart wheel.", mechanics: "Attention and curiosity spread across many domains, favoring range while making deliberate focus especially valuable." };
  }
  if (!shape) return null;
  return {
    ...shape,
    id: `shape:${shape.id}`,
    kind: "chart_shape",
    ...details(planets, planets.map((planet) => planet.id)),
    evidenceIds: planets.map((planet) => `placement:${planet.id}`),
    confidence: "strong",
  };
}

export function detectChartPatterns(birthData: StoredBirthData): DetectedChartPattern[] {
  const chart = birthData.chart;
  if (!chart) return [];
  const planets = chart.planets.filter((planet) => CORE_PLANETS.has(planet.id));
  const aspects = chart.aspects.filter((aspect) => CORE_PLANETS.has(aspect.planet1) && CORE_PLANETS.has(aspect.planet2));
  const aspectByPair = new Map(aspects.map((aspect) => [pairKey(aspect.planet1, aspect.planet2), aspect]));
  const getAspect = (a: string, b: string) => aspectByPair.get(pairKey(a, b));
  const patterns: DetectedChartPattern[] = [];

  for (const group of combinations(planets.map((planet) => planet.id), 3)) {
    const pairAspects = combinations(group, 2).map(([a, b]) => getAspect(a, b)).filter((aspect): aspect is StoredChartAspect => Boolean(aspect));
    const types = pairAspects.map((aspect) => aspect.type);
    if (types.length === 3 && types.every((type) => type === "trine")) patterns.push(makeAspectPattern("grand_trine", planets, group, pairAspects));
    if (types.filter((type) => type === "square").length === 2 && types.filter((type) => type === "opposition").length === 1) patterns.push(makeAspectPattern("t_square", planets, group, pairAspects));
    if (types.filter((type) => type === "sextile").length === 2 && types.filter((type) => type === "trine").length === 1) patterns.push(makeAspectPattern("minor_grand_trine", planets, group, pairAspects));
  }

  for (const group of combinations(planets.map((planet) => planet.id), 4)) {
    const pairAspects = combinations(group, 2).map(([a, b]) => getAspect(a, b)).filter((aspect): aspect is StoredChartAspect => Boolean(aspect));
    const types = pairAspects.map((aspect) => aspect.type);
    if (types.length === 6 && types.filter((type) => type === "opposition").length === 2 && types.filter((type) => type === "square").length === 4) {
      patterns.push(makeAspectPattern("grand_cross", planets, group, pairAspects));
    }
    if (types.length === 6 && types.filter((type) => type === "opposition").length === 2 && types.filter((type) => type === "trine").length === 2 && types.filter((type) => type === "sextile").length === 2) {
      patterns.push(makeAspectPattern("mystic_rectangle", planets, group, pairAspects));
    }
    for (const trineGroup of combinations(group, 3)) {
      const trines = combinations(trineGroup, 2).map(([a, b]) => getAspect(a, b));
      if (!trines.every((aspect) => aspect?.type === "trine")) continue;
      const fourth = group.find((id) => !trineGroup.includes(id));
      if (!fourth) continue;
      const fourthAspects = trineGroup.map((id) => getAspect(fourth, id));
      if (fourthAspects.filter((aspect) => aspect?.type === "opposition").length === 1 && fourthAspects.filter((aspect) => aspect?.type === "sextile").length === 2) {
        patterns.push(makeAspectPattern("kite", planets, group, [...trines, ...fourthAspects].filter((aspect): aspect is StoredChartAspect => Boolean(aspect))));
      }
    }
  }

  const grouped = <K extends string | number>(key: (planet: StoredChartPlanet) => K) => {
    const map = new Map<K, StoredChartPlanet[]>();
    for (const planet of planets) map.set(key(planet), [...(map.get(key(planet)) ?? []), planet]);
    return map;
  };
  for (const [signId, members] of grouped((planet) => planet.signId)) {
    if (members.length < 3) continue;
    patterns.push({
      id: `stellium:sign:${signId}`, kind: "structural", name: `${title(signId)} Stellium`, rarity: "Common",
      definition: `${members.length} core planets gather in ${title(signId)}.`,
      mechanics: "This concentration makes one sign's style a repeated lens for motivation, perception, and response.",
      ...details(planets, members.map((planet) => planet.id)), evidenceIds: members.map((planet) => `placement:${planet.id}`), confidence: "exact",
    });
  }
  for (const [houseId, members] of grouped((planet) => planet.houseId)) {
    if (members.length < 3) continue;
    patterns.push({
      id: `stellium:house:${houseId}`, kind: "structural", name: `${houseId}${houseId === 1 ? "st" : houseId === 2 ? "nd" : houseId === 3 ? "rd" : "th"} House Stellium`, rarity: "Common",
      definition: `${members.length} core planets gather in the ${houseId}th house.`,
      mechanics: "A large share of the chart's activity is routed through this life arena, amplifying both its gifts and blind spots.",
      ...details(planets, members.map((planet) => planet.id)), evidenceIds: members.map((planet) => `placement:${planet.id}`), confidence: "exact",
    });
  }

  const shape = detectChartShape(planets);
  if (shape) patterns.push(shape);

  for (const category of [SIGN_ELEMENT, SIGN_MODALITY] as const) {
    const counts = new Map<string, StoredChartPlanet[]>();
    for (const planet of planets) {
      const value = category[planet.signId];
      if (value) counts.set(value, [...(counts.get(value) ?? []), planet]);
    }
    for (const [value, members] of counts) {
      if (members.length !== 1) continue;
      const planet = members[0];
      patterns.push({
        id: `singleton:${value}:${planet.id}`, kind: "structural", name: `${title(value)} Singleton`, rarity: "Uncommon",
        definition: `${title(planet.id)} is the chart's only core planet in the ${title(value)} category.`,
        mechanics: "As the sole carrier of this quality, the planet can become unusually noticeable or work overtime when that quality is needed.",
        ...details(planets, [planet.id]), evidenceIds: [`placement:${planet.id}`], confidence: "exact",
      });
    }
  }

  for (const [first, second] of combinations(planets, 2)) {
    if (TRADITIONAL_RULERS[first.signId] === second.id && TRADITIONAL_RULERS[second.signId] === first.id) {
      patterns.push({
        id: `mutual_reception:${[first.id, second.id].sort().join(":")}`, kind: "structural", name: "Mutual Reception", rarity: "Fairly common",
        definition: `${title(first.id)} and ${title(second.id)} occupy signs traditionally ruled by one another.`,
        mechanics: "The two planetary functions have a built-in line of cooperation, even when they do not form a major aspect.",
        ...details(planets, [first.id, second.id]), evidenceIds: [`placement:${first.id}`, `placement:${second.id}`], confidence: "exact",
      });
    }
  }

  const connected = new Set(aspects.flatMap((aspect) => [aspect.planet1, aspect.planet2]));
  for (const planet of planets.filter((item) => !connected.has(item.id))) {
    patterns.push({
      id: `peregrine:${planet.id}`, kind: "structural", name: `Peregrine ${title(planet.id)}`, rarity: "Rare",
      definition: `${title(planet.id)} forms no stored major aspect to another core planet.`,
      mechanics: "Without a major-aspect circuit, this function can feel highly independent, alternating between quiet and unusually direct expression.",
      ...details(planets, [planet.id]), evidenceIds: [`placement:${planet.id}`], confidence: "exact",
    });
  }

  const deduped = [...new Map(patterns.map((pattern) => [pattern.id, pattern])).values()];
  const priority: Record<DetectedChartPattern["rarity"], number> = { "Very rare": 0, Rare: 1, Uncommon: 2, "Fairly common": 3, Common: 4, "Personal signature": 5 };
  deduped.sort((a, b) => priority[a.rarity] - priority[b.rarity] || a.id.localeCompare(b.id));

  if (deduped.length === 0 && aspects.length) {
    const tightest = [...aspects].sort((a, b) => a.orb - b.orb)[0];
    deduped.push({
      id: `signature:${aspectId(tightest)}`, kind: "signature", name: `${title(tightest.planet1)} ${title(tightest.type)} ${title(tightest.planet2)}`,
      rarity: "Personal signature", definition: `The chart's tightest stored major aspect, at a ${tightest.orb.toFixed(2)}° orb.`,
      mechanics: "Its closeness makes this planetary relationship a dependable thread to explore throughout the chart.",
      ...details(planets, [tightest.planet1, tightest.planet2]), evidenceIds: [aspectId(tightest)], confidence: "exact",
    });
  }
  return deduped;
}

export function getPrimaryChartPattern(birthData: StoredBirthData): DetectedChartPattern | null {
  return detectChartPatterns(birthData)[0] ?? null;
}
