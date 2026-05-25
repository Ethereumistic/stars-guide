"use client";

import React, { useMemo, useState, useEffect } from "react";
import { type ChartData } from "@/lib/birth-chart/full-chart";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { compositionalSigns } from "@/astrology/signs";

/**
 * Standard astrological planet display order:
 *   Personal -> Social -> Transpersonal -> Lunar Nodes -> Calculated Points -> Angles
 */
const PLANET_DISPLAY_ORDER: string[] = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "north_node",
    "south_node",
    "part_of_fortune",
    "chiron",
    "ascendant",
];

function getDisplayName(id: string): string {
    const names: Record<string, string> = {
        sun: "Sun",
        moon: "Moon",
        mercury: "Mercury",
        venus: "Venus",
        mars: "Mars",
        jupiter: "Jupiter",
        saturn: "Saturn",
        uranus: "Uranus",
        neptune: "Neptune",
        pluto: "Pluto",
        north_node: "North Node",
        south_node: "South Node",
        part_of_fortune: "Fortune",
        chiron: "Chiron",
        ascendant: "Ascendant",
    };
    return names[id] || (id.charAt(0).toUpperCase() + id.slice(1));
}

interface ChartItem {
    id: string;
    name: string;
    signId: string;
    houseId: number;
    symbol: string;
    retrograde: boolean;
    imageUrl?: string;
    themeColor: string;
}

export function ChartTableView({ data }: { data: ChartData }) {
    // Detect mobile for responsive sizing
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const chartItems = useMemo(() => {
        const itemMap = new Map<string, ChartItem>();

        data.planets.forEach((p) => {
            const cfg = planetUIConfig[p.id];
            itemMap.set(p.id, {
                id: p.id,
                name: getDisplayName(p.id),
                signId: p.signId,
                houseId: p.houseId,
                symbol: cfg?.rulerSymbol || "",
                retrograde: p.retrograde,
                imageUrl: cfg?.imageUrl,
                themeColor: cfg?.themeColor || "var(--foreground)",
            });
        });

        if (data.ascendant) {
            itemMap.set("ascendant", {
                id: "ascendant",
                name: "Ascendant",
                signId: data.ascendant.signId,
                houseId: 1,
                symbol: "↑",
                retrograde: false,
                imageUrl: undefined,
                themeColor: "hsl(var(--primary))",
            });
        }

        return PLANET_DISPLAY_ORDER
            .filter((id) => itemMap.has(id))
            .map((id) => itemMap.get(id)!);
    }, [data]);

    // Group by Sign
    const groupedBySign = useMemo(() => {
        const groups: {
            signId: string;
            signName: string;
            items: ChartItem[];
        }[] = [];

        chartItems.forEach((item) => {
            let group = groups.find((g) => g.signId === item.signId);
            if (!group) {
                const sign = compositionalSigns.find((s) => s.id === item.signId);
                group = {
                    signId: item.signId,
                    signName: sign ? sign.name.toUpperCase() : item.signId.toUpperCase(),
                    items: [],
                };
                groups.push(group);
            }
            group.items.push(item);
        });

        return groups;
    }, [chartItems]);

    return (
        <div className={`w-full bg-black/50 rounded-md border border-white/10 text-white/90 ${isMobile ? "max-w-sm" : "max-w-3xl"} mx-auto`}>
            {/* Wrapper enables horizontal scroll on mobile without breaking layout */}
            <div className={`overflow-x-auto ${isMobile ? "-mx-2 px-2" : ""}`}>
                <table className="w-full border-collapse font-serif min-w-[320px]">
                    {/* Responsive col widths: Sign (flexible) / Planet (flexible) / House (fixed) */}
                    <colgroup>
                        <col className="w-[min(55%,200px)]" />
                        <col className="w-[min(40%,180px)]" />
                        <col className="w-12 md:w-16" />
                    </colgroup>
                    <tbody>
                        {groupedBySign.map((group, groupIndex) => {
                            const signCfg = zodiacUIConfig[group.signId];
                            const SignIcon = signCfg?.icon;
                            const isLastGroup = groupIndex === groupedBySign.length - 1;

                            return (
                                <React.Fragment key={group.signId}>
                                    {group.items.map((item, itemIndex) => {
                                        const isFirstInGroup = itemIndex === 0;
                                        const isLastRow = isLastGroup && itemIndex === group.items.length - 1;

                                        return (
                                            <tr key={item.id} className={isLastRow ? "" : "border-b border-white/[0.04]"}>
                                                {/* ── SIGN COLUMN ── (rowspan for group) */}
                                                {isFirstInGroup && (
                                                    <td
                                                        rowSpan={group.items.length}
                                                        className={`${isMobile ? "py-2 pl-4 pr-2" : "py-3 pl-8 pr-3"} align-middle border-r border-white/[0.08] ${!isLastGroup ? "border-b border-white/[0.08]" : ""}`}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {SignIcon && (
                                                                <SignIcon
                                                                    className={`shrink-0 text-primary ${isMobile ? "size-5" : "md:size-9"}`}
                                                                />
                                                            )}
                                                            <span className={`tracking-[0.12em] font-serif text-white ${isMobile ? "text-base" : "md:text-xl"}`}>
                                                                {group.signName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}

                                                {/* ── PLANET: Name ── */}
                                                <td className={`py-2 pl-2 pr-1 min-w-0 ${isLastRow ? "" : "border-b border-white/[0.03]"}`}>
                                                    <div className="flex items-center gap-1">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.name}
                                                                className={`object-contain shrink-0 ${isMobile ? "w-5 h-5" : "md:w-7 md:h-7"}`}
                                                                style={{
                                                                    transform: `scale(${planetUIConfig[item.id]?.imageScale || 1})`,
                                                                    filter: `drop-shadow(0 0 1px ${item.themeColor})`,
                                                                }}
                                                            />
                                                        ) : (
                                                            <span
                                                                className={`shrink-0 font-serif leading-none ${isMobile ? "w-5 h-5 text-3xl flex items-center justify-center" : "md:w-6 md:h-6 md:text-4xl flex items-center justify-center"}`}
                                                                style={{ color: item.themeColor }}
                                                            >
                                                                {item.symbol}
                                                            </span>
                                                        )}
                                                        <span className={`truncate tracking-[0.08em] uppercase font-serif text-white ${isMobile ? "text-sm" : "md:text-xl"}`}>
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* ── HOUSE ── (rowspan for group) */}
                                                {isFirstInGroup && (
                                                    <td
                                                        rowSpan={group.items.length}
                                                        className={`${isMobile ? "py-2" : "py-3"} pl-1 pr-2 align-middle text-center border-l border-white/[0.08] ${!isLastGroup ? "border-b border-white/[0.08]" : ""}`}
                                                    >
                                                        <span className={`font-serif text-white tracking-wider ${isMobile ? "text-sm" : "md:text-lg"}`}>
                                                            {group.items[0].houseId}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
