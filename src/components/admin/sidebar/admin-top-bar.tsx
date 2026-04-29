"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import {
    FileText,
    Globe,
    Sparkles,
    ClipboardCheck,
    LayoutDashboard,
    Shield,
    Anchor,
    Settings,
    Bell,
    Bug,
} from "lucide-react";

const allNavItems = [
    { title: "Dashboard", href: "/admin" },
    { title: "Context Editor", href: "/admin/context" },
    { title: "Zeitgeist Engine", href: "/admin/zeitgeist" },
    { title: "Generation Desk", href: "/admin/generator" },
    { title: "Hook Manager", href: "/admin/hooks" },
    { title: "Review & Publish", href: "/admin/review" },
    { title: "Oracle Overview", href: "/admin/oracle" },
    { title: "Settings", href: "/admin/oracle/settings" },
    { title: "Debug Live", href: "/admin/oracle/debug" },
    { title: "Journal Overview", href: "/admin/journal" },
    { title: "Settings", href: "/admin/journal/settings" },
    { title: "Username Bans", href: "/admin/ban" },
    { title: "Notifications", href: "/admin/notifications" },
];

function getPageTitle(pathname: string | null): string {
    const match = allNavItems.find((item) => pathname === item.href ||
        (item.href !== "/admin" && item.href !== "/admin/oracle" && item.href !== "/admin/journal" && item.href !== "/admin/notifications" && pathname?.startsWith(item.href))
    );
    return match?.title || "Dashboard";
}

export function AdminTopBar() {
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname);

    return (
        <>
            {/* Decorative blur orbs */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/15 blur-[160px] opacity-20" />
            <div className="pointer-events-none absolute right-1/4 top-1/4 z-0 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px] opacity-15" />

            <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-4">
                <SidebarTrigger className="h-9 w-9 border border-white/15 bg-background/60 text-foreground/70 hover:border-primary/40 hover:text-primary transition-all duration-500" />
                <Separator orientation="vertical" className="h-4 bg-white/15" />
                <span className="text-sm text-muted-foreground font-serif italic tracking-wide lowercase">
                    {pageTitle}
                </span>
            </header>
        </>
    );
}
