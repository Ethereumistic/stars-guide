"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarHeaderLayout, SidebarUserFooter, SidebarQuickActions } from "@/components/layout/sidebar";
import { JournalNavSection } from "./journal-nav-section";
import { GiCursedStar } from "react-icons/gi";
import { Plus } from "lucide-react";

interface JournalSidebarProps {
    onNewEntry: () => void;
    user: {
        username?: string | null | undefined;
        image?: string | null | undefined;
    } | null | undefined;
    tierLabel: string;
    shouldShowUpgrade: boolean;
    onSignOut: () => void;
}

export function JournalSidebar({
    onNewEntry,
    user,
    tierLabel,
    shouldShowUpgrade,
    onSignOut,
}: JournalSidebarProps) {
    return (
        <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r border-white/10 bg-background/40 backdrop-blur-md overflow-hidden"
        >
            <SidebarHeaderLayout homeHref="/journal" />

            <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                <SidebarQuickActions
                    actions={[
                        { icon: Plus, label: "New entry", tooltip: "New entry", onClick: onNewEntry },
                        { icon: (props: { className?: string }) => (
                            <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        ), label: "Search", tooltip: "Search entries", onClick: () => window.location.href = "/journal/search" },
                    ]}
                    links={[
                        { icon: GiCursedStar, label: "Oracle", tooltip: "Oracle", href: "/oracle" },
                    ]}
                />

                <JournalNavSection />
            </SidebarContent>

            <SidebarSeparator className="mx-2 bg-white/10" />

            <SidebarUserFooter
                user={user}
                label={tierLabel}
                navItems={[
                    { label: "Dashboard", href: "/dashboard", icon: (props: { className?: string }) => (
                        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="7" height="9" x="3" y="3" rx="1" />
                            <rect width="7" height="5" x="14" y="3" rx="1" />
                            <rect width="7" height="9" x="14" y="12" rx="1" />
                            <rect width="7" height="5" x="3" y="16" rx="1" />
                        </svg>
                    )},
                    { label: "Oracle", href: "/oracle", icon: GiCursedStar, iconClassName: "text-amber-400" },
                ]}
                showUpgrade={shouldShowUpgrade}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}