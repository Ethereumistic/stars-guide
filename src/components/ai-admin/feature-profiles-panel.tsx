"use client";

import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { AlertTriangle, CheckCircle, Loader2, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const listFeatureProfilesRef = makeFunctionReference<"query">("aiGateway/admin:listFeatureProfiles");
const upsertFeatureProfileRef = makeFunctionReference<"mutation">("aiGateway/admin:upsertFeatureProfile");
const seedFromLegacyOracleSettingsRef = makeFunctionReference<"mutation">(
  "aiGateway/admin:seedFromLegacyOracleSettings",
);
const testAIFeatureProfileRef = makeFunctionReference<"action">("admin:testAIFeatureProfileAction");

type AIMode = "chat" | "json" | "stream" | "embedding" | "image";
type ThinkingMode = "auto" | "disabled" | "low" | "medium" | "high";
type SafetyProfile = "oracle" | "content_generation" | "none";
type QuotaScope = "oracle_user" | "admin_ops" | "none";

type FeatureProfile = {
  _id?: string;
  featureKey: string;
  label: string;
  enabled: boolean;
  mode: AIMode;
  chainJson: string;
  temperature: number;
  topP?: number;
  maxTokens: number;
  timeoutMs: number;
  thinkingMode: ThinkingMode;
  retries: number;
  safetyProfile?: SafetyProfile;
  quotaScope?: QuotaScope;
};

const MODES: AIMode[] = ["chat", "json", "stream", "embedding", "image"];
const THINKING_MODES: ThinkingMode[] = ["auto", "disabled", "low", "medium", "high"];
const SAFETY_PROFILES: SafetyProfile[] = ["oracle", "content_generation", "none"];
const QUOTA_SCOPES: QuotaScope[] = ["oracle_user", "admin_ops", "none"];

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function FeatureProfilesPanel() {
  const profiles = useQuery(listFeatureProfilesRef) as FeatureProfile[] | undefined;
  const upsertProfile = useMutation(upsertFeatureProfileRef);
  const seedProfiles = useMutation(seedFromLegacyOracleSettingsRef);
  const testProfile = useAction(testAIFeatureProfileRef);

  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<FeatureProfile | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testPrompt, setTestPrompt] = React.useState("Reply with one concise sentence confirming this gateway profile works.");
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    content: string | null;
    reasoning: string | null;
    error: string | null;
    modelUsed: string;
    tier: string | null;
    durationMs: number;
  } | null>(null);

  React.useEffect(() => {
    if (!profiles?.length) return;
    const key = selectedKey ?? profiles[0].featureKey;
    const selected = profiles.find((profile) => profile.featureKey === key) ?? profiles[0];
    setSelectedKey(selected.featureKey);
    setDraft({ ...selected, chainJson: prettyJson(selected.chainJson) });
  }, [profiles, selectedKey]);

  function patchDraft(patch: Partial<FeatureProfile>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const result = await seedProfiles({}) as { profilesSeeded: number; providersSeeded: number };
      toast.success(`Seeded ${result.profilesSeeded} profiles and ${result.providersSeeded} providers`);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to seed gateway profiles");
    } finally {
      setSeeding(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    try {
      JSON.parse(draft.chainJson);
    } catch {
      toast.error("Model chain must be valid JSON.");
      return;
    }

    setSaving(true);
    try {
      await upsertProfile({
        featureKey: draft.featureKey,
        label: draft.label,
        enabled: draft.enabled,
        mode: draft.mode,
        chainJson: JSON.stringify(JSON.parse(draft.chainJson)),
        temperature: Number(draft.temperature),
        topP: draft.topP === undefined ? undefined : Number(draft.topP),
        maxTokens: Number(draft.maxTokens),
        timeoutMs: Number(draft.timeoutMs),
        thinkingMode: draft.thinkingMode,
        retries: Number(draft.retries),
        safetyProfile: draft.safetyProfile,
        quotaScope: draft.quotaScope,
      });
      toast.success("Feature profile saved");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save feature profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!draft || !testPrompt.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProfile({
        featureKey: draft.featureKey,
        prompt: testPrompt,
      });
      setTestResult(result as any);
      if ((result as any).success) toast.success("Gateway profile test succeeded");
      else toast.error((result as any).error ?? "Gateway profile test failed");
    } catch (error: any) {
      toast.error(error?.message ?? "Gateway profile test failed");
    } finally {
      setTesting(false);
    }
  }

  if (!profiles) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Feature Profiles</CardTitle>
          <CardDescription>Gateway defaults per AI feature.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="w-full gap-2">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Seed From Legacy
          </Button>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <button
                key={profile.featureKey}
                type="button"
                onClick={() => setSelectedKey(profile.featureKey)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedKey === profile.featureKey
                    ? "border-primary/60 bg-primary/10"
                    : "border-white/10 bg-black/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{profile.label}</span>
                  <Badge variant={profile.enabled ? "default" : "secondary"} className="text-[10px]">
                    {profile.enabled ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{profile.featureKey}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {draft && (
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{draft.label}</CardTitle>
                  <CardDescription className="font-mono text-xs">{draft.featureKey}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="profile-enabled" className="text-xs">Enabled</Label>
                  <Switch
                    id="profile-enabled"
                    checked={draft.enabled}
                    onCheckedChange={(enabled) => patchDraft({ enabled })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={draft.label} onChange={(event) => patchDraft({ label: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={draft.mode} onValueChange={(mode) => patchDraft({ mode: mode as AIMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODES.map((mode) => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input type="number" step="0.05" value={draft.temperature} onChange={(event) => patchDraft({ temperature: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Input type="number" step="0.05" value={draft.topP ?? ""} onChange={(event) => patchDraft({ topP: event.target.value === "" ? undefined : Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" value={draft.maxTokens} onChange={(event) => patchDraft({ maxTokens: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Timeout Ms</Label>
                  <Input type="number" value={draft.timeoutMs} onChange={(event) => patchDraft({ timeoutMs: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Thinking Mode</Label>
                  <Select value={draft.thinkingMode} onValueChange={(thinkingMode) => patchDraft({ thinkingMode: thinkingMode as ThinkingMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {THINKING_MODES.map((mode) => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retries</Label>
                  <Input type="number" value={draft.retries} onChange={(event) => patchDraft({ retries: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Safety Profile</Label>
                  <Select value={draft.safetyProfile ?? "none"} onValueChange={(safetyProfile) => patchDraft({ safetyProfile: safetyProfile as SafetyProfile })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SAFETY_PROFILES.map((profile) => <SelectItem key={profile} value={profile}>{profile}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quota Scope</Label>
                  <Select value={draft.quotaScope ?? "none"} onValueChange={(quotaScope) => patchDraft({ quotaScope: quotaScope as QuotaScope })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUOTA_SCOPES.map((scope) => <SelectItem key={scope} value={scope}>{scope}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Model Chain JSON</Label>
                <Textarea
                  value={draft.chainJson}
                  onChange={(event) => patchDraft({ chainJson: event.target.value })}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Test Profile</CardTitle>
              <CardDescription>Runs this profile through the AI Gateway non-streaming runtime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} rows={3} />
              <Button onClick={handleTest} disabled={testing || draft.mode === "stream" || draft.mode === "embedding" || draft.mode === "image"} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Gateway Test
              </Button>
              {(draft.mode === "stream" || draft.mode === "embedding" || draft.mode === "image") && (
                <p className="text-xs text-muted-foreground">This runtime test currently supports chat and json profiles.</p>
              )}
              {testResult && (
                <div className={`rounded-md border p-3 text-xs ${testResult.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      {testResult.success ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
                      {testResult.success ? "Success" : "Failure"}
                    </span>
                    <span className="font-mono text-muted-foreground">{testResult.durationMs}ms</span>
                  </div>
                  <div className="font-mono text-muted-foreground">{testResult.modelUsed}{testResult.tier ? ` tier ${testResult.tier}` : ""}</div>
                  {testResult.content && <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-3">{testResult.content}</pre>}
                  {testResult.error && <pre className="mt-2 whitespace-pre-wrap rounded bg-red-500/5 p-3 text-red-300">{testResult.error}</pre>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
