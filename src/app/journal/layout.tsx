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

export default function JournalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { signOut } = useAuthActions();
    const { user } = useUserStore();
    const [showTopLogo, setShowTopLogo] = React.useState(false);

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
    const centerCtaLabel = plan === "free" || plan === "popular" ? "Get Cosmic Flow" : "Journal";

    const handleNewEntry = () => {
        router.push("/journal/new");
    };

    return (
        <SidebarProvider
            style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
            className="fixed inset-0 z-40 flex min-h-0! h-auto! w-full overflow-hidden"
        >
            <JournalSidebar
                onNewEntry={handleNewEntry}
                user={user}
                tierLabel={tierLabel}
                shouldShowUpgrade={shouldShowUpgrade}
                onSignOut={() => signOut()}
            />

            <SidebarInset className="relative flex h-full min-h-0! w-full flex-1 flex-col overflow-hidden bg-transparent">
                <JournalTopBar showLogo={showTopLogo} centerCtaLabel={centerCtaLabel} />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto pt-2 md:pt-3">
                    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}