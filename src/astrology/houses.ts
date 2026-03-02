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
    },
    {
        id: 3,
        primaryArena: "Immediate Environment",
        developmentalTheme: "The development of cognitive frameworks and lower mind functioning through active exchange with the immediate surroundings.",
        realWorldManifestations: ["Early education", "Sibling dynamics", "Short-distance travel and daily communication"],
        compositionalPrepositionalPhrase: "through the immediate environment of local networks and continuous cognitive exchange"
    },
    {
        id: 4,
        primaryArena: "Roots & Foundation",
        developmentalTheme: "The internalization of emotional security, ancestry, and the foundational psychological conditions developed in early life.",
        realWorldManifestations: ["The physical home", "Family heritage", "The unconscious baseline of safety"],
        compositionalPrepositionalPhrase: "at the psychological foundation of home, family, and emotional origins"
    },
    {
        id: 5,
        primaryArena: "Creative Expression",
        developmentalTheme: "The externalization of ego identity through joy, risk, and the pursuit of individual passions that leave a personal mark.",
        realWorldManifestations: ["Romantic encounters", "Artistic projects", "Children and playful recreation"],
        compositionalPrepositionalPhrase: "within the realm of dramatic self-expression and creative joy"
    },
    {
        id: 6,
        primaryArena: "Daily Optimization",
        developmentalTheme: "The mastery of practical efficiency, self-improvement, and the mind-body connection through disciplined service.",
        realWorldManifestations: ["Daily work routines", "Physical health maintenance", "Skill acquisition and service"],
        compositionalPrepositionalPhrase: "in the arena of daily routines, physical maintenance, and practical service"
    },
    {
        id: 7,
        primaryArena: "Partnerships",
        developmentalTheme: "The integration of the self via projection onto the 'other', necessitating compromise and the balancing of interpersonal scales.",
        realWorldManifestations: ["Marriage and committed partnerships", "Open enemies", "Legal contracts and negotiations"],
        compositionalPrepositionalPhrase: "within the dynamics of committed partnerships and one-on-one relationships"
    },
    {
        id: 8,
        primaryArena: "Metamorphosis",
        developmentalTheme: "The psychological confrontation with mortality, shared power, and the necessary dissolution of ego boundaries for deep intimacy.",
        realWorldManifestations: ["Shared finances and inheritances", "Psychological trauma", "Taboo subjects and deep intimacy"],
        compositionalPrepositionalPhrase: "in the subterranean arena of shared resources, psychological metamorphosis, and taboo"
    },
    {
        id: 9,
        primaryArena: "Expansion",
        developmentalTheme: "The search for encompassing meaning and belief systems through the synthesis of higher knowledge and experiential risk.",
        realWorldManifestations: ["Higher education", "Long-distance travel", "Philosophy and legal frameworks"],
        compositionalPrepositionalPhrase: "through the expansive realms of philosophical truth, higher learning, and distant horizons"
    },
    {
        id: 10,
        primaryArena: "Public Legacy",
        developmentalTheme: "The assertion of secular authority, societal contribution, and the crystallization of one's reputation into a lasting structure.",
        realWorldManifestations: ["Career trajectory", "Public status and recognition", "Relationship to authority figures"],
        compositionalPrepositionalPhrase: "within the structures of career, authority, and public legacy"
    },
    {
        id: 11,
        primaryArena: "The Collective",
        developmentalTheme: "The individuation within a group context and the intellectual pursuit of progressive ideals that elevate the communal whole.",
        realWorldManifestations: ["Friendship networks", "Humanitarian goals", "Hopes and visionary aspirations"],
        compositionalPrepositionalPhrase: "in the arena of collective networks, futurist ideals, and communal aspirations"
    },
    {
        id: 12,
        primaryArena: "The Unconscious",
        developmentalTheme: "The final dissolution of the ego into the unified field, requiring surrender and the confrontation of hidden psychic material.",
        realWorldManifestations: ["Psychological shadow work", "Places of isolation (hospitals/prisons)", "Mystical or numinous experiences"],
        compositionalPrepositionalPhrase: "within the hidden realms of the collective unconscious, isolation, and spiritual dissolution"
    }
];
