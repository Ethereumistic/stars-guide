"use client";

/**
 * Moon phase indicator — displays SVG-based moon phase glyph.
 */

const MOON_PHASES = [
    { key: "New Moon", emoji: "🌑", illumination: 0 },
    { key: "Waxing Crescent", emoji: "🌒", illumination: 0.15 },
    { key: "First Quarter", emoji: "🌓", illumination: 0.5 },
    { key: "Waxing Gibbous", emoji: "🌔", illumination: 0.85 },
    { key: "Full Moon", emoji: "🌕", illumination: 1 },
    { key: "Waning Gibbous", emoji: "🌖", illumination: 0.85 },
    { key: "Last Quarter", emoji: "🌗", illumination: 0.5 },
    { key: "Waning Crescent", emoji: "🌘", illumination: 0.15 },
] as const;

interface MoonPhaseIndicatorProps {
    phaseName?: string;
    size?: number;
    className?: string;
}

export function MoonPhaseIndicator({
    phaseName,
    size = 16,
    className,
}: MoonPhaseIndicatorProps) {
    if (!phaseName) return null;

    // Find the matching phase
    const phase = MOON_PHASES.find((p) =>
        phaseName.toLowerCase().includes(p.key.toLowerCase()),
    );

    if (!phase) {
        // Fallback: return the emoji
        return <span className={className}>{phaseName}</span>;
    }

    return (
        <span
            className={className}
            title={phaseName}
            style={{ fontSize: `${size}px`, lineHeight: 1 }}
        >
            {phase.emoji}
        </span>
    );
}