"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Bug,
  ChevronDown,
  Clock,
  Zap,
  Timer,
  Server,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useOracleStore,
  type TimingMetrics,
  type DebugModelOverride,
} from "@/store/use-oracle-store";
import {
  KNOWN_MODELS_PER_PROVIDER_TYPE,
  type ProviderType,
} from "@/lib/oracle/providers";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokenCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

// ── Live elapsed timer hook ────────────────────────────────────────────────

/**
 * Returns the elapsed time in ms since `startMs`, updating every `intervalMs`.
 * Returns null if `startMs` is null.
 */
function useLiveElapsed(startMs: number | null, intervalMs = 100): number | null {
  const [elapsed, setElapsed] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (startMs === null) {
      setElapsed(null);
      return;
    }

    const tick = () => setElapsed(Date.now() - startMs);
    tick(); // initial tick
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [startMs, intervalMs]);

  return elapsed;
}

// ── Sub-components ────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
  isLive = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: any;
  color?: string;
  isLive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`text-sm font-mono font-medium ${color} ${isLive ? "animate-pulse" : ""}`}>
          {value}
        </div>
        {sub && (
          <span className="text-[10px] text-muted-foreground">{sub}</span>
        )}
      </div>
      {isLive && (
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export function OracleDebugPanel() {
  // ── ALL hooks must be called before any conditional returns ──────────
  const debugOpen = useOracleStore((s) => s.debugOpen);
  const setDebugOpen = useOracleStore((s) => s.setDebugOpen);
  const debugModelOverride = useOracleStore((s) => s.debugModelOverride);
  const setDebugModelOverride = useOracleStore((s) => s.setDebugModelOverride);
  const debugLastMetrics = useOracleStore((s) => s.debugLastMetrics);
  const debugDebugModelUsed = useOracleStore((s) => s.debugDebugModelUsed);
  const debugClientTiming = useOracleStore((s) => s.debugClientTiming);
  const debugPromptTokens = useOracleStore((s) => s.debugPromptTokens);
  const debugCompletionTokens = useOracleStore((s) => s.debugCompletionTokens);
  const isStreaming = useOracleStore((s) => s.isStreaming);
  const sessionId = useOracleStore((s) => s.sessionId);

  // Fetch current session messages for token data
  const sessionData = useQuery(
    api.oracle.sessions.getSessionWithMessages,
    sessionId ? { sessionId } : "skip",
  );

  // Fetch providers/model chain for model override
  const debugProviders = useQuery(api.oracle.debug.adminGetDebugProviders);

  // Token data and timing from the last assistant message
  const lastAssistantMsg = React.useMemo(() => {
    if (!sessionData?.messages) return null;
    const msgs = sessionData.messages.filter(
      (m: any) => m.role === "assistant",
    );
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  }, [sessionData?.messages]);

  // Primary source: message document fields; fallback: Zustand store from action result
  const promptTokens = lastAssistantMsg?.promptTokens ?? debugPromptTokens ?? null;
  const completionTokens = lastAssistantMsg?.completionTokens ?? debugCompletionTokens ?? null;
  const totalTokens =
    promptTokens !== null && completionTokens !== null
      ? promptTokens + completionTokens
      : null;

  // Determine if a request is active (streaming or waiting for first content)
  const requestActive = isStreaming || (
    debugClientTiming.requestStartMs !== null &&
    debugClientTiming.completeMs === null
  );

  // Live elapsed timer from when SEND was pressed
  const liveElapsedMs = useLiveElapsed(
    requestActive ? debugClientTiming.requestStartMs : null,
  );

  // Server timing from message data (primary source) or store (fallback)
  const serverTiming = React.useMemo(() => {
    // Start with store-based timing (from action return) as the base
    const storeTiming = debugLastMetrics
      ? {
          promptBuildMs: debugLastMetrics.promptBuildMs ?? null,
          requestQueueMs: debugLastMetrics.requestQueueMs ?? null,
          ttftMs: debugLastMetrics.ttftMs ?? null,
          initialDecodeMs: debugLastMetrics.initialDecodeMs ?? null,
          totalMs: debugLastMetrics.totalMs ?? null,
        }
      : null;

    // Message document fields take priority (reliable, persisted)
    const msgTiming = lastAssistantMsg
      ? {
          promptBuildMs: (lastAssistantMsg as any).timingPromptBuildMs ?? null,
          requestQueueMs: (lastAssistantMsg as any).timingRequestQueueMs ?? null,
          ttftMs: (lastAssistantMsg as any).timingTtftMs ?? null,
          initialDecodeMs: (lastAssistantMsg as any).timingInitialDecodeMs ?? null,
          totalMs: (lastAssistantMsg as any).timingTotalMs ?? null,
        }
      : null;

    // Merge: message fields override store fields when available
    if (msgTiming || storeTiming) {
      return {
        promptBuildMs: msgTiming?.promptBuildMs ?? storeTiming?.promptBuildMs ?? null,
        requestQueueMs: msgTiming?.requestQueueMs ?? storeTiming?.requestQueueMs ?? null,
        ttftMs: msgTiming?.ttftMs ?? storeTiming?.ttftMs ?? null,
        initialDecodeMs: msgTiming?.initialDecodeMs ?? storeTiming?.initialDecodeMs ?? null,
        totalMs: msgTiming?.totalMs ?? storeTiming?.totalMs ?? null,
      };
    }
    return null;
  }, [lastAssistantMsg, debugLastMetrics]);

  // Compute server timing display values with live fallback during streaming
  const serverTimingDisplay = React.useMemo(() => {
    const makeDisplay = (
      actualMs: number | null | undefined,
      label: string,
    ): { value: string; isLive: boolean } => {
      if (actualMs != null) return { value: formatMs(actualMs), isLive: false };
      if (requestActive && liveElapsedMs !== null) {
        return { value: formatMs(liveElapsedMs), isLive: true };
      }
      return { value: "—", isLive: false };
    };

    return {
      promptBuild: makeDisplay(serverTiming?.promptBuildMs, "Prompt Build"),
      requestQueue: makeDisplay(serverTiming?.requestQueueMs, "Request Queue"),
      ttft: makeDisplay(serverTiming?.ttftMs, "TTFT"),
      initialDecode: makeDisplay(serverTiming?.initialDecodeMs, "Initial Decode"),
      totalServer: makeDisplay(serverTiming?.totalMs, "Total Server"),
    };
  }, [serverTiming, requestActive, liveElapsedMs]);

  // Debug model used from message (primary) or store (fallback)
  const activeDebugModelUsed = React.useMemo(() => {
    const msgModel = (lastAssistantMsg as any)?.debugModelUsed ?? null;
    return msgModel || debugDebugModelUsed;
  }, [lastAssistantMsg, debugDebugModelUsed]);

  // Model override state
  const [selectedProvider, setSelectedProvider] = React.useState<string>("");
  const [customModel, setCustomModel] = React.useState<string>("");

  // Apply model override
  const handleApplyOverride = React.useCallback(() => {
    if (!selectedProvider || !customModel.trim()) return;
    const override: DebugModelOverride = {
      providerId: selectedProvider,
      model: customModel.trim(),
    };
    setDebugModelOverride(override);
  }, [selectedProvider, customModel, setDebugModelOverride]);

  // Clear model override
  const handleClearOverride = React.useCallback(() => {
    setDebugModelOverride(null);
    setSelectedProvider("");
    setCustomModel("");
  }, [setDebugModelOverride]);

  // Get known models for the selected provider type
  const selectedProviderType = React.useMemo(() => {
    if (!debugProviders || !selectedProvider) return null;
    const prov = debugProviders.providers.find(
      (p: any) => p.id === selectedProvider,
    );
    return prov?.type ?? null;
  }, [debugProviders, selectedProvider]);

  const knownModels = React.useMemo(() => {
    if (!selectedProviderType) return [];
    return (
      KNOWN_MODELS_PER_PROVIDER_TYPE[selectedProviderType as ProviderType] ??
      []
    );
  }, [selectedProviderType]);

  // ── Client-side timing computations ────────────────────────────────────
  const clientTtftMs = React.useMemo(() => {
    if (
      debugClientTiming.requestStartMs &&
      debugClientTiming.firstContentMs
    ) {
      return (
        debugClientTiming.firstContentMs -
        debugClientTiming.requestStartMs
      );
    }
    return null;
  }, [debugClientTiming]);

  const clientTotalMs = React.useMemo(() => {
    if (
      debugClientTiming.requestStartMs &&
      debugClientTiming.completeMs
    ) {
      return (
        debugClientTiming.completeMs -
        debugClientTiming.requestStartMs
      );
    }
    return null;
  }, [debugClientTiming]);

  // Live client timing display (elapsed while streaming)
  const clientTtftDisplay = React.useMemo((): { value: string; isLive: boolean } => {
    if (clientTtftMs !== null) return { value: formatMs(clientTtftMs), isLive: false };
    // If firstContentMs not yet captured but request is active, show live elapsed
    if (requestActive && debugClientTiming.firstContentMs === null && liveElapsedMs !== null) {
      return { value: formatMs(liveElapsedMs), isLive: true };
    }
    return { value: "—", isLive: false };
  }, [clientTtftMs, requestActive, debugClientTiming.firstContentMs, liveElapsedMs]);

  const clientTotalDisplay = React.useMemo((): { value: string; isLive: boolean } => {
    if (clientTotalMs !== null) return { value: formatMs(clientTotalMs), isLive: false };
    // If completeMs not yet captured but request is active, show live elapsed
    if (requestActive && debugClientTiming.completeMs === null && liveElapsedMs !== null) {
      return { value: formatMs(liveElapsedMs), isLive: true };
    }
    return { value: "—", isLive: false };
  }, [clientTotalMs, requestActive, debugClientTiming.completeMs, liveElapsedMs]);

  // ── Now safe to do conditional renders ──────────────────────────────────

  // Collapsed view — just the toggle button
  if (!debugOpen) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="fixed bottom-4 right-4 z-[100]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 rounded-full border-galactic/30 bg-black/80 text-galactic hover:bg-galactic/20 hover:text-galactic backdrop-blur-md shadow-lg shadow-galactic/10"
                onClick={() => setDebugOpen(true)}
              >
                <Bug className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              <p className="text-xs">Oracle Debug Panel</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // ── Expanded view ──────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed bottom-4 right-4 z-[100] w-[380px] max-h-[85vh] flex flex-col border border-galactic/20 bg-black/95 backdrop-blur-md rounded-xl shadow-2xl shadow-galactic/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-galactic/10 bg-galactic/5 shrink-0">
          <div className="flex items-center gap-2">
            <Bug className="h-3.5 w-3.5 text-galactic" />
            <span className="text-xs font-semibold text-galactic tracking-wide uppercase">
              Oracle Debug
            </span>
            {isStreaming && (
              <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                STREAMING
              </Badge>
            )}
            {debugModelOverride && (
              <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                OVERRIDE
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setDebugOpen(false)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
          {/* ── Model Override ──────────────────────────────────────── */}
          <section>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Server className="h-3 w-3" /> Model Override
            </h4>

            {debugModelOverride ? (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-amber-400/80 uppercase track-wider">
                      Active Override
                    </div>
                    <div className="text-xs font-mono text-amber-200 truncate">
                      {debugModelOverride.providerId}/{debugModelOverride.model}
                    </div>
                    {activeDebugModelUsed && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Last used:{" "}
                        <span className="font-mono text-amber-400">
                          {activeDebugModelUsed}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={handleClearOverride}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Select
                  value={selectedProvider}
                  onValueChange={(v) => {
                    setSelectedProvider(v);
                    setCustomModel("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-black/40 border-galactic/15 focus:border-galactic/40">
                    <SelectValue placeholder="Select provider..." />
                  </SelectTrigger>
                  <SelectContent
                    className="z-[99999]"
                    position="popper"
                    side="top"
                    sideOffset={4}
                    align="start"
                    style={{ zIndex: 99999 }}
                  >
                    {debugProviders?.providers?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="text-xs">
                          {p.name}{" "}
                          <span className="text-muted-foreground">
                            ({p.type})
                          </span>
                        </span>
                      </SelectItem>
                    )) ?? []}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. google/gemini-2.5-flash"
                    className="h-8 text-xs font-mono bg-black/40 border-galactic/15 focus:border-galactic/40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyOverride();
                    }}
                  />
                  {knownModels.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="mt-1 text-[10px] text-galactic/60 hover:text-galactic/80 underline-offset-2 hover:underline">
                        Known models ({knownModels.length})
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 max-h-32 overflow-y-auto rounded border border-white/5 bg-black/40">
                          {knownModels.map((m) => (
                            <button
                              key={m}
                              className="block w-full text-left text-[11px] font-mono px-2 py-1 hover:bg-galactic/10 text-white/70 hover:text-galactic border-b border-white/5 last:border-b-0"
                              onClick={() => setCustomModel(m)}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-full text-[11px] border-galactic/20 text-galactic hover:bg-galactic/10"
                  disabled={!selectedProvider || !customModel.trim()}
                  onClick={handleApplyOverride}
                >
                  Apply Override
                </Button>
              </div>
            )}
          </section>

          <Separator className="bg-galactic/10" />

          {/* ── Token Counters ──────────────────────────────────────── */}
          <section>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> Token Counters
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-blue-500/15 bg-blue-500/5 px-2 py-1.5 text-center">
                <div className="text-[9px] uppercase tracking-wider text-blue-400/70">
                  Prompt
                </div>
                <div className="text-sm font-mono font-bold text-blue-400">
                  {promptTokens !== null ? formatTokenCount(promptTokens) : (
                    requestActive ? (
                      <span className="text-blue-400/50 flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[10px]">…</span>
                      </span>
                    ) : "—"
                  )}
                </div>
              </div>
              <div className="rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2 py-1.5 text-center">
                <div className="text-[9px] uppercase tracking-wider text-emerald-400/70">
                  Completion
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {completionTokens !== null ? formatTokenCount(completionTokens) : (
                    requestActive ? (
                      <span className="text-emerald-400/50 flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[10px]">…</span>
                      </span>
                    ) : "—"
                  )}
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-white/3 px-2 py-1.5 text-center">
                <div className="text-[9px] uppercase tracking-wider text-white/50">
                  Total
                </div>
                <div className="text-sm font-mono font-bold text-white/90">
                  {totalTokens !== null ? formatTokenCount(totalTokens) : (
                    requestActive ? (
                      <span className="text-white/50 flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[10px]">…</span>
                      </span>
                    ) : "—"
                  )}
                </div>
              </div>
            </div>
            {lastAssistantMsg?.modelUsed && (
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                Model:{" "}
                <span className="font-mono text-amber-400">
                  {lastAssistantMsg.modelUsed}
                </span>
                {lastAssistantMsg.fallbackTierUsed && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 ml-1 border-galactic/20 text-galactic"
                  >
                    T{lastAssistantMsg.fallbackTierUsed}
                  </Badge>
                )}
              </div>
            )}
          </section>

          <Separator className="bg-galactic/10" />

          {/* ── Timing Metrics ──────────────────────────────────────── */}
          <section>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Timer className="h-3 w-3" /> Timing
            </h4>

            {/* Server-side metrics from invokeOracle */}
            <div className="space-y-0.5 mb-2">
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">
                Server (LLM Pipeline)
              </div>
              <MetricBar
                label="Prompt Build"
                value={serverTimingDisplay.promptBuild.value}
                icon={Clock}
                color="text-galactic/80"
                isLive={serverTimingDisplay.promptBuild.isLive}
              />
              <MetricBar
                label="Request Queue"
                value={serverTimingDisplay.requestQueue.value}
                sub="Network + LLM queue"
                icon={Clock}
                color="text-amber-400"
                isLive={serverTimingDisplay.requestQueue.isLive}
              />
              <MetricBar
                label="TTFT"
                value={serverTimingDisplay.ttft.value}
                sub="Time to first token from LLM"
                icon={Timer}
                color="text-emerald-400"
                isLive={serverTimingDisplay.ttft.isLive}
              />
              <MetricBar
                label="Initial Decode"
                value={serverTimingDisplay.initialDecode.value}
                sub="First token → ~200 chars"
                icon={Zap}
                color="text-blue-400"
                isLive={serverTimingDisplay.initialDecode.isLive}
              />
              <MetricBar
                label="Total Server"
                value={serverTimingDisplay.totalServer.value}
                icon={Clock}
                color="text-white/90"
                isLive={serverTimingDisplay.totalServer.isLive}
              />
            </div>

            {/* Client-side observed timing */}
            <div className="space-y-0.5">
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">
                Client (Observed)
              </div>
              <MetricBar
                label="Observed TTFT"
                value={clientTtftDisplay.value}
                sub="Click → first token in UI"
                icon={Timer}
                color="text-emerald-400"
                isLive={clientTtftDisplay.isLive}
              />
              <MetricBar
                label="Observed Total"
                value={clientTotalDisplay.value}
                sub="Click → stream complete"
                icon={Clock}
                color="text-white/70"
                isLive={clientTotalDisplay.isLive}
              />
            </div>

            {requestActive && !serverTiming?.ttftMs && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400/80">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Measuring…
              </div>
            )}
          </section>

          <Separator className="bg-galactic/10" />

          {/* ── Prompt Preview ──────────────────────────────────────── */}
          <section>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> Last Request Info
            </h4>

            {sessionData ? (
              <div className="space-y-1.5 text-[10px]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">Session</span>
                    <p className="font-mono text-white/70 truncate">
                      {sessionId ? sessionId.slice(-8) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Messages</span>
                    <p className="font-mono text-white/70">
                      {sessionData.messages?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Feature</span>
                    <p className="font-mono text-galactic/80">
                      {sessionData.featureKey ?? "none"}
                      {(sessionData as any).birthChartDepth
                        ? `/${(sessionData as any).birthChartDepth}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-mono text-white/70">
                      {sessionData.status}
                    </p>
                  </div>
                </div>
                {lastAssistantMsg && (
                  <div className="mt-1">
                    <span className="text-muted-foreground">
                      System Prompt Hash
                    </span>
                    <p className="font-mono text-white/50">
                      {lastAssistantMsg.systemPromptHash ?? "—"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No active session
              </p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-galactic/10 bg-galactic/3 text-[9px] text-muted-foreground flex items-center justify-between shrink-0">
          <span>⌘+D to toggle</span>
          <span className="font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}