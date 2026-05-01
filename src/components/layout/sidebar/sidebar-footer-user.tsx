"use client";

import Link from "next/link";
import {
    LogOut,
    ArrowLeft,
    Settings,
    ChevronsUpDown,
    type LucideIcon,
} from "lucide-react";
import { ComponentType } from "react";
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

export type SidebarIcon = LucideIcon | ComponentType<{ className?: string }>;

export interface NavItem {
    label: string;
    href: string;
    icon: SidebarIcon;
    iconClassName?: string;
}

interface SidebarUserFooterProps {
    user: {
        username?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
    } | null | undefined;
    label: string;
    navItems?: NavItem[];
    showUpgrade?: boolean;
    onSignOut: () => void;
}

export function SidebarUserFooter({
    user,
    label,
    navItems = [],
    showUpgrade = false,
    onSignOut,
}: SidebarUserFooterProps) {
    const unreadCount = useQuery(api.notifications.queries.unreadCount);
    const count = unreadCount ?? 0;

    const defaultLabel = user?.username ?? label;
    const fallbackChar = user?.username?.charAt(0)?.toUpperCase() ?? label.charAt(0);

    return (
        <SidebarFooter className="p-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-auto w-full justify-start gap-2.5 rounded-xl border border-white/10 bg-background/40 px-2.5 py-2 text-left hover:bg-accent/40 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
                    >
                        <Avatar className="h-8 w-8 border border-white/15">
                            <AvatarImage
                                src={user?.image ?? undefined}
                                alt={defaultLabel}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">
                                {fallbackChar}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-serif text-foreground">
                                {defaultLabel}
                            </p>
                            <p className="truncate text-[11px] uppercase tracking-wide text-foreground/45">
                                {label}
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
                                {defaultLabel}
                            </p>
                            <p className="truncate text-xs uppercase tracking-wide text-foreground/55">
                                {user?.email ?? label}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />

                    {/* Custom nav items passed from parent */}
                    {navItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="cursor-pointer gap-2">
                                <item.icon className={`h-4 w-4 ${item.iconClassName ?? ""}`} />
                                {item.label}
                            </Link>
                        </DropdownMenuItem>
                    ))}

                    {/* Common items - Settings */}
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>

                    {/* Common items - Notifications */}
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer gap-2">
                            <span className="flex h-4 w-4 items-center justify-center">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                            </span>
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

                    {/* Upgrade option */}
                    {showUpgrade && (
                        <DropdownMenuItem asChild>
                            <Link
                                href="/pricing"
                                className="cursor-pointer gap-2 text-amber-400 focus:text-amber-400"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                    <path d="M5 3v4" />
                                    <path d="M19 17v4" />
                                    <path d="M3 5h4" />
                                    <path d="M17 19h4" />
                                </svg>
                                Upgrade plan
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-white/10" />

                    {/* Common items - Back to stars.guide */}
                    <DropdownMenuItem asChild>
                        <Link href="/" className="cursor-pointer gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to stars.guide
                        </Link>
                    </DropdownMenuItem>

                    {/* Common items - Sign out */}
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