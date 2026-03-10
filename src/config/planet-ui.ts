export interface PlanetUIConfig {
    id: string;
    themeColor: string;
    rulerSymbol: string;
    imageUrl?: string;
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
    pluto: { id: "pluto", themeColor: "var(--pluto)", rulerSymbol: "♇", imageUrl: `${CDN_BASE}/pluto.webp` },
    // Points & Asteroids (Decoupled - No images needed)
    chiron: { id: "chiron", themeColor: "#e2e8f0", rulerSymbol: "⚷", imageUrl: `${CDN_BASE}/chiron.webp` },
    north_node: { id: "north_node", themeColor: "#fde047", rulerSymbol: "☊", imageUrl: `${CDN_BASE}/north_node.webp` },
    south_node: { id: "south_node", themeColor: "#94a3b8", rulerSymbol: "☋", imageUrl: `${CDN_BASE}/south_node.webp` },
    part_of_fortune: { id: "part_of_fortune", themeColor: "#fbbf24", rulerSymbol: "⊗" },
};
