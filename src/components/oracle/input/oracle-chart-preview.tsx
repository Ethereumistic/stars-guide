"use client"

import { useMemo } from "react"
import { X, Info } from "lucide-react"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import type { ChartData } from "@/lib/birth-chart/full-chart"
import type { BirthChartDepth } from "@/lib/oracle/features"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { planetUIConfig } from "@/config/planet-ui"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ── Big Three placements to display ──────────────────────────────────────────
const BIG_THREE = [
  { body: "Sun", key: "sun", label: "Sun" },
  { body: "Moon", key: "moon", label: "Moon" },
  { body: "Ascendant", key: "rising", label: "Asc" },
] as const

interface OracleChartPreviewProps {
  birthData?: OracleBirthData | null
  username?: string | null
  depth?: BirthChartDepth
  onDepthChange?: (depth: BirthChartDepth) => void
  onDismiss?: () => void
}

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

export function OracleChartPreview({
  birthData,
  username,
  depth = "core",
  onDepthChange,
  onDismiss,
}: OracleChartPreviewProps) {
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

  // Dominant element from Sun sign for card glow
  const sunSign = compositionalSigns.find(
    (s) => s.name === (birthData ? getSignForBody(birthData, "Sun") : null),
  )
  const dominantElement = sunSign?.element
  const dominantElementUi = dominantElement ? elementUIConfig[dominantElement] : null

  if (!chartData) return null

  return (
    <div className="flex justify-end">
      <div className="relative">
        {/* ── Dismiss X: above the card, top-right ── */}
        {onDismiss && (
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Dismiss chart"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className="group/card relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
          style={{
            boxShadow: dominantElementUi
              ? `0 0 40px -15px ${dominantElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
              : "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* ── Header: title + depth toggle ── */}
          <div className="relative flex items-center justify-between px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm tracking-[0.2em] text-white font-serif font-medium truncate">
                {username ?? "Unknown"}&apos;s chart
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-white/25 hover:text-white/50 transition-colors shrink-0 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-balance">
                    <p className="leading-relaxed">
                      Oracle reads a deterministic server translation of your calculated chart. Your visual report is a separate reading experience.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="shrink-0 rounded-full border border-galactic/30 bg-galactic/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-galactic">
              Chart data
            </span>
          </div>

          {/* ── Chart circle ── */}
          <div className="relative -mt-1">
            {dominantElementUi && (
              <div
                className="absolute inset-0 opacity-20 blur-2xl scale-75"
                style={{ background: dominantElementUi.styles.gradient }}
              />
            )}
            <ChartCircleView data={chartData} />
          </div>

          {/* ── Big Three: 3×2 grid ── */}
          <div className="border-t border-white/[0.06]">
            <div className="grid grid-cols-3 overflow-hidden divide-x divide-white/[0.06]">
              {/* Row 1: Planet glyphs */}
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
              {/* Row 2: Sign icons with element frames */}
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
    </div>
  )
}
