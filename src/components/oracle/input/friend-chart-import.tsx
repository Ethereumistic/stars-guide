"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { User, Loader2, Lock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { compositionalSigns } from "@/astrology/signs"
import type { StoredBirthData } from "@/lib/birth-chart/types"

// ── Types ──────────────────────────────────────────────────────────────────

interface FriendChartImportProps {
  onSetChartB: (data: StoredBirthData, name: string, source: "friend", friendUserId: string) => void
  pageSize?: number
}

// ── Component ──────────────────────────────────────────────────────────────

export function FriendChartImport({ onSetChartB, pageSize = 3 }: FriendChartImportProps) {
  const friendsData = useQuery(api.oracle.synastry.getFriendsBirthDataBatch)
  const [page, setPage] = React.useState(0)

  // Loading state
  if (friendsData === undefined) {
    return (
      <div className="flex flex-col gap-1.5 py-1">
        {Array.from({ length: pageSize }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] animate-pulse"
          >
            <div className="size-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-24 rounded bg-white/10" />
              <div className="h-2 w-16 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (friendsData.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-white/30">You don&apos;t have any friends yet.</p>
        <p className="text-[10px] text-white/20 mt-1">
          Add a friend in Settings, or use manual input.
        </p>
      </div>
    )
  }

  // Sort: available friends first, then denied
  const sorted = [...friendsData].sort((a, b) => {
    if (a.access === "granted" && b.access !== "granted") return -1
    if (a.access !== "granted" && b.access === "granted") return 1
    return 0
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const start = page * pageSize
  const pageItems = sorted.slice(start, start + pageSize)

  // Reset page if it's out of bounds after data changes
  if (page >= totalPages && totalPages > 0) {
    setPage(totalPages - 1)
  }

  return (
    <div className="flex flex-col">
      {/* Friend rows */}
      <div className="flex flex-col gap-1.5 py-1">
        {pageItems.map((friend) => (
          <FriendRow
            key={friend.friendUserId}
            friend={friend}
            onSelect={onSetChartB}
          />
        ))}
        {/* Pad empty slots so the list is always the same height */}
        {Array.from({ length: Math.max(0, pageSize - pageItems.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="h-[46px]" />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-1.5 mt-auto">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex items-center justify-center size-6 rounded-md border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-[10px] text-white/30 tabular-nums px-1.5">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="flex items-center justify-center size-6 rounded-md border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Friend Row ──────────────────────────────────────────────────────────────

function FriendRow({
  friend,
  onSelect,
}: {
  friend: {
    friendUserId: string
    username: string
    image?: string
    access: "granted" | "denied"
    birthData?: any
    reason?: string
  }
  onSelect: (data: StoredBirthData, name: string, source: "friend", friendUserId: string) => void
}) {
  const displayName = friend.username ?? "Unknown"

  // Denied — private or no data
  if (friend.access === "denied") {
    const isPrivate = friend.reason === "Chart is private"
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] opacity-60 cursor-not-allowed">
        <Avatar className="size-8 border border-white/10 shrink-0">
          <AvatarImage src={friend.image} />
          <AvatarFallback className="bg-white/10 text-white/40 text-[10px] font-serif">
            {displayName.charAt(0)?.toUpperCase() ?? <User className="size-3" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-white/50 truncate block">@{displayName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPrivate ? (
            <>
              <Lock className="size-3 text-red-400/60" />
              <span className="text-[10px] text-red-400/50">Private chart</span>
            </>
          ) : (
            <>
              <AlertCircle className="size-3 text-amber-400/60" />
              <span className="text-[10px] text-amber-400/50">No chart</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Granted — show chart access
  const sunSign = getSunSign(friend.birthData)

  return (
    <button
      type="button"
      onClick={() => onSelect(friend.birthData as StoredBirthData, displayName, "friend", friend.friendUserId)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-galactic/10 border border-transparent hover:border-galactic/30 transition-all duration-150 w-full text-left group"
    >
      <Avatar className="size-8 border border-white/10 shrink-0 group-hover:border-galactic/40 transition-colors">
        <AvatarImage src={friend.image} />
        <AvatarFallback className="bg-galactic/10 text-galactic/70 text-[10px] font-serif group-hover:bg-galactic/20 transition-colors">
          {displayName.charAt(0)?.toUpperCase() ?? <User className="size-3" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-white/70 group-hover:text-white transition-colors truncate block">
          @{displayName}
        </span>
        {sunSign && (
          <span className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors block">
            ☉ {sunSign}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="size-1.5 rounded-full bg-emerald-400/80" />
        <span className="text-[10px] text-emerald-400/70">Available</span>
      </div>
    </button>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSunSign(birthData: any): string | null {
  if (!birthData) return null
  // Try chart.planets first (enriched data)
  if (birthData.chart?.planets) {
    const sun = birthData.chart.planets.find((p: any) => p.id === "sun")
    if (sun) {
      return compositionalSigns.find((s) => s.id === sun.signId)?.name ?? null
    }
  }
  // Fall back to legacy placements
  if (birthData.placements) {
    const sun = birthData.placements.find((p: any) => p.body === "Sun")
    if (sun) return sun.sign
  }
  return null
}
