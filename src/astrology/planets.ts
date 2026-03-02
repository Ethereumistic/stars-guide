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
    },
    {
        id: "mercury",
        name: "Mercury",
        domain: "Cognition",
        psychologicalFunction: "Mercury governs the cognitive framework, information processing, and expressive articulation. It acts as the intellect’s primary interface with reality.",
        coreDrives: ["Processing environmental data", "Articulating internal thoughts", "Bridging conceptual gaps"],
        shadowExpression: "When ungrounded, this manifests as heightened anxiety, over-intellectualization, or manipulative communication.",
        compositionalVerbPhrase: "processes reality and articulates internal data by"
    },
    {
        id: "venus",
        name: "Venus",
        domain: "Value",
        psychologicalFunction: "Venus rules the receptive drive, aesthetic appreciation, and relational bonding. It dictates what the psyche perceives as psychologically and materially valuable.",
        coreDrives: ["Cultivating interpersonal harmony", "Attracting resources and sensory pleasure", "Evaluating aesthetic and moral worth"],
        shadowExpression: "When distorted, this appears as superficiality, over-indulgence, or compromising core boundaries for the sake of peace.",
        compositionalVerbPhrase: "cultivates relational harmony and determines value by"
    },
    {
        id: "mars",
        name: "Mars",
        domain: "Action",
        psychologicalFunction: "Mars represents the mobilized will and the instinctual drive for assertion and separation. It is the engine of desire and boundary enforcement.",
        coreDrives: ["Asserting autonomous willpower", "Enforcing personal boundaries", "Pursuing biological and instinctual desires"],
        shadowExpression: "When suppressed or unchecked, it manifests as passive-aggression, volatile anger, or destructive impulsivity.",
        compositionalVerbPhrase: "asserts autonomous willpower and pursues inherent desires by"
    },
    {
        id: "jupiter",
        name: "Jupiter",
        domain: "Expansion",
        psychologicalFunction: "Jupiter is the drive for subjective meaning-making, philosophical synthesis, and growth. It regulates the capacity for hope, optimism, and broader understanding.",
        coreDrives: ["Expanding conceptual horizons", "Synthesizing broader physiological meaning", "Seeking growth and continuous learning"],
        shadowExpression: "When exaggerated, this manifests as dogmatism, unrealistic over-extension, or avoidance of necessary restrictions.",
        compositionalVerbPhrase: "seeks broader meaning and expands its philosophical horizons through"
    },
    {
        id: "saturn",
        name: "Saturn",
        domain: "Structure",
        psychologicalFunction: "Saturn dictates the capacity for reality testing, delayed gratification, and psychological maturation. It enforces the necessary limits and structures that temper the ego.",
        coreDrives: ["Establishing resilient boundaries", "Mastering material limitations", "Committing to long-term responsibility"],
        shadowExpression: "When internalized excessively, it manifests as paralyzing fear, impostor syndrome, rigidity, or defensive pessimism.",
        compositionalVerbPhrase: "constructs enduring reality and confronts inherent limitations by"
    },
    {
        id: "uranus",
        name: "Uranus",
        domain: "Disruption",
        psychologicalFunction: "Uranus acts as the psychological mechanism for individuation through rebellion against stagnation. It is the impulse that shatters outdated paradigms to enforce evolution.",
        coreDrives: ["Dismantling obsolete structures", "Asserting radical individuality", "Innovating toward future paradigms"],
        shadowExpression: "When unstable, it manifests as contrarianism for its own sake, chaotic disruption, and chronic inability to commit.",
        compositionalVerbPhrase: "disrupts stagnant patterns and innovates reality by"
    },
    {
        id: "neptune",
        name: "Neptune",
        domain: "Dissolution",
        psychologicalFunction: "Neptune represents the transcendent function of the psyche, governing intuition, spiritual longing, and the dissolution of ego boundaries into a collective oceanic state.",
        coreDrives: ["Experiencing numinous connection", "Dissolving egoic separation", "Connecting to universal empathy"],
        shadowExpression: "When untethered, this manifests as escapism, delusion, susceptibility to projection, and the loss of practical grounding.",
        compositionalVerbPhrase: "dissolves rigid boundaries and accesses transcendent empathy through"
    },
    {
        id: "pluto",
        name: "Pluto",
        domain: "Transformation",
        psychologicalFunction: "Pluto dictates the deep, evolutionary necessity for psychological rebirth. It governs the relationship with power, trauma, and the unconscious forces that compel profound metamorphosis.",
        coreDrives: ["Purging obsolete ego construct", "Mastering the shadow aspects", "Transmuting psychological pain into power"],
        shadowExpression: "When resisted, it manifests as paranoia, compulsive control, destructive obsession, and power struggles.",
        compositionalVerbPhrase: "compels profound psychological metamorphosis and masters hidden power by"
    },
    {
        id: "rising",
        name: "Rising",
        domain: "Interface",
        psychologicalFunction: "The Rising sign (Ascendant) dictates the external psychological interface and the persona. It is the ego's first line of defense and interaction with the immediate environment.",
        coreDrives: ["Projecting the external self", "Filtering environmental stimuli", "Establishing the initial relational boundary"],
        shadowExpression: "When unintegrated, it manifests as a false mask, chronic misalignment between internal truth and outward presentation, or defensive superficiality.",
        compositionalVerbPhrase: "projects its psychological interface and engages with the immediate environment by"
    }
];
