"use client";

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  type ProviderConfig,
} from "@/lib/oracle/providers";
import {
  type AIModelEntry,
  getModelsForProvider,
  findModelMetaForProvider,
} from "@/lib/ai/registry";
import { AIModelPicker, useAIModelPicker } from "@/components/ai";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { toast } from "sonner";

interface AITestingPanelProps {
  providers: ProviderConfig[];
}

export function AITestingPanel({ providers }: AITestingPanelProps) {
  const testAction = useAction(api.admin.testLLMEndpointAction);
  const picker = useAIModelPicker({
    defaultProvider: providers[0]?.id ?? "openrouter",
    defaultModel: "google/gemini-2.5-flash",
  });
  const [testPrompt, setTestPrompt] = React.useState(
    "Generate a single horoscope for Aries on 2025-06-01. Output only valid JSON: { \"sign\": \"Aries\", \"date\": \"2025-06-01\", \"content\": \"...\" }"
  );
  const [thinkingMode, setThinkingMode] = React.useState<"auto" | "disabled" | "low" | "medium" | "high">("disabled");
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    content: string | null;
    reasoning: string | null;
    error: string | null;
    modelUsed: string;
    thinkingModeUsed: string;
    durationMs: number;
  } | null>(null);

  const handleTest = async () => {
    if (!testPrompt.trim()) {
      toast.error("Enter a test prompt.");
      return;
    }
    setIsRunning(true);
    setResult(null);
    try {
      const res = await testAction({
        providerId: picker.providerId,
        modelId: picker.modelId,
        prompt: testPrompt,
        thinkingMode,
      });
      setResult(res as any);
      if (res.success) {
        toast.success("Test completed successfully");
      } else {
        toast.error(res.error ?? "Test failed");
      }
    } catch (error: any) {
      setResult({
        success: false,
        content: null,
        reasoning: null,
        error: error.message ?? "Unknown error",
        modelUsed: `${picker.providerId}/${picker.modelId}`,
        thinkingModeUsed: thinkingMode,
        durationMs: 0,
      });
      toast.error(error.message ?? "Test failed");
    } finally {
      setIsRunning(false);
    }
  };

  // Detect if this is a thinking model
  const modelMeta = findModelMeta(picker.modelId);
  const isThinkingModel = modelMeta?.capabilities.includes("thinking") ?? false;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">LLM Endpoint Tester</CardTitle>
          <CardDescription>
            Test a provider + model combination with a custom prompt. See raw output, timing, and thinking behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AIModelPicker
            {...picker.props}
            showWarnings={true}
          />

          {/* Thinking Mode Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Thinking / Reasoning Mode</Label>
              {isThinkingModel && (
                <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 px-1.5 py-0">
                  <Brain className="h-3 w-3 mr-1" />THINKING MODEL
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Control whether the model uses chain-of-thought reasoning before answering.
              For structured tasks like horoscope generation, <strong>disabled</strong> or <strong>low</strong> often works best.
              Ollama sends <code className="bg-muted px-0.5 rounded">think: false/low/medium/high</code>.
              OpenRouter uses <code className="bg-muted px-0.5 rounded">reasoning_effort</code> passthrough.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {(["auto", "disabled", "low", "medium", "high"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setThinkingMode(mode)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    thinkingMode === mode
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {mode === "auto" ? "Auto" : mode === "disabled" ? "Off" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Test Prompt</Label>
            <Textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={4}
              className="border-white/10 bg-black/20 font-mono text-sm"
              placeholder="Enter a prompt to test..."
            />
          </div>

          <Button
            onClick={handleTest}
            disabled={isRunning || !picker.modelId}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "Running..." : "Run Test"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={`border-border/50 ${result.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                Test Result
              </CardTitle>
              {result.durationMs > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {result.durationMs}ms
                </Badge>
              )}
            </div>
            <CardDescription className="font-mono text-xs">
              {result.modelUsed} · thinking: {result.thinkingModeUsed}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.reasoning && (
              <div>
                <Label className="text-xs text-purple-400">Reasoning (chain-of-thought)</Label>
                <div className="mt-1 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {result.reasoning}
                </div>
              </div>
            )}
            {result.content && (
              <div>
                <Label className="text-xs text-emerald-400">Content (actual output)</Label>
                <div className="mt-1 p-3 rounded-lg bg-black/20 border border-white/10 text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {result.content}
                </div>
              </div>
            )}
            {result.error && (
              <div>
                <Label className="text-xs text-red-400">Error</Label>
                <div className="mt-1 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-red-300 font-mono">
                  {result.error}
                </div>
              </div>
            )}
            {result.success && !result.content && !result.reasoning && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400">
                ⚠ Empty content — this is exactly the problem with thinking models that exhaust their token budget.
                Try setting thinking mode to &quot;Off&quot; or &quot;Low&quot;.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Standalone lookup helper that works with model IDs containing variants.
 */
function findModelMeta(modelId: string): AIModelEntry | undefined {
  const baseId = modelId.split(":")[0];
  const { KNOWN_MODELS, PROVIDER_TYPES } = require("@/lib/ai/registry");
  for (const pt of PROVIDER_TYPES) {
    const found = KNOWN_MODELS[pt]?.find((m: AIModelEntry) => m.id === baseId);
    if (found) return found;
  }
  return undefined;
}