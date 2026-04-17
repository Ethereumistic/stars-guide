"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Save, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import {
  DEFAULT_TOKEN_LIMITS,
  buildTokenLimitRecord,
  TOKEN_LIMIT_DEFINITIONS,
} from "../../../../../lib/oracle/soul";
import {
  parseProvidersConfig,
  parseModelChain,
  ProviderConfig,
  ModelChainEntry,
} from "../../../../../lib/oracle/providers";
import { TokenLimitsEditor } from "@/components/oracle-admin/token-limits-editor";
import { ProviderManager } from "@/components/oracle-admin/provider-manager";
import { ModelChainEditor } from "@/components/oracle-admin/model-chain-editor";
import { Badge } from "@/components/ui/badge";
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

export default function OracleSettingsPage() {
  const settings = useQuery(api.oracle.settings.listAllSettings);
  const upsertSetting = useMutation(api.oracle.settings.upsertSetting);
  const upsertProviders = useMutation(api.oracle.upsertProviders.upsertProvidersConfig);

  const [providers, setProviders] = React.useState<ProviderConfig[]>([]);
  const [modelChain, setModelChain] = React.useState<ModelChainEntry[]>([]);

  const [temperature, setTemperature] = React.useState(0.82);
  const [topP, setTopP] = React.useState(0.92);
  const [streamEnabled, setStreamEnabled] = React.useState(true);
  const [fallbackResponse, setFallbackResponse] = React.useState("");
  const [crisisResponse, setCrisisResponse] = React.useState("");
  const [oracleEnabled, setOracleEnabled] = React.useState(true);
  const [confirmKillSwitch, setConfirmKillSwitch] = React.useState("");
  const [showKillSwitchDialog, setShowKillSwitchDialog] = React.useState(false);
  const [quotaValues, setQuotaValues] = React.useState<Record<string, string>>({
    free: "5",
    popular: "5",
    premium: "10",
    moderator: "10",
    admin: "999",
  });
  const [tokenLimits, setTokenLimits] = React.useState(DEFAULT_TOKEN_LIMITS);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!settings) {
      return;
    }

    const get = (key: string) => settings.find((setting) => setting.key === key)?.value;
    
    setProviders(parseProvidersConfig(get("providers_config")));
    setModelChain(parseModelChain(get("model_chain")));

    setTemperature(Number.parseFloat(get("temperature") ?? "0.82"));
    setTopP(Number.parseFloat(get("top_p") ?? "0.92"));
    setStreamEnabled(get("stream_enabled") !== "false");
    setFallbackResponse(get("fallback_response_text") ?? "");
    setCrisisResponse(get("crisis_response_text") ?? "");
    setOracleEnabled(get("kill_switch") !== "true");
    setQuotaValues({
      free: get("quota_limit_free") ?? "5",
      popular: get("quota_limit_popular") ?? "5",
      premium: get("quota_limit_premium") ?? "10",
      moderator: get("quota_limit_moderator") ?? "10",
      admin: get("quota_limit_admin") ?? "999",
    });
    setTokenLimits(buildTokenLimitRecord(Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))));
  }, [settings]);

  async function saveBatch(items: Array<{ key: string; value: string; valueType: "string" | "number" | "boolean" | "json"; label: string; group: string; description?: string }>, savingState: string, successMessage: string) {
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

  async function saveProvidersAndChain(providersToSave: ProviderConfig[], chainToSave: ModelChainEntry[], savingState: string, successMessage: string) {
    setSavingKey(savingState);
    try {
      await upsertProviders({
        providersConfig: JSON.stringify(providersToSave),
        modelChain: JSON.stringify(chainToSave),
      });
      toast.success(successMessage);
      
      // Update local state proactively
      setProviders(providersToSave);
      setModelChain(chainToSave);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save provider config");
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
          <h1 className="text-2xl font-serif font-bold">Oracle Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Runtime models, token tiers, quotas, and operational controls.
          </p>
        </div>
        <Link href="/admin/oracle/soul" className="text-sm text-galactic hover:underline">
          Open Soul Editor
        </Link>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="model">Model</TabsTrigger>
          <TabsTrigger value="tokens">Token Limits</TabsTrigger>
          <TabsTrigger value="quota">Quotas</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Inference Providers</CardTitle>
                <CardDescription>Configure external API endpoints and keys.</CardDescription>
              </div>
              <Button
                onClick={() => saveProvidersAndChain(providers, modelChain, "providers", "Providers saved successfully")}
                disabled={savingKey === "providers"}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingKey === "providers" ? "Saving..." : "Save Providers"}
              </Button>
            </CardHeader>
            <CardContent>
              <ProviderManager providers={providers} onChange={setProviders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Model Settings</CardTitle>
                <CardDescription>
                  Configure inference models and tuning parameters.
                </CardDescription>
              </div>
              <Button
                onClick={async () => {
                  setSavingKey("model_chain");
                  try {
                    await upsertProviders({
                      providersConfig: JSON.stringify(providers),
                      modelChain: JSON.stringify(modelChain),
                    });
                    
                    await Promise.all([
                      upsertSetting({ key: "temperature", value: String(temperature), valueType: "number", label: "Temperature", group: "model", description: "" }),
                      upsertSetting({ key: "top_p", value: String(topP), valueType: "number", label: "Top-p", group: "model", description: "" }),
                      upsertSetting({ key: "stream_enabled", value: String(streamEnabled), valueType: "boolean", label: "Streaming", group: "model", description: "" }),
                    ]);
                    
                    toast.success("Model settings saved");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Error saving models");
                  } finally {
                    setSavingKey(null);
                  }
                }}
                disabled={savingKey === "model_chain"}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingKey === "model_chain" ? "Saving..." : "Save Model Settings"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    Oracle Inference
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Models tried in order for Oracle responses. Fallback tiers ensure resilience.
                    Session titles are now generated by the Oracle model itself — no separate chain needed.
                  </p>
                  <ModelChainEditor chain={modelChain} providers={providers} onChange={setModelChain} />

                  <div className="space-y-3">
                    <Label>Temperature: {temperature.toFixed(2)}</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(event) => setTemperature(Number.parseFloat(event.target.value))}
                      className="w-full accent-galactic"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Top-p: {topP.toFixed(2)}</Label>
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.01"
                      value={topP}
                      onChange={(event) => setTopP(Number.parseFloat(event.target.value))}
                      className="w-full accent-galactic"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div>
                      <Label>Streaming</Label>
                      <p className="mt-1 text-xs text-muted-foreground">Enable token-by-token Oracle streaming.</p>
                    </div>
                    <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
                  </div>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <TokenLimitsEditor
            initialValues={tokenLimits}
            isSaving={savingKey === "token_limits"}
            onSave={async (values) => {
              await saveBatch(
                Object.entries(values).map(([key, value]) => ({
                  key,
                  value: String(value),
                  valueType: "number" as const,
                  label: TOKEN_LIMIT_DEFINITIONS[key as keyof typeof TOKEN_LIMIT_DEFINITIONS].label,
                  description: TOKEN_LIMIT_DEFINITIONS[key as keyof typeof TOKEN_LIMIT_DEFINITIONS].description,
                  group: "token_limits",
                })),
                "token_limits",
                "Token limits saved",
              );
              setTokenLimits(values);
            }}
          />
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
                    <p className="text-sm text-muted-foreground">Users either reach Oracle normally or see the fallback message immediately.</p>
                  </div>
                </div>
                <Switch checked={oracleEnabled} onCheckedChange={(checked) => {
                  if (!checked) {
                    setShowKillSwitchDialog(true);
                    return;
                  }
                  setOracleEnabled(true);
                  saveBatch([{ key: "kill_switch", value: "false", valueType: "boolean", label: "Oracle Kill Switch", group: "operations" }], "kill_switch", "Oracle is live");
                }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Crisis Response</CardTitle>
              <CardDescription>Fast-path response used before the model is called.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={crisisResponse} onChange={(event) => setCrisisResponse(event.target.value)} className="min-h-[120px] border-white/10 bg-black/20" />
              <div className="flex justify-end">
                <Button onClick={() => saveBatch([{ key: "crisis_response_text", value: crisisResponse, valueType: "string", label: "Crisis Response", group: "safety" }], "crisis_response", "Crisis response saved")} disabled={savingKey === "crisis_response" || !crisisResponse.trim()}>
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
              <Textarea value={fallbackResponse} onChange={(event) => setFallbackResponse(event.target.value)} className="min-h-[100px] border-white/10 bg-black/20" />
              <div className="flex justify-end">
                <Button onClick={() => saveBatch([{ key: "fallback_response_text", value: fallbackResponse, valueType: "string", label: "Fallback Response", group: "safety" }], "fallback_response", "Fallback response saved")} disabled={savingKey === "fallback_response" || !fallbackResponse.trim()}>
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
          <Input value={confirmKillSwitch} onChange={(event) => setConfirmKillSwitch(event.target.value)} placeholder="CONFIRM" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKillSwitchDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={confirmKillSwitch !== "CONFIRM"}
              onClick={async () => {
                setShowKillSwitchDialog(false);
                setConfirmKillSwitch("");
                setOracleEnabled(false);
                await saveBatch([{ key: "kill_switch", value: "true", valueType: "boolean", label: "Oracle Kill Switch", group: "operations" }], "kill_switch", "Oracle is offline");
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
