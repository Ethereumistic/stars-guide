"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { MOOD_ZONES, type MoodZone } from "@/lib/journal/constants";
import { CalendarView } from "@/components/journal/calendar/calendar-view";
import { Loader2 } from "lucide-react";

export default function JournalCalendarPage() {
    const router = useRouter();
    const [currentMonth, setCurrentMonth] = React.useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    // Compute date range for current month
    const monthStart = new Date(currentMonth.year, currentMonth.month, 1)
        .toISOString().split("T")[0];
    const monthEnd = new Date(currentMonth.year, currentMonth.month + 1, 0)
        .toISOString().split("T")[0];

    // Fetch entries for this month
    const entries = useQuery(api.journal.entries.getUserEntriesByDate, {
        startDate: monthStart,
        endDate: monthEnd,
    });

    // Fetch cosmic weather for the month (for moon phases)
    const cosmicWeather = useQuery(api.cosmicWeather.getForPublicDate, {
        date: monthStart, // We'll need to fetch per-day, but start with current
    });

    function goToPrevMonth() {
        setCurrentMonth((prev) => {
            const d = new Date(prev.year, prev.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }

    function goToNextMonth() {
        setCurrentMonth((prev) => {
            const d = new Date(prev.year, prev.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }

    function goToToday() {
        const now = new Date();
        setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    }

    const monthName = new Date(currentMonth.year, currentMonth.month, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Calendar</h1>
                <p className="mt-1 text-sm text-white/40">
                    Month view with mood-colored dots and moon phases
                </p>
            </div>

            <CalendarView
                year={currentMonth.year}
                month={currentMonth.month}
                entries={entries ?? []}
                monthName={monthName}
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                onToday={goToToday}
                onEntryClick={(entryId) => router.push(`/journal/${entryId}`)}
            />
        </div>
    );
}