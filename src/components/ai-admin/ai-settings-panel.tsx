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

  React.useEffect(() => {
    if (!settings) return;
    const get = (key: string) =>
      settings.find((s: { key: string; value: string }) => s.key === key)?.value;
    setThinkingDefaultForGeneration(get("ai_thinking_generation") ?? "disabled");
    setThinkingDefaultForOracle(get("ai_thinking_oracle") ?? "auto");
    setLlmTimeoutSeconds(get("ai_llm_timeout_seconds") ?? "120");
    setMaxTokensGeneration(get("ai_max_tokens_generation") ?? "4096");
    setMaxTokensOracle(get("ai_max_tokens_oracle") ?? "2048");
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
            group: "ai_settings",
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