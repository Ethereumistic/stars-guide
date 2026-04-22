"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { JOURNAL_SETTINGS_DEFAULTS } from "@/lib/journal/constants";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AdminJournalSettingsPage() {
    const settings = useQuery(api.journal.settings.listAllSettings);
    const upsertSetting = useMutation(api.journal.settings.upsertSetting);

    const [savingKey, setSavingKey] = React.useState<string | null>(null);

    // Local state for editable settings
    const [limits, setLimits] = React.useState<Record<string, string>>({});
    const [features, setFeatures] = React.useState<Record<string, boolean>>({});
    const [oracleIntegration, setOracleIntegration] = React.useState<Record<string, string>>({});

    // Sync settings from DB into local state
    React.useEffect(() => {
        if (!settings) return;

        const get = (key: string) => settings.find((s: any) => s.key === key)?.value;

        setLimits({
            max_entries_per_day: get("max_entries_per_day") ?? JOURNAL_SETTINGS_DEFAULTS.max_entries_per_day.value,
            max_content_length: get("max_content_length") ?? JOURNAL_SETTINGS_DEFAULTS.max_content_length.value,
            max_photo_size_bytes: get("max_photo_size_bytes") ?? JOURNAL_SETTINGS_DEFAULTS.max_photo_size_bytes.value,
        });

        setFeatures({
            journal_context_enabled: get("journal_context_enabled") !== "false",
            voice_input_enabled: get("voice_input_enabled") !== "false",
        });

        setOracleIntegration({
            journal_context_budget_chars: get("journal_context_budget_chars") ?? JOURNAL_SETTINGS_DEFAULTS.journal_context_budget_chars.value,
            max_entry_context_chars: get("max_entry_context_chars") ?? JOURNAL_SETTINGS_DEFAULTS.max_entry_context_chars.value,
            max_context_journal_entries: get("max_context_journal_entries") ?? JOURNAL_SETTINGS_DEFAULTS.max_context_journal_entries.value,
            default_lookback_days: get("default_lookback_days") ?? JOURNAL_SETTINGS_DEFAULTS.default_lookback_days.value,
        });
    }, [settings]);

    async function saveBatch(
        items: Array<{ key: string; value: string; valueType: "string" | "number" | "boolean" | "json"; label: string; group: string; description?: string }>,
        savingState: string,
        successMessage: string
    ) {
        setSavingKey(savingState);
        try {
            await Promise.all(
                items.map((item) =>
                    upsertSetting({ ...item, description: item.description ?? "" })
                )
            );
            toast.success(successMessage);
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to save settings");
        } finally {
            setSavingKey(null);
        }
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold">Journal Settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Limits, feature toggles, Oracle integration, and operational controls.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="limits" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="limits">Limits</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="oracle">Oracle Integration</TabsTrigger>
                </TabsList>

                {/* Limits Tab */}
                <TabsContent value="limits" className="space-y-4">
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Content & Rate Limits</CardTitle>
                            <CardDescription>
                                Limits to prevent spam and excessive resource usage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Entries Per Day</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={limits.max_entries_per_day}
                                        onChange={(e) =>
                                            setLimits({ ...limits, max_entries_per_day: e.target.value })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Content Length</Label>
                                    <Input
                                        type="number"
                                        min={1000}
                                        max={100000}
                                        value={limits.max_content_length}
                                        onChange={(e) =>
                                            setLimits({ ...limits, max_content_length: e.target.value })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Photo Size (bytes)</Label>
                                    <Input
                                        type="number"
                                        value={limits.max_photo_size_bytes}
                                        onChange={(e) =>
                                            setLimits({ ...limits, max_photo_size_bytes: e.target.value })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    onClick={() =>
                                        saveBatch(
                                            [
                                                { key: "max_entries_per_day", value: limits.max_entries_per_day, valueType: "number", label: "Max Entries Per Day", group: "limits", description: "Prevent spam" },
                                                { key: "max_content_length", value: limits.max_content_length, valueType: "number", label: "Max Content Length", group: "limits", description: "Characters per entry" },
                                                { key: "max_photo_size_bytes", value: limits.max_photo_size_bytes, valueType: "number", label: "Max Photo Size", group: "limits", description: "5 MB default" },
                                            ],
                                            "limits",
                                            "Limits saved"
                                        )
                                    }
                                    disabled={savingKey === "limits"}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {savingKey === "limits" ? "Saving..." : "Save Limits"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="space-y-4">
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Feature Toggles</CardTitle>
                            <CardDescription>Global switches for journal features.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                                <div>
                                    <Label>Journal-Oracle Integration</Label>
                                    <p className="mt-1 text-xs text-muted-foreground">Master switch for Journal-Oracle context sharing.</p>
                                </div>
                                <Switch
                                    checked={features.journal_context_enabled}
                                    onCheckedChange={(checked) => {
                                        setFeatures({ ...features, journal_context_enabled: checked });
                                        saveBatch(
                                            [{ key: "journal_context_enabled", value: String(checked), valueType: "boolean", label: "Journal-Oracle Integration", group: "features" }],
                                            "feature_journal_context",
                                            `Journal-Oracle integration ${checked ? "enabled" : "disabled"}`
                                        );
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                                <div>
                                    <Label>Voice Input</Label>
                                    <p className="mt-1 text-xs text-muted-foreground">Global toggle for voice journaling (Web Speech API).</p>
                                </div>
                                <Switch
                                    checked={features.voice_input_enabled}
                                    onCheckedChange={(checked) => {
                                        setFeatures({ ...features, voice_input_enabled: checked });
                                        saveBatch(
                                            [{ key: "voice_input_enabled", value: String(checked), valueType: "boolean", label: "Voice Input", group: "features" }],
                                            "feature_voice",
                                            `Voice input ${checked ? "enabled" : "disabled"}`
                                        );
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Oracle Integration Tab */}
                <TabsContent value="oracle" className="space-y-4">
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="text-base">Oracle Integration Parameters</CardTitle>
                            <CardDescription>
                                Controls how journal data is injected into Oracle prompts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Context Char Budget</Label>
                                    <p className="text-xs text-muted-foreground">Max chars for journal context block in Oracle prompt.</p>
                                    <Input
                                        type="number"
                                        min={1000}
                                        max={10000}
                                        value={oracleIntegration.journal_context_budget_chars}
                                        onChange={(e) =>
                                            setOracleIntegration({
                                                ...oracleIntegration,
                                                journal_context_budget_chars: e.target.value,
                                            })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Chars Per Entry in Context</Label>
                                    <p className="text-xs text-muted-foreground">Max chars per journal entry in Oracle context.</p>
                                    <Input
                                        type="number"
                                        min={100}
                                        max={2000}
                                        value={oracleIntegration.max_entry_context_chars}
                                        onChange={(e) =>
                                            setOracleIntegration({
                                                ...oracleIntegration,
                                                max_entry_context_chars: e.target.value,
                                            })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Max Entries in Context</Label>
                                    <p className="text-xs text-muted-foreground">Max journal entries included in Oracle prompt.</p>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={oracleIntegration.max_context_journal_entries}
                                        onChange={(e) =>
                                            setOracleIntegration({
                                                ...oracleIntegration,
                                                max_context_journal_entries: e.target.value,
                                            })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Default Lookback Days</Label>
                                    <p className="text-xs text-muted-foreground">Default time window for Oracle journal context.</p>
                                    <Input
                                        type="number"
                                        min={7}
                                        max={9999}
                                        value={oracleIntegration.default_lookback_days}
                                        onChange={(e) =>
                                            setOracleIntegration({
                                                ...oracleIntegration,
                                                default_lookback_days: e.target.value,
                                            })
                                        }
                                        className="border-white/10 bg-black/20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    onClick={() =>
                                        saveBatch(
                                            [
                                                { key: "journal_context_budget_chars", value: oracleIntegration.journal_context_budget_chars, valueType: "number", label: "Context Char Budget", group: "oracle_integration" },
                                                { key: "max_entry_context_chars", value: oracleIntegration.max_entry_context_chars, valueType: "number", label: "Max Chars Per Entry", group: "oracle_integration" },
                                                { key: "max_context_journal_entries", value: oracleIntegration.max_context_journal_entries, valueType: "number", label: "Max Entries in Context", group: "oracle_integration" },
                                                { key: "default_lookback_days", value: oracleIntegration.default_lookback_days, valueType: "number", label: "Default Lookback Days", group: "oracle_integration" },
                                            ],
                                            "oracle_integration",
                                            "Oracle integration settings saved"
                                        )
                                    }
                                    disabled={savingKey === "oracle_integration"}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {savingKey === "oracle_integration" ? "Saving..." : "Save Oracle Settings"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}