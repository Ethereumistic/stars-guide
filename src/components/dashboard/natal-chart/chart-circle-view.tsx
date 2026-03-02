"use client";

import React, { useMemo } from "react";
import { ChartData, ChartPlanet } from "@/lib/astrology";
import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";

const CIRCLE_RADIUS = 200;
const INNER_RADIUS = 130;
const PLANET_RADIUS = 150;
const CENTER = 250;
const SIZE = 500;

export function ChartCircleView({ data }: { data: ChartData }) {
    if (!data?.ascendant) return <div className="p-8 text-center text-white/50">Insufficient data for Circle Chart</div>;

    const ascLongitude = data.ascendant.longitude;

    // Function to map an ecliptic longitude directly to an SVG coordinate (x, y)
    const getPoint = (lon: number, radius: number) => {
        // Ecliptic longitude increases counter-clockwise.
        // Ascendant (at left, 180° in standard math) corresponds to ascLongitude
        const angleDeg = 180 + (lon - ascLongitude);
        // SVG math: 0 is right, 90 is down, 180 is left, 270 is up
        const angleRad = angleDeg * (Math.PI / 180);
        return {
            x: CENTER + radius * Math.cos(angleRad),
            y: CENTER + radius * Math.sin(angleRad),
        };
    };

    const signs = useMemo(() => {
        return compositionalSigns.map((sign, i) => {
            const startLon = i * 30;
            const endLon = startLon + 30;
            const midLon = startLon + 15;

            const pInnerStart = getPoint(startLon, INNER_RADIUS);
            const pOuterStart = getPoint(startLon, CIRCLE_RADIUS);

            const midPoint = getPoint(midLon, CIRCLE_RADIUS - 20);

            // SVG text rotation: we want text to curve or just rotate based on angle
            const angleDeg = 180 + (midLon - ascLongitude);
            let textRot = angleDeg;
            if (textRot > 90 && textRot < 270) {
                textRot -= 180;
            }

            return {
                id: sign.id,
                name: sign.name,
                color: zodiacUIConfig[sign.id]?.themeColor || "white",
                lineStart: pInnerStart,
                lineEnd: pOuterStart,
                textPos: midPoint,
                textRot,
                startLon,
                endLon,
                midLon
            };
        });
    }, [ascLongitude]);

    const planets = useMemo(() => {
        // We group planets that are close to each other to avoid overlap
        const sorted = [...data.planets].sort((a, b) => a.longitude - b.longitude);
        const renderPlanets = [];

        // simple clustering strategy
        for (let i = 0; i < sorted.length; i++) {
            let offset = 0;
            // check collision with previous rendered
            if (i > 0) {
                const prev = sorted[i - 1];
                if (sorted[i].longitude - prev.longitude < 4 && sorted[i].longitude - prev.longitude >= 0) {
                    offset = 4; // shift out by 4 degrees
                    // This is a naive spread. For a perfect visual, we'd use a force directed spread or fixed radial spread.
                }
            }
            renderPlanets.push({
                ...sorted[i],
                displayLon: sorted[i].longitude + offset
            });
        }

        return renderPlanets.map((p) => {
            const pos = getPoint(p.displayLon, PLANET_RADIUS);
            return {
                ...p,
                x: pos.x,
                y: pos.y,
                symbol: planetUIConfig[p.id]?.rulerSymbol || "•",
                color: planetUIConfig[p.id]?.themeColor || "white"
            };
        });
    }, [data.planets, ascLongitude]);

    return (
        <div className="w-full max-w-[500px] mx-auto aspect-square bg-[#0F0F0F] rounded-full relative overflow-hidden flex items-center justify-center font-mono">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full text-white/80">

                {/* Outer Ring Background */}
                <circle cx={CENTER} cy={CENTER} r={CIRCLE_RADIUS} fill="transparent" stroke="rgba(255,255,255,0.15)" strokeWidth="40" />

                {/* Inner Ring Background */}
                <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <circle cx={CENTER} cy={CENTER} r={CIRCLE_RADIUS - 40} fill="transparent" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

                {/* Zodiac Signs & Boundaries */}
                {signs.map((sign, i) => (
                    <g key={sign.id}>
                        {/* Sign separating line */}
                        <line
                            x1={sign.lineStart.x} y1={sign.lineStart.y}
                            x2={sign.lineEnd.x} y2={sign.lineEnd.y}
                            stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                        />
                        {/* Sign text */}
                        <text
                            x={sign.textPos.x} y={sign.textPos.y}
                            fill={sign.color}
                            fontSize="12"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="uppercase tracking-widest font-sans font-medium"
                            transform={`rotate(${sign.textRot}, ${sign.textPos.x}, ${sign.textPos.y})`}
                        >
                            {sign.name}
                        </text>
                    </g>
                ))}

                {/* Ascendant Line (True Left) */}
                {/* The true ascendant is always exactly at the 9 o'clock position (180 deg) */}
                <line
                    x1={CENTER - CIRCLE_RADIUS + 40} y1={CENTER}
                    x2={CENTER - INNER_RADIUS + 10} y2={CENTER}
                    stroke="white" strokeWidth="1"
                />
                <text
                    x={CENTER - CIRCLE_RADIUS + 50} y={CENTER - 5}
                    fill="white" fontSize="10" className="opacity-70"
                >
                    ASC
                </text>

                {/* Aspect Lines */}
                {data.aspects.map((aspect, i) => {
                    const p1 = planets.find(p => p.id === aspect.planet1);
                    const p2 = planets.find(p => p.id === aspect.planet2);
                    if (!p1 || !p2) return null;

                    // Use different stroke arrays depending on aspect type
                    let strokeDash = "";
                    let strokeOpacity = "0.2";
                    if (aspect.type === "square" || aspect.type === "opposition") {
                        strokeDash = "4 4";
                        strokeOpacity = "0.3";
                    } else if (aspect.type === "trine") {
                        strokeDash = "";
                        strokeOpacity = "0.4";
                    }

                    // Draw connecting line between planets on the inner aspect circle
                    const pt1 = getPoint(p1.longitude, INNER_RADIUS);
                    const pt2 = getPoint(p2.longitude, INNER_RADIUS);

                    return (
                        <line
                            key={`aspect-${i}`}
                            x1={pt1.x} y1={pt1.y}
                            x2={pt2.x} y2={pt2.y}
                            stroke={`rgba(255,255,255,${strokeOpacity})`}
                            strokeWidth="1"
                            strokeDasharray={strokeDash}
                        />
                    );
                })}

                {/* Planet Glyphs */}
                {planets.map((p) => {
                    // Draw a small line from planet glyph to inner circle for exact position clarity
                    const exactPos = getPoint(p.longitude, INNER_RADIUS);
                    return (
                        <g key={p.id}>
                            <line
                                x1={p.x} y1={p.y}
                                x2={exactPos.x} y2={exactPos.y}
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                            />
                            <text
                                x={p.x} y={p.y}
                                fill={p.color}
                                fontSize="20"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
                            >
                                {p.symbol}
                            </text>
                        </g>
                    );
                })}

            </svg>
        </div>
    );
}
