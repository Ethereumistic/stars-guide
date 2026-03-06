"use client"

import { compositionalSigns } from "@/astrology/signs"
import { elementUIConfig } from "@/config/elements-ui"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import { Card, CardContent } from "@/components/ui/card"

const PRIMARY_BODIES = [
  { body: "Sun", label: "Sun" },
  { body: "Moon", label: "Moon" },
  { body: "Ascendant", label: "Ascendant" },
] as const

interface OracleSignPreviewCardsProps {
  birthData?: OracleBirthData | null
}

export function OracleSignPreviewCards({ birthData }: OracleSignPreviewCardsProps) {
  if (!birthData?.placements?.length) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PRIMARY_BODIES.map(({ body, label }) => {
        const placement = birthData.placements.find((entry) => entry.body === body)
        if (!placement) {
          return null
        }

        const sign = compositionalSigns.find((entry) => entry.name === placement.sign)
        if (!sign) {
          return null
        }

        const signUi = zodiacUIConfig[sign.id]
        const elementUi = elementUIConfig[sign.element]
        const Icon = signUi?.icon
        const ElementIcon = elementUi.icon

        return (
          <Card
            key={body}
            className="relative overflow-hidden border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
          >
            <div
              className="absolute inset-0 opacity-25"
              style={{ background: elementUi.styles.gradient }}
            />
            <CardContent className="relative flex min-h-28 items-center gap-4 p-4">
              <div
                className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20"
                style={{ boxShadow: `0 0 20px -10px ${elementUi.styles.glow}` }}
              >
                {Icon ? (
                  <Icon
                    className="size-7 text-white"
                    style={{ filter: `drop-shadow(0 0 8px ${elementUi.styles.glow})` }}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                  {label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="truncate font-serif text-lg text-white">
                    {placement.sign}
                  </span>
                  <ElementIcon
                    className="size-3.5 shrink-0"
                    style={{ color: elementUi.styles.primary }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/55">House {placement.house}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
