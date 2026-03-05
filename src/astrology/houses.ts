import { IconType } from "react-icons";
import { FaUser, FaCoins, FaComments, FaHome, FaTheaterMasks, FaHeartbeat, FaHandshake, FaSkull, FaGlobe, FaCrown, FaUsers, FaMoon } from "react-icons/fa";

export interface HouseData {
    id: number; // 1-12
    primaryArena: string;
    developmentalTheme: string;
    realWorldManifestations: string[];
    compositionalPrepositionalPhrase: string; // The "Where"

    // UI display fields
    name: string;
    romanNumeral: string;
    archetypeName: string;
    keyword: string;
    naturalSign: string;
    naturalSignId: string;
    motto: string;
    angularity: "Angular" | "Succedent" | "Cadent";

    // icon
    houseIcon: IconType;
}

export const compositionalHouses: HouseData[] = [
    {
        id: 1,
        name: "1st House",
        romanNumeral: "I",
        archetypeName: "The House of Self",
        keyword: "Identity",
        naturalSign: "Aries",
        naturalSignId: "aries",
        motto: "I am.",
        angularity: "Angular",
        houseIcon: FaUser,
        primaryArena: "Self, Appearance & Vitality",
        developmentalTheme: "Individuation, autonomous action, and the formation of the primary psychological boundary between self and other.",
        realWorldManifestations: ["Physical vitality and appearance", "First impressions", "Instinctual approach to new environments"],
        compositionalPrepositionalPhrase: "within the realm of primary identity and physical self-expression"
    },
    {
        id: 2,
        name: "2nd House",
        romanNumeral: "II",
        archetypeName: "The House of Value",
        keyword: "Resources",
        naturalSign: "Taurus",
        naturalSignId: "taurus",
        motto: "I have.",
        angularity: "Succedent",
        houseIcon: FaCoins,
        primaryArena: "Assets, Resources & Talents",
        developmentalTheme: "The establishment of self-worth through the acquisition and management of tangible security and value systems.",
        realWorldManifestations: ["Personal finances", "Sensory environments", "Inherent talents and self-worth"],
        compositionalPrepositionalPhrase: "in the arena of personal resources, values, and material stability"
    },
    {
        id: 3,
        name: "3rd House",
        romanNumeral: "III",
        archetypeName: "The House of Mind",
        keyword: "Communication",
        naturalSign: "Gemini",
        naturalSignId: "gemini",
        motto: "I think.",
        angularity: "Cadent",
        houseIcon: FaComments,
        primaryArena: "Communication, Rituals & Siblings",
        developmentalTheme: "The development of cognitive frameworks and lower mind functioning through active exchange with the immediate surroundings.",
        realWorldManifestations: ["Early education", "Sibling dynamics", "Short-distance travel and daily communication"],
        compositionalPrepositionalPhrase: "through the immediate environment of local networks and continuous cognitive exchange"
    },
    {
        id: 4,
        name: "4th House",
        romanNumeral: "IV",
        archetypeName: "The House of Roots",
        keyword: "Foundation",
        naturalSign: "Cancer",
        naturalSignId: "cancer",
        motto: "I feel.",
        angularity: "Angular",
        houseIcon: FaHome,
        primaryArena: "Parents, Foundations & Home",
        developmentalTheme: "The internalization of emotional security, ancestry, and the foundational psychological conditions developed in early life.",
        realWorldManifestations: ["The physical home", "Family heritage", "The unconscious baseline of safety"],
        compositionalPrepositionalPhrase: "at the psychological foundation of home, family, and emotional origins"
    },
    {
        id: 5,
        name: "5th House",
        romanNumeral: "V",
        archetypeName: "The House of Pleasure",
        keyword: "Creation",
        naturalSign: "Leo",
        naturalSignId: "leo",
        motto: "I will.",
        angularity: "Succedent",
        houseIcon: FaTheaterMasks,
        primaryArena: "Pleasure, Romance, Creativity & Children",
        developmentalTheme: "The externalization of ego identity through joy, risk, and the pursuit of individual passions that leave a personal mark.",
        realWorldManifestations: ["Romantic encounters", "Artistic projects", "Children and playful recreation"],
        compositionalPrepositionalPhrase: "within the realm of dramatic self-expression and creative joy"
    },
    {
        id: 6,
        name: "6th House",
        romanNumeral: "VI",
        archetypeName: "The House of Service",
        keyword: "Mastery",
        naturalSign: "Virgo",
        naturalSignId: "virgo",
        motto: "I analyze.",
        angularity: "Cadent",
        houseIcon: FaHeartbeat,
        primaryArena: "Work, Health & Pets",
        developmentalTheme: "The mastery of practical efficiency, self-improvement, and the mind-body connection through disciplined service.",
        realWorldManifestations: ["Daily work routines", "Physical health maintenance", "Skill acquisition and service"],
        compositionalPrepositionalPhrase: "in the arena of daily routines, physical maintenance, and practical service"
    },
    {
        id: 7,
        name: "7th House",
        romanNumeral: "VII",
        archetypeName: "The House of Partnership",
        keyword: "Union",
        naturalSign: "Libra",
        naturalSignId: "libra",
        motto: "I balance.",
        angularity: "Angular",
        houseIcon: FaHandshake,
        primaryArena: "Committed Partnerships",
        developmentalTheme: "The integration of the self via projection onto the 'other', necessitating compromise and the balancing of interpersonal scales.",
        realWorldManifestations: ["Marriage and committed partnerships", "Open enemies", "Legal contracts and negotiations"],
        compositionalPrepositionalPhrase: "within the dynamics of committed partnerships and one-on-one relationships"
    },
    {
        id: 8,
        name: "8th House",
        romanNumeral: "VIII",
        archetypeName: "The House of Transformation",
        keyword: "Metamorphosis",
        naturalSign: "Scorpio",
        naturalSignId: "scorpio",
        motto: "I desire.",
        angularity: "Succedent",
        houseIcon: FaSkull,
        primaryArena: "Death, Mental Health & Other People",
        developmentalTheme: "The psychological confrontation with mortality, shared power, and the necessary dissolution of ego boundaries for deep intimacy.",
        realWorldManifestations: ["Shared finances and inheritances", "Psychological trauma", "Taboo subjects and deep intimacy"],
        compositionalPrepositionalPhrase: "in the subterranean arena of shared resources, psychological metamorphosis, and taboo"
    },
    {
        id: 9,
        name: "9th House",
        romanNumeral: "IX",
        archetypeName: "The House of Philosophy",
        keyword: "Expansion",
        naturalSign: "Sagittarius",
        naturalSignId: "sagittarius",
        motto: "I seek.",
        angularity: "Cadent",
        houseIcon: FaGlobe,
        primaryArena: "Travel, Education, Religion & Philosophy",
        developmentalTheme: "The search for encompassing meaning and belief systems through the synthesis of higher knowledge and experiential risk.",
        realWorldManifestations: ["Higher education", "Long-distance travel", "Philosophy and legal frameworks"],
        compositionalPrepositionalPhrase: "through the expansive realms of philosophical truth, higher learning, and distant horizons"
    },
    {
        id: 10,
        name: "10th House",
        romanNumeral: "X",
        archetypeName: "The House of Legacy",
        keyword: "Authority",
        naturalSign: "Capricorn",
        naturalSignId: "capricorn",
        motto: "I use.",
        angularity: "Angular",
        houseIcon: FaCrown,
        primaryArena: "Career & Public Roles",
        developmentalTheme: "The assertion of secular authority, societal contribution, and the crystallization of one's reputation into a lasting structure.",
        realWorldManifestations: ["Career trajectory", "Public status and recognition", "Relationship to authority figures"],
        compositionalPrepositionalPhrase: "within the structures of career, authority, and public legacy"
    },
    {
        id: 11,
        name: "11th House",
        romanNumeral: "XI",
        archetypeName: "The House of Community",
        keyword: "Collective",
        naturalSign: "Aquarius",
        naturalSignId: "aquarius",
        motto: "I know.",
        angularity: "Succedent",
        houseIcon: FaUsers,
        primaryArena: "Community, Friends & Good Fortune",
        developmentalTheme: "The individuation within a group context and the intellectual pursuit of progressive ideals that elevate the communal whole.",
        realWorldManifestations: ["Friendship networks", "Humanitarian goals", "Hopes and visionary aspirations"],
        compositionalPrepositionalPhrase: "in the arena of collective networks, futurist ideals, and communal aspirations"
    },
    {
        id: 12,
        name: "12th House",
        romanNumeral: "XII",
        archetypeName: "The House of the Hidden",
        keyword: "Dissolution",
        naturalSign: "Pisces",
        naturalSignId: "pisces",
        motto: "I believe.",
        angularity: "Cadent",
        houseIcon: FaMoon,
        primaryArena: "Sorrow, Loss, Daemon & Hidden Life",
        developmentalTheme: "The final dissolution of the ego into the unified field, requiring surrender and the confrontation of hidden psychic material.",
        realWorldManifestations: ["Psychological shadow work", "Places of isolation (hospitals/prisons)", "Mystical or numinous experiences"],
        compositionalPrepositionalPhrase: "within the hidden realms of the collective unconscious, isolation, and spiritual dissolution"
    }
];