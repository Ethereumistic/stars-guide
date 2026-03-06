"use client";

import React, { useMemo } from "react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartTableView } from "./chart-table-view";
import { ChartCircleView } from "./chart-circle-view";
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
        <div className="w-full max-w-lg mx-auto">
            <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0F0F0F] border border-white/10">
                    <TabsTrigger value="table" className="font-mono tracking-widest uppercase data-[state=active]:bg-white/10 data-[state=active]:text-white">
                        Table
                    </TabsTrigger>
                    <TabsTrigger value="circle" className="font-mono tracking-widest uppercase data-[state=active]:bg-white/10 data-[state=active]:text-white">
                        Circle
                    </TabsTrigger>
                </TabsList>

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
