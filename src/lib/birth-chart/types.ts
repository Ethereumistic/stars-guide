export type ChartAspectType =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type PlanetDignity =
  | "domicile"
  | "exaltation"
  | "detriment"
  | "fall"
  | "peregrine";

export interface BirthLocation {
  lat: number;
  long: number;
  city: string;
  country: string;
  countryCode?: string;
  displayName?: string;
}

export interface LegacyPlacement {
  body: string;
  sign: string;
  house: number;
}

export interface StoredChartPlanet {
  id: string;
  signId: string;
  houseId: number;
  longitude: number;
  retrograde: boolean;
  dignity: PlanetDignity | null;
}

export interface StoredChartHouse {
  id: number;
  signId: string;
  longitude: number;
}

export interface StoredChartAspect {
  planet1: string;
  planet2: string;
  type: ChartAspectType;
  angle: number;
  orb: number;
}

export interface StoredBirthChart {
  ascendant: {
    longitude: number;
    signId: string;
  } | null;
  planets: StoredChartPlanet[];
  houses: StoredChartHouse[];
  aspects: StoredChartAspect[];
}

export interface StoredBirthData {
  date: string;
  time: string;
  timezone?: string;
  utcTimestamp?: string;
  houseSystem?: "whole_sign";
  location: BirthLocation;
  placements: LegacyPlacement[];
  chart?: StoredBirthChart;
}

export interface EnrichedBirthData extends StoredBirthData {
  timezone: string;
  utcTimestamp: string;
  houseSystem: "whole_sign";
  chart: StoredBirthChart;
}
