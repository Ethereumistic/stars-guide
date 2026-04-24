"use client"

import React, { useMemo } from "react"
import { motion } from "motion/react"
import { calculateFullChart } from "@/lib/birth-chart/full-chart"
import { ChartTableView } from "@/components/dashboard/natal-chart/chart-table-view"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { ChartVisualView } from "@/components/dashboard/natal-chart/chart-visual-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BirthData } from "./types"

interface NatalChartDualViewProps {
    birthData: BirthData
    delay?: number
}

export function NatalChartDualView({ birthData, delay = 0 }: NatalChartDualViewProps) {
    const chartData = useMemo(() => {
        try {
            const [yearStr, monthStr, dayStr] = birthData.date.split("-")
            const [hoursStr, minutesStr] = birthData.time.split(":")

            const year = parseInt(yearStr, 10)
            const month = parseInt(monthStr, 10)
            const day = parseInt(dayStr, 10)
            const hours = parseInt(hoursStr, 10)
            const minutes = parseInt(minutesStr, 10)

            if (
                isNaN(year) || isNaN(month) || isNaN(day) ||
                isNaN(hours) || isNaN(minutes) ||
                typeof birthData.location?.lat !== "number" ||
                typeof birthData.location?.long !== "number"
            ) {
                return null
            }

            return calculateFullChart(
                year,
                month,
                day,
                hours,
                minutes,
                birthData.location.lat,
                birthData.location.long
            )
        } catch (error) {
            console.error("Error calculating natal chart:", error)
            return null
        }
    }, [birthData])

    if (!chartData) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                className="p-8 text-center text-white/50 bg-white/5 rounded-xl border border-white/10"
            >
                Incomplete birth data for chart visualization.
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            {/* Section header */}
            <h3 className="text-[10px] font-serif uppercase tracking-[0.3em] text-primary/40 text-center mb-6">
                Natal Chart
            </h3>

            {/* Desktop: side-by-side layout */}
            <div className="hidden lg:grid grid-cols-2 gap-6 items-start">
                {/* Table view — remove the scale-80 hack, let it use natural width */}
                <div className="w-full">
                    <ChartTableView data={chartData} />
                </div>
                {/* Circle view */}
                <div className="w-full flex justify-center">
                    <div className="w-full max-w-md">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            </div>

            {/* Mobile: tabbed layout (same as current) */}
            <div className="lg:hidden">
                <Tabs defaultValue="circle" className="w-auto">
                    <TabsList className="flex w-full grid-cols-2 mb-6 items-center p-1 bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm h-auto">
                        <TabsTrigger
                            value="circle"
                            className="relative w-24 text-center px-4 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Circle
                        </TabsTrigger>
                        <TabsTrigger
                            value="table"
                            className="relative w-24 text-center px-4 py-2 text-xs font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                        >
                            Table
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="circle" className="w-full flex justify-center mt-0">
                        <div className="w-full max-w-sm">
                            <ChartCircleView data={chartData} />
                        </div>
                    </TabsContent>
                    <TabsContent value="table" className="w-full flex justify-center mt-0">
                        <ChartTableView data={chartData} />
                    </TabsContent>
                </Tabs>
            </div>
        </motion.div>
    )
}