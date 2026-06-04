"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
    Mail,
    Sun,
    Moon,
    Calendar,
    Sparkles,
    Megaphone,
    Heart,
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Bell,
    BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

// ─── Email type config ────────────────────────────────────────────────────

const EMAIL_TYPES = [
    {
        key: "daily_horoscope",
        label: "Daily Horoscope",
        description: "Your personalized horoscope every morning",
        icon: Sun,
    },
    {
        key: "weekly_cosmic",
        label: "Weekly Cosmic Weather",
        description: "Planetary transits and cosmic energy digest",
        icon: Moon,
    },
    {
        key: "monthly_roundup",
        label: "Monthly Roundup",
        description: "End-of-month reflection and highlights",
        icon: Calendar,
    },
    {
        key: "reengagement",
        label: "Re-engagement",
        description: "We miss you emails when you've been away",
        icon: Heart,
    },
    {
        key: "admin_broadcast",
        label: "Announcements",
        description: "Product updates and important news",
        icon: Megaphone,
    },
] as const;

const FREQUENCY_OPTIONS = [
    { value: "daily", label: "Daily", description: "Every day" },
    { value: "weekly", label: "Weekly", description: "Once a week" },
    { value: "monthly", label: "Monthly", description: "Once a month" },
] as const;

// ─── Toggle Switch ─────────────────────────────────────────────────────────

function ToggleSwitch({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                disabled:opacity-40 disabled:cursor-not-allowed
                ${checked ? "bg-primary" : "bg-white/10"}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0
                    transition-transform duration-200 ease-in-out
                    ${checked ? "translate-x-5" : "translate-x-0"}
                `}
            />
        </button>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function EmailPreferencesPage() {
    const router = useRouter();
    const prefs = useQuery(api.email.unsubscribe.getMyEmailPreferences);
    const updatePrefs = useMutation(api.email.unsubscribe.updateMyEmailPreferences);
    const resubscribeToggle = useMutation(api.email.unsubscribe.resubscribe);

    const [saving, setSaving] = React.useState(false);
    const [localDisabledTypes, setLocalDisabledTypes] = React.useState<string[]>([]);
    const [localFrequency, setLocalFrequency] = React.useState<string>("daily");
    const [initialized, setInitialized] = React.useState(false);

    // Initialize local state from server
    React.useEffect(() => {
        if (prefs && !initialized) {
            setLocalDisabledTypes(prefs.preferences?.disabledTypes ?? []);
            setLocalFrequency(prefs.preferences?.frequency ?? "daily");
            setInitialized(true);
        }
    }, [prefs, initialized]);

    if (prefs === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const isSubscribed = prefs.preferences?.subscribed ?? true;
    const emailStatus = prefs.emailStatus;
    const email = prefs.preferences?._id ? undefined : undefined; // email comes from user

    async function handleToggleType(type: string, enabled: boolean) {
        const newDisabled = enabled
            ? localDisabledTypes.filter((t) => t !== type)
            : [...localDisabledTypes.filter((t) => t !== type), type];

        setLocalDisabledTypes(newDisabled);
        setSaving(true);
        try {
            await updatePrefs({ disabledTypes: newDisabled as any });
            toast.success(enabled ? `Subscribed to ${type.replace(/_/g, " ")}` : `Unsubscribed from ${type.replace(/_/g, " ")}`);
        } catch (err: any) {
            // Revert on error
            setLocalDisabledTypes(localDisabledTypes);
            toast.error(err?.message ?? "Failed to update preferences");
        } finally {
            setSaving(false);
        }
    }

    async function handleFrequencyChange(frequency: string) {
        setLocalFrequency(frequency);
        setSaving(true);
        try {
            await updatePrefs({ frequency: frequency as any });
            toast.success(`Frequency set to ${frequency}`);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to update frequency");
        } finally {
            setSaving(false);
        }
    }

    async function handleUnsubscribeAll() {
        setSaving(true);
        try {
            await resubscribeToggle({ subscribe: false });
            toast.success("Unsubscribed from all emails");
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to unsubscribe");
        } finally {
            setSaving(false);
        }
    }

    async function handleResubscribeAll() {
        setSaving(true);
        try {
            await resubscribeToggle({ subscribe: true });
            setLocalDisabledTypes([]);
            setLocalFrequency("daily");
            toast.success("Resubscribed to all emails");
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to resubscribe");
        } finally {
            setSaving(false);
        }
    }

    const isActive = emailStatus === "active" || !emailStatus;
    const isUnsubscribed = emailStatus === "unsubscribed";

    return (
        <div className="relative min-h-screen w-full text-foreground overflow-x-hidden pb-24">
            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.08] mix-blend-screen"
                    style={{
                        background: "radial-gradient(circle at 30% 40%, oklch(0.5 0.2 240) 0%, transparent 55%)",
                    }}
                />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => router.push("/settings")}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-xs font-mono uppercase tracking-widest">Settings</span>
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-serif text-white">Email Preferences</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Choose which emails you receive and how often.
                    </p>
                </motion.div>

                {/* Unsubscribed banner */}
                <AnimatePresence>
                    {isUnsubscribed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3"
                        >
                            <BellOff className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-300">
                                    You&apos;re currently unsubscribed from all emails
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You won&apos;t receive any emails until you resubscribe.
                                </p>
                                <Button
                                    size="sm"
                                    className="mt-3"
                                    onClick={handleResubscribeAll}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
                                    Resubscribe to all
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Subscription Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <Card className="border-white/10 bg-white/[0.02]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {isActive ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-400" />
                                )}
                                Subscription Status
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {isActive
                                    ? "You're receiving emails. Turn off individual types below or unsubscribe from all."
                                    : "You're not receiving any emails."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isActive && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleUnsubscribeAll}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                    Unsubscribe from all emails
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Email Type Toggles */}
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="space-y-3"
                    >
                        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                            Email Types
                        </h2>
                        {EMAIL_TYPES.map((type, i) => {
                            const isEnabled = !localDisabledTypes.includes(type.key);
                            const Icon = type.icon;
                            return (
                                <motion.div
                                    key={type.key}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                                    className={`
                                        flex items-center justify-between rounded-lg border p-4 transition-all
                                        ${isEnabled
                                            ? "border-white/10 bg-white/[0.03]"
                                            : "border-white/5 bg-white/[0.01] opacity-60"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`h-5 w-5 ${isEnabled ? "text-primary" : "text-muted-foreground/40"}`} />
                                        <div>
                                            <p className={`text-sm font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                                {type.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{type.description}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        checked={isEnabled}
                                        onChange={(val) => handleToggleType(type.key, val)}
                                        disabled={saving}
                                    />
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Frequency Selector */}
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                    >
                        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">
                            Frequency
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            {FREQUENCY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleFrequencyChange(opt.value)}
                                    disabled={saving}
                                    className={`
                                        rounded-lg border p-4 text-center transition-all cursor-pointer
                                        ${localFrequency === opt.value
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:bg-white/[0.04]"
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                    <p className="text-sm font-medium">{opt.label}</p>
                                    <p className="text-xs opacity-60 mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Footer note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="pt-4 pb-8"
                >
                    <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest">
                        stars.guide respects your inbox · Unsubscribe at any time
                    </p>
                </motion.div>
            </div>
        </div>
    );
}