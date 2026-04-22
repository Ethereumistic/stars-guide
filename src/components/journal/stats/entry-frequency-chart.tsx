"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface EntryFrequencyData {
    week: string;
    count: number;
}

interface EntryFrequencyChartProps {
    data: EntryFrequencyData[];
    className?: string;
}

/**
 * CSS-only bar chart showing entries per week.
 */
export function EntryFrequencyChart({ data, className }: EntryFrequencyChartProps) {
    if (data.length === 0) {
        return <p className="text-xs text-white/30">No entry data yet</p>;
    }

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-end gap-[3px] h-24">
                {data.map((point) => {
                    const height = Math.max((point.count / maxCount) * 100, 3);
                    return (
                        <div
                            key={point.week}
                            className="flex-1 flex flex-col items-center justify-end h-full"
                            title={`${point.week}: ${point.count} entries`}
                        >
                            <div
                                className="w-full rounded-t-sm bg-galactic/30 transition-all"
                                style={{ height: `${height}%` }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[9px] text-white/20">
                <span>{data[0]?.week?.slice(5)}</span>
                <span>{data[data.length - 1]?.week?.slice(5)}</span>
            </div>
        </div>
    );
}