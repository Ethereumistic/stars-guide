"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Brain, Check, Loader2, Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModelChainBuilder } from "@/components/ai-admin/model-chain-builder";
import { ModelOptionLogo } from "@/components/ai/model-option-logo";
import type { ProviderConfig } from "@/lib/oracle/providers";
import {
  effectiveReasoningEfforts,
  REASONING_EFFORTS,
  REASONING_EFFORT_LABELS,
  USER_TIERS,
  type ModelChainEntry,
  type ReasoningEffort,
  type UserTier,
} from "@/lib/ai/inference-preferences";

const listRef = makeFunctionReference<"query">("aiGateway/userModelOptions:listUserModelOptions");
const saveRef = makeFunctionReference<"mutation">("aiGateway/userModelOptions:saveUserModelOptions");
const enableRef = makeFunctionReference<"mutation">("aiGateway/userModelOptions:setUserModelSelectionEnabled");
const seedRef = makeFunctionReference<"mutation">("aiGateway/userModelOptions:seedFromOracleProfile");

type EditableOption = {
  optionKey: string;
  label: string;
  description?: string;
  badge?: string;
  logoUrl?: string;
  enabled: boolean;
  showWhenLocked: boolean;
  allowedTiers: UserTier[];
  defaultForTiers: UserTier[];
  chain: ModelChainEntry[];
  restrictReasoningEfforts: boolean;
  allowedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  usageHint?: string;
  sortOrder: number;
};

function cleanOption(option: any, index: number): EditableOption {
  return {
    optionKey: option.optionKey,
    label: option.label,
    description: option.description,
    badge: option.badge,
    logoUrl: option.logoUrl,
    enabled: option.enabled,
    showWhenLocked: option.showWhenLocked,
    allowedTiers: option.allowedTiers,
    defaultForTiers: option.defaultForTiers,
    chain: option.chain,
    restrictReasoningEfforts: option.restrictReasoningEfforts ?? false,
    allowedReasoningEfforts: option.allowedReasoningEfforts,
    defaultReasoningEffort: option.defaultReasoningEffort,
    usageHint: option.usageHint,
    sortOrder: index,
  };
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return error instanceof Error ? error.message : "AI model options could not be saved.";
}

export function UserModelOptionsPanel({ providers }: { providers: ProviderConfig[] }) {
  const result = useQuery(listRef, { featureKey: "oracle_chat" }) as
    | { allowUserModelSelection: boolean; options: any[] }
    | undefined;
  const saveOptions = useMutation(saveRef);
  const setEnabled = useMutation(enableRef);
  const seedOptions = useMutation(seedRef);
  const [draft, setDraft] = React.useState<EditableOption[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  React.useEffect(() => {
    if (!result) return;
    const next = result.options.map(cleanOption);
    setDraft(next);
    setSelectedKey((current) => current && next.some((option) => option.optionKey === current)
      ? current
      : next[0]?.optionKey ?? null);
  }, [result]);

  const persisted = React.useMemo(
    () => JSON.stringify(result?.options.map(cleanOption) ?? []),
    [result],
  );
  const dirty = JSON.stringify(draft) !== persisted;
  const selectedIndex = draft.findIndex((option) => option.optionKey === selectedKey);
  const selected = selectedIndex >= 0 ? draft[selectedIndex] : null;
  const selectableEfforts = selected ? effectiveReasoningEfforts(selected) : [];

  const patchSelected = (patch: Partial<EditableOption>) => {
    if (selectedIndex < 0) return;
    const oldKey = draft[selectedIndex].optionKey;
    const next = [...draft];
    next[selectedIndex] = { ...next[selectedIndex], ...patch };
    setDraft(next);
    if (patch.optionKey && patch.optionKey !== oldKey) setSelectedKey(patch.optionKey);
  };

  const toggleTier = (tier: UserTier, checked: boolean) => {
    if (!selected) return;
    patchSelected({
      allowedTiers: checked
        ? [...new Set([...selected.allowedTiers, tier])]
        : selected.allowedTiers.filter((value) => value !== tier),
      defaultForTiers: checked
        ? selected.defaultForTiers
        : selected.defaultForTiers.filter((value) => value !== tier),
    });
  };

  const toggleDefault = (tier: UserTier, checked: boolean) => {
    if (!selected) return;
    setDraft((current) => current.map((option, index) => ({
      ...option,
      defaultForTiers: index === selectedIndex
        ? checked
          ? [...new Set([...option.defaultForTiers, tier])]
          : option.defaultForTiers.filter((value) => value !== tier)
        : checked
          ? option.defaultForTiers.filter((value) => value !== tier)
          : option.defaultForTiers,
    })));
  };

  const toggleEffort = (effort: ReasoningEffort, checked: boolean) => {
    if (!selected) return;
    const allowed = checked
      ? [...new Set([...selected.allowedReasoningEfforts, effort])]
      : selected.allowedReasoningEfforts.filter((value) => value !== effort);
    patchSelected({
      allowedReasoningEfforts: allowed,
      defaultReasoningEffort: allowed.includes(selected.defaultReasoningEffort)
        ? selected.defaultReasoningEffort
        : allowed[0] ?? "auto",
    });
  };

  const addOption = () => {
    let suffix = draft.length + 1;
    while (draft.some((option) => option.optionKey === `model-${suffix}`)) suffix++;
    const option: EditableOption = {
      optionKey: `model-${suffix}`,
      label: "New model",
      description: "A new Oracle model choice.",
      enabled: true,
      showWhenLocked: true,
      allowedTiers: ["popular", "premium"],
      defaultForTiers: [],
      chain: [{ providerId: providers[0]?.id ?? "", model: "" }],
      restrictReasoningEfforts: false,
      allowedReasoningEfforts: ["auto", "low", "medium", "high"],
      defaultReasoningEffort: "auto",
      sortOrder: draft.length,
    };
    setDraft([...draft, option]);
    setSelectedKey(option.optionKey);
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = draft.filter((option) => option.optionKey !== selected.optionKey);
    setDraft(next);
    setSelectedKey(next[0]?.optionKey ?? null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOptions({
        featureKey: "oracle_chat",
        options: draft.map((option, index) => ({ ...option, sortOrder: index })),
      });
      toast.success("User model options saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const seeded = await seedOptions({}) as { seeded: boolean };
      toast.success(seeded.seeded ? "Automatic model option created" : "User model options already exist");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSeeding(false);
    }
  };

  const handleEnabled = async (enabled: boolean) => {
    setToggling(true);
    try {
      await setEnabled({ featureKey: "oracle_chat", enabled });
      toast.success(enabled ? "User model selection enabled" : "Oracle returned to its feature-profile route");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setToggling(false);
    }
  };

  if (!result) {
    return <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-galactic/20 bg-galactic/10 p-2.5"><Sparkles className="size-4 text-galactic" /></div>
            <div>
              <p className="text-sm font-medium">User-selectable Oracle models</p>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">When off, Oracle uses the existing `oracle_chat` feature profile. Save exactly one default per plan before enabling.</p>
              {dirty && <p className="mt-1 text-xs text-amber-400">Save draft changes before changing the rollout switch.</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="user-model-selection" className="text-xs">{result.allowUserModelSelection ? "Live" : "Fallback profile"}</Label>
            <Switch
              id="user-model-selection"
              checked={result.allowUserModelSelection}
              disabled={toggling || dirty}
              onCheckedChange={handleEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Published choices</CardTitle>
            <CardDescription>Labels users see in the Oracle composer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.length === 0 ? (
              <Button variant="outline" onClick={handleSeed} disabled={seeding} className="w-full gap-2">
                {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Seed automatic route
              </Button>
            ) : (
              <div className="space-y-2">
                {draft.map((option) => (
                  <button
                    key={option.optionKey}
                    type="button"
                    onClick={() => setSelectedKey(option.optionKey)}
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedKey === option.optionKey ? "border-primary/50 bg-primary/10" : "border-white/10 bg-black/10 hover:border-white/20"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ModelOptionLogo src={option.logoUrl} className="size-8" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{option.label}</span>
                      <Badge variant={option.enabled ? "default" : "secondary"} className="text-[9px]">{option.enabled ? "On" : "Off"}</Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{option.optionKey}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {option.allowedTiers.map((tier) => <Badge key={tier} variant="outline" className="px-1.5 py-0 text-[9px] capitalize">{tier}</Badge>)}
                      {option.defaultForTiers.length > 0 && <Badge variant="outline" className="border-galactic/30 px-1.5 py-0 text-[9px] text-galactic">Default</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full gap-2"><Plus className="size-3.5" />Add model choice</Button>
          </CardContent>
        </Card>

        {selected ? (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div><CardTitle className="text-base">{selected.label}</CardTitle><CardDescription className="font-mono text-xs">{selected.optionKey}</CardDescription></div>
                <div className="flex items-center gap-2"><Label className="text-xs">Enabled</Label><Switch checked={selected.enabled} onCheckedChange={(enabled) => patchSelected({ enabled })} /></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Option key</Label><Input value={selected.optionKey} onChange={(event) => patchSelected({ optionKey: event.target.value.toLowerCase().replace(/\s+/g, "-") })} className="font-mono text-xs" /></div>
                <div className="space-y-2"><Label>Public label</Label><Input value={selected.label} onChange={(event) => patchSelected({ label: event.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={selected.description ?? ""} onChange={(event) => patchSelected({ description: event.target.value })} rows={2} /></div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="model-logo-url">Model logo URL</Label>
                  <div className="flex items-center gap-3">
                    <ModelOptionLogo src={selected.logoUrl} className="size-10" />
                    <Input
                      id="model-logo-url"
                      type="url"
                      value={selected.logoUrl ?? ""}
                      onChange={(event) => patchSelected({ logoUrl: event.target.value })}
                      placeholder="https://cdn.example.com/model-logo.svg"
                      className="font-mono text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Use a public HTTPS CDN image. The Oracle icon remains visible if the URL is empty or the image fails to load.</p>
                </div>
                <div className="space-y-2"><Label>Badge</Label><Input value={selected.badge ?? ""} onChange={(event) => patchSelected({ badge: event.target.value })} placeholder="Default, Premium…" /></div>
                <div className="space-y-2"><Label>Usage hint</Label><Input value={selected.usageHint ?? ""} onChange={(event) => patchSelected({ usageHint: event.target.value })} placeholder="Uses more allowance" /></div>
              </div>

              <div className="grid gap-5 rounded-xl border border-white/10 bg-black/10 p-4 md:grid-cols-2">
                <div>
                  <Label>Available plans</Label>
                  <div className="mt-3 space-y-2">
                    {USER_TIERS.map((tier) => (
                      <label key={tier} className="flex items-center gap-2 text-sm capitalize"><Checkbox checked={selected.allowedTiers.includes(tier)} onCheckedChange={(value) => toggleTier(tier, value === true)} />{tier}</label>
                    ))}
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={selected.showWhenLocked} onCheckedChange={(value) => patchSelected({ showWhenLocked: value === true })} />Show this option to locked plans</label>
                </div>
                <div>
                  <Label>Default for plan</Label>
                  <div className="mt-3 space-y-2">
                    {USER_TIERS.map((tier) => (
                      <label key={tier} className="flex items-center gap-2 text-sm capitalize"><Checkbox disabled={!selected.allowedTiers.includes(tier)} checked={selected.defaultForTiers.includes(tier)} onCheckedChange={(value) => toggleDefault(tier, value === true)} />{tier}</label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><Brain className="size-4 text-galactic" /><Label>Reasoning effort</Label></div>
                    <p className="mt-1 text-xs text-muted-foreground">Users can choose any effort unless this route needs a compatibility limit.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={selected.restrictReasoningEfforts} onCheckedChange={(checked) => patchSelected({ restrictReasoningEfforts: checked })} />
                    Restrict choices
                  </label>
                </div>
                {selected.restrictReasoningEfforts ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {REASONING_EFFORTS.map((effort) => (
                      <label key={effort} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.allowedReasoningEfforts.includes(effort)} onCheckedChange={(value) => toggleEffort(effort, value === true)} />{REASONING_EFFORT_LABELS[effort]}</label>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-galactic/15 bg-galactic/[0.06] px-3 py-2 text-xs text-white/60">All five effort levels are available in the Oracle composer.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="mr-1 self-center text-xs text-muted-foreground">Default</span>
                  {selectableEfforts.map((effort) => (
                    <Button key={effort} type="button" size="sm" variant={selected.defaultReasoningEffort === effort ? "default" : "outline"} onClick={() => patchSelected({ defaultReasoningEffort: effort })} className="h-7 gap-1.5 text-xs">
                      {selected.defaultReasoningEffort === effort && <Check className="size-3" />}{REASONING_EFFORT_LABELS[effort]}
                    </Button>
                  ))}
                </div>
              </div>

              <ModelChainBuilder value={selected.chain} providers={providers} onChange={(chain) => patchSelected({ chain })} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={removeSelected} className="text-destructive/75 hover:text-destructive">Remove choice</Button>
                <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save user models</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex min-h-80 items-center justify-center border-dashed border-white/10 bg-card/30"><p className="text-sm text-muted-foreground">Seed or add a model choice to begin.</p></Card>
        )}
      </div>
    </div>
  );
}
