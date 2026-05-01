"use client";

import * as React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarSeparator,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
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
    Cpu,
    ChevronRight,
} from "lucide-react";
import { GiCursedStar, GiScrollUnfurled, GiStarSwirl } from "react-icons/gi";
import { SidebarHeaderLayout, SidebarUserFooter } from "@/components/layout/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dashboardNavItems = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
];

const aiNavItems = [
    { title: "AI Infrastructure", href: "/admin/ai", icon: Cpu },
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

function NavItem({
    item,
    isActive,
}: {
    item: typeof aiNavItems[number];
    isActive: boolean;
}) {
    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={isActive}>
                <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}

function NavSection({
    title,
    icon,
    items,
    isItemActive,
    defaultOpen = false,
}: {
    title: string;
    icon: React.ReactNode;
    items: typeof horoscopeNavItems;
    isItemActive: (item: typeof horoscopeNavItems[number]) => boolean;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    const isAnyActive = items.some((item) => isItemActive(item));

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={isAnyActive}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full"
            >
                {icon}
                <span>{title}</span>
                <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
            </SidebarMenuButton>
            {isOpen && (
                <SidebarMenuSub>
                    {items.map((item) => (
                        <NavItem
                            key={item.href}
                            item={item}
                            isActive={isItemActive(item)}
                        />
                    ))}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
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
            <SidebarHeaderLayout homeHref="/" />

            <SidebarContent className="overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10">
                {/* Dashboard */}
                <SidebarGroup className="px-2 py-1.5">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {dashboardNavItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <Separator className="my-1" />

                {/* Features Group */}
                <SidebarGroup className="px-2 py-1.5">
                    <SidebarGroupLabel className="pl-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                        Features
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* AI Infrastructure */}
                            <NavSection
                                title="AI Infrastructure"
                                icon={<Cpu className="h-4 w-4 text-galactic shrink-0" />}
                                items={aiNavItems}
                                defaultOpen={false}
                                isItemActive={(item) =>
                                    pathname === item.href ||
                                    (item.href !== "/admin/ai" && pathname?.startsWith(item.href))
                                }
                            />

                            {/* Horoscope Engine */}
                            <NavSection
                                title="Horoscope Engine"
                                icon={<GiStarSwirl className="h-4 w-4 text-galactic shrink-0" />}
                                items={horoscopeNavItems}
                                defaultOpen={false}
                                isItemActive={(item) =>
                                    pathname === item.href ||
                                    (item.href !== "/admin/horoscope" && pathname?.startsWith(item.href))
                                }
                            />

                            {/* Oracle CMS */}
                            <NavSection
                                title="Oracle CMS"
                                icon={<GiCursedStar className="h-4 w-4 text-galactic shrink-0" />}
                                items={oracleNavItems}
                                defaultOpen={false}
                                isItemActive={(item) =>
                                    pathname === item.href ||
                                    (item.href !== "/admin/oracle" && pathname?.startsWith(item.href))
                                }
                            />

                            {/* Journal CMS */}
                            <NavSection
                                title="Journal CMS"
                                icon={<GiScrollUnfurled className="h-4 w-4 text-galactic shrink-0" />}
                                items={journalNavItems}
                                defaultOpen={false}
                                isItemActive={(item) =>
                                    pathname === item.href ||
                                    (item.href !== "/admin/journal" && pathname?.startsWith(item.href))
                                }
                            />
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <Separator className="my-1" />

                {/* Global Group */}
                <SidebarGroup className="px-2 py-1.5">
                    <SidebarGroupLabel className="pl-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                        Global
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* Moderation */}
                            <NavSection
                                title="Moderation"
                                icon={<Shield className="h-4 w-4 text-red-400 shrink-0" />}
                                items={moderationNavItems}
                                defaultOpen={false}
                                isItemActive={(item) => pathname === item.href}
                            />

                            {/* Notifications */}
                            <NavSection
                                title="Notifications"
                                icon={<Bell className="h-4 w-4 text-galactic shrink-0" />}
                                items={notificationNavItems}
                                defaultOpen={false}
                                isItemActive={(item) => pathname === item.href}
                            />
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-2 bg-white/10" />

            <SidebarUserFooter
                user={user}
                label="Admin"
                navItems={[
                    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                    { label: "Oracle", href: "/oracle", icon: GiCursedStar },
                    { label: "Journal", href: "/journal", icon: GiScrollUnfurled },
                ]}
                onSignOut={onSignOut}
            />
        </Sidebar>
    );
}
