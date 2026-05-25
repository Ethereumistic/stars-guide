"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * ArtNouveauBorder
 *
 * A zero-lag, CSS-only Art Nouveau SVG border overlay.
 * No framer-motion. No JS animation loops. Pure SVG + CSS @keyframes.
 *
 * Usage:
 *   <ArtNouveauBorder variant="primary">
 *     <div className="rounded-3xl overflow-hidden …">…</div>
 *   </ArtNouveauBorder>
 *
 * Props:
 *   variant   — "primary" | "white" | "galactic". Default "primary".
 *   zIndex    — z-index of the SVG overlay. Default 50.
 *   className — extra classes on the outer wrapper div.
 *   children  — the card / panel to be bordered.
 */

export type ArtNouveauVariant = "primary" | "white" | "galactic";

export interface ArtNouveauBorderProps {
    variant?: ArtNouveauVariant;
    /** Override the variant colour with a custom CSS colour. */
    color?: string;
    /** When true, the border starts invisible and appears on group-hover.
     *  The parent must carry the Tailwind `group` class. */
    animateOnHover?: boolean;
    zIndex?: number;
    className?: string;
    children: React.ReactNode;
}

const VARIANT_COLORS: Record<ArtNouveauVariant, string> = {
    primary: "var(--primary)",
    white: "#ffffff",
    galactic: "var(--galactic)",
};

export function ArtNouveauBorder({
    variant = "primary",
    color: colorProp,
    animateOnHover = false,
    zIndex = 50,
    className,
    children,
}: ArtNouveauBorderProps) {
    // Unique ID per instance — prevents <defs> collisions when multiple borders coexist.
    const uid = useId().replace(/:/g, "");
    const shimId = `s-${uid}`;
    const glowId = `g-${uid}`;
    const color = colorProp ?? VARIANT_COLORS[variant];

    // When animateOnHover the overlay starts hidden and fades in on group-hover.
    // Otherwise it uses the original mount animation.
    const overlayClassName = animateOnHover
        ? "absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        : "absolute inset-0 pointer-events-none an-border-fade";

    const shimmerClassName = animateOnHover
        ? "an-shimmer-hover"
        : "an-shimmer-sweep";

    return (
        <div className={cn("relative", className)}>
            {/* CSS fade-in handled purely with animation — no JS */}
            <div
                className={overlayClassName}
                style={{ zIndex }}
            >
                <svg
                    aria-hidden
                    viewBox="0 0 420 780"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                    style={{ color }}
                >
                    <defs>
                        {/*
                         * Shimmer: a single diagonal gradient whose bright stop
                         * travels from left→right using CSS @keyframes via a
                         * <linearGradient> whose stops are referenced inside
                         * <animate> — but we avoid JS entirely by using CSS
                         * animation on an overlaid rect instead (see ShimmerOverlay).
                         */}
                        <linearGradient id={shimId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                            <stop offset="45%" stopColor="currentColor" stopOpacity="0.55" className="an-stop-mid" />
                            <stop offset="55%" stopColor="currentColor" stopOpacity="0.95" className="an-stop-peak" />
                            <stop offset="65%" stopColor="currentColor" stopOpacity="0.55" className="an-stop-mid" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.25" />
                        </linearGradient>

                        {/* Soft glow for ornament groups */}
                        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
                            <feGaussianBlur stdDeviation="1.2" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>

                        {/* Clip the shimmer sweep to the border paths */}
                        <clipPath id={`c-${uid}`}>
                            <rect x="0" y="0" width="420" height="780" />
                        </clipPath>
                    </defs>

                    {/* ── Outer frame ── */}
                    <rect
                        x="1.5" y="1.5" width="417" height="777"
                        rx="20" ry="20"
                        fill="none"
                        stroke={`url(#${shimId})`}
                        strokeWidth="1.4"
                    />

                    {/* Inner inset dashed rule */}
                    <rect
                        x="6" y="6" width="408" height="768"
                        rx="16" ry="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.45"
                        strokeOpacity="0.2"
                        strokeDasharray="3 7"
                    />

                    {/* ── Corners (TL, TR, BL, BR) ── */}
                    <g filter={`url(#${glowId})`}>
                        <Corner />
                        <g transform="translate(420,0) scale(-1,1)"><Corner /></g>
                        <g transform="translate(0,780) scale(1,-1)"><Corner /></g>
                        <g transform="translate(420,780) scale(-1,-1)"><Corner /></g>
                    </g>

                    {/* ── Top medallion ── */}
                    <g transform="translate(210,0)" filter={`url(#${glowId})`}>
                        <Medallion />
                    </g>

                    {/* ── Bottom medallion ── */}
                    <g transform="translate(210,780) scale(1,-1)" filter={`url(#${glowId})`}>
                        <Medallion />
                    </g>

                    {/* ── Left mid-vine ── */}
                    <g opacity="0.5"><Vine /></g>

                    {/* ── Right mid-vine (mirror) ── */}
                    <g opacity="0.5" transform="translate(420,0) scale(-1,1)"><Vine /></g>

                    {/* ── Shimmer sweep overlay (CSS animated) ── */}
                    <rect
                        x="0" y="0" width="420" height="780"
                        fill={`url(#${shimId})`}
                        fillOpacity="0"
                        className={shimmerClassName}
                        clipPath={`url(#c-${uid})`}
                    />
                </svg>
            </div>

            {children}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Ornate corner piece (top-left). Mirrored into the other three via transforms. */
function Corner() {
    return (
        <>
            {/* L-bracket arm */}
            <path
                d="M 24 2 L 2 2 L 2 24"
                fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeOpacity="0.9"
            />

            {/* Teardrop fill */}
            <path
                d="M 2 2 C 10 16, 24 22, 36 13 C 24 6, 12 2, 2 2 Z"
                fill="currentColor" fillOpacity="0.1"
                stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.55"
            />

            {/* Mucha swirl */}
            <path
                d="M 2 2 C 12 9, 20 7, 24 14 C 28 21, 24 30, 15 32 C 8 34, 4 28, 6 22 C 8 17, 15 17, 17 22"
                fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.65"
                strokeLinecap="round"
            />

            {/* Second inner swirl — more depth */}
            <path
                d="M 6 8 C 14 12, 18 10, 20 16"
                fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4"
                strokeLinecap="round"
            />

            {/* Diamond jewel at corner apex */}
            <path d="M 2 2 L 5.5 5.5 L 2 9 L -1.5 5.5 Z"
                fill="currentColor" fillOpacity="0.65"
            />
            {/* Jewel inner highlight */}
            <circle cx="2" cy="5.5" r="0.9" fill="currentColor" fillOpacity="0.9" />

            {/* Horizontal tendril along top edge */}
            <path
                d="M 36 1.5 C 50 0.5, 64 3, 78 1.5 C 90 0.2, 104 3, 116 1.8"
                fill="none" stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.45"
                strokeLinecap="round"
            />
            {/* Top tendril leaves */}
            <ellipse cx="64" cy="1.5" rx="4.5" ry="2" fill="currentColor" fillOpacity="0.22"
                transform="rotate(-4,64,1.5)" />
            <ellipse cx="96" cy="1.8" rx="3" ry="1.5" fill="currentColor" fillOpacity="0.18"
                transform="rotate(4,96,1.8)" />

            {/* Vertical tendril along left edge */}
            <path
                d="M 1.5 36 C 0.5 50, 3 64, 1.5 78 C 0.2 90, 3 104, 1.8 116"
                fill="none" stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.45"
                strokeLinecap="round"
            />
            {/* Left tendril leaves */}
            <ellipse cx="1.5" cy="64" rx="2" ry="4.5" fill="currentColor" fillOpacity="0.22"
                transform="rotate(-4,1.5,64)" />
            <ellipse cx="1.8" cy="96" rx="1.5" ry="3" fill="currentColor" fillOpacity="0.18"
                transform="rotate(4,1.8,96)" />

            {/* Small accent dot on swirl tip */}
            <circle cx="17" cy="22" r="1.2" fill="currentColor" fillOpacity="0.5" />
        </>
    );
}

/** Top/bottom centre lotus medallion. */
function Medallion() {
    return (
        <>
            {/* Left wing tendril */}
            <path
                d="M -90 1.5 C -70 -0.5, -58 4.5, -42 1.5 C -28 -1, -16 4.5, -5 2"
                fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.55"
                strokeLinecap="round"
            />
            <ellipse cx="-54" cy="1.5" rx="4" ry="2" fill="currentColor" fillOpacity="0.28"
                transform="rotate(8,-54,1.5)" />
            <ellipse cx="-28" cy="1.5" rx="2.8" ry="1.4" fill="currentColor" fillOpacity="0.2"
                transform="rotate(-5,-28,1.5)" />

            {/* Right wing tendril */}
            <path
                d="M 90 1.5 C 70 -0.5, 58 4.5, 42 1.5 C 28 -1, 16 4.5, 5 2"
                fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.55"
                strokeLinecap="round"
            />
            <ellipse cx="54" cy="1.5" rx="4" ry="2" fill="currentColor" fillOpacity="0.28"
                transform="rotate(-8,54,1.5)" />
            <ellipse cx="28" cy="1.5" rx="2.8" ry="1.4" fill="currentColor" fillOpacity="0.2"
                transform="rotate(5,28,1.5)" />

            {/* Central petal cluster */}
            {/* Outer petals */}
            <ellipse cx="-6" cy="-1" rx="2.8" ry="6.5"
                fill="currentColor" fillOpacity="0.12"
                stroke="currentColor" strokeWidth="0.55" strokeOpacity="0.6"
                transform="rotate(-30,-6,-1)"
            />
            <ellipse cx="6" cy="-1" rx="2.8" ry="6.5"
                fill="currentColor" fillOpacity="0.12"
                stroke="currentColor" strokeWidth="0.55" strokeOpacity="0.6"
                transform="rotate(30,6,-1)"
            />
            {/* Centre petal */}
            <ellipse cx="0" cy="-2.5" rx="2.8" ry="7"
                fill="currentColor" fillOpacity="0.16"
                stroke="currentColor" strokeWidth="0.65" strokeOpacity="0.75"
            />
            {/* Calyx base */}
            <path
                d="M -5 4 C -2 7, 2 7, 5 4 C 3 2, -3 2, -5 4 Z"
                fill="currentColor" fillOpacity="0.2"
                stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5"
            />
            {/* Stamen */}
            <circle cx="0" cy="1.5" r="2.2" fill="currentColor" fillOpacity="0.5" />
            <circle cx="0" cy="1.5" r="0.9" fill="currentColor" fillOpacity="0.95" />
        </>
    );
}

/** Botanical mid-vine for left/right edges. */
function Vine() {
    return (
        <>
            {/* Main stem */}
            <path
                d="M 1.5 310 C -0.5 326, 3 342, 1.5 358 C 0 374, 3.5 388, 1.5 404"
                fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round"
                strokeOpacity="0.8"
            />
            {/* Central leaf */}
            <ellipse cx="1.5" cy="357" rx="2.4" ry="5.5"
                fill="currentColor" fillOpacity="0.22"
                stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5"
            />
            {/* Side buds */}
            <path d="M 1.5 333 C 7 329, 10 326, 8 322" fill="none"
                stroke="currentColor" strokeWidth="0.55" strokeOpacity="0.6" strokeLinecap="round" />
            <circle cx="8" cy="321" r="1.3" fill="currentColor" fillOpacity="0.35" />

            <path d="M 1.5 381 C 7 385, 10 388, 8 392" fill="none"
                stroke="currentColor" strokeWidth="0.55" strokeOpacity="0.6" strokeLinecap="round" />
            <circle cx="8" cy="393" r="1.3" fill="currentColor" fillOpacity="0.35" />

            {/* Small accent leaf top */}
            <ellipse cx="1.5" cy="328" rx="1.6" ry="3.2"
                fill="currentColor" fillOpacity="0.15"
                transform="rotate(12,1.5,328)"
            />
            {/* Small accent leaf bottom */}
            <ellipse cx="1.5" cy="386" rx="1.6" ry="3.2"
                fill="currentColor" fillOpacity="0.15"
                transform="rotate(-12,1.5,386)"
            />
        </>
    );
}