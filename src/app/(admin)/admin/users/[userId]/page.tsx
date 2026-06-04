"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
    Loader2,
    Users,
    Send,
    Trash2,
    Copy,
    ExternalLink,
    AlertTriangle,
    Mail,
    Clock,
    BookOpen,
    Sparkles,
    Star,
    Shield,
    CheckCircle2,
    XCircle,
    Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────

function relativeTime(ts: number | undefined | null): string {
    if (!ts) return "Never";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function formatDate(ts: number | undefined | null): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
        () => toast.success("Copied to clipboard"),
        () => toast.error("Failed to copy"),
    );
}

function getSunSign(placements: { body: string; sign: string }[] | undefined): string | null {
    if (!placements) return null;
    return placements.find((p) => p.body === "Sun")?.sign ?? null;
}

// ─── Send Email Dialog ────────────────────────────────────────────────────

function SendEmailDialog({
    userEmail,
    userId,
    open,
    onOpenChange,
}: {
    userEmail: string;
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const sendManualEmail = useMutation(api.emails.admin.sendManualEmail);
    const [channel, setChannel] = React.useState<"transactional" | "marketing">("transactional");
    const [subject, setSubject] = React.useState("");
    const [body, setBody] = React.useState("");
    const [sending, setSending] = React.useState(false);

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
                to: [userEmail],
                subject: subject.trim(),
                html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><p style="white-space:pre-wrap;">${body.trim()}</p></div>`,
                channel,
                userIds: [userId as any],
            });
            toast.success(`Email sent to ${userEmail}`);
            setSubject("");
            setBody("");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to send email");
        } finally {
            setSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-serif">Send Email</DialogTitle>
                    <DialogDescription>
                        Send a one-off email to this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To</Label>
                        <Input value={userEmail} readOnly className="bg-white/5 border-white/10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Channel</Label>
                        <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="transactional">Transactional (auth@stars.guide)</SelectItem>
                                <SelectItem value="marketing">Marketing (oracle@stars.guide)</SelectItem>
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
                            placeholder="Email body (plain text)..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={6}
                            className="bg-white/5 border-white/10 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 mt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Send Email
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Account Dialog ────────────────────────────────────────────────

function DeleteAccountDialog({
    userId,
    username,
    open,
    onOpenChange,
}: {
    userId: string;
    username: string | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const deleteUser = useMutation(api.users.admin.deleteUser);
    const [confirming, setConfirming] = React.useState(false);
    const [confirmText, setConfirmText] = React.useState("");

    async function handleDelete() {
        if (confirmText !== "DELETE") {
            toast.error('Please type "DELETE" to confirm');
            return;
        }
        setConfirming(true);
        try {
            await deleteUser({ userId: userId as any });
            toast.success("Account deleted");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to delete account");
        } finally {
            setConfirming(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-serif flex items-center gap-2 text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Account
                    </DialogTitle>
                    <DialogDescription>
                        This will soft-delete the account for <span className="font-mono text-white/80">{username ?? "this user"}</span>.
                        Their email status will be set to &quot;blocked&quot; and engagement to &quot;churned&quot;.
                        This action cannot be easily undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <p className="text-xs text-red-300">
                            ⚠️ This will immediately lock the user out. Type <span className="font-mono font-bold">DELETE</span> to confirm.
                        </p>
                    </div>
                    <Input
                        placeholder='Type "DELETE" to confirm'
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="bg-white/5 border-white/10"
                    />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={confirming}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={confirming || confirmText !== "DELETE"}>
                        {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Profile Card ─────────────────────────────────────────────────────────

function ProfileCard({ user, stats }: { user: any; stats: any }) {
    const updateUser = useMutation(api.users.admin.updateUser);
    const sunSign = getSunSign(user.birthData?.placements);

    const [updatingField, setUpdatingField] = React.useState<string | null>(null);

    async function handleUpdate(field: string, value: string) {
        setUpdatingField(field);
        try {
            await updateUser({
                userId: user._id,
                [field]: value,
            });
            toast.success(`${field} updated`);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to update");
        } finally {
            setUpdatingField(null);
        }
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-galactic" />
                    Profile
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Avatar + Identity */}
                <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0">
                        {user.image ? (
                            <img src={user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-xl font-serif text-muted-foreground">
                                {(user.username ?? user.email ?? "?")[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-lg font-semibold truncate">
                            {user.username ?? "No username"}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground truncate">{user.email ?? "—"}</span>
                            {user.email && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0"
                                    onClick={() => copyToClipboard(user.email)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-white/30 truncate max-w-[200px]">
                                {user._id}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                                onClick={() => copyToClipboard(user._id)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Inline Editable Fields */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Role</Label>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={user.role} variant="role" />
                            <Select value={user.role} onValueChange={(v) => handleUpdate("role", v)} disabled={updatingField === "role"}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                                    {updatingField === "role" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="banned">Banned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Tier</Label>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={user.tier} variant="tier" />
                            <Select value={user.tier} onValueChange={(v) => handleUpdate("tier", v)} disabled={updatingField === "tier"}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                                    {updatingField === "tier" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="popular">Popular</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Subscription</Label>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={user.subscriptionStatus} variant="subscription" />
                            <Select value={user.subscriptionStatus} onValueChange={(v) => handleUpdate("subscriptionStatus", v)} disabled={updatingField === "subscriptionStatus"}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                                    {updatingField === "subscriptionStatus" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="canceled">Canceled</SelectItem>
                                    <SelectItem value="past_due">Past Due</SelectItem>
                                    <SelectItem value="trialing">Trialing</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email Status</Label>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={user.emailStatus ?? "active"} variant="email" />
                            <Select value={user.emailStatus ?? "active"} onValueChange={(v) => handleUpdate("emailStatus", v)} disabled={updatingField === "emailStatus"}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                                    {updatingField === "emailStatus" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="bounced">Bounced</SelectItem>
                                    <SelectItem value="complained">Complained</SelectItem>
                                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Engagement</Label>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={user.engagementStatus ?? "new"} variant="engagement" />
                            <Select value={user.engagementStatus ?? "new"} onValueChange={(v) => handleUpdate("engagementStatus", v)} disabled={updatingField === "engagementStatus"}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                                    {updatingField === "engagementStatus" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="dormant">Dormant</SelectItem>
                                    <SelectItem value="churned">Churned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Warnings */}
                {user.role === "banned" && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                        ⚠️ This user is banned and cannot sign in.
                    </div>
                )}
                {(user.emailStatus === "unsubscribed" || user.emailStatus === "bounced") && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                        ⚠️ This user's email status is {user.emailStatus}. Marketing emails will not be sent.
                    </div>
                )}

                {/* Birth Data Summary */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Birth Data
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs">
                        {sunSign && (
                            <div className="flex items-center gap-1.5">
                                <Star className="h-3 w-3 text-amber-400" />
                                <span>Sun in {sunSign}</span>
                            </div>
                        )}
                        {user.birthData?.location && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">📍</span>
                                <span>{user.birthData.location.city}, {user.birthData.location.country}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            {user.birthData?.chart ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            ) : (
                                <XCircle className="h-3 w-3 text-zinc-500" />
                            )}
                            <span className="text-muted-foreground">
                                Chart: {user.birthData?.chart ? "Computed" : "Not computed"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stardust + Referrals */}
                {(user.stardust !== undefined || stats?.referralCount > 0) && (
                    <div className="flex gap-6 text-sm">
                        {user.stardust !== undefined && (
                            <div>
                                <span className="text-muted-foreground">✨ Stardust:</span>{" "}
                                <span className="font-mono">{user.stardust ?? 0}</span>
                            </div>
                        )}
                        {stats?.referralCount > 0 && (
                            <div>
                                <span className="text-muted-foreground">🔗 Referrals:</span>{" "}
                                <span className="font-mono">{stats.referralCount}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Quick Actions Card ───────────────────────────────────────────────────

function QuickActionsCard({ user }: { user: any }) {
    const [emailOpen, setEmailOpen] = React.useState(false);
    const [deleteOpen, setDeleteOpen] = React.useState(false);

    return (
        <>
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-galactic" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
                        <Mail className="h-3.5 w-3.5 mr-2" />
                        Send Email
                    </Button>
                    {user.username && (
                        <Link href={`/${user.username}`} target="_blank">
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                View Birth Chart
                            </Button>
                        </Link>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete Account
                    </Button>
                </CardContent>
            </Card>

            <SendEmailDialog
                userEmail={user.email ?? ""}
                userId={user._id}
                open={emailOpen}
                onOpenChange={setEmailOpen}
            />
            <DeleteAccountDialog
                userId={user._id}
                username={user.username}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    );
}

// ─── Activity Timeline ───────────────────────────────────────────────────

function ActivityTimeline({ user, stats }: { user: any; stats: any }) {
    const events: { icon: React.ReactNode; label: string; time: string }[] = [];

    // Sign-up
    events.push({
        icon: <Users className="h-3.5 w-3.5" />,
        label: "Signed up",
        time: formatDate(user._creationTime),
    });

    // Last login
    if (user.lastLoginAt) {
        events.push({
            icon: <Shield className="h-3.5 w-3.5" />,
            label: "Last login",
            time: relativeTime(user.lastLoginAt),
        });
    }

    // Last activity
    if (user.lastActiveAt) {
        events.push({
            icon: <Clock className="h-3.5 w-3.5" />,
            label: "Last active",
            time: relativeTime(user.lastActiveAt),
        });
    }

    // First oracle session
    if (stats?.lastOracleAt) {
        events.push({
            icon: <Sparkles className="h-3.5 w-3.5" />,
            label: `Oracle (${stats.oracleSessionCount} sessions)`,
            time: relativeTime(stats.lastOracleAt),
        });
    } else if (stats?.oracleSessionCount > 0) {
        events.push({
            icon: <Sparkles className="h-3.5 w-3.5" />,
            label: `Oracle (${stats.oracleSessionCount} sessions)`,
            time: "—",
        });
    }

    // Journal entries
    if (stats?.journalCount > 0) {
        events.push({
            icon: <BookOpen className="h-3.5 w-3.5" />,
            label: `${stats.journalCount} journal entries`,
            time: "—",
        });
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-galactic" />
                    Activity Timeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative border-l-2 border-white/10 pl-4 space-y-4">
                    {events.map((event, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                            <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-white/10 border-2 border-background" />
                            <div className="text-muted-foreground mt-0.5">{event.icon}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm">{event.label}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{event.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Email History ────────────────────────────────────────────────────────

function EmailHistory({ deliveries }: { deliveries: any[] }) {
    if (!deliveries || deliveries.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-galactic" />
                        Email History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                        <Mail className="h-6 w-6 opacity-30" />
                        <p className="text-xs">No emails sent to this user</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-galactic" />
                    Email History
                </CardTitle>
                <CardDescription>Last {deliveries.length} emails</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[10px] font-mono uppercase">Subject</TableHead>
                            <TableHead className="text-[10px] font-mono uppercase">Status</TableHead>
                            <TableHead className="text-[10px] font-mono uppercase">Channel</TableHead>
                            <TableHead className="text-[10px] font-mono uppercase">Sent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deliveries.slice(0, 20).map((d: any) => (
                            <TableRow key={d._id} className="border-white/5 hover:bg-white/[0.02]">
                                <TableCell className="text-xs truncate max-w-[120px]">
                                    {d.subject ?? "—"}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={d.status} variant="delivery" showDot />
                                </TableCell>
                                <TableCell>
                                    {d.channel ? (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] font-mono",
                                                d.channel === "transactional"
                                                    ? "border-blue-500/30 bg-blue-500/15 text-blue-400"
                                                    : "border-purple-500/30 bg-purple-500/15 text-purple-400",
                                            )}
                                        >
                                            {d.channel}
                                        </Badge>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                                    {relativeTime(d.sentAt)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ─── Notification History ─────────────────────────────────────────────────

function NotificationHistory({ notifications }: { notifications: any[] }) {
    if (!notifications || notifications.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Send className="h-4 w-4 text-galactic" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                        <Send className="h-6 w-6 opacity-30" />
                        <p className="text-xs">No notifications</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-galactic" />
                    Notifications
                </CardTitle>
                <CardDescription>Last {notifications.length}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {notifications.slice(0, 20).map((n: any) => (
                        <div
                            key={n._id}
                            className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-white/70 line-clamp-2 flex-1">
                                    {n.message ?? `Notification (${n.type})`}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[9px] font-mono shrink-0",
                                        n.read
                                            ? "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
                                            : "border-primary/30 bg-primary/15 text-primary",
                                    )}
                                >
                                    {n.read ? "read" : "unread"}
                                </Badge>
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground">
                                {relativeTime(n.createdAt)}
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminUserProfilePage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = React.use(params);
    const data = useQuery(api.users.admin.getById, { userId: userId as any });

    if (data === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading user profile...</p>
                </div>
            </div>
        );
    }

    if (data === null) {
        return (
            <div className="max-w-6xl space-y-8">
                <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-red-400" />
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-red-400">User Not Found</h1>
                        <p className="text-sm text-muted-foreground">
                            This user does not exist or has been deleted.
                        </p>
                    </div>
                </div>
                <Link href="/admin/users">
                    <Button variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Back to Users
                    </Button>
                </Link>
            </div>
        );
    }

    const { user, stats, deliveries, notifications } = data;

    return (
        <div className="max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-galactic" />
                    <div>
                        <h1 className="text-2xl font-serif font-bold">
                            {user.username ?? "Unknown User"}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            User profile and activity management.
                        </p>
                    </div>
                </div>
                <Link href="/admin/users">
                    <Button variant="outline" size="sm">
                        <Users className="h-3.5 w-3.5 mr-2" />
                        All Users
                    </Button>
                </Link>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — Profile + Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <ProfileCard user={user} stats={stats} />
                    <QuickActionsCard user={user} />
                </div>

                {/* Right Column — Activity + History */}
                <div className="space-y-6">
                    <ActivityTimeline user={user} stats={stats} />
                    <EmailHistory deliveries={deliveries} />
                    <NotificationHistory notifications={notifications} />
                </div>
            </div>
        </div>
    );
}