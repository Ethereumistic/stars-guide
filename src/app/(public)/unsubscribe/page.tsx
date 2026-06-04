"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Mail, CheckCircle2, XCircle, Loader2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Unsubscribe Confirmation Page ────────────────────────────────────────
// This page is reached via the HMAC token link in emails:
//   https://stars.guide/unsubscribe?token=<hmac_token>
// OR via the Convex HTTP endpoint:
//   https://convex.stars.guide/unsubscribe?token=<hmac_token>

export default function UnsubscribePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const type = searchParams.get("type"); // optional: for display purposes

    const [status, setStatus] = React.useState<"loading" | "success" | "error" | "idle">("idle");
    const [errorMessage, setErrorMessage] = React.useState("");
    const [unsubResult, setUnsubResult] = React.useState<{ email: string; type: string } | null>(null);
    const [resubscribing, setResubscribing] = React.useState(false);
    const [resubscribed, setResubscribed] = React.useState(false);

    const unsubscribeAction = useAction(api.email.unsubscribeActions.verifyAndUnsubscribe);
    const resubscribeMutation = useMutation(api.email.unsubscribe.resubscribe);

    // Auto-execute unsubscribe on mount if token is present
    React.useEffect(() => {
        if (!token || status !== "idle") return;

        setStatus("loading");
        unsubscribeAction({ token })
            .then((result) => {
                setUnsubResult({ email: result.email, type: result.type });
                setStatus("success");
            })
            .catch((err) => {
                setErrorMessage(err?.message ?? "Invalid or expired unsubscribe link");
                setStatus("error");
            });
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    const emailTypeLabels: Record<string, string> = {
        daily_horoscope: "Daily Horoscope",
        weekly_cosmic: "Weekly Cosmic",
        monthly_roundup: "Monthly Roundup",
        reengagement: "Re-engagement",
        welcome: "Welcome",
        admin_broadcast: "Admin Broadcast",
        all: "all marketing",
    };

    const typeLabel = unsubResult
        ? emailTypeLabels[unsubResult.type] ?? unsubResult.type
        : type
          ? emailTypeLabels[type] ?? type
          : "all marketing";

    async function handleResubscribe() {
        setResubscribing(true);
        try {
            await resubscribeMutation({ subscribe: true });
            setResubscribed(true);
        } catch {
            // If not authenticated, redirect to settings
            router.push("/settings/emails");
        } finally {
            setResubscribing(false);
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4">
            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[0%] w-[140%] h-[140%] opacity-[0.08] mix-blend-screen"
                    style={{
                        background: "radial-gradient(circle at 30% 40%, oklch(0.5 0.2 240) 0%, transparent 55%)",
                    }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-full h-full opacity-[0.06] mix-blend-screen"
                    style={{
                        background: "radial-gradient(circle at 70% 70%, oklch(0.8 0.1 60) 0%, transparent 50%)",
                    }}
                />
            </div>

            <div className="relative z-10 max-w-md w-full">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center space-y-6">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span className="font-serif text-lg text-white">stars.guide</span>
                    </div>

                    {/* Loading state */}
                    {status === "loading" && (
                        <div className="space-y-4 py-8">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                Processing your unsubscribe request…
                            </p>
                        </div>
                    )}

                    {/* No token provided */}
                    {status === "idle" && !token && (
                        <div className="space-y-4 py-4">
                            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Mail className="h-7 w-7 text-amber-400" />
                            </div>
                            <h1 className="text-xl font-serif text-white">
                                Manage Email Preferences
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Sign in to update your email preferences, or click the unsubscribe link in any email.
                            </p>
                            <div className="pt-2">
                                <Button onClick={() => router.push("/settings/emails")} className="w-full">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Go to Email Settings
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {status === "success" && (
                        <div className="space-y-4 py-4">
                            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                            </div>
                            <h1 className="text-xl font-serif text-white">
                                You&apos;ve been unsubscribed
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                You will no longer receive{" "}
                                <strong className="text-foreground">{typeLabel}</strong> emails
                                {unsubResult && (
                                    <> at <strong className="text-foreground">{unsubResult.email}</strong></>
                                )}.
                            </p>

                            {resubscribed ? (
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-300">
                                    ✓ You&apos;re back! You&apos;ll start receiving emails again.
                                </div>
                            ) : (
                                <div className="space-y-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleResubscribe}
                                        disabled={resubscribing}
                                    >
                                        {resubscribing ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : null}
                                        Resubscribe
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full text-xs text-muted-foreground"
                                        onClick={() => router.push("/settings/emails")}
                                    >
                                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                                        Manage email preferences
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {status === "error" && (
                        <div className="space-y-4 py-4">
                            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                                <XCircle className="h-7 w-7 text-red-400" />
                            </div>
                            <h1 className="text-xl font-serif text-white">
                                Link Expired or Invalid
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {errorMessage || "This unsubscribe link has expired or is invalid. Please use a recent link from your email."}
                            </p>
                            <div className="space-y-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push("/settings/emails")}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage email preferences
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Or click the unsubscribe link in a recent email.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-muted-foreground/60">
                            stars.guide respects your inbox. You can always resubscribe from your settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}