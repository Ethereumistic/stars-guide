"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
    Loader2,
    Users,
    Search,
    RefreshCw,
    Download,
    FileEdit,
    Mail,
    ShieldBan,
    ChevronRight,
    AlertTriangle,
    X,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { StatsCard } from "@/components/admin/shared/stats-card";
import Link from "next/link";

// ─── Filter Options ─────────────────────────────────────────────────────────

const roleOptions = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "moderator", label: "Moderator" },
    { value: "banned", label: "Banned" },
];

const tierOptions = [
    { value: "free", label: "Free" },
    { value: "popular", label: "Popular" },
    { value: "premium", label: "Premium" },
];

const subscriptionOptions = [
    { value: "active", label: "Active" },
    { value: "canceled", label: "Canceled" },
    { value: "past_due", label: "Past Due" },
    { value: "trialing", label: "Trialing" },
    { value: "none", label: "None" },
];

const emailStatusOptions = [
    { value: "active", label: "Active" },
    { value: "bounced", label: "Bounced" },
    { value: "complained", label: "Complained" },
    { value: "unsubscribed", label: "Unsubscribed" },
    { value: "blocked", label: "Blocked" },
];

const engagementOptions = [
    { value: "new", label: "New" },
    { value: "active", label: "Active" },
    { value: "dormant", label: "Dormant" },
    { value: "churned", label: "Churned" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function relativeTime(ts: number | undefined | null): string {
    if (!ts) return "Never";
    const diff = Date.now() - ts;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function isoDate(ts: number | undefined | null): string {
    if (!ts) return "—";
    return new Date(ts).toISOString().split("T")[0];
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────

function EditUserDialog({
    user,
    open,
    onClose,
}: {
    user: any;
    open: boolean;
    onClose: () => void;
}) {
    const updateUser = useMutation(api.users.admin.updateUser);
    const [role, setRole] = React.useState(user?.role ?? "user");
    const [tier, setTier] = React.useState(user?.tier ?? "free");
    const [subscriptionStatus, setSubscriptionStatus] = React.useState(user?.subscriptionStatus ?? "none");
    const [emailStatus, setEmailStatus] = React.useState(user?.emailStatus ?? "active");
    const [engagementStatus, setEngagementStatus] = React.useState(user?.engagementStatus ?? "active");
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            setRole(user.role ?? "user");
            setTier(user.tier ?? "free");
            setSubscriptionStatus(user.subscriptionStatus ?? "none");
            setEmailStatus(user.emailStatus ?? "active");
            setEngagementStatus(user.engagementStatus ?? "active");
        }
    }, [user]);

    async function handleSave() {
        setSaving(true);
        try {
            await updateUser({
                userId: user._id,
                role,
                tier,
                subscriptionStatus,
                emailStatus,
                engagementStatus,
            });
            toast.success("User updated");
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Update failed");
        } finally {
            setSaving(false);
        }
    }

    const isBanned = role === "banned";
    const isBounced = emailStatus === "bounced";

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-serif">Edit User</DialogTitle>
                    <DialogDescription>
                        {user?.email ?? user?.username ?? user?._id}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Tier</Label>
                        <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {tierOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subscription Status</Label>
                        <Select value={subscriptionStatus} onValueChange={(v) => setSubscriptionStatus(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {subscriptionOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email Status</Label>
                        <Select value={emailStatus} onValueChange={(v) => setEmailStatus(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {emailStatusOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isBounced && (
                            <p className="text-[10px] text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                This user will be excluded from all marketing emails.
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Engagement Status</Label>
                        <Select value={engagementStatus} onValueChange={(v) => setEngagementStatus(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {engagementOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {isBanned && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Setting role to <strong>banned</strong> will immediately lock this user out.</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2 mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Send Email Dialog ─────────────────────────────────────────────────────

function SendEmailDialog({
    user,
    open,
    onClose,
}: {
    user: any;
    open: boolean;
    onClose: () => void;
}) {
    const sendManualEmail = useMutation(api.emails.admin.sendManualEmail);
    const [channel, setChannel] = React.useState<"transactional" | "marketing">("transactional");
    const [subject, setSubject] = React.useState("");
    const [body, setBody] = React.useState("");
    const [sending, setSending] = React.useState(false);

    const isUnsubscribed = user?.emailStatus === "unsubscribed";

    React.useEffect(() => {
        if (open) {
            setChannel("transactional");
            setSubject("");
            setBody("");
        }
    }, [open]);

    async function handleSend() {
        if (!subject.trim()) {
            toast.error("Subject is required");
            return;
        }
        if (!body.trim()) {
            toast.error("Body is required");
            return;
        }
        setSending(true);
        try {
            await sendManualEmail({
                to: [user.email],
                subject: subject.trim(),
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${body.replace(/\n/g, "<br/>")}</div>`,
                channel,
                userIds: [user._id],
            });
            toast.success("Email sent!");
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to send email");
        } finally {
            setSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-serif">Send Email</DialogTitle>
                    <DialogDescription>
                        Send a one-off email to this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To</Label>
                        <Input value={user?.email ?? ""} readOnly className="bg-white/5 border-white/10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">From Channel</Label>
                        <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="transactional">auth@stars.guide (Transactional)</SelectItem>
                                <SelectItem value="marketing">oracle@stars.guide (Marketing)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subject</Label>
                        <Input
                            placeholder="Email subject..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Body</Label>
                        <Textarea
                            placeholder="Email content (plain text)..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={5}
                            className="bg-white/5 border-white/10 resize-none"
                        />
                    </div>
                    {isUnsubscribed && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>This user&apos;s email status is <strong>unsubscribed</strong>. They will not receive marketing emails.</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2 mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                        Send Email
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────

function BulkActionBar({
    selectedIds,
    users,
    onClear,
    onRefresh,
}: {
    selectedIds: Set<string>;
    users: any[];
    onClear: () => void;
    onRefresh: () => void;
}) {
    const bulkUpdate = useMutation(api.users.admin.bulkUpdateStatus);
    const sendManualEmail = useMutation(api.emails.admin.sendManualEmail);
    const [bulkEmailOpen, setBulkEmailOpen] = React.useState(false);
    const [bulkAction, setBulkAction] = React.useState(false);

    async function handleBulkAction(
        field: "emailStatus" | "engagementStatus",
        value: string,
    ) {
        const ids = Array.from(selectedIds) as any[];
        try {
            const result = await bulkUpdate({
                userIds: ids,
                [field]: value,
            });
            toast.success(`${result.updated} users updated`);
            onClear();
            onRefresh();
        } catch (err: any) {
            toast.error(err?.message ?? "Bulk update failed");
        }
    }

    function exportCSV() {
        const selectedUsers = users.filter((u) => selectedIds.has(u._id));
        const header = "Email,Username,Role,Tier,Subscription,Email Status,Engagement,Created\n";
        const rows = selectedUsers
            .map(
                (u) =>
                    `"${u.email ?? ""}","${u.username ?? ""}","${u.role}","${u.tier}","${u.subscriptionStatus}","${u.emailStatus ?? "active"}","${u.engagementStatus ?? "active"}","${isoDate(u._creationTime)}"`,
            )
            .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Bulk email dialog state
    const [subject, setSubject] = React.useState("");
    const [body, setBody] = React.useState("");
    const [channel, setChannel] = React.useState<"transactional" | "marketing">("transactional");
    const [sending, setSending] = React.useState(false);

    async function handleBulkEmailSend() {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and body required");
            return;
        }
        setSending(true);
        const selectedUsers = users.filter((u) => selectedIds.has(u._id) && u.email);
        try {
            await sendManualEmail({
                to: selectedUsers.map((u) => u.email),
                subject: subject.trim(),
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${body.replace(/\n/g, "<br/>")}</div>`,
                channel,
                userIds: selectedUsers.map((u) => u._id),
            });
            toast.success(`Email sent to ${selectedUsers.length} users`);
            setBulkEmailOpen(false);
            onClear();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to send bulk email");
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-card/90 backdrop-blur-md px-5 py-3 shadow-xl">
                <span className="text-xs font-mono text-muted-foreground">
                    {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-white/10" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleBulkAction("engagementStatus", "dormant")}
                >
                    Mark Dormant
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleBulkAction("engagementStatus", "churned")}
                >
                    Mark Churned
                </Button>
                <Select onValueChange={(v) => handleBulkAction("emailStatus", v)}>
                    <SelectTrigger className="h-7 w-[140px] text-xs bg-white/5 border-white/10">
                        <SelectValue placeholder="Email Status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {emailStatusOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setBulkEmailOpen(true)}
                >
                    <Mail className="h-3 w-3 mr-1" />
                    Send Email
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={exportCSV}
                >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={onClear}
                >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                </Button>
            </div>

            {/* Bulk Email Dialog */}
            <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Send Bulk Email</DialogTitle>
                        <DialogDescription>
                            Send an email to {selectedIds.size} selected users.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">From Channel</Label>
                            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transactional">auth@stars.guide (Transactional)</SelectItem>
                                    <SelectItem value="marketing">oracle@stars.guide (Marketing)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subject</Label>
                            <Input
                                placeholder="Email subject..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Body</Label>
                            <Textarea
                                placeholder="Email content (plain text)..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={5}
                                className="bg-white/5 border-white/10 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setBulkEmailOpen(false)} disabled={sending}>Cancel</Button>
                        <Button onClick={handleBulkEmailSend} disabled={sending}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                            Send to {selectedIds.size} Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
    const stats = useQuery(api.users.admin.getStats);

    // Filter state
    const [search, setSearch] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");
    const [roleFilter, setRoleFilter] = React.useState<string>("");
    const [tierFilter, setTierFilter] = React.useState<string>("");
    const [subFilter, setSubFilter] = React.useState<string>("");
    const [emailStatusFilter, setEmailStatusFilter] = React.useState<string>("");
    const [engagementFilter, setEngagementFilter] = React.useState<string>("");

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Pagination state
    const [paginationOpts, setPaginationOpts] = React.useState({
        numItems: 25,
        cursor: "",
    });

    // Build query args — only include non-empty filters
    const queryArgs: any = {
        paginationOpts,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(tierFilter ? { tier: tierFilter } : {}),
        ...(subFilter ? { subscriptionStatus: subFilter } : {}),
        ...(emailStatusFilter ? { emailStatus: emailStatusFilter } : {}),
        ...(engagementFilter ? { engagementStatus: engagementFilter } : {}),
    };

    const usersResult = useQuery(api.users.admin.list, queryArgs);

    // Selection
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // Dialogs
    const [editUser, setEditUser] = React.useState<any>(null);
    const [emailUser, setEmailUser] = React.useState<any>(null);

    // Refresh
    const [refreshKey, setRefreshKey] = React.useState(0);

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectAll(users: any[]) {
        const allSelected = users.every((u) => selectedIds.has(u._id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const u of users) {
                if (allSelected) next.delete(u._id);
                else next.add(u._id);
            }
            return next;
        });
    }

    function clearFilters() {
        setSearch("");
        setRoleFilter("");
        setTierFilter("");
        setSubFilter("");
        setEmailStatusFilter("");
        setEngagementFilter("");
    }

    function handleLoadMore() {
        if (usersResult && !usersResult.isDone && usersResult.continueCursor) {
            setPaginationOpts({ numItems: 25, cursor: usersResult.continueCursor });
        }
    }

    function exportAllCSV() {
        if (!usersResult?.page) return;
        const header = "Email,Username,Role,Tier,Subscription,Email Status,Engagement,Last Active,Created\n";
        const rows = usersResult.page
            .map(
                (u) =>
                    `"${u.email ?? ""}","${u.username ?? ""}","${u.role}","${u.tier}","${u.subscriptionStatus}","${u.emailStatus ?? "active"}","${u.engagementStatus ?? "active"}","${u.lastActiveAt ?? ""}","${isoDate(u._creationTime)}"`,
            )
            .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const hasFilters = debouncedSearch || roleFilter || tierFilter || subFilter || emailStatusFilter || engagementFilter;
    const users = usersResult?.page ?? [];

    return (
        <div className="max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-galactic" />
                    <div>
                        <h1 className="text-2xl font-serif font-bold">Users</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {stats?.total ? `${stats.total.toLocaleString()} total users` : "Loading..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={exportAllCSV}
                        disabled={users.length === 0}
                    >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Export CSV
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setRefreshKey((k) => k + 1)}
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={stats?.total ?? "—"}
                    subtitle="all registered users"
                    icon={<Users className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Active (7d)"
                    value={stats?.active7d ?? "—"}
                    subtitle="active in last 7 days"
                    accent="emerald"
                    icon={<Users className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Dormant"
                    value={stats?.dormant ?? "—"}
                    subtitle="14–60 days inactive"
                    accent="amber"
                    icon={<Users className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Churned"
                    value={stats?.churned ?? "—"}
                    subtitle=">60 days inactive"
                    accent="red"
                    icon={<Users className="h-3.5 w-3.5" />}
                />
            </div>

            {/* Filters */}
            <Card className="border-border/50 bg-card/50">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search email, username, ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 bg-white/5 border-white/10"
                            />
                        </div>

                        {/* Filter dropdowns */}
                        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-xs">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Roles</SelectItem>
                                {roleOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-xs">
                                <SelectValue placeholder="Tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Tiers</SelectItem>
                                {tierOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={subFilter} onValueChange={(v) => setSubFilter(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-xs">
                                <SelectValue placeholder="Subscription" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All</SelectItem>
                                {subscriptionOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={emailStatusFilter} onValueChange={(v) => setEmailStatusFilter(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-xs">
                                <SelectValue placeholder="Email Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All</SelectItem>
                                {emailStatusOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={engagementFilter} onValueChange={(v) => setEngagementFilter(v === "__all__" ? "" : v)}>
                            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-xs">
                                <SelectValue placeholder="Engagement" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All</SelectItem>
                                {engagementOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearFilters}>
                                <X className="h-3 w-3 mr-1" /> Clear
                            </Button>
                        )}

                        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                            {usersResult?.isDone
                                ? `${users.length} result${users.length !== 1 ? "s" : ""}`
                                : `${users.length}+ results`}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* User Table */}
            <Card className="border-border/50 bg-card/50">
                <CardContent className="p-0">
                    {usersResult === undefined ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                            <Users className="h-10 w-10 opacity-30" />
                            <p className="text-sm">No users found</p>
                            <p className="text-xs text-muted-foreground/60">
                                {hasFilters ? "Try adjusting your filters." : "No users in the database yet."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4">
                                        <Checkbox
                                            checked={users.length > 0 && users.every((u) => selectedIds.has(u._id))}
                                            onCheckedChange={() => toggleSelectAll(users)}
                                        />
                                    </TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Engagement</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow
                                        key={user._id}
                                        className={cn(
                                            "hover:bg-white/[0.02]",
                                            selectedIds.has(user._id) && "bg-white/[0.04]",
                                        )}
                                    >
                                        <TableCell className="pl-4">
                                            <Checkbox
                                                checked={selectedIds.has(user._id)}
                                                onCheckedChange={() => toggleSelect(user._id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {user.image ? (
                                                        <img
                                                            src={user.image}
                                                            alt=""
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            {(user.username ?? user.email ?? "?")[0].toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {user.username ?? "No username"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">{user.email ?? "—"}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={user.role} variant="role" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={user.tier} variant="tier" />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {user.subscriptionStatus?.replace(/_/g, " ") ?? "none"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={user.emailStatus ?? "active"}
                                                variant="email"
                                                showDot
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={user.engagementStatus ?? "active"}
                                                variant="engagement"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {relativeTime(user.lastActiveAt ?? user._creationTime)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {isoDate(user._creationTime)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                    <Link href={`/admin/users/${user._id}`}>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setEditUser(user)}
                                                >
                                                    <FileEdit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setEmailUser(user)}
                                                >
                                                    <Mail className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-400/60 hover:text-red-400"
                                                    onClick={() => {
                                                        setEditUser({ ...user, _proposedRole: "banned" });
                                                    }}
                                                >
                                                    <ShieldBan className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {/* Load More */}
                {usersResult && !usersResult.isDone && usersResult.continueCursor && (
                    <div className="flex justify-center py-4 border-t border-white/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={handleLoadMore}
                        >
                            <Loader2 className="h-3.5 w-3.5 mr-2" />
                            Load More
                        </Button>
                    </div>
                )}
            </Card>

            {/* Edit User Dialog */}
            {editUser && (
                <EditUserDialog
                    user={editUser}
                    open={!!editUser}
                    onClose={() => {
                        setEditUser(null);
                        setRefreshKey((k) => k + 1);
                    }}
                />
            )}

            {/* Send Email Dialog */}
            {emailUser && (
                <SendEmailDialog
                    user={emailUser}
                    open={!!emailUser}
                    onClose={() => {
                        setEmailUser(null);
                    }}
                />
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <BulkActionBar
                    selectedIds={selectedIds}
                    users={users}
                    onClear={() => setSelectedIds(new Set())}
                    onRefresh={() => setRefreshKey((k) => k + 1)}
                />
            )}
        </div>
    );
}