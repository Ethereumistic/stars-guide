"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar";
import { useUserStore } from "@/store/use-user-store";
import { JournalSidebar } from "@/components/journal/sidebar/journal-sidebar";
import { JournalTopBar } from "@/components/journal/sidebar/journal-top-bar";
import { tierLabels } from "@/components/oracle/sidebar/utils";
import { useJournalSidebarEntries } from "@/components/journal/sidebar/use-journal-sidebar-entries";

export default function JournalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { signOut } = useAuthActions();
    const { user } = useUserStore();
    const [showTopLogo, setShowTopLogo] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);

    const {
        entries,
        isLoading,
        deleteDialog,
        requestDelete,
        confirmDelete,
        cancelDelete,
        handleTogglePin,
    } = useJournalSidebarEntries();

    React.useEffect(() => {
        const timer = window.setTimeout(() => setShowTopLogo(true), 40);
        return () => window.clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        if (user === null) {
            router.push("/login");
        }
    }, [user, router]);

    if (user === null) {
        return null;
    }

    const plan = user?.tier ?? "free";
    const tierLabel = tierLabels[plan as keyof typeof tierLabels] ?? tierLabels.free;
    const shouldShowUpgrade = plan === "free" || plan === "popular";

    const handleNewEntry = () => {
        router.push("/journal/new");
    };

    const handleSearchOpen = () => {
        // Navigate to /journal with search tab active
        router.push("/journal?tab=search");
    };

    return (
        <SidebarProvider
            style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
            className="fixed inset-0 z-40 flex min-h-0! h-auto! w-full overflow-hidden"
        >
            <JournalSidebar
                entries={entries}
                isLoading={isLoading}
                deleteDialog={deleteDialog}
                onNewEntry={handleNewEntry}
                onSearchOpen={handleSearchOpen}
                onRequestDelete={requestDelete}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                onTogglePin={handleTogglePin}
                user={user}
                tierLabel={tierLabel}
                shouldShowUpgrade={shouldShowUpgrade}
                onSignOut={() => signOut()}
            />

            <SidebarInset className="relative flex h-full min-h-0! w-full flex-1 flex-col overflow-hidden bg-transparent">
                <JournalTopBar
                    showLogo={showTopLogo}
                    onNewEntry={handleNewEntry}
                    onSearchOpen={handleSearchOpen}
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-2 md:pt-3">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}