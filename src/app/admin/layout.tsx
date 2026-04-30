"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { redirect } from "next/navigation";
import {
    SidebarProvider,
    SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/sidebar/admin-sidebar";
import { Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = useQuery(api.users.current);
    const { signOut } = useAuthActions();

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

    // Role check — redirect non-admins
    if (!user || user.role !== "admin") {
        redirect("/dashboard");
    }

    return (
        <SidebarProvider
            style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
            className="fixed inset-0 z-40 flex min-h-0! h-auto! w-full overflow-hidden"
        >
            <AdminSidebar userEmail={user.email ?? ""} user={user} onSignOut={() => signOut()} />

            <SidebarInset className="relative flex h-full min-h-0! w-full flex-1 flex-col overflow-hidden bg-transparent">
                <div className="flex-1 p-6 overflow-y-auto">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
