"use client"

import { useMemo } from "react"
import { X, Plus } from "lucide-react"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import type { ChartData } from "@/lib/birth-chart/full-chart"
import type { BirthChartDepth } from "@/lib/oracle/features"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { planetUIConfig } from "@/config/planet-ui"

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
      <div
        className="group/card relative w-[45%] min-w-[200px] max-w-[320px] rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
        style={{
          boxShadow: dominantElementUi
            ? `0 0 40px -15px ${dominantElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Dismiss X (hover only) ── */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 z-20 flex items-center justify-center size-6 rounded-full bg-black/40 border border-white/10 text-white/0 group-hover/card:text-white/60 hover:!text-white hover:!bg-white/15 transition-all duration-200"
            aria-label="Dismiss chart"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* ── Depth toggle (+ button) ── */}
        {onDepthChange && (
          <button
            type="button"
            onClick={() => onDepthChange(depth === "core" ? "full" : "core")}
            className={`
              absolute top-2 left-2 z-20 flex items-center justify-center
              size-6 rounded-full border transition-all duration-200
              ${depth === "full"
                ? "border-galactic/50 bg-galactic/25 text-white shadow-[0_0_10px_rgba(157,78,221,0.35)]"
                : "border-white/10 bg-black/30 text-white/30 hover:bg-white/10 hover:text-white/60"
              }
            `}
            aria-label={depth === "full" ? "Switch to core depth" : "Enable full depth"}
            title={depth === "full" ? "Full depth active" : "Enable full depth"}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        {/* ── Username header ── */}
        <div className="relative px-3 pt-2.5 pb-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium truncate">
            {username ?? "Unknown"}&apos;s chart
          </p>
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

        {/* ── Big Three Grid: 2 rows × 3 columns ── */}
        <div className="relative px-3 pb-3 pt-1">
          {/* Depth badge */}
          {depth === "full" && (
            <div className="absolute top-0 right-3 flex items-center">
              <span className="text-[8px] uppercase tracking-[0.18em] text-galactic/70 font-semibold bg-galactic/10 border border-galactic/20 rounded-full px-1.5 py-0.5">
                Full depth
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1">
            {placements.map((p) => {
              if (!p) return null
              const { body, label, sign, signUi, elementUi, planetUi, Icon } = p

              return (
                <div key={body} className="flex flex-col items-center">
                  {/* ── Top cell: Planet glyph ── */}
                  <div className="w-full flex items-center justify-center py-1.5 rounded-t-lg bg-white/[0.04] border border-white/[0.06] border-b-0">
                    <span
                      className="text-lg leading-none"
                      style={{ color: planetUi.themeColor }}
                    >
                      {planetUi.rulerSymbol}
                    </span>
                  </div>

                  {/* ── Bottom cell: Sign icon on element frame ── */}
                  <div
                    className="relative w-full flex items-center justify-center py-2.5 rounded-b-lg bg-white/[0.04] border border-white/[0.06] border-t-0 overflow-hidden"
                  >
                    {/* Element frame image */}
                    <img
                      src={elementUi.frameUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain opacity-50 pointer-events-none"
                    />

                    {/* Element glow behind icon */}
                    <div
                      className="absolute inset-0 blur-md opacity-20"
                      style={{ backgroundColor: elementUi.styles.glow }}
                    />

                    {/* Sign icon */}
                    {Icon && (
                      <Icon
                        className="relative z-10 w-6 h-6 text-amber-100"
                        style={{
                          filter: `drop-shadow(0 0 6px ${elementUi.styles.glow})`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
