import { IconType } from "react-icons";
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

export interface SignUIConfig {
    id: string;
    icon: IconType;
    iconName: string;
    themeColor: string;
    constellationUrl: string;
    elementFrameUrl: string;
    elementName: "Fire" | "Earth" | "Air" | "Water";
}

export const CONSTELLATION_BASE_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/";
export const ELEMENT_FRAME_BASE_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/elements/v3/";

export const zodiacUIConfig: Record<string, SignUIConfig> = {
    aries: {
        id: "aries",
        icon: TbZodiacAries,
        iconName: "TbZodiacAries",
        themeColor: "var(--fire-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}aries.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        elementName: "Fire"
    },
    taurus: {
        id: "taurus",
        icon: TbZodiacTaurus,
        iconName: "TbZodiacTaurus",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}taurus.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth"
    },
    gemini: {
        id: "gemini",
        icon: TbZodiacGemini,
        iconName: "TbZodiacGemini",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}gemini.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air"
    },
    cancer: {
        id: "cancer",
        icon: TbZodiacCancer,
        iconName: "TbZodiacCancer",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}cancer.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water"
    },
    leo: {
        id: "leo",
        icon: TbZodiacLeo,
        iconName: "TbZodiacLeo",
        themeColor: "var(--fire-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}leo.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        elementName: "Fire"
    },
    virgo: {
        id: "virgo",
        icon: TbZodiacVirgo,
        iconName: "TbZodiacVirgo",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}virgo.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth"
    },
    libra: {
        id: "libra",
        icon: TbZodiacLibra,
        iconName: "TbZodiacLibra",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}libra.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air"
    },
    scorpio: {
        id: "scorpio",
        icon: TbZodiacScorpio,
        iconName: "TbZodiacScorpio",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}scorpio.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water"
    },
    sagittarius: {
        id: "sagittarius",
        icon: TbZodiacSagittarius,
        iconName: "TbZodiacSagittarius",
        themeColor: "var(--fire-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}sagittarius.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        elementName: "Fire"
    },
    capricorn: {
        id: "capricorn",
        icon: TbZodiacCapricorn,
        iconName: "TbZodiacCapricorn",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}capricorn.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth"
    },
    aquarius: {
        id: "aquarius",
        icon: TbZodiacAquarius,
        iconName: "TbZodiacAquarius",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}aquarius.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air"
    },
    pisces: {
        id: "pisces",
        icon: TbZodiacPisces,
        iconName: "TbZodiacPisces",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}pisces.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water"
    }
};
