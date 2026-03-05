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
    constellationUrl: string;
}


export const CONSTELLATION_BASE_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/";

export const zodiacUIConfig: Record<string, SignUIConfig> = {
    aries: {
        id: "aries",
        icon: TbZodiacAries,
        iconName: "TbZodiacAries",
        constellationUrl: `${CONSTELLATION_BASE_URL}aries.svg`,
    },
    taurus: {
        id: "taurus",
        icon: TbZodiacTaurus,
        iconName: "TbZodiacTaurus",
        constellationUrl: `${CONSTELLATION_BASE_URL}taurus.svg`,
    },
    gemini: {
        id: "gemini",
        icon: TbZodiacGemini,
        iconName: "TbZodiacGemini",
        constellationUrl: `${CONSTELLATION_BASE_URL}gemini.svg`,
    },
    cancer: {
        id: "cancer",
        icon: TbZodiacCancer,
        iconName: "TbZodiacCancer",
        constellationUrl: `${CONSTELLATION_BASE_URL}cancer.svg`,
    },
    leo: {
        id: "leo",
        icon: TbZodiacLeo,
        iconName: "TbZodiacLeo",
        constellationUrl: `${CONSTELLATION_BASE_URL}leo.svg`,
    },
    virgo: {
        id: "virgo",
        icon: TbZodiacVirgo,
        iconName: "TbZodiacVirgo",
        constellationUrl: `${CONSTELLATION_BASE_URL}virgo.svg`,
    },
    libra: {
        id: "libra",
        icon: TbZodiacLibra,
        iconName: "TbZodiacLibra",
        constellationUrl: `${CONSTELLATION_BASE_URL}libra.svg`,
    },
    scorpio: {
        id: "scorpio",
        icon: TbZodiacScorpio,
        iconName: "TbZodiacScorpio",
        constellationUrl: `${CONSTELLATION_BASE_URL}scorpio.svg`,
    },
    sagittarius: {
        id: "sagittarius",
        icon: TbZodiacSagittarius,
        iconName: "TbZodiacSagittarius",
        constellationUrl: `${CONSTELLATION_BASE_URL}sagittarius.svg`,
    },
    capricorn: {
        id: "capricorn",
        icon: TbZodiacCapricorn,
        iconName: "TbZodiacCapricorn",
        constellationUrl: `${CONSTELLATION_BASE_URL}capricorn.svg`,
    },
    aquarius: {
        id: "aquarius",
        icon: TbZodiacAquarius,
        iconName: "TbZodiacAquarius",
        constellationUrl: `${CONSTELLATION_BASE_URL}aquarius.svg`,
    },
    pisces: {
        id: "pisces",
        icon: TbZodiacPisces,
        iconName: "TbZodiacPisces",
        constellationUrl: `${CONSTELLATION_BASE_URL}pisces.svg`,
    }
};
