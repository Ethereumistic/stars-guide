"use client";

import { cn } from "@/lib/utils";

interface DayCellProps {
  date: number | null;
  fullDate: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: any[];
  onClick?: () => void;
  className?: string;
}

export function DayCell({ date, isCurrentMonth, isToday, entries, onClick, className }: DayCellProps) {
  const hasEntries = entries.length > 0;
  return <button type="button" onClick={hasEntries ? onClick : undefined} disabled={!hasEntries} aria-label={`${date}${hasEntries ? `, ${entries.length} ${entries.length === 1 ? "reflection" : "reflections"}` : ""}`} className={cn("relative flex min-h-14 flex-col items-center justify-center rounded-xl text-xs transition sm:min-h-20", isCurrentMonth ? "text-white/55" : "text-white/16", isToday && "bg-[#a995f2]/10 text-[#c9bcff]", hasEntries && "cursor-pointer hover:bg-white/[0.06] hover:text-white", !hasEntries && "cursor-default", className)}>
    <span>{date}</span>
    {hasEntries && <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#a995f2]" />}
  </button>;
}
