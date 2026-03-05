export interface AstronomicalData {
    classification: string;
    distanceText: string;
    diameter: string;
    mass: string;
    orbitalPeriod: string;
    dayLength?: string;
    temperature: string;
    moons: string;
    notableTrait?: string;
}

export interface AstrologicalData {
    archetype: string;
    rules: string;
    element: string;
    controls: string;
    body: string;
    polarity?: string;
    specialRole?: string;
}

export interface PlanetData {
    id: string;
    name: string;
    domain: string;
    psychologicalFunction: string;
    coreDrives: string[];
    shadowExpression: string;
    compositionalVerbPhrase: string; // The "What"

    astronomy?: AstronomicalData;
    astrology?: AstrologicalData;
}

export const compositionalPlanets: PlanetData[] = [
    {
        id: "sun",
        name: "Sun",
        domain: "vitality and purpose",
        psychologicalFunction: "The Sun represents the core ego-structure and conscious drive for self-actualization. It dictates how the psyche asserts its existence and maintains vitality.",
        coreDrives: ["Achieving self-realization", "Projecting creative vitality", "Establishing a central purpose"],
        shadowExpression: "When unintegrated, this drive manifests as narcissism, a pathological need for external validation, or a rigid, inflexible ego.",
        compositionalVerbPhrase: "seeks validation and asserts itself",
        astronomy: {
            classification: "G2V Yellow Dwarf Star",
            distanceText: "1 AU / ~149.6 million km",
            diameter: "1,392,700 km (109× Earth)",
            mass: "1.989 × 10³⁰ kg",
            orbitalPeriod: "N/A (Center of System)",
            temperature: "5,778 K (Surface) / ~15.7 million K (Core)",
            moons: "0",
            notableTrait: "Holds 99.8% of the solar system's mass"
        },
        astrology: {
            archetype: "King",
            rules: "Leo",
            element: "Fire",
            controls: "Identity, ego, willpower, life force, self-expression",
            body: "Heart, spine, circulatory system",
            polarity: "Masculine"
        }
    },
    {
        id: "moon",
        name: "Moon",
        domain: "inner world",
        psychologicalFunction: "The Moon dictates the unconscious emotional regulation system and attachment style. It represents the psychological baseline required to feel safe.",
        coreDrives: ["Regulating emotional equilibrium", "Securing psychological safety", "Nurturing the self and intimate others"],
        shadowExpression: "When threatened, this manifests as extreme emotional reactivity, codependency, or protective withdrawal.",
        compositionalVerbPhrase: "secures safety and nurtures the self",
        astronomy: {
            classification: "Natural rocky satellite",
            distanceText: "~384,400 km (avg)",
            diameter: "3,474.8 km",
            mass: "7.342 × 10²² kg",
            orbitalPeriod: "27.32 days (Sidereal)",
            temperature: "−173 to +127 °C",
            moons: "0"
        },
        astrology: {
            archetype: "Soul",
            rules: "Cancer",
            element: "Water",
            controls: "Emotions, instincts, memory, subconscious, home",
            body: "Stomach, breasts, bodily fluids, womb",
            polarity: "Feminine"
        }
    },
    {
        id: "mercury",
        name: "Mercury",
        domain: "intellect and communication",
        psychologicalFunction: "Mercury governs the cognitive framework, information processing, and expressive articulation. It acts as the intellect's primary interface with reality.",
        coreDrives: ["Processing environmental data", "Articulating internal thoughts", "Bridging conceptual gaps"],
        shadowExpression: "When ungrounded, this manifests as heightened anxiety, over-intellectualization, or manipulative communication.",
        compositionalVerbPhrase: "processes information and expresses thoughts",
        astronomy: {
            classification: "Terrestrial planet",
            distanceText: "0.387 AU (avg)",
            diameter: "4,879 km",
            mass: "3.301 × 10²³ kg",
            orbitalPeriod: "87.97 days",
            dayLength: "58.65 Earth days",
            temperature: "−180 to +430 °C",
            moons: "0",
            notableTrait: "Orbital Velocity: 47.87 km/s (fastest planet)"
        },
        astrology: {
            archetype: "Messenger",
            rules: "Gemini, Virgo",
            element: "Air, Earth",
            controls: "Communication, thought, logic, short travel, contracts",
            body: "Nervous system, lungs, hands, tongue",
            specialRole: "Retrogrades ~3× per year; associated with miscommunication, delays"
        }
    },
    {
        id: "venus",
        name: "Venus",
        domain: "relational harmony and aesthetic",
        psychologicalFunction: "Venus rules the receptive drive, aesthetic appreciation, and relational bonding. It dictates what the psyche perceives as psychologically and materially valuable.",
        coreDrives: ["Cultivating interpersonal harmony", "Attracting resources and sensory pleasure", "Evaluating aesthetic and moral worth"],
        shadowExpression: "When distorted, this appears as superficiality, over-indulgence, or compromising core boundaries for the sake of peace.",
        compositionalVerbPhrase: "navigates relationships and defines value",
        astronomy: {
            classification: "Terrestrial planet",
            distanceText: "0.723 AU (avg)",
            diameter: "12,104 km",
            mass: "4.867 × 10²⁴ kg",
            orbitalPeriod: "224.7 days",
            dayLength: "243 Earth days (retrograde rotation)",
            temperature: "~465 °C (avg)",
            moons: "0",
            notableTrait: "Albedo: 0.65 (brightest planet in sky)"
        },
        astrology: {
            archetype: "Artist",
            rules: "Taurus, Libra",
            element: "Earth, Air",
            controls: "Love, beauty, pleasure, values, money, aesthetics",
            body: "Throat, kidneys, skin, reproductive system",
            polarity: "Feminine"
        }
    },
    {
        id: "mars",
        name: "Mars",
        domain: "drive and willpower",
        psychologicalFunction: "Mars represents the mobilized will and the instinctual drive for assertion and separation. It is the engine of desire and boundary enforcement.",
        coreDrives: ["Asserting autonomous willpower", "Enforcing personal boundaries", "Pursuing biological and instinctual desires"],
        shadowExpression: "When suppressed or unchecked, it manifests as passive-aggression, volatile anger, or destructive impulsivity.",
        compositionalVerbPhrase: "pursues goals and enforces personal boundaries",
        astronomy: {
            classification: "Terrestrial planet",
            distanceText: "1.524 AU (avg)",
            diameter: "6,779 km",
            mass: "6.39 × 10²³ kg",
            orbitalPeriod: "686.97 days (~1.88 years)",
            dayLength: "24h 37min",
            temperature: "−87 to −5 °C",
            moons: "2 (Phobos, Deimos)"
        },
        astrology: {
            archetype: "Warrior",
            rules: "Aries",
            element: "Fire",
            controls: "Action, ambition, anger, sex drive, courage, conflict",
            body: "Muscles, adrenal glands, head, blood, iron",
            polarity: "Masculine"
        }
    },
    {
        id: "jupiter",
        name: "Jupiter",
        domain: "capacity for growth and meaning",
        psychologicalFunction: "Jupiter is the drive for subjective meaning-making, philosophical synthesis, and growth. It regulates the capacity for hope, optimism, and broader understanding.",
        coreDrives: ["Expanding conceptual horizons", "Synthesizing broader physiological meaning", "Seeking growth and continuous learning"],
        shadowExpression: "When exaggerated, this manifests as dogmatism, unrealistic over-extension, or avoidance of necessary restrictions.",
        compositionalVerbPhrase: "expands horizons and seeks higher truth",
        astronomy: {
            classification: "Gas giant",
            distanceText: "5.203 AU (avg)",
            diameter: "139,820 km (11× Earth)",
            mass: "1.898 × 10²⁷ kg",
            orbitalPeriod: "11.86 years",
            dayLength: "9h 56min (fastest rotation)",
            temperature: "~−145 °C (Cloud-top)",
            moons: "95 confirmed",
            notableTrait: "Great Red Spot: Storm active for 350+ years"
        },
        astrology: {
            archetype: "Philosopher",
            rules: "Sagittarius",
            element: "Fire",
            controls: "Expansion, luck, wisdom, abundance, higher learning, faith",
            body: "Liver, thighs, hips",
            specialRole: "Called the 'Greater Benefic'; most favorable planet"
        }
    },
    {
        id: "saturn",
        name: "Saturn",
        domain: "sense of discipline and boundaries",
        psychologicalFunction: "Saturn dictates the capacity for reality testing, delayed gratification, and psychological maturation. It enforces the necessary limits and structures that temper the ego.",
        coreDrives: ["Establishing resilient boundaries", "Mastering material limitations", "Committing to long-term responsibility"],
        shadowExpression: "When internalized excessively, it manifests as paralyzing fear, impostor syndrome, rigidity, or defensive pessimism.",
        compositionalVerbPhrase: "establishes structure and takes responsibility",
        astronomy: {
            classification: "Gas giant",
            distanceText: "9.537 AU (avg)",
            diameter: "116,460 km (9.5× Earth)",
            mass: "5.683 × 10²⁶ kg",
            orbitalPeriod: "29.46 years",
            dayLength: "10h 42min",
            temperature: "~-178 °C",
            moons: "146 confirmed (most in solar system)",
            notableTrait: "Density: 0.687 g/cm³ (less dense than water)"
        },
        astrology: {
            archetype: "Taskmaster",
            rules: "Capricorn",
            element: "Earth",
            controls: "Discipline, structure, karma, limitations, responsibility",
            body: "Bones, teeth, skin, knees",
            specialRole: "Saturn Return occurs ~age 29–30 and 58–59; major life reckoning"
        }
    },
    {
        id: "uranus",
        name: "Uranus",
        domain: "urge for innovation and disruption",
        psychologicalFunction: "Uranus acts as the psychological mechanism for individuation through rebellion against stagnation. It is the impulse that shatters outdated paradigms to enforce evolution.",
        coreDrives: ["Dismantling obsolete structures", "Asserting radical individuality", "Innovating toward future paradigms"],
        shadowExpression: "When unstable, it manifests as contrarianism for its own sake, chaotic disruption, and chronic inability to commit.",
        compositionalVerbPhrase: "dismantles the status quo and innovates",
        astronomy: {
            classification: "Ice giant",
            distanceText: "19.19 AU (avg)",
            diameter: "50,724 km (4× Earth)",
            mass: "8.681 × 10²⁵ kg",
            orbitalPeriod: "84.01 years",
            dayLength: "17h 14min",
            temperature: "~-224 °C",
            moons: "27 confirmed",
            notableTrait: "Axial Tilt: 97.77° (orbits on its side)"
        },
        astrology: {
            archetype: "Awakener",
            rules: "Aquarius",
            element: "Air",
            controls: "Rebellion, innovation, sudden change, freedom, technology",
            body: "Nervous system, ankles, electrical impulses"
        }
    },
    {
        id: "neptune",
        name: "Neptune",
        domain: "intuition and spiritual longing",
        psychologicalFunction: "Neptune represents the transcendent function of the psyche, governing intuition, spiritual longing, and the dissolution of ego boundaries into a collective oceanic state.",
        coreDrives: ["Experiencing numinous connection", "Dissolving egoic separation", "Connecting to universal empathy"],
        shadowExpression: "When untethered, this manifests as escapism, delusion, susceptibility to projection, and the loss of practical grounding.",
        compositionalVerbPhrase: "dissolves rigid boundaries and accesses empathy",
        astronomy: {
            classification: "Ice giant",
            distanceText: "30.07 AU (avg)",
            diameter: "49,244 km (~3.9× Earth)",
            mass: "1.024 × 10²⁶ kg",
            orbitalPeriod: "164.8 years",
            dayLength: "16h 6min",
            temperature: "−201 °C",
            moons: "16 confirmed",
            notableTrait: "Wind Speed: Up to 2,100 km/h (fastest in solar system)"
        },
        astrology: {
            archetype: "Dreamer",
            rules: "Pisces",
            element: "Water",
            controls: "Dreams, illusion, spirituality, compassion, dissolution",
            body: "Feet, lymphatic system, pineal gland"
        }
    },
    {
        id: "pluto",
        name: "Pluto",
        domain: "capacity for deep transformation",
        psychologicalFunction: "Pluto dictates the deep, evolutionary necessity for psychological rebirth. It governs the relationship with power, trauma, and the unconscious forces that compel profound metamorphosis.",
        coreDrives: ["Purging obsolete ego construct", "Mastering the shadow aspects", "Transmuting psychological pain into power"],
        shadowExpression: "When resisted, it manifests as paranoia, compulsive control, destructive obsession, and power struggles.",
        compositionalVerbPhrase: "compels psychological rebirth and masters hidden power",
        astronomy: {
            classification: "Dwarf planet",
            distanceText: "39.48 AU (avg)",
            diameter: "2,376 km",
            mass: "1.303 × 10²² kg",
            orbitalPeriod: "247.94 years",
            dayLength: "6.39 Earth days",
            temperature: "−218 to −228 °C",
            moons: "5 (Charon, Styx, Nix, Kerberos, Hydra)"
        },
        astrology: {
            archetype: "Transformer",
            rules: "Scorpio",
            element: "Water",
            controls: "Death, rebirth, power, obsession, transformation, the underworld",
            body: "Reproductive organs, colon, cells (deep regeneration)"
        }
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
