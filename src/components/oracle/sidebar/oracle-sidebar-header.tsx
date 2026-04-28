"use client";

import { Logo } from "@/components/ui/logo";
import {
    SidebarHeader,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { CollapsedOracleToggle } from "./collapsed-oracle-toggle";

export function OracleSidebarHeader() {
    return (
        <SidebarHeader className="h-[76px] shrink-0 border-b border-white/10 px-2">
            <div className="flex h-full items-center">
                <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex min-w-0 items-center justify-center mx-auto">
                        <Logo size="sm" variant="logo" />
                    </div>
                    <SidebarTrigger className="hidden h-9 w-9 border border-white/15 bg-background/70 text-foreground/70 hover:border-primary/40 hover:text-primary md:inline-flex transition-all duration-500" />
                </div>

                <div className="hidden w-full items-center justify-center group-data-[collapsible=icon]:flex">
                    <CollapsedOracleToggle />
                </div>
            </div>
        </SidebarHeader>
    );
}
