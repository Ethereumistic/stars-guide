"use client";

import Link from "next/link";
import {
    LogOut,
    ArrowLeft,
    Settings,
    LayoutDashboard,
    ChevronsUpDown,
    Bell,
} from "lucide-react";
import { GiCursedStar, GiScrollUnfurled } from "react-icons/gi";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
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

interface AdminSidebarFooterProps {
    user: {
        username?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
        role?: string | null | undefined;
    } | null | undefined;
    onSignOut: () => void;
}

export function AdminSidebarFooter({
    user,
    onSignOut,
}: AdminSidebarFooterProps) {
    return (
        <SidebarFooter className="p-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-auto w-full justify-start gap-2.5 rounded-xl border border-white/10 bg-background/40 px-2.5 py-2 text-left hover:bg-accent/40 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
                    >
                        <Avatar className="h-8 w-8 border border-white/15">
                            <AvatarImage src={user?.image ?? undefined} alt={user?.username ?? "Admin"} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                                {user?.username?.charAt(0)?.toUpperCase() ?? "A"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-serif text-foreground">
                                {user?.username ?? "Admin"}
                            </p>
                            <p className="truncate text-[11px] uppercase tracking-wide text-foreground/45">
                                Admin
                            </p>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-foreground/50 group-data-[collapsible=icon]:hidden" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-60 border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
                >
                    <DropdownMenuLabel className="font-normal">
                        <div className="space-y-0.5">
                            <p className="truncate text-sm font-serif text-foreground">
                                {user?.username ?? "Admin"}
                            </p>
                            <p className="truncate text-xs uppercase tracking-wide text-foreground/55">
                                {user?.email ?? "admin@stars.guide"}
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
                        <Link href="/oracle" className="cursor-pointer gap-2">
                            <GiCursedStar className="h-4 w-4" />
                            Oracle
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/journal" className="cursor-pointer gap-2">
                            <GiScrollUnfurled className="h-4 w-4" />
                            Journal
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>

                    <AdminNotificationItem />

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem asChild>
                        <Link href="/" className="cursor-pointer gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to stars.guide
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={onSignOut}
                        className="cursor-pointer gap-2 text-foreground/80 hover:text-primary focus:text-primary"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
    );
}

function AdminNotificationItem() {
    const unreadCount = useQuery(api.notifications.queries.unreadCount);
    const count = unreadCount ?? 0;

    return (
        <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer gap-2">
                <Bell className="h-4 w-4" />
                <span className="flex-1">Notifications</span>
                {count > 0 && (
                    <Badge
                        variant="destructive"
                        className="min-w-[18px] h-[18px] px-1 text-[9px] font-mono leading-none p-0 flex items-center justify-center"
                    >
                        {count > 99 ? "99+" : count}
                    </Badge>
                )}
            </Link>
        </DropdownMenuItem>
    );
}
