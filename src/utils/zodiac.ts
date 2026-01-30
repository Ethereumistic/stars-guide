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
import { FaMountain } from "react-icons/fa";
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

export const ELEMENTS: Record<ElementType, { name: string; icon: IconType; color: string }> = {
    Fire: { name: "Fire", icon: GiFlame, color: "#FF4D4D" },
    Earth: { name: "Earth", icon: FaMountain, color: "#4CAF50" },
    Air: { name: "Air", icon: GiTornado, color: "#00BCD4" },
    Water: { name: "Water", icon: GiWaterfall, color: "#2196F3" },
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
        elementIcon: FaMountain,
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
        elementIcon: FaMountain,
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
        elementIcon: FaMountain,
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
