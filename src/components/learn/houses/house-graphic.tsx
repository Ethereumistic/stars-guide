"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface HouseGraphicProps {
    houseId: number;
    romanNumeral: string;
    houseName: string;
    keyword: string;
    angularity: string;
    styles: {
        primary: string;   // themeColor from houseUIConfig
        glow: string;      // same color, used for glow effects
    };
    size?: "default" | "large";
    bottomRight?: ReactNode;
}

export function HouseGraphic({
    houseId,
    romanNumeral,
    houseName,
    keyword,
    angularity,
    styles,
    size = "default",
    bottomRight,
}: HouseGraphicProps) {
    const maxWidth = size === "large" ? "600px" : "500px";

    // Build a 12-segment wheel where the current house is highlighted
    const segments = Array.from({ length: 12 }, (_, i) => i + 1);
    const segmentAngle = 360 / 12; // 30deg each

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            className="lg:col-span-7 relative h-full min-h-[500px] flex items-center justify-center lg:sticky lg:top-32 -translate-y-12"
        >
            <div
                className="relative w-full max-w-[420px] aspect-square rounded-full border border-white/10 bg-black/40 flex items-center justify-center p-8 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                style={{ maxWidth }}
            >
                {/* Radial glow */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(circle at center, ${styles.glow} 0%, transparent 65%)`
                    }}
                />

                {/* Grid overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                        backgroundSize: '3rem 3rem'
                    }}
                />

                {/* SVG house wheel */}
                <svg
                    viewBox="0 0 400 400"
                    className="relative z-10 w-full h-full"
                    style={{ filter: `drop-shadow(0 0 15px ${styles.glow}44)` }}
                >
                    {/* Outer circle */}
                    <circle cx="200" cy="200" r="185" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    {/* Mid ring */}
                    <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    {/* Inner circle */}
                    <circle cx="200" cy="200" r="70" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

                    {/* 12 spokes + segments */}
                    {segments.map((num) => {
                        const angleRad = ((num - 1) * segmentAngle - 90) * (Math.PI / 180);
                        const nextAngleRad = (num * segmentAngle - 90) * (Math.PI / 180);
                        const midAngleRad = ((num - 0.5) * segmentAngle - 90) * (Math.PI / 180);

                        const outerR = 185;
                        const innerR = 70;
                        const labelR = 155; // where we place the number label

                        const x1 = 200 + innerR * Math.cos(angleRad);
                        const y1 = 200 + innerR * Math.sin(angleRad);
                        const x2 = 200 + outerR * Math.cos(angleRad);
                        const y2 = 200 + outerR * Math.sin(angleRad);

                        // Arc path for segment fill
                        const ax1 = 200 + innerR * Math.cos(angleRad);
                        const ay1 = 200 + innerR * Math.sin(angleRad);
                        const ax2 = 200 + outerR * Math.cos(angleRad);
                        const ay2 = 200 + outerR * Math.sin(angleRad);
                        const bx1 = 200 + outerR * Math.cos(nextAngleRad);
                        const by1 = 200 + outerR * Math.sin(nextAngleRad);
                        const bx2 = 200 + innerR * Math.cos(nextAngleRad);
                        const by2 = 200 + innerR * Math.sin(nextAngleRad);

                        const segPath = `M ${ax1} ${ay1} L ${ax2} ${ay2} A ${outerR} ${outerR} 0 0 1 ${bx1} ${by1} L ${bx2} ${by2} A ${innerR} ${innerR} 0 0 0 ${ax1} ${ay1} Z`;

                        // Label position
                        const lx = 200 + labelR * Math.cos(midAngleRad);
                        const ly = 200 + labelR * Math.sin(midAngleRad);

                        const isActive = num === houseId;

                        return (
                            <g key={num}>
                                {/* Segment fill */}
                                <path
                                    d={segPath}
                                    fill={isActive ? `${styles.primary}33` : "rgba(255,255,255,0.01)"}
                                    stroke={isActive ? styles.primary : "rgba(255,255,255,0.06)"}
                                    strokeWidth={isActive ? "1.5" : "0.5"}
                                />
                                {/* Spoke line */}
                                <line
                                    x1={x1} y1={y1}
                                    x2={x2} y2={y2}
                                    stroke={isActive ? `${styles.primary}88` : "rgba(255,255,255,0.06)"}
                                    strokeWidth={isActive ? "1" : "0.5"}
                                />
                                {/* House number label */}
                                <text
                                    x={lx}
                                    y={ly}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={isActive ? "36" : "24"}
                                    fontFamily="cinzel"
                                    fill={isActive ? styles.primary : "rgba(255,255,255,0.25)"}
                                    fontWeight={isActive ? "bold" : "normal"}
                                >
                                    {num}
                                </text>
                            </g>
                        );
                    })}

                    {/* Center: large roman numeral */}
                    <text
                        x="200" y="210"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="56"
                        fontFamily="serif"
                        fill={styles.primary}
                        opacity="0.9"
                        style={{ filter: `drop-shadow(0 0 8px ${styles.glow})` }}
                    >
                        {romanNumeral}
                    </text>
                </svg>
            </div>

            {/* Bottom-left label */}
            <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/30 hidden lg:block">
                FIG. {houseId} // {houseName.toUpperCase()}
            </div>

            {/* Bottom-right label */}
            <div
                className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block"
                style={{ color: styles.primary }}
            >
                {angularity} House
            </div>

            {bottomRight && (
                <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.3em] hidden lg:block" style={{ color: styles.primary }}>
                    {bottomRight}
                </div>
            )}
        </motion.div>
    );
}