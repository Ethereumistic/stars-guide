import { IconType } from "react-icons";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import { ElementType } from "@/astrology/elements";

export const ELEMENT_FRAME_BASE_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/elements/v3/";

export interface ElementStyles {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
    gradient: string;
}

export interface ElementUIConfigData {
    id: ElementType;
    icon: IconType;
    iconName: string;
    frameUrl: string;
    styles: ElementStyles;
}

export const elementUIConfig: Record<ElementType, ElementUIConfigData> = {
    Fire: {
        id: "Fire",
        icon: GiFlame,
        iconName: "GiFlame",
        frameUrl: `${ELEMENT_FRAME_BASE_URL}fire.png`,
        styles: {
            primary: `var(--fire-primary)`,
            secondary: `var(--fire-secondary)`,
            glow: `var(--fire-glow)`,
            border: `var(--fire-border)`,
            gradient: `var(--fire-gradient)`
        }
    },
    Earth: {
        id: "Earth",
        icon: GiStonePile,
        iconName: "GiStonePile",
        frameUrl: `${ELEMENT_FRAME_BASE_URL}earth.png`,
        styles: {
            primary: `var(--earth-primary)`,
            secondary: `var(--earth-secondary)`,
            glow: `var(--earth-glow)`,
            border: `var(--earth-border)`,
            gradient: `var(--earth-gradient)`
        }
    },
    Air: {
        id: "Air",
        icon: GiTornado,
        iconName: "GiTornado",
        frameUrl: `${ELEMENT_FRAME_BASE_URL}air.png`,
        styles: {
            primary: `var(--air-primary)`,
            secondary: `var(--air-secondary)`,
            glow: `var(--air-glow)`,
            border: `var(--air-border)`,
            gradient: `var(--air-gradient)`
        }
    },
    Water: {
        id: "Water",
        icon: GiWaveCrest,
        iconName: "GiWaveCrest",
        frameUrl: `${ELEMENT_FRAME_BASE_URL}water.png`,
        styles: {
            primary: `var(--water-primary)`,
            secondary: `var(--water-secondary)`,
            glow: `var(--water-glow)`,
            border: `var(--water-border)`,
            gradient: `var(--water-gradient)`
        }
    }
};
