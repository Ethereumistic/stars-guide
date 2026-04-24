"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartTableView } from "./chart-table-view";
import { ChartCircleView } from "./chart-circle-view";

interface BirthData {
    date: string;
    location: {
        lat: number;
        long: number;
    };
    time: string;
}

export function NatalChart({ birthData }: { birthData: BirthData }) {
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
            <div className="p-8 text-center text-white/50 bg-[#0F0F0F] rounded-md border border-white/10">
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
            {/* xl+: side-by-side layout — table 3 cols, circle 4 cols */}
            <div className="hidden xl:grid grid-cols-7 gap-6 items-start">
                <div className="w-full md:col-span-3">
                    <h3 className="font-serif text-white text-center mb-3">
                        Table{" "}
                        <span className="text-primary">Birth Chart</span>
                    </h3>
                    <ChartTableView data={chartData} />
                </div>
                <div className="w-full flex flex-col md:col-span-4">
                    <h3 className="font-serif text-white text-center mb-3">
                        Circle{" "}
                        <span className="text-primary">Birth Chart</span>
                    </h3>
                    <div className="w-full flex justify-center">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            </div>

            {/* Below xl: stacked layout — each chart on its own full-width row */}
            <div className="xl:hidden space-y-6">
                <div>
                    <h3 className="font-serif text-white text-center mb-3">
                        Table{" "}
                        <span className="text-primary">Birth Chart</span>
                    </h3>
                    <ChartTableView data={chartData} />
                </div>
                <div>
                    <h3 className="font-serif text-white text-center mb-3">
                        Circle{" "}
                        <span className="text-primary">Birth Chart</span>
                    </h3>
                    <div className="w-full flex justify-center">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}