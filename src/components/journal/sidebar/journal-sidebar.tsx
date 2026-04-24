"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { JournalSidebarHeader } from "./journal-sidebar-header";
import { JournalSidebarActions } from "./journal-sidebar-actions";
import { JournalNavSection } from "./journal-nav-section";
import { JournalSidebarFooter } from "./journal-sidebar-footer";

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
            <JournalSidebarHeader />

            <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                <JournalSidebarActions onNewEntry={onNewEntry} />

                <JournalNavSection />
            </SidebarContent>

            <SidebarSeparator className="mx-2 bg-white/10" />

            <JournalSidebarFooter
                user={user}
                tierLabel={tierLabel}
                shouldShowUpgrade={shouldShowUpgrade}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}