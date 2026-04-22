"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export default function JournalCalendarPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-white/90">Calendar</h1>
                <p className="mt-1 text-sm text-white/40">Month view with mood-colored dots and moon phases</p>
            </div>

            {/* Phase 3: Calendar grid with mood dots + moon phase icons */}
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-lg font-serif font-semibold text-white/60">Coming Soon</h3>
                <p className="text-sm text-white/30 mt-1 max-w-xs">
                    A visual month grid for pattern recognition at a glance — mood dots, moon phases, and retrograde indicators.
                </p>
            </div>
        </div>
    );
}