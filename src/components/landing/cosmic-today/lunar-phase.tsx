"use client";

import { motion } from "motion/react";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { elementUIConfig } from "@/config/elements-ui";
import { planetUIConfig } from "@/config/planet-ui";
import type { compositionalSigns } from "@/astrology/signs";
import type { PlanetTelemetry } from "@/lib/planets/telemetry";

/* ───────────── Moon Phase Shadow — SVG Mask Approach ───────────── */
function MoonPhaseShadow({
    illumination,
    phaseAngle,
}: {
    illumination: number;
    phaseAngle: number;
}) {
    const k = illumination / 100;
    const isWaxing = phaseAngle <= 180;
    const isCrescent = k < 0.5;

    // Terminator ellipse: horizontal semi-axis = R * |cos(φ)|, vertical = R
    const terminatorRx = Math.abs(Math.cos(phaseAngle * Math.PI / 180)) * 100;

    // Full moon — no shadow
    if (k >= 0.995) return null;

    // New moon — full disc shadow
    if (k <= 0.005) {
        return (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[rgba(3,3,12,0.93)]" />
                <div className="absolute inset-0" style={{
                    background: `radial-gradient(ellipse 40% 80% at ${isWaxing ? 40 : 60}% 50%, rgba(100,120,180,0.04) 0%, transparent 100%)`,
                }} />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
            >
                <defs>
                    {/* Soft penumbra at the terminator edge */}
                    <filter id="moon-penumbra">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
                    </filter>

                    {/* Phase mask: white = shadow visible, black = hidden */}
                    <mask id="moon-phase-mask">
                        <g filter="url(#moon-penumbra)">
                            {isCrescent ? (
                                /* Crescent: shadow = dark half ∪ terminator ellipse */
                                <>
                                    <rect width="200" height="200" fill="black" />
                                    <rect
                                        x={isWaxing ? 0 : 100}
                                        width="100"
                                        height="200"
                                        fill="white"
                                    />
                                    <ellipse
                                        cx="100" cy="100"
                                        rx={terminatorRx} ry="100"
                                        fill="white"
                                    />
                                </>
                            ) : (
                                /* Gibbous: shadow = full disc − lit half − terminator ellipse */
                                <>
                                    <rect width="200" height="200" fill="white" />
                                    <rect
                                        x={isWaxing ? 100 : 0}
                                        width="100"
                                        height="200"
                                        fill="black"
                                    />
                                    <ellipse
                                        cx="100" cy="100"
                                        rx={terminatorRx} ry="100"
                                        fill="black"
                                    />
                                </>
                            )}
                        </g>
                    </mask>
                </defs>

                {/* Shadow disc — clipped by the phase mask */}
                <circle
                    cx="100" cy="100" r="100"
                    fill="rgba(3,3,12,0.93)"
                    mask="url(#moon-phase-mask)"
                />
            </svg>

            {/* Earthshine — faint blue glow on the dark side */}
            <div className="absolute inset-0" style={{
                background: isWaxing
                    ? `radial-gradient(ellipse 35% 80% at 30% 50%, rgba(100,120,180,0.04) 0%, transparent 100%)`
                    : `radial-gradient(ellipse 35% 80% at 70% 50%, rgba(100,120,180,0.04) 0%, transparent 100%)`,
            }} />
        </div>
    );
}

interface LunarPhaseProps {
    signData: typeof compositionalSigns[number];
    signId: string;
    telemetry: PlanetTelemetry;
    moonPhase: { name: string; illumination: number };
    phaseAngle: number;
    /** Override which planet image to display (for side-by-side size debugging). Skips moon shadow. */
    debugPlanetId?: string;
    /** Override the moon phase for visual testing. Pass a phaseAngle (0–360°):
     *   0°   = New Moon     (0% illumination)
     *   45°  = Waxing Crescent (~15%)
     *   90°  = First Quarter (50%)
     *   135° = Waxing Gibbous (~85%)
     *   180° = Full Moon    (100%)
     *   225° = Waning Gibbous (~85%)
     *   270° = Last Quarter  (50%)
     *   315° = Waning Crescent (~15%)
     */
    debugPhaseAngle?: number;
}

function illuminationFromPhase(phaseAngle: number): number {
    return Math.round((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100);
}

export function LunarPhase({ signData, signId, telemetry, moonPhase, phaseAngle, debugPlanetId, debugPhaseAngle }: LunarPhaseProps) {
    const ui = zodiacUIConfig[signId];
    const elementUi = elementUIConfig[signData.element];
    const styles = elementUi.styles;
    const MIcon = ui.icon;

    const planetId = debugPlanetId ?? "moon";
    const planetUi = planetUIConfig[planetId];
    const imageScale = planetUi?.imageScale ?? 1;
    const isMoon = planetId === "moon";

    const effectivePhaseAngle = debugPhaseAngle ?? phaseAngle;
    const effectiveIllumination = debugPhaseAngle !== undefined
        ? illuminationFromPhase(debugPhaseAngle)
        : moonPhase.illumination;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="h-full"
        >
            <div className="group h-full flex flex-col">
                {/* ── TITLE ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <span
                        className="text-3xl md:text-[2.4rem] font-serif leading-none text-white/90"
                    >
                        {planetUi?.rulerSymbol}
                    </span>
                    <h3 className="text-3xl md:text-[2.4rem] font-serif tracking-tight leading-[0.85] text-white/90">
                        Lunar Phase
                    </h3>
                </div>

                {/* ── MOON — floating freely ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="relative flex items-center justify-center pb-8"
                >
                    <div className="relative w-full max-w-[360px] md:max-w-[420px] aspect-square flex items-center justify-center">
                        {isMoon ? (
                            <div
                                className="relative w-full h-full rounded-full overflow-hidden"

                            >
                                <img
                                    src={planetUi!.imageUrl}
                                    alt="Moon"
                                    className="w-full h-full object-cover"
                                    style={{
                                        filter: "brightness(1.15) contrast(1.08)",
                                        transform: `scale(${imageScale})`,
                                    }}
                                />
                                <MoonPhaseShadow
                                    illumination={effectiveIllumination}
                                    phaseAngle={effectivePhaseAngle}
                                />
                            </div>
                        ) : (
                            <img
                                src={planetUi?.imageUrl}
                                alt={planetId}
                                className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                style={{ transform: `scale(${imageScale})` }}
                            />
                        )}
                    </div>
                </motion.div>

                {/* ── INFO CARD — below the moon ── */}
                <div
                    className="relative p-5 md:p-6 border border-white/[0.06] bg-black/40 overflow-hidden"
                    style={{ borderRadius: "4px" }}
                >
                    <div className="relative z-10 flex items-center gap-5">
                        {/* Moon sign transit badge */}
                        <div className="shrink-0 relative flex items-center justify-center">
                            <img
                                src={elementUi.frameUrl}
                                alt=""
                                className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] object-cover opacity-90"
                            />
                            <MIcon
                                className="absolute w-9 h-9 md:w-10 md:h-10 drop-shadow-lg"
                                style={{ color: styles.primary }}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: styles.primary, opacity: 0.7 }}>
                                    Transiting {signData.name}
                                </span>
                            </div>

                            <h3 className="text-3xl md:text-[2.4rem] font-serif tracking-tight leading-[0.85] mb-2 text-white/90">
                                {moonPhase.name}
                            </h3>

                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl md:text-2xl font-serif text-white/65 tabular-nums">
                                        {effectiveIllumination}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">% illum.</span>
                                </div>

                                <span className="text-white/8">|</span>

                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                                        style={{
                                            border: `1px solid ${styles.primary}30`,
                                            background: `${styles.primary}10`,
                                        }}
                                    >
                                        <MIcon className="w-2.5 h-2.5" style={{ color: styles.primary }} />
                                    </div>
                                    <span className="font-serif text-sm" style={{ color: styles.primary }}>
                                        {signData.name}
                                    </span>
                                </div>
                            </div>

                            <div className="relative w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden mb-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${effectiveIllumination}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        background: "linear-gradient(to right, rgba(224,224,224,0.25), rgba(224,224,224,0.6))",
                                        boxShadow: "0 0 8px rgba(224,224,224,0.15)",
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-white/20">
                                    {telemetry.longitude.toFixed(1)}° ecliptic · {effectivePhaseAngle.toFixed(0)}° phase
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
