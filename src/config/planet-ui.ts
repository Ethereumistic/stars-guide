export interface PlanetUIConfig {
    id: string;
    themeColor: string;
    rulerSymbol: string;
    imageUrl: string;
}

const CDN_BASE = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/planets";

export const planetUIConfig: Record<string, PlanetUIConfig> = {
    sun: { id: "sun", themeColor: "var(--sun)", rulerSymbol: "☉", imageUrl: `${CDN_BASE}/sun.webp` },
    moon: { id: "moon", themeColor: "var(--moon)", rulerSymbol: "☾", imageUrl: `${CDN_BASE}/moon.webp` },
    mercury: { id: "mercury", themeColor: "var(--mercury)", rulerSymbol: "☿", imageUrl: `${CDN_BASE}/mercury.webp` },
    venus: { id: "venus", themeColor: "var(--venus)", rulerSymbol: "♀", imageUrl: `${CDN_BASE}/venus.webp` },
    mars: { id: "mars", themeColor: "var(--mars)", rulerSymbol: "♂", imageUrl: `${CDN_BASE}/mars.webp` },
    jupiter: { id: "jupiter", themeColor: "var(--jupiter)", rulerSymbol: "♃", imageUrl: `${CDN_BASE}/jupiter.webp` },
    saturn: { id: "saturn", themeColor: "var(--saturn)", rulerSymbol: "♄", imageUrl: `${CDN_BASE}/saturn.webp` },
    uranus: { id: "uranus", themeColor: "var(--uranus)", rulerSymbol: "⛢", imageUrl: `${CDN_BASE}/uranus.webp` },
    neptune: { id: "neptune", themeColor: "var(--neptune)", rulerSymbol: "♆", imageUrl: `${CDN_BASE}/neptune.webp` },
    pluto: { id: "pluto", themeColor: "var(--pluto)", rulerSymbol: "♇", imageUrl: `${CDN_BASE}/pluto.webp` }
};
