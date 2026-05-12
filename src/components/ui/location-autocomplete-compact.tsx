"use client"

import * as React from "react"
import { Check, Loader2, MapPin, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  searchLocations,
  getUserCurrentLocation,
  type GeocodingResult,
} from "@/lib/geocoding"
import { useDebounce } from "@/hooks/use-debounce"
import { motion, AnimatePresence } from "motion/react"

interface LocationAutocompleteCompactProps {
  value?: GeocodingResult | null
  onValueChange: (location: GeocodingResult | null) => void
  placeholder?: string
}

export function LocationAutocompleteCompact({
  value,
  onValueChange,
  placeholder = "Search city...",
}: LocationAutocompleteCompactProps) {
  const [query, setQuery] = React.useState(
    value ? `${value.city}, ${value.country}` : ""
  )
  const [results, setResults] = React.useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [isGettingLocation, setIsGettingLocation] = React.useState(false)

  const debouncedQuery = useDebounce(query, 400)

  // Sync input with value if value changes externally
  React.useEffect(() => {
    if (value) {
      const formatted = `${value.city}, ${value.country}`
      if (query !== formatted) {
        setQuery(formatted)
      }
    }
  }, [value])

  // Fetch results
  React.useEffect(() => {
    if (value) {
      const formatted = `${value.city}, ${value.country}`
      if (formatted === debouncedQuery) {
        setResults([])
        return
      }
    }

    if (debouncedQuery.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    let isMounted = true

    const fetchResults = async () => {
      setIsSearching(true)
      try {
        const locations = await searchLocations(debouncedQuery)
        if (isMounted) {
          setResults(locations)
        }
      } catch (error) {
        console.error("Search failed:", error)
      } finally {
        if (isMounted) {
          setIsSearching(false)
        }
      }
    }

    fetchResults()

    return () => {
      isMounted = false
    }
  }, [debouncedQuery])

  const handleSelect = (location: GeocodingResult) => {
    onValueChange(location)
    setQuery(`${location.city}, ${location.country}`)
    setResults([])
  }

  const handleClear = () => {
    setQuery("")
    onValueChange(null)
    setResults([])
  }

  const handleGetCurrentLocation = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsGettingLocation(true)
    try {
      const location = await getUserCurrentLocation()
      if (location) {
        handleSelect(location)
      }
    } catch (error) {
      console.error("Could not get current location", error)
    } finally {
      setIsGettingLocation(false)
    }
  }

  const getFlagUrl = (code?: string) =>
    code ? `https://flagcdn.com/${code.toLowerCase()}.svg` : null

  return (
    <div className="relative w-full">
      {/* ── Input row ── */}
      <div className="relative flex items-center">
        {/* Left icon: flag when selected, or map-pin with "use my location" */}
        <div className="absolute left-3 z-10">
          {value ? (
            <div className="size-5 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.06] shrink-0">
              {getFlagUrl(value.countryCode) ? (
                <img
                  src={getFlagUrl(value.countryCode)!}
                  alt={value.country}
                  className="size-full object-cover"
                />
              ) : (
                <MapPin className="size-3 m-1 text-white/40" />
              )}
            </div>
          ) : (
            <button
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation || isSearching}
              className="p-1 -ml-1 rounded-md transition-all hover:bg-white/[0.06] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Use my current location"
            >
              {isSearching || isGettingLocation ? (
                <Loader2 className="size-3.5 text-galactic animate-spin" />
              ) : (
                <MapPin className="size-3.5 text-white/30 hover:text-white/50 transition-colors" />
              )}
            </button>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-8 text-sm text-white placeholder:text-white/25 focus:border-galactic/40 focus:outline-none focus:ring-1 focus:ring-galactic/20 transition-all font-serif"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 p-1 hover:bg-white/[0.06] rounded-full transition-colors z-10"
            aria-label="Clear"
          >
            <X className="size-3.5 text-white/30 hover:text-white/50 transition-colors" />
          </button>
        )}
      </div>

      {/* ── Results dropdown: opens UPWARD above the input ── */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-white/[0.08] bg-[#1a1225]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <ScrollArea className="max-h-[160px]">
              {results.map((result, idx) => {
                const isSelected =
                  value?.city === result.city &&
                  value?.country === result.country

                return (
                  <button
                    key={`${result.city}-${result.country}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.06]",
                      idx !== results.length - 1 && "border-b border-white/[0.04]"
                    )}
                  >
                    {/* Compact flag */}
                    <div className="size-5 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.06] shrink-0">
                      {getFlagUrl(result.countryCode) ? (
                        <img
                          src={getFlagUrl(result.countryCode)!}
                          alt={result.country}
                          className="size-full object-cover"
                        />
                      ) : (
                        <MapPin className="size-3 m-1 text-white/40" />
                      )}
                    </div>

                    {/* City, Country */}
                    <span className="flex-1 text-xs text-white/70 truncate font-serif">
                      {result.city}, {result.country}
                    </span>

                    {/* Check if selected */}
                    <Check
                      className={cn(
                        "size-3 shrink-0 transition-opacity",
                        isSelected
                          ? "text-galactic opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </button>
                )
              })}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
