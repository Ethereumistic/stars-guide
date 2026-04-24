"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";
import { ChartTableView } from "./chart-table-view";
import { ChartCircleView } from "./chart-circle-view";
import { PageHeader } from "@/components/layout/page-header";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Table2, CircleDot } from "lucide-react";

interface BirthData {
    date: string;
    location: {
        lat: number;
        long: number;
    };
    time: string;
}

export function NatalChart({ birthData }: { birthData: BirthData }) {
    const [visualization, setVisualization] = useState<string>("circle");

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

    const filterControl = (
        <Tabs value={visualization} onValueChange={setVisualization} className="w-fit rounded-md mx-auto md:mx-0">
            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-2 justify-center">
                <TabsTrigger
                    value="table"
                    className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                >
                    <Table2 className="size-5 md:size-4 md:mr-2 text-primary" />
                    <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">
                        Table
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">
                        Table
                    </span>
                </TabsTrigger>
                <TabsTrigger
                    value="circle"
                    className="relative w-20 md:w-24 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                >
                    <CircleDot className="size-5 md:size-4 md:mr-2 text-primary" />
                    <span className="font-mono text-sm md:text-xs uppercase tracking-wider md:hidden">
                        Circle
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider hidden md:inline">
                        Circle
                    </span>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <PageHeader
                breadcrumbs={[
                    { label: "Home", href: "/" },
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Birth Chart" },
                ]}
                title="Your"
                subtitle="Birth Chart"
                customFilter={filterControl}
                filterLabel=""
                showElementFilter={false}
            />

            {visualization === "table" ? (
                <ChartTableView data={chartData} />
            ) : (
                <div className="w-full flex justify-center">
                    <ChartCircleView data={chartData} />
                </div>
            )}
        </motion.div>
    );
}