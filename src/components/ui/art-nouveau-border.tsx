"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * ArtNouveauBorder
 *
 * A reusable wrapper that overlays an ornate Art Nouveau SVG border
 * on top of its children. The border sits *outside* the children's
 * overflow context so nothing gets clipped.
 *
 * Usage:
 *   <ArtNouveauBorder>
 *     <div className="rounded-3xl overflow-hidden …">…</div>
 *   </ArtNouveauBorder>
 *
 * Props:
 *   color           — any CSS color or CSS variable string.
 *                     Defaults to "var(--primary)".
 *   shimmerDuration — seconds for the shimmer sweep cycle. Default 4.
 *   animate         — set false to skip the fade-in motion. Default true.
 *   zIndex          — z-index of the SVG overlay. Default 50.
 *   className       — extra classes on the outer wrapper div.
 *   children        — the card / panel to be bordered.
 */
export interface ArtNouveauBorderProps {
    color?: string;
    shimmerDuration?: number;
    animate?: boolean;
    zIndex?: number;
    className?: string;
    children: React.ReactNode;
}

export function ArtNouveauBorder({
    color = "var(--primary)",
    shimmerDuration = 4,
    animate = true,
    zIndex = 50,
    className,
    children,
}: ArtNouveauBorderProps) {
    // Unique IDs per instance so multiple borders on the same page
    // don't share <defs> and produce rendering artifacts.
    const uid = useId().replace(/:/g, "");
    const shimmerId = `an-shimmer-${uid}`;
    const glowId    = `an-glow-${uid}`;
    const vineGlowId = `an-vine-glow-${uid}`;
    const dur = `${shimmerDuration}s`;

    const svg = (
        <svg
            aria-hidden
            viewBox="0 0 420 780"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ color, zIndex }}
        >
            <defs>
                {/* Diagonal shimmer that slowly sweeps across the border */}
                <linearGradient id={shimmerId} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0%"   stopColor="currentColor" stopOpacity="0.35" />
                    <stop offset="40%"  stopColor="currentColor" stopOpacity="0.75">
                        <animate attributeName="offset" values="40%;55%;40%" dur={dur} repeatCount="indefinite" />
                    </stop>
                    <stop offset="55%"  stopColor="currentColor" stopOpacity="1">
                        <animate attributeName="offset" values="55%;70%;55%" dur={dur} repeatCount="indefinite" />
                    </stop>
                    <stop offset="70%"  stopColor="currentColor" stopOpacity="0.75">
                        <animate attributeName="offset" values="70%;85%;70%" dur={dur} repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
                </linearGradient>

                {/* Glow for ornaments — soft double-exposure blur */}
                <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Softer glow for botanical vine lines */}
                <filter id={vineGlowId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* ── Outer rounded-rect frame ── */}
            <rect
                x="1" y="1" width="418" height="778"
                rx="22" ry="22"
                fill="none"
                stroke={`url(#${shimmerId})`}
                strokeWidth="1.2"
            />
            {/* Inner dashed inset line */}
            <rect
                x="5" y="5" width="410" height="770"
                rx="18" ry="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeOpacity="0.18"
                strokeDasharray="4 6"
            />

            {/* ── Corner ornament template (top-left) ── */}
            <CornerOrnament glowId={glowId} shimmerId={shimmerId} />

            {/* Top-right — horizontal mirror */}
            <g transform="translate(420,0) scale(-1,1)">
                <CornerOrnament glowId={glowId} shimmerId={shimmerId} />
            </g>

            {/* Bottom-left — vertical mirror */}
            <g transform="translate(0,780) scale(1,-1)">
                <CornerOrnament glowId={glowId} shimmerId={shimmerId} />
            </g>

            {/* Bottom-right — double mirror */}
            <g transform="translate(420,780) scale(-1,-1)">
                <CornerOrnament glowId={glowId} shimmerId={shimmerId} />
            </g>

            {/* ── Top-centre lotus medallion ── */}
            <g filter={`url(#${glowId})`} transform="translate(210,0)">
                <LotusMedallion shimmerId={shimmerId} />
            </g>

            {/* ── Bottom-centre medallion (flip vertically) ── */}
            <g filter={`url(#${glowId})`} transform="translate(210,780) scale(1,-1)">
                <LotusMedallion shimmerId={shimmerId} />
            </g>

            {/* ── Left-edge mid vine ── */}
            <g filter={`url(#${vineGlowId})`} opacity="0.55">
                <SideVine />
            </g>

            {/* ── Right-edge mid vine (mirror) ── */}
            <g filter={`url(#${vineGlowId})`} opacity="0.55" transform="translate(420,0) scale(-1,1)">
                <SideVine mirrored />
            </g>
        </svg>
    );

    return (
        <div className={cn("relative", className)}>
            {animate ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.4, delay: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex }}
                >
                    {svg}
                </motion.div>
            ) : (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex }}
                >
                    {svg}
                </div>
            )}
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (internal — not exported)
// ─────────────────────────────────────────────────────────────────────────────

/** Ornate corner piece used for all four corners via SVG transforms. */
function CornerOrnament({ glowId, shimmerId }: { glowId: string; shimmerId: string }) {
    return (
        <g filter={`url(#${glowId})`} opacity="0.9">
            {/* L-bracket */}
            <path
                d="M 22 2 L 2 2 L 2 22"
                fill="none"
                stroke={`url(#${shimmerId})`}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            {/* Teardrop petal fill */}
            <path
                d="M 2 2 C 8 14, 20 20, 32 12 C 22 6, 12 2, 2 2 Z"
                fill="currentColor" fillOpacity="0.12"
                stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.6"
            />
            {/* Mucha swirl */}
            <path
                d="M 2 2 C 10 8, 18 6, 22 12 C 26 18, 22 26, 14 28 C 8 30, 4 26, 6 20 C 8 16, 14 16, 16 20"
                fill="none"
                stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.7" strokeLinecap="round"
            />
            {/* Diamond jewel */}
            <path d="M 2 2 L 5 5 L 2 8 L -1 5 Z" fill="currentColor" fillOpacity="0.6" />
            {/* Horizontal tendril + leaf */}
            <path
                d="M 32 1.5 C 42 1, 52 3, 60 1.5 C 70 0, 80 3, 90 1.5"
                fill="none"
                stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round"
            />
            <ellipse cx="60" cy="1.5" rx="4" ry="2" fill="currentColor" fillOpacity="0.25" transform="rotate(-5,60,1.5)" />
            {/* Vertical tendril + leaf */}
            <path
                d="M 1.5 32 C 1 42, 3 52, 1.5 60 C 0 70, 3 80, 1.5 90"
                fill="none"
                stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" strokeLinecap="round"
            />
            <ellipse cx="1.5" cy="60" rx="2" ry="4" fill="currentColor" fillOpacity="0.25" transform="rotate(-5,1.5,60)" />
        </g>
    );
}

/** Central lotus blossom for top/bottom edge medallions. */
function LotusMedallion({ shimmerId }: { shimmerId: string }) {
    void shimmerId; // reserved for future stroke upgrade
    return (
        <>
            {/* Wing tendrils */}
            <path
                d="M -80 1.5 C -60 0, -50 4, -36 1.5 C -24 -1, -14 4, -4 2"
                fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round"
            />
            <ellipse cx="-40" cy="1.5" rx="3.5" ry="1.8" fill="currentColor" fillOpacity="0.3" transform="rotate(8,-40,1.5)" />
            <path
                d="M 80 1.5 C 60 0, 50 4, 36 1.5 C 24 -1, 14 4, 4 2"
                fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round"
            />
            <ellipse cx="40" cy="1.5" rx="3.5" ry="1.8" fill="currentColor" fillOpacity="0.3" transform="rotate(-8,40,1.5)" />
            {/* Petals */}
            <ellipse cx="0" cy="-2" rx="3" ry="6"
                fill="currentColor" fillOpacity="0.15"
                stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.7"
            />
            <ellipse cx="-3.5" cy="0" rx="3" ry="5"
                fill="currentColor" fillOpacity="0.1"
                stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.6"
                transform="rotate(-35,-3.5,0)"
            />
            <ellipse cx="3.5" cy="0" rx="3" ry="5"
                fill="currentColor" fillOpacity="0.1"
                stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.6"
                transform="rotate(35,3.5,0)"
            />
            {/* Stamen dot */}
            <circle cx="0" cy="1" r="2"   fill="currentColor" fillOpacity="0.55" />
            <circle cx="0" cy="1" r="0.8" fill="currentColor" fillOpacity="0.9"  />
        </>
    );
}

/** Botanical vine segment for the left/right mid-edge accents. */
function SideVine({ mirrored }: { mirrored?: boolean }) {
    const sign = mirrored ? 1 : -1;
    return (
        <>
            <path
                d="M 1.5 320 C 0 330, 2.5 342, 1.5 355 C 0.5 368, 3 378, 1.5 390"
                fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"
            />
            <ellipse
                cx="1.5" cy="355" rx="2.2" ry="4.5"
                fill="currentColor" fillOpacity="0.22"
                transform={`rotate(${sign * 3},1.5,355)`}
            />
            <path d="M 1.5 335 L 5 332" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.7" strokeLinecap="round" />
            <path d="M 1.5 370 L 5 373" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.7" strokeLinecap="round" />
        </>
    );
}
