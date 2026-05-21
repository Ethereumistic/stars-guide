"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import { type LucideIcon } from "lucide-react";
import { type ComponentType } from "react";

export interface SidebarActionButton {
    icon: LucideIcon | ComponentType<{ className?: string }>;
    label: string;
    tooltip: string;
    onClick: () => void;
}

export interface SidebarActionLink {
    icon: LucideIcon | ComponentType<{ className?: string }>;
    label: string;
    tooltip: string;
    href: string;
}

export interface SidebarQuickActionsProps {
    actions?: SidebarActionButton[];
    links?: SidebarActionLink[];
    className?: string;
    iconClassName?: string;
}

export function SidebarQuickActions({ actions = [], links = [], className, iconClassName = "text-primary" }: SidebarQuickActionsProps) {
    return (
        <SidebarMenu className={cn("px-2 pt-2", className)}>
            {/* Action buttons (with onClick handlers) */}
            {actions.map((action, index) => (
                <SidebarMenuItem key={`action-${index}`}>
                    <SidebarMenuButton
                        tooltip={action.tooltip}
                        onClick={action.onClick}
                        className="h-10 gap-3 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500 group-data-[collapsible=icon]:justify-center"
                    >
                        <action.icon className={cn("h-4 w-4", iconClassName)} />
                        <span className="font-serif text-sm italic lowercase tracking-wide group-data-[collapsible=icon]:hidden">
                            {action.label}
                        </span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}

            {/* Navigation links */}
            {links.map((link, index) => (
                <SidebarMenuItem key={`link-${index}`}>
                    <SidebarMenuButton
                        tooltip={link.tooltip}
                        asChild
                        className="h-10 gap-3 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500 group-data-[collapsible=icon]:justify-center"
                    >
                        <Link href={link.href}>
                            <link.icon className={cn("h-4 w-4", iconClassName)} />
                            <span className="font-serif text-sm italic lowercase tracking-wide group-data-[collapsible=icon]:hidden">
                                {link.label}
                            </span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}