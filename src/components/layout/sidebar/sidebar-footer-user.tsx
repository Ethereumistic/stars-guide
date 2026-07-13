"use client";

import Link from "next/link";
import { ArrowLeft, ChevronsUpDown, Gauge, LogOut, Settings, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
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
export interface NavItem { label: string; href: string; icon: SidebarIcon; iconClassName?: string }

interface SidebarUserFooterProps {
    user: { username?: string | null; email?: string | null; image?: string | null } | null | undefined;
    label: string;
    navItems?: NavItem[];
    showUpgrade?: boolean;
    onUsage?: () => void;
    onSignOut: () => void;
}

const itemClass = "cursor-pointer gap-2.5 px-3 py-2 text-sm text-foreground/80 hover:text-primary focus:text-primary";
const itemTextClass = "font-serif italic";
const iconClass = "h-4 w-4 text-primary";

export function SidebarUserFooter({
    user,
    label,
    navItems = [],
    showUpgrade = false,
    onUsage,
    onSignOut,
}: SidebarUserFooterProps) {
    const count = useQuery(api.notifications.queries.unreadCount) ?? 0;
    const defaultLabel = user?.username ?? label;
    const fallbackChar = user?.username?.charAt(0)?.toUpperCase() ?? label.charAt(0);

    return (
        <SidebarFooter className="p-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-auto w-full justify-start gap-2.5 rounded-xl border border-white/10 bg-background/40 px-2.5 py-2 text-left hover:border-primary/20 hover:bg-primary/[0.04] group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                    >
                        <Avatar className="h-8 w-8 ring-1 ring-white/15">
                            <AvatarImage src={user?.image ?? undefined} alt={defaultLabel} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif">{fallbackChar}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-serif text-foreground">{defaultLabel}</p>
                            <p className="truncate text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{label}</p>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-foreground/40 group-data-[collapsible=icon]:hidden" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-80 border-white/10 bg-background/90 p-0 text-foreground shadow-xl backdrop-blur-xl">
                    <DropdownMenuLabel className="px-3 py-3 font-normal">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
                                <AvatarImage src={user?.image ?? undefined} alt={defaultLabel} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-serif">{fallbackChar}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-serif text-foreground">{defaultLabel}</p>
                                <p className="truncate text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{user?.email ?? label}</p>
                            </div>
                            <Settings className="size-4 shrink-0 text-foreground/30" />
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />

                    {navItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild className={itemClass}>
                            <Link href={item.href}>
                                <item.icon className={`${iconClass} ${item.iconClassName ?? ""}`} />
                                <span className={itemTextClass}>{item.label}</span>
                            </Link>
                        </DropdownMenuItem>
                    ))}

                    {onUsage && (
                        <DropdownMenuItem onSelect={onUsage} className={itemClass}>
                            <Gauge className={iconClass} />
                            <span className={itemTextClass}>Usage</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild className={itemClass}>
                        <Link href="/settings"><Settings className={iconClass} /><span className={itemTextClass}>Settings</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={itemClass}>
                        <Link href="/settings">
                            <span className="flex h-4 w-4 items-center justify-center text-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                            </span>
                            <span className={`flex-1 ${itemTextClass}`}>Notifications</span>
                            {count > 0 && <Badge variant="destructive" className="flex h-[18px] min-w-[18px] items-center justify-center p-0 px-1 text-[9px] font-mono">{count > 99 ? "99+" : count}</Badge>}
                        </Link>
                    </DropdownMenuItem>

                    {showUpgrade && (
                        <DropdownMenuItem asChild className={itemClass}>
                            <Link href="/pricing">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                </svg>
                                <span className={itemTextClass}>Upgrade plan</span>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild className={itemClass}>
                        <Link href="/"><ArrowLeft className={iconClass} /><span className={itemTextClass}>Back to stars.guide</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSignOut} className="cursor-pointer gap-2.5 px-3 py-2 text-sm text-destructive/80 hover:text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4" /><span className="font-sans italic">Sign out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
    );
}
