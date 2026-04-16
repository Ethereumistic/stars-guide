"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
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

const initialDeleteState: DeleteDialogState = {
    open: false,
    sessionId: null,
    sessionTitle: "",
    isActive: false,
};

const initialRenameState: RenameDialogState = {
    open: false,
    sessionId: null,
    currentTitle: "",
};

export function useOracleSessions() {
    const router = useRouter();

    const sessions = useQuery(api.oracle.sessions.getUserSessions);
    const deleteSession = useMutation(api.oracle.sessions.deleteSession);
    const renameSession = useMutation(api.oracle.sessions.renameSession);
    const setSessionStarType = useMutation(api.oracle.sessions.setSessionStarType);

    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(initialDeleteState);
    const [renameDialog, setRenameDialog] = useState<RenameDialogState>(initialRenameState);

    const requestDelete = useCallback((sessionId: string, sessionTitle: string, isActive: boolean) => {
        setDeleteDialog({ open: true, sessionId, sessionTitle, isActive });
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteDialog.sessionId) return;
        const { sessionId, isActive } = deleteDialog;
        await deleteSession({ sessionId: sessionId as any });
        if (isActive) {
            router.push("/oracle/new");
        }
        setDeleteDialog(initialDeleteState);
    }, [deleteDialog, deleteSession, router]);

    const cancelDelete = useCallback(() => {
        setDeleteDialog(initialDeleteState);
    }, []);

    const requestRename = useCallback((sessionId: string, currentTitle: string) => {
        setRenameDialog({ open: true, sessionId, currentTitle });
    }, []);

    const confirmRename = useCallback(async (newTitle: string) => {
        if (!renameDialog.sessionId || !newTitle.trim()) return;
        await renameSession({ sessionId: renameDialog.sessionId as any, title: newTitle.trim() });
        setRenameDialog(initialRenameState);
    }, [renameDialog, renameSession]);

    const cancelRename = useCallback(() => {
        setRenameDialog(initialRenameState);
    }, []);

    const handleSetStarType = useCallback(async (sessionId: string, starType: StarType) => {
        if (starType === null) {
            await setSessionStarType({ sessionId: sessionId as any, starType: "none" });
        } else {
            await setSessionStarType({ sessionId: sessionId as any, starType });
        }
    }, [setSessionStarType]);

    const sessionItems: SessionItem[] | undefined = sessions?.map((s) => ({
        _id: s._id,
        title: s.title,
        starType: (s.starType as StarType) ?? null,
        lastMessageAt: s.lastMessageAt ?? s.updatedAt ?? s.createdAt,
        status: s.status,
    }));

    // Sort: cursed stars first, then beveled stars, then unstarred — each group by updatedAt desc
    const sortedSessionItems = sessionItems?.sort((a, b) => {
        const rank = (s: SessionItem) => {
            if (s.starType === "cursed") return 0;
            if (s.starType === "beveled") return 1;
            return 2;
        };
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        // Within same rank, sort by lastMessageAt descending
        return b.lastMessageAt - a.lastMessageAt;
    });

    return {
        sessions: sortedSessionItems,
        rawSessions: sessions,
        deleteDialog,
        renameDialog,
        requestDelete,
        confirmDelete,
        cancelDelete,
        requestRename,
        confirmRename,
        cancelRename,
        handleSetStarType,
    };
}