"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export function AISettingsPanel() {
  const settings = useQuery(api.oracle.settings.listAllSettings);
  const upsertSetting = useMutation(api.oracle.settings.upsertSetting);

  const [thinkingDefaultForGeneration, setThinkingDefaultForGeneration] = React.useState("disabled");
  const [thinkingDefaultForOracle, setThinkingDefaultForOracle] = React.useState("auto");
  const [llmTimeoutSeconds, setLlmTimeoutSeconds] = React.useState("120");
  const [maxTokensGeneration, setMaxTokensGeneration] = React.useState("4096");
  const [maxTokensOracle, setMaxTokensOracle] = React.useState("2048");
  const [saving, setSaving] = React.useState(false);

  // ── Quota V2 state ──
  const TIERS = [
    { key: "free", label: "Free", burst: "0.05", weekly: "0.20" },
    { key: "popular", label: "Popular", burst: "0.50", weekly: "2.00" },
    { key: "premium", label: "Premium", burst: "2.00", weekly: "8.00" },
    { key: "moderator", label: "Moderator", burst: "100", weekly: "500" },
    { key: "admin", label: "Admin", burst: "100", weekly: "500" },
  ];
  const [tierBudgets, setTierBudgets] = React.useState(TIERS);
  const [burstWindowHours, setBurstWindowHours] = React.useState("5");
  const [weeklyWindowDays, setWeeklyWindowDays] = React.useState("7");
  const [modelPricingJson, setModelPricingJson] = React.useState("{}");

  React.useEffect(() => {
    if (!settings) return;
    const get = (key: string) =>
      settings.find((s: { key: string; value: string }) => s.key === key)?.value;
    setThinkingDefaultForGeneration(get("ai_thinking_generation") ?? "disabled");
    setThinkingDefaultForOracle(get("ai_thinking_oracle") ?? "auto");
    setLlmTimeoutSeconds(get("ai_llm_timeout_seconds") ?? "120");
    setMaxTokensGeneration(get("ai_max_tokens_generation") ?? "4096");
    setMaxTokensOracle(get("ai_max_tokens_oracle") ?? "2048");

    // Load quota V2 budgets from oracle_settings
    const defaultBudgets: Record<string, { burst: string; weekly: string }> = {
      free: { burst: "0.05", weekly: "0.20" },
      popular: { burst: "0.50", weekly: "2.00" },
      premium: { burst: "2.00", weekly: "8.00" },
      moderator: { burst: "100", weekly: "500" },
      admin: { burst: "100", weekly: "500" },
    };
    setTierBudgets(
      ["free", "popular", "premium", "moderator", "admin"].map((key) => {
        const burstRaw = get(`quota_burst_budget_${key}`);
        const weeklyRaw = get(`quota_weekly_budget_${key}`);
        const defaults = defaultBudgets[key];
        // Convert from microdollars to USD for display
        const burstUsd = burstRaw ? (parseInt(burstRaw, 10) / 1_000_000).toFixed(2) : defaults.burst;
        const weeklyUsd = weeklyRaw ? (parseInt(weeklyRaw, 10) / 1_000_000).toFixed(2) : defaults.weekly;
        return { key, label: key.charAt(0).toUpperCase() + key.slice(1), burst: burstUsd, weekly: weeklyUsd };
      })
    );

    // Load window sizes
    const burstMs = get("quota_burst_window_ms");
    const weeklyMs = get("quota_weekly_window_ms");
    setBurstWindowHours(burstMs ? String(Math.round(parseInt(burstMs, 10) / 3_600_000)) : "5");
    setWeeklyWindowDays(weeklyMs ? String(Math.round(parseInt(weeklyMs, 10) / 86_400_000)) : "7");

    // Load model pricing JSON
    const pricingJson = get("model_pricing") ?? "{}";
    setModelPricingJson(typeof pricingJson === "string" ? pricingJson : JSON.stringify(pricingJson, null, 2));
  }, [settings]);

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const get = (key: string) =>
    settings.find((s: { key: string; value: string }) => s.key === key)?.value;

  async function saveBatch(items: Array<{ key: string; value: string; label: string; group: string; description: string }>) {
    setSaving(true);
    try {
      await Promise.all(
        items.map(item =>
          upsertSetting({
            key: item.key,
            value: item.value,
            valueType: "string" as const,
            label: item.label,
            group: item.group,
            description: item.description,
          })
        )
      );
      toast.success("AI settings saved");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuotaBudgets() {
    setSaving(true);
    try {
      const items: Array<{ key: string; value: string; label: string; group: string; description: string }> = [];

      // Per-tier budgets (convert USD → microdollars)
      for (const tier of tierBudgets) {
        const burstMicro = Math.round(parseFloat(tier.burst) * 1_000_000);
        const weeklyMicro = Math.round(parseFloat(tier.weekly) * 1_000_000);
        items.push({
          key: `quota_burst_budget_${tier.key}`,
          value: String(burstMicro),
          label: `Burst budget — ${tier.key}`,
          group: "quota",
          description: `Max spend in burst window for ${tier.key} tier (microdollars).`,
        });
        items.push({
          key: `quota_weekly_budget_${tier.key}`,
          value: String(weeklyMicro),
          label: `Weekly budget — ${tier.key}`,
          group: "quota",
          description: `Max spend in weekly window for ${tier.key} tier (microdollars).`,
        });
      }

      // Window sizes (convert to ms)
      const burstMs = String(parseInt(burstWindowHours, 10) * 3_600_000);
      const weeklyMs = String(parseInt(weeklyWindowDays, 10) * 86_400_000);
      items.push({
        key: "quota_burst_window_ms",
        value: burstMs,
        label: "Burst window (ms)",
        group: "quota",
        description: `Duration of burst window: ${burstMs} ms = ${burstWindowHours}h.`,
      });
      items.push({
        key: "quota_weekly_window_ms",
        value: weeklyMs,
        label: "Weekly window (ms)",
        group: "quota",
        description: `Duration of weekly window: ${weeklyMs} ms = ${weeklyWindowDays}d.`,
      });

      // Model pricing JSON
      items.push({
        key: "model_pricing",
        value: modelPricingJson,
        label: "Model pricing table",
        group: "quota",
        description: "USD price per 1M tokens per model. JSON format.",
      });

      await Promise.all(
        items.map(item =>
          upsertSetting({
            key: item.key,
            value: item.value,
            valueType: item.key === "model_pricing" ? ("json" as const) : ("number" as const),
            label: item.label,
            group: item.group,
            description: item.description,
          })
        )
      );
      toast.success("Quota budgets saved");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save quota budgets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Thinking Mode Defaults */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🧠 Thinking / Reasoning Mode Defaults
          </CardTitle>
          <CardDescription>
            Control how thinking models behave by default for each feature.
            Individual calls can override these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Generation default */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <Label className="text-sm font-medium">Horoscope Generation</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Default thinking mode when generating horoscopes.
                  <strong className="text-amber-400"> Disabled</strong> is recommended — structured JSON output
                  doesn&apos;t benefit from reasoning, and thinking models often exhaust the token budget
                  on chain-of-thought, leaving <code className="bg-muted px-0.5 rounded text-[10px]">content: null</code>.
                </p>
              </div>
              <ThinkingModeSelector
                value={thinkingDefaultForGeneration}
                onChange={setThinkingDefaultForGeneration}
              />
            </div>

            {/* Oracle default */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <Label className="text-sm font-medium">Oracle Chat</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Default thinking mode for Oracle responses.
                  <strong className="text-emerald-400"> Auto</strong> lets the model decide.
                  Oracle streaming handles thinking content gracefully — it works fine.
                </p>
              </div>
              <ThinkingModeSelector
                value={thinkingDefaultForOracle}
                onChange={setThinkingDefaultForOracle}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong>Ollama:</strong> Sends <code className="bg-muted px-0.5 rounded">think: false</code> or <code className="bg-muted px-0.5 rounded">think: "low"/"medium"/"high"</code> in the API request.</p>
              <p><strong>OpenRouter:</strong> Sends <code className="bg-muted px-0.5 rounded">reasoning_effort: "none"/"low"/"medium"/"high"</code> for models that support it.</p>
              <p><strong>OpenAI Compatible:</strong> Sends <strong>both</strong> parameters (<code className="bg-muted px-0.5 rounded">think</code> + <code className="bg-muted px-0.5 rounded">reasoning_effort</code>) since this type covers many different backends. Unknown params are silently ignored by compliant servers — only the one the provider understands takes effect. For Together/Groq/Fireworks-style endpoints, thinking control may not be available at all.</p>
              <p><strong>Auto:</strong> Doesn&apos;t send any thinking-related parameters — the model uses its default behavior.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveBatch([
                  { key: "ai_thinking_generation", value: thinkingDefaultForGeneration, label: "Thinking Mode (Generation)", group: "ai_settings", description: "Default thinking mode for horoscope generation" },
                  { key: "ai_thinking_oracle", value: thinkingDefaultForOracle, label: "Thinking Mode (Oracle)", group: "ai_settings", description: "Default thinking mode for Oracle chat" },
                ])
              }
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Thinking Defaults"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token & Timeout Settings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Token &amp; Timeout Settings</CardTitle>
          <CardDescription>
            Global LLM inference parameters. These apply across all features unless overridden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">LLM Timeout (seconds)</Label>
              <p className="text-xs text-muted-foreground">
                Maximum time to wait for an LLM response before aborting.
              </p>
              <Input
                type="number"
                min={10}
                max={600}
                value={llmTimeoutSeconds}
                onChange={(e) => setLlmTimeoutSeconds(e.target.value)}
                className="border-white/10 bg-black/20 w-32"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Max Tokens — Generation</Label>
              <p className="text-xs text-muted-foreground">
                Sent as <code className="text-xs bg-muted px-1 rounded">max_tokens</code> for horoscope generation.
              </p>
              <Input
                type="number"
                min={256}
                max={32768}
                step={256}
                value={maxTokensGeneration}
                onChange={(e) => setMaxTokensGeneration(e.target.value)}
                className="border-white/10 bg-black/20 w-32"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveBatch([
                  { key: "ai_llm_timeout_seconds", value: llmTimeoutSeconds, label: "LLM Timeout", group: "ai_settings", description: "Maximum seconds to wait for an LLM response" },
                  { key: "ai_max_tokens_generation", value: maxTokensGeneration, label: "Max Tokens (Generation)", group: "ai_settings", description: "Max tokens for horoscope generation LLM calls" },
                  { key: "ai_max_tokens_oracle", value: maxTokensOracle, label: "Max Tokens (Oracle)", group: "ai_settings", description: "Max tokens for Oracle LLM calls" },
                ])
              }
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Token Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quota Budgets (V2 Cost-Based) */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            💰 Oracle Quota Budgets (Cost-Based)
          </CardTitle>
          <CardDescription>
            Tier-based rate limits using real token cost in microdollars (1 USD = 1,000,000 µ$).
            Each Oracle call consumes budget proportional to input + output token pricing.
            Windows auto-reset when elapsed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Window sizes */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Burst Window (hours)</Label>
              <p className="text-xs text-muted-foreground">
                Short-term rate limit window. Default 5h.
              </p>
              <Input
                type="number"
                min={1}
                max={48}
                step={1}
                value={burstWindowHours}
                onChange={(e) => setBurstWindowHours(e.target.value)}
                className="border-white/10 bg-black/20 w-32"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Weekly Window (days)</Label>
              <p className="text-xs text-muted-foreground">
                Long-term rate limit window. Default 7d.
              </p>
              <Input
                type="number"
                min={1}
                max={30}
                step={1}
                value={weeklyWindowDays}
                onChange={(e) => setWeeklyWindowDays(e.target.value)}
                className="border-white/10 bg-black/20 w-32"
              />
            </div>
          </div>

          {/* Per-tier budgets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Per-Tier Budgets (USD)</h4>
            <p className="text-xs text-muted-foreground">
              Burst = max spend per burst window. Weekly = max spend per weekly window.
              Admin/Mod budgets are generous by default.
            </p>
            <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-muted-foreground">
                    <th className="p-3 text-left">Tier</th>
                    <th className="p-3 text-right">Burst $</th>
                    <th className="p-3 text-right">Weekly $</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((tier) => (
                    <tr key={tier.key} className="border-b border-white/5">
                      <td className="p-3 font-medium capitalize">{tier.label}</td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={tier.burst}
                          onChange={(e) =>
                            setTierBudgets((prev) =>
                              prev.map((t) =>
                                t.key === tier.key ? { ...t, burst: e.target.value } : t
                              )
                            )
                          }
                          className="border-white/10 bg-black/20 w-24 text-right inline-block"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={tier.weekly}
                          onChange={(e) =>
                            setTierBudgets((prev) =>
                              prev.map((t) =>
                                t.key === tier.key ? { ...t, weekly: e.target.value } : t
                              )
                            )
                          }
                          className="border-white/10 bg-black/20 w-24 text-right inline-block"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model pricing */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Model Pricing (USD per 1M tokens)</h4>
            <p className="text-xs text-muted-foreground">
              Token costs per model. Input = cost per 1M prompt tokens. Output = cost per 1M completion tokens.
              These determine how much each Oracle call consumes from the budgets above.
              Edit as JSON in the text area below.
            </p>
            <textarea
              className="w-full h-48 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs text-muted-foreground resize-y"
              value={modelPricingJson}
              onChange={(e) => setModelPricingJson(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p>Budgets are stored in <code className="bg-muted px-0.5 rounded">oracle_settings</code> keyed as
                <code className="bg-muted px-0.5 rounded">quota_burst_budget_{"{tier}"}</code> and
                <code className="bg-muted px-0.5 rounded">quota_weekly_budget_{"{tier}"}</code> in microdollars.
                Changes take effect immediately — in-flight sessions re-check quota before each call.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveQuotaBudgets}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Quota Budgets"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">How Thinking Mode Control Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">The Problem</h4>
            <p>
              Reasoning/thinking models (DeepSeek R1, Qwen3, Gemma 4, etc.) produce a chain-of-thought
              before the actual response. For simple tasks like JSON generation, this reasoning
              phase can consume the entire token budget, leaving <code className="bg-muted px-0.5 rounded text-xs">content: null</code>
              in the API response — you only get the reasoning, never the answer.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">The Solution</h4>
            <p>
              Modern AI APIs support explicit thinking mode controls. When you set thinking to
              &quot;Off&quot; or &quot;Low&quot; for generation tasks, the model skips or minimizes
              chain-of-thought, going directly to the answer. This works because the model
              doesn&apos;t need to &quot;think out loud&quot; for structured output — it just
              needs to follow the format instructions.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Provider-Specific Behavior</h4>
            <div className="space-y-1">
              <p><strong>Ollama:</strong> Supports <code className="bg-muted px-0.5 rounded text-xs">think</code> parameter
                (boolean or &quot;low&quot;/&quot;medium&quot;/&quot;high&quot;). Set <code className="bg-muted px-0.5 rounded text-xs">think: false</code> to
                completely disable. Set <code className="bg-muted px-0.5 rounded text-xs">think: "low"</code> for minimal reasoning.</p>
              <p><strong>OpenRouter:</strong> Supports <code className="bg-muted px-0.5 rounded text-xs">reasoning_effort</code> in
                provider-specific parameters for models that support it. Also some models accept
                <code className="bg-muted px-0.5 rounded text-xs"> thinking</code> in the body.</p>
              <p><strong>OpenAI Compatible:</strong> Varies by provider. Some support Ollama-style
                <code className="bg-muted px-0.5 rounded text-xs"> think</code> parameter, others use OpenAI-style controls.</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Why Oracle Works But Generation Doesn&apos;t</h4>
            <p>
              Oracle uses streaming and handles the reasoning→content transition gracefully.
              Even if the model spends tokens on thinking, the streaming parser picks up the
              content tokens when they arrive. Generation, however, uses a single non-streaming
              call where <code className="bg-muted px-0.5 rounded text-xs">content</code> is
              all-or-nothing — if the model runs out of tokens during thinking,
              <code className="bg-muted px-0.5 rounded text-xs"> content</code> is null.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ThinkingModeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const modes = [
    { id: "auto", label: "Auto", desc: "Model default", color: "text-muted-foreground" },
    { id: "disabled", label: "Off", desc: "No reasoning", color: "text-red-400" },
    { id: "low", label: "Low", desc: "Minimal", color: "text-amber-400" },
    { id: "medium", label: "Medium", desc: "Balanced", color: "text-cyan-400" },
    { id: "high", label: "High", desc: "Deep", color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`px-2 py-3 rounded-lg border text-center transition-all ${
            value === mode.id
              ? "border-primary bg-primary/15"
              : "border-white/10 bg-black/20 hover:border-white/20"
          }`}
        >
          <p className={`text-xs font-semibold ${value === mode.id ? "text-primary" : mode.color}`}>
            {mode.label}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
        </button>
      ))}
    </div>
  );
}