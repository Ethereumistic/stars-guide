"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StreakDisplay } from "@/components/journal/timeline/streak-display";
import {
    Plus,
    BookOpen,
    Calendar,
    Search,
    BarChart3,
    Settings,
    PenLine,
    Moon,
    Heart,
    Sparkles,
} from "lucide-react";

interface JournalSidebarProps {
    className?: string;
}

const NAV_ITEMS = [
    { key: "timeline", label: "Timeline", href: "/journal", icon: BookOpen },
    { key: "calendar", label: "Calendar", href: "/journal/calendar", icon: Calendar },
    { key: "search", label: "Search", href: "/journal/search", icon: Search },
    { key: "stats", label: "Stats", href: "/journal/stats", icon: BarChart3 },
    { key: "settings", label: "Settings", href: "/journal/settings", icon: Settings },
];

const QUICK_CREATE = [
    { key: "freeform", label: "Freeform", href: "/journal/new?type=freeform", icon: PenLine },
    { key: "checkin", label: "Check-in", href: "/journal/new?type=checkin", icon: Sparkles },
    { key: "dream", label: "Dream", href: "/journal/new?type=dream", icon: Moon },
    { key: "gratitude", label: "Gratitude", href: "/journal/new?type=gratitude", icon: Heart },
];

export function JournalSidebarContent({ className }: JournalSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="px-3 py-4">
                <h2 className="text-sm font-serif font-semibold text-white/70 tracking-wide">
                    Journal
                </h2>
            </div>

            {/* Streak */}
            <div className="px-3 mb-3">
                <StreakDisplay />
            </div>

            {/* Navigation */}
            <div className="px-2 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/journal" && pathname.startsWith(item.href));
                    return (
                        <button
                            key={item.key}
                            onClick={() => router.push(item.href)}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                    ? "bg-galactic/10 text-white"
                                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="px-4 py-3">
                <div className="h-px bg-white/5" />
            </div>

            {/* Quick Create */}
            <div className="px-2 space-y-0.5">
                <p className="px-3 pb-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                    Quick Create
                </p>
                {QUICK_CREATE.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => router.push(item.href)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors"
                    >
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* New Entry FAB */}
            <div className="px-3 py-4">
                <Button
                    variant="galactic"
                    size="sm"
                    onClick={() => router.push("/journal/new")}
                    className="w-full gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Entry
                </Button>
            </div>
        </div>
    );
}