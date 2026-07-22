"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Loader2, Save } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import {
  DEFAULT_ORACLE_SOUL,
  SOUL_DOC_KEY,
  MAX_RESPONSE_TOKENS_DEFAULT,
  MAX_CONTEXT_MESSAGES_DEFAULT,
} from "@/lib/oracle/soul";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SettingItem = {
  key: string;
  value: string;
  valueType: "string" | "number" | "boolean" | "json";
  label: string;
  group: string;
  description?: string;
};

export default function OracleSettingsPage() {
  const settings = useQuery(api.oracle.settings.listAllSettings);
  const upsertSetting = useMutation(api.oracle.settings.upsertSetting);

  const [soulDoc, setSoulDoc] = React.useState<string>(DEFAULT_ORACLE_SOUL);
  const [maxResponseTokens, setMaxResponseTokens] = React.useState(MAX_RESPONSE_TOKENS_DEFAULT);
  const [maxContextMessages, setMaxContextMessages] = React.useState(MAX_CONTEXT_MESSAGES_DEFAULT);
  const [fallbackResponse, setFallbackResponse] = React.useState("");
  const [crisisResponse, setCrisisResponse] = React.useState("");
  const [oracleEnabled, setOracleEnabled] = React.useState(true);
  const [streamingV2Enabled, setStreamingV2Enabled] = React.useState(false);
  const [streamingV2RolloutPercent, setStreamingV2RolloutPercent] = React.useState(0);
  const [streamingV2ShadowPercent, setStreamingV2ShadowPercent] = React.useState(0);
  const [confirmKillSwitch, setConfirmKillSwitch] = React.useState("");
  const [showKillSwitchDialog, setShowKillSwitchDialog] = React.useState(false);
  const [quotaValues, setQuotaValues] = React.useState<Record<string, string>>({
    free: "5",
    popular: "5",
    premium: "10",
    moderator: "10",
    admin: "999",
  });
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!settings) return;

    const get = (key: string) => settings.find((setting) => setting.key === key)?.value;

    setSoulDoc(get(SOUL_DOC_KEY) ?? DEFAULT_ORACLE_SOUL);
    setMaxResponseTokens(Number(get("max_response_tokens") ?? String(MAX_RESPONSE_TOKENS_DEFAULT)));
    setMaxContextMessages(Number(get("max_context_messages") ?? String(MAX_CONTEXT_MESSAGES_DEFAULT)));
    setFallbackResponse(get("fallback_response_text") ?? "");
    setCrisisResponse(get("crisis_response_text") ?? "");
    setOracleEnabled(get("kill_switch") !== "true");
    setStreamingV2Enabled(get("oracle_streaming_v2_enabled") === "true");
    setStreamingV2RolloutPercent(Number(get("oracle_streaming_v2_rollout_percent") ?? "0"));
    setStreamingV2ShadowPercent(Number(get("oracle_streaming_v2_shadow_percent") ?? "0"));
    setQuotaValues({
      free: get("quota_limit_free") ?? "5",
      popular: get("quota_limit_popular") ?? "5",
      premium: get("quota_limit_premium") ?? "10",
      moderator: get("quota_limit_moderator") ?? "10",
      admin: get("quota_limit_admin") ?? "999",
    });
  }, [settings]);

  async function saveBatch(items: SettingItem[], savingState: string, successMessage: string) {
    setSavingKey(savingState);
    try {
      await Promise.all(
        items.map((item) =>
          upsertSetting({
            ...item,
            description: item.description ?? "",
          }),
        ),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Oracle Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oracle-specific voice, limits, quota, safety copy, and operational controls.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/ai">AI Infrastructure</Link>
        </Button>
      </div>

      <Tabs defaultValue="soul" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="soul">Soul</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="quota">Quotas</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="soul" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">Soul Document</CardTitle>
                <CardDescription>
                  Oracle identity, voice, capabilities, and constraints. Provider and model routing now lives in AI Infrastructure.
                </CardDescription>
              </div>
              <Button
                onClick={() =>
                  saveBatch(
                    [{
                      key: SOUL_DOC_KEY,
                      value: soulDoc,
                      valueType: "string",
                      label: "Oracle Soul Document",
                      group: "soul",
                      description: "Unified soul document defining Oracle identity and behavior",
                    }],
                    "soul",
                    "Soul document saved",
                  )
                }
                disabled={savingKey === "soul"}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingKey === "soul" ? "Saving..." : "Save Soul"}
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={soulDoc}
                onChange={(event) => setSoulDoc(event.target.value)}
                className="min-h-[500px] border-white/10 bg-black/20 font-mono text-sm leading-relaxed"
                placeholder="Write the Oracle soul document..."
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{soulDoc.length} characters</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoulDoc(DEFAULT_ORACLE_SOUL)}
                  className="text-xs"
                >
                  Restore Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Token &amp; Context Limits</CardTitle>
              <CardDescription>
                Oracle prompt limits. Feature provider, model, timeout, and temperature defaults are configured in AI Infrastructure profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="max-response-tokens" className="text-sm font-medium">
                    Max Response Tokens
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upper response ceiling used by Oracle runtime compatibility paths.
                  </p>
                  <Input
                    id="max-response-tokens"
                    type="number"
                    min={100}
                    max={16000}
                    step={100}
                    value={maxResponseTokens}
                    onChange={(event) => setMaxResponseTokens(Number(event.target.value))}
                    className="border-white/10 bg-black/20"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="max-context-messages" className="text-sm font-medium">
                    Max Context Messages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Maximum conversation history messages included in each Oracle prompt.
                  </p>
                  <Input
                    id="max-context-messages"
                    type="number"
                    min={2}
                    max={100}
                    step={2}
                    value={maxContextMessages}
                    onChange={(event) => setMaxContextMessages(Number(event.target.value))}
                    className="border-white/10 bg-black/20"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    saveBatch(
                      [
                        {
                          key: "max_response_tokens",
                          value: String(maxResponseTokens),
                          valueType: "number",
                          label: "Max Response Tokens",
                          group: "token_limits",
                          description: "Oracle max response token ceiling",
                        },
                        {
                          key: "max_context_messages",
                          value: String(maxContextMessages),
                          valueType: "number",
                          label: "Max Context Messages",
                          group: "token_limits",
                          description: "Maximum conversation history messages per prompt",
                        },
                      ],
                      "limits",
                      "Limits saved",
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

        <TabsContent value="quota" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Quota Limits</CardTitle>
              <CardDescription>Per-role Oracle usage ceilings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["free", "popular", "premium", "moderator", "admin"].map((role) => (
                <div key={role} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{role}</p>
                    <p className="text-xs text-muted-foreground">{role === "free" ? "Lifetime" : "Rolling 24h"}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={quotaValues[role]}
                    onChange={(event) => setQuotaValues((current) => ({ ...current, [role]: event.target.value }))}
                    className="w-28 border-white/10 bg-black/20"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      saveBatch(
                        [{ key: `quota_limit_${role}`, value: quotaValues[role], valueType: "number", label: `${role} quota`, group: "quota" }],
                        `quota_${role}`,
                        `${role} quota saved`,
                      )
                    }
                    disabled={savingKey === `quota_${role}`}
                  >
                    Save
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="space-y-4">
          <Card className={oracleEnabled ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={oracleEnabled ? "rounded-2xl bg-emerald-500/15 p-3" : "rounded-2xl bg-red-500/15 p-3"}>
                    {oracleEnabled ? <CheckCircle className="h-6 w-6 text-emerald-400" /> : <AlertTriangle className="h-6 w-6 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{oracleEnabled ? "Oracle is LIVE" : "Oracle is OFFLINE"}</p>
                    <p className="text-sm text-muted-foreground">
                      Users either reach Oracle normally or see the fallback message immediately.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={oracleEnabled}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setShowKillSwitchDialog(true);
                      return;
                    }
                    setOracleEnabled(true);
                    saveBatch(
                      [{ key: "kill_switch", value: "false", valueType: "boolean", label: "Oracle Kill Switch", group: "operations" }],
                      "kill_switch",
                      "Oracle is live",
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Streaming V2 rollout</CardTitle>
              <CardDescription>
                Stable user-ID cohorts control progressive publication. Turning V2 off is the one-setting rollback to buffered publication; safety, consent, quota, and durable lifecycle remain server-enforced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/15 p-4">
                <div><Label htmlFor="streaming-v2-enabled">V2 progressive publication</Label><p className="mt-1 text-xs text-muted-foreground">Disabled cohorts still finish through the durable buffered path.</p></div>
                <Switch id="streaming-v2-enabled" checked={streamingV2Enabled} onCheckedChange={setStreamingV2Enabled} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="streaming-v2-rollout">Live rollout percent</Label><Input id="streaming-v2-rollout" type="number" min={0} max={100} value={streamingV2RolloutPercent} onChange={(event) => setStreamingV2RolloutPercent(Math.min(100, Math.max(0, Number(event.target.value))))} /><p className="text-xs text-muted-foreground">Users below this deterministic bucket receive progressive V2 publication.</p></div>
                <div className="space-y-2"><Label htmlFor="streaming-v2-shadow">Shadow percent</Label><Input id="streaming-v2-shadow" type="number" min={0} max={100} value={streamingV2ShadowPercent} onChange={(event) => setStreamingV2ShadowPercent(Math.min(100, Math.max(0, Number(event.target.value))))} /><p className="text-xs text-muted-foreground">The next cohort runs V2 parsing and validation but publishes only after finalization.</p></div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveBatch([
                    { key: "oracle_streaming_v2_enabled", value: String(streamingV2Enabled), valueType: "boolean", label: "Oracle Streaming V2 Enabled", group: "operations", description: "One-setting progressive-publication rollback control" },
                    { key: "oracle_streaming_v2_rollout_percent", value: String(Math.floor(streamingV2RolloutPercent)), valueType: "number", label: "Oracle Streaming V2 Rollout Percent", group: "operations", description: "Deterministic percentage receiving progressive V2 publication" },
                    { key: "oracle_streaming_v2_shadow_percent", value: String(Math.floor(streamingV2ShadowPercent)), valueType: "number", label: "Oracle Streaming V2 Shadow Percent", group: "operations", description: "Deterministic percentage running V2 validation with buffered publication" },
                  ], "streaming_v2_rollout", "Streaming V2 rollout saved")}
                  disabled={savingKey === "streaming_v2_rollout" || streamingV2RolloutPercent + streamingV2ShadowPercent > 100}
                >
                  <Save className="mr-2 h-4 w-4" />Save rollout
                </Button>
              </div>
              {streamingV2RolloutPercent + streamingV2ShadowPercent > 100 && <p className="text-xs text-amber-400">Live and shadow cohorts cannot exceed 100% combined.</p>}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Crisis Response</CardTitle>
              <CardDescription>
                Fast-path response used before the model is called. Crisis detection and safety rules remain hardcoded server-side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={crisisResponse}
                onChange={(event) => setCrisisResponse(event.target.value)}
                className="min-h-[120px] border-white/10 bg-black/20"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    saveBatch(
                      [{ key: "crisis_response_text", value: crisisResponse, valueType: "string", label: "Crisis Response", group: "safety" }],
                      "crisis_response",
                      "Crisis response saved",
                    )
                  }
                  disabled={savingKey === "crisis_response" || !crisisResponse.trim()}
                >
                  Save Crisis Response
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Fallback Response</CardTitle>
              <CardDescription>Last-resort copy when every model fails or Oracle is offline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={fallbackResponse}
                onChange={(event) => setFallbackResponse(event.target.value)}
                className="min-h-[100px] border-white/10 bg-black/20"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    saveBatch(
                      [{ key: "fallback_response_text", value: fallbackResponse, valueType: "string", label: "Fallback Response", group: "safety" }],
                      "fallback_response",
                      "Fallback response saved",
                    )
                  }
                  disabled={savingKey === "fallback_response" || !fallbackResponse.trim()}
                >
                  Save Fallback Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showKillSwitchDialog} onOpenChange={setShowKillSwitchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Oracle offline</DialogTitle>
            <DialogDescription>
              Type CONFIRM to enable the kill switch immediately.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmKillSwitch}
            onChange={(event) => setConfirmKillSwitch(event.target.value)}
            placeholder="CONFIRM"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKillSwitchDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={confirmKillSwitch !== "CONFIRM"}
              onClick={async () => {
                setShowKillSwitchDialog(false);
                setConfirmKillSwitch("");
                setOracleEnabled(false);
                await saveBatch(
                  [{ key: "kill_switch", value: "true", valueType: "boolean", label: "Oracle Kill Switch", group: "operations" }],
                  "kill_switch",
                  "Oracle is offline",
                );
              }}
            >
              Take Offline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
