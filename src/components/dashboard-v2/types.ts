import { SignData } from "@/astrology/signs"
import { PlanetData } from "@/astrology/planets"
import { ElementType } from "@/astrology/elements"
import { SignUIConfig } from "@/config/zodiac-ui"
import { PlanetUIConfig } from "@/config/planet-ui"
import { ElementUIConfigData } from "@/config/elements-ui"
import { StoredChartPlanet } from "@/lib/birth-chart/types"

// ─── Enriched Placement ─────────────────────────────────────────────────────
// A single planetary placement with all UI data resolved.
// This is the primary data shape consumed by PlanetSignCard and PlanetGrid.

export interface EnrichedPlacement {
    /** Raw body id — e.g. "sun", "mercury", "ascendant" */
    bodyId: string
    /** Display label — e.g. "Sun", "Mercury", "Ascendant" */
    bodyLabel: string
    /** Sign id — e.g. "aries", "gemini" */
    signId: string
    /** Full sign data from compositionalSigns */
    signData: SignData
    /** UI config for the sign (icon, constellationUrl) */
    signUI: SignUIConfig
    /** Element UI config for the sign's element */
    elementUI: ElementUIConfigData
    /** Planet data from compositionalPlanets (undefined for Ascendant) */
    planetData: PlanetData | undefined
    /** UI config for the planet (symbol, color, image) */
    planetUI: PlanetUIConfig | undefined
    /** House number (1-12) */
    houseId: number
    /** Whether the planet is retrograde */
    retrograde: boolean
    /** Dignity if known (domicile, exaltation, detriment, fall, peregrine) */
    dignity: string | null
    /** Synthesis text from generateSynthesis() */
    synthesis: string
}

// ─── Supplementary Planet Config ─────────────────────────────────────────────
// For bodies not in compositionalPlanets (Ascendant, Part of Fortune, etc.)
// Provides enough data for the card back face to render meaningfully.

export interface SupplementaryPlanetEntry {
    id: string
    name: string
    domain: string
    compositionalVerbPhrase: string
    archetype: string
}

export const SUPPLEMENTARY_PLANETS: Record<string, SupplementaryPlanetEntry> = {
    ascendant: {
        id: "ascendant",
        name: "Ascendant",
        domain: "outward persona and first impressions",
        compositionalVerbPhrase: "crafts the external persona and initial approach to the world",
        archetype: "Mask",
    },
    part_of_fortune: {
        id: "part_of_fortune",
        name: "Part of Fortune",
        domain: "innate potential for prosperity",
        compositionalVerbPhrase: "manifests innate prosperity and finds ease",
        archetype: "Lot",
    },
    south_node: {
        id: "south_node",
        name: "South Node",
        domain: "comfortable but outgrown tendencies",
        compositionalVerbPhrase: "releases outgrown patterns and purges attachments",
        archetype: "Karma",
    },
}

// ─── Supplementary Planet UI ─────────────────────────────────────────────────
// For bodies not in planetUIConfig (Ascendant)

export const SUPPLEMENTARY_PLANET_UI: Record<string, { rulerSymbol: string; themeColor: string }> = {
    ascendant: {
        rulerSymbol: "↑",
        themeColor: "var(--foreground)",
    },
}

// ─── Planet Category Groups ──────────────────────────────────────────────────

export const LUMINARIES = ["sun", "moon"]
export const PERSONAL_PLANETS = ["mercury", "venus", "mars"]
export const SOCIAL_PLANETS = ["jupiter", "saturn"]
export const TRANSPERSONAL_PLANETS = ["uranus", "neptune", "pluto"]
export const CHART_POINTS = ["chiron", "north_node", "south_node", "part_of_fortune"]

export const PLANET_CATEGORY_ORDER = [
    ...LUMINARIES,
    ...PERSONAL_PLANETS,
    ...SOCIAL_PLANETS,
    ...TRANSPERSONAL_PLANETS,
    ...CHART_POINTS,
]

// ─── Birth Data Shape (from Convex user.birthData) ──────────────────────────

export interface BirthDataPlacement {
    body: string
    sign: string
    house: number
}

export interface BirthDataLocation {
    lat: number
    long: number
    city: string
    country: string
    countryCode?: string
    displayName?: string
}

export interface BirthData {
    date: string
    time: string
    timezone?: string
    utcTimestamp?: string
    houseSystem?: "whole_sign"
    location: BirthDataLocation
    placements: BirthDataPlacement[]
    chart?: {
        ascendant: { longitude: number; signId: string } | null
        planets: StoredChartPlanet[]
        houses: { id: number; signId: string; longitude: number }[]
        aspects: {
            planet1: string
            planet2: string
            type: string
            angle: number
            orb: number
        }[]
    } | null
}

// ─── Elemental Count ─────────────────────────────────────────────────────────

export interface ElementCount {
    element: ElementType
    count: number
    planets: string[] // planet names in this element
}