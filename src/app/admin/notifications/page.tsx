"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Loader2,
    Bell,
    Send,
    Clock,
    FileEdit,
    Trash2,
    XCircle,
    Copy,
    AlertTriangle,
    Eye,
    CheckCircle2,
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────

const targetAudienceOptions = [
    { value: "all", label: "All Users" },
    { value: "tier", label: "By Tier" },
    { value: "role", label: "By Role" },
    { value: "subscriptionStatus", label: "By Subscription Status" },
];

const targetFilterOptions: Record<string, { value: string; label: string }[]> = {
    tier: [
        { value: "free", label: "Free" },
        { value: "popular", label: "Popular" },
        { value: "premium", label: "Premium" },
    ],
    role: [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
        { value: "moderator", label: "Moderator" },
    ],
    subscriptionStatus: [
        { value: "active", label: "Active" },
        { value: "canceled", label: "Canceled" },
        { value: "past_due", label: "Past Due" },
        { value: "trialing", label: "Trialing" },
        { value: "none", label: "None" },
    ],
};

function statusBadge(status: string) {
    const map: Record<string, { className: string; label: string }> = {
        draft: {
            label: "Draft",
            className: "border-zinc-500/30 bg-zinc-500/15 text-zinc-400",
        },
        scheduled: {
            label: "Scheduled",
            className: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        },
        sending: {
            label: "Sending",
            className: "border-blue-500/30 bg-blue-500/15 text-blue-400",
        },
        sent: {
            label: "Sent",
            className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        },
        cancelled: {
            label: "Cancelled",
            className: "border-red-500/30 bg-red-500/15 text-red-400",
        },
    };
    const cfg = map[status] ?? { label: status, className: "" };
    return (
        <Badge variant="outline" className={cn("text-[10px] font-mono uppercase tracking-wider", cfg.className)}>
            {cfg.label}
        </Badge>
    );
}

function targetLabel(audience: string, filter?: string) {
    if (audience === "all") return "All Users";
    const options = targetFilterOptions[audience] ?? [];
    const found = options.find((o) => o.value === filter);
    const audienceLabel = targetAudienceOptions.find((o) => o.value === audience)?.label ?? audience;
    return found ? `${audienceLabel}: ${found.label}` : audienceLabel;
}

function formatDateTime(ts: number) {
    return new Date(ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

// ─── Campaign Analytics Dialog ────────────────────────────────────────────

function CampaignAnalytics({ campaignId }: { campaignId: string }) {
    const analytics = useQuery(api.notifications.admin.getCampaignAnalytics, {
        campaignId: campaignId as any,
    });

    return (
        <div className="space-y-3">
            {analytics === undefined ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            ) : analytics === null ? (
                <p className="text-sm text-muted-foreground">Campaign not found.</p>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            Delivered
                        </p>
                        <p className="text-2xl font-bold mt-1">{analytics.sentCount.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            Read
                        </p>
                        <p className="text-2xl font-bold mt-1">{analytics.readCount.toLocaleString()}</p>
                    </div>
                    {analytics.sentCount > 0 && (
                        <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                Read Rate
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${(analytics.readCount / analytics.sentCount) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-mono text-emerald-400">
                                    {((analytics.readCount / analytics.sentCount) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Compose Form ─────────────────────────────────────────────────────────

function ComposeForm({
    onClose,
    initialData,
}: {
    onClose: () => void;
    initialData?: any;
}) {
    const createCampaign = useMutation(api.notifications.admin.createCampaign);
    const updateCampaign = useMutation(api.notifications.admin.updateCampaign);

    const [title, setTitle] = React.useState(initialData?.title ?? "");
    const [message, setMessage] = React.useState(initialData?.message ?? "");
    const [targetAudience, setTargetAudience] = React.useState<string>(
        initialData?.targetAudience ?? "all"
    );
    const [targetFilter, setTargetFilter] = React.useState<string>(
        initialData?.targetFilter ?? ""
    );
    const [scheduleMode, setScheduleMode] = React.useState<"now" | "later">(
        initialData ? "later" : "now"
    );
    const [scheduledDate, setScheduledDate] = React.useState("");
    const [scheduledTime, setScheduledTime] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [charCount, setCharCount] = React.useState(message.length);

    const isEditing = !!initialData;

    // Update char count
    React.useEffect(() => {
        setCharCount(message.length);
    }, [message]);

    async function handleSubmit(sendNow: boolean) {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }
        if (!message.trim()) {
            toast.error("Message is required");
            return;
        }
        if (targetAudience !== "all" && !targetFilter) {
            toast.error("Please select a target filter");
            return;
        }

        setSending(true);

        try {
            let scheduledAt = Date.now();
            if (!sendNow && scheduledDate && scheduledTime) {
                scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
                if (isNaN(scheduledAt)) {
                    toast.error("Invalid date/time");
                    setSending(false);
                    return;
                }
            }

            if (isEditing) {
                await updateCampaign({
                    campaignId: initialData._id,
                    title: title.trim(),
                    message: message.trim(),
                    targetAudience: targetAudience as any,
                    targetFilter: targetAudience === "all" ? undefined : targetFilter,
                    scheduledAt,
                    status: sendNow ? "scheduled" : "draft",
                });
                toast.success("Campaign updated");
            } else {
                await createCampaign({
                    title: title.trim(),
                    message: message.trim(),
                    targetAudience: targetAudience as any,
                    targetFilter: targetAudience === "all" ? undefined : targetFilter,
                    scheduledAt,
                    sendImmediately: sendNow,
                });
                toast.success(sendNow ? "Campaign sent!" : "Campaign saved as draft");
            }
            onClose();
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to save campaign");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Campaign Title
                </Label>
                <Input
                    placeholder="e.g. New feature announcement"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white/5 border-white/10"
                />
                <p className="text-[10px] text-muted-foreground">
                    Admin-facing name — not shown to users.
                </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Notification Message
                </Label>
                <Textarea
                    placeholder="What should users see?"
                    value={message}
                    onChange={(e) => {
                        if (e.target.value.length <= 500) setMessage(e.target.value);
                    }}
                    rows={3}
                    className="bg-white/5 border-white/10 resize-none"
                />
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground">
                        This is the text shown in the notification bell dropdown.
                    </p>
                    <span
                        className={cn(
                            "text-[10px] font-mono",
                            charCount > 450 ? "text-amber-400" : "text-muted-foreground"
                        )}
                    >
                        {charCount}/500
                    </span>
                </div>
            </div>

            {/* Targeting */}
            <div className="space-y-3">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Target Audience
                </Label>
                <Select value={targetAudience} onValueChange={(val) => {
                    setTargetAudience(val);
                    setTargetFilter("");
                }}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {targetAudienceOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {targetAudience !== "all" && (
                    <Select value={targetFilter} onValueChange={setTargetFilter}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select filter..." />
                        </SelectTrigger>
                        <SelectContent>
                            {(targetFilterOptions[targetAudience] ?? []).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Schedule */}
            {!isEditing && (
                <div className="space-y-3">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Schedule
                    </Label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={scheduleMode === "now" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setScheduleMode("now")}
                            className="text-xs"
                        >
                            Send Now
                        </Button>
                        <Button
                            type="button"
                            variant={scheduleMode === "later" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setScheduleMode("later")}
                            className="text-xs"
                        >
                            Schedule
                        </Button>
                    </div>

                    {scheduleMode === "later" && (
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="bg-white/5 border-white/10 flex-1"
                            />
                            <Input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="bg-white/5 border-white/10 flex-1"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Preview */}
            {message.trim() && (
                <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Preview
                    </Label>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                <Bell className="size-3.5 text-amber-400" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                                        Announcement
                                    </span>
                                    <span className="size-1.5 rounded-full bg-primary" />
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={onClose} disabled={sending}>
                    Cancel
                </Button>
                {!isEditing && (
                    <Button
                        variant="outline"
                        onClick={() => handleSubmit(false)}
                        disabled={sending}
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileEdit className="h-4 w-4 mr-2" />}
                        Save Draft
                    </Button>
                )}
                <Button
                    onClick={() => handleSubmit(true)}
                    disabled={sending}
                >
                    {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    {isEditing ? "Save Changes" : scheduleMode === "now" ? "Send Now" : "Schedule"}
                </Button>
            </div>
        </div>
    );
}

// ─── Campaign List ────────────────────────────────────────────────────────

function CampaignList({
    campaigns,
    onEdit,
    onRefresh,
}: {
    campaigns: any[];
    onEdit: (campaign: any) => void;
    onRefresh: () => void;
}) {
    const cancelCampaign = useMutation(api.notifications.admin.cancelCampaign);
    const deleteCampaign = useMutation(api.notifications.admin.deleteCampaign);
    const sendCampaignNow = useMutation(api.notifications.admin.sendCampaignNow);
    const [analyticsOpen, setAnalyticsOpen] = React.useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState<string | null>(null);
    const [confirmAction, setConfirmAction] = React.useState<"send" | "cancel" | "delete" | null>(null);
    const [confirming, setConfirming] = React.useState(false);

    async function handleConfirm(campaignId: string) {
        setConfirming(true);
        try {
            if (confirmAction === "send") {
                await sendCampaignNow({ campaignId: campaignId as any });
                toast.success("Campaign sent!");
            } else if (confirmAction === "cancel") {
                await cancelCampaign({ campaignId: campaignId as any });
                toast.success("Campaign cancelled");
            } else if (confirmAction === "delete") {
                await deleteCampaign({ campaignId: campaignId as any });
                toast.success("Campaign deleted");
            }
            setConfirmOpen(null);
            setConfirmAction(null);
            onRefresh();
        } catch (error: any) {
            toast.error(error?.message ?? "Action failed");
        } finally {
            setConfirming(false);
        }
    }

    async function handleDuplicate(campaign: any) {
        // We can't directly duplicate from here — redirect to compose
        onEdit({ ...campaign, _id: undefined, status: undefined });
    }

    if (campaigns.length === 0) {
        return (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Bell className="h-10 w-10 opacity-30" />
                <p className="text-sm">No notification campaigns yet</p>
                <p className="text-xs text-muted-foreground/60">
                    Create your first broadcast to reach users.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {campaigns.map((campaign) => (
                <div
                    key={campaign._id}
                    className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-medium truncate">
                                    {campaign.title}
                                </h3>
                                {statusBadge(campaign.status)}
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">
                                {campaign.message}
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(campaign.scheduledAt)}
                                </span>
                                <span>{targetLabel(campaign.targetAudience, campaign.targetFilter)}</span>
                                {campaign.status === "sent" && campaign.sentCount !== undefined && (
                                    <span className="flex items-center gap-1">
                                        <Send className="h-3 w-3" />
                                        {campaign.sentCount.toLocaleString()} sent
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            {/* View Analytics (sent campaigns) */}
                            {campaign.status === "sent" && (
                                <Dialog
                                    open={analyticsOpen === campaign._id}
                                    onOpenChange={(open) => setAnalyticsOpen(open ? campaign._id : null)}
                                >
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="font-serif">
                                                Campaign Analytics
                                            </DialogTitle>
                                            <DialogDescription>
                                                {campaign.title}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <CampaignAnalytics campaignId={campaign._id} />
                                    </DialogContent>
                                </Dialog>
                            )}

                            {/* Edit (draft / scheduled) */}
                            {(campaign.status === "draft" || campaign.status === "scheduled") && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onEdit(campaign)}
                                >
                                    <FileEdit className="h-3.5 w-3.5" />
                                </Button>
                            )}

                            {/* Send (draft) */}
                            {campaign.status === "draft" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                                    onClick={() => {
                                        setConfirmAction("send");
                                        setConfirmOpen(campaign._id);
                                    }}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            )}

                            {/* Cancel (scheduled) */}
                            {campaign.status === "scheduled" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-amber-400 hover:text-amber-300"
                                    onClick={() => {
                                        setConfirmAction("cancel");
                                        setConfirmOpen(campaign._id);
                                    }}
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                </Button>
                            )}

                            {/* Delete (draft / cancelled) */}
                            {(campaign.status === "draft" || campaign.status === "cancelled") && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive/60 hover:text-destructive"
                                    onClick={() => {
                                        setConfirmAction("delete");
                                        setConfirmOpen(campaign._id);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Confirm Dialog */}
                    <Dialog
                        open={confirmOpen === campaign._id}
                        onOpenChange={(open) => {
                            if (!open) {
                                setConfirmOpen(null);
                                setConfirmAction(null);
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="font-serif flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                    {confirmAction === "send" && "Send Campaign?"}
                                    {confirmAction === "cancel" && "Cancel Campaign?"}
                                    {confirmAction === "delete" && "Delete Campaign?"}
                                </DialogTitle>
                                <DialogDescription>
                                    {confirmAction === "send" &&
                                        `This will immediately send "${campaign.title}" to ${targetLabel(campaign.targetAudience, campaign.targetFilter)}. This cannot be undone.`}
                                    {confirmAction === "cancel" &&
                                        `This will cancel the scheduled delivery of "${campaign.title}".`}
                                    {confirmAction === "delete" &&
                                        `This will permanently delete "${campaign.title}".`}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setConfirmOpen(null);
                                        setConfirmAction(null);
                                    }}
                                    disabled={confirming}
                                >
                                    Go Back
                                </Button>
                                <Button
                                    variant={confirmAction === "delete" ? "destructive" : "default"}
                                    onClick={() => handleConfirm(campaign._id)}
                                    disabled={confirming}
                                >
                                    {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    {confirmAction === "send" && "Confirm Send"}
                                    {confirmAction === "cancel" && "Confirm Cancel"}
                                    {confirmAction === "delete" && "Confirm Delete"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
    const campaigns = useQuery(api.notifications.admin.listCampaigns);
    const stats = useQuery(api.notifications.admin.getCampaignStats);
    const [composeOpen, setComposeOpen] = React.useState(false);
    const [editingCampaign, setEditingCampaign] = React.useState<any>(null);

    // Track a refresh counter to force re-fetch
    const [refreshKey, setRefreshKey] = React.useState(0);
    const refreshedCampaigns = useQuery(
        api.notifications.admin.listCampaigns,
        refreshKey > 0 ? {} : undefined
    );

    const displayCampaigns = (refreshedCampaigns ?? campaigns) ?? [];

    function handleEdit(campaign: any) {
        if (!campaign._id) {
            // Duplicate mode — open compose with data but no ID
            setEditingCampaign(campaign);
        } else {
            setEditingCampaign(campaign);
        }
        setComposeOpen(true);
    }

    function handleCloseCompose() {
        setComposeOpen(false);
        setEditingCampaign(null);
        setRefreshKey((k) => k + 1);
    }

    return (
        <div className="max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Bell className="h-8 w-8 text-galactic" />
                    <div>
                        <h1 className="text-2xl font-serif font-bold">Notifications</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Compose, schedule, and broadcast notifications to your users.
                        </p>
                    </div>
                </div>

                <Dialog open={composeOpen} onOpenChange={(open) => {
                    if (!open) handleCloseCompose();
                    else setComposeOpen(true);
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Send className="h-4 w-4 mr-2" />
                            New Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-serif">
                                {editingCampaign?._id ? "Edit Campaign" : "Create Notification Campaign"}
                            </DialogTitle>
                            <DialogDescription>
                                Compose a notification and choose who to send it to.
                            </DialogDescription>
                        </DialogHeader>
                        <ComposeForm
                            onClose={handleCloseCompose}
                            initialData={editingCampaign?._id ? editingCampaign : undefined}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5" />
                            Total Campaigns
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.total ?? "—"}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            all-time campaigns
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Send className="h-3.5 w-3.5" />
                            Sent
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">{stats?.sent ?? "—"}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            campaigns delivered
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Scheduled
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-400">{stats?.scheduled ?? "—"}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            pending delivery
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <FileEdit className="h-3.5 w-3.5" />
                            Drafts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-zinc-400">{stats?.draft ?? "—"}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            waiting to be sent
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign List */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-base">Campaign History</CardTitle>
                    <CardDescription>
                        All notification campaigns, most recent first.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {campaigns === undefined ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <CampaignList
                            campaigns={displayCampaigns}
                            onEdit={handleEdit}
                            onRefresh={() => setRefreshKey((k) => k + 1)}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
