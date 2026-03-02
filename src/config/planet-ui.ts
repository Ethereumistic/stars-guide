export interface PlanetUIConfig {
    id: string;
    themeColor: string;
    rulerSymbol: string;
    // We can add icons or specific assets later
}

// Minimal implementation to establish the domain split
export const planetUIConfig: Record<string, PlanetUIConfig> = {
    sun: { id: "sun", themeColor: "var(--fire-primary)", rulerSymbol: "☉" },
    moon: { id: "moon", themeColor: "var(--water-primary)", rulerSymbol: "☾" },
    mercury: { id: "mercury", themeColor: "var(--air-primary)", rulerSymbol: "☿" },
    venus: { id: "venus", themeColor: "var(--earth-primary)", rulerSymbol: "♀" },
    mars: { id: "mars", themeColor: "var(--fire-primary)", rulerSymbol: "♂" },
    jupiter: { id: "jupiter", themeColor: "var(--fire-secondary)", rulerSymbol: "♃" },
    saturn: { id: "saturn", themeColor: "var(--earth-secondary)", rulerSymbol: "♄" },
    uranus: { id: "uranus", themeColor: "var(--air-secondary)", rulerSymbol: "⛢" },
    neptune: { id: "neptune", themeColor: "var(--water-secondary)", rulerSymbol: "♆" },
    pluto: { id: "pluto", themeColor: "var(--water-primary)", rulerSymbol: "♇" }
};
