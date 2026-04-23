"use client";

import { Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";

interface JournalSidebarActionsProps {
    onNewEntry: () => void;
}

export function JournalSidebarActions({ onNewEntry }: JournalSidebarActionsProps) {
    const router = useRouter();

    return (
        <SidebarMenu className="px-2 pt-2">
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="New entry"
                    onClick={onNewEntry}
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Plus className="h-4 w-4 text-galactic" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">New entry</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Search entries"
                    onClick={() => router.push("/journal/search")}
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Search className="h-4 w-4 text-galactic" />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">Search</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Oracle"
                    asChild
                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                >
                    <Link href="/oracle">
                        <Sparkles className="h-4 w-4 text-galactic" />
                        <span className="font-medium group-data-[collapsible=icon]:hidden">Oracle</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}