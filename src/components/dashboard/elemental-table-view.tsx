"use client";

import { motion } from "motion/react";
import { ElementType, ELEMENT_CONTENT, ELEMENT_COLORS } from "@/astrology/elements";
import { GiFlame, GiStonePile, GiTornado, GiWaveCrest } from "react-icons/gi";
import { planetUIConfig } from "@/config/planet-ui";

interface LegacyPlacement {
    body: string;
    sign: string;
    house: number;
}

const ELEMENT_ORDER: ElementType[] = ["Fire", "Earth", "Air", "Water"];

const ELEMENT_ICONS: Record<ElementType, typeof GiFlame> = {
    Fire: GiFlame,
    Earth: GiStonePile,
    Air: GiTornado,
    Water: GiWaveCrest,
};

function getPlanetSymbol(body: string): string {
    const key = body.toLowerCase().replace(/\s+/g, "_");
    if (planetUIConfig[key]) return planetUIConfig[key].rulerSymbol;
    if (key === "ascendant") return "AC";
    if (key === "mc" || key === "midheaven") return "MC";
    return body.charAt(0).toUpperCase();
}

export interface ElementalTableData {
    counts: Record<ElementType, number>;
    total: number;
    placementsByElement: Record<ElementType, LegacyPlacement[]>;
    dominant: ElementType;
}

interface ElementalTableViewProps {
    data: ElementalTableData;
    delay?: number;
}

export function ElementalTableView({ data, delay = 0.3 }: ElementalTableViewProps) {
    const { counts, total, placementsByElement, dominant } = data;

    return (
        <div className="w-full max-w-3xl mx-auto bg-black/50 rounded-md border border-white/10 text-white/90">
            <table className="w-full border-collapse font-serif" style={{ tableLayout: "fixed" }}>
                <colgroup>
                    <col style={{ width: "4" }} />
                    <col style={{ width: "0%" }} />
                    <col style={{ width: "4rem" }} />
                    <col style={{ width: "6rem" }} />
                </colgroup>
                <tbody>
                    {ELEMENT_ORDER.map((el, i) => {
                        const count = counts[el];
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = ELEMENT_COLORS[el];
                        const Icon = ELEMENT_ICONS[el];
                        const planets = placementsByElement[el];
                        const content = ELEMENT_CONTENT[el];
                        const isDominant = el === dominant;
                        const isLast = i === ELEMENT_ORDER.length - 1;

                        return (
                            <tr key={el} className={isLast ? "" : "border-b border-white/[0.04]"}>
                                {/* ── ELEMENT COLUMN ── icon + name, horizontal */}
                                <td
                                    rowSpan={1}
                                    className={`py-3 pl-8 pr-3 align-middle border-r border-white/[0.08] ${!isLast ? "border-b border-white/[0.08]" : ""}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Icon
                                            className="size-9 shrink-0"
                                            style={{ color: color.stroke, opacity: isDominant ? 1 : 0.55 }}
                                        />
                                        <span
                                            className="text-xl tracking-[0.12em] font-serif text-white"
                                            style={{ color: color.stroke, opacity: isDominant ? 1 : 0.55 }}
                                        >
                                            {el}
                                        </span>
                                    </div>
                                </td>

                                {/* ── KEYWORDS + PLANETS ── */}
                                <td className={`py-2 pl-2.5 pr-1 ${isLast ? "" : "border-b border-white/[0.03]"}`}>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {content.keywords.map(k => (
                                            <span
                                                key={k}
                                                className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                                                style={{
                                                    color: color.stroke,
                                                    borderColor: `${color.stroke}30`,
                                                    backgroundColor: color.dim,
                                                }}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                    {planets.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/20">
                                                Placements
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {planets.map((p, pi) => (
                                                    <span
                                                        key={pi}
                                                        className="text-base font-serif text-white/60"
                                                        title={p.body}
                                                    >
                                                        {getPlanetSymbol(p.body)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </td>

                                {/* ── COUNT ── */}
                                <td
                                    className={`py-3 pl-2 pr-3 align-middle text-center border-l border-white/[0.08] ${!isLast ? "border-b border-white/[0.08]" : ""}`}
                                >
                                    <span className="text-lg font-serif text-white tracking-wider">
                                        {count}/{total}
                                    </span>
                                </td>

                                {/* ── BAR + PERCENTAGE ── */}
                                <td
                                    className={`py-3 pl-2 pr-3 align-middle border-l border-white/[0.08] ${!isLast ? "border-b border-white/[0.08]" : ""}`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-lg font-serif text-white tabular-nums">
                                            {pct}%
                                        </span>
                                        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: color.stroke }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 1, delay: delay + 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}