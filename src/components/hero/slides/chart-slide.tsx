"use client";

import { motion } from "motion/react";
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view";
import { calculateFullChart } from "@/lib/birth-chart/full-chart";

type FullChart = ReturnType<typeof calculateFullChart>;

/* ── Chart Slide ────────────────────────────────────────────── */

export function ChartSlide({ data }: { data: FullChart }) {
  return (
    <motion.div
      key="chart"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full h-full"
    >
      <ChartCircleView data={data} />
    </motion.div>
  );
}