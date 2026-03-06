"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import {
    Plus,
    Search,
    MessageSquare,
    Loader2,
    LogOut,
    ArrowLeft,
    Users,
    MessageSquarePlus,
    Sparkles,
    PanelLeft,
    Settings,
    LayoutDashboard,
    ChevronsUpDown,
} from "lucide-react";
import { GiCursedStar, GiGiftOfKnowledge } from "react-icons/gi";
import { Logo } from "@/components/ui/logo";
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
    SidebarFooter,
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";
import { OracleChatSearchModal } from "@/components/oracle-chat-search-modal";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

const roleLabels: Record<"user" | "popular" | "premium" | "moderator" | "admin", string> = {
    user: "user (free)",
    popular: "popular (Cosmic Flow)",
    premium: "premium (Oracle)",
    moderator: "moderator (Mod)",
    admin: "admin (Admin)",
};

function CollapsedOracleToggle() {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-galactic/30 bg-galactic/15 text-galactic transition-all duration-300 hover:border-galactic/50 hover:bg-galactic/20"
            aria-label="Expand sidebar"
            title="Expand sidebar"
        >
            <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-90 group-hover:opacity-0">
                <GiCursedStar className="h-5 w-5" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                <PanelLeft className="h-5 w-5" />
            </span>
            <span className="sr-only">Expand sidebar</span>
        </button>
    );
}

export default function OracleLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { signOut } = useAuthActions();
    const { user } = useUserStore();
    const resetToIdle = useOracleStore((s) => s.resetToIdle);
    const [showTopLogo, setShowTopLogo] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);

    const sessions = useQuery(api.oracle.sessions.getUserSessions);

    React.useEffect(() => {
        const timer = window.setTimeout(() => setShowTopLogo(true), 40);
        return () => window.clearTimeout(timer);
    }, []);

    const handleNewDivination = () => {
        resetToIdle();
        router.push("/oracle/new");
    };

    if (user === null) {
        router.push("/login");
        return null;
    }

    const role = (user?.role ?? "user") as "user" | "popular" | "premium" | "moderator" | "admin";
    const roleLabel = roleLabels[role] ?? roleLabels.user;
    const shouldShowUpgrade = role === "user" || role === "popular";
    const centerCtaLabel = role === "user" || role === "popular" ? "Get Cosmic Flow" : "Get Oracle";

    return (
        <>
            <SidebarProvider
                style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
                className="fixed inset-0 z-40 flex min-h-0! h-auto! w-full overflow-hidden"
            >
                <Sidebar variant="sidebar" collapsible="icon" className="border-r border-white/10 bg-black/25 backdrop-blur-xl overflow-hidden">
                    <SidebarHeader className="h-[76px] shrink-0 border-b border-white/10 px-2">
                        <div className="flex h-full items-center">
                            <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-galactic/30 bg-galactic/15 text-galactic">
                                        <GiCursedStar className="h-5 w-5" />
                                    </div>
                                    <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Oracle</span>
                                </div>
                                <SidebarTrigger className="hidden h-9 w-9 border border-white/15 bg-background/70 text-white/80 hover:border-galactic/50 hover:text-white md:inline-flex" />
                            </div>

                            <div className="hidden w-full items-center justify-center group-data-[collapsible=icon]:flex">
                                <CollapsedOracleToggle />
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                        <SidebarMenu className="px-2 pt-2">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    tooltip="New chat"
                                    onClick={handleNewDivination}
                                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                                >
                                    <Plus className="h-4 w-4 text-galactic" />
                                    <span className="font-medium group-data-[collapsible=icon]:hidden">New chat</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    tooltip="Search chats"
                                    onClick={() => setSearchOpen(true)}
                                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                                >
                                    <Search className="h-4 w-4 text-galactic" />
                                    <span className="font-medium group-data-[collapsible=icon]:hidden">Search chats</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    tooltip="Journal"
                                    className="h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center"
                                >
                                    <GiGiftOfKnowledge className="h-4 w-4 text-galactic" />
                                    <span className="font-medium group-data-[collapsible=icon]:hidden">Journal</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>

                        <SidebarGroup className="mt-2 min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <SidebarGroupLabel className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                                <MessageSquare className="h-3 w-3 text-white/40" />
                                <span>Past Whispers</span>
                            </SidebarGroupLabel>
                            <SidebarGroupContent className="h-full">
                                <ScrollArea className="h-[calc(100%-60px)] -mr-2 pr-2">
                                    <SidebarMenu>
                                        {sessions === undefined ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                                            </div>
                                        ) : sessions.length === 0 ? (
                                            <div className="px-3 py-4 text-center">
                                                <GiCursedStar className="mx-auto mb-2 h-5 w-5 text-white/15" />
                                                <p className="text-[11px] italic leading-relaxed text-white/25">
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
                                                            className="h-auto min-h-12 items-start px-2.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white overflow-hidden"
                                                        >
                                                            <Link href={`/oracle/chat/${session._id}`} className="flex w-full min-w-0 items-center gap-2.5">
                                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none">
                                                                    {session.categoryIcon ?? "*"}
                                                                </span>
                                                                <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight group-data-[collapsible=icon]:hidden">
                                                                    <span className="truncate max-w-[25ch] text-sm text-white/80">{session.title}</span>
                                                                    <span className="text-[10px] text-white/35">
                                                                        {formatRelativeTime(session.lastMessageAt)}
                                                                    </span>
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                );
                                            })
                                        )}
                                    </SidebarMenu>
                                    <ScrollBar className="w-2 border-l-0 " />
                                </ScrollArea>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarSeparator className="mx-2 bg-white/10" />
                    <SidebarFooter className="p-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-auto w-full justify-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left hover:bg-white/10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
                                >
                                    <Avatar className="h-8 w-8 border border-white/15">
                                        <AvatarImage src={user?.image} alt={user?.username ?? "User"} />
                                        <AvatarFallback className="bg-white/10 text-white">
                                            {user?.username?.charAt(0)?.toUpperCase() ?? "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                                        <p className="truncate text-sm font-medium text-white">{user?.username ?? "Seeker"}</p>
                                        <p className="truncate text-[11px] uppercase tracking-wide text-white/45">{roleLabel}</p>
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
                                        <p className="truncate text-sm font-medium">{user?.username ?? "Seeker"}</p>
                                        <p className="truncate text-xs uppercase tracking-wide text-white/55">{roleLabel}</p>
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
                                    <Link href="/settings" className="cursor-pointer gap-2">
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>

                                {shouldShowUpgrade && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/pricing" className="cursor-pointer gap-2 text-galactic focus:text-galactic">
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

                                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer gap-2 text-white/90">
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset className="relative flex h-full min-h-0! w-full flex-1 flex-col overflow-hidden bg-transparent">
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-galactic/25 blur-[160px] opacity-30" />
                    <div className="pointer-events-none absolute right-1/4 top-1/4 z-0 h-[300px] w-[300px] rounded-full bg-primary/15 blur-[120px] opacity-20" />

                    <div className="relative z-20 px-3 pt-3 md:px-5 md:pt-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                                <SidebarTrigger className="h-9 w-9 border border-white/15 bg-background/70 text-white/80 hover:border-galactic/50 hover:text-white md:hidden" />
                                <Link
                                    href="/"
                                    className={`min-w-0 transition-all duration-300 ${showTopLogo
                                        ? "translate-y-0 opacity-100 blur-0"
                                        : "-translate-y-1 opacity-0 blur-[2px]"
                                        }`}
                                >
                                    <Logo size="xs" variant="logo" />
                                </Link>
                            </div>

                            <div className="flex flex-1 items-center justify-center">
                                <Button
                                    variant="outline"
                                    className="h-9 shrink-0 border-galactic/40 bg-galactic/15 text-xs uppercase tracking-[0.14em] text-white hover:bg-galactic/25 md:h-10 md:text-sm"
                                >
                                    {centerCtaLabel}
                                </Button>
                            </div>

                            <div className="flex flex-1 items-center justify-end gap-1 md:gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                    aria-label="Start group chat"
                                    title="Start group chat"
                                >
                                    <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                    aria-label="Start temporary chat"
                                    title="Start temporary chat"
                                >
                                    <MessageSquarePlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-2 md:pt-3">{children}</div>
                </SidebarInset>
            </SidebarProvider>

            <OracleChatSearchModal
                open={searchOpen}
                onOpenChange={setSearchOpen}
                sessions={(sessions ?? []).map((s) => ({
                    _id: String(s._id),
                    title: s.title,
                    lastMessageAt: s.lastMessageAt,
                }))}
                onNewChat={handleNewDivination}
            />
        </>
    );
}
