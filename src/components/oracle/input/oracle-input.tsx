"use client"

import * as React from "react"
import { Plus, Send, Sparkles, Wand2, X } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"

import { OracleSignPreviewCards } from "@/components/oracle/input/oracle-sign-preview-cards"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import {
  ORACLE_FEATURES,
  type OracleFeatureKey,
  getOracleFeature,
  isBirthChartFeature,
} from "@/lib/oracle/features"

interface OracleInputProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  disabled?: boolean
  canSubmit?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  featureKey?: OracleFeatureKey | null
  onFeatureSelect: (featureKey: OracleFeatureKey) => void
  onFeatureClear: () => void
  birthData?: OracleBirthData | null
}

export function OracleInput({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  canSubmit = false,
  inputRef,
  featureKey,
  onFeatureSelect,
  onFeatureClear,
  birthData,
}: OracleInputProps) {
  const activeFeature = getOracleFeature(featureKey)
  const showBirthPreview = isBirthChartFeature(featureKey)

  // Check journal consent for features that require it
  const consent = useQuery(api.journal.consent.getConsent)

  // A feature requires journal consent and the user hasn't granted it
  function isFeatureDisabled(feat: typeof ORACLE_FEATURES[number]): boolean {
    if (!feat.implemented) return true
    if (feat.requiresJournalConsent) {
      // consent is undefined while loading, null if no record, object if exists
      if (consent === undefined) return true // still loading
      if (consent === null) return true // no consent record
      if (!consent.oracleCanReadJournal) return true // revoked
    }
    return false
  }

  function getFeatureDisabledReason(feat: typeof ORACLE_FEATURES[number]): string | null {
    if (!feat.implemented) return "Coming soon"
    if (feat.requiresJournalConsent) {
      if (consent === undefined) return "Loading…"
      if (consent === null || !consent?.oracleCanReadJournal) return "Requires journal access — enable in Journal Settings"
    }
    return null
  }

  // Separate features into menu groups
  const primaryFeatureItems = ORACLE_FEATURES.filter(
    (feature) => feature.menuGroup === "primary",
  )
  const moreFeatureItems = ORACLE_FEATURES.filter(
    (feature) => feature.menuGroup === "more",
  )

  return (
    <div className="space-y-3">
      {activeFeature ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-galactic/35 bg-galactic/12 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl">
            <Sparkles className="size-3.5 text-galactic" />
            <span className="tracking-wide">{activeFeature.shortLabel}</span>
            <button
              type="button"
              onClick={onFeatureClear}
              className="rounded-full p-0.5 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label={`Clear ${activeFeature.shortLabel}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-white/35">
            Feature mode
          </span>
        </div>
      ) : null}

      {showBirthPreview ? <OracleSignPreviewCards birthData={birthData} /> : null}

      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-galactic/20 via-primary/10 to-galactic/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
        <div className="relative flex items-center bg-background/90 backdrop-blur-2xl border border-white/10 focus-within:border-galactic/50 rounded-2xl p-1.5 shadow-xl transition-all h-14 gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-white/40 hover:text-white hover:bg-white/10 focus-visible:ring-0 transition-colors h-10 w-10 rounded-xl"
                aria-label="Open Oracle feature menu"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 border-galactic/20 bg-background/95 backdrop-blur-xl"
              align="start"
            >
              {primaryFeatureItems.map((feature) => {
                const disabled = isFeatureDisabled(feature)
                const reason = getFeatureDisabledReason(feature)

                return (
                  <DropdownMenuItem
                    key={feature.key}
                    disabled={disabled}
                    className="gap-2.5 cursor-pointer text-white/80 hover:text-white focus:text-white"
                    onSelect={() => !disabled && onFeatureSelect(feature.key)}
                  >
                    <Wand2 className="w-4 h-4 text-galactic" />
                    <span className="text-sm">{feature.label}</span>
                    {reason && (
                      <span className="ml-auto text-[10px] text-white/30">{reason}</span>
                    )}
                  </DropdownMenuItem>
                )
              })}

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5 text-white/80 focus:text-white">
                  <Sparkles className="w-4 h-4 text-galactic" />
                  <span className="text-sm">More</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 border-galactic/20 bg-background/95 backdrop-blur-xl">
                  {moreFeatureItems.map((feature) => {
                    const disabled = isFeatureDisabled(feature)
                    return (
                      <DropdownMenuItem
                        key={feature.key}
                        disabled={disabled}
                        className="gap-2.5 text-white/80"
                      >
                        <Wand2 className="w-4 h-4 text-galactic" />
                        <span className="text-sm">{feature.label}</span>
                        <DropdownMenuShortcut>Soon</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSubmit && !disabled) {
                onSubmit()
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none hover:bg-transparent hover:border-0 hover:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/30 text-sm md:text-base font-sans px-2 shadow-none disabled:opacity-50"
            aria-label="Oracle message input"
          />

          <Button
            type="button"
            size="icon"
            onClick={onSubmit}
            disabled={!canSubmit || disabled}
            className={`shrink-0 rounded-xl transition-all h-10 w-10 ${canSubmit && !disabled
              ? "bg-galactic text-white shadow-[0_0_15px_rgba(157,78,221,0.5)] hover:bg-galactic/90"
              : "bg-white/10 text-white/30 hover:bg-white/20 hover:text-white/50"
              }`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}