"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { StreakDisplay } from "@/components/journal/timeline/streak-display";
import {
    Calendar,
    BarChart3,
    Settings,
    Search,
} from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

/**
 * Simplified JournalNavSection per redesign plan:
 * - Navigation links (Stream, Calendar, Insights, Settings) with ?tab= format
 * - Streak display
 * - NO recent entries list (visible in the stream timeline)
 * - NO rename/delete dialogs (available in detail panel context menu)
 */

const NAV_ITEMS = [
    { key: "stream", label: "Stream", href: "/journal", icon: GiScrollUnfurled },
    { key: "calendar", label: "Calendar", href: "/journal?tab=calendar", icon: Calendar },
    { key: "search", label: "Search", href: "/journal?tab=search", icon: Search },
    { key: "insights", label: "Insights", href: "/journal?tab=insights", icon: BarChart3 },
    { key: "settings", label: "Settings", href: "/journal?tab=settings", icon: Settings },
];

export function JournalNavSection() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const currentTab = searchParams?.get("tab") || "stream";

    return (
        <SidebarGroup className="mt-2 min-h-0 flex-1 w-full min-w-0 group-data-[collapsible=icon]:hidden">
            {/* Streak */}
            <div className="px-1 mb-3">
                <StreakDisplay />
            </div>

            <SidebarGroupLabel className="flex items-center gap-2 text-[10px] font-serif tracking-wide lowercase italic text-foreground/40">
                <GiScrollUnfurled className="h-3 w-3 text-foreground/40" />
                <span>Navigate</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                    {NAV_ITEMS.map((item) => {
                        // Check if this nav item is active based on pathname + tab param
                        const isActive =
                            (item.key === "stream" && pathname === "/journal" && currentTab === "stream") ||
                            (item.key !== "stream" && pathname === "/journal" && currentTab === item.key);

                        return (
                            <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                    isActive={isActive}
                                    onClick={() => router.push(item.href)}
                                    className={cn(
                                        "h-8 gap-2.5 rounded-lg px-3 text-white/45 hover:bg-[var(--journal-accent,#c8a45c)]/10 hover:text-white/70 transition-all duration-500",
                                        isActive && "bg-[var(--journal-accent,#c8a45c)]/15 text-[var(--journal-accent,#c8a45c)] font-medium"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}