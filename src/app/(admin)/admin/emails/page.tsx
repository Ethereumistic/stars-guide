"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
    Loader2,
    Mail,
    Send,
    Clock,
    FileEdit,
    Trash2,
    Pause,
    Play,
    Copy,
    AlertTriangle,
    Eye,
    Activity,
    Users,
    FileText,
    Zap,
    AlertCircle,
    Wifi,
    CheckCircle2,
    XCircle,
    Search,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { StatsCard } from "@/components/admin/shared/stats-card";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateTime(ts: number | undefined) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function relativeTime(ts: number | undefined) {
    if (!ts) return "Never";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const campaignTypeLabels: Record<string, string> = {
    welcome_series: "Welcome Series",
    daily_horoscope: "Daily Horoscope",
    weekly_cosmic: "Weekly Cosmic",
    monthly_roundup: "Monthly Roundup",
    reengagement: "Re-engagement",
    one_off: "One-off",
};

const targetAudienceOptions = [
    { value: "all_users", label: "All Users" },
    { value: "by_tier", label: "By Tier" },
    { value: "by_engagement", label: "By Engagement" },
    { value: "by_email_status", label: "By Email Status" },
    { value: "by_segment", label: "By Segment" },
    { value: "specific_emails", label: "Specific Emails" },
];

const targetFilterOptions: Record<string, { value: string; label: string }[]> = {
    by_tier: [
        { value: "free", label: "Free" },
        { value: "popular", label: "Popular" },
        { value: "premium", label: "Premium" },
    ],
    by_engagement: [
        { value: "new", label: "New" },
        { value: "active", label: "Active" },
        { value: "dormant", label: "Dormant" },
        { value: "churned", label: "Churned" },
    ],
    by_email_status: [
        { value: "active", label: "Active" },
        { value: "bounced", label: "Bounced" },
        { value: "unsubscribed", label: "Unsubscribed" },
    ],
};

const emailTemplateOptions = [
    { value: "WelcomeEmail", label: "Welcome Email" },
    { value: "DailyHoroscopeEmail", label: "Daily Horoscope" },
    { value: "WeeklyCosmicEmail", label: "Weekly Cosmic" },
    { value: "MonthlyRoundupEmail", label: "Monthly Roundup" },
    { value: "ReengagementEmail", label: "Re-engagement" },
    { value: "custom", label: "Custom HTML" },
];

const templateGalleryItems = [
    { name: "WelcomeEmail", label: "Welcome Email", description: "Sent to new leads upon sign-up." },
    { name: "DailyHoroscopeEmail", label: "Daily Horoscope", description: "Daily zodiac forecast email." },
    { name: "WeeklyCosmicEmail", label: "Weekly Cosmic", description: "Weekly astro weather digest." },
    { name: "MonthlyRoundupEmail", label: "Monthly Roundup", description: "End-of-month reflection email." },
    { name: "ReengagementEmail", label: "Re-engagement", description: "Win-back for dormant users." },
];

// ─── Overview Tab ──────────────────────────────────────────────────────────

function EmailOverview() {
    const stats = useQuery(api.emails.admin.getStats);
    const campaigns = useQuery(api.emails.admin.listCampaigns, {});
    const testSmtp = useAction(api.emails.admin.testSmtp);
    const [testing, setTesting] = React.useState(false);
    const [health, setHealth] = React.useState<{ auth: boolean; oracle: boolean; errors: string[] } | null>(null);

    async function handleTestSmtp() {
        setTesting(true);
        try {
            const result = await testSmtp({});
            setHealth(result);
            if (result.auth && result.oracle) {
                toast.success("Both SMTP channels healthy!");
            } else {
                toast.warning("Some SMTP channels failed — see details below.");
            }
        } catch (err: any) {
            toast.error(err?.message ?? "SMTP test failed");
        } finally {
            setTesting(false);
        }
    }

    // Recent 5 campaigns
    const recentCampaigns = (campaigns ?? []).slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                    title="Total Deliveries"
                    value={stats?.totalDeliveries ?? "—"}
                    subtitle="all-time"
                    icon={<Mail className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Sent (24h)"
                    value={stats?.sent24h ?? "—"}
                    subtitle="last 24 hours"
                    accent="emerald"
                    icon={<Send className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Bounced (24h)"
                    value={stats?.bounced24h ?? "—"}
                    subtitle="last 24 hours"
                    accent="red"
                    icon={<AlertCircle className="h-3.5 w-3.5" />}
                />
                <StatsCard
                    title="Open Rate (7d)"
                    value={stats?.openRate7d !== undefined ? `${stats.openRate7d}%` : "—"}
                    subtitle="last 7 days"
                    accent="amber"
                    icon={<Eye className="h-3.5 w-3.5" />}
                />
            </div>

            {/* SMTP Health */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        SMTP Health
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", health?.auth ? "bg-emerald-500" : health ? "bg-red-500" : "bg-zinc-500")} />
                            <span className="text-sm">auth@stars.guide</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {health?.auth ? "Connected" : health ? "Failed" : "Not tested"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", health?.oracle ? "bg-emerald-500" : health ? "bg-red-500" : "bg-zinc-500")} />
                            <span className="text-sm">oracle@stars.guide</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {health?.oracle ? "Connected" : health ? "Failed" : "Not tested"}
                        </span>
                    </div>
                    <Button onClick={handleTestSmtp} disabled={testing} variant="outline" size="sm">
                        {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
                        Test Both
                    </Button>
                    {health && health.errors.length > 0 && (
                        <div className="text-xs text-red-400 space-y-1 mt-2">
                            {health.errors.map((e, i) => (
                                <p key={i}>{e}</p>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Campaigns */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Campaigns</CardTitle>
                    <CardDescription>Last 5 email campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                    {campaigns === undefined ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : recentCampaigns.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No campaigns yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentCampaigns.map((c: any) => (
                                <div key={c._id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <StatusBadge status={c.status} variant="campaign" />
                                        <span className="text-sm truncate">{c.name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                                        {formatDateTime(c.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Failed Deliveries */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Failures</CardTitle>
                    <CardDescription>Bounced/failed in last 24h</CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentFailures />
                </CardContent>
            </Card>
        </div>
    );
}

function RecentFailures() {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const deliveries = useQuery(api.emails.admin.listDeliveries, {
        paginationOpts: { numItems: 10, cursor: "" },
        status: "bounced" as any,
        dateFrom: dayAgo,
    });

    if (deliveries === undefined) {
        return (
            <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const failed = (deliveries.page ?? []).filter(
        (d: any) => d.status === "bounced" || d.status === "failed"
    );

    if (failed.length === 0) {
        return <p className="text-sm text-muted-foreground py-2">No failures in the last 24h. 🎉</p>;
    }

    return (
        <div className="space-y-2">
            {failed.slice(0, 5).map((d: any) => (
                <div key={d._id} className="flex items-center justify-between border-b border-white/5 last:border-0 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={d.status} variant="delivery" showDot />
                        <span className="text-xs text-muted-foreground truncate">{d.email}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                        {relativeTime(d.sentAt)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Campaigns Tab ──────────────────────────────────────────────────────────

function CampaignManager() {
    const campaigns = useQuery(api.emails.admin.listCampaigns, {});
    const [composeOpen, setComposeOpen] = React.useState(false);
    const [editingCampaign, setEditingCampaign] = React.useState<any>(null);
    const [refreshKey, setRefreshKey] = React.useState(0);

    function handleCloseCompose() {
        setComposeOpen(false);
        setEditingCampaign(null);
        setRefreshKey((k) => k + 1);
    }

    const displayCampaigns = campaigns ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Email Campaigns</h2>
                    <p className="text-xs text-muted-foreground">Create and manage email campaigns.</p>
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
                                {editingCampaign?._id ? "Edit Campaign" : "Create Email Campaign"}
                            </DialogTitle>
                            <DialogDescription>
                                Configure your email campaign, targeting, and schedule.
                            </DialogDescription>
                        </DialogHeader>
                        <CampaignForm
                            onClose={handleCloseCompose}
                            initialData={editingCampaign?._id ? editingCampaign : undefined}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Campaign List */}
            {campaigns === undefined ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : displayCampaigns.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                    <Mail className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No email campaigns yet</p>
                    <p className="text-xs text-muted-foreground/60">
                        Create your first campaign to reach users via email.
                    </p>
                </div>
            ) : (
                <CampaignList
                    campaigns={displayCampaigns}
                    onEdit={(c) => { setEditingCampaign(c); setComposeOpen(true); }}
                    onRefresh={() => setRefreshKey((k) => k + 1)}
                />
            )}
        </div>
    );
}

function CampaignForm({ onClose, initialData }: { onClose: () => void; initialData?: any }) {
    const createCampaign = useMutation(api.emails.admin.createCampaign);
    const updateCampaign = useMutation(api.emails.admin.updateCampaign);

    const [name, setName] = React.useState(initialData?.name ?? "");
    const [type, setType] = React.useState(initialData?.type ?? "one_off");
    const [subject, setSubject] = React.useState(initialData?.subject ?? "");
    const [templateMode, setTemplateMode] = React.useState<string>(initialData?.reactEmailTemplate ?? "custom");
    const [htmlContent, setHtmlContent] = React.useState(initialData?.htmlContent ?? "");
    const [targetType, setTargetType] = React.useState<string>(initialData?.targetType ?? "all_users");
    const [targetFilter, setTargetFilter] = React.useState<string>(initialData?.targetFilter ?? "");
    const [targetEmails, setTargetEmails] = React.useState<string>(initialData?.targetEmails?.join(", ") ?? "");
    const [channel, setChannel] = React.useState<"transactional" | "marketing">(initialData?.channel ?? "marketing");
    const [scheduleMode, setScheduleMode] = React.useState<"now" | "later">("now");
    const [scheduledDate, setScheduledDate] = React.useState("");
    const [scheduledTime, setScheduledTime] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const isEditing = !!initialData;

    async function handleSubmit(status: "draft" | "scheduled", sendNow = false) {
        if (!name.trim()) { toast.error("Name required"); return; }
        if (!subject.trim()) { toast.error("Subject required"); return; }
        if (templateMode === "custom" && !htmlContent.trim()) { toast.error("HTML content required"); return; }
        if (targetType !== "all_users" && !targetFilter && targetType !== "specific_emails") {
            toast.error("Select a target filter");
            return;
        }
        if (targetType === "specific_emails" && !targetEmails.trim()) {
            toast.error("Enter target email addresses");
            return;
        }

        setSending(true);
        try {
            let scheduledAt = Date.now();
            if (scheduleMode === "later" && scheduledDate && scheduledTime) {
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
                    name: name.trim(),
                    subject: subject.trim(),
                    htmlContent: templateMode === "custom" ? htmlContent : undefined,
                    scheduledAt,
                    status,
                });
                toast.success("Campaign updated");
            } else {
                await createCampaign({
                    name: name.trim(),
                    type: type as any,
                    subject: subject.trim(),
                    htmlContent: templateMode === "custom" ? htmlContent : undefined,
                    reactEmailTemplate: templateMode !== "custom" ? templateMode : undefined,
                    targetType: targetType as any,
                    targetFilter: targetType !== "all_users" && targetType !== "specific_emails" ? targetFilter : undefined,
                    targetEmails: targetType === "specific_emails" ? targetEmails.split(",").map((e) => e.trim()).filter(Boolean) : undefined,
                    channel,
                    scheduledAt,
                    status,
                });
                toast.success(status === "draft" ? "Draft saved!" : "Campaign scheduled!");
            }
            onClose();
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to save campaign");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Campaign Name</Label>
                <Input placeholder="e.g. June Re-engagement Blast" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" />
            </div>

            {/* Type */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="one_off">One-off</SelectItem>
                        <SelectItem value="welcome_series">Welcome Series</SelectItem>
                        <SelectItem value="reengagement">Re-engagement</SelectItem>
                        <SelectItem value="daily_horoscope">Daily Horoscope</SelectItem>
                        <SelectItem value="weekly_cosmic">Weekly Cosmic</SelectItem>
                        <SelectItem value="monthly_roundup">Monthly Roundup</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Input placeholder="Email subject line" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white/5 border-white/10" />
            </div>

            {/* Template / HTML */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Template</Label>
                <Select value={templateMode} onValueChange={setTemplateMode}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {emailTemplateOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {templateMode === "custom" && (
                    <Textarea
                        placeholder="Enter raw HTML for your email..."
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        rows={6}
                        className="bg-white/5 border-white/10 font-mono text-xs resize-none"
                    />
                )}
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Target Audience</Label>
                <Select value={targetType} onValueChange={(val) => { setTargetType(val); setTargetFilter(""); }}>
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

                {targetType !== "all_users" && targetType !== "specific_emails" && (
                    <Select value={targetFilter} onValueChange={setTargetFilter}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select filter..." />
                        </SelectTrigger>
                        <SelectContent>
                            {(targetFilterOptions[targetType] ?? []).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {targetType === "specific_emails" && (
                    <Textarea
                        placeholder="Comma-separated email addresses..."
                        value={targetEmails}
                        onChange={(e) => setTargetEmails(e.target.value)}
                        rows={3}
                        className="bg-white/5 border-white/10 resize-none"
                    />
                )}
            </div>

            {/* From Channel */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">From Channel</Label>
                <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="transactional">Transactional (auth@)</SelectItem>
                        <SelectItem value="marketing">Marketing (oracle@)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Schedule</Label>
                <div className="flex gap-2">
                    <Button type="button" variant={scheduleMode === "now" ? "default" : "outline"} size="sm" onClick={() => setScheduleMode("now")} className="text-xs">Send Now</Button>
                    <Button type="button" variant={scheduleMode === "later" ? "default" : "outline"} size="sm" onClick={() => setScheduleMode("later")} className="text-xs">Schedule</Button>
                </div>
                {scheduleMode === "later" && (
                    <div className="flex gap-2">
                        <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
                        <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
                {!isEditing && (
                    <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={sending}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileEdit className="h-4 w-4 mr-2" />}
                        Save Draft
                    </Button>
                )}
                <Button onClick={() => handleSubmit("scheduled")} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    {scheduleMode === "now" ? "Schedule & Send" : "Schedule"}
                </Button>
            </div>
        </div>
    );
}

function CampaignList({ campaigns, onEdit, onRefresh }: { campaigns: any[]; onEdit: (c: any) => void; onRefresh: () => void }) {
    const sendCampaignNow = useMutation(api.emails.admin.sendCampaignNow);
    const pauseCampaign = useMutation(api.emails.admin.pauseCampaign);
    const resumeCampaign = useMutation(api.emails.admin.resumeCampaign);
    const deleteCampaign = useMutation(api.emails.admin.deleteCampaign);
    const [confirmOpen, setConfirmOpen] = React.useState<string | null>(null);
    const [confirmAction, setConfirmAction] = React.useState<"send" | "pause" | "resume" | "delete" | null>(null);
    const [confirming, setConfirming] = React.useState(false);

    async function handleConfirm(campaignId: string) {
        setConfirming(true);
        try {
            if (confirmAction === "send") {
                await sendCampaignNow({ campaignId: campaignId as any });
                toast.success("Campaign sent!");
            } else if (confirmAction === "pause") {
                await pauseCampaign({ campaignId: campaignId as any });
                toast.success("Campaign paused");
            } else if (confirmAction === "resume") {
                await resumeCampaign({ campaignId: campaignId as any });
                toast.success("Campaign resumed");
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

    function getTargetLabel(c: any) {
        const t = c.targetType ?? c.segment;
        if (t === "all_users") return "All Users";
        if (t === "specific_emails") return `${c.targetEmails?.length ?? 0} emails`;
        const opts = targetFilterOptions[t] ?? [];
        const found = opts.find((o) => o.value === c.targetFilter);
        const tLabel = targetAudienceOptions.find((o) => o.value === t)?.label ?? t;
        return found ? `${tLabel}: ${found.label}` : tLabel;
    }

    return (
        <div className="space-y-2">
            {campaigns.map((c: any) => (
                <div key={c._id} className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-medium truncate">{c.name}</h3>
                                <StatusBadge status={c.status} variant="campaign" />
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-lg">
                                {c.subject}
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 flex-wrap">
                                <span>{campaignTypeLabels[c.type] ?? c.type}</span>
                                <span>{getTargetLabel(c)}</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(c.createdAt)}
                                </span>
                                {(c.sentCount ?? 0) > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Send className="h-3 w-3" />
                                        {c.sentCount} sent
                                        {(c.openedCount ?? 0) > 0 && ` / ${c.openedCount} opened`}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            {(c.status === "draft" || c.status === "scheduled") && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                                    <FileEdit className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {c.status === "draft" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={() => { setConfirmAction("send"); setConfirmOpen(c._id); }}>
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {(c.status === "active" || c.status === "sending") && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400" onClick={() => { setConfirmAction("pause"); setConfirmOpen(c._id); }}>
                                    <Pause className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {c.status === "paused" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={() => { setConfirmAction("resume"); setConfirmOpen(c._id); }}>
                                    <Play className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {(c.status === "draft" || c.status === "completed") && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60" onClick={() => { setConfirmAction("delete"); setConfirmOpen(c._id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Confirm Dialog */}
                    <Dialog open={confirmOpen === c._id} onOpenChange={(open) => { if (!open) { setConfirmOpen(null); setConfirmAction(null); } }}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="font-serif flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                    {confirmAction === "send" && "Send Campaign?"}
                                    {confirmAction === "pause" && "Pause Campaign?"}
                                    {confirmAction === "resume" && "Resume Campaign?"}
                                    {confirmAction === "delete" && "Delete Campaign?"}
                                </DialogTitle>
                                <DialogDescription>
                                    {confirmAction === "send" && `Send "${c.name}" now? This cannot be undone.`}
                                    {confirmAction === "pause" && `Pause "${c.name}"?`}
                                    {confirmAction === "resume" && `Resume "${c.name}"?`}
                                    {confirmAction === "delete" && `Permanently delete "${c.name}"?`}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => { setConfirmOpen(null); setConfirmAction(null); }} disabled={confirming}>Go Back</Button>
                                <Button variant={confirmAction === "delete" ? "destructive" : "default"} onClick={() => handleConfirm(c._id)} disabled={confirming}>
                                    {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ))}
        </div>
    );
}

// ─── Deliveries Tab ─────────────────────────────────────────────────────────

function DeliveryManager() {
    const [statusFilter, setStatusFilter] = React.useState<string>("");
    const [channelFilter, setChannelFilter] = React.useState<string>("");
    const [searchEmail, setSearchEmail] = React.useState("");
    const [searchDebounce, setSearchDebounce] = React.useState("");
    const [cursor, setCursor] = React.useState("");
    const [allDeliveries, setAllDeliveries] = React.useState<any[]>([]);

    // Debounced search
    React.useEffect(() => {
        const timer = setTimeout(() => setSearchDebounce(searchEmail), 300);
        return () => clearTimeout(timer);
    }, [searchEmail]);

    const deliveries = useQuery(api.emails.admin.listDeliveries, {
        paginationOpts: { numItems: 50, cursor },
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(channelFilter ? { channel: channelFilter as any } : {}),
        ...(searchDebounce ? { searchEmail: searchDebounce } : {}),
    });

    // Accumulate pages
    React.useEffect(() => {
        if (deliveries?.page) {
            if (cursor === "") {
                setAllDeliveries(deliveries.page);
            } else {
                setAllDeliveries((prev) => [...prev, ...deliveries.page]);
            }
        }
    }, [deliveries]);

    const selectedDelivery = useQuery(
        api.emails.admin.getDelivery,
        (allDeliveries.length > 0 && false) ? { deliveryId: "" as any } : "skip"
    );

    const [detailId, setDetailId] = React.useState<string | null>(null);
    const detail = useQuery(
        api.emails.admin.getDelivery,
        detailId ? { deliveryId: detailId as any } : "skip"
    );

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">Delivery Log</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setCursor(""); setAllDeliveries([]); }}>
                    <SelectTrigger className="bg-white/5 border-white/10 w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="opened">Opened</SelectItem>
                        <SelectItem value="clicked">Clicked</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v === "all" ? "" : v); setCursor(""); setAllDeliveries([]); }}>
                    <SelectTrigger className="bg-white/5 border-white/10 w-[150px]">
                        <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        value={searchEmail}
                        onChange={(e) => { setSearchEmail(e.target.value); setCursor(""); setAllDeliveries([]); }}
                        className="bg-white/5 border-white/10 pl-8"
                    />
                </div>
            </div>

            {/* Table */}
            {deliveries === undefined && allDeliveries.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : allDeliveries.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                    <Mail className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No deliveries found</p>
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Channel</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sent At</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allDeliveries.map((d: any) => (
                                <TableRow key={d._id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setDetailId(d._id)}>
                                    <TableCell className="text-xs">{d.email}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {d.campaignId ? "Campaign" : d.channel === "transactional" ? "Transactional" : "Manual"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                        {d.subject ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={d.channel ?? "transactional"} variant={d.channel === "marketing" ? "engagement" : "subscription"} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={d.status} variant="delivery" showDot />
                                    </TableCell>
                                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                                        {relativeTime(d.sentAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Load More */}
                    {deliveries && !deliveries.isDone && (
                        <div className="flex justify-center pt-4">
                            <Button variant="outline" size="sm" onClick={() => setCursor(deliveries.continueCursor)}>
                                Load More
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Delivery Detail Dialog */}
            <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Delivery Details</DialogTitle>
                    </DialogHeader>
                    {detail === undefined ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : detail === null ? (
                        <p className="text-sm text-muted-foreground">Delivery not found.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recipient</p>
                                    <p className="text-sm">{detail.delivery.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</p>
                                    <StatusBadge status={detail.delivery.status} variant="delivery" showDot />
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Message ID</p>
                                    <p className="text-xs font-mono flex items-center gap-1">
                                        {detail.delivery.messageId ?? "—"}
                                        {detail.delivery.messageId && (
                                            <Copy className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(detail.delivery.messageId!); toast.success("Copied"); }} />
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Channel</p>
                                    <p className="text-xs">{detail.delivery.channel ?? "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sent At</p>
                                    <p className="text-xs">{formatDateTime(detail.delivery.sentAt)}</p>
                                </div>
                                {detail.delivery.openedAt && (
                                    <div>
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Opened At</p>
                                        <p className="text-xs">{formatDateTime(detail.delivery.openedAt)}</p>
                                    </div>
                                )}
                                {detail.delivery.bouncedAt && (
                                    <div>
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Bounced At</p>
                                        <p className="text-xs">{formatDateTime(detail.delivery.bouncedAt)}</p>
                                    </div>
                                )}
                                {detail.delivery.errorMessage && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Error</p>
                                        <p className="text-xs text-red-400">{detail.delivery.errorMessage}</p>
                                    </div>
                                )}
                            </div>
                            {detail.user && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">User</p>
                                    <a href={`/admin/users/${detail.user._id}`} className="text-xs text-primary hover:underline">
                                        {detail.user.username ?? detail.user.email ?? detail.user._id}
                                    </a>
                                </div>
                            )}
                            {detail.campaign && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Campaign</p>
                                    <p className="text-xs">{detail.campaign.name}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Leads Tab ──────────────────────────────────────────────────────────────

function LeadManager() {
    const [statusFilter, setStatusFilter] = React.useState<string>("");
    const [sourceFilter, setSourceFilter] = React.useState<string>("");
    const [searchEmail, setSearchEmail] = React.useState("");
    const [searchDebounce, setSearchDebounce] = React.useState("");
    const [cursor, setCursor] = React.useState("");
    const [allLeads, setAllLeads] = React.useState<any[]>([]);
    const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        const timer = setTimeout(() => setSearchDebounce(searchEmail), 300);
        return () => clearTimeout(timer);
    }, [searchEmail]);

    const leads = useQuery(api.emails.admin.listLeads, {
        paginationOpts: { numItems: 50, cursor },
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(sourceFilter ? { source: sourceFilter as any } : {}),
        ...(searchDebounce ? { search: searchDebounce } : {}),
    });

    React.useEffect(() => {
        if (leads?.page) {
            if (cursor === "") {
                setAllLeads(leads.page);
            } else {
                setAllLeads((prev) => [...prev, ...leads.page]);
            }
        }
    }, [leads]);

    const updateLeadStatus = useMutation(api.emails.admin.updateLeadStatus);
    const bulkUpdateLeads = useMutation(api.emails.admin.bulkUpdateLeads);
    const deleteLead = useMutation(api.emails.admin.deleteLead);
    const [bulkStatus, setBulkStatus] = React.useState<string>("active");
    const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false);
    const [bulkBusy, setBulkBusy] = React.useState(false);

    function toggleSelect(id: string) {
        setSelectedLeads((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (selectedLeads.size === allLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(allLeads.map((l: any) => l._id)));
        }
    }

    async function handleBulkUpdate() {
        setBulkBusy(true);
        try {
            await bulkUpdateLeads({ leadIds: Array.from(selectedLeads) as any, status: bulkStatus as any });
            toast.success(`Updated ${selectedLeads.size} leads`);
            setSelectedLeads(new Set());
        } catch (err: any) {
            toast.error(err?.message ?? "Bulk update failed");
        } finally {
            setBulkBusy(false);
            setBulkConfirmOpen(false);
        }
    }

    async function handleDeleteLead(id: string) {
        try {
            await deleteLead({ leadId: id as any });
            toast.success("Lead deleted");
        } catch (err: any) {
            toast.error(err?.message ?? "Delete failed");
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">Email Leads</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setCursor(""); setAllLeads([]); }}>
                    <SelectTrigger className="bg-white/5 border-white/10 w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v === "all" ? "" : v); setCursor(""); setAllLeads([]); }}>
                    <SelectTrigger className="bg-white/5 border-white/10 w-[160px]">
                        <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="exit_intent_popup">Exit Intent</SelectItem>
                        <SelectItem value="blog_signup">Blog Signup</SelectItem>
                        <SelectItem value="social_cta">Social CTA</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        value={searchEmail}
                        onChange={(e) => { setSearchEmail(e.target.value); setCursor(""); setAllLeads([]); }}
                        className="bg-white/5 border-white/10 pl-8"
                    />
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedLeads.size > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs font-mono text-muted-foreground">{selectedLeads.size} selected</span>
                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                        <SelectTrigger className="bg-white/5 border-white/10 w-[140px] h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Set Active</SelectItem>
                            <SelectItem value="unsubscribed">Set Unsubscribed</SelectItem>
                            <SelectItem value="bounced">Set Bounced</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setBulkConfirmOpen(true)}>
                        Apply
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedLeads(new Set())}>
                        Clear
                    </Button>

                    <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="font-serif">Confirm Bulk Update</DialogTitle>
                                <DialogDescription>
                                    Change status to &quot;{bulkStatus}&quot; for {selectedLeads.size} leads?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => setBulkConfirmOpen(false)} disabled={bulkBusy}>Cancel</Button>
                                <Button onClick={handleBulkUpdate} disabled={bulkBusy}>
                                    {bulkBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Table */}
            {leads === undefined && allLeads.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : allLeads.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                    <Users className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No email leads found</p>
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox checked={selectedLeads.size === allLeads.length && allLeads.length > 0} onCheckedChange={toggleAll} />
                                </TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Sign</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Opt-in</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allLeads.map((l: any) => (
                                <TableRow key={l._id}>
                                    <TableCell>
                                        <Checkbox checked={selectedLeads.has(l._id)} onCheckedChange={() => toggleSelect(l._id)} />
                                    </TableCell>
                                    <TableCell className="text-xs">{l.email}</TableCell>
                                    <TableCell><StatusBadge status={l.status} variant="lead" /></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{(l.source ?? "").replace(/_/g, " ")}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{l.sign ?? "—"}</TableCell>
                                    <TableCell className="text-xs">
                                        {l.userId ? (
                                            <a href={`/admin/users/${l.userId}`} className="text-primary hover:underline">View</a>
                                        ) : "—"}
                                    </TableCell>
                                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                                        {formatDateTime(l.optInAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60" onClick={() => handleDeleteLead(l._id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {leads && !leads.isDone && (
                        <div className="flex justify-center pt-4">
                            <Button variant="outline" size="sm" onClick={() => setCursor(leads.continueCursor)}>
                                Load More
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Templates Tab ──────────────────────────────────────────────────────────

function TemplateGallery() {
    const [testSendOpen, setTestSendOpen] = React.useState<string | null>(null);
    const [testEmail, setTestEmail] = React.useState("badjarovv@gmail.com");
    const [testSubject, setTestSubject] = React.useState("");
    const sendManualEmail = useMutation(api.emails.admin.sendManualEmail);
    const previewTemplate = useAction(api.emails.templateRenderer.previewTemplate);
    const [sending, setSending] = React.useState(false);

    // Preview state
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
    const [previewSubject, setPreviewSubject] = React.useState("");
    const [previewTemplateName, setPreviewTemplateName] = React.useState("");

    async function handlePreview(templateName: string) {
        setPreviewTemplateName(templateName);
        setPreviewLoading(true);
        setPreviewOpen(true);
        setPreviewHtml(null);
        try {
            const result = await previewTemplate({ templateName });
            setPreviewHtml(result.html);
            setPreviewSubject(result.subject);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to render template");
            setPreviewOpen(false);
        } finally {
            setPreviewLoading(false);
        }
    }

    async function handleTestSend(templateName: string) {
        setSending(true);
        try {
            // Render the template first, then send the rendered HTML
            const rendered = await previewTemplate({ templateName });
            await sendManualEmail({
                to: [testEmail],
                subject: testSubject || rendered.subject,
                html: rendered.html,
                channel: "transactional",
            });
            toast.success(`Test email sent to ${testEmail}`);
            setTestSendOpen(null);
        } catch (err: any) {
            toast.error(err?.message ?? "Test send failed");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">Email Templates</h2>
            <p className="text-xs text-muted-foreground">
                Preview and test-send existing React Email templates.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templateGalleryItems.map((t) => (
                    <Card key={t.name} className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-sm">{t.label}</CardTitle>
                            <CardDescription className="text-xs">{t.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Template preview thumbnail */}
                            <div className="aspect-[4/3] rounded border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors" onClick={() => handlePreview(t.name)}>
                                <div className="text-center">
                                    <Mail className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                                    <span className="text-[10px] text-muted-foreground/50 font-mono">Click Preview to render</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreview(t.name)}
                                >
                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                    Preview
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setTestSubject(`[Test] ${t.label}`);
                                        setTestSendOpen(t.name);
                                    }}
                                >
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    Test Send
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Template Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) setPreviewOpen(false); }}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh]">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Preview: {previewTemplateName}</DialogTitle>
                        <DialogDescription>
                            Rendered with sample data. {previewSubject && `Subject: ${previewSubject}`}
                        </DialogDescription>
                    </DialogHeader>
                    {previewLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : previewHtml ? (
                        <div className="rounded-lg border border-white/10 overflow-hidden bg-white" style={{ maxHeight: '60vh' }}>
                            <iframe
                                srcDoc={previewHtml}
                                title={`Preview: ${previewTemplateName}`}
                                className="w-full border-0"
                                style={{ height: '60vh' }}
                                sandbox="allow-same-origin"
                            />
                        </div>
                    ) : null}
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button>
                        {previewHtml && (
                            <Button variant="outline" onClick={() => {
                                navigator.clipboard.writeText(previewHtml);
                                toast.success("HTML copied to clipboard");
                            }}>
                                Copy HTML
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Send Dialog */}
            <Dialog open={!!testSendOpen} onOpenChange={(open) => { if (!open) setTestSendOpen(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Test Send: {testSendOpen}</DialogTitle>
                        <DialogDescription>Send a test email rendered from this template.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To</Label>
                            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Subject</Label>
                            <Input value={testSubject} onChange={(e) => setTestSubject(e.target.value)} className="bg-white/5 border-white/10" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setTestSendOpen(null)} disabled={sending}>Cancel</Button>
                        <Button onClick={() => handleTestSend(testSendOpen!)} disabled={sending}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Send Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminEmailsPage() {
    const stats = useQuery(api.emails.admin.getStats);

    return (
        <div className="max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-galactic" />
                <div>
                    <h1 className="text-2xl font-serif font-bold">Email Operations</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {stats?.totalDeliveries !== undefined
                            ? `${stats.totalDeliveries.toLocaleString()} total deliveries`
                            : "Campaigns, deliveries, SMTP health, templates, and leads."}
                    </p>
                </div>
            </div>

            {/* Tabbed Interface */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview" className="text-xs">
                        <Activity className="h-3.5 w-3.5 mr-1.5" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="text-xs">
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="deliveries" className="text-xs">
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Deliveries
                    </TabsTrigger>
                    <TabsTrigger value="leads" className="text-xs">
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        Leads
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="text-xs">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Templates
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <EmailOverview />
                </TabsContent>
                <TabsContent value="campaigns" className="mt-6">
                    <CampaignManager />
                </TabsContent>
                <TabsContent value="deliveries" className="mt-6">
                    <DeliveryManager />
                </TabsContent>
                <TabsContent value="leads" className="mt-6">
                    <LeadManager />
                </TabsContent>
                <TabsContent value="templates" className="mt-6">
                    <TemplateGallery />
                </TabsContent>
            </Tabs>
        </div>
    );
}