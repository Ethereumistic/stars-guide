"use client";

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
    PenLine,
    Moon,
    Heart,
    Compass,
} from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";

const NAV_ITEMS = [
    { key: "timeline", label: "Timeline", href: "/journal", icon: GiScrollUnfurled },
    { key: "calendar", label: "Calendar", href: "/journal/calendar", icon: Calendar },
    { key: "stats", label: "Stats", href: "/journal/stats", icon: BarChart3 },
    { key: "settings", label: "Settings", href: "/journal/settings", icon: Settings },
];

const QUICK_CREATE = [
    { key: "freeform", label: "Freeform", href: "/journal/new?type=freeform", icon: PenLine },
    { key: "checkin", label: "Check-in", href: "/journal/new?type=checkin", icon: Compass },
    { key: "dream", label: "Dream", href: "/journal/new?type=dream", icon: Moon },
    { key: "gratitude", label: "Gratitude", href: "/journal/new?type=gratitude", icon: Heart },
];

export function JournalNavSection() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <SidebarGroup className="mt-2 min-h-0 flex-1 w-full min-w-0 group-data-[collapsible=icon]:hidden">
            {/* Streak */}
            <div className="px-1 mb-2">
                <StreakDisplay />
            </div>

            <SidebarGroupLabel className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                <GiScrollUnfurled className="h-3 w-3 text-white/40" />
                <span>Navigate</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="h-full w-full min-w-12">
                {/* Nav Items */}
                <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/journal" && pathname.startsWith(item.href));
                        return (
                            <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                    isActive={isActive}
                                    onClick={() => router.push(item.href)}
                                    className={cn(
                                        "h-8 gap-2.5 rounded-lg px-3 text-white/50 hover:bg-white/5 hover:text-white/70",
                                        isActive && "bg-galactic/10 text-white"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>

                {/* Quick Create */}
                <div className="mt-3">
                    <p className="px-3 py-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                        Quick Create
                    </p>
                    <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                        {QUICK_CREATE.map((item) => (
                            <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                    onClick={() => router.push(item.href)}
                                    className="h-7 gap-2.5 rounded-lg px-3 text-xs text-white/40 hover:bg-white/5 hover:text-white/60"
                                >
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{item.label}</span>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </div>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}