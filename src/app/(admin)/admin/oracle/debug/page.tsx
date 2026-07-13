"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
  Loader2,
  Bug,
  Activity,
  MessageSquare,
  User,
  Settings,
  Zap,
  Shield,
  Cpu,
  FileText,
  Database,
  Eye,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Brain,
  AlertTriangle,
  Search,
  Copy,
  Check,
} from "lucide-react";
import { GiCursedStar } from "react-icons/gi";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import {
  buildPrompt,
  ORACLE_TITLE_DIRECTIVE,
  JOURNAL_PROMPT_DIRECTIVE,
} from "@/lib/oracle/promptBuilder";
import { ORACLE_SAFETY_RULES } from "@/lib/oracle/safetyRules";
import {
  buildUniversalBirthContext,
  getBirthChartDepthInstructions,
} from "@/lib/oracle/featureContext";
import {
  ORACLE_FEATURES,
  classifyOracleToolIntent,
  type OracleFeatureKey,
} from "@/lib/oracle/features";
import { DEFAULT_ORACLE_SOUL } from "@/lib/oracle/soul";
import {
  parseProvidersConfig,
  parseModelChain,
  tierForIndex,
  DEFAULT_MODEL_CHAIN,
  DEFAULT_PROVIDERS,
} from "@/lib/oracle/providers";

type EvaluationRun = {
  suiteVersion: string;
  createdAt: number;
  passed: boolean;
  releaseThreshold: number;
  tierSummaries: Array<{ tier: string; providerId: string; model: string; score: number; passed: boolean; casesPassed: number; casesTotal: number }>;
};
const runProductionEvaluationRef = makeFunctionReference<"action", Record<string, never>, EvaluationRun>("oracle/evaluation:runProductionEvaluation");
const getLatestEvaluationRef = makeFunctionReference<"query", Record<string, never>, EvaluationRun | null>("oracle/evaluationStore:getLatestRun");

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const start = str.slice(0, Math.floor(maxLen / 2) - 2);
  const end = str.slice(-(Math.floor(maxLen / 2) - 2));
  return `${start}...${end}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCostMicro(costMicro: number | null | undefined): string {
  if (costMicro == null) return "—";
  const dollars = costMicro / 1_000_000;
  if (dollars < 0.001) return `$${(dollars * 1000).toFixed(3)}µ`;
  if (dollars < 0.01) return `$${dollars.toFixed(5)}`;
  return `$${dollars.toFixed(4)}`;
}

function countApproxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getSettingMap(
  settings: Array<{ key: string; value: string }> | undefined,
): Record<string, string> {
  if (!settings) return {};
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

function tierColor(tier: string | undefined): string {
  switch (tier) {
    case "A":
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "B":
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "C":
      return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    case "D":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    default:
      return "text-muted-foreground border-border bg-muted";
  }
}

function featureLabel(key: string | undefined | null): string {
  if (!key) return "None";
  if (key === "none") return "None";
  if (key === "birth_chart_report") return "Birth Chart Report";
  const feature = ORACLE_FEATURES.find((f) => f.key === key);
  return feature?.label ?? key;
}

// ── Prompt Reconstructor ────────────────────────────────────────────────────

interface ReconstructedPrompt {
  systemPrompt: string;
  userMessage: string;
  systemBlocks: { label: string; content: string; tokens: number }[];
  userBlocks: { label: string; content: string; tokens: number }[];
  totalSystemChars: number;
  totalUserChars: number;
  totalSystemTokens: number;
  totalUserTokens: number;
  conversationHistory: { role: string; content: string; tokens: number }[];
  intentClassification: {
    featureKey: string | null;
    depth?: string;
    reason: string;
  } | null;
  birthContextPreview: string | null;
  journalConsent: boolean;
  timespaceContext: string | null;
}

function reconstructPrompt(
  session: any,
  messages: any[],
  user: any,
  settingsMap: Record<string, string>,
  journalConsent: any,
  userQuestion?: string,
): ReconstructedPrompt {
  // Runtime settings
  const soulDoc = settingsMap["oracle_soul"] ?? DEFAULT_ORACLE_SOUL;
  const temperature = parseFloat(settingsMap["temperature"] ?? "0.82");
  const topP = parseFloat(settingsMap["top_p"] ?? "0.92");
  const maxContextMessages = parseInt(
    settingsMap["max_context_messages"] ?? "20",
    10,
  );
  const providers = parseProvidersConfig(settingsMap["providers_config"]);
  const modelChain = parseModelChain(settingsMap["model_chain"]);

  // Birth context
  let birthContextPreview: string | null = null;
  if (user?.birthData) {
    birthContextPreview = buildUniversalBirthContext(user.birthData);
  }

  // Feature injection
  const featureKey =
    session?.featureKey && session.featureKey !== "none"
      ? session.featureKey
      : null;
  const depth = session?.birthChartDepth ?? "core";

  let featureInjection = "";
  if (featureKey === "birth_chart") {
    featureInjection = getBirthChartDepthInstructions(depth as "core" | "full");
  } else if (featureKey === "journal_recall") {
    const f = ORACLE_FEATURES.find((f) => f.key === "journal_recall");
    featureInjection = f?.fallbackInjectionText ?? "";
  }

  // Intent classification
  const question = userQuestion ?? messages?.filter((m: any) => m.role === "user").pop()?.content ?? "";
  const hasBirthData = Boolean(user?.birthData);
  const hasJournalConsent = journalConsent?.oracleCanReadJournal === true;

  let intentClassification = null;
  if (!featureKey && question) {
    const intent = classifyOracleToolIntent(
      question,
      null,
      hasBirthData,
      hasJournalConsent,
    );
    intentClassification = {
      featureKey: intent.featureKey,
      depth: intent.depth,
      reason: intent.reason,
    };
  }

  // Build prompt
  const isFirstResponse = !messages?.some((m: any) => m.role === "assistant");
  const hasJournalCtx = journalConsent?.oracleCanReadJournal === true;

  const prompt = buildPrompt({
    soulDoc,
    featureInjection: featureInjection || null,
    birthContext: birthContextPreview || null,
    userQuestion: question,
    isFirstResponse,
    journalContext: hasJournalCtx ? "[JOURNAL CONTEXT]\n(Journal context would be assembled server-side when consent is granted)" : null,
    timespaceContext: "[CURRENT SPACE-TIME]\nUser's local time: (assembled server-side)\nTimezone: (from client)\n[END CURRENT SPACE-TIME]",
  });

  // Parse system prompt into labeled blocks
  const systemBlocks: { label: string; content: string; tokens: number }[] = [];

  // Block 1: Safety
  systemBlocks.push({
    label: "Block 1: Safety Rules",
    content: ORACLE_SAFETY_RULES,
    tokens: countApproxTokens(ORACLE_SAFETY_RULES),
  });

  // Block 2: Soul doc
  systemBlocks.push({
    label: "Block 2: Soul Document",
    content: soulDoc,
    tokens: countApproxTokens(soulDoc),
  });

  // Block 3: Feature injection
  if (featureInjection) {
    systemBlocks.push({
      label: `Block 3: Feature Injection (${featureKey ?? "unknown"}${depth ? ` / ${depth} depth` : ""})`,
      content: featureInjection,
      tokens: countApproxTokens(featureInjection),
    });
  }

  // Block 3.5: Timespace (always present)
  systemBlocks.push({
    label: "Block 3.5: Timespace Context",
    content: "(Assembled server-side from user timezone + cosmic weather when temporal intent detected)",
    tokens: 0,
  });

  // Block 4: Journal context
  if (hasJournalCtx) {
    systemBlocks.push({
      label: "Block 4: Journal Context (consent granted, budget " + (featureKey === "journal_recall" ? "expanded" : "normal") + ")",
      content: "(Assembled server-side from journal entries — not available in debug preview)",
      tokens: 0,
    });
  }

  // Block 5: Title directive
  if (isFirstResponse) {
    systemBlocks.push({
      label: "Block 5: Title Directive",
      content: ORACLE_TITLE_DIRECTIVE,
      tokens: countApproxTokens(ORACLE_TITLE_DIRECTIVE),
    });
  }

  // Block 6: Journal prompt directive
  if (isFirstResponse && hasJournalCtx) {
    systemBlocks.push({
      label: "Block 6: Journal Prompt Directive",
      content: JOURNAL_PROMPT_DIRECTIVE,
      tokens: countApproxTokens(JOURNAL_PROMPT_DIRECTIVE),
    });
  }

  // User message blocks
  const userBlocks: { label: string; content: string; tokens: number }[] = [];
  if (birthContextPreview) {
    userBlocks.push({
      label: "Birth Chart Data (universal — always injected)",
      content: birthContextPreview,
      tokens: countApproxTokens(birthContextPreview),
    });
  }
  userBlocks.push({
    label: "User Question (sanitized)",
    content: question,
    tokens: countApproxTokens(question),
  });

  // Conversation history
  const historyMessages = (messages ?? [])
    .filter((m: any) => m.role === "user" || m.role === "assistant")
    .map((m: any) => ({
      role: m.role,
      content: m.content,
      tokens: countApproxTokens(m.content),
    }));

  const totalSystemChars = systemBlocks.reduce((s, b) => s + b.content.length, 0);
  const totalUserChars = userBlocks.reduce((s, b) => s + b.content.length, 0);
  const totalSystemTokens = systemBlocks.reduce((s, b) => s + b.tokens, 0);
  const totalUserTokens = userBlocks.reduce((s, b) => s + b.tokens, 0);

  return {
    systemPrompt: prompt.systemPrompt,
    userMessage: prompt.userMessage,
    systemBlocks,
    userBlocks,
    totalSystemChars,
    totalUserChars,
    totalSystemTokens,
    totalUserTokens,
    conversationHistory: historyMessages,
    intentClassification,
    birthContextPreview,
    journalConsent: hasJournalCtx,
    timespaceContext: null,
  };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: any;
  color?: string;
}) {
  return (
    <Card className="group min-w-0 overflow-hidden border-white/[0.07] bg-[#0d1018] shadow-none transition-colors hover:border-violet-400/20">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
            {label}
          </span>
        </div>
        <div className={`truncate text-xl font-semibold tracking-tight ${color}`} title={String(value)}>{value}</div>
        {sub && <p className="mt-1.5 truncate text-[10px] leading-relaxed text-muted-foreground/60" title={sub}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PromptBlock({
  label,
  content,
  tokens,
  chars,
  defaultOpen = false,
  variant = "system",
}: {
  label: string;
  content: string;
  tokens: number;
  chars?: number;
  defaultOpen?: boolean;
  variant?: "system" | "user" | "history";
}) {
  const borderColor =
    variant === "system"
      ? "border-blue-500/20"
      : variant === "user"
        ? "border-emerald-500/20"
        : "border-purple-500/20";

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className={`rounded-lg border ${borderColor} bg-card/30 overflow-hidden`}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3.5 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ui-expanded:rotate-90 transition-transform" />
            <span className="text-sm font-medium truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {tokens} tok
            </Badge>
            {chars !== undefined && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {chars.toLocaleString()} chars
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/30">
            <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed max-h-80 overflow-y-auto">
              {content}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function MessageRow({ message }: { message: any; index: number }) {
  const isUser = message.role === "user";
  const borderColor = isUser
    ? "border-emerald-500/20"
    : "border-blue-500/20";
  const bgColor = isUser ? "bg-emerald-500/3" : "bg-blue-500/3";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      <Accordion type="single" collapsible>
        <AccordionItem value="msg" className="border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-white/5 text-xs">
            <div className="flex items-center gap-2 w-full">
              <Badge
                variant={isUser ? "default" : "secondary"}
                className={`text-[10px] px-1.5 py-0 ${isUser
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  }`}
              >
                {message.role}
              </Badge>
              <span className="text-muted-foreground">
                {formatRelativeTime(message.createdAt)}
              </span>
              <span className="text-muted-foreground/50 truncate ml-1">
                {truncateMiddle(message.content, 80)}
              </span>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                {message.modelUsed && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {message.modelUsed.split("/").pop()}
                  </Badge>
                )}
                {message.fallbackTierUsed && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${tierColor(message.fallbackTierUsed)}`}
                  >
                    T{message.fallbackTierUsed}
                  </Badge>
                )}
                {message.promptTokens != null && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {message.promptTokens}+{message.completionTokens ?? 0}
                  </Badge>
                )}
                {message.costUsdMicro != null && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-400"
                  >
                    {formatCostMicro(message.costUsdMicro)}
                  </Badge>
                )}
                {/* Show timing badge if timing data exists */}
                {message.timingTotalMs != null && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-400">
                    {formatMs(message.timingTotalMs)}
                  </Badge>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              {/* Content */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Content
                </span>
                <pre className="mt-1 p-2 rounded bg-black/20 text-xs text-white/80 whitespace-pre-wrap break-words font-mono max-h-60 overflow-y-auto">
                  {message.content}
                </pre>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {message.modelUsed && (
                  <div>
                    <span className="text-muted-foreground">Model</span>
                    <p className="font-mono">{message.modelUsed}</p>
                  </div>
                )}
                {message.fallbackTierUsed && (
                  <div>
                    <span className="text-muted-foreground">Tier</span>
                    <p>
                      <Badge className={`text-[10px] px-1 py-0 ${tierColor(message.fallbackTierUsed)}`}>
                        {message.fallbackTierUsed}
                      </Badge>
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Prompt Tokens</span>
                  <p className={`font-mono ${message.promptTokens != null ? "text-blue-400" : "text-muted-foreground/50"}`}>
                    {message.promptTokens != null ? message.promptTokens : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completion Tokens</span>
                  <p className={`font-mono ${message.completionTokens != null ? "text-emerald-400" : "text-muted-foreground/50"}`}>
                    {message.completionTokens != null ? message.completionTokens : "—"}
                  </p>
                </div>
                {message.costUsdMicro != null && (
                  <div>
                    <span className="text-muted-foreground">Cost</span>
                    <p className="font-mono text-amber-400">
                      {formatCostMicro(message.costUsdMicro)}
                    </p>
                  </div>
                )}
                {message.systemPromptHash && (
                  <div>
                    <span className="text-muted-foreground">Prompt Hash</span>
                    <p className="font-mono text-xs">{message.systemPromptHash}</p>
                  </div>
                )}
                {message.journalPrompt && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-muted-foreground">Journal Prompt</span>
                    <p className="text-galactic">{message.journalPrompt}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-mono">{formatTimestamp(message.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ID</span>
                  <p className="font-mono text-[10px] truncate">{message._id}</p>
                </div>
              </div>

              {/* Timing Metrics (always shown for assistant messages) */}
              {!isUser && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Server Timing
                  </span>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    <div className="rounded border border-border/30 px-2 py-1.5 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-galactic/60 mb-0.5">Prompt Build</div>
                      <div className="text-xs font-mono font-medium text-galactic">
                        {message.timingPromptBuildMs != null ? formatMs(message.timingPromptBuildMs) : "—"}
                      </div>
                    </div>
                    <div className="rounded border border-border/30 px-2 py-1.5 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-amber-400/60 mb-0.5">Req Queue</div>
                      <div className="text-xs font-mono font-medium text-amber-400">
                        {message.timingRequestQueueMs != null ? formatMs(message.timingRequestQueueMs) : "—"}
                      </div>
                    </div>
                    <div className="rounded border border-border/30 px-2 py-1.5 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-emerald-400/60 mb-0.5">TTFT</div>
                      <div className="text-xs font-mono font-medium text-emerald-400">
                        {message.timingTtftMs != null ? formatMs(message.timingTtftMs) : "—"}
                      </div>
                    </div>
                    <div className="rounded border border-border/30 px-2 py-1.5 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-blue-400/60 mb-0.5">Init Decode</div>
                      <div className="text-xs font-mono font-medium text-blue-400">
                        {message.timingInitialDecodeMs != null ? formatMs(message.timingInitialDecodeMs) : "—"}
                      </div>
                    </div>
                    <div className="rounded border border-border/30 px-2 py-1.5 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">Total</div>
                      <div className="text-xs font-mono font-medium text-white/80">
                        {message.timingTotalMs != null ? formatMs(message.timingTotalMs) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Character & token analysis */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{message.content.length.toLocaleString()} chars</span>
                <Separator orientation="vertical" className="h-3" />
                <span>~{countApproxTokens(message.content)} tokens (approx)</span>
                <Separator orientation="vertical" className="h-3" />
                {message.promptTokens != null && message.completionTokens != null && (
                  <span className="text-blue-400">
                    Total: {message.promptTokens + message.completionTokens} tokens
                  </span>
                )}
                {message.promptTokens == null && message.completionTokens == null && !isUser && (
                  <span className="text-muted-foreground/50">No token data from provider</span>
                )}
              </div>

              {/* Debug model override indicator */}
              {message.debugModelUsed && (
                <div className="text-[10px] text-amber-400">
                  Debug Override: <span className="font-mono">{message.debugModelUsed}</span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function OracleDebugPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams<{ sessionId?: string }>();
  const routeSessionId = routeParams.sessionId as Id<"oracle_sessions"> | undefined;
  const sessionOnly = Boolean(routeSessionId);
  const sessionIdFromUrl = routeSessionId ?? searchParams.get("sessionId") as Id<"oracle_sessions"> | null;
  const [selectedSessionId, setSelectedSessionId] = React.useState<
    Id<"oracle_sessions"> | null
  >(sessionIdFromUrl);
  const [sessionFilter, setSessionFilter] = React.useState("");
  const [queueFilter, setQueueFilter] = React.useState<"all" | "active" | "completed" | "fallback">("all");
  const [modelFilter, setModelFilter] = React.useState("all");
  const [featureFilter, setFeatureFilter] = React.useState("all");
  const [queueSort, setQueueSort] = React.useState<"newest" | "oldest" | "az" | "za">("newest");
  const [sessionPage, setSessionPage] = React.useState(1);
  const deferredSessionFilter = React.useDeferredValue(sessionFilter.trim());
  const [copiedSessionId, setCopiedSessionId] = React.useState(false);
  const [evaluationRun, setEvaluationRun] = React.useState<EvaluationRun | null>(null);
  const [evaluationError, setEvaluationError] = React.useState<string | null>(null);
  const [evaluationRunning, setEvaluationRunning] = React.useState(false);
  const runProductionEvaluation = useAction(runProductionEvaluationRef);

  React.useEffect(() => {
    setSelectedSessionId(sessionIdFromUrl);
  }, [sessionIdFromUrl]);

  const handleRunEvaluation = React.useCallback(async () => {
    setEvaluationRunning(true);
    setEvaluationError(null);
    try {
      setEvaluationRun(await runProductionEvaluation({}));
    } catch (error) {
      setEvaluationError(error instanceof Error ? error.message : String(error));
    } finally {
      setEvaluationRunning(false);
    }
  }, [runProductionEvaluation]);

  // Queries
  // @ts-ignore Convex's generated route type exceeds TypeScript's instantiation depth here.
  const sessions = useQuery(api.oracle.debug.adminListSessions, sessionOnly ? "skip" : {
      limit: 100,
      search: deferredSessionFilter || undefined,
    });
  const sessionDetail = useQuery(
    api.oracle.debug.adminGetSessionDetail,
    selectedSessionId ? { sessionId: selectedSessionId } : "skip",
  );
  const stats = useQuery(api.oracle.debug.adminGetOracleStats, sessionOnly ? "skip" : {});
  const latestEvaluationRun = useQuery(getLatestEvaluationRef, sessionOnly ? "skip" : {});
  const displayedEvaluationRun = evaluationRun ?? latestEvaluationRun;

  // Prompt reconstruction
  const reconstructedPrompt = React.useMemo(() => {
    if (!sessionDetail?.session || !sessionDetail?.messages) return null;
    const settingsMap = getSettingMap(sessionDetail.allSettings);
    return reconstructPrompt(
      sessionDetail.session,
      sessionDetail.messages,
      sessionDetail.user,
      settingsMap,
      sessionDetail.journalConsent,
    );
  }, [sessionDetail]);

  const filteredSessions = sessions ?? [];
  const modelOptions = React.useMemo(() => Array.from(new Set(filteredSessions.map((session) => session.primaryModelUsed?.split("/").pop()).filter((value): value is string => Boolean(value)))).sort(), [filteredSessions]);
  const featureOptions = React.useMemo(() => Array.from(new Set(filteredSessions.map((session) => session.featureKey).filter((value): value is string => Boolean(value)))).sort(), [filteredSessions]);
  const queueSessions = React.useMemo(() => {
    const matching = filteredSessions.filter((session) => {
      if (queueFilter === "fallback" && !session.usedFallback) return false;
      if ((queueFilter === "active" || queueFilter === "completed") && session.status !== queueFilter) return false;
      if (modelFilter !== "all" && session.primaryModelUsed?.split("/").pop() !== modelFilter) return false;
      if (featureFilter !== "all" && session.featureKey !== featureFilter) return false;
      return true;
    });
    return matching.sort((a, b) => {
      if (queueSort === "oldest") return a.lastMessageAt - b.lastMessageAt;
      if (queueSort === "az") return (a.title ?? "").localeCompare(b.title ?? "");
      if (queueSort === "za") return (b.title ?? "").localeCompare(a.title ?? "");
      return b.lastMessageAt - a.lastMessageAt;
    });
  }, [filteredSessions, queueFilter, modelFilter, featureFilter, queueSort]);
  const sessionsPerPage = 12;
  const sessionPageCount = Math.max(1, Math.ceil(queueSessions.length / sessionsPerPage));
  const paginatedSessions = queueSessions.slice((sessionPage - 1) * sessionsPerPage, sessionPage * sessionsPerPage);

  React.useEffect(() => {
    setSessionPage(1);
  }, [deferredSessionFilter, queueFilter, modelFilter, featureFilter, queueSort]);

  React.useEffect(() => {
    setSessionPage((page) => Math.min(page, sessionPageCount));
  }, [sessionPageCount]);

  const selectSession = React.useCallback((sessionId: Id<"oracle_sessions"> | null) => {
    setSelectedSessionId(sessionId);
    if (sessionId) {
      router.push(`/admin/oracle/debug/session/${sessionId}`);
      return;
    }
    if (sessionOnly) {
      router.push("/admin/oracle/debug");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (sessionId) params.set("sessionId", sessionId);
    else params.delete("sessionId");
    router.replace(params.size > 0 ? `?${params.toString()}` : "?", { scroll: false });
  }, [router, searchParams, sessionOnly]);

  const copySessionId = React.useCallback(async () => {
    if (!selectedSessionId) return;
    await navigator.clipboard.writeText(selectedSessionId);
    setCopiedSessionId(true);
    window.setTimeout(() => setCopiedSessionId(false), 1500);
  }, [selectedSessionId]);

  // Compute total tokens and cost across messages
  const messageTokenSummary = React.useMemo(() => {
    if (!sessionDetail?.messages) return null;
    let totalPrompt = 0;
    let totalCompletion = 0;
    let messagesWithTokens = 0;
    let totalCostMicro = 0;
    for (const m of sessionDetail.messages) {
      if (m.promptTokens != null) totalPrompt += m.promptTokens;
      if (m.completionTokens != null) totalCompletion += m.completionTokens;
      if (m.promptTokens != null || m.completionTokens != null) messagesWithTokens++;
      if (m.costUsdMicro != null) totalCostMicro += m.costUsdMicro;
    }
    const reportTelemetry = sessionDetail.user?.birthChartReport;
    if (sessionDetail.session?.featureKey === "birth_chart_report" && reportTelemetry) {
      if (reportTelemetry.promptTokens != null) totalPrompt += reportTelemetry.promptTokens;
      if (reportTelemetry.completionTokens != null) totalCompletion += reportTelemetry.completionTokens;
      if (reportTelemetry.promptTokens != null || reportTelemetry.completionTokens != null) messagesWithTokens++;
    }
    return {
      totalPrompt,
      totalCompletion,
      total: totalPrompt + totalCompletion,
      messagesWithTokens,
      totalCostMicro,
      hasTelemetry: messagesWithTokens > 0,
    };
  }, [sessionDetail]);

  if (!sessionOnly && sessions === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionOnly && sessionDetail === undefined) {
    return <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" /><p className="mt-3 text-xs text-muted-foreground">Loading session evidence…</p></div></div>;
  }

  if (sessionOnly && sessionDetail === null) {
    return <div className="grid min-h-[60vh] place-items-center"><div className="max-w-sm text-center"><AlertTriangle className="mx-auto h-6 w-6 text-amber-300" /><h1 className="mt-3 text-lg font-semibold">Session not found</h1><p className="mt-1 text-sm text-muted-foreground">This session ID is invalid, no longer exists, or is not available to this admin account.</p><Button className="mt-5" variant="outline" onClick={() => router.push("/admin/oracle/debug")}>Return to session queue</Button></div></div>;
  }

  const d = sessionDetail;
  const s = d?.session;
  const u = d?.user;
  const settingsMap = getSettingMap(d?.allSettings);
  const providers = parseProvidersConfig(settingsMap["providers_config"]);
  const modelChain = parseModelChain(settingsMap["model_chain"]);
  const reportTelemetry = u?.birthChartReport;
  const displayedModel = s?.featureKey === "birth_chart_report"
    ? reportTelemetry?.generationModel ?? reportTelemetry?.configuredRoute?.model ?? null
    : s?.primaryModelUsed?.split("/").pop() ?? null;
  const displayedModelDetail = s?.featureKey === "birth_chart_report"
    ? reportTelemetry?.telemetryRecorded
      ? `${reportTelemetry.generationProviderId}/${reportTelemetry.generationModel} · recorded execution`
      : reportTelemetry?.configuredRoute
        ? `${reportTelemetry.configuredRoute.providerId}/${reportTelemetry.configuredRoute.model} · configured route; historical execution not recorded`
        : "Historical execution telemetry was not recorded"
    : s?.primaryModelUsed ?? "No model recorded";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-[1680px] space-y-5 pb-12">
        {!sessionOnly && (
          <>
        {/* Observatory masthead */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090b11] px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]"><Bug className="h-5 w-5 text-violet-300" /></div>
            <div>
              <div className="mb-1 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" /><span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Live observability</span></div>
              <h1 className="text-2xl font-semibold tracking-tight">Oracle observatory</h1>
              <p className="mt-1 text-sm text-muted-foreground/75">
                Trace conversations from intent to model response.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right"><p className="font-mono text-xl font-semibold tabular-nums">{stats?.totalSessions ?? "—"}</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Sessions</p></div>
            <Separator orientation="vertical" className="h-9" />
            <div className="text-right"><p className="font-mono text-xl font-semibold tabular-nums">{stats?.totalMessages ?? "—"}</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Messages</p></div>
          </div>
          </div>
        </div>

        {stats && (
          <section aria-label="Oracle fleet health" className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Active sessions", value: stats.activeSessions, note: `${Math.round((stats.activeSessions / Math.max(stats.totalSessions, 1)) * 100)}% of fleet`, tone: "text-emerald-300" },
              { label: "Fallback sessions", value: stats.usedFallback, note: `${Math.round((stats.usedFallback / Math.max(stats.totalSessions, 1)) * 100)}% routing rate`, tone: stats.usedFallback ? "text-amber-300" : "text-emerald-300" },
              { label: "Tracked tokens", value: (stats.totalPromptTokens + stats.totalCompletionTokens).toLocaleString(), note: `${stats.messagesWithTokens} measured messages`, tone: "text-sky-300" },
              { label: "Safety interventions", value: stats.crisisResponses + stats.killSwitchResponses, note: `${stats.crisisResponses} crisis · ${stats.killSwitchResponses} kill switch`, tone: stats.crisisResponses + stats.killSwitchResponses ? "text-rose-300" : "text-muted-foreground" },
            ].map((metric) => (
              <div key={metric.label} className="bg-[#0d1018] px-5 py-4">
                <div className="flex items-end justify-between gap-3"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/65">{metric.label}</span><Activity className={`h-3.5 w-3.5 ${metric.tone}`} /></div>
                <p className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${metric.tone}`}>{metric.value}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">{metric.note}</p>
              </div>
            ))}
          </section>
        )}

        {/* Cross-tier production release gate */}
        <Card className="overflow-hidden border-white/[0.07] bg-[#0d1018] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-violet-300" />Release readiness</CardTitle>
                <CardDescription className="mt-1">Seven fixed evidence, usefulness, privacy, and safety checks across every configured tier.</CardDescription>
              </div>
              <Button onClick={handleRunEvaluation} disabled={evaluationRunning} size="sm">
                {evaluationRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                {evaluationRunning ? "Evaluating all tiers…" : "Run release gate"}
              </Button>
            </div>
          </CardHeader>
          {(displayedEvaluationRun || evaluationError) && (
            <CardContent className="space-y-3">
              {evaluationError && <p className="text-xs text-red-400">{evaluationError}</p>}
              {displayedEvaluationRun && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className={displayedEvaluationRun.passed ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}>{displayedEvaluationRun.passed ? "RELEASE PASS" : "RELEASE BLOCKED"}</Badge>
                    <span className="text-xs text-muted-foreground">{displayedEvaluationRun.suiteVersion} · threshold {displayedEvaluationRun.releaseThreshold} · {formatRelativeTime(displayedEvaluationRun.createdAt)}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {displayedEvaluationRun.tierSummaries.map((tier) => (
                      <div key={`${tier.providerId}/${tier.model}`} className="rounded-lg border border-white/10 bg-black/15 p-3 text-xs">
                        <div className="flex items-center justify-between"><span className="font-medium">Tier {tier.tier}</span><span className={tier.passed ? "text-emerald-300" : "text-red-300"}>{tier.score}</span></div>
                        <p className="mt-1 truncate text-muted-foreground" title={`${tier.providerId}/${tier.model}`}>{tier.providerId}/{tier.model}</p>
                        <p className="mt-1 text-muted-foreground">{tier.casesPassed}/{tier.casesTotal} cases passed</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Session ledger */}
        <Card className="overflow-hidden border-white/[0.07] bg-[#0d1018] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-galactic" />Session queue</CardTitle>
                <CardDescription className="mt-1">Triage recent conversations and open one case for full execution evidence.</CardDescription>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-right"><p className="font-mono text-sm font-semibold tabular-nums">{queueSessions.length}</p><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">matching cases</p></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-3 border-y border-white/[0.06] bg-black/10 px-5 py-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases by ID, user, title, message, feature, or model"
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  aria-label="Search Oracle sessions"
                  className="h-9 border-white/[0.07] bg-[#090b11] pl-9 text-xs focus-visible:ring-violet-400/40"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#090b11] p-1" aria-label="Filter session queue">
                {(["all", "active", "completed", "fallback"] as const).map((filter) => <Button key={filter} variant="ghost" size="sm" onClick={() => setQueueFilter(filter)} aria-pressed={queueFilter === filter} className={`h-7 rounded-md px-2.5 text-[10px] capitalize ${queueFilter === filter ? "bg-white/[0.08] text-foreground" : "text-muted-foreground"}`}>{filter}</Button>)}
              </div>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="h-9 w-[170px] border-white/[0.07] bg-[#090b11] text-xs"><SelectValue placeholder="All models" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All models</SelectItem>{modelOptions.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={featureFilter} onValueChange={setFeatureFilter}>
                <SelectTrigger className="h-9 w-[170px] border-white/[0.07] bg-[#090b11] text-xs"><SelectValue placeholder="All features" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All features</SelectItem>{featureOptions.map((feature) => <SelectItem key={feature} value={feature}>{featureLabel(feature)}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={queueSort} onValueChange={(value) => setQueueSort(value as typeof queueSort)}>
                <SelectTrigger className="h-9 w-[150px] border-white/[0.07] bg-[#090b11] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="az">Title A–Z</SelectItem>
                  <SelectItem value="za">Title Z–A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paginatedSessions.length > 0 && (
              <div className="overflow-x-auto">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] bg-black/10 hover:bg-black/10">
                        <TableHead className="h-9 pl-5 text-[9px] uppercase tracking-wider">State</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">Case</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">User</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">Capability</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">Route</TableHead>
                        <TableHead className="text-right text-[9px] uppercase tracking-wider">Turns</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">Updated</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-wider">Context</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSessions.map((session) => (
                        <TableRow
                          key={session._id}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectSession(session._id); } }}
                          className="cursor-pointer border-white/[0.05] transition-colors hover:bg-white/[0.035] focus-visible:bg-violet-400/[0.08] focus-visible:outline-none data-[state=selected]:bg-violet-400/[0.09]"
                          data-state={selectedSessionId === session._id ? "selected" : undefined}
                          onClick={() => selectSession(session._id)}
                        >
                          <TableCell className="pl-5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${session.status === "active"
                                  ? "border-emerald-500/30 text-emerald-400"
                                  : "border-muted text-muted-foreground"
                                }`}
                            >
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] py-3">
                            <p className="truncate text-xs font-medium">{session.title ?? "Untitled conversation"}</p>
                            <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/60" title={session._id}>{session._id}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {session.username}
                          </TableCell>
                          <TableCell>
                            {session.featureKey ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 border-galactic/30 text-galactic"
                              >
                                {featureLabel(session.featureKey)}
                                {session.birthChartDepth
                                  ? `/${session.birthChartDepth}`
                                  : ""}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px] font-mono">
                            {session.primaryModelUsed?.split("/").pop() ?? (session.featureKey === "birth_chart_report" ? "Not recorded" : "—")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            {session.messageCount}
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(session.lastMessageAt)}
                          </TableCell>
                          <TableCell>
                            {session.hasBirthData ? (
                              <span className="text-emerald-400 text-[10px]">✓</span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">✗</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {queueSessions.length === 0 && (
              <div className="grid min-h-48 place-items-center px-6 text-center">
                <div>
                  <Search className="mx-auto mb-3 h-5 w-5 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No matching sessions</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try a shorter ID, username, model, feature, or phrase from a message.</p>
                  {sessionFilter && <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSessionFilter("")}>Clear search</Button>}
                </div>
              </div>
            )}
            {queueSessions.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-black/10 px-5 py-3">
                <p className="text-[10px] text-muted-foreground">Showing {(sessionPage - 1) * sessionsPerPage + 1}–{Math.min(sessionPage * sessionsPerPage, queueSessions.length)} of {queueSessions.length}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 px-2" disabled={sessionPage === 1} onClick={() => setSessionPage((page) => Math.max(1, page - 1))}><ChevronLeft className="h-3.5 w-3.5" /><span className="sr-only">Previous page</span></Button>
                  <span className="min-w-16 text-center font-mono text-[10px] text-muted-foreground">{sessionPage} / {sessionPageCount}</span>
                  <Button variant="outline" size="sm" className="h-8 px-2" disabled={sessionPage === sessionPageCount} onClick={() => setSessionPage((page) => Math.min(sessionPageCount, page + 1))}><ChevronRight className="h-3.5 w-3.5" /><span className="sr-only">Next page</span></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Selected Session Detail ──────────────────────────────────────── */}
          </>
        )}
        {d && s && (
          <div className="space-y-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" /><span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300">Open case</span></div>
                <h2 className="truncate text-xl font-semibold tracking-tight">{s.title ?? "Untitled conversation"}</h2>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground"><span>{u?.username ?? "Unknown user"}</span><span>·</span><span>{formatRelativeTime(s.lastMessageAt)}</span><span>·</span><span>{featureLabel(s.featureKey)}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2 font-mono text-[10px]" onClick={copySessionId} aria-label="Copy session ID">{copiedSessionId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}<span className="hidden max-w-48 truncate sm:block">{selectedSessionId}</span></Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => selectSession(null)}><ChevronLeft className="mr-1.5 h-3.5 w-3.5" />Back to queue</Button>
              </div>
            </div>
            {/* Top Stats Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Messages"
                value={d.messages.length}
                sub={`${d.messages.filter((m) => m.role === "user").length} user · ${d.messages.filter((m) => m.role === "assistant").length} assistant`}
                icon={MessageSquare}
              />
              <MetricCard
                label="Total Tokens"
                value={
                  messageTokenSummary
                    ? messageTokenSummary.hasTelemetry
                      ? messageTokenSummary.total.toLocaleString()
                      : "Not recorded"
                    : "—"
                }
                sub={
                  messageTokenSummary
                    ? messageTokenSummary.hasTelemetry
                      ? `${messageTokenSummary.totalPrompt.toLocaleString()} prompt · ${messageTokenSummary.totalCompletion.toLocaleString()} completion`
                      : "Token usage was not persisted for this session"
                    : "No token data"
                }
                icon={Zap}
                color="text-blue-400"
              />
              <MetricCard
                label="Feature"
                value={featureLabel(s.featureKey)}
                sub={
                  s.birthChartDepth
                    ? `Depth: ${s.birthChartDepth}`
                    : s.featureKey
                      ? "Active"
                      : "No feature"
                }
                icon={Sparkles}
                color="text-galactic"
              />
              <MetricCard
                label="Model"
                value={displayedModel ?? "Not recorded"}
                sub={displayedModelDetail}
                icon={Cpu}
                color="text-amber-400"
              />
              <MetricCard
                label="Status"
                value={s.status}
                sub={s.usedFallback ? "Used fallback" : "Primary model"}
                icon={Activity}
                color={
                  s.status === "active"
                    ? "text-emerald-400"
                    : "text-muted-foreground"
                }
              />
              <MetricCard
                label="User Tier"
                value={u?.tier ?? "—"}
                sub={`${u?.role ?? "user"} · ${u?.username ?? "unknown"}`}
                icon={User}
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="messages" className="space-y-5">
              <TabsList className="sticky top-3 z-20 h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0d1018]/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl">
                <TabsTrigger value="messages" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Messages
                  <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">
                    {d.messages.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="prompt" className="text-xs">
                  <FileText className="h-3 w-3 mr-1.5" />
                  Prompt Assembly
                </TabsTrigger>
                <TabsTrigger value="session" className="text-xs">
                  <Database className="h-3 w-3 mr-1.5" />
                  Session Data
                </TabsTrigger>
                <TabsTrigger value="user" className="text-xs">
                  <User className="h-3 w-3 mr-1.5" />
                  User & Birth
                </TabsTrigger>
                <TabsTrigger value="runtime" className="text-xs">
                  <Settings className="h-3 w-3 mr-1.5" />
                  Runtime Config
                </TabsTrigger>
                <TabsTrigger value="quota" className="text-xs">
                  <Shield className="h-3 w-3 mr-1.5" />
                  Quota
                </TabsTrigger>
              </TabsList>

              {/* ── Messages Tab ─────────────────────────────────────── */}
              <TabsContent value="messages" className="space-y-5">
                {d.analysis?.turns?.length > 0 && (
                  <Card className="border-border/30 bg-card/40">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Per-turn capability analysis</span>
                        <Badge
                          variant="outline"
                          className={d.analysis.capabilityMismatches.length > 0
                            ? "border-red-500/40 text-red-400"
                            : "border-emerald-500/30 text-emerald-400"}
                        >
                          {d.analysis.capabilityMismatches.length} mismatches
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {d.analysis.turns.map((turn: any, index: number) => (
                          <div key={turn.userMessageId} className="grid grid-cols-2 md:grid-cols-7 gap-2 rounded border border-border/20 px-3 py-2 text-[11px]">
                            <span>Turn {index + 1}</span>
                            <span className="font-mono text-galactic">{turn.expectedPipeline}</span>
                            <span className="text-muted-foreground">{turn.routingReason}</span>
                            <span className="font-mono">{turn.modelUsed ?? "no model"}</span>
                            <span>TTFT {turn.ttftMs != null ? formatMs(turn.ttftMs) : "—"}</span>
                            <span>Total {turn.totalMs != null ? formatMs(turn.totalMs) : "—"}</span>
                            <span className={turn.capabilityMismatch ? "text-red-400" : "text-emerald-400"}>
                              {turn.capabilityMismatch ? "Missing capability output" : "Output consistent"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Message token overview */}
                {messageTokenSummary && (
                  <Card className="border-border/30 bg-card/40">
                    <CardContent className="p-5">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Prompt tokens</span>
                          <p className="font-mono text-lg text-blue-400">
                            {messageTokenSummary.totalPrompt.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completion tokens</span>
                          <p className="font-mono text-lg text-emerald-400">
                            {messageTokenSummary.totalCompletion.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total tokens</span>
                          <p className="font-mono text-lg">
                            {messageTokenSummary.total.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Messages w/ tokens</span>
                          <p className="font-mono text-lg">
                            {messageTokenSummary.messagesWithTokens} / {d.messages.filter((m) => m.role === "assistant").length}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {messageTokenSummary.totalCostMicro > 0 ? "Actual cost" : "Est. cost"}
                          </span>
                          <p className="font-mono text-lg text-amber-400">
                            {messageTokenSummary.totalCostMicro > 0
                              ? formatCostMicro(messageTokenSummary.totalCostMicro)
                              : `~$${((messageTokenSummary.total * 0.00003)).toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Messages list */}
                <ScrollArea className="h-[700px]">
                  <div className="space-y-3 pr-4">
                    {d.messages.map((message, i) => (
                      <MessageRow key={message._id} message={message} index={i} />
                    ))}
                    {d.messages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No messages in this session.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ── Prompt Assembly Tab ──────────────────────────────── */}
              <TabsContent value="prompt" className="space-y-5">
                {reconstructedPrompt ? (
                  <>
                    {/* Summary bar */}
                    <Card className="border-border/30 bg-card/40">
                      <CardContent className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">System Prompt</span>
                            <p className="font-mono text-sm">
                              ~{reconstructedPrompt.totalSystemTokens} tokens
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {reconstructedPrompt.totalSystemChars.toLocaleString()} chars
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User Message</span>
                            <p className="font-mono text-sm">
                              ~{reconstructedPrompt.totalUserTokens} tokens
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {reconstructedPrompt.totalUserChars.toLocaleString()} chars
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">History Messages</span>
                            <p className="font-mono text-sm">
                              {reconstructedPrompt.conversationHistory.length}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Approx Total</span>
                            <p className="font-mono text-sm text-amber-400">
                              ~{reconstructedPrompt.totalSystemTokens + reconstructedPrompt.totalUserTokens + reconstructedPrompt.conversationHistory.reduce((s, m) => s + m.tokens, 0)} tokens
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Intent Class.</span>
                            <p className="text-xs">
                              {reconstructedPrompt.intentClassification
                                ? `${reconstructedPrompt.intentClassification.featureKey ?? "none"} (${reconstructedPrompt.intentClassification.reason})`
                                : "N/A (feature already active)"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Journal Consent</span>
                            <p className="text-xs">
                              {reconstructedPrompt.journalConsent ? "✓ Granted" : "✗ Not granted"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* System Prompt Blocks */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        System Prompt Blocks
                      </h3>
                      <div className="space-y-2">
                        {reconstructedPrompt.systemBlocks.map((block, i) => (
                          <PromptBlock
                            key={i}
                            label={block.label}
                            content={block.content}
                            tokens={block.tokens}
                            chars={block.content.length}
                            variant="system"
                            defaultOpen={i < 2}
                          />
                        ))}
                      </div>
                    </div>

                    {/* User Message Blocks */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        User Message Blocks
                      </h3>
                      <div className="space-y-2">
                        {reconstructedPrompt.userBlocks.map((block, i) => (
                          <PromptBlock
                            key={i}
                            label={block.label}
                            content={block.content}
                            tokens={block.tokens}
                            chars={block.content.length}
                            variant="user"
                            defaultOpen
                          />
                        ))}
                      </div>
                    </div>

                    {/* Conversation History */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                        Conversation History
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {reconstructedPrompt.conversationHistory.length} messages
                        </Badge>
                      </h3>
                      <div className="space-y-1">
                        {reconstructedPrompt.conversationHistory.map((msg, i) => (
                          <PromptBlock
                            key={i}
                            label={`${msg.role} #${i + 1}`}
                            content={msg.content}
                            tokens={msg.tokens}
                            chars={msg.content.length}
                            variant="history"
                          />
                        ))}
                        {reconstructedPrompt.conversationHistory.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No history (first message in session).
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Full Assembled Prompt */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-galactic" />
                        Full Assembled Prompts (Raw)
                      </h3>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="system">
                          <AccordionTrigger className="text-xs">
                            System Prompt ({reconstructedPrompt.systemPrompt.length.toLocaleString()} chars)
                          </AccordionTrigger>
                          <AccordionContent>
                            <pre className="p-3 rounded bg-black/30 text-[11px] text-green-400/80 whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto leading-relaxed">
                              {reconstructedPrompt.systemPrompt}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="user">
                          <AccordionTrigger className="text-xs">
                            User Message ({reconstructedPrompt.userMessage.length.toLocaleString()} chars)
                          </AccordionTrigger>
                          <AccordionContent>
                            <pre className="p-3 rounded bg-black/30 text-[11px] text-emerald-400/80 whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto leading-relaxed">
                              {reconstructedPrompt.userMessage}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* Intent Classification Detail */}
                    {reconstructedPrompt.intentClassification && (
                      <Card className="border-galactic/30 bg-galactic/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-galactic" />
                            Intent Classification Result
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Detected Feature</span>
                              <p className="font-mono">
                                {reconstructedPrompt.intentClassification.featureKey ?? "none"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Depth</span>
                              <p className="font-mono">
                                {reconstructedPrompt.intentClassification.depth ?? "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reason</span>
                              <p className="font-mono">
                                {reconstructedPrompt.intentClassification.reason}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Loading prompt reconstruction...
                  </div>
                )}
              </TabsContent>

              {/* ── Session Data Tab ────────────────────────────────── */}
              <TabsContent value="session" className="space-y-5">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Session Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      {Object.entries(s).map(([key, value]) => {
                        if (key === "_id" || key === "userId") {
                          return (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}</span>
                              <p className="font-mono text-[10px] break-all">
                                {String(value)}
                              </p>
                            </div>
                          );
                        }
                        if (typeof value === "number") {
                          return (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}</span>
                              <p className="font-mono">
                                {key.includes("At") || key.includes("Time")
                                  ? `${value} (${formatTimestamp(value as number)})`
                                  : String(value)}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div key={key}>
                            <span className="text-muted-foreground">{key}</span>
                            <p className="font-mono break-words">
                              {value === null || value === undefined
                                ? "null"
                                : String(value)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Injection Record */}
                {(d.featureInjections || d.depthInjection) && (
                  <Card className="border-border/30 bg-card/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Feature Injection Records</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {d.featureInjections && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Feature: {d.featureInjections.featureKey}
                          </span>
                          <pre className="p-2 mt-1 rounded bg-black/20 text-[11px] text-galactic/80 whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                            {d.featureInjections.contextText}
                          </pre>
                        </div>
                      )}
                      {d.depthInjection && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Depth: {d.depthInjection.featureKey}
                          </span>
                          <pre className="p-2 mt-1 rounded bg-black/20 text-[11px] text-blue-400/80 whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                            {d.depthInjection.contextText}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Raw JSON */}
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Raw Session JSON</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-3 rounded bg-black/30 text-[10px] text-white/50 whitespace-pre-wrap break-words font-mono max-h-64 overflow-y-auto">
                      {JSON.stringify(s, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── User & Birth Tab ─────────────────────────────────── */}
              <TabsContent value="user" className="space-y-5">
                {u && (
                  <>
                    <Card className="border-border/30 bg-card/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">User Record</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Email</span>
                            <p className="font-mono">{u.email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Username</span>
                            <p className="font-mono">{u.username}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Role</span>
                            <p className="font-mono">{u.role}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tier</span>
                            <p className="font-mono">{u.tier}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Has Birth Data</span>
                            <p>{u.hasBirthData ? "✓ Yes" : "✗ No"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID</span>
                            <p className="font-mono text-[10px] break-all">
                              {u._id}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Journal Consent */}
                    <Card className="border-border/30 bg-card/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Journal Consent State
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {d.journalConsent ? (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Oracle Can Read</span>
                              <p className={d.journalConsent.oracleCanReadJournal ? "text-emerald-400" : "text-red-400"}>
                                {d.journalConsent.oracleCanReadJournal ? "✓ Yes" : "✗ No"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Entry Content</span>
                              <p>{d.journalConsent.includeEntryContent ? "✓" : "✗"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Mood Data</span>
                              <p>{d.journalConsent.includeMoodData ? "✓" : "✗"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dream Data</span>
                              <p>{d.journalConsent.includeDreamData ? "✓" : "✗"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Lookback Days</span>
                              <p className="font-mono">{d.journalConsent.lookbackDays}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No journal consent record found for this user.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Birth Data */}
                    {u.birthData ? (
                      <Card className="border-border/30 bg-card/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <GiCursedStar className="h-4 w-4 text-galactic" />
                            Birth Data
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Date</span>
                              <p className="font-mono">{u.birthData.date}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time</span>
                              <p className="font-mono">{u.birthData.time}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Timezone</span>
                              <p className="font-mono">
                                {u.birthData.timezone ?? "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">House System</span>
                              <p className="font-mono">
                                {u.birthData.houseSystem ?? "—"}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Location</span>
                            <p className="font-mono">
                              {u.birthData.location.city},{" "}
                              {u.birthData.location.country}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {u.birthData.location.lat.toFixed(4)}°,{" "}
                              {u.birthData.location.long.toFixed(4)}°
                            </p>
                          </div>

                          {/* Placements */}
                          {u.birthData.placements && (
                            <div>
                              <span className="text-xs text-muted-foreground">
                                Placements ({u.birthData.placements.length})
                              </span>
                              <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-1">
                                {u.birthData.placements.map((p: any, i: number) => (
                                  <div
                                    key={i}
                                    className="text-[10px] font-mono px-2 py-1 rounded bg-black/20"
                                  >
                                    <span className="text-white/70">{p.body}:</span>{" "}
                                    <span className="text-galactic">{p.sign}</span>{" "}
                                    <span className="text-muted-foreground">
                                      H{p.house}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Chart data */}
                          {u.birthData.chart && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="chart">
                                <AccordionTrigger className="text-xs">
                                  Chart Data ({u.birthData.chart.planets?.length ?? 0} planets,{" "}
                                  {u.birthData.chart.houses?.length ?? 0} houses,{" "}
                                  {u.birthData.chart.aspects?.length ?? 0} aspects)
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3">
                                    {/* Ascendant */}
                                    {u.birthData.chart.ascendant && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">
                                          Ascendant:{" "}
                                        </span>
                                        <span className="text-galactic font-mono">
                                          {u.birthData.chart.ascendant.signId}{" "}
                                          {u.birthData.chart.ascendant.longitude.toFixed(2)}°
                                        </span>
                                      </div>
                                    )}

                                    {/* Planets */}
                                    {u.birthData.chart.planets && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground uppercase">
                                          Planets
                                        </span>
                                        <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-1">
                                          {u.birthData.chart.planets.map(
                                            (p: any, i: number) => (
                                              <div
                                                key={i}
                                                className="text-[10px] font-mono px-2 py-1 rounded bg-black/20"
                                              >
                                                <span className="text-white/70">
                                                  {p.id}:
                                                </span>{" "}
                                                <span className="text-galactic">
                                                  {p.signId}
                                                </span>{" "}
                                                <span className="text-muted-foreground">
                                                  H{p.houseId}
                                                </span>
                                                <span className="text-blue-400">
                                                  {" "}
                                                  {p.longitude.toFixed(2)}°
                                                </span>
                                                {p.retrograde && (
                                                  <span className="text-red-400">
                                                    {" "}℞
                                                  </span>
                                                )}
                                                {p.dignity && (
                                                  <span className="text-amber-400">
                                                    {" "}{p.dignity}
                                                  </span>
                                                )}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Houses */}
                                    {u.birthData.chart.houses && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground uppercase">
                                          Houses
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {u.birthData.chart.houses.map(
                                            (h: any, i: number) => (
                                              <Badge
                                                key={i}
                                                variant="outline"
                                                className="text-[9px] px-1.5 py-0"
                                              >
                                                H{h.id}:{h.signId}
                                              </Badge>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Aspects */}
                                    {u.birthData.chart.aspects && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground uppercase">
                                          Aspects ({u.birthData.chart.aspects.length})
                                        </span>
                                        <div className="mt-1 space-y-1">
                                          {u.birthData.chart.aspects
                                            .sort(
                                              (a: any, b: any) => a.orb - b.orb,
                                            )
                                            .slice(0, 12)
                                            .map((a: any, i: number) => (
                                              <div
                                                key={i}
                                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10"
                                              >
                                                <span className="text-white/70">
                                                  {a.planet1}
                                                </span>{" "}
                                                <span className="text-amber-400">
                                                  {a.type}
                                                </span>{" "}
                                                <span className="text-white/70">
                                                  {a.planet2}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {" "}
                                                  (orb {a.orb.toFixed(2)}°)
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}

                          {/* Reconstructed birth context */}
                          {reconstructedPrompt?.birthContextPreview && (
                            <div>
                              <span className="text-xs text-muted-foreground">
                                Reconstructed Birth Context (what the AI sees)
                              </span>
                              <pre className="mt-1 p-2 rounded bg-black/20 text-[10px] text-galactic/70 whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                                {reconstructedPrompt.birthContextPreview}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-border/30 bg-card/40">
                        <CardContent className="p-6 text-center text-sm text-muted-foreground">
                          This user has no birth data saved.
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ── Runtime Config Tab ───────────────────────────────── */}
              <TabsContent value="runtime" className="space-y-5">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Legacy Routing Snapshot (Read Only)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Providers */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        Migrated Provider Snapshot
                      </span>
                      <div className="mt-2 space-y-2">
                        {providers.map((p) => (
                          <div
                            key={p.id}
                            className="rounded border border-border/30 p-2 text-xs"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0"
                              >
                                {p.type}
                              </Badge>
                              <span className="font-semibold">{p.name}</span>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                ({p.id})
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              <div>Base URL: {p.baseUrl}</div>
                              <div>
                                Key Env: {p.apiKeyEnvVar}{" "}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 ml-1 ${p.type !== "ollama"
                                      ? "border-amber-500/30 text-amber-400"
                                      : "border-muted text-muted-foreground"
                                    }`}
                                >
                                  {p.type !== "ollama" ? "Required" : "Optional"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Model Chain */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        Model Fallback Chain
                      </span>
                      <div className="mt-2 space-y-1">
                        {modelChain.map((entry, i) => {
                          const provider = providers.find(
                            (p) => p.id === entry.providerId,
                          );
                          const tier = tierForIndex(i);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded border border-border/30 p-2 text-xs"
                            >
                              <Badge
                                className={`text-[10px] px-1.5 py-0.5 font-bold ${tierColor(tier)}`}
                              >
                                T{tier}
                              </Badge>
                              <span className="font-mono text-[11px]">
                                {entry.providerId}/{entry.model}
                              </span>
                              {provider && (
                                <span className="text-muted-foreground text-[10px]">
                                  via {provider.name}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 rounded border border-red-500/30 p-2 text-xs">
                          <Badge className="text-[10px] px-1.5 py-0.5 font-bold text-red-400 border-red-500/30 bg-red-500/10">
                            TD
                          </Badge>
                          <span className="text-red-400 font-mono text-[11px]">
                            Hardcoded Fallback
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            All models failed
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Model Parameters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Temperature</span>
                        <p className="font-mono text-lg">{settingsMap["temperature"] ?? "0.82"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Top P</span>
                        <p className="font-mono text-lg">{settingsMap["top_p"] ?? "0.92"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Tokens</span>
                        <p className="font-mono text-lg">{settingsMap["max_response_tokens"] ?? "1000"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Streaming</span>
                        <p className="font-mono text-lg">
                          {settingsMap["stream_enabled"] !== "false" ? "On" : "Off"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* All Settings */}
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      All Oracle Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px]">Key</TableHead>
                            <TableHead className="text-[10px]">Value</TableHead>
                            <TableHead className="text-[10px]">Type</TableHead>
                            <TableHead className="text-[10px]">Group</TableHead>
                            <TableHead className="text-[10px]">Label</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(d?.allSettings ?? []).map((setting) => (
                            <TableRow key={setting.key}>
                              <TableCell className="text-[10px] font-mono">
                                {setting.key}
                              </TableCell>
                              <TableCell className="text-[10px] font-mono max-w-[300px] truncate">
                                {setting.valueType === "json"
                                  ? truncateMiddle(setting.value, 80)
                                  : setting.value}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0"
                                >
                                  {setting.valueType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0"
                                >
                                  {setting.group}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[10px] text-muted-foreground">
                                {setting.label}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Quota Tab ────────────────────────────────────────── */}
              <TabsContent value="quota" className="space-y-5">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Quota State for Session Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d.quotaUsage ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Burst Cost</span>
                            <p className="font-mono text-lg text-amber-400">
                              {formatCostMicro(d.quotaUsage.burstCost)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              5h window ·{" "}
                              {formatRelativeTime(d.quotaUsage.burstWindowStart ?? 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Weekly Cost</span>
                            <p className="font-mono text-lg text-amber-400">
                              {formatCostMicro(d.quotaUsage.weeklyCost)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              7d window ·{" "}
                              {formatRelativeTime(d.quotaUsage.weeklyWindowStart ?? 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Question</span>
                            <p className="text-xs">
                              {formatTimestamp(d.quotaUsage.lastQuestionAt)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatRelativeTime(d.quotaUsage.lastQuestionAt)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User Plan</span>
                            <p className="font-mono text-lg">
                              {u?.role === "admin" || u?.role === "moderator"
                                ? u.role
                                : u?.tier ?? "free"}
                            </p>
                          </div>

                        </div>

                        {/* Quota limit */}
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Burst Budget
                          </span>
                          {(() => {
                            const plan =
                              u?.role === "admin" || u?.role === "moderator"
                                ? u.role
                                : u?.tier ?? "free";
                            const burstBudgetKey = `quota_burst_budget_${plan}`;
                            const burstBudgetStr = settingsMap[burstBudgetKey];
                            const burstTotal = burstBudgetStr
                              ? parseInt(burstBudgetStr, 10)
                              : plan === "free"
                                ? 50_000
                                : plan === "admin"
                                  ? 100_000_000
                                  : 500_000;
                            const used = d.quotaUsage.burstCost ?? 0;
                            const pct = Math.min(
                              100,
                              (used / burstTotal) * 100,
                            );
                            return (
                              <div className="mt-1">
                                <div className="flex items-center gap-2 text-xs mb-1">
                                  <span className="font-mono">
                                    {formatCostMicro(used)} / {formatCostMicro(burstTotal)}
                                  </span>
                                  {pct >= 100 && (
                                    <Badge className="text-[9px] px-1 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                                      EXHAUSTED
                                    </Badge>
                                  )}
                                </div>
                                <Progress
                                  value={pct}
                                  className="h-2"
                                />
                              </div>
                            );
                          })()}
                        </div>

                        {/* Raw JSON */}
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Raw Quota Record
                          </span>
                          <pre className="mt-1 p-2 rounded bg-black/20 text-[10px] text-white/50 whitespace-pre-wrap break-words font-mono max-h-32 overflow-y-auto">
                            {JSON.stringify(d.quotaUsage, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No quota record found for this user (no questions asked yet).
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Safety & Crisis Info */}
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Safety & Crisis Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-muted-foreground">Kill Switch</span>
                        <p className={settingsMap["kill_switch"] === "true" ? "text-red-400 font-bold" : "text-emerald-400"}>
                          {settingsMap["kill_switch"] === "true" ? "⛔ OFFLINE" : "✓ LIVE"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Crisis Response</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {settingsMap["crisis_response_text"] ?? "Using hardcoded default"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fallback Response</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {settingsMap["fallback_response_text"] ?? "Using hardcoded default"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground">Crisis Detection Patterns</span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        The system checks for 21 crisis keyword patterns before every LLM call.
                        If matched, the crisis response is returned immediately, no LLM call is made,
                        and <strong>quota is NOT consumed</strong>.
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Input Sanitization</span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        User questions are sanitized: any [SYSTEM...], [BIRTH...], [USER...],
                        [FEATURE...], [SAFETY...], [END...] tagged content is stripped before
                        entering the prompt. Max question length: 2000 characters.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── Global Stats (when no session selected) ─────────────────────── */}
        {!selectedSessionId && stats && (
          <Card className="border-border/30 bg-card/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-galactic" />
                Global Oracle Statistics
              </CardTitle>
              <CardDescription>
                Aggregated metrics across all Oracle sessions and messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-8">
                <MetricCard
                  label="Total Sessions"
                  value={stats.totalSessions}
                  sub={`${stats.activeSessions} active · ${stats.completedSessions} completed`}
                  icon={Database}
                />
                <MetricCard
                  label="Total Messages"
                  value={stats.totalMessages}
                  sub={`${stats.userMessages} user · ${stats.assistantMessages} assistant`}
                  icon={MessageSquare}
                />
                <MetricCard
                  label="Total Prompt Tokens"
                  value={stats.totalPromptTokens.toLocaleString()}
                  icon={Zap}
                  color="text-blue-400"
                />
                <MetricCard
                  label="Total Completion Tokens"
                  value={stats.totalCompletionTokens.toLocaleString()}
                  icon={Zap}
                  color="text-emerald-400"
                />
                <MetricCard
                  label="Fallback Usage"
                  value={stats.usedFallback}
                  sub={`${stats.fallbackResponses} hardcoded fallbacks`}
                  icon={AlertTriangle}
                  color="text-amber-400"
                />
                <MetricCard
                  label="Journal Prompts"
                  value={stats.journalPrompts}
                  sub="suggested by Oracle"
                  icon={Sparkles}
                  color="text-galactic"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Model distribution */}
                <Card className="border-border/25 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Model Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(stats.modelCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([model, count]) => (
                          <div
                            key={model}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono truncate">
                              {model.split("/").pop()}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-galactic/70 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (count / stats.totalSessions) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-muted-foreground w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Feature distribution */}
                <Card className="border-border/25 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Feature Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(stats.featureCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([feature, count]) => (
                          <div
                            key={feature}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono">
                              {featureLabel(feature)}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400/70 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (count / stats.totalSessions) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-muted-foreground w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tier usage */}
                <Card className="border-border/25 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Tier Usage (Fallback Chain)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {[...Object.entries(stats.tierCounts), ["D", stats.fallbackResponses + stats.crisisResponses + stats.killSwitchResponses] as const]
                        .filter(([_, c]) => c > 0)
                        .map(([tier, count]) => (
                          <div
                            key={tier}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Badge className={`text-[9px] px-1 py-0 font-bold ${tierColor(tier)}`}>
                              T{tier}
                            </Badge>
                            <span className="font-mono">{count}</span>
                            {tier === "D" && (
                              <span className="text-[10px] text-muted-foreground">
                                ({stats.crisisResponses} crisis · {stats.killSwitchResponses} kill-switch · {stats.fallbackResponses} fallback)
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Safety stats */}
                <Card className="border-border/25 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Safety Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Crisis</span>
                        <p className="font-mono text-lg text-red-400">
                          {stats.crisisResponses}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kill Switch</span>
                        <p className="font-mono text-lg text-amber-400">
                          {stats.killSwitchResponses}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hardcoded Fallback</span>
                        <p className="font-mono text-lg text-orange-400">
                          {stats.fallbackResponses}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
