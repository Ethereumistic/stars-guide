"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { OracleSidebarHeader } from "./oracle-sidebar-header";
import { OracleSidebarActions } from "./oracle-sidebar-actions";
import { PastWhispersSection } from "./past-whispers-section";
import { OracleSidebarFooter } from "./oracle-sidebar-footer";
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
            <OracleSidebarHeader />

            <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                <OracleSidebarActions onNewChat={onNewChat} onSearchOpen={onSearchOpen} />

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

            <OracleSidebarFooter
                user={user}
                tierLabel={tierLabel}
                shouldShowUpgrade={shouldShowUpgrade}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}