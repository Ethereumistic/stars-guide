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
        domain: "vitality and purpose",
        psychologicalFunction: "The Sun represents the core ego-structure and conscious drive for self-actualization. It dictates how the psyche asserts its existence and maintains vitality.",
        coreDrives: ["Achieving self-realization", "Projecting creative vitality", "Establishing a central purpose"],
        shadowExpression: "When unintegrated, this drive manifests as narcissism, a pathological need for external validation, or a rigid, inflexible ego.",
        compositionalVerbPhrase: "seeks validation and asserts itself"
    },
    {
        id: "moon",
        name: "Moon",
        domain: "inner world",
        psychologicalFunction: "The Moon dictates the unconscious emotional regulation system and attachment style. It represents the psychological baseline required to feel safe.",
        coreDrives: ["Regulating emotional equilibrium", "Securing psychological safety", "Nurturing the self and intimate others"],
        shadowExpression: "When threatened, this manifests as extreme emotional reactivity, codependency, or protective withdrawal.",
        compositionalVerbPhrase: "secures safety and nurtures the self"
    },
    {
        id: "mercury",
        name: "Mercury",
        domain: "intellect and communication",
        psychologicalFunction: "Mercury governs the cognitive framework, information processing, and expressive articulation. It acts as the intellect's primary interface with reality.",
        coreDrives: ["Processing environmental data", "Articulating internal thoughts", "Bridging conceptual gaps"],
        shadowExpression: "When ungrounded, this manifests as heightened anxiety, over-intellectualization, or manipulative communication.",
        compositionalVerbPhrase: "processes information and expresses thoughts"
    },
    {
        id: "venus",
        name: "Venus",
        domain: "relational harmony and aesthetic",
        psychologicalFunction: "Venus rules the receptive drive, aesthetic appreciation, and relational bonding. It dictates what the psyche perceives as psychologically and materially valuable.",
        coreDrives: ["Cultivating interpersonal harmony", "Attracting resources and sensory pleasure", "Evaluating aesthetic and moral worth"],
        shadowExpression: "When distorted, this appears as superficiality, over-indulgence, or compromising core boundaries for the sake of peace.",
        compositionalVerbPhrase: "navigates relationships and defines value"
    },
    {
        id: "mars",
        name: "Mars",
        domain: "drive and willpower",
        psychologicalFunction: "Mars represents the mobilized will and the instinctual drive for assertion and separation. It is the engine of desire and boundary enforcement.",
        coreDrives: ["Asserting autonomous willpower", "Enforcing personal boundaries", "Pursuing biological and instinctual desires"],
        shadowExpression: "When suppressed or unchecked, it manifests as passive-aggression, volatile anger, or destructive impulsivity.",
        compositionalVerbPhrase: "pursues goals and enforces personal boundaries"
    },
    {
        id: "jupiter",
        name: "Jupiter",
        domain: "capacity for growth and meaning",
        psychologicalFunction: "Jupiter is the drive for subjective meaning-making, philosophical synthesis, and growth. It regulates the capacity for hope, optimism, and broader understanding.",
        coreDrives: ["Expanding conceptual horizons", "Synthesizing broader physiological meaning", "Seeking growth and continuous learning"],
        shadowExpression: "When exaggerated, this manifests as dogmatism, unrealistic over-extension, or avoidance of necessary restrictions.",
        compositionalVerbPhrase: "expands horizons and seeks higher truth"
    },
    {
        id: "saturn",
        name: "Saturn",
        domain: "sense of discipline and boundaries",
        psychologicalFunction: "Saturn dictates the capacity for reality testing, delayed gratification, and psychological maturation. It enforces the necessary limits and structures that temper the ego.",
        coreDrives: ["Establishing resilient boundaries", "Mastering material limitations", "Committing to long-term responsibility"],
        shadowExpression: "When internalized excessively, it manifests as paralyzing fear, impostor syndrome, rigidity, or defensive pessimism.",
        compositionalVerbPhrase: "establishes structure and takes responsibility"
    },
    {
        id: "uranus",
        name: "Uranus",
        domain: "urge for innovation and disruption",
        psychologicalFunction: "Uranus acts as the psychological mechanism for individuation through rebellion against stagnation. It is the impulse that shatters outdated paradigms to enforce evolution.",
        coreDrives: ["Dismantling obsolete structures", "Asserting radical individuality", "Innovating toward future paradigms"],
        shadowExpression: "When unstable, it manifests as contrarianism for its own sake, chaotic disruption, and chronic inability to commit.",
        compositionalVerbPhrase: "dismantles the status quo and innovates"
    },
    {
        id: "neptune",
        name: "Neptune",
        domain: "intuition and spiritual longing",
        psychologicalFunction: "Neptune represents the transcendent function of the psyche, governing intuition, spiritual longing, and the dissolution of ego boundaries into a collective oceanic state.",
        coreDrives: ["Experiencing numinous connection", "Dissolving egoic separation", "Connecting to universal empathy"],
        shadowExpression: "When untethered, this manifests as escapism, delusion, susceptibility to projection, and the loss of practical grounding.",
        compositionalVerbPhrase: "dissolves rigid boundaries and accesses empathy"
    },
    {
        id: "pluto",
        name: "Pluto",
        domain: "capacity for deep transformation",
        psychologicalFunction: "Pluto dictates the deep, evolutionary necessity for psychological rebirth. It governs the relationship with power, trauma, and the unconscious forces that compel profound metamorphosis.",
        coreDrives: ["Purging obsolete ego construct", "Mastering the shadow aspects", "Transmuting psychological pain into power"],
        shadowExpression: "When resisted, it manifests as paranoia, compulsive control, destructive obsession, and power struggles.",
        compositionalVerbPhrase: "compels psychological rebirth and masters hidden power"
    },
    {
        id: "chiron",
        name: "Chiron",
        domain: "core wound and healing journey",
        psychologicalFunction: "Chiron acts as the bridge between the personal and the transcendent, highlighting profound vulnerabilities. It is the instinct to heal others through the wisdom gained from one's own unresolvable pain.",
        coreDrives: ["Synthesizing pain into wisdom", "Guiding others through shadow", "Accepting inherent vulnerability"],
        shadowExpression: "When unintegrated, this manifests as chronic victimhood, the savior complex, or continually reopening emotional wounds.",
        compositionalVerbPhrase: "catalyzes healing and confronts deep-seated wounds"
    },
    {
        id: "north node",
        name: "North Node",
        domain: "direction of karmic growth",
        psychologicalFunction: "The North Node represents the uncharted territory of the soul's evolution. It points toward the uncomfortable necessary growth edge and the skills that must be developed in this lifetime.",
        coreDrives: ["Embracing unfamiliar challenges", "Fulfilling karmic ambition", "Aligning with future potential"],
        shadowExpression: "When avoided, the individual stagnates, returning to the comfort zone at the cost of true psychological and spiritual maturation.",
        compositionalVerbPhrase: "pursues karmic ambition and future growth"
    },
    {
        id: "south node",
        name: "South Node",
        domain: "comfortable but outgrown tendencies",
        psychologicalFunction: "The South Node represents the reservoir of innate talents and past karma. It is the deeply familiar default mode that provides an initial foundation but must eventually be released.",
        coreDrives: ["Falling back on established mastery", "Releasing karmic attachments", "Shedding obsolete psychological skin"],
        shadowExpression: "When overused, it becomes a trap of rigid repetition, preventing the individual from evolving and embracing necessary vulnerability.",
        compositionalVerbPhrase: "releases outgrown patterns and purges attachments"
    }
];
