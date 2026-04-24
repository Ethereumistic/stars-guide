export type ElementType = "Fire" | "Earth" | "Air" | "Water";

// ── Spider Chart Archetype Axes ──────────────────────────────────────────────

export type AxisName =
  | "Intuition"
  | "Communication"
  | "Vitality & Drive"
  | "Emotional Depth"
  | "Intellect"
  | "Endurance"
  | "Transformation"
  | "Groundedness"
  | "Magnetism"
  | "Sensitivity"
  | "Willpower"
  | "Adaptability";

export interface AxisDefinition {
  name: AxisName;
  element: ElementType;
  /** react-icons/gi component name for this axis */
  iconName: string;
  description: string;
}

/** Clockwise from top (12 o'clock), alternating elements for visual variety */
export const SPIDER_AXES: AxisDefinition[] = [
  { name: "Intuition",            element: "Water", iconName: "GiThirdEye",      description: "Access to unseen currents, gut wisdom" },
  { name: "Communication",       element: "Air",   iconName: "GiConversation",  description: "Articulation, connection through language" },
  { name: "Vitality & Drive",     element: "Fire",  iconName: "GiFireDash",      description: "Raw life force, initiative, the will to begin" },
  { name: "Emotional Depth",      element: "Water", iconName: "GiWaterDrop",      description: "Range of feeling, capacity for intimacy" },
  { name: "Intellect",            element: "Air",   iconName: "GiBrain",         description: "Pattern recognition, analytical clarity" },
  { name: "Endurance",            element: "Earth", iconName: "GiShieldImpact",  description: "Capacity to persist, structural resilience" },
  { name: "Transformation",       element: "Water", iconName: "GiButterfly",     description: "Capacity to die and be reborn, phoenix force" },
  { name: "Groundedness",         element: "Earth", iconName: "GiMountains",     description: "Embodied presence, material mastery" },
  { name: "Magnetism",            element: "Fire",  iconName: "GiMagnet",        description: "Radiance, drawing power, natural authority" },
  { name: "Sensitivity",          element: "Water", iconName: "GiHeartInside",   description: "Psychic attunement, compassion, receptivity" },
  { name: "Willpower",            element: "Fire",  iconName: "GiCrossedSwords", description: "Focused determination, inner fire discipline" },
  { name: "Adaptability",         element: "Air",   iconName: "GiWindmill",      description: "Fluidity, the ability to shift and pivot" },
];

/** Element color tokens used by the spider chart (and donut chart) */
export const ELEMENT_COLORS: Record<ElementType, { stroke: string; glow: string; dim: string }> = {
  Fire:  { stroke: "#FF6B35", glow: "rgba(255, 107, 53, 0.35)", dim: "rgba(255, 107, 53, 0.08)" },
  Earth: { stroke: "#8BA840", glow: "rgba(139, 168, 64, 0.35)",  dim: "rgba(139, 168, 64, 0.08)" },
  Air:   { stroke: "#87CEEB", glow: "rgba(135, 206, 235, 0.35)", dim: "rgba(135, 206, 235, 0.08)" },
  Water: { stroke: "#4AA3FF", glow: "rgba(74, 163, 255, 0.35)",  dim: "rgba(74, 163, 255, 0.08)" },
};

/** Planet weight multipliers for element scoring */
export const PLANET_WEIGHTS: Record<string, number> = {
  sun: 3,
  moon: 3,
  ascendant: 2.5,
  mercury: 2,
  venus: 2,
  mars: 2,
  jupiter: 1.5,
  saturn: 1.5,
  uranus: 1,
  neptune: 1,
  pluto: 1,
  north_node: 0.5,
  south_node: 0.5,
  part_of_fortune: 0.5,
  chiron: 0.5,
};

/** Sign-specific archetype bonuses keyed by sign id */
export const SIGN_ARCHETYPE_BONUSES: Record<string, Partial<Record<AxisName, number>>> = {
  aries:       { "Vitality & Drive": 25, "Willpower": 20, "Adaptability": 8, "Magnetism": 5 },
  leo:         { "Magnetism": 25, "Vitality & Drive": 15, "Willpower": 10, "Endurance": 8 },
  sagittarius: { "Adaptability": 20, "Intellect": 15, "Vitality & Drive": 10, "Communication": 8 },
  taurus:      { "Groundedness": 25, "Endurance": 20, "Sensitivity": 8, "Magnetism": 5 },
  virgo:       { "Groundedness": 18, "Communication": 15, "Intellect": 12, "Endurance": 10 },
  capricorn:   { "Endurance": 25, "Willpower": 18, "Groundedness": 15, "Transformation": 5 },
  gemini:      { "Communication": 25, "Intellect": 20, "Adaptability": 15, "Intuition": 5 },
  libra:       { "Magnetism": 20, "Communication": 15, "Sensitivity": 10, "Intellect": 8 },
  aquarius:    { "Intellect": 22, "Adaptability": 18, "Transformation": 10, "Communication": 8 },
  cancer:      { "Emotional Depth": 25, "Sensitivity": 22, "Intuition": 15, "Groundedness": 5 },
  scorpio:     { "Transformation": 25, "Emotional Depth": 20, "Willpower": 15, "Intuition": 10 },
  pisces:      { "Intuition": 25, "Sensitivity": 20, "Emotional Depth": 15, "Adaptability": 8 },
};

export const ELEMENT_CONTENT: Record<ElementType, { desc: string; keywords: string[] }> = {
    Fire: {
        desc: "Fire represents the vital impulse of energy and the spark of creation. It is the drive that moves all life toward growth, action, and the warmth of existence.",
        keywords: ["Vitality", "Intuition", "Action", "Inspiration"]
    },
    Earth: {
        desc: "Earth is the grounding foundation of reality and the manifest world. It represents the stability, endurance, and physical forms that allow life to take root and flourish.",
        keywords: ["Stability", "Manifestation", "Reliability", "Senses"]
    },
    Air: {
        desc: "Air is the breath of life and the bridge of communication. It represents the space where movement happens, the exchange of ideas, and the intellectual clarity that connects all things.",
        keywords: ["Intellect", "Connection", "Objectivity", "Flow"]
    },
    Water: {
        desc: "Water is the fluid depths of emotion and the intuitive flow of life. It represents the memory of existence, the nurturing tides of the soul, and the deep interconnectedness of all living beings.",
        keywords: ["Depth", "Intuition", "Healing", "Enigma"]
    }
};

export interface ElementalManifestation {
    title: string;
    insight: string;
    path: string;
}

export const ELEMENTAL_MANIFESTATIONS: Record<string, ElementalManifestation> = {
    aries: {
        title: "Ignition",
        insight: "You are the spark that starts the blaze. Your fire is raw, unfiltered initiation. You don't sustain—you activate. You're the one who sees the need for change and moves before others finish deliberating. You break inertia and force evolution through decisive action.",
        path: "Learn that not every beginning requires burning down what came before."
    },
    taurus: {
        title: "Foundation",
        insight: "You are the bedrock. Your earth doesn't shift—it anchors. You build structures meant to last, accumulating value through patience and consistency. When others chase what's urgent, you invest in what endures. Your stability becomes the ground others stand on.",
        path: "Learn that the ground sometimes needs to shift for new growth to emerge."
    },
    gemini: {
        title: "Distribution",
        insight: "You are the wind. Your air doesn't concentrate—it circulates. You gather information from one place and carry it to another, naturally connecting disparate ideas and people. You're fluent in multiple contexts and can translate between them with ease.",
        path: "Learn that connection without depth becomes mere distraction."
    },
    cancer: {
        title: "Tide",
        insight: "You are the wave. Your water doesn't just feel—it moves. You respond to emotional currents and create environments where others feel safe enough to be vulnerable. You understand that belonging is built through consistent care and attention.",
        path: "Learn that you cannot carry everyone's emotional weight—some people must learn to swim on their own."
    },
    leo: {
        title: "Sustained Burn",
        insight: "You are the eternal flame. Your fire doesn't ignite—it radiates. You turn raw energy into a steady source that others rely upon. You don't just create—you maintain presence and consistency over time. Your warmth draws people in and holds their attention.",
        path: "Learn that true brilliance doesn't need constant validation—it simply exists."
    },
    virgo: {
        title: "Refinement",
        insight: "You are the cultivated garden. Your earth doesn't just exist—it optimizes. You turn raw material into something functional and efficient. You see the gap between 'how it is' and 'how it could be better,' and you can't rest until you close it.",
        path: "Learn that imperfection is sometimes the most honest form of beauty."
    },
    libra: {
        title: "Equilibrium",
        insight: "You are the atmosphere. Your air doesn't scatter—it balances. You instinctively sense when things are off-kilter and work to restore harmony. You see validity in opposing viewpoints and can hold space for contradiction.",
        path: "Learn that perfect balance is impossible—sometimes choosing a side is the most honest thing you can do."
    },
    scorpio: {
        title: "Depths",
        insight: "You are the abyss. Your water doesn't flow—it transforms. You don't accept surface explanations; you dive beneath to understand the true nature of things. You're drawn to what others avoid and possess the strength to face uncomfortable truths.",
        path: "Learn that not every mystery needs solving—some things can remain unknown."
    },
    sagittarius: {
        title: "Wildfire",
        insight: "You are the spreading flame. Your fire doesn't stay put—it explores. You carry energy across boundaries and into unfamiliar territory. You're driven by the question 'what else is possible?' and refuse to accept limitations as final.",
        path: "Learn that depth sometimes matters more than distance traveled."
    },
    capricorn: {
        title: "Summit",
        insight: "You are the mountain. Your earth doesn't settle—it ascends. You measure life in milestones, not moments, building toward something greater with each step. Delayed gratification is your natural state; you understand that worthwhile things take time.",
        path: "Learn that achievement means nothing if the climb leaves you isolated."
    },
    aquarius: {
        title: "Transmission",
        insight: "You are the frequency. Your air doesn't adapt—it broadcasts. You transmit ideas that challenge the status quo, often ahead of when others are ready to receive them. You value truth over comfort and principle over popularity.",
        path: "Learn that vision without compassion becomes cold ideology."
    },
    pisces: {
        title: "Dissolution",
        insight: "You are the ocean. Your water doesn't contain—it merges. You experience life through fluid boundaries, absorbing the emotions and energies around you. You understand connection at a level that transcends logic, sensing what cannot be spoken.",
        path: "Learn that you need boundaries, or you'll lose yourself entirely in others' stories."
    }
};
