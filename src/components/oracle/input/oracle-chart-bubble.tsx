"use client"

import { useMemo } from "react"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import type { ChartData } from "@/lib/birth-chart/full-chart"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { planetUIConfig } from "@/config/planet-ui"
import type { BirthChartDepth } from "@/lib/oracle/features"

const BIG_THREE = [
  { body: "Sun", key: "sun", label: "Sun" },
  { body: "Moon", key: "moon", label: "Moon" },
  { body: "Ascendant", key: "rising", label: "Asc" },
] as const

function getSignForBody(birthData: OracleBirthData, body: string) {
  const legacy = birthData.placements?.find((p) => p.body === body)
  if (legacy) return legacy.sign

  if (body === "Ascendant" && birthData.chart?.ascendant) {
    return compositionalSigns.find((s) => s.id === birthData.chart!.ascendant!.signId)?.name
  }

  const id = body.toLowerCase().replace(/ /g, "_")
  const planet = birthData.chart?.planets?.find((p) => p.id === id)
  if (planet) {
    return compositionalSigns.find((s) => s.id === planet.signId)?.name
  }

  return null
}

interface OracleChartBubbleProps {
  birthData?: OracleBirthData | null
  username?: string | null
  depth?: BirthChartDepth
}

export function OracleChartBubble({
  birthData,
  username,
  depth = "core",
}: OracleChartBubbleProps) {
  const chartData = useMemo((): ChartData | null => {
    if (!birthData?.chart?.ascendant || !birthData?.chart?.planets) {
      return null
    }
    return {
      ascendant: birthData.chart.ascendant,
      planets: birthData.chart.planets,
      houses: birthData.chart.houses,
      aspects: birthData.chart.aspects,
    }
  }, [birthData])

  const placements = useMemo(() => {
    return BIG_THREE.map(({ body, key, label }) => {
      const signName = birthData ? getSignForBody(birthData, body) : null
      if (!signName) return null

      const sign = compositionalSigns.find((s) => s.name === signName)
      if (!sign) return null

      const signUi = zodiacUIConfig[sign.id]
      const elementUi = elementUIConfig[sign.element]
      const planetUi = planetUIConfig[key]
      const Icon = signUi?.icon

      return { body, label, sign, signUi, elementUi, planetUi, Icon }
    }).filter(Boolean)
  }, [birthData])

  const sunSign = compositionalSigns.find(
    (s) => s.name === (birthData ? getSignForBody(birthData, "Sun") : null),
  )
  const dominantElement = sunSign?.element
  const dominantElementUi = dominantElement ? elementUIConfig[dominantElement] : null

  if (!chartData) return null

  return (
    <div className="flex justify-end">
      <div
        className="relative w-[45%] min-w-[240px] max-w-[320px] rounded-2xl rounded-br-md overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl"
        style={{
          boxShadow: dominantElementUi
            ? `0 0 30px -15px ${dominantElementUi.styles.glow}`
            : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <p className="text-xs tracking-[0.15em] text-white/70 font-serif font-medium truncate">
            {username ?? "Unknown"}&apos;s chart
          </p>
          {depth === "full" && (
            <span className="text-[8px] uppercase tracking-[0.15em] text-galactic/80 font-semibold bg-galactic/10 border border-galactic/20 rounded-full px-1.5 py-0.5">
              Full depth
            </span>
          )}
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
    </div>
  )
}
