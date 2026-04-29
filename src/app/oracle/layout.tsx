"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";
import { OracleSidebar } from "@/components/oracle/sidebar/oracle-sidebar";
import { OracleTopBar } from "@/components/oracle/sidebar/oracle-top-bar";
import { OracleDebugPanel } from "@/components/oracle/debug/oracle-debug-panel";
import { useOracleSessions } from "@/components/oracle/sidebar/use-oracle-sessions";
import { tierLabels } from "@/components/oracle/sidebar/utils";
import { OracleChatSearchModal } from "@/components/oracle-chat-search-modal";

export default function OracleLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { signOut } = useAuthActions();
    const { user } = useUserStore();
    const resetToIdle = useOracleStore((s) => s.resetToIdle);
    const debugOpen = useOracleStore((s) => s.debugOpen);
    const setDebugOpen = useOracleStore((s) => s.setDebugOpen);
    const [showTopLogo, setShowTopLogo] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);

    const {
        sessions,
        rawSessions,
        deleteDialog,
        renameDialog,
        requestDelete,
        confirmDelete,
        cancelDelete,
        requestRename,
        confirmRename,
        cancelRename,
        handleSetStarType,
    } = useOracleSessions();

    React.useEffect(() => {
        const timer = window.setTimeout(() => setShowTopLogo(true), 40);
        return () => window.clearTimeout(timer);
    }, []);

    // Keyboard shortcut: Cmd+D / Ctrl+D to toggle debug panel
    React.useEffect(() => {
        if (user?.role !== "admin") return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "d") {
                e.preventDefault();
                setDebugOpen(!debugOpen);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [user?.role, debugOpen, setDebugOpen]);

    if (user === null) {
        router.push("/login");
        return null;
    }

    const plan = user?.tier ?? "free";
    const tierLabel = tierLabels[plan as keyof typeof tierLabels] ?? tierLabels.free;
    const shouldShowUpgrade = plan === "free" || plan === "popular";
    const centerCtaLabel = plan === "free" || plan === "popular" ? "Get Cosmic Flow" : "Get Oracle";

    const handleNewDivination = () => {
        resetToIdle();
        router.push("/oracle/new");
    };

    return (
        <>
            <SidebarProvider
                style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
                className="fixed inset-0 z-40 flex min-h-0! h-auto! w-full overflow-hidden"
            >
                <OracleSidebar
                    sessions={sessions}
                    deleteDialog={deleteDialog}
                    renameDialog={renameDialog}
                    onNewChat={handleNewDivination}
                    onSearchOpen={() => setSearchOpen(true)}
                    onRequestDelete={requestDelete}
                    onConfirmDelete={confirmDelete}
                    onCancelDelete={cancelDelete}
                    onRequestRename={requestRename}
                    onConfirmRename={confirmRename}
                    onCancelRename={cancelRename}
                    onSetStarType={handleSetStarType}
                    user={user}
                    tierLabel={tierLabel}
                    shouldShowUpgrade={shouldShowUpgrade}
                    onSignOut={() => signOut()}
                />

                <SidebarInset className="relative flex h-full min-h-0! w-full flex-1 flex-col overflow-hidden bg-transparent">
                    <OracleTopBar showLogo={showTopLogo} centerCtaLabel={centerCtaLabel} />
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-2 md:pt-3">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>

            <OracleChatSearchModal
                open={searchOpen}
                onOpenChange={setSearchOpen}
                sessions={(rawSessions ?? []).map((s) => ({
                    _id: String(s._id),
                    title: s.title,
                    lastMessageAt: s.lastMessageAt ?? s.updatedAt ?? s.createdAt,
                }))}
                onNewChat={handleNewDivination}
            />

            {/* Debug panel — admin only */}
            {user?.role === "admin" && <OracleDebugPanel />}
        </>
    );
}