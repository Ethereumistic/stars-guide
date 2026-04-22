"use client";

import Link from "next/link";
import {
    LogOut,
    ArrowLeft,
    Sparkles,
    Settings,
    LayoutDashboard,
    BookOpen,
    ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarFooter } from "@/components/ui/sidebar";

interface OracleSidebarFooterProps {
    user: {
        username?: string | null | undefined;
        image?: string | null | undefined;
    } | null | undefined;
    tierLabel: string;
    shouldShowUpgrade: boolean;
    onSignOut: () => void;
}

export function OracleSidebarFooter({
    user,
    tierLabel,
    shouldShowUpgrade,
    onSignOut,
}: OracleSidebarFooterProps) {
    return (
        <SidebarFooter className="p-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-auto w-full justify-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left hover:bg-white/10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
                    >
                        <Avatar className="h-8 w-8 border border-white/15">
                            <AvatarImage src={user?.image ?? undefined} alt={user?.username ?? "User"} />
                            <AvatarFallback className="bg-white/10 text-white">
                                {user?.username?.charAt(0)?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-medium text-white">
                                {user?.username ?? "Seeker"}
                            </p>
                            <p className="truncate text-[11px] uppercase tracking-wide text-white/45">
                                {tierLabel}
                            </p>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-white/50 group-data-[collapsible=icon]:hidden" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-60 border-white/15 bg-background/95 text-white backdrop-blur-xl"
                >
                    <DropdownMenuLabel className="font-normal">
                        <div className="space-y-0.5">
                            <p className="truncate text-sm font-medium">
                                {user?.username ?? "Seeker"}
                            </p>
                            <p className="truncate text-xs uppercase tracking-wide text-white/55">
                                {tierLabel}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/journal" className="cursor-pointer gap-2">
                            <BookOpen className="h-4 w-4" />
                            Journal
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>

                    {shouldShowUpgrade && (
                        <DropdownMenuItem asChild>
                            <Link
                                href="/pricing"
                                className="cursor-pointer gap-2 text-galactic focus:text-galactic"
                            >
                                <Sparkles className="h-4 w-4" />
                                Upgrade plan
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem asChild>
                        <Link href="/" className="cursor-pointer gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to stars.guide
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={onSignOut}
                        className="cursor-pointer gap-2 text-white/90"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
    );
}