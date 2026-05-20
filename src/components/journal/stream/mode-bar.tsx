"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar, Search, BarChart3, Settings } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

export type JournalTab = "stream" | "calendar" | "search" | "insights" | "settings";

interface ModeBarProps {
    activeTab: JournalTab;
    onTabChange: (tab: JournalTab) => void;
    className?: string;
}

const TABS: { key: JournalTab; label: string; icon: React.ElementType }[] = [
    { key: "stream", label: "Stream", icon: GiScrollUnfurled },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "search", label: "Search", icon: Search },
    { key: "insights", label: "Insights", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: Settings },
];

export function ModeBar({ activeTab, onTabChange, className }: ModeBarProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-center gap-1 border-t border-white/[0.06] bg-background/80 backdrop-blur-sm py-2 px-2",
                className
            )}
        >
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200",
                            isActive
                                ? "text-white/70"
                                : "text-white/30 hover:text-white/45"
                        )}
                    >
                        <tab.icon
                            className={cn(
                                "h-4 w-4 transition-all duration-200",
                                isActive && "text-amber-400"
                            )}
                        />
                        <span
                            className={cn(
                                "text-[9px] font-sans uppercase tracking-[0.08em] transition-all duration-200",
                                isActive && "text-amber-400"
                            )}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}