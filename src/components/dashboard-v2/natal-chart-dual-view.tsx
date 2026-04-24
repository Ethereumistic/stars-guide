"use client"

import React, { useMemo } from "react"
import { motion } from "motion/react"
import { calculateFullChart } from "@/lib/birth-chart/full-chart"
import { ChartTableView } from "@/components/dashboard/natal-chart/chart-table-view"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
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
                        <span className="text-primary"
                        >Birth Chart</span>
                    </h3>
                    <div className="w-full flex justify-center">
                        <ChartCircleView data={chartData} />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}