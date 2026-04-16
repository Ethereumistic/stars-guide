/**
 * Shared utilities for Oracle sidebar components.
 */

export function formatRelativeTime(timestamp: number): string {
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

export function groupSessionsByTime(timestamp: number): string {
    const now = new Date();
    const target = new Date(timestamp);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return "Previous 7 Days";
    return "Older";
}

export const tierLabels: Record<"free" | "popular" | "premium", string> = {
    free: "user (free)",
    popular: "popular (Cosmic Flow)",
    premium: "premium (Oracle)",
};

export type StarType = "beveled" | "cursed" | null;

export type SessionItem = {
    _id: string;
    title: string;
    starType: StarType;
    lastMessageAt: number;
    status?: string;
};