"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CalendarView } from "@/components/journal/calendar/calendar-view";

interface CalendarTabProps {
    onEntryClick?: (entryId: string) => void;
}

/**
 * CalendarTab wraps CalendarView with its own month state and data fetching.
 * Used inside the JournalStreamPage calendar tab.
 */
export function CalendarTab({ onEntryClick }: CalendarTabProps) {
    const [currentMonth, setCurrentMonth] = React.useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    // Compute date range for current month
    const monthStart = new Date(currentMonth.year, currentMonth.month, 1)
        .toISOString()
        .split("T")[0];
    const monthEnd = new Date(currentMonth.year, currentMonth.month + 1, 0)
        .toISOString()
        .split("T")[0];

    const entries = useQuery(api.journal.entries.getUserEntriesByDate, {
        startDate: monthStart,
        endDate: monthEnd,
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

    const monthName = new Date(
        currentMonth.year,
        currentMonth.month,
        1
    ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <CalendarView
            year={currentMonth.year}
            month={currentMonth.month}
            entries={entries ?? []}
            monthName={monthName}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            onToday={goToToday}
            onEntryClick={onEntryClick ?? (() => {})}
        />
    );
}