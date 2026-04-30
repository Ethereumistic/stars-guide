"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    FileText,
    Globe,
    Sparkles,
    ClipboardCheck,
    LayoutDashboard,
    Shield,
    Anchor,
    Settings,
    Bell,
    Bug,
    PanelLeft,
} from "lucide-react";
import { GiCursedStar, GiScrollUnfurled, GiStarSwirl } from "react-icons/gi";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { AdminSidebarFooter } from "./admin-sidebar-footer";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dashboardNavItems = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
];

const horoscopeNavItems = [
    { title: "Overview", href: "/admin/horoscope", icon: LayoutDashboard },
    { title: "Context Editor", href: "/admin/horoscope/context", icon: FileText },
    { title: "Zeitgeist Engine", href: "/admin/horoscope/zeitgeist", icon: Globe },
    { title: "Generation Desk", href: "/admin/horoscope/generator", icon: Sparkles },
    { title: "Hook Manager", href: "/admin/horoscope/hooks", icon: Anchor },
    { title: "Review & Publish", href: "/admin/horoscope/review", icon: ClipboardCheck },
];

const oracleNavItems = [
    { title: "Oracle Overview", href: "/admin/oracle", icon: LayoutDashboard },
    { title: "Settings", href: "/admin/oracle/settings", icon: Settings },
    { title: "Debug Live", href: "/admin/oracle/debug", icon: Bug },
];

const journalNavItems = [
    { title: "Journal Overview", href: "/admin/journal", icon: LayoutDashboard },
    { title: "Settings", href: "/admin/journal/settings", icon: Settings },
];

const moderationNavItems = [
    { title: "Username Bans", href: "/admin/ban", icon: Shield },
];

const notificationNavItems = [
    { title: "Notifications", href: "/admin/notifications", icon: Bell },
];

function CollapsedAdminToggle() {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/20"
            aria-label="Expand sidebar"
            title="Expand sidebar"
        >
            <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-90 group-hover:opacity-0">
                <GiStarSwirl className="h-5 w-5" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                <PanelLeft className="h-5 w-5" />
            </span>
            <span className="sr-only">Expand sidebar</span>
        </button>
    );
}

function renderNavSection(
    items: typeof dashboardNavItems,
    isActive: (item: typeof dashboardNavItems[number]) => boolean,
) {
    const pathname = usePathname();

    return (
        <SidebarMenu>
            {items.map((item) => {
                const active = isActive(item);
                return (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={active}
                            className="transition-all duration-200"
                        >
                            <Link href={item.href}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );
}

function SectionLabel({
    icon,
    label,
    className,
}: {
    icon: React.ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <div className={cn("px-3 py-1.5 flex items-center gap-2", className)}>
            {icon}
            <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {label}
            </span>
        </div>
    );
}

interface AdminSidebarProps {
    userEmail: string;
    user: {
        username?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
        role?: string | null | undefined;
    } | null | undefined;
    onSignOut: () => void;
}

export function AdminSidebar({ userEmail, user, onSignOut }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="border-r border-white/10 bg-background/40 backdrop-blur-md overflow-hidden"
        >
            <SidebarHeader className="h-[76px] shrink-0 border-b border-white/10 px-2">
                <div className="flex h-full items-center">
                    <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                        <div className="flex min-w-0 items-center justify-center mx-auto">
                            <Logo size="sm" variant="logo" />
                        </div>
                        <SidebarTrigger className="hidden h-9 w-9 border border-white/15 bg-background/70 text-foreground/70 hover:border-primary/40 hover:text-primary md:inline-flex transition-all duration-500" />
                    </div>

                    <div className="hidden w-full items-center justify-center group-data-[collapsible=icon]:flex">
                        <CollapsedAdminToggle />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="flex flex-col overflow-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                {renderNavSection(
                    dashboardNavItems,
                    (item) =>
                        pathname === item.href,
                )}

                {/* Horoscope Engine Section */}
                <Separator className="opacity-20 my-3" />
                <SectionLabel
                    icon={<GiStarSwirl className="h-4 w-4 text-galactic" />}
                    label="Horoscope Engine"
                />
                {renderNavSection(horoscopeNavItems, (item) =>
                    pathname === item.href ||
                    (item.href !== "/admin/horoscope" && pathname?.startsWith(item.href)),
                )}

                {/* Oracle CMS Section */}
                <Separator className="opacity-20 my-3" />
                <SectionLabel
                    icon={<GiCursedStar className="h-4 w-4 text-galactic" />}
                    label="Oracle CMS"
                />
                {renderNavSection(oracleNavItems, (item) =>
                    pathname === item.href ||
                    (item.href !== "/admin/oracle" && pathname?.startsWith(item.href)),
                )}

                {/* Journal CMS Section */}
                <Separator className="opacity-20 my-3" />
                <SectionLabel
                    icon={<GiScrollUnfurled className="h-4 w-4 text-galactic" />}
                    label="Journal CMS"
                />
                {renderNavSection(journalNavItems, (item) =>
                    pathname === item.href ||
                    (item.href !== "/admin/journal" && pathname?.startsWith(item.href)),
                )}

                {/* Moderation Section */}
                <Separator className="opacity-20 my-3" />
                <SectionLabel
                    icon={<Shield className="h-4 w-4 text-red-400" />}
                    label="MODERATION"
                />
                {renderNavSection(moderationNavItems, (item) => pathname === item.href)}

                {/* Notifications Section */}
                <Separator className="opacity-20 my-3" />
                <SectionLabel
                    icon={<Bell className="h-4 w-4 text-galactic" />}
                    label="NOTIFICATIONS"
                />
                {renderNavSection(notificationNavItems, (item) => pathname === item.href)}
            </SidebarContent>

            <SidebarSeparator className="mx-2 bg-white/10" />

            <AdminSidebarFooter
                user={user}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}
