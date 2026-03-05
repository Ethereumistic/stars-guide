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

import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";

export interface SignUIConfig {
    id: string;
    icon: IconType;
    iconName: string;
    themeColor: string;
    constellationUrl: string;
    elementFrameUrl: string;
    elementName: "Fire" | "Earth" | "Air" | "Water";
    elementIcon: "GiFlame" | "GiStonePile" | "GiTornado" | "GiWaveCrest";
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
        elementName: "Fire",
        elementIcon: "GiFlame"
    },
    taurus: {
        id: "taurus",
        icon: TbZodiacTaurus,
        iconName: "TbZodiacTaurus",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}taurus.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth",
        elementIcon: "GiStonePile"
    },
    gemini: {
        id: "gemini",
        icon: TbZodiacGemini,
        iconName: "TbZodiacGemini",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}gemini.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air",
        elementIcon: "GiTornado"
    },
    cancer: {
        id: "cancer",
        icon: TbZodiacCancer,
        iconName: "TbZodiacCancer",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}cancer.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water",
        elementIcon: "GiWaveCrest"
    },
    leo: {
        id: "leo",
        icon: TbZodiacLeo,
        iconName: "TbZodiacLeo",
        themeColor: "var(--fire-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}leo.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        elementName: "Fire",
        elementIcon: "GiFlame"
    },
    virgo: {
        id: "virgo",
        icon: TbZodiacVirgo,
        iconName: "TbZodiacVirgo",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}virgo.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth",
        elementIcon: "GiStonePile"
    },
    libra: {
        id: "libra",
        icon: TbZodiacLibra,
        iconName: "TbZodiacLibra",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}libra.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air",
        elementIcon: "GiTornado"
    },
    scorpio: {
        id: "scorpio",
        icon: TbZodiacScorpio,
        iconName: "TbZodiacScorpio",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}scorpio.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water",
        elementIcon: "GiWaveCrest"
    },
    sagittarius: {
        id: "sagittarius",
        icon: TbZodiacSagittarius,
        iconName: "TbZodiacSagittarius",
        themeColor: "var(--fire-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}sagittarius.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        elementName: "Fire",
        elementIcon: "GiFlame"
    },
    capricorn: {
        id: "capricorn",
        icon: TbZodiacCapricorn,
        iconName: "TbZodiacCapricorn",
        themeColor: "var(--earth-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}capricorn.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        elementName: "Earth",
        elementIcon: "GiStonePile"
    },
    aquarius: {
        id: "aquarius",
        icon: TbZodiacAquarius,
        iconName: "TbZodiacAquarius",
        themeColor: "var(--air-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}aquarius.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        elementName: "Air",
        elementIcon: "GiTornado"
    },
    pisces: {
        id: "pisces",
        icon: TbZodiacPisces,
        iconName: "TbZodiacPisces",
        themeColor: "var(--water-primary)",
        constellationUrl: `${CONSTELLATION_BASE_URL}pisces.svg`,
        elementFrameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        elementName: "Water",
        elementIcon: "GiWaveCrest"
    }
};
