"use client";

import React, { useMemo } from "react";
import { type ChartData } from "@/lib/birth-chart/full-chart";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { planetUIConfig } from "@/config/planet-ui";
import { compositionalSigns } from "@/astrology/signs";

export function ChartTableView({ data }: { data: ChartData }) {
    // Combine planets and ascendant into a single list
    const chartItems = useMemo(() => {
        const items = data.planets.map((p) => ({
            id: p.id,
            name:
                p.id.charAt(0).toUpperCase() + p.id.slice(1),
            signId: p.signId,
            houseId: p.houseId,
            symbol: planetUIConfig[p.id]?.rulerSymbol || "",
            color: planetUIConfig[p.id]?.themeColor || "var(--foreground)",
            isAscendant: false,
        }));

        if (data.ascendant) {
            items.push({
                id: "ascendant",
                name: "ASCENDANT",
                signId: data.ascendant.signId,
                houseId: 1, // Ascendant is always 1st house in whole sign
                symbol: "↑",
                color: "var(--foreground)", // or a specific color
                isAscendant: true,
            });
        }

        // Sort items by house (1 to 12), then by sign order, then by planet name or longitude
        // Since we use Whole Sign, sort roughly by the sign's index from Ascendant
        const ascSign = data.ascendant?.signId || "aries";
        const ascIndex = compositionalSigns.findIndex((s) => s.id === ascSign);

        const getDistanceFromAsc = (signId: string) => {
            const idx = compositionalSigns.findIndex((s) => s.id === signId);
            if (idx === -1) return 0;
            let dist = idx - ascIndex;
            if (dist < 0) dist += 12;
            return dist;
        };

        items.sort((a, b) => {
            const distA = getDistanceFromAsc(a.signId);
            const distB = getDistanceFromAsc(b.signId);
            if (distA !== distB) return distA - distB;
            // if same sign, sort Ascendant first
            if (a.isAscendant) return -1;
            if (b.isAscendant) return 1;
            return 0;
        });

        return items;
    }, [data]);

    // Group by Sign
    const groupedBySign = useMemo(() => {
        const groups: {
            signId: string;
            signName: string;
            items: typeof chartItems;
        }[] = [];

        chartItems.forEach((item) => {
            let group = groups.find((g) => g.signId === item.signId);
            if (!group) {
                const sign = compositionalSigns.find((s) => s.id === item.signId);
                group = {
                    signId: item.signId,
                    signName: sign ? sign.name : item.signId,
                    items: [],
                };
                groups.push(group);
            }
            group.items.push(item);
        });

        return groups;
    }, [chartItems]);

    return (
        <div className="w-full max-w-lg mx-auto overflow-hidden bg-black/50 rounded-md border border-white/10 text-white/90 font-mono text-sm relative flex">
            {/* S I G N S column */}
            {/* <div className="w-8 border-r border-white/10 flex flex-col items-center justify-start py-6 shrink-0 z-10">
                <div className="[writing-mode:vertical-lr] tracking-[0.3em] text-white text-xs mt-2">
                    SIGNS
                </div>
            </div> */}

            <div className="flex-1">
                <table className="w-full border-collapse">
                    <tbody>
                        {groupedBySign.map((group, groupIndex) => (
                            <React.Fragment key={group.signId}>
                                {group.items.map((item, itemIndex) => {
                                    const isFirstInGroup = itemIndex === 0;
                                    const borderBottomClass =
                                        groupIndex < groupedBySign.length - 1 &&
                                            itemIndex === group.items.length - 1
                                            ? "border-b border-white/10"
                                            : "";

                                    return (
                                        <tr key={item.id}>
                                            {isFirstInGroup && (
                                                <td
                                                    rowSpan={group.items.length}
                                                    className={`p-4 align-top w-1/3 border-r border-white/10 ${groupIndex < groupedBySign.length - 1
                                                        ? "border-b border-white/10"
                                                        : ""
                                                        }`}
                                                >
                                                    <span className="text-2xl"
                                                    // style={{ color: zodiacUIConfig[group.signId]?.themeColor, }}
                                                    >
                                                        {group.signName}
                                                    </span>
                                                </td>
                                            )}
                                            <td
                                                className={`p-4 w-1/3 border-r border-white/10 ${borderBottomClass}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-2xl  w-5 text-center text-primary"

                                                    >
                                                        {item.symbol}
                                                    </span>
                                                    <span className="uppercase text-2xl tracking-wider">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td
                                                className={`p-4 w-1/6 text-center text-2xl font-serif ${borderBottomClass}`}
                                            >
                                                {item.houseId}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* H O U S E S column */}
            {/* <div className="w-8 border-l border-white/10 flex flex-col items-center justify-end py-6 shrink-0 absolute top-0 bottom-0 right-0 pointer-events-none">
                <div className="[writing-mode:vertical-lr] tracking-[0.3em] text-white text-xs mb-2 transform rotate-180">
                    HOUSES
                </div>
            </div> */}
        </div>
    );
}
