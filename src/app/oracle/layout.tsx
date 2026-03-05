"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "motion/react";
import {
    PlusCircle,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarHeader,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OracleLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useUserStore();
    const resetToIdle = useOracleStore((s) => s.resetToIdle);
    const currentSessionId = useOracleStore((s) => s.sessionId);

    // Fetch real sessions from Convex
    const sessions = useQuery(api.oracle.sessions.getUserSessions);

    const handleNewDivination = () => {
        resetToIdle();
        router.push("/oracle/new");
    };

    // Redirect unauthenticated users
    if (user === null) {
        router.push("/login");
        return null;
    }

    return (
        <SidebarProvider className="fixed top-0 bottom-0 left-0 right-0 flex min-h-0! h-auto! w-full overflow-hidden z-40">
            {/* ─── Sidebar ─── */}
            <Sidebar variant="sidebar" collapsible="icon">
                {/* Logo header */}
                <SidebarHeader className="h-[80px] flex items-center justify-center px-4 border-b border-white/5 shrink-0">
                    <Link href="/" className="transition-transform duration-300 hover:scale-[1.02]">
                        <div className="group-data-[collapsible=icon]:hidden">
                            <Logo size="sm" variant="logo" />
                        </div>
                        <div className="hidden group-data-[collapsible=icon]:block">
                            <Logo size="sm" variant="logomark" />
                        </div>
                    </Link>
                </SidebarHeader>

                <SidebarContent className="scrollbar-thin scrollbar-thumb-white/10 p-2 overflow-y-auto">
                    {/* New Divination button */}
                    <div className="p-2 w-full">
                        <Button
                            variant="outline"
                            onClick={handleNewDivination}
                            className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 border-white/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 transition-colors duration-300"
                        >
                            <PlusCircle className="w-4 h-4 text-galactic" />
                            <span className="group-data-[collapsible=icon]:hidden font-medium">New Divination</span>
                        </Button>
                    </div>

                    {/* Past Whispers */}
                    <SidebarGroup className="mt-4">
                        <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-white/40 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3 text-white/40" />
                            <span>Past Whispers</span>
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {sessions === undefined ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="px-3 py-4 text-center">
                                        <GiCursedStar className="w-5 h-5 text-white/15 mx-auto mb-2" />
                                        <p className="text-[11px] text-white/25 italic leading-relaxed">
                                            Your whispers from the stars will appear here
                                        </p>
                                    </div>
                                ) : (
                                    sessions.map((session) => {
                                        const isActive = pathname?.includes(session._id);
                                        return (
                                            <SidebarMenuItem key={session._id}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive}
                                                    className="text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                                >
                                                    <Link href={`/oracle/chat/${session._id}`}>
                                                        <div className="flex items-center gap-2 w-full min-w-0">
                                                            <span className="shrink-0 text-base">{session.categoryIcon ?? "✦"}</span>
                                                            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                                                                <span className="truncate block text-sm">
                                                                    {session.title}
                                                                </span>
                                                                <span className="text-[10px] text-white/30">
                                                                    {formatRelativeTime(session.lastMessageAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            {/* ─── Main content area ─── */}
            <SidebarInset className="relative flex-1 flex flex-col bg-transparent overflow-hidden w-full h-full min-h-0! pt-[80px]">
                {/* Ambient glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-galactic/25 rounded-full blur-[160px] pointer-events-none opacity-30 z-0" />
                <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[120px] pointer-events-none opacity-20 z-0" />

                {/* Sidebar trigger */}
                <div className="absolute left-4 z-50">
                    <SidebarTrigger className="bg-background/80 backdrop-blur-xl border border-white/10 hover:border-galactic/50 shadow-lg text-white/70 hover:text-white h-10 w-10 [&_svg]:size-5" />
                </div>

                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
