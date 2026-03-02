"use client";

import React, { useMemo } from "react";
import { ChartData } from "@/lib/astrology";
import { compositionalSigns } from "@/astrology/signs";
import { planetUIConfig } from "@/config/planet-ui";

// ─── SVG Canvas ──────────────────────────────────────────────────────────────
const SIZE = 600;
const CENTER = SIZE / 2; // 300

// ─── Radii Fine-tuning ────────────────────────────────────────────────────────
// All values are SVG units (out of 600 total). Adjust these to reshape the chart.

const R_OUTER = 288;           // The absolute outer edge of the zodiac ring
const R_BAND_INNER = 240;      // Where the zodiac ring ends and the inner chart begins
//   ↑ increase to make the white band narrower
//   ↓ decrease to make it wider

const R_ZODIAC_TEXT = 262;     // Arc radius where sign name text is drawn
//   Should sit comfortably between R_BAND_INNER and R_OUTER

const R_INNER_RING = 240;      // The thin decorative circle just inside the zodiac band
//   (This is where the degree ticks start from)

const R_PLANET = 220;          // Radius where planet symbols are placed
//   Adjust inward/outward to shift planets closer/further from center

const R_ASPECT = 202;          // Radius of the inner aspect boundary circle
//   Aspect lines are drawn between planet points on THIS circle

// ─── Tick Lengths ─────────────────────────────────────────────────────────────
// Ticks are drawn INSIDE the zodiac band (between R_BAND_INNER and R_INNER_RING)
// These values are how far each tick EXTENDS inward from R_BAND_INNER
const TICK_MAJOR_LEN = 16;     // 30° (sign boundary) ticks — longest
const TICK_MEDIUM_LEN = 10;    // 10° ticks — medium
const TICK_MINOR_LEN = 5;      // 5° ticks — shortest

export function ChartCircleView({ data }: { data: ChartData }) {
    if (!data?.ascendant || !data?.planets) {
        return <div className="p-8 text-center text-white/50">Insufficient data for Circle Chart</div>;
    }

    const ascLongitude = data.ascendant.longitude;

    // ── Coordinate Mapping ───────────────────────────────────────────────────
    // Maps an ecliptic longitude (0–360°) to an (x, y) SVG point at a given radius.
    // The Ascendant is always placed at the left (180° in SVG / 9 o'clock position).
    const getPoint = (lon: number, radius: number) => {
        // Rotate so that ascLongitude maps to 180° (left side of SVG)
        const angleDeg = 180 - (lon - ascLongitude);
        const angleRad = angleDeg * (Math.PI / 180);
        return {
            x: CENTER + radius * Math.cos(angleRad),
            y: CENTER + radius * Math.sin(angleRad),
        };
    };

    // ── 1. Zodiac Sign Segments & Labels ─────────────────────────────────────
    // Text is placed using a simple rotate() transform — no SVG arc paths needed.
    // Each sign label sits at the midpoint angle of its 30° segment, at R_ZODIAC_TEXT,
    // and is rotated so it reads tangentially around the ring.
    const signs = useMemo(() => {
        return compositionalSigns.map((sign, i) => {
            const startLon = i * 30;

            // Radial divider line endpoints (spans from band inner edge to outer edge)
            const pInner = getPoint(startLon, R_BAND_INNER);
            const pOuter = getPoint(startLon, R_OUTER);

            // Midpoint of this sign's 30° segment — where the label will be centered
            const midLon = startLon + 15;
            const midPoint = getPoint(midLon, R_ZODIAC_TEXT);

            // SVG rotation angle so the text is tangent to the ring.
            // getPoint uses: angleDeg = 180 - (lon - ascLongitude)
            // We add 90° to make the text perpendicular to the radius (i.e. tangential).
            const svgAngle = 180 - (midLon - ascLongitude);
            // Add 90° so upright text faces outward; flip 180° for the bottom half so it's never upside-down.
            // Signs in the bottom half (svgAngle between 0° and 180°) need an extra 180° flip.
            const isBottom = svgAngle > 0 && svgAngle < 180;
            const labelRotation = svgAngle + 90 + (isBottom ? 180 : 0);

            return {
                id: sign.id,
                name: sign.name,
                lineStart: pInner,
                lineEnd: pOuter,
                labelX: midPoint.x,
                labelY: midPoint.y,
                labelRotation,  // degrees to rotate the <text> element
                startLon,
            };
        });
    }, [ascLongitude]);

    // ── 2. Degree Ticks ───────────────────────────────────────────────────────
    // Rendered inside the white zodiac band. Only 5° and 10° ticks are shown
    // (no 1° ticks) to keep the chart clean like the reference image.
    const ticks = useMemo(() => {
        const elements = [];
        for (let i = 0; i < 360; i += 5) {
            // Skip 0°, 30°, 60°... — those are the sign-boundary dividers (drawn separately)
            if (i % 30 === 0) continue;

            const isMajor = i % 10 === 0; // 10° ticks
            const tickLen = isMajor ? TICK_MEDIUM_LEN : TICK_MINOR_LEN;

            // Tick starts at the inner edge of the band and extends outward by tickLen
            const rOuter = R_BAND_INNER;
            const rInner = R_BAND_INNER - tickLen;

            const pt1 = getPoint(i, rOuter);
            const pt2 = getPoint(i, rInner);

            elements.push(
                <line
                    key={`tick-${i}`}
                    x1={pt1.x} y1={pt1.y}
                    x2={pt2.x} y2={pt2.y}
                    stroke="#1a1a1a"                         // Tick color (dark on light band)
                    strokeOpacity={isMajor ? 0.5 : 0.3}     // 10° ticks are more visible
                    strokeWidth={isMajor ? 1.5 : 1}
                />
            );
        }
        return elements;
    }, [ascLongitude]);

    // ── 3. Planets with Overlap Handling ─────────────────────────────────────
    const planets = useMemo(() => {
        // Sort planets by longitude so overlaps can be resolved sequentially
        const sorted = [...data.planets].sort((a, b) => a.longitude - b.longitude);
        const renderPlanets = sorted.map(p => ({ ...p, displayLon: p.longitude }));

        // Minimum angular gap (degrees) between adjacent planet symbols
        // Increase this if symbols still overlap, decrease if they spread too far
        const MIN_DIST = 10;

        for (let i = 1; i < renderPlanets.length; i++) {
            let diff = renderPlanets[i].displayLon - renderPlanets[i - 1].displayLon;
            if (diff < 0) diff += 360;
            if (diff < MIN_DIST) {
                renderPlanets[i].displayLon = (renderPlanets[i - 1].displayLon + MIN_DIST) % 360;
            }
        }

        return renderPlanets.map((p) => {
            const displayPos = getPoint(p.displayLon, R_PLANET);
            // exactPosTick: where the stem meets the inner edge of the zodiac band
            const exactPosTick = getPoint(p.longitude, R_BAND_INNER);
            // exactPosAspect: where the aspect line originates from on the inner circle
            const exactPosAspect = getPoint(p.longitude, R_ASPECT);

            return {
                ...p,
                x: displayPos.x,
                y: displayPos.y,
                exactPosTick,
                exactPosAspect,
                symbol: planetUIConfig[p.id]?.rulerSymbol || "•",
                // isClustered: true when the display position differs from the true longitude
                isClustered: Math.abs(p.displayLon - p.longitude) > 0.1,
            };
        });
    }, [data.planets, ascLongitude]);

    return (
        <div className="w-full max-w-[600px] mx-auto aspect-square bg-transparent rounded-full relative overflow-hidden flex items-center justify-center">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full" shapeRendering="geometricPrecision">

                {/* No <defs> needed — sign labels use rotate() transform instead of textPath */}

                {/* ── Layer 1: Filled black background disk ── */}
                <circle cx={CENTER} cy={CENTER} r={R_OUTER} fill="transparent" />

                {/* ── Layer 2: White Zodiac Ring ──────────────────────────────
                    The ring is drawn as a thick stroke centered on R_ZODIAC_TEXT.
                    strokeWidth = R_OUTER - R_BAND_INNER ensures it fills the band exactly.
                    Change fill color of the band here (currently off-white). */}
                <circle
                    cx={CENTER} cy={CENTER}
                    r={(R_OUTER + R_BAND_INNER) / 2}       // Centered between outer and inner edges
                    fill="none"
                    stroke="#d4b375"                         // Zodiac band background color ← tune here
                    strokeWidth={R_OUTER - R_BAND_INNER}    // Band thickness = outer - inner radius
                />

                {/* ── Layer 3: Degree Ticks (inside the zodiac band) ── */}
                {ticks}

                {/* ── Layer 4: Sign boundary dividers & name text ── */}
                {signs.map((sign) => (
                    <g key={sign.id}>
                        {/* Radial line separating each 30° zodiac segment */}
                        <line
                            x1={sign.lineStart.x} y1={sign.lineStart.y}
                            x2={sign.lineEnd.x} y2={sign.lineEnd.y}
                            stroke="#111111"       // Matches background — creates a "cut" in the band
                            strokeWidth="2"        // ← increase for thicker dividers
                        />

                        {/* Sign Name — rotated to sit tangentially in the band.
                             transform: translate to midpoint, then rotate to match the ring tangent.
                             ← labelRotation is computed in useMemo above. */}
                        <text
                            x={sign.labelX}
                            y={sign.labelY}
                            fill="#1a1a1a"         // Text color (dark on light band) ← tune here
                            fontSize="11"          // ← font size of sign names
                            fontWeight="700"
                            letterSpacing="0.12em" // ← letter spacing
                            fontFamily="system-ui, sans-serif"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${sign.labelRotation}, ${sign.labelX}, ${sign.labelY})`}
                        >
                            {sign.name.toUpperCase()}
                        </text>
                    </g>
                ))}

                {/* ── Layer 5: Inner boundary ring (edge of planet zone) ── */}
                <circle
                    cx={CENTER} cy={CENTER} r={R_BAND_INNER}
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"    // ← subtle inner ring opacity
                    strokeWidth="1"
                />

                {/* ── Layer 6: Aspect boundary circle ────────────────────────
                    This is the inner dotted/faint circle where aspect lines originate. */}
                <circle
                    cx={CENTER} cy={CENTER} r={R_ASPECT}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"     // ← aspect circle opacity
                    strokeWidth="1"
                />

                {/* ── Layer 7: Aspect Lines ────────────────────────────────────
                    Lines drawn between planets' exact positions on the aspect circle.
                    Styles vary per aspect type. */}
                {data.aspects.map((aspect, i) => {
                    const p1 = planets.find(p => p.id === aspect.planet1);
                    const p2 = planets.find(p => p.id === aspect.planet2);
                    if (!p1 || !p2) return null;

                    // ── Aspect line styles ── tune dash patterns and opacity here
                    let strokeDash = "";
                    let strokeOpacity = "0.3";
                    let strokeWidth = "1";

                    if (aspect.type === "opposition") {
                        strokeDash = "";
                        strokeOpacity = "0.8";
                        strokeWidth = "1.5";
                    } else if (aspect.type === "square") {
                        strokeDash = "6 6";
                        strokeOpacity = "0.6";
                        strokeWidth = "1";
                    } else if (aspect.type === "trine") {
                        strokeDash = "";
                        strokeOpacity = "0.5";
                        strokeWidth = "1";
                    } else if (aspect.type === "sextile") {
                        strokeDash = "2 4";
                        strokeOpacity = "0.4";
                        strokeWidth = "1";
                    }

                    return (
                        <line
                            key={`aspect-${i}`}
                            x1={p1.exactPosAspect.x} y1={p1.exactPosAspect.y}
                            x2={p2.exactPosAspect.x} y2={p2.exactPosAspect.y}
                            stroke="#ffffff"
                            strokeOpacity={strokeOpacity}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDash}
                        />
                    );
                })}

                {/* ── Layer 8: Ascendant Indicator ─────────────────────────────
                    Always points left (9 o'clock). Arrow + ASC label. */}
                <g opacity="0.9">
                    {/* Horizontal line from aspect circle to band inner edge */}
                    <line
                        x1={CENTER - R_ASPECT} y1={CENTER}
                        x2={CENTER - R_BAND_INNER} y2={CENTER}
                        stroke="#ffffff" strokeWidth="1.5"
                    />
                    {/* Arrowhead at the band edge */}
                    <polygon
                        points={`${CENTER - R_BAND_INNER},${CENTER} ${CENTER - R_BAND_INNER + 8},${CENTER - 4} ${CENTER - R_BAND_INNER + 8},${CENTER + 4}`}
                        fill="#ffffff"
                    />
                    {/* ASC label, slightly above the line */}
                    <text
                        x={CENTER - R_BAND_INNER + 14} y={CENTER - 7}
                        fill="#ffffff"
                        fontSize="9"               // ← ASC label size
                        fontWeight="500"
                        letterSpacing="0.1em"
                        fontFamily="system-ui, sans-serif"
                    >
                        ASC
                    </text>
                </g>

                {/* ── Layer 9: Planet Symbols & Stems ──────────────────────────
                    Each planet has:
                    - A radial stem from its exact ecliptic position (at the band edge)
                      down to the aspect circle
                    - A symbol glyph placed at its (possibly shifted) display position
                    - A dotted connector if the symbol was shifted to avoid overlap */}
                {planets.map((p) => (
                    <g key={p.id}>
                        {/* Radial stem at exact longitude — connects band to aspect circle */}
                        <line
                            x1={p.exactPosTick.x} y1={p.exactPosTick.y}
                            x2={p.exactPosAspect.x} y2={p.exactPosAspect.y}
                            stroke="#ffffff"
                            strokeOpacity="0.4"        // ← stem brightness
                            strokeWidth="1"
                        />

                        {/* Dotted connector between shifted symbol and true position */}
                        {p.isClustered && (
                            <line
                                x1={p.x} y1={p.y}
                                x2={p.exactPosTick.x} y2={p.exactPosTick.y}
                                stroke="#ffffff"
                                strokeOpacity="0.35"
                                strokeWidth="1"
                                strokeDasharray="2 3"  // ← clustering connector style
                            />
                        )}

                        {/* Planet glyph background disc (prevents lines showing through) */}
                        <circle
                            cx={p.x} cy={p.y} r={13}  // ← planet symbol clearance radius
                            fill="#111111"
                        />

                        {/* Planet symbol (unicode glyph) */}
                        <text
                            x={p.x} y={p.y + 1}
                            fill="#ffffff"
                            fontSize="24"              // ← planet glyph size
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontFamily="serif"
                        >
                            {p.symbol}
                        </text>

                        {/* Retrograde "Rx" superscript */}
                        {p.retrograde && (
                            <text
                                x={p.x + 11} y={p.y + 9}
                                fill="#ffffff"
                                fontSize="7"           // ← Rx label size
                                opacity="0.7"
                                fontFamily="monospace"
                            >
                                Rx
                            </text>
                        )}
                    </g>
                ))}

            </svg>
        </div>
    );
}