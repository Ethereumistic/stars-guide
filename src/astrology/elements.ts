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

// ── Learn Page Content ────────────────────────────────────────────────────────
// Polished, scannable copy for /learn/elements cards.
// Each entry kept to roughly the same visual weight so the page feels balanced.

export interface ElementLearnData {
    id: string;
    tagline: string;
    signs: string[];
    motivation: string;
    strengths: string[];
    struggles: string[];
    growth: string;
}

export interface ModeLearnData {
    id: string;
    tagline: string;
    signs: string[];
    motivation: string;
    strengths: string[];
    struggles: string[];
    growth: string;
}

export interface PolarityLearnData {
    id: string;
    tagline: string;
    elements: ElementType[];
    signs: string[];
    values: string[];
    shadow: string[];
}

export const ELEMENTS_LEARN: Record<ElementType, ElementLearnData> = {
    Fire: {
        id: "Fire",
        tagline: "Passionate & Inspiring",
        signs: ["Aries", "Leo", "Sagittarius"],
        motivation:
            "Fire moves toward meaning. It wants to feel fully alive — to chase the thrill, stake a claim on authenticity, and refuse a life lived in half-measures. Adventure isn't a hobby; it's oxygen.",
        strengths: [
            "Confidence that fills a room",
            "Contagious enthusiasm — they make you believe",
            "Decisive under pressure",
            "Warmth that draws people in effortlessly",
            "An almost irrational faith that things will work out",
        ],
        struggles: [
            "Self-absorption — the spotlight is hard to share",
            "A quiet dread of being ordinary",
            "Tendency toward drama when energy has nowhere to go",
        ],
        growth:
            "Fire burns brightest when it learns to look inward, not just outward. Self-awareness and honest feedback are the fuel that turns a wildfire into a controlled burn — powerful, sustainable, and generous with its warmth.",
    },
    Earth: {
        id: "Earth",
        tagline: "Practical & Reliable",
        signs: ["Taurus", "Virgo", "Capricorn"],
        motivation:
            "Earth moves toward stability. It wants to build something real — a structure that outlasts the week, a body of resources that holds under pressure, a life where the senses are fed and the ground doesn't shift beneath you.",
        strengths: [
            "Rock-solid reliability — they show up, every time",
            "Practical problem-solving grounded in reality",
            "Sensory intelligence — they notice what others miss",
            "Patience that turns small efforts into lasting results",
            "Resourcefulness with whatever's at hand",
        ],
        struggles: [
            "Resistance to change, even when change is overdue",
            "Inflexibility dressed up as \"being practical\"",
            "Cautious to a fault — opportunity passes while they double-check",
        ],
        growth:
            "Earth grows strongest when it learns that stability isn't the same as stillness. The deepest roots can survive a storm — and sometimes the smartest risk is the one that keeps the foundation alive rather than frozen.",
    },
    Air: {
        id: "Air",
        tagline: "Intellectual & Communicative",
        signs: ["Gemini", "Libra", "Aquarius"],
        motivation:
            "Air moves toward understanding. It wants to crack the code, connect the dots, and put language to things that others only feel. Ideas are currency, and conversation is the marketplace where everything gets traded.",
        strengths: [
            "Razor-sharp analysis and pattern recognition",
            "Natural mediators — they see every side of a conflict",
            "Objectivity that cuts through emotional noise",
            "Intellectual range — curious about everything, bored by nothing",
            "The ability to make complex ideas feel simple",
        ],
        struggles: [
            "Emotional detachment — processing feelings through logic",
            "Overthinking that paralyzes action",
            "Intellectualizing instead of actually feeling",
        ],
        growth:
            "Air reaches full clarity when it stops trying to think its way through every emotion. Some truths only arrive through lived experience, and empathy isn't a weakness — it's the data set that logic alone can never access.",
    },
    Water: {
        id: "Water",
        tagline: "Intuitive & Emotional",
        signs: ["Cancer", "Scorpio", "Pisces"],
        motivation:
            "Water moves toward depth. It wants to feel the full spectrum — joy, grief, longing, love — and build bonds that go beyond surface-level small talk. Connection isn't optional; it's the medium they live in.",
        strengths: [
            "Empathy that reads a room before anyone speaks",
            "Intuition that borders on psychic — they just know",
            "Nurturing instinct that makes others feel safe",
            "Emotional depth that fuels extraordinary creativity",
            "The ability to hold space for pain without flinching",
        ],
        struggles: [
            "Mood shifts that arrive like weather — sudden and total",
            "Blurry boundaries — absorbing others' emotions as their own",
            "Hypersensitivity that turns small slights into deep wounds",
        ],
        growth:
            "Water flows freest when it learns to hold its own shape. Boundaries aren't walls — they're riverbanks that give feeling direction. Self-validation and the courage to release what's expired turn sensitivity from a burden into a gift.",
    },
};

export type ModeType = "Cardinal" | "Fixed" | "Mutable";

export const MODES_LEARN: Record<ModeType, ModeLearnData> = {
    Cardinal: {
        id: "Cardinal",
        tagline: "Initiating & Proactive",
        signs: ["Aries", "Cancer", "Libra", "Capricorn"],
        motivation:
            "Cardinal energy exists to begin. It doesn't wait for permission or perfect conditions — it starts things. New projects, fresh seasons, bold first steps. The impulse is always forward.",
        strengths: [
            "Boldness that breaks through inertia",
            "Natural assertiveness — they claim the first move",
            "Determination that carries an idea from zero to real",
            "Inspirational leadership that pulls others into motion",
        ],
        struggles: [
            "Follow-through fades once the thrill of launch wears off",
            "Restless when systems need maintenance, not revolution",
            "Can bulldoze when a softer touch would land better",
        ],
        growth:
            "Cardinal energy matures when it learns that starting is only half the equation. Long-term planning and the discipline to delegate — rather than doing everything solo — turn an initiator into a true leader.",
    },
    Fixed: {
        id: "Fixed",
        tagline: "Stable & Persistent",
        signs: ["Taurus", "Leo", "Scorpio", "Aquarius"],
        motivation:
            "Fixed energy exists to sustain. It takes what Cardinal started and makes it last — deepening, intensifying, protecting. Loyalty isn't a word; it's an operating system.",
        strengths: [
            "Unwavering persistence through difficulty",
            "Deep commitment — they don't quit on people or projects",
            "Follow-through that turns potential into reality",
            "The stamina to maintain what others abandon",
        ],
        struggles: [
            "Resistance to change, even when the writing's on the wall",
            "Stubbornness that calcifies into rigidity",
            "Difficulty releasing outdated ideas, relationships, or identities",
        ],
        growth:
            "Fixed energy matures when it learns that holding on isn't always loyalty — sometimes it's fear. Softening rigid edges and embracing necessary change turns endurance from a prison into genuine resilience.",
    },
    Mutable: {
        id: "Mutable",
        tagline: "Adaptable & Flexible",
        signs: ["Gemini", "Virgo", "Sagittarius", "Pisces"],
        motivation:
            "Mutable energy exists to evolve. It senses when a season is ending and naturally pivots — adjusting, transforming, making something new from whatever just broke apart. Change isn't a threat; it's home.",
        strengths: [
            "Adaptability that thrives in uncertainty",
            "Openness to new perspectives and experiences",
            "Creative problem-solving — they find paths others miss",
            "Flexibility that keeps things moving when plans collapse",
        ],
        struggles: [
            "Inconsistency — today's priority is tomorrow's afterthought",
            "Difficulty committing to a single path or decision",
            "Scattered energy that fragments focus across too many things",
        ],
        growth:
            "Mutable energy matures when it learns that freedom isn't the absence of commitment — it's the ability to choose one thing deeply. Grounding excess energy and practicing mindfulness turn flexibility from chaos into genuine versatility.",
    },
};

export type PolarityType = "Yang" | "Yin";

export const POLARITY_LEARN: Record<PolarityType, PolarityLearnData> = {
    Yang: {
        id: "Yang",
        tagline: "Active & Individual",
        elements: ["Fire", "Air"],
        signs: ["Aries", "Gemini", "Leo", "Libra", "Sagittarius", "Aquarius"],
        values: [
            "The mind — thinking, reasoning, questioning limits",
            "Innovation and the hunger for what's next",
            "Movement, progress, and the thrill of initiation",
            "Self-expression that refuses to be quiet",
            "Leadership that inspires action over contemplation",
        ],
        shadow: [
            "Ignoring real limits until they collapse",
            "Hubris — confusing confidence with invincibility",
            "Impatience that bypasses depth for speed",
            "Burnout from perpetual motion without rest",
            "Indifference to what can't be solved by thinking",
        ],
    },
    Yin: {
        id: "Yin",
        tagline: "Receptive & Collective",
        elements: ["Earth", "Water"],
        signs: ["Taurus", "Cancer", "Virgo", "Scorpio", "Capricorn", "Pisces"],
        values: [
            "The body — feeling, instinct, and embodied wisdom",
            "Nurturing and the instinct to protect what matters",
            "Belonging — family, tradition, and collective survival",
            "Patience that allows things to unfold at their own pace",
            "Depth and sensitivity that others overlook",
        ],
        shadow: [
            "Fixed mindset — protecting the familiar past the point of usefulness",
            "Conformity that silences individual needs",
            "Passivity that endures what should be changed",
            "Stagnation mistaken for stability",
            "Resistance to new ideas that challenge comfort",
        ],
    },
};

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
