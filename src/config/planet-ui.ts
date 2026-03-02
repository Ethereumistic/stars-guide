export interface PlanetUIConfig {
    id: string;
    themeColor: string;
    // We can add icons or specific assets later
}

// Minimal implementation to establish the domain split
export const planetUIConfig: Record<string, PlanetUIConfig> = {
    sun: { id: "sun", themeColor: "var(--fire-primary)" },
    moon: { id: "moon", themeColor: "var(--water-primary)" },
    mercury: { id: "mercury", themeColor: "var(--air-primary)" },
    venus: { id: "venus", themeColor: "var(--earth-primary)" },
    mars: { id: "mars", themeColor: "var(--fire-primary)" },
    jupiter: { id: "jupiter", themeColor: "var(--fire-secondary)" },
    saturn: { id: "saturn", themeColor: "var(--earth-secondary)" },
    uranus: { id: "uranus", themeColor: "var(--air-secondary)" },
    neptune: { id: "neptune", themeColor: "var(--water-secondary)" },
    pluto: { id: "pluto", themeColor: "var(--water-primary)" }
};
