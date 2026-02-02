import {
    TbZodiacAries,
    TbZodiacTaurus,
    TbZodiacGemini,
    TbZodiacCancer,
    TbZodiacLeo,
    TbZodiacVirgo,
    TbZodiacLibra,
    TbZodiacScorpio,
    TbZodiacSagittarius,
    TbZodiacCapricorn,
    TbZodiacAquarius,
    TbZodiacPisces
} from "react-icons/tb";
import { GiWaterfall, GiTornado, GiFlame } from "react-icons/gi";
import { TbMountain } from "react-icons/tb";
import { IconType } from "react-icons";

export type ElementType = "Fire" | "Earth" | "Air" | "Water";

export interface ZodiacSign {
    id: string;
    name: string;
    symbol: string;
    element: ElementType;
    icon: IconType;
    elementIcon: IconType;
    traits: string;
    dates: string;
}

export const ELEMENTS: Record<ElementType, { name: string; icon: IconType; }> = {
    Fire: { name: "Fire", icon: GiFlame },
    Earth: { name: "Earth", icon: TbMountain },
    Air: { name: "Air", icon: GiTornado },
    Water: { name: "Water", icon: GiWaterfall },
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
    {
        id: "aries",
        name: "Aries",
        symbol: "♈",
        element: "Fire",
        icon: TbZodiacAries,
        elementIcon: GiFlame,
        traits: "Energetic, adventurous, and enthusiastic.",
        dates: "Mar 21 - Apr 19",
    },
    {
        id: "taurus",
        name: "Taurus",
        symbol: "♉",
        element: "Earth",
        icon: TbZodiacTaurus,
        elementIcon: TbMountain,
        traits: "Patient, reliable, and warmhearted.",
        dates: "Apr 20 - May 20",
    },
    {
        id: "gemini",
        name: "Gemini",
        symbol: "♊",
        element: "Air",
        icon: TbZodiacGemini,
        elementIcon: GiTornado,
        traits: "Adaptable, versatile, and intellectual.",
        dates: "May 21 - Jun 20",
    },
    {
        id: "cancer",
        name: "Cancer",
        symbol: "♋",
        element: "Water",
        icon: TbZodiacCancer,
        elementIcon: GiWaterfall,
        traits: "Emotional, loving, and intuitive.",
        dates: "Jun 21 - Jul 22",
    },
    {
        id: "leo",
        name: "Leo",
        symbol: "♌",
        element: "Fire",
        icon: TbZodiacLeo,
        elementIcon: GiFlame,
        traits: "Generous, warmhearted, and creative.",
        dates: "Jul 23 - Aug 22",
    },
    {
        id: "virgo",
        name: "Virgo",
        symbol: "♍",
        element: "Earth",
        icon: TbZodiacVirgo,
        elementIcon: TbMountain,
        traits: "Modest, shy, and meticulous.",
        dates: "Aug 23 - Sep 22",
    },
    {
        id: "libra",
        name: "Libra",
        symbol: "♎",
        element: "Air",
        icon: TbZodiacLibra,
        elementIcon: GiTornado,
        traits: "Diplomatic, urbane, and romantic.",
        dates: "Sep 23 - Oct 22",
    },
    {
        id: "scorpio",
        name: "Scorpio",
        symbol: "♏",
        element: "Water",
        icon: TbZodiacScorpio,
        elementIcon: GiWaterfall,
        traits: "Determined, forceful, and emotional.",
        dates: "Oct 23 - Nov 21",
    },
    {
        id: "sagittarius",
        name: "Sagittarius",
        symbol: "♐",
        element: "Fire",
        icon: TbZodiacSagittarius,
        elementIcon: GiFlame,
        traits: "Optimistic, freedom-loving, and honest.",
        dates: "Nov 22 - Dec 21",
    },
    {
        id: "capricorn",
        name: "Capricorn",
        symbol: "♑",
        element: "Earth",
        icon: TbZodiacCapricorn,
        elementIcon: TbMountain,
        traits: "Practical, prudent, and ambitious.",
        dates: "Dec 22 - Jan 19",
    },
    {
        id: "aquarius",
        name: "Aquarius",
        symbol: "♒",
        element: "Air",
        icon: TbZodiacAquarius,
        elementIcon: GiTornado,
        traits: "Friendly, humanitarian, and honest.",
        dates: "Jan 20 - Feb 18",
    },
    {
        id: "pisces",
        name: "Pisces",
        symbol: "♓",
        element: "Water",
        icon: TbZodiacPisces,
        elementIcon: GiWaterfall,
        traits: "Imaginative, sensitive, and compassionate.",
        dates: "Feb 19 - Mar 20",
    },
];

export const getZodiacSignByDate = (month: number, day: number): ZodiacSign => {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[0];
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[1];
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[2];
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[3];
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[4];
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[5];
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[6];
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[7];
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS[8];
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[9];
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[10];
    return ZODIAC_SIGNS[11]; // Pisces
};

/**
 * Estimates the rising sign based on sun sign, time of day, and personality traits.
 * This is an "astrological detective" method for when birth time is unknown.
 */
export const estimateRisingSign = (
    sunSignId: string,
    timeOfDay: "morning" | "afternoon" | "evening" | "night" | "unknown" | null,
    answers: Record<string, string>
): ZodiacSign => {
    const sunIndex = ZODIAC_SIGNS.findIndex(s => s.id === sunSignId);
    if (sunIndex === -1) return ZODIAC_SIGNS[0];

    // 1. Scoring each sign based on detective answers
    const scores: Record<string, number> = {};
    ZODIAC_SIGNS.forEach(s => scores[s.id] = 0);

    Object.values(answers).forEach(val => {
        if (scores[val] !== undefined) {
            scores[val] += 5; // Direct match weight
        }
    });

    // 2. Define probable offsets from sun sign based on time of day
    // Each 2 hours roughly = 1 sign (30 degrees).
    // Sunrise (6am) = Sun sign is ASC.
    let possibleOffsets: number[] = [];
    switch (timeOfDay) {
        case "morning": // 6am - 12pm
            possibleOffsets = [0, 1, 2];
            break;
        case "afternoon": // 12pm - 6pm
            possibleOffsets = [3, 4, 5];
            break;
        case "evening": // 6pm - 12am
            possibleOffsets = [6, 7, 8];
            break;
        case "night": // 12am - 6am
            possibleOffsets = [9, 10, 11];
            break;
        default:
            possibleOffsets = Array.from({ length: 12 }, (_, i) => i);
    }

    // 3. Find the best match within the time constraint
    // We give a small bonus for being in the "likely" window, 
    // then pick the one with the highest trait score.
    const candidates = possibleOffsets.map(offset => {
        const index = (sunIndex + offset) % 12;
        const sign = ZODIAC_SIGNS[index];
        return {
            sign,
            score: (scores[sign.id] || 0) + 1 // Add 1 as a baseline for being in the right time window
        };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0].sign;
};

/**
 * Get a zodiac sign by its name (case-insensitive)
 */
export const getZodiacSignByName = (name: string): ZodiacSign | undefined => {
    return ZODIAC_SIGNS.find(s => s.name.toLowerCase() === name.toLowerCase());
};

/**
 * Get the Tailwind class name for an element's color
 * @param element - The element type
 * @param prefix - The Tailwind prefix (e.g., 'bg', 'text', 'border')
 * @returns The Tailwind class name
 */
export const getElementClass = (element: ElementType, prefix: 'bg' | 'text' | 'border' = 'text'): string => {
    return `${prefix}-${element.toLowerCase()}`;
};

/**
 * Get the element name as a CSS variable name (lowercase)
 * For use in CSS like: var(--fire), var(--water), etc.
 * @param element - The element type
 * @returns The lowercase element name
 */
export const getElementVar = (element: ElementType): string => {
    return element.toLowerCase();
};
