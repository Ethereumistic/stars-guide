IDE AI Instruction Protocol: Stars.Guide Compositional Migration

TARGET: Refactor the legacy monolithic zodiac.ts into a decoupled, compositional astrology engine.
CONTEXT: We are migrating to a strict separation of pure astrological data and UI presentation layers. You have access to schema-definition.md and style-guide-and-tone.md. You will use them to populate the full datasets after establishing the scaffolding below.

Phase 1: Architectural Strategy & The Split

You must separate UI logic from astrological data. Never import UI libraries (like react-icons) into the pure data domain.

Domain A: UI Presentation Layer (src/config/)

src/config/zodiac-ui.ts: Contains SignUIConfig (icon maps, tailwind gradients, asset URLs).

src/config/planet-ui.ts & house-ui.ts: Contains UI metadata for planets and houses.

Domain B: Compositional Data Engine (src/astrology/)

This layer holds pure string data mapped exactly to our psychological, empirical schemas.

src/astrology/signs.ts: The "How" (Adverbial)

src/astrology/planets.ts: The "What" (Verbal)

src/astrology/houses.ts: The "Where" (Prepositional)

Phase 2: Execution Steps for Component Refactoring

Execute the refactoring of these specific components:

src/app/learn/signs/page.tsx & [sign]/page.tsx

Action: Remove all imports of the legacy zodiac.ts.

Action: Import UI config from src/config/zodiac-ui.ts and pure data from src/astrology/signs.ts. Merge them at the route level based on id and pass down as props.

src/components/learn/signs/sign-card.tsx

Action: Update interface to accept decoupled data (data: SignData, ui: SignUIConfig). Map ui.iconName to the icon renderer.

Action: Render data.coreStrategy and data.elementalTruth.

src/components/dashboard/sign-card.tsx & sign-card-v2.tsx

Action: Inject data.archetypeName as the subtitle.

src/components/onboarding/reveal-sign-card.tsx

Action: Utilize data.cognitiveInsight for the psychological reveal text. Ensure animations map to ui.themeColor.

Phase 3: The Engine Data Models & Seed Data

Initialize the following files with these exact TypeScript interfaces and seed objects. Use the provided schema-definition.md to generate the remaining entries.

1. The Signs (src/astrology/signs.ts)

export interface SignData {
  id: string;
  name: string;
  archetypeName: string;
  coreStrategy: string;
  cognitiveInsight: string;
  elementalTruth: string;
  strengths: string[];
  weaknesses: string[];
  compositionalAdverbialPhrase: string; // The "How"
}

export const compositionalSigns: SignData[] = [
  {
    id: "aries",
    name: "Aries",
    archetypeName: "The Trailblazer",
    coreStrategy: "Rapid decision-making, taking the first step before others are ready, and embracing conflict as a catalyst for change.",
    cognitiveInsight: "Psychologically driven by dopamine rewards tied to novelty and overcoming resistance, exhibiting a high bias for action and a low tolerance for inefficiency.",
    elementalTruth: "You are the spark that starts the blaze. Your fire is raw, unfiltered initiation. You don't sustain—you activate.",
    strengths: ["Activation and mobilization of energy", "Overcoming systemic inertia", "Decisive forward momentum"],
    weaknesses: ["Impulsivity", "Start-up energy burnout", "Lack of sustained follow-through"],
    compositionalAdverbialPhrase: "with aggressive autonomy and decisive speed"
  },
  // IDE AI: Hydrate Taurus, Gemini, and the remaining 9 signs using style-guide-and-tone.md
];


2. The Planets (src/astrology/planets.ts)

export interface PlanetData {
  id: string;
  name: string;
  domain: string;
  psychologicalFunction: string;
  coreDrives: string[];
  shadowExpression: string;
  compositionalVerbPhrase: string; // The "What"
}

export const compositionalPlanets: PlanetData[] = [
  {
    id: "sun",
    name: "Sun",
    domain: "Identity",
    psychologicalFunction: "The Sun represents the core ego-structure and conscious drive for self-actualization. It dictates how the psyche asserts its existence and maintains vitality.",
    coreDrives: ["Achieving self-realization", "Projecting creative vitality", "Establishing a central purpose"],
    shadowExpression: "When unintegrated, this drive manifests as narcissism, a pathological need for external validation, or a rigid, inflexible ego.",
    compositionalVerbPhrase: "seeks validation and asserts its core identity by"
  },
  {
    id: "moon",
    name: "Moon",
    domain: "Emotion",
    psychologicalFunction: "The Moon dictates the unconscious emotional regulation system and attachment style. It represents the psychological baseline required to feel safe.",
    coreDrives: ["Regulating emotional equilibrium", "Securing psychological safety", "Nurturing the self and intimate others"],
    shadowExpression: "When threatened, this manifests as extreme emotional reactivity, codependency, or protective withdrawal.",
    compositionalVerbPhrase: "processes emotional security and unconscious needs through"
  }
  // IDE AI: Hydrate Mercury, Venus, Mars, etc., strictly following schema-definition.md
];


3. The Houses (src/astrology/houses.ts)

export interface HouseData {
  id: number; // 1-12
  primaryArena: string;
  developmentalTheme: string;
  realWorldManifestations: string[];
  compositionalPrepositionalPhrase: string; // The "Where"
}

export const compositionalHouses: HouseData[] = [
  {
    id: 1,
    primaryArena: "The Self",
    developmentalTheme: "Individuation, autonomous action, and the formation of the primary psychological boundary between self and other.",
    realWorldManifestations: ["Physical vitality and appearance", "First impressions", "Instinctual approach to new environments"],
    compositionalPrepositionalPhrase: "within the realm of primary identity and physical self-expression"
  },
  {
    id: 2,
    primaryArena: "Material Resources",
    developmentalTheme: "The establishment of self-worth through the acquisition and management of tangible security and value systems.",
    realWorldManifestations: ["Personal finances", "Sensory environments", "Inherent talents and self-worth"],
    compositionalPrepositionalPhrase: "in the arena of personal resources, values, and material stability"
  }
  // IDE AI: Hydrate Houses 3-12 strictly following schema-definition.md
];


Phase 4: The Core Synthesizer (src/astrology/interpretationEngine.ts)

Create the core logic file that powers the compositional astrology engine. This file relies only on the arrays defined in Phase 3. It dynamically constructs grammatically perfect, psychologically profound sentences using our formula:
[PLANET: The Drive] + [SIGN: The Style] + [HOUSE: The Arena] = [SYNTHESIS: The Output]

import { compositionalPlanets } from './planets';
import { compositionalSigns } from './signs';
import { compositionalHouses } from './houses';

/**
 * Dynamically constructs an interpretation paragraph for a specific placement.
 * @param planetId - string (e.g., 'sun', 'moon')
 * @param signId - string (e.g., 'aries', 'taurus')
 * @param houseId - number (1-12)
 * @returns string - A dynamically generated, grammatically correct synthesis.
 */
export function generateSynthesis(planetId: string, signId: string, houseId: number): string {
  const planet = compositionalPlanets.find(p => p.id === planetId);
  const sign = compositionalSigns.find(s => s.id === signId);
  const house = compositionalHouses.find(h => h.id === houseId);

  if (!planet || !sign || !house) {
    throw new Error("Invalid astrological placement IDs provided to the engine.");
  }

  // Engine Synthesis Logic
  // Example Target: "Your core identity (Sun) seeks validation by initiating with relentless momentum, particularly manifesting within the realm of public status and career."
  
  const synthesisString = `Your ${planet.domain.toLowerCase()} (${planet.name}) ${planet.compositionalVerbPhrase} ${sign.compositionalAdverbialPhrase}, particularly manifesting ${house.compositionalPrepositionalPhrase}.`;

  return synthesisString;
}

/**
 * Helper to fetch full structured data for a specific placement, 
 * useful for complex UI dashboards that need the breakdown.
 */
export function getPlacementData(planetId: string, signId: string, houseId: number) {
   // Implementation left to IDE AI - simply return an object containing the resolved Planet, Sign, and House objects along with the synthesis string.
}


IDE AI INSTRUCTION COMPLETE. Proceed with parsing legacy zodiac.ts, splitting the domains, hydrating the data arrays based on the provided schemas, and implementing interpretationEngine.ts.