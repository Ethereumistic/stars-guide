"use client"

import * as React from "react"
import { X, UserPlus, Loader2, AlertCircle, CalendarDays, ChevronLeft, Star } from "lucide-react"
import { format } from "date-fns"
import type { IconType } from "react-icons"
import { IoHeart } from "react-icons/io5"
import { GiRing, GiShatteredHeart } from "react-icons/gi"
import { FaUserFriends, FaBaby, FaBriefcase, FaHandshake, FaGraduationCap, FaStar, FaUser, FaMale, FaFemale } from "react-icons/fa"
import { FaHeartPulse, FaPeopleArrows } from "react-icons/fa6"
import { MdFamilyRestroom } from "react-icons/md"
import { motion, AnimatePresence } from "motion/react"
import type { OracleBirthData } from "@/lib/oracle/featureContext"
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view"
import { compositionalSigns } from "@/astrology/signs"
import { zodiacUIConfig } from "@/config/zodiac-ui"
import { elementUIConfig } from "@/config/elements-ui"
import { planetUIConfig } from "@/config/planet-ui"
import { buildStoredBirthData } from "@/lib/birth-chart/storage"
import type { StoredBirthData, BirthLocation } from "@/lib/birth-chart/types"
import { LocationAutocompleteCompact } from "@/components/ui/location-autocomplete-compact"
import type { GeocodingResult } from "@/lib/geocoding"
import { FriendChartImport } from "@/components/oracle/input/friend-chart-import"
import type { SynastryState } from "@/store/use-oracle-store"
import type { ChartData } from "@/lib/birth-chart/full-chart"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// ── Big Three placements to display ──────────────────────────────────────────
const BIG_THREE = [
  { body: "Sun", key: "sun", label: "Sun" },
  { body: "Moon", key: "moon", label: "Moon" },
  { body: "Ascendant", key: "rising", label: "Asc" },
] as const

// ── Relationship categories (two-layer) ─────────────────────────────────────

interface RelationshipOption {
  value: string
  label: string
  icon: IconType
}

interface RelationshipCategory {
  key: string
  label: string
  icon: IconType
  description: string
  options: RelationshipOption[]
}

const RELATIONSHIP_CATEGORIES: RelationshipCategory[] = [
  {
    key: "family",
    label: "Family",
    icon: MdFamilyRestroom,
    description: "Blood relatives & family",
    options: [
      { value: "mother", label: "Mother", icon: FaFemale },
      { value: "father", label: "Father", icon: FaMale },
      { value: "brother", label: "Brother", icon: FaMale },
      { value: "sister", label: "Sister", icon: FaFemale },
      { value: "grandmother", label: "Grandmother", icon: FaFemale },
      { value: "grandfather", label: "Grandfather", icon: FaMale },
      { value: "cousin", label: "Cousin", icon: FaUserFriends },
      { value: "uncle", label: "Uncle", icon: FaMale },
      { value: "aunt", label: "Aunt", icon: FaFemale },
    ],
  },
  {
    key: "romantic",
    label: "Romantic",
    icon: IoHeart,
    description: "Love & partnership",
    options: [
      { value: "boyfriend", label: "Boyfriend", icon: FaMale },
      { value: "girlfriend", label: "Girlfriend", icon: FaFemale },
      { value: "husband", label: "Husband", icon: GiRing },
      { value: "wife", label: "Wife", icon: GiRing },
      { value: "fiance", label: "Fiancé(e)", icon: GiRing },
      { value: "ex_boyfriend", label: "Ex-Boyfriend", icon: GiShatteredHeart },
      { value: "ex_girlfriend", label: "Ex-Girlfriend", icon: GiShatteredHeart },
      { value: "crush", label: "Crush", icon: FaHeartPulse },
    ],
  },
  {
    key: "friend",
    label: "Friend",
    icon: FaUserFriends,
    description: "Platonic bonds",
    options: [
      { value: "best_friend", label: "Best Friend", icon: FaUserFriends },
      { value: "close_friend", label: "Close Friend", icon: FaUserFriends },
      { value: "friend", label: "Friend", icon: FaUserFriends },
    ],
  },
  {
    key: "university",
    label: "University",
    icon: FaGraduationCap,
    description: "Study & campus",
    options: [
      { value: "teacher", label: "Teacher", icon: FaGraduationCap },
      { value: "professor", label: "Professor", icon: FaGraduationCap },
      { value: "classmate", label: "Classmate", icon: FaUserFriends },
      { value: "roommate", label: "Roommate", icon: FaUserFriends },
      { value: "study_partner", label: "Study Partner", icon: FaUserFriends },
    ],
  },
  {
    key: "work",
    label: "Work",
    icon: FaBriefcase,
    description: "Professional ties",
    options: [
      { value: "coworker", label: "Coworker", icon: FaBriefcase },
      { value: "boss", label: "Boss", icon: FaBriefcase },
      { value: "business_partner", label: "Business Partner", icon: FaHandshake },
      { value: "mentor", label: "Mentor", icon: FaGraduationCap },
      { value: "colleague", label: "Colleague", icon: FaBriefcase },
    ],
  },
  {
    key: "celebrity",
    label: "Celebrity",
    icon: FaStar,
    description: "Public figures",
    options: [
      { value: "celebrity", label: "Celebrity", icon: FaStar },
      { value: "public_figure", label: "Public Figure", icon: FaStar },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSignForBody(birthData: any, body: string): string | null {
  if (!birthData) return null
  const legacy = birthData.placements?.find((p: any) => p.body === body)
  if (legacy) return legacy.sign

  if (body === "Ascendant" && birthData.chart?.ascendant) {
    return compositionalSigns.find((s) => s.id === birthData.chart.ascendant.signId)?.name ?? null
  }

  const id = body.toLowerCase().replace(/ /g, "_")
  const planet = birthData.chart?.planets?.find((p: any) => p.id === id)
  if (planet) {
    return compositionalSigns.find((s) => s.id === planet.signId)?.name ?? null
  }

  return null
}

/** Find the category key for a given relationship value, or null */
function findCategoryForRelationship(value: string): string | null {
  for (const cat of RELATIONSHIP_CATEGORIES) {
    if (cat.options.some((o) => o.value === value)) return cat.key
  }
  return null
}

/** Find the RelationshipOption for a given value */
function findRelationshipOption(value: string): RelationshipOption | null {
  for (const cat of RELATIONSHIP_CATEGORIES) {
    const found = cat.options.find((o) => o.value === value)
    if (found) return found
  }
  return null
}

// ── Chart Preview Card ───────────────────────────────────────────────────────

interface ChartPreviewCardProps {
  chartData: ChartData | null
  birthData: any
  label: string
  dominantElementUi: any
  onClear?: () => void
  compact?: boolean
}

function ChartPreviewCard({
  chartData,
  birthData,
  label,
  dominantElementUi,
  onClear,
  compact,
}: ChartPreviewCardProps) {
  const placements = React.useMemo(() => {
    return BIG_THREE.map(({ body, key, label }) => {
      const signName = birthData ? getSignForBody(birthData, body) : null
      if (!signName) return null

      const sign = compositionalSigns.find((s) => s.name === signName)
      if (!sign) return null

      const signUi = zodiacUIConfig[sign.id]
      const elementUi = elementUIConfig[sign.element]
      const planetUi = planetUIConfig[key]
      const Icon = signUi?.icon

      return { body, key, label, sign, signUi, elementUi, planetUi, Icon }
    }).filter(Boolean)
  }, [birthData])

  if (!chartData) return null

  // ── Compact mode: mini indicator line ──
  if (compact) {
    const sunSignName = birthData ? getSignForBody(birthData, "Sun") : null
    const moonSignName = birthData ? getSignForBody(birthData, "Moon") : null
    const risingSignName = birthData ? getSignForBody(birthData, "Ascendant") : null

    return (
      <div
        className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
        style={{
          boxShadow: dominantElementUi
            ? `0 0 20px -10px ${dominantElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {dominantElementUi && (
          <div
            className="absolute inset-0 rounded-xl opacity-10"
            style={{ background: dominantElementUi.styles.gradient }}
          />
        )}
        <div className="relative z-10 flex items-center gap-2 overflow-hidden">
          <p className="text-xs tracking-wide text-white font-serif font-medium truncate">{label}</p>
          {sunSignName && (
            <span className="text-[10px] text-white/40">
              ☉ {sunSignName}
              {moonSignName && ` · ☽ ${moonSignName}`}
              {risingSignName && ` · Asc ${risingSignName}`}
            </span>
          )}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="relative z-10 flex items-center justify-center size-4 rounded-full text-white/20 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0 ml-auto"
            aria-label="Remove chart"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  // ── Full card mode (for import phase) ──
  return (
    <div
      className="group/card relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
      style={{
        boxShadow: dominantElementUi
          ? `0 0 40px -15px ${dominantElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
          : "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Header ── */}
      <div className="relative flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm tracking-[0.2em] text-white font-serif font-medium truncate">
            {label}
          </p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0"
            aria-label="Remove chart"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
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

// ── Panel Card ───────────────────────────────────────────────────────────────

interface PanelCardProps {
  dominantElementUi?: any
  children: React.ReactNode
}

function PanelCard({ dominantElementUi, children }: PanelCardProps) {
  return (
    <div
      className="group/card relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
      style={{
        boxShadow: dominantElementUi
          ? `0 0 40px -15px ${dominantElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
          : "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  )
}

// ── Main Synastry Card ───────────────────────────────────────────────────────

interface SynastryCardProps {
  birthData?: OracleBirthData | null
  username?: string | null
  synastryData: SynastryState | null
  onSetChartB: (data: StoredBirthData, name: string, source: "friend" | "custom", friendUserId?: string) => void
  onSetRelationship: (relationship: string, category?: string) => void
  onDismiss?: () => void
  onClearChartB?: () => void
}

type Step = "add_chart" | "select_relationship"
type SourceTab = "custom" | "friends"

export function SynastryCard({
  birthData,
  username,
  synastryData,
  onSetChartB,
  onSetRelationship,
  onDismiss,
  onClearChartB,
}: SynastryCardProps) {
  const [step, setStep] = React.useState<Step>(
    synastryData?.chartB ? "select_relationship" : "add_chart"
  )
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [customRelationship, setCustomRelationship] = React.useState("")
  const [sourceTab, setSourceTab] = React.useState<SourceTab>("custom")

  // ── Custom input state ──
  const [customName, setCustomName] = React.useState("")
  const [customDate, setCustomDate] = React.useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [customTime, setCustomTime] = React.useState("")
  const [customLocation, setCustomLocation] = React.useState<GeocodingResult | null>(null)
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [calculationError, setCalculationError] = React.useState<string | null>(null)
  const [timeUnavailable, setTimeUnavailable] = React.useState(false)

  const hasChartB = Boolean(synastryData?.chartB)
  const hasRelationship = Boolean(synastryData?.relationship)
  const isReady = hasChartB && hasRelationship

  // Reset step when data changes
  React.useEffect(() => {
    if (synastryData?.chartB && !synastryData?.relationship) {
      setStep("select_relationship")
    } else if (!synastryData?.chartB) {
      setStep("add_chart")
    }
  }, [synastryData?.chartB, synastryData?.relationship])

  // Chart A (user's chart) data
  const chartAData = React.useMemo((): ChartData | null => {
    if (!birthData?.chart?.ascendant || !birthData?.chart?.planets) return null
    return {
      ascendant: birthData.chart.ascendant,
      planets: birthData.chart.planets,
      houses: birthData.chart.houses,
      aspects: birthData.chart.aspects,
    }
  }, [birthData])

  // Chart B data
  const chartBData = React.useMemo((): ChartData | null => {
    if (!synastryData?.chartB?.chart?.ascendant || !synastryData?.chartB?.chart?.planets) return null
    return {
      ascendant: synastryData.chartB.chart.ascendant,
      planets: synastryData.chartB.chart.planets,
      houses: synastryData.chartB.chart.houses,
      aspects: synastryData.chartB.chart.aspects,
    }
  }, [synastryData?.chartB])

  // Chart A sun sign element
  const chartASunSign = React.useMemo(() => {
    if (!birthData) return null
    const signName = getSignForBody(birthData, "Sun")
    if (!signName) return null
    return compositionalSigns.find((s) => s.name === signName)
  }, [birthData])

  const chartAElementUi = chartASunSign?.element ? elementUIConfig[chartASunSign.element] : null

  // Chart B sun sign element
  const chartBSunSign = React.useMemo(() => {
    if (!synastryData?.chartB) return null
    const signName = getSignForBody(synastryData.chartB, "Sun")
    if (!signName) return null
    return compositionalSigns.find((s) => s.name === signName)
  }, [synastryData?.chartB])

  const chartBElementUi = chartBSunSign?.element ? elementUIConfig[chartBSunSign.element] : null

  const chartBDisplayName = synastryData?.chartBName || "Partner"

  // Derive display label for relationship
  const relationshipLabel = React.useMemo(() => {
    if (!synastryData?.relationship) return null
    const opt = findRelationshipOption(synastryData.relationship)
    if (opt) {
      const RIcon = opt.icon
      return { label: opt.label, icon: RIcon }
    }
    // Custom relationship
    return { label: synastryData.relationship, icon: null }
  }, [synastryData?.relationship])

  // ── Custom input submit handler ──
  const customDateStr = customDate ? format(customDate, "yyyy-MM-dd") : ""
  const customDateDisplay = customDate ? format(customDate, "dd/MM/yyyy") : ""

  const handleCustomInput = React.useCallback(async () => {
    if (!customName.trim() || !customDate) return

    setIsCalculating(true)
    setCalculationError(null)

    try {
      const time = customTime?.trim() || "12:00"
      const isTimeDefault = !customTime?.trim()
      setTimeUnavailable(isTimeDefault)

      let location: BirthLocation
      if (customLocation) {
        location = {
          lat: customLocation.lat,
          long: customLocation.long,
          city: customLocation.city,
          country: customLocation.country,
          countryCode: customLocation.countryCode,
        }
      } else {
        location = {
          lat: 0,
          long: 0,
          city: "Unknown",
          country: "Unknown",
        }
      }

      const calculatedData = buildStoredBirthData({
        date: customDateStr,
        time,
        location,
      })

      onSetChartB(calculatedData, customName.trim(), "custom")
      setStep("select_relationship")
    } catch (err) {
      console.error("Chart calculation failed:", err)
      setCalculationError("Could not calculate chart. Please check the birth data and try again.")
    } finally {
      setIsCalculating(false)
    }
  }, [customName, customDate, customDateStr, customTime, customLocation, onSetChartB])

  // ── Remove Chart B ──
  const handleRemoveChartB = React.useCallback(() => {
    if (onClearChartB) {
      onClearChartB()
    }
    setStep("add_chart")
    setSelectedCategory(null)
    setCustomName("")
    setCustomDate(undefined)
    setCustomTime("")
    setCustomLocation(null)
    setCalculationError(null)
    setTimeUnavailable(false)
  }, [onClearChartB])

  // ── No birth data state ──
  if (!birthData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="relative">
          {onDismiss && (
            <div className="flex justify-end mb-1">
              <button
                type="button"
                onClick={onDismiss}
                className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Dismiss synastry"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-4">
            <p className="text-sm tracking-[0.2em] text-white font-serif font-medium mb-3">
              Synastry
            </p>
            <p className="text-xs text-white/40 text-center py-4">
              You need your own birth chart first. Add your birth data in Settings to use Synastry.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="relative w-full">
        {/* ── Dismiss X: above the cards, top-right ── */}
        {onDismiss && (
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Dismiss synastry"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            {/* ═══════════════════════════════════════════════════════════════
                ADD CHART PHASE: Show user's chart + import panel
                ═══════════════════════════════════════════════════════════════ */}
            {step === "add_chart" && (
              <motion.div
                key="add-chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-3"
              >
                {/* ── Column 1: User's chart ── */}
                <ChartPreviewCard
                  chartData={chartAData}
                  birthData={birthData}
                  label={username ? `${username}'s chart` : "Your chart"}
                  dominantElementUi={chartAElementUi}
                />

                {/* ── Column 2: Import panel ── */}
                <AnimatePresence mode="wait">
                  {!hasChartB ? (
                    <motion.div
                      key="import-panel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="group/card relative h-full flex flex-col rounded-2xl overflow-visible border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
                        style={{
                          boxShadow: chartAElementUi
                            ? `0 0 40px -15px ${chartAElementUi.styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                            : "inset 0 1px 0 rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* ── Header ── */}
                        <div className="relative flex items-center justify-between px-3 pt-2 pb-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="text-sm tracking-[0.2em] text-white font-serif font-medium truncate">
                              Import
                            </p>
                          </div>
                        </div>

                        {/* ── Tab toggle ── */}
                        <div className="px-3 pt-1 pb-1">
                          <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
                            <button
                              type="button"
                              onClick={() => setSourceTab("custom")}
                              className={`flex-1 text-[11px] py-1.5 rounded-md transition-all font-medium ${sourceTab === "custom"
                                ? "bg-white/[0.08] text-white shadow-sm"
                                : "text-white/40 hover:text-white/60"
                              }`}
                            >
                              Custom
                            </button>
                            <button
                              type="button"
                              onClick={() => setSourceTab("friends")}
                              className={`flex-1 text-[11px] py-1.5 rounded-md transition-all font-medium ${sourceTab === "friends"
                                ? "bg-white/[0.08] text-white shadow-sm"
                                : "text-white/40 hover:text-white/60"
                              }`}
                            >
                              Friends
                            </button>
                          </div>
                        </div>

                        {/* ── Tab content ── */}
                        <div className="flex-1 min-h-0 px-3 pb-3 overflow-y-auto">
                          <AnimatePresence mode="wait">
                            {sourceTab === "custom" ? (
                              <motion.div
                                key="custom-input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2.5"
                              >
                                {/* Name */}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                                    Their name
                                  </label>
                                  <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g. Alex"
                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-galactic/40 focus:outline-none focus:ring-1 focus:ring-galactic/20 transition-all font-serif"
                                  />
                                </div>

                                {/* Date */}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                                    Date of birth
                                  </label>
                                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        readOnly
                                        value={customDateDisplay}
                                        placeholder="DD/MM/YYYY"
                                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-galactic/40 focus:outline-none focus:ring-1 focus:ring-galactic/20 transition-all font-serif cursor-pointer"
                                        onClick={() => setCalendarOpen(true)}
                                      />
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center justify-center w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-galactic/30 transition-all"
                                        >
                                          <CalendarDays className="w-4 h-4" />
                                        </button>
                                      </PopoverTrigger>
                                    </div>
                                    <PopoverContent className="w-auto p-0 bg-[#1a1225] border-white/[0.08] rounded-xl" align="start" sideOffset={4}>
                                      <Calendar
                                        mode="single"
                                        selected={customDate}
                                        onSelect={(d) => {
                                          setCustomDate(d)
                                          setCalendarOpen(false)
                                        }}
                                        captionLayout="dropdown"
                                        fromYear={1900}
                                        toYear={new Date().getFullYear()}
                                        defaultMonth={customDate ?? new Date(1990, 0, 1)}
                                        className="[&_.rdp-root]:text-white [&_.rdp-day]:text-white/70 [&_.rdp-day_disabled]:text-white/20 [&_.rdp-day_outside]:text-white/20 [&_.rdp-weekday]:text-white/30 [&_.rdp-caption_label]:text-white [&_.rdp-dropdown]:text-white [&_.rdp-button_previous]:text-white/50 [&_.rdp-button_next]:text-white/50 [&_.rdp-day_selected]:!bg-galactic [&_.rdp-day_selected]:!text-white [&_.rdp-day_today]:!bg-white/10"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {/* Time */}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                                    Time of birth <span className="text-white/20 normal-case">(optional)</span>
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={customTime}
                                      onChange={(e) => {
                                        setCustomTime(e.target.value)
                                        setTimeUnavailable(!e.target.value.trim())
                                      }}
                                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-galactic/40 focus:outline-none focus:ring-1 focus:ring-galactic/20 transition-all font-serif [color-scheme:dark]"
                                    />
                                    {!customTime?.trim() && customDate && (
                                      <button
                                        type="button"
                                        onClick={() => { setCustomTime(""); setTimeUnavailable(true) }}
                                        className="text-[9px] text-white/25 hover:text-white/40 transition-colors whitespace-nowrap"
                                      >
                                        Skip
                                      </button>
                                    )}
                                  </div>
                                  {!customTime?.trim() && customDate && (
                                    <p className="text-[9px] text-amber-400/50 px-1">
                                      Using 12:00 PM — house placements may be less precise.
                                    </p>
                                  )}
                                </div>

                                {/* Location */}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                                    Birth city
                                  </label>
                                  <LocationAutocompleteCompact
                                    value={customLocation}
                                    onValueChange={setCustomLocation}
                                    placeholder="Search for their birth city..."
                                  />
                                </div>

                                {/* Calculation error */}
                                {calculationError && (
                                  <div className="flex items-start gap-1.5 text-[10px] text-red-400/80 px-1">
                                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>{calculationError}</span>
                                  </div>
                                )}

                                {/* Import button */}
                                <button
                                  type="button"
                                  onClick={handleCustomInput}
                                  disabled={!customName.trim() || !customDate || isCalculating}
                                  className="w-full py-2.5 rounded-xl bg-galactic/20 text-galactic text-sm font-serif font-medium border border-galactic/30 hover:bg-galactic/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {isCalculating ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Calculating chart…
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-3.5 h-3.5" />
                                      Import
                                    </>
                                  )}
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="friend-input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <FriendChartImport onSetChartB={onSetChartB} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* Chart B imported — show compact view before moving to relationship step */
                    <motion.div
                      key="chartB-compact"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChartPreviewCard
                        chartData={chartBData}
                        birthData={synastryData?.chartB}
                        label={`${chartBDisplayName}'s chart`}
                        dominantElementUi={chartBElementUi}
                        onClear={handleRemoveChartB}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SELECT RELATIONSHIP PHASE: Charts collapse, category flow appears
                ═══════════════════════════════════════════════════════════════ */}
            {step === "select_relationship" && hasChartB && (
              <motion.div
                key="select-relationship"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {/* ── Compact chart indicators ── */}
                <div className="grid grid-cols-2 gap-2">
                  <ChartPreviewCard
                    chartData={chartAData}
                    birthData={birthData}
                    label={username ? `You (${username})` : "You"}
                    dominantElementUi={chartAElementUi}
                    compact
                  />
                  <ChartPreviewCard
                    chartData={chartBData}
                    birthData={synastryData?.chartB}
                    label={chartBDisplayName}
                    dominantElementUi={chartBElementUi}
                    onClear={handleRemoveChartB}
                    compact
                  />
                </div>

                {/* ── Relationship selection panel ── */}
                <PanelCard dominantElementUi={chartAElementUi}>
                  <AnimatePresence mode="wait">
                    {/* ── Ready: compact synastry indicator ── */}
                    {isReady && synastryData?.relationship && (
                      <motion.div
                        key="ready-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-3 py-2.5 flex items-center justify-center gap-3"
                      >
                        <motion.span
                          className="text-galactic text-lg"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          ⟷
                        </motion.span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-galactic/80 uppercase tracking-wider">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-galactic animate-pulse" />
                          {relationshipLabel && relationshipLabel.icon && (
                            <relationshipLabel.icon className="text-sm text-galactic" />
                          )}
                          {" "}{relationshipLabel?.label ?? synastryData.relationship}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSetRelationship("")
                            setSelectedCategory(null)
                          }}
                          className="text-[10px] text-white/30 hover:text-white/50 transition-colors ml-1"
                        >
                          Change
                        </button>
                      </motion.div>
                    )}

                    {/* ── Category selection ── */}
                    {!hasRelationship && !selectedCategory && (
                      <motion.div
                        key="category-select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative flex items-center justify-between px-3 pt-2.5 pb-1">
                          <p className="text-sm tracking-[0.2em] text-white font-serif font-medium">
                            How are you connected?
                          </p>
                        </div>
                        <div className="px-3 pb-3">
                          <div className="grid grid-cols-3 gap-2">
                            {RELATIONSHIP_CATEGORIES.map((cat) => (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedCategory(cat.key)}
                                className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-white/[0.06] hover:border-galactic/30 hover:bg-galactic/[0.06] transition-all duration-200"
                              >
                                <cat.icon className="text-xl text-white/50 group-hover:text-galactic transition-colors duration-200" />
                                <span className="text-[11px] text-white/50 group-hover:text-white/80 font-medium transition-colors duration-200">
                                  {cat.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Role selection within category ── */}
                    {!hasRelationship && selectedCategory && (
                      <motion.div
                        key="role-select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative flex items-center gap-2 px-3 pt-2.5 pb-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(null)}
                            className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200"
                            aria-label="Back to categories"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <p className="text-sm tracking-[0.2em] text-white font-serif font-medium">
                            {RELATIONSHIP_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                          </p>
                        </div>
                        <div className="px-3 pb-3 space-y-1.5">
                          {/* Role options grid */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {RELATIONSHIP_CATEGORIES.find((c) => c.key === selectedCategory)?.options.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  onSetRelationship(opt.value, selectedCategory)
                                }}
                                className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border border-white/10 hover:border-galactic/40 hover:bg-galactic/10 text-white/60 hover:text-white transition-all"
                              >
                                <opt.icon className="text-base text-white/70" />
                                <span className="text-[9px] leading-tight">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                          {/* Custom input */}
                          <div className="relative rounded-lg border border-white/10 overflow-hidden flex items-center">
                            <input
                              type="text"
                              value={customRelationship}
                              onChange={(e) => setCustomRelationship(e.target.value)}
                              placeholder="Or type a custom role…"
                              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none px-3 py-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && customRelationship.trim()) {
                                  onSetRelationship(customRelationship.trim(), selectedCategory)
                                }
                              }}
                            />
                            {customRelationship.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (customRelationship.trim()) {
                                    onSetRelationship(customRelationship.trim(), selectedCategory)
                                  }
                                }}
                                className="pr-2 text-galactic hover:text-galactic/80 transition-colors"
                                aria-label="Set custom relationship"
                              >
                                ↵
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PanelCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}