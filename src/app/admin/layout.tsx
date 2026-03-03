"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { redirect } from "next/navigation";
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    FileText,
    Globe,
    Sparkles,
    ClipboardCheck,
    LayoutDashboard,
    Shield,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Context Editor",
        href: "/admin/context",
        icon: FileText,
    },
    {
        title: "Zeitgeist Engine",
        href: "/admin/zeitgeist",
        icon: Globe,
    },
    {
        title: "Generation Desk",
        href: "/admin/generator",
        icon: Sparkles,
    },
    {
        title: "Review & Publish",
        href: "/admin/review",
        icon: ClipboardCheck,
    },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = useQuery(api.users.current);
    const pathname = usePathname();

    // Loading state
    if (user === undefined) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    // Layer 3: Server-side role check — redirect non-admins
    if (!user || user.role !== "admin") {
        redirect("/dashboard");
    }


    return (
        <SidebarProvider>
            <div className="flex min-h-[calc(100vh-4rem)] w-full">
                <Sidebar className="border-r border-border/50">
                    <SidebarHeader className="p-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-amber-400" />
                            <span className="font-serif text-lg font-semibold tracking-wide text-amber-400">
                                Admin
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Horoscope Engine Control
                        </p>
                    </SidebarHeader>

                    <Separator className="opacity-20" />

                    <SidebarContent className="p-2">
                        <SidebarMenu>
                            {adminNavItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== "/admin" && pathname?.startsWith(item.href));
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
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
                    </SidebarContent>

                    <SidebarFooter className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Signed in as {user.email}</span>
                        </div>
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset>
                    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <span className="text-sm text-muted-foreground">
                            {adminNavItems.find((item) =>
                                pathname === item.href ||
                                (item.href !== "/admin" && pathname?.startsWith(item.href))
                            )?.title || "Dashboard"}
                        </span>
                    </header>
                    <div className="flex-1 p-6">
                        {children}
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
