"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Color Maps ────────────────────────────────────────────────────────────

const colorMaps: Record<string, Record<string, { dot?: string; bg: string; border: string; text: string }>> = {
    role: {
        user: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
        admin: { bg: "bg-primary/15", border: "border-primary/30", text: "text-primary" },
        moderator: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
        banned: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
    },
    tier: {
        free: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
        popular: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        premium: { bg: "bg-primary/15", border: "border-primary/30", text: "text-primary" },
    },
    subscription: {
        active: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        canceled: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
        past_due: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
        trialing: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
        none: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
    },
    email: {
        active: { dot: "bg-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        bounced: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
        complained: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
        unsubscribed: { dot: "bg-slate-500", bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-400" },
        blocked: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
    },
    engagement: {
        new: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
        active: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        dormant: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        churned: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
    },
    delivery: {
        queued: { dot: "bg-zinc-500", bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
        sent: { dot: "bg-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
        delivered: { dot: "bg-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        opened: { dot: "bg-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        clicked: { dot: "bg-primary", bg: "bg-primary/15", border: "border-primary/30", text: "text-primary" },
        bounced: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
        complained: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
        unsubscribed: { dot: "bg-slate-500", bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-400" },
        failed: { dot: "bg-red-500", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
    },
    campaign: {
        draft: { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" },
        scheduled: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        active: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        sending: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
        paused: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        completed: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
    },
    lead: {
        pending: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
        active: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
        unsubscribed: { bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-400" },
        bounced: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400" },
    },
};

interface StatusBadgeProps {
    status: string;
    variant: "role" | "tier" | "subscription" | "email" | "engagement" | "delivery" | "campaign" | "lead";
    showDot?: boolean;
}

export function StatusBadge({ status, variant, showDot = false }: StatusBadgeProps) {
    const variantMap = colorMaps[variant];
    const colors = variantMap?.[status] ?? { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-400" };

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] font-mono uppercase tracking-wider",
                colors.bg,
                colors.border,
                colors.text,
            )}
        >
            {showDot && colors.dot && (
                <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", colors.dot)} />
            )}
            {status.replace(/_/g, " ")}
        </Badge>
    );
}