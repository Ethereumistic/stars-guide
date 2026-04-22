"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
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
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Plus className="h-4 w-4 text-galactic" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">New chat</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Search chats"
                    onClick={onSearchOpen}
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Search className="h-4 w-4 text-galactic" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">Search chats</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Journal"
                    asChild
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Link href="/journal">
                        <BookOpen className="h-4 w-4 text-galactic" />
                        <span className="font-medium group-data-[collapsible=icon]:hidden">Journal</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}