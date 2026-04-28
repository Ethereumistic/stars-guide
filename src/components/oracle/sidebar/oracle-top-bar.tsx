"use client";

import * as React from "react";
import { Users, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GiCursedStar } from "react-icons/gi";

interface OracleTopBarProps {
    showLogo: boolean;
    centerCtaLabel: string;
}

export function OracleTopBar({ showLogo, centerCtaLabel }: OracleTopBarProps) {
    return (
        <>
            {/* Decorative blur orbs */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-galactic/25 blur-[160px] opacity-30" />
            <div className="pointer-events-none absolute right-1/4 top-1/4 z-0 h-[300px] w-[300px] rounded-full bg-primary/15 blur-[120px] opacity-20" />

            <div className="relative z-20 px-3 pt-3 md:px-5 md:pt-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                        <SidebarTrigger className="h-9 w-9 border border-white/15 bg-background/60 text-foreground/70 hover:border-primary/40 hover:text-primary md:hidden transition-all duration-500" />
                        <div
                            className={`flex min-w-0 items-center gap-2 transition-all duration-300 ${
                                showLogo
                                    ? "translate-y-0 opacity-100 blur-0"
                                    : "-translate-y-1 opacity-0 blur-[2px]"
                            }`}
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-galactic/30 bg-galactic/15 text-galactic">
                                <GiCursedStar className="h-5 w-5" />
                            </div>
                            <span className="truncate text-xs font-serif italic tracking-wide lowercase text-foreground/70">
                                Oracle
                            </span>
                        </div>
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
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            className="h-9 w-9 border border-white/10 bg-background/40 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500"
                            title="Start group chat"
                        >
                            <Users className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            className="h-9 w-9 border border-white/10 bg-background/40 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500"
                            title="Start temporary chat"
                        >
                            <MessageSquarePlus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}