"use client";

import React, { useMemo } from "react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartTableView } from "./chart-table-view";
import { ChartCircleView } from "./chart-circle-view";
import { ChartVisualView } from "./chart-visual-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <div className="w-full mx-auto">
            <Tabs defaultValue="visual" className="w-auto">
                <TabsList className="flex w-full grid-cols-3 mb-6 items-center p-1 bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm h-auto">
                    <TabsTrigger value="visual" className="relative flex-1 text-center px-3 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300">
                        Visual
                    </TabsTrigger>
                    <TabsTrigger value="table" className="relative flex-1 text-center px-3 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300">
                        Table
                    </TabsTrigger>
                    <TabsTrigger value="circle" className="relative flex-1 text-center px-3 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300">
                        Circle
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="w-full mt-0">
                    <ChartVisualView data={chartData} />
                </TabsContent>

                <TabsContent value="table" className="w-full flex justify-center mt-0">
                    <ChartTableView data={chartData} />
                </TabsContent>

                <TabsContent value="circle" className="w-full flex justify-center mt-0">
                    <ChartCircleView data={chartData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}