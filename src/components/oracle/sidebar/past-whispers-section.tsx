"use client";

import { usePathname } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
} from "@/components/ui/sidebar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type SessionItem, type StarType, groupSessionsByTime } from "./utils";
import { SessionListItem } from "./session-list-item";
import { SessionListEmpty } from "./session-list-empty";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { RenameSessionDialog } from "./rename-session-dialog";

interface PastWhispersSectionProps {
    sessions: SessionItem[] | undefined;
    deleteDialog: {
        open: boolean;
        sessionId: string | null;
        sessionTitle: string;
        isActive: boolean;
    };
    renameDialog: {
        open: boolean;
        sessionId: string | null;
        currentTitle: string;
    };
    onRequestDelete: (sessionId: string, sessionTitle: string, isActive: boolean) => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onRequestRename: (sessionId: string, currentTitle: string) => void;
    onConfirmRename: (newTitle: string) => void;
    onCancelRename: () => void;
    onSetStarType: (sessionId: string, starType: StarType) => void;
}

function groupSessions(sessions: SessionItem[]) {
    const groups = new Map<string, SessionItem[]>();
    for (const session of sessions) {
        const label = groupSessionsByTime(session.lastMessageAt);
        const bucket = groups.get(label) ?? [];
        bucket.push(session);
        groups.set(label, bucket);
    }
    const order = ["Today", "Yesterday", "Previous 7 Days", "Older"];
    return order
        .filter((label) => groups.has(label))
        .map((label) => ({ label, items: groups.get(label)! }));
}

export function PastWhispersSection({
    sessions,
    deleteDialog,
    renameDialog,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
    onRequestRename,
    onConfirmRename,
    onCancelRename,
    onSetStarType,
}: PastWhispersSectionProps) {
    const pathname = usePathname();

    return (
        <>
            <SidebarGroup className="mt-2 min-h-0 flex-1 w-full min-w-0 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="flex items-center gap-2 text-[10px] font-serif tracking-wide lowercase italic text-foreground/40">
                    <MessageSquare className="h-3 w-3 text-foreground/40" />
                    <span>Past Whispers</span>
                </SidebarGroupLabel>
                <SidebarGroupContent className="h-full w-full min-w-12">
                    <ScrollArea className="h-full w-full min-w-0">
                        {sessions === undefined ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <SessionListEmpty />
                        ) : (
                            groupSessions(sessions).map((group) => (
                                <div key={group.label} className="mb-2">
                                    {group.items.length >= 2 && (
                                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/25">
                                            {group.label}
                                        </p>
                                    )}
                                    <SidebarMenuSub className="mx-0 border-none pl-0 gap-0.5">
                                        {group.items.map((session) => {
                                            const isActive =
                                                pathname === `/oracle/chat/${session._id}`;
                                            return (
                                                <SessionListItem
                                                    key={session._id}
                                                    session={session}
                                                    isActive={isActive}
                                                    onSetStarType={onSetStarType}
                                                    onRequestDelete={onRequestDelete}
                                                    onRequestRename={onRequestRename}
                                                />
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </div>
                            ))
                        )}
                        <ScrollBar className="w-2 border-l-0" />
                    </ScrollArea>
                </SidebarGroupContent>
            </SidebarGroup>

            <DeleteSessionDialog
                open={deleteDialog.open}
                onOpenChange={(open) => {
                    if (!open) onCancelDelete();
                }}
                onConfirm={onConfirmDelete}
                sessionTitle={deleteDialog.sessionTitle}
            />

            <RenameSessionDialog
                open={renameDialog.open}
                onOpenChange={(open) => {
                    if (!open) onCancelRename();
                }}
                onRename={onConfirmRename}
                currentTitle={renameDialog.currentTitle}
            />
        </>
    );
}