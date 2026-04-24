"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { GiScrollUnfurled } from "react-icons/gi";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";

interface OracleSidebarActionsProps {
    onNewChat: () => void;
    onSearchOpen: () => void;
}

export function OracleSidebarActions({ onNewChat, onSearchOpen }: OracleSidebarActionsProps) {
    return (
        <SidebarMenu className="px-2 pt-2">
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="New chat"
                    onClick={onNewChat}
                    className="h-10 gap-3 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500 group-data-[collapsible=icon]:justify-center"
                >
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="font-serif text-sm italic lowercase tracking-wide group-data-[collapsible=icon]:hidden">New chat</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Search chats"
                    onClick={onSearchOpen}
                    className="h-10 gap-3 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500 group-data-[collapsible=icon]:justify-center"
                >
                    <Search className="h-4 w-4 text-primary" />
                    <span className="font-serif text-sm italic lowercase tracking-wide group-data-[collapsible=icon]:hidden">Search chats</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Journal"
                    asChild
                    className="h-10 gap-3 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500 group-data-[collapsible=icon]:justify-center"
                >
                    <Link href="/journal">
                        <GiScrollUnfurled className="h-4 w-4 text-primary" />
                        <span className="font-serif text-sm italic lowercase tracking-wide group-data-[collapsible=icon]:hidden">Journal</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}