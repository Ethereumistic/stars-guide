// ─────────────────────────────────────────────────────────────────────────────
// aspects-ui.ts
// UI configuration for all aspects and aspect patterns.
// Follows the same architectural pattern as planet-ui.ts / house-ui.ts.
// Colors are CSS variable references defined in the project's design tokens.
// ─────────────────────────────────────────────────────────────────────────────

export type AspectColorFamily =
    | "gold"       // Neutral / variable (conjunction)
    | "blue"       // Soft / harmonious (trine, sextile, novile, biquintile)
    | "red"        // Hard / challenging (square, opposition, semisquare, sesquiquadrate)
    | "teal"       // Minor soft (quintile, semi-sextile)
    | "violet"     // Harmonic / mystical (septile, novile)
    | "amber"      // Minor neutral (quincunx)
    | "rose";      // Pattern-level

export interface AspectUIConfig {
    id: string;
    /** Primary display color — CSS variable referencing the design token */
    themeColor: string;
    /** Lighter, reduced-opacity glow variant for shadows and radial effects */
    glowColor: string;
    /** Tailwind-compatible border color class or CSS variable */
    borderColor: string;
    /** Color family used for icon/badge tinting logic */
    colorFamily: AspectColorFamily;
    /** SVG path string for the aspect glyph, renderable in a 24×24 viewBox */
    glyphPath: string;
    /** Short interpretive label shown in UI badges */
    badgeLabel: string;
    /** Hex fallback for contexts where CSS variables are unavailable (e.g. SVG exports) */
    hexFallback: string;
    /** Whether to render the aspect line as dashed (hard) or solid (soft/neutral) */
    lineStyle: "solid" | "dashed" | "dotted";
    /** Line weight category used for rendering in chart wheels */
    lineWeight: "heavy" | "medium" | "light";
    /** Standard chart color convention: "blue" = soft, "red" = hard, "green" = minor-soft */
    chartColor: "blue" | "red" | "green" | "grey";

    /**
     * Tailwind classes applied to the glyph wrapper div inside AspectGraphic
     * (large circular frame, SVG ~192–256px). Use mt-*, -mt-*, scale-*, etc.
     */
    glyphOffsetGraphic: string;

    /**
     * Tailwind classes applied to the glyph wrapper div inside AspectTitleBlock
     * (small 160×160px circular frame, SVG 64px). Calibrate independently —
     * the same px offset is proportionally ~4× larger here than in the graphic.
     */
    glyphOffsetTitle: string;
}

export interface AspectPatternUIConfig {
    id: string;
    themeColor: string;
    glowColor: string;
    colorFamily: AspectColorFamily;
    badgeLabel: string;
    hexFallback: string;
    /** Shape keyword used to select the pattern's SVG illustration */
    shapeVariant: "triangle" | "cross" | "rectangle" | "kite" | "finger" | "cluster" | "t-shape";
}

// ─── INDIVIDUAL ASPECT UI ────────────────────────────────────────────────────
// Glyph paths are 24×24 SVG paths approximating each traditional symbol.

export const aspectUIConfig: Record<string, AspectUIConfig> = {

    conjunction: {
        id: "conjunction",
        themeColor: "var(--aspect-conjunction)",
        glowColor: "var(--aspect-conjunction-glow)",
        borderColor: "var(--aspect-conjunction-border)",
        colorFamily: "gold",
        // ☌ — circle with a small vertical hook beneath
        glyphPath: "M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm0 2a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm0 9v4",
        badgeLabel: "Fusion",
        hexFallback: "#F5C842",
        lineStyle: "solid",
        lineWeight: "heavy",
        chartColor: "blue",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    sextile: {
        id: "sextile",
        themeColor: "var(--aspect-sextile)",
        glowColor: "var(--aspect-sextile-glow)",
        borderColor: "var(--aspect-sextile-border)",
        colorFamily: "blue",
        // ⚹ — six-pointed asterisk / star
        glyphPath: "M12 4v16M4.93 7l12.14 10M19.07 7 6.93 17M4 12h16M4.93 17 17.07 7M19.07 17 6.93 7",
        badgeLabel: "Opportunity",
        hexFallback: "#5B9BD5",
        lineStyle: "solid",
        lineWeight: "medium",
        chartColor: "blue",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    square: {
        id: "square",
        themeColor: "var(--aspect-square)",
        glowColor: "var(--aspect-square-glow)",
        borderColor: "var(--aspect-square-border)",
        colorFamily: "red",
        // □ — open square
        glyphPath: "M5 5h14v14H5z",
        badgeLabel: "Tension",
        hexFallback: "#D94F4F",
        lineStyle: "dashed",
        lineWeight: "heavy",
        chartColor: "red",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    trine: {
        id: "trine",
        themeColor: "var(--aspect-trine)",
        glowColor: "var(--aspect-trine-glow)",
        borderColor: "var(--aspect-trine-border)",
        colorFamily: "blue",
        // △ — equilateral triangle
        glyphPath: "M12 4 22 20H2L12 4z",
        badgeLabel: "Harmony",
        hexFallback: "#4A9E6B",
        lineStyle: "solid",
        lineWeight: "heavy",
        chartColor: "blue",
        glyphOffsetGraphic: "scale-150 -mt-20",
        glyphOffsetTitle: "scale-150 -mt-2",
    },

    opposition: {
        id: "opposition",
        themeColor: "var(--aspect-opposition)",
        glowColor: "var(--aspect-opposition-glow)",
        borderColor: "var(--aspect-opposition-border)",
        colorFamily: "red",
        // ☍ — circle with a bar below and opposing circle with bar above
        glyphPath: "M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0M12 17v2M12 5v2M12 19h4M12 5H8",
        badgeLabel: "Polarity",
        hexFallback: "#C94040",
        lineStyle: "dashed",
        lineWeight: "heavy",
        chartColor: "red",
        glyphOffsetGraphic: "scale-200",
        glyphOffsetTitle: "scale-170",
    },

    semisextile: {
        id: "semisextile",
        themeColor: "var(--aspect-semisextile)",
        glowColor: "var(--aspect-semisextile-glow)",
        borderColor: "var(--aspect-semisextile-border)",
        colorFamily: "teal",
        // Half-asterisk — top three rays of the sextile asterisk
        glyphPath: "M12 4v8M4.93 7l7.07 5M19.07 7l-7.07 5",
        badgeLabel: "Adjacent",
        hexFallback: "#4EBFBF",
        lineStyle: "dotted",
        lineWeight: "light",
        chartColor: "green",
        glyphOffsetGraphic: "scale-200 mt-42",
        glyphOffsetTitle: "scale-200 mt-8",
    },

    semisquare: {
        id: "semisquare",
        themeColor: "var(--aspect-semisquare)",
        glowColor: "var(--aspect-semisquare-glow)",
        borderColor: "var(--aspect-semisquare-border)",
        colorFamily: "red",
        // ∠ — right angle mark
        glyphPath: "M5 19V5h14",
        badgeLabel: "Irritation",
        hexFallback: "#D4735A",
        lineStyle: "dashed",
        lineWeight: "light",
        chartColor: "red",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    quintile: {
        id: "quintile",
        themeColor: "var(--aspect-quintile)",
        glowColor: "var(--aspect-quintile-glow)",
        borderColor: "var(--aspect-quintile-border)",
        colorFamily: "teal",
        // Q — pentagram star approximation
        glyphPath: "M12 3l2.47 7.6H22l-6.24 4.54 2.39 7.36L12 17.77 5.85 22.5l2.39-7.36L2 10.6h7.53L12 3z",
        badgeLabel: "Craft",
        hexFallback: "#5ABFB0",
        lineStyle: "dotted",
        lineWeight: "light",
        chartColor: "green",
        glyphOffsetGraphic: "scale-150 -mt-12",
        glyphOffsetTitle: "scale-150 -mt-4",
    },

    sesquiquadrate: {
        id: "sesquiquadrate",
        themeColor: "var(--aspect-sesquiquadrate)",
        glowColor: "var(--aspect-sesquiquadrate-glow)",
        borderColor: "var(--aspect-sesquiquadrate-border)",
        colorFamily: "red",
        // Square-and-a-half: square with an extra right-angle flag
        glyphPath: "M5 5h10v10H5zM15 15h4v-4",
        badgeLabel: "Agitation",
        hexFallback: "#BF6060",
        lineStyle: "dashed",
        lineWeight: "light",
        chartColor: "red",
        glyphOffsetGraphic: "scale-150 mt-12 ml-15",
        glyphOffsetTitle: "scale-150 mt-4 ml-3",
    },

    quincunx: {
        id: "quincunx",
        themeColor: "var(--aspect-quincunx)",
        glowColor: "var(--aspect-quincunx-glow)",
        borderColor: "var(--aspect-quincunx-border)",
        colorFamily: "amber",
        // ⚻ — approximation: two lines meeting at a diagonal with a circle cap
        glyphPath: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 6v12M6 21h12",
        badgeLabel: "Redirect",
        hexFallback: "#D4A84B",
        lineStyle: "dotted",
        lineWeight: "medium",
        chartColor: "red",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    biquintile: {
        id: "biquintile",
        themeColor: "var(--aspect-biquintile)",
        glowColor: "var(--aspect-biquintile-glow)",
        borderColor: "var(--aspect-biquintile-border)",
        colorFamily: "violet",
        // Double-Q / pentagram with second arc
        glyphPath: "M12 2l2.09 6.43H21l-5.47 3.97 2.09 6.43L12 14.87l-5.62 3.96 2.09-6.43L3 8.43h6.91L12 2zM8 20h8",
        badgeLabel: "Mastery",
        hexFallback: "#8B62D4",
        lineStyle: "dotted",
        lineWeight: "light",
        chartColor: "green",
        glyphOffsetGraphic: "scale-150",
        glyphOffsetTitle: "scale-150",
    },

    septile: {
        id: "septile",
        themeColor: "var(--aspect-septile)",
        glowColor: "var(--aspect-septile-glow)",
        borderColor: "var(--aspect-septile-border)",
        colorFamily: "violet",
        // Heptagram arc indicator — seven-pointed star approximation
        glyphPath: "M12 3l1.64 5.06L19 6.27l-3.27 4.23 1.64 5.06L12 13.5l-5.37 2.06 1.64-5.06L5 6.27l5.36 1.79L12 3z",
        badgeLabel: "Fate",
        hexFallback: "#7B52C4",
        lineStyle: "dotted",
        lineWeight: "light",
        chartColor: "grey",
        glyphOffsetGraphic: "scale-150 mt-12",
        glyphOffsetTitle: "scale-150 mt-4",
    },

    novile: {
        id: "novile",
        themeColor: "var(--aspect-novile)",
        glowColor: "var(--aspect-novile-glow)",
        borderColor: "var(--aspect-novile-border)",
        colorFamily: "violet",
        // Partial triangle — hint of the trinovile (trine) relationship
        glyphPath: "M12 5l8 14H4L12 5zm0 6v5m0 0h-2m2 0h2",
        badgeLabel: "Grace",
        hexFallback: "#9B72CF",
        lineStyle: "dotted",
        lineWeight: "light",
        chartColor: "grey",
        glyphOffsetGraphic: "scale-150 -mt-12",
        glyphOffsetTitle: "scale-150 -mt-4",
    },
};

// ─── ASPECT PATTERN UI ───────────────────────────────────────────────────────

export const aspectPatternUIConfig: Record<string, AspectPatternUIConfig> = {

    "grand-trine": {
        id: "grand-trine",
        themeColor: "var(--aspect-trine)",
        glowColor: "var(--aspect-trine-glow)",
        colorFamily: "blue",
        badgeLabel: "Grand Trine",
        hexFallback: "#4A9E6B",
        shapeVariant: "triangle",
    },

    "t-square": {
        id: "t-square",
        themeColor: "var(--aspect-square)",
        glowColor: "var(--aspect-square-glow)",
        colorFamily: "red",
        badgeLabel: "T-Square",
        hexFallback: "#D94F4F",
        shapeVariant: "t-shape",
    },

    "grand-cross": {
        id: "grand-cross",
        themeColor: "var(--aspect-opposition)",
        glowColor: "var(--aspect-opposition-glow)",
        colorFamily: "red",
        badgeLabel: "Grand Cross",
        hexFallback: "#C94040",
        shapeVariant: "cross",
    },

    "yod": {
        id: "yod",
        themeColor: "var(--aspect-quincunx)",
        glowColor: "var(--aspect-quincunx-glow)",
        colorFamily: "amber",
        badgeLabel: "Yod",
        hexFallback: "#D4A84B",
        shapeVariant: "finger",
    },

    "kite": {
        id: "kite",
        themeColor: "var(--aspect-sextile)",
        glowColor: "var(--aspect-sextile-glow)",
        colorFamily: "blue",
        badgeLabel: "Kite",
        hexFallback: "#5B9BD5",
        shapeVariant: "kite",
    },

    "mystic-rectangle": {
        id: "mystic-rectangle",
        themeColor: "var(--aspect-trine)",
        glowColor: "var(--aspect-trine-glow)",
        colorFamily: "teal",
        badgeLabel: "Mystic Rectangle",
        hexFallback: "#4EBFBF",
        shapeVariant: "rectangle",
    },

    "stellium": {
        id: "stellium",
        themeColor: "var(--aspect-conjunction)",
        glowColor: "var(--aspect-conjunction-glow)",
        colorFamily: "gold",
        badgeLabel: "Stellium",
        hexFallback: "#F5C842",
        shapeVariant: "cluster",
    },
};
