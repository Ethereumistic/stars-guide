"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar, Search, BarChart3 } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

export type JournalTab = "stream" | "calendar" | "search" | "insights" | "settings";

interface ModeBarProps {
    activeTab: JournalTab;
    onTabChange: (tab: JournalTab) => void;
    className?: string;
}

// Note: Settings tab removed — it lives in the sidebar only (rarely needed)
const TABS: { key: JournalTab; label: string; icon: React.ElementType }[] = [
    { key: "stream", label: "Stream", icon: GiScrollUnfurled },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "search", label: "Search", icon: Search },
    { key: "insights", label: "Insights", icon: BarChart3 },
];

export function ModeBar({ activeTab, onTabChange, className }: ModeBarProps) {
    // ── Keyboard height from visualViewport in QuickCapture ────
    // QuickCapture sets --keyboard-height on :root when the mobile keyboard opens.
    // Poll every 200ms so the ModeBar can contract/expand reactively.
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        function readKeyboardHeight() {
            const raw = getComputedStyle(document.documentElement)
                .getPropertyValue("--keyboard-height")
                .trim();
            setKeyboardHeight(raw ? parseInt(raw, 10) : 0);
        }

        readKeyboardHeight();
        const id = setInterval(readKeyboardHeight, 200);
        return () => clearInterval(id);
    }, []);

    return (
        <div
            className={cn(
                "flex items-center justify-center gap-1 border-t border-[var(--journal-border,#1e2640)] bg-background/80 backdrop-blur-sm transition-all duration-300",
                // When keyboard is open, collapse to a thin line so it doesn't
                // push the QuickCapture further up off-screen.
                keyboardHeight > 0 ? "py-1 px-2" : "py-2 px-2",
                className
            )}
            style={{
                // Lift the ModeBar by keyboardHeight so it doesn't overlap the
                // QuickCapture textarea when the keyboard is open on mobile.
                transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : undefined,
            }}
        >
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 min-h-[44px] min-w-[60px]",
                            isActive
                                ? "text-white/70"
                                : "text-white/30 hover:text-white/45"
                        )}
                    >
                        {/* Amber underline indicator for active tab */}
                        {isActive && (
                            <span
                                className="absolute -bottom-[calc(0.5rem+2px)] left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-[var(--journal-accent,#c8a45c)]"
                                aria-hidden="true"
                            />
                        )}
                        <tab.icon
                            className={cn(
                                "h-4 w-4 transition-all duration-200",
                                isActive && "text-[var(--journal-accent,#c8a45c)]"
                            )}
                        />
                        <span
                            className={cn(
                                "text-[9px] font-sans uppercase tracking-[0.08em] transition-all duration-200",
                                isActive && "text-[var(--journal-accent,#c8a45c)] font-semibold"
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