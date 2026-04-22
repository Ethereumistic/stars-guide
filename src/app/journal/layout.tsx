"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { JournalSidebarContent } from "@/components/journal/journal-sidebar";
import { useUserStore } from "@/store/use-user-store";

export default function JournalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useUserStore();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);

    React.useEffect(() => {
        if (user === null) {
            router.push("/login");
        }
    }, [user, router]);

    if (user === null) {
        return null;
    }

    return (
        <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex-shrink-0 border-r border-white/5 bg-background/95 transition-all duration-200 h-full overflow-y-auto",
                    sidebarOpen ? "w-56" : "w-0 border-r-0"
                )}
            >
                {sidebarOpen && <JournalSidebarContent />}
            </aside>

            {/* Toggle sidebar button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-0 top-0 z-20 m-3 rounded-md p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                style={{ left: sidebarOpen ? "14rem" : "0" }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {sidebarOpen ? (
                        <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                    ) : (
                        <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                    )}
                </svg>
            </button>

            {/* Main content */}
            <main className="flex-1 min-w-0 overflow-y-auto">
                <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
                    {children}
                </div>
            </main>
        </div>
    );
}