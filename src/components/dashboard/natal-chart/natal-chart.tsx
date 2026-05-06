"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartTableView } from "./chart-table-view";
import { ChartCircleView } from "./chart-circle-view";
import { ChartSectionHeader } from "@/components/dashboard/chart-section-header";

interface BirthData {
    date: string;
    location: {
        lat: number;
        long: number;
    };
    time: string;
}

export function NatalChart({ birthData }: { birthData: BirthData }) {
    const [visualization, setVisualization] = useState<string>("both");

    // On mobile, "both" is not available so default to "table"
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // Switch to "table" when switching to mobile while in "both" view
    useEffect(() => {
        if (isMobile && visualization === "both") {
            setVisualization("table");
        }
    }, [isMobile, visualization]);

    const chartData = useMemo(() => {
        try {
            const [yearStr, monthStr, dayStr] = birthData.date.split("-");
            const [hoursStr, minutesStr] = birthData.time.split(":");

            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            const day = parseInt(dayStr, 10);
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            if (
                isNaN(year) || isNaN(month) || isNaN(day) ||
                isNaN(hours) || isNaN(minutes) ||
                typeof birthData.location?.lat !== "number" ||
                typeof birthData.location?.long !== "number"
            ) {
                return null;
            }

            return calculateFullChart(
                year,
                month,
                day,
                hours,
                minutes,
                birthData.location.lat,
                birthData.location.long
            );
        } catch (error) {
            console.error("Error calculating natal chart:", error);
            return null;
        }
    }, [birthData]);

    if (!chartData) {
        return (
            <div className=" text-center text-white/50 bg-[#0F0F0F] rounded-md border border-white/10">
                Incomplete birth data.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <ChartSectionHeader
                title="Birth"
                titleAccent="Chart"
                activeVisualization={visualization}
                onVisualizationChange={setVisualization}
                hideBothOnMobile
            />

            {visualization === "both" ? (
                <div className="grid grid-cols-7 gap-6">
                    <div className="col-span-3">
                        <ChartTableView data={chartData} />
                    </div>
                    <div className="col-span-4">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            ) : visualization === "table" ? (
                <ChartTableView data={chartData} />
            ) : (
                <div className="w-full flex justify-center">
                    <ChartCircleView data={chartData} />
                </div>
            )}
        </motion.div>
    );
}