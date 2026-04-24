export interface PlanetUIConfig {
    id: string;
    themeColor: string;
    rulerSymbol: string;
    imageUrl?: string;
    /** Per-planet scale factor to normalize visual size across all planet images.
     *  Tweak these values until planets appear equal in diameter. */
    imageScale?: number;
}

const CDN_BASE = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/planets";

export const planetUIConfig: Record<string, PlanetUIConfig> = {
    sun: { id: "sun", themeColor: "var(--sun)", rulerSymbol: "☉", imageUrl: `${CDN_BASE}/sun.webp`, imageScale: 1.25 },
    moon: { id: "moon", themeColor: "var(--moon)", rulerSymbol: "☾", imageUrl: `${CDN_BASE}/moon.webp`, imageScale: 1.118 },
    mercury: { id: "mercury", themeColor: "var(--mercury)", rulerSymbol: "☿", imageUrl: `${CDN_BASE}/mercury.webp`, imageScale: 1 },
    venus: { id: "venus", themeColor: "var(--venus)", rulerSymbol: "♀", imageUrl: `${CDN_BASE}/venus.webp`, imageScale: 1.08 },
    mars: { id: "mars", themeColor: "var(--mars)", rulerSymbol: "♂", imageUrl: `${CDN_BASE}/mars.webp`, imageScale: 1.08 },
    jupiter: { id: "jupiter", themeColor: "var(--jupiter)", rulerSymbol: "♃", imageUrl: `${CDN_BASE}/jupiter.webp`, imageScale: 1.09 },
    saturn: { id: "saturn", themeColor: "var(--saturn)", rulerSymbol: "♄", imageUrl: `${CDN_BASE}/saturn.webp`, imageScale: 1.28 },
    uranus: { id: "uranus", themeColor: "var(--uranus)", rulerSymbol: "⛢", imageUrl: `${CDN_BASE}/uranus.webp`, imageScale: 1.2 },
    neptune: { id: "neptune", themeColor: "var(--neptune)", rulerSymbol: "♆", imageUrl: `${CDN_BASE}/neptune.webp`, imageScale: 1.15 },
    pluto: { id: "pluto", themeColor: "var(--pluto)", rulerSymbol: "♇", imageUrl: `${CDN_BASE}/pluto.webp`, imageScale: 1.12 },
    // Points & Asteroids
    chiron: { id: "chiron", themeColor: "#e2e8f0", rulerSymbol: "⚷", imageUrl: `${CDN_BASE}/chiron.webp`, imageScale: 1.3 },
    north_node: { id: "north_node", themeColor: "#fde047", rulerSymbol: "☊", imageUrl: `${CDN_BASE}/north_node.webp`, imageScale: 1.0 },
    south_node: { id: "south_node", themeColor: "#94a3b8", rulerSymbol: "☋", imageUrl: `${CDN_BASE}/south_node.webp`, imageScale: 1.2 },
    part_of_fortune: { id: "part_of_fortune", themeColor: "#fbbf24", rulerSymbol: "⊗" },
    rising: { id: "rising", themeColor: "#e2e8f0", rulerSymbol: "↑" },
};
