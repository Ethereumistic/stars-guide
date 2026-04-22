"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, type MoodZone } from "@/lib/journal/constants";
import { DayCell } from "./day-cell";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
    year: number;
    month: number;
    entries: any[];
    monthName: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onEntryClick: (entryId: string) => void;
    className?: string;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
    year,
    month,
    entries,
    monthName,
    onPrevMonth,
    onNextMonth,
    onToday,
    onEntryClick,
    className,
}: CalendarViewProps) {
    // Group entries by date
    const entriesByDate = React.useMemo(() => {
        const map = new Map<string, any[]>();
        for (const entry of entries) {
            const existing = map.get(entry.entryDate) ?? [];
            existing.push(entry);
            map.set(entry.entryDate, existing);
        }
        return map;
    }, [entries]);

    // Build the calendar grid
    const calendarDays = React.useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week for the 1st (Monday = 0)
        let startDow = firstDay.getDay(); // 0 = Sunday
        startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Monday-first

        const days: Array<{
            date: number | null;
            fullDate: string | null;
            isCurrentMonth: boolean;
            isToday: boolean;
        }> = [];

        // Previous month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDow - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;
            const pm = month === 0 ? 11 : month - 1;
            const py = month === 0 ? year - 1 : year;
            days.push({
                date: d,
                fullDate: `${py}-${String(pm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                isCurrentMonth: false,
                isToday: false,
            });
        }

        // Current month
        const today = new Date();
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            days.push({
                date: d,
                fullDate,
                isCurrentMonth: true,
                isToday,
            });
        }

        // Next month padding (fill to 42 cells = 6 rows)
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const nm = month === 11 ? 0 : month + 1;
            const ny = month === 11 ? year + 1 : year;
            days.push({
                date: d,
                fullDate: `${ny}-${String(nm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                isCurrentMonth: false,
                isToday: false,
            });
        }

        return days;
    }, [year, month]);

    // Split into weeks
    const weeks = React.useMemo(() => {
        const result: Array<typeof calendarDays> = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            result.push(calendarDays.slice(i, i + 7));
        }
        return result;
    }, [calendarDays]);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Month navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={onPrevMonth} className="text-white/40">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-serif font-semibold text-white/80 min-w-[180px] text-center">
                        {monthName}
                    </h2>
                    <Button variant="ghost" size="icon-sm" onClick={onNextMonth} className="text-white/40">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={onToday} className="text-white/40 gap-1.5">
                    <RotateCcw className="h-3 w-3" />
                    Today
                </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px">
                {WEEKDAY_LABELS.map((label) => (
                    <div
                        key={label}
                        className="text-center text-[10px] font-medium text-white/30 py-1.5"
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px rounded-xl border border-white/5 overflow-hidden">
                {calendarDays.map((day, i) => (
                    <DayCell
                        key={i}
                        date={day.date}
                        fullDate={day.fullDate}
                        isCurrentMonth={day.isCurrentMonth}
                        isToday={day.isToday}
                        entries={day.fullDate ? (entriesByDate.get(day.fullDate) ?? []) : []}
                        onClick={() => {
                            // Navigate to first entry of the day, or stay
                            const dayEntries = day.fullDate ? (entriesByDate.get(day.fullDate) ?? []) : [];
                            if (dayEntries.length > 0) {
                                onEntryClick(dayEntries[0]._id);
                            }
                        }}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-white/30">
                {MOOD_ZONES.map((zone) => (
                    <div key={zone.key} className="flex items-center gap-1">
                        <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: zone.color }}
                        />
                        <span>{zone.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}