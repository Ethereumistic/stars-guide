"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GiScrollUnfurled } from "react-icons/gi";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface JournalTopBarProps {
    showLogo: boolean;
    onNewEntry?: () => void;
    onSearchOpen?: () => void;
}

export function JournalTopBar({ showLogo, onNewEntry, onSearchOpen }: JournalTopBarProps) {
    const router = useRouter();

    return (
        <>
            {/* Decorative blur orbs — same as Oracle */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--journal-accent,#c8a45c)]/10 blur-[160px] opacity-25" />
            <div className="pointer-events-none absolute right-1/4 top-1/4 z-0 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px] opacity-15" />

            <div className="relative z-20 px-3 pt-3 md:px-5 md:pt-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Left: sidebar trigger (mobile) */}
                    <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                        <SidebarTrigger className="h-9 w-9 border border-white/15 bg-background/60 text-foreground/70 hover:border-[var(--journal-accent,#c8a45c)]/40 hover:text-[var(--journal-accent,#c8a45c)] md:hidden transition-all duration-500" />
                    </div>

                    {/* Center: Journal logo — exactly mirrors Oracle's centered logo */}
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            className={`flex items-center gap-1.5 transition-all duration-300 ${
                                showLogo
                                    ? "translate-y-0 opacity-100 blur-0"
                                    : "-translate-y-1 opacity-0 blur-[2px]"
                            }`}
                        >
                            <GiScrollUnfurled className="size-5 text-[var(--journal-accent,#c8a45c)]" />
                            <span className="text-base font-serif font-black tracking-wide lowercase text-white">
                                Journal
                            </span>
                        </div>
                    </div>

                    {/* Right: Search + New Entry — mirrors Oracle right side */}
                    <div className="flex flex-1 items-center justify-end gap-1 md:gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onSearchOpen}
                            className="h-9 w-9 border border-white/10 bg-background/40 text-foreground/70 hover:bg-[var(--journal-accent,#c8a45c)]/10 hover:text-[var(--journal-accent,#c8a45c)] hover:border-[var(--journal-accent,#c8a45c)]/30 transition-all duration-500"
                            title="Search entries"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onNewEntry ?? (() => router.push("/journal/new"))}
                            className="h-9 w-9 border border-white/10 bg-background/40 text-foreground/70 hover:bg-[var(--journal-accent,#c8a45c)]/10 hover:text-[var(--journal-accent,#c8a45c)] hover:border-[var(--journal-accent,#c8a45c)]/30 transition-all duration-500"
                            title="New entry"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}