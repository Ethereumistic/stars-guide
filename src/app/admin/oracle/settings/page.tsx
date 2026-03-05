"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
    Loader2,
    Save,
    AlertTriangle,
    CheckCircle,
    Eye,
} from "lucide-react";
import { toast } from "sonner";

const MODEL_OPTIONS = [
    { value: "arcee-ai/trinity-large-preview:free", label: "Trinity Large Preview", provider: "Arcee AI" },
    { value: "stepfun/step-3.5-flash:free", label: "Step 3.5 Flash", provider: "Step Fun" },
    { value: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air", provider: "Z-AI" },
    { value: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast", provider: "xAI" },
    { value: "x-ai/grok-4.1", label: "Grok 4.1", provider: "xAI" },
    { value: "NONE", label: "NONE", provider: "NONE" },
];

export default function OracleSettingsPage() {
    const settings = useQuery(api.oracle.settings.listAllSettings);
    const upsertSetting = useMutation(api.oracle.settings.upsertSetting);
    const saveSoulPrompt = useMutation(api.oracle.settings.saveSoulPrompt);

    // Local state for form fields
    const [soulPrompt, setSoulPrompt] = useState("");
    const [modelA, setModelA] = useState("");
    const [modelB, setModelB] = useState("");
    const [modelC, setModelC] = useState("");
    const [temperature, setTemperature] = useState(0.82);
    const [maxTokens, setMaxTokens] = useState(600);
    const [topP, setTopP] = useState(0.92);
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [fallbackResponse, setFallbackResponse] = useState("");
    const [crisisResponse, setCrisisResponse] = useState("");
    const [oracleEnabled, setOracleEnabled] = useState(true);
    const [confirmKillSwitch, setConfirmKillSwitch] = useState("");
    const [showKillSwitchDialog, setShowKillSwitchDialog] = useState(false);

    // Quota states
    const [quotaFree, setQuotaFree] = useState("5");
    const [quotaPopular, setQuotaPopular] = useState("5");
    const [quotaPremium, setQuotaPremium] = useState("10");
    const [quotaModerator, setQuotaModerator] = useState("10");
    const [quotaAdmin, setQuotaAdmin] = useState("999");

    const [saving, setSaving] = useState<string | null>(null);
    const [dirty, setDirty] = useState<Record<string, boolean>>({});

    // Load settings into form
    useEffect(() => {
        if (!settings) return;

        const get = (key: string) => settings.find((s) => s.key === key)?.value;

        setSoulPrompt(get("soul_prompt") ?? "");
        setModelA(get("model_a") ?? "google/gemini-2.5-flash");
        setModelB(get("model_b") ?? "anthropic/claude-sonnet-4");
        setModelC(get("model_c") ?? "x-ai/grok-4.1-fast");
        setTemperature(parseFloat(get("temperature") ?? "0.82"));
        setMaxTokens(parseInt(get("max_tokens") ?? "600"));
        setTopP(parseFloat(get("top_p") ?? "0.92"));
        setStreamEnabled(get("stream_enabled") === "true");
        setFallbackResponse(get("fallback_response_text") ?? "");
        setCrisisResponse(get("crisis_response_text") ?? "");
        setOracleEnabled(get("oracle_enabled") === "true");
        setQuotaFree(get("quota_limit_user") ?? "5");
        setQuotaPopular(get("quota_limit_popular") ?? "5");
        setQuotaPremium(get("quota_limit_premium") ?? "10");
        setQuotaModerator(get("quota_limit_moderator") ?? "10");
        setQuotaAdmin(get("quota_limit_admin") ?? "999");
    }, [settings]);

    const markDirty = (section: string) => setDirty((p) => ({ ...p, [section]: true }));

    const saveSetting = async (key: string, value: string, valueType: "string" | "number" | "boolean" | "json", label: string, group: string) => {
        setSaving(key);
        try {
            await upsertSetting({ key, value, valueType, label, group, description: "" });
            setDirty((p) => ({ ...p, [group]: false }));
            toast.success(`${label} saved`);
        } catch (e: any) {
            toast.error(`Failed to save: ${e.message}`);
        } finally {
            setSaving(null);
        }
    };

    const handleSaveSoulPrompt = async () => {
        setSaving("soul_prompt");
        try {
            await saveSoulPrompt({ content: soulPrompt });
            setDirty((p) => ({ ...p, content: false }));
            toast.success("Soul Prompt saved with version history");
        } catch (e: any) {
            toast.error(`Failed to save: ${e.message}`);
        } finally {
            setSaving(null);
        }
    };

    const handleSaveModelConfig = async () => {
        setSaving("model");
        try {
            await Promise.all([
                upsertSetting({ key: "model_a", value: modelA, valueType: "string", label: "Primary Model", group: "model" }),
                upsertSetting({ key: "model_b", value: modelB, valueType: "string", label: "Fallback Model B", group: "model" }),
                upsertSetting({ key: "model_c", value: modelC, valueType: "string", label: "Fallback Model C", group: "model" }),
                upsertSetting({ key: "temperature", value: temperature.toString(), valueType: "number", label: "Temperature", group: "model" }),
                upsertSetting({ key: "max_tokens", value: maxTokens.toString(), valueType: "number", label: "Max Output Tokens", group: "model" }),
                upsertSetting({ key: "top_p", value: topP.toString(), valueType: "number", label: "Top-p", group: "model" }),
                upsertSetting({ key: "stream_enabled", value: streamEnabled.toString(), valueType: "boolean", label: "Streaming", group: "model" }),
            ]);
            setDirty((p) => ({ ...p, model: false }));
            toast.success("Model configuration saved");
        } catch (e: any) {
            toast.error(`Failed to save: ${e.message}`);
        } finally {
            setSaving(null);
        }
    };

    const handleSaveQuota = async (role: string, value: string, label: string) => {
        await saveSetting(`quota_limit_${role}`, value, "number", label, "quota");
    };

    const handleToggleOracle = async () => {
        if (oracleEnabled) {
            // Turning OFF — require confirmation
            setShowKillSwitchDialog(true);
        } else {
            // Turning ON — just do it
            setOracleEnabled(true);
            await saveSetting("oracle_enabled", "true", "boolean", "Oracle Kill Switch", "content");
        }
    };

    const handleConfirmKillSwitch = async () => {
        if (confirmKillSwitch !== "CONFIRM") return;
        setOracleEnabled(false);
        setShowKillSwitchDialog(false);
        setConfirmKillSwitch("");
        await saveSetting("oracle_enabled", "false", "boolean", "Oracle Kill Switch", "content");
        toast.warning("Oracle is now OFFLINE");
    };

    if (!settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-serif font-bold">Oracle Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Soul prompt, model configuration, quotas, and operational controls
                </p>
            </div>

            <Tabs defaultValue="soul" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="soul">Soul Prompt</TabsTrigger>
                    <TabsTrigger value="model">Model Config</TabsTrigger>
                    <TabsTrigger value="quota">Quotas</TabsTrigger>
                    <TabsTrigger value="ops">Operations</TabsTrigger>
                </TabsList>

                {/* ─── TAB 1: Soul Prompt ─── */}
                <TabsContent value="soul" className="space-y-4">
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Oracle Soul Prompt</CardTitle>
                            <CardDescription>
                                The core personality and behavioral rules — this is the most important content in the system.
                                Uses [SECTION_NAME] format. Changes are versioned for rollback.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={soulPrompt}
                                onChange={(e) => {
                                    setSoulPrompt(e.target.value);
                                    markDirty("content");
                                }}
                                className="min-h-[500px] font-mono text-sm bg-black/20 border-white/10"
                                placeholder="[IDENTITY]&#10;You are Oracle..."
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {soulPrompt.length} characters · ~{Math.round(soulPrompt.length / 4)} tokens
                                </span>
                                <Button
                                    onClick={handleSaveSoulPrompt}
                                    disabled={saving === "soul_prompt" || !dirty.content}
                                    className="gap-2"
                                >
                                    {saving === "soul_prompt" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Soul Prompt
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── TAB 2: Model Configuration ─── */}
                <TabsContent value="model" className="space-y-4">
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Model Fallback Chain</CardTitle>
                            <CardDescription>
                                Oracle tries Model A first. On failure, falls to B, then C, then hardcoded Response D.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Model A */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px]">A</Badge>
                                    Primary Model
                                </Label>
                                <Select value={modelA} onValueChange={(v) => { setModelA(v); markDirty("model"); }}>
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MODEL_OPTIONS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label} <span className="text-muted-foreground ml-1">({m.provider})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Model B */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px]">B</Badge>
                                    Fallback Model — used if A fails
                                </Label>
                                <Select value={modelB} onValueChange={(v) => { setModelB(v); markDirty("model"); }}>
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MODEL_OPTIONS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label} <span className="text-muted-foreground ml-1">({m.provider})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Model C */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-red-500/50 text-red-400 text-[10px]">C</Badge>
                                    Last Resort Model — used if A and B fail
                                </Label>
                                <Select value={modelC} onValueChange={(v) => { setModelC(v); markDirty("model"); }}>
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MODEL_OPTIONS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label} <span className="text-muted-foreground ml-1">({m.provider})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator className="opacity-20" />

                            {/* Temperature */}
                            <div className="space-y-3">
                                <Label>Temperature: {temperature.toFixed(2)}</Label>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-muted-foreground">🎯 Precise</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={temperature}
                                        onChange={(e) => { setTemperature(parseFloat(e.target.value)); markDirty("model"); }}
                                        className="flex-1 accent-galactic h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                                    />
                                    <span className="text-xs text-muted-foreground">🌀 Creative</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Recommended: 0.82 · Below 0.7 feels clinical. Above 0.9 risks hallucinating chart details.
                                </p>
                            </div>

                            {/* Max Tokens */}
                            <div className="space-y-2">
                                <Label>Max Output Tokens</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        min={200}
                                        max={1500}
                                        value={maxTokens}
                                        onChange={(e) => { setMaxTokens(parseInt(e.target.value) || 600); markDirty("model"); }}
                                        className="w-32 bg-black/20 border-white/10"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        ≈{Math.round(maxTokens / 1.33)} words
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Recommended: 600 (~450 words). This is the mystical sweet spot.
                                </p>
                            </div>

                            {/* Top-p */}
                            <div className="space-y-3">
                                <Label>Top-p: {topP.toFixed(2)}</Label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1"
                                    step="0.01"
                                    value={topP}
                                    onChange={(e) => { setTopP(parseFloat(e.target.value)); markDirty("model"); }}
                                    className="w-full accent-galactic h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Recommended: 0.92 · 0.90–0.95 is ideal for Oracle.
                                </p>
                            </div>

                            {/* Streaming */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Streaming</Label>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Enable the &quot;Oracle speaking&quot; streaming effect
                                    </p>
                                </div>
                                <Switch
                                    checked={streamEnabled}
                                    onCheckedChange={(v) => { setStreamEnabled(v); markDirty("model"); }}
                                />
                            </div>

                            <Separator className="opacity-20" />

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSaveModelConfig}
                                    disabled={saving === "model" || !dirty.model}
                                    className="gap-2"
                                >
                                    {saving === "model" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Model Config
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── TAB 3: Quotas ─── */}
                <TabsContent value="quota" className="space-y-4">
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Quota Limits</CardTitle>
                            <CardDescription>
                                Configure how many Oracle questions each tier can ask. Changes apply immediately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { role: "user", label: "Free Tier", value: quotaFree, setter: setQuotaFree, reset: "Never (lifetime)" },
                                    { role: "popular", label: "Popular", value: quotaPopular, setter: setQuotaPopular, reset: "24h rolling" },
                                    { role: "premium", label: "Premium", value: quotaPremium, setter: setQuotaPremium, reset: "24h rolling" },
                                    { role: "moderator", label: "Moderator", value: quotaModerator, setter: setQuotaModerator, reset: "24h rolling" },
                                    { role: "admin", label: "Admin", value: quotaAdmin, setter: setQuotaAdmin, reset: "24h rolling" },
                                ].map((tier) => (
                                    <div key={tier.role} className="flex items-center gap-4 bg-white/3 rounded-lg border border-white/8 p-4">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium">{tier.label}</span>
                                            <span className="text-xs text-muted-foreground ml-2">({tier.reset})</span>
                                        </div>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={tier.value}
                                            onChange={(e) => tier.setter(e.target.value)}
                                            className="w-24 bg-black/20 border-white/10"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSaveQuota(tier.role, tier.value, tier.label)}
                                            disabled={saving === `quota_limit_${tier.role}`}
                                            className="border-white/10"
                                        >
                                            {saving === `quota_limit_${tier.role}` ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Save className="w-3 h-3" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── TAB 4: Operations ─── */}
                <TabsContent value="ops" className="space-y-4">
                    {/* Kill Switch */}
                    <Card className={`border-2 transition-colors ${oracleEnabled
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-red-500/5 border-red-500/20"
                        }`}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${oracleEnabled
                                        ? "bg-emerald-500/15"
                                        : "bg-red-500/15"
                                        }`}>
                                        {oracleEnabled ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-red-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">
                                            {oracleEnabled ? "Oracle is LIVE" : "Oracle is OFFLINE"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {oracleEnabled
                                                ? "Users can access Oracle normally"
                                                : "All users see the offline message"
                                            }
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={oracleEnabled}
                                    onCheckedChange={handleToggleOracle}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Kill Switch Dialog */}
                    <Dialog open={showKillSwitchDialog} onOpenChange={setShowKillSwitchDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-red-400">Take Oracle Offline</DialogTitle>
                                <DialogDescription>
                                    This will immediately prevent all users from accessing Oracle.
                                    They will see the fallback response instead. Type CONFIRM to proceed.
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                value={confirmKillSwitch}
                                onChange={(e) => setConfirmKillSwitch(e.target.value)}
                                placeholder="Type CONFIRM"
                                className="bg-black/20 border-white/10"
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowKillSwitchDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirmKillSwitch}
                                    disabled={confirmKillSwitch !== "CONFIRM"}
                                >
                                    Take Offline
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Crisis Response */}
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                Crisis Response
                            </CardTitle>
                            <CardDescription>
                                Shown when crisis keywords are detected — no LLM call is made.
                                Must not be empty.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={crisisResponse}
                                onChange={(e) => setCrisisResponse(e.target.value)}
                                className="min-h-[100px] bg-black/20 border-white/10"
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => saveSetting("crisis_response_text", crisisResponse, "string", "Crisis Response", "safety")}
                                    disabled={!crisisResponse.trim() || saving === "crisis_response_text"}
                                    size="sm"
                                    className="gap-2"
                                >
                                    {saving === "crisis_response_text" ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Save className="w-3 h-3" />
                                    )}
                                    Save Crisis Response
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fallback Response D */}
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base">Fallback Response (D)</CardTitle>
                            <CardDescription>
                                Shown when all 3 models fail — no LLM call. This is the last resort.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={fallbackResponse}
                                onChange={(e) => setFallbackResponse(e.target.value)}
                                className="min-h-[80px] bg-black/20 border-white/10"
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => saveSetting("fallback_response_text", fallbackResponse, "string", "Fallback Response D", "safety")}
                                    disabled={saving === "fallback_response_text"}
                                    size="sm"
                                    className="gap-2"
                                >
                                    {saving === "fallback_response_text" ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Save className="w-3 h-3" />
                                    )}
                                    Save Fallback Response
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
