"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarHeaderLayout, SidebarUserFooter, SidebarQuickActions } from "@/components/layout/sidebar";
import { PastWhispersSection } from "./past-whispers-section";
import { GiScrollUnfurled } from "react-icons/gi";
import { Plus } from "lucide-react";
import { type SessionItem, type StarType } from "./utils";

interface DeleteDialogState {
    open: boolean;
    sessionId: string | null;
    sessionTitle: string;
    isActive: boolean;
}

interface RenameDialogState {
    open: boolean;
    sessionId: string | null;
    currentTitle: string;
}

interface OracleSidebarProps {
    sessions: SessionItem[] | undefined;
    deleteDialog: DeleteDialogState;
    renameDialog: RenameDialogState;
    onNewChat: () => void;
    onSearchOpen: () => void;
    onRequestDelete: (sessionId: string, sessionTitle: string, isActive: boolean) => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onRequestRename: (sessionId: string, currentTitle: string) => void;
    onConfirmRename: (newTitle: string) => void;
    onCancelRename: () => void;
    onSetStarType: (sessionId: string, starType: StarType) => void;
    user: {
        username?: string | null | undefined;
        image?: string | null | undefined;
    } | null | undefined;
    tierLabel: string;
    shouldShowUpgrade: boolean;
    onSignOut: () => void;
}

export function OracleSidebar({
    sessions,
    deleteDialog,
    renameDialog,
    onNewChat,
    onSearchOpen,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
    onRequestRename,
    onConfirmRename,
    onCancelRename,
    onSetStarType,
    user,
    tierLabel,
    shouldShowUpgrade,
    onSignOut,
}: OracleSidebarProps) {
    return (
        <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r border-white/10 bg-background/40 backdrop-blur-md overflow-hidden"
        >
            <SidebarHeaderLayout homeHref="/oracle" />

            <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                <SidebarQuickActions
                    actions={[
                        { icon: Plus, label: "New chat", tooltip: "New chat", onClick: onNewChat },
                        { icon: (props: { className?: string }) => (
                            <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        ), label: "Search", tooltip: "Search chats", onClick: onSearchOpen },
                    ]}
                    links={[
                        { icon: GiScrollUnfurled, label: "Journal", tooltip: "Journal", href: "/journal" },
                    ]}
                />

                <PastWhispersSection
                    sessions={sessions}
                    deleteDialog={deleteDialog}
                    renameDialog={renameDialog}
                    onRequestDelete={onRequestDelete}
                    onConfirmDelete={onConfirmDelete}
                    onCancelDelete={onCancelDelete}
                    onRequestRename={onRequestRename}
                    onConfirmRename={onConfirmRename}
                    onCancelRename={onCancelRename}
                    onSetStarType={onSetStarType}
                />
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
                    { label: "Journal", href: "/journal", icon: GiScrollUnfurled },
                ]}
                showUpgrade={shouldShowUpgrade}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}