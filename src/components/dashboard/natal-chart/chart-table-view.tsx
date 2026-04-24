"use client";

import React, { useMemo } from "react";
import { type ChartData } from "@/lib/birth-chart/full-chart";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { compositionalSigns } from "@/astrology/signs";

/**
 * Standard astrological planet display order:
 *   Personal → Social → Transpersonal → Lunar Nodes → Calculated Points → Angles
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
        part_of_fortune: "Part of Fortune",
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
        <div className="w-full bg-black/50 rounded-md border border-white/10 text-white/90">
            <table className="w-full border-collapse font-serif" style={{ tableLayout: "fixed" }}>
                <colgroup>
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "0%" }} />
                    <col style={{ width: "2.5rem" }} />
                </colgroup>
                <tbody>
                    {groupedBySign.map((group, groupIndex) => {
                        const signCfg = zodiacUIConfig[group.signId];
                        const SignIcon = signCfg?.icon;

                        return (
                            <React.Fragment key={group.signId}>
                                {group.items.map((item, itemIndex) => {
                                    const isFirstInGroup = itemIndex === 0;
                                    const isLastRow =
                                        groupIndex === groupedBySign.length - 1 &&
                                        itemIndex === group.items.length - 1;

                                    return (
                                        <tr key={item.id} className={isLastRow ? "" : "border-b border-white/[0.04]"}>
                                            {/* ── SIGN COLUMN ── (rowspan for group) */}
                                            {isFirstInGroup && (
                                                <td
                                                    rowSpan={group.items.length}
                                                    className={`py-3 pl-3 pr-3 align-middle border-r border-white/[0.08] ${groupIndex < groupedBySign.length - 1
                                                            ? "border-b border-white/[0.08]"
                                                            : ""
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {SignIcon && (
                                                            <SignIcon
                                                                className="w-[18px] h-[18px] shrink-0 text-primary"
                                                            />
                                                        )}
                                                        <span className="text-base tracking-[0.12em] font-serif text-white/80">
                                                            {group.signName}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* ── PLANET: Name ── */}
                                            <td className={`py-2 pl-2.5 pr-1 ${isLastRow ? "" : "border-b border-white/[0.03]"}`}>
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="w-6 h-6 object-contain shrink-0"
                                                            style={{
                                                                transform: `scale(${planetUIConfig[item.id]?.imageScale || 1})`,
                                                                filter: `drop-shadow(0 0 1px ${item.themeColor})`,
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="w-6 h-6 flex items-center justify-center text-base shrink-0 font-serif"
                                                            style={{ color: item.themeColor }}
                                                        >
                                                            {item.symbol}
                                                        </span>
                                                    )}
                                                    <span className="text-sm tracking-[0.08em] uppercase font-serif text-white/90">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* ── HOUSE ── (rowspan for group, same as sign) */}
                                            {isFirstInGroup && (
                                                <td
                                                    rowSpan={group.items.length}
                                                    className={`py-3 pl-2 pr-3 align-middle text-center border-l border-white/[0.08] ${groupIndex < groupedBySign.length - 1
                                                            ? "border-b border-white/[0.08]"
                                                            : ""
                                                        }`}
                                                >
                                                    <span className="text-base font-serif text-white tracking-wider">
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
    );
}