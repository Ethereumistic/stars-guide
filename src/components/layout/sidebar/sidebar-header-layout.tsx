"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
    SidebarHeader,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { CollapsedSidebarToggle } from "./collapsed-sidebar-toggle";

interface SidebarHeaderProps {
    homeHref?: string;
    triggerClassName?: string;
    className?: string;
}

export function SidebarHeaderLayout({
    homeHref = "/",
    triggerClassName = "hidden h-9 w-9 border border-white/15 bg-background/70 text-foreground/70 hover:border-primary/40 hover:text-primary md:inline-flex transition-all duration-500",
    className = "",
}: SidebarHeaderProps) {
    return (
        <SidebarHeader className={`h-[76px] shrink-0 border-b border-white/10 px-2 ${className}`}>
            <div className="flex h-full items-center">
                {/* Expanded state */}
                <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex min-w-0 items-center justify-center mx-auto">
                        <Link href={homeHref}>
                            <Logo size="sm" variant="logo" />
                        </Link>
                    </div>
                    <SidebarTrigger className={triggerClassName} />
                </div>

                {/* Collapsed state */}
                <div className="hidden w-full items-center justify-center group-data-[collapsible=icon]:flex">
                    <CollapsedSidebarToggle />
                </div>
            </div>
        </SidebarHeader>
    );
}