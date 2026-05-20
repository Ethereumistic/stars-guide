"use client"

import { useMemo } from "react"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import type { StoredBirthData } from "@/lib/birth-chart/types"
import type { ChartData } from "@/lib/birth-chart/full-chart"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { planetUIConfig } from "@/config/planet-ui"
import type { BirthChartDepth } from "@/lib/oracle/features"

// ── Shared helpers (same logic as OracleChartBubble & SynastryCard) ────────────

const BIG_THREE = [
  { body: "Sun", key: "sun", label: "Sun" },
  { body: "Moon", key: "moon", label: "Moon" },
  { body: "Ascendant", key: "rising", label: "Asc" },
] as const

function getSignForBody(birthData: OracleBirthData | StoredBirthData | null | undefined, body: string): string | null {
  if (!birthData) return null
  const legacy = (birthData as any).placements?.find((p: any) => p.body === body)
  if (legacy) return legacy.sign

  if (body === "Ascendant" && (birthData as any).chart?.ascendant) {
    return compositionalSigns.find((s) => s.id === (birthData as any).chart.ascendant.signId)?.name ?? null
  }

  const id = body.toLowerCase().replace(/ /g, "_")
  const planet = (birthData as any).chart?.planets?.find((p: any) => p.id === id)
  if (planet) {
    return compositionalSigns.find((s) => s.id === planet.signId)?.name ?? null
  }

  return null
}

function buildChartData(birthData: OracleBirthData | StoredBirthData | null | undefined): ChartData | null {
  if (!birthData || !(birthData as any).chart?.ascendant || !(birthData as any).chart?.planets) return null
  return {
    ascendant: (birthData as any).chart.ascendant,
    planets: (birthData as any).chart.planets,
    houses: (birthData as any).chart.houses,
    aspects: (birthData as any).chart.aspects,
  }
}

function ChartPreview({ chartData, birthData, label }: { chartData: ChartData; birthData: any; label: string }) {
  const placements = useMemo(() => {
    return BIG_THREE.map(({ body, key, label: lbl }) => {
      const signName = getSignForBody(birthData, body)
      if (!signName) return null

      const sign = compositionalSigns.find((s) => s.name === signName)
      if (!sign) return null

      const signUi = zodiacUIConfig[sign.id]
      const elementUi = elementUIConfig[sign.element]
      const planetUi = planetUIConfig[key]
      const Icon = signUi?.icon

      return { body, key, label: lbl, sign, signUi, elementUi, planetUi, Icon }
    }).filter(Boolean)
  }, [birthData])

  const sunSign = useMemo(() => {
    const signName = getSignForBody(birthData, "Sun")
    return signName ? compositionalSigns.find((s) => s.name === signName) : null
  }, [birthData])

  const dominantElement = sunSign?.element
  const dominantElementUi = dominantElement ? elementUIConfig[dominantElement] : null

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl"
      style={{
        boxShadow: dominantElementUi
          ? `0 0 30px -15px ${dominantElementUi.styles.glow}`
          : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <p className="text-xs tracking-[0.15em] text-white/70 font-serif font-medium truncate">
          {label}&apos;s chart
        </p>
      </div>

      {/* Chart circle */}
      <div className="relative -mt-1">
        {dominantElementUi && (
          <div
            className="absolute inset-0 opacity-20 blur-2xl scale-75"
            style={{ background: dominantElementUi.styles.gradient }}
          />
        )}
        <ChartCircleView data={chartData} />
      </div>

      {/* Big Three: 3×2 grid */}
      <div className="border-t border-white/[0.08]">
        <div className="grid grid-cols-3 overflow-hidden divide-x divide-white/[0.06]">
          {placements.map((p) => {
            if (!p) return null
            const { body, elementUi } = p
            return (
              <div
                key={body}
                className="relative flex items-center justify-center py-1.5 border-b border-white/[0.06]"
              >
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{ background: elementUi.styles.gradient }}
                />
                <span className="relative z-10 text-lg leading-none text-white">
                  {p.planetUi.rulerSymbol}
                </span>
              </div>
            )
          })}
          {placements.map((p) => {
            if (!p) return null
            const { body, elementUi, Icon } = p
            return (
              <div
                key={body}
                className="relative flex items-center justify-center py-2.5 overflow-hidden"
              >
                <img
                  src={elementUi.frameUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain opacity-50 pointer-events-none"
                />
                <div
                  className="absolute inset-0 blur-md opacity-20"
                  style={{ backgroundColor: elementUi.styles.glow }}
                />
                {Icon && (
                  <Icon
                    className="relative z-10 w-6 h-6 text-amber-100"
                    style={{
                      filter: `drop-shadow(0 0 6px ${elementUi.styles.glow})`,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SynastryChartBubbleProps {
  chartAData: OracleBirthData
  chartBData: StoredBirthData
  username: string | null | undefined
  chartBName: string
}

export function SynastryChartBubble({
  chartAData,
  chartBData,
  username,
  chartBName,
}: SynastryChartBubbleProps) {
  const chartA = useMemo(() => buildChartData(chartAData), [chartAData])
  const chartB = useMemo(() => buildChartData(chartBData), [chartBData])

  if (!chartA || !chartB) return null

  return (
    <div className="flex justify-end">
      <div className="flex w-full max-w-[600px] gap-2">
        <div className="flex-1">
          <ChartPreview
            chartData={chartA}
            birthData={chartAData}
            label={username ?? "You"}
          />
        </div>
        <div className="flex-1">
          <ChartPreview
            chartData={chartB}
            birthData={chartBData}
            label={chartBName}
          />
        </div>
      </div>
    </div>
  )
}