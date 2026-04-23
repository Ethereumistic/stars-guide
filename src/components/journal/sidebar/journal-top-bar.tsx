"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";

interface JournalTopBarProps {
    showLogo: boolean;
    centerCtaLabel: string;
}

export function JournalTopBar({ showLogo, centerCtaLabel }: JournalTopBarProps) {
    return (
        <>
            {/* Decorative blur orbs */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-galactic/25 blur-[160px] opacity-30" />
            <div className="pointer-events-none absolute right-1/4 top-1/4 z-0 h-[300px] w-[300px] rounded-full bg-primary/15 blur-[120px] opacity-20" />

            <div className="relative z-20 px-3 pt-3 md:px-5 md:pt-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                        <SidebarTrigger className="h-9 w-9 border border-white/15 bg-background/70 text-white/80 hover:border-galactic/50 hover:text-white md:hidden" />
                        <Link
                            href="/"
                            className={`min-w-0 transition-all duration-300 ${
                                showLogo
                                    ? "translate-y-0 opacity-100 blur-0"
                                    : "-translate-y-1 opacity-0 blur-[2px]"
                            }`}
                        >
                            <Logo size="xs" variant="logo" />
                        </Link>
                    </div>

                    <div className="flex flex-1 items-center justify-center">
                        <Button
                            variant="outline"
                            className="h-9 shrink-0 border-galactic/40 bg-galactic/15 text-xs uppercase tracking-[0.14em] text-white hover:bg-galactic/25 md:h-10 md:text-sm"
                        >
                            {centerCtaLabel}
                        </Button>
                    </div>

                    <div className="flex flex-1 items-center justify-end gap-1 md:gap-2">
                        {/* Right side - same visual balance as Oracle */}
                        <div className="w-9" />
                        <div className="w-9" />
                    </div>
                </div>
            </div>
        </>
    );
}