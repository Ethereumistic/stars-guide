"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Id } from "@/../convex/_generated/dataModel";
import {
    Copy,
    Check,
    Loader2,
    Clock,
    ThumbsUp,
    ThumbsDown,
    RotateCcw,
    Share2,
    Bookmark,
    CircleDot,
    CircleHelp,
    CircleX,
} from "lucide-react";
import { GiCursedStar, GiScrollUnfurled } from "react-icons/gi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { useOracleComposerPreferences } from "@/components/oracle/input/use-oracle-composer-preferences";
import type { ReasoningEffort } from "@/lib/ai/inference-preferences";
import type { OracleQuotaSnapshot } from "@/components/oracle/quota-meter";
import { BirthReportQuestionnaire } from "@/components/oracle/birth-report/BirthReportQuestionnaire";
import { BinauralBeatHistoryCard } from "@/components/oracle/input/binaural-beat-history-card";
import {
    isBeatMessage as isBinauralBeatMessage,
    parseBeat as parseBinauralBeatMessage,
    serializeBeat as serializeBinauralBeatMessage,
    type BinauralBeatParams,
} from "@/lib/binaural-presets";
import { Button } from "@/components/ui/button";
import { getFeatureDefaultPrompt, isBirthChartFeature, isSynastryFeature, isImplementedFeature, type OracleFeatureKey } from "@/lib/oracle/features";
import { useOracleStore } from "@/store/use-oracle-store";
import { OracleChartBubble } from "@/components/oracle/input/oracle-chart-bubble";
import { SynastryChartBubble } from "@/components/oracle/input/synastry-chart-bubble";
import { useUserStore } from "@/store/use-user-store";
import { useLoadingMessage } from "@/hooks/use-loading-message";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getAudioUrlRef = makeFunctionReference<"query", { storageId: Id<"_storage"> }, string | null>("oracle/sessions:getAudioUrl");
type OracleSessionMessage = {
    _id: Id<"oracle_messages">;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
    rating?: "positive" | "negative";
    outcome?: "resonant" | "not_relevant" | "not_yet_known";
    watchReviewAt?: number;
    [key: string]: unknown;
};
type OracleSessionView = {
    featureKey?: string;
    modelOptionKey?: string;
    reasoningEffort?: ReasoningEffort;
    status: "active" | "completed";
    messages: OracleSessionMessage[];
};
const getSessionWithMessagesRef = makeFunctionReference<"query", { sessionId: Id<"oracle_sessions"> }, OracleSessionView | null>("oracle/sessions:getSessionWithMessages");
const getCurrentUserRef = makeFunctionReference<"query", Record<string, never>, any>("users:current");
const checkQuotaRef = makeFunctionReference<"query", Record<string, never>, OracleQuotaSnapshot>("oracle/quota:checkQuota");
const setMessageOutcomeRef = makeFunctionReference<"mutation", { messageId: Id<"oracle_messages">; outcome?: "resonant" | "not_relevant" | "not_yet_known" }, null>("oracle/feedback:setMessageOutcome");
const toggleWatchItemRef = makeFunctionReference<"mutation", { messageId: Id<"oracle_messages">; reviewInDays?: number }, { saved: boolean }>("oracle/feedback:toggleWatchItem");
const addMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:addMessage");
const updateSessionFeatureRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:updateSessionFeature");
const updateBirthChartDepthRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:setSessionBirthChartDepth");
const rateMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:rateMessage");
const unrateMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:unrateMessage");
const invokeOracleRef = makeFunctionReference<"action", any, any>("oracle/llm:invokeOracle");
const submitBirthReportQuestionnaireRef = makeFunctionReference<"action", any, any>("birthChartReport/queue:submitReportQuestionnaire");
const enqueueBirthReportRef = makeFunctionReference<"action", { priority?: number }, any>("birthChartReport/queue:enqueueMyReportGeneration");
const ensureBirthReportOnboardingRef = makeFunctionReference<"mutation", { sessionId: Id<"oracle_sessions"> }, { repaired: boolean }>("birthChartReport/queue:ensureMyReportOnboarding");

/** Component that resolves a Convex storage ID into a playable <audio> element */
function AudioPlayer({ storageId }: { storageId: string }) {
    // Keep this leaf query from forcing TypeScript to instantiate the entire large API graph.
    const audioUrl = useQuery(getAudioUrlRef, { storageId: storageId as Id<"_storage"> });
    if (!audioUrl) {
        return (
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading audio...
            </div>
        );
    }
    return (
        <div className="mt-3">
            <audio
                controls
                src={audioUrl}
                className="w-full h-10 opacity-80 hover:opacity-100 transition-opacity"
            />
        </div>
    );
}

/** Component that renders assistant message content with blur-reveal animation on trailing text when streaming */
function FakeStreamingOnboardingMessage({ content }: { content: string }) {
    const [visible, setVisible] = React.useState(0);
    React.useEffect(() => {
        setVisible(0);
        const words = content.split(/(\s+)/);
        const id = window.setInterval(() => {
            setVisible((v) => {
                if (v >= words.length) {
                    window.clearInterval(id);
                    return v;
                }
                return v + 2;
            });
        }, 55);
        return () => window.clearInterval(id);
    }, [content]);
    const words = content.split(/(\s+)/);
    const done = visible >= words.length;
    return <AssistantMessageContent content={words.slice(0, visible).join("")} isStreamingThis={!done} />;
}

function AssistantMessageContent({ content, isStreamingThis }: { content: string; isStreamingThis: boolean }) {
    // Split at a safe word boundary ~25 chars from the end (2-3 words) for the blur-reveal effect
    const BLUR_CHARS = 25;
    let stableText = content;
    let blurText = "";

    if (isStreamingThis && content.length > BLUR_CHARS + 10) {
        // Find a word-safe split point (space or newline) before the BLUR_CHARS boundary
        let splitIdx = content.length - BLUR_CHARS;
        // Walk backward to nearest word boundary, but don't go past 50% of content
        const minSplit = Math.floor(content.length * 0.5);
        while (splitIdx > minSplit && content[splitIdx] !== ' ' && content[splitIdx] !== '\n') {
            splitIdx--;
        }
        // If we couldn't find a good split, fall back to exact BLUR_CHARS
        if (splitIdx <= minSplit) {
            splitIdx = content.length - BLUR_CHARS;
        }
        stableText = content.slice(0, splitIdx);
        blurText = content.slice(splitIdx);
    }

    if (!isStreamingThis || !blurText) {
        return (
            <div className="oracle-markdown">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h2: ({ children }) => (
                            <h2 className="text-lg md:text-xl font-semibold text-white/95 mt-6 mb-3 border-b border-white/8 pb-2 tracking-tight">
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="text-base md:text-lg font-semibold text-white/85 mt-4 mb-2">
                                {children}
                            </h3>
                        ),
                        p: ({ children }) => (
                            <p className="text-base md:text-lg text-white/90 leading-relaxed mb-4">
                                {children}
                            </p>
                        ),
                        strong: ({ children }) => (
                            <strong className="font-semibold text-white">{children}</strong>
                        ),
                        em: ({ children }) => (
                            <em className="italic text-galactic/90">{children}</em>
                        ),
                        ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-5 space-y-1.5 my-3">{children}</ul>
                        ),
                        ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-5 space-y-1.5 my-3">{children}</ol>
                        ),
                        li: ({ children }) => (
                            <li className="text-base md:text-lg text-white/90 leading-relaxed">{children}</li>
                        ),
                        hr: () => (
                            <hr className="border-white/8 my-6" />
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                                <table className="w-full text-sm border-collapse">{children}</table>
                            </div>
                        ),
                        thead: ({ children }) => (
                            <thead className="border-b border-white/15">{children}</thead>
                        ),
                        th: ({ children }) => (
                            <th className="px-3 py-2 text-left text-white/70 font-medium">{children}</th>
                        ),
                        td: ({ children }) => (
                            <td className="px-3 py-2 text-white/85 border-b border-white/5">{children}</td>
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-galactic/40 pl-4 my-3 text-white/70 italic">
                                {children}
                            </blockquote>
                        ),
                        code: ({ children }) => (
                            <code className="bg-white/8 px-1.5 py-0.5 rounded text-sm font-mono text-galactic/90">
                                {children}
                            </code>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
                {isStreamingThis && (
                    <span className="inline-block w-2 h-4 bg-galactic/60 ml-0.5 animate-pulse rounded-sm" />
                )}
            </div>
        );
    }

    // Streaming with blur-reveal: render stable portion with markdown,
    // trailing portion in a blur→clear animated span
    return (
        <div className="oracle-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: ({ children }) => (
                        <h2 className="text-lg md:text-xl font-semibold text-white/95 mt-6 mb-3 border-b border-white/8 pb-2 tracking-tight">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-base md:text-lg font-semibold text-white/85 mt-4 mb-2">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className="text-base md:text-lg text-white/90 leading-relaxed mb-0">
                            {children}
                        </p>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-galactic/90">{children}</em>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-5 space-y-1.5 my-3">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-5 space-y-1.5 my-3">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-base md:text-lg text-white/90 leading-relaxed">{children}</li>
                    ),
                    hr: () => (
                        <hr className="border-white/8 my-6" />
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="w-full text-sm border-collapse">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="border-b border-white/15">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 text-left text-white/70 font-medium">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-white/85 border-b border-white/5">{children}</td>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-galactic/40 pl-4 my-3 text-white/70 italic">
                            {children}
                        </blockquote>
                    ),
                    code: ({ children }) => (
                        <code className="bg-white/8 px-1.5 py-0.5 rounded text-sm font-mono text-galactic/90">
                            {children}
                        </code>
                    ),
                }}
            >
                {stableText}
            </ReactMarkdown>
            <span
                key={blurText}
                className="oracle-blur-reveal"
                style={{ display: 'inline' }}
            >
                {blurText}
            </span>
            <span className="inline-block w-2 h-4 bg-galactic/60 ml-0.5 animate-pulse rounded-sm" />
        </div>
    );
}

export default function OracleChatPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as Id<"oracle_sessions">;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const [shared, setShared] = useState<string | null>(null);
    const [ratingOverrides, setRatingOverrides] = useState<Record<string, "positive" | "negative" | "none">>({});
    const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [dismissedReportReadyForSession, setDismissedReportReadyForSession] = useState<string | null>(null);
    const { user } = useUserStore();
    const hasInvokedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const reportOnboardingRepairStartedRef = useRef(false);

    const {
        state,
        isStreaming,
        selectedFeatureKey,
        birthChartDepth,
        setSessionId,
        setSelectedFeature,
        setBirthChartDepth,
        clearSelectedFeature,
        setConversationActive,
        setIsStreaming,
        timezone,
        debugModelOverride,
        setDebugLastMetrics,
        setUsageOpen,
        setUpgradeOpen,
        setDebugDebugModelUsed,
        setDebugClientTiming,
        setDebugPromptTokens,
        setDebugCompletionTokens,
    } = useOracleStore();

    const loadingMessage = useLoadingMessage(isStreaming);

    const sessionData = useQuery(getSessionWithMessagesRef, { sessionId });
    const composerPreferences = useOracleComposerPreferences({
        modelOptionKey: sessionData?.modelOptionKey,
        reasoningEffort: sessionData?.reasoningEffort,
    });
    const currentUser = useQuery(getCurrentUserRef, {});
    const quota = useQuery(checkQuotaRef, {});
    const quotaExhausted = quota && !quota.allowed;

    const addMessageMutation = useMutation(addMessageRef);
    const updateSessionFeatureMutation = useMutation(updateSessionFeatureRef);
    const updateBirthChartDepthMutation = useMutation(updateBirthChartDepthRef);
    const rateMessageMutation = useMutation(rateMessageRef);
    const unrateMessageMutation = useMutation(unrateMessageRef);
    const setMessageOutcomeMutation = useMutation(setMessageOutcomeRef);
    const toggleWatchItemMutation = useMutation(toggleWatchItemRef);
    const ensureBirthReportOnboarding = useMutation(ensureBirthReportOnboardingRef);
    const invokeOracle = useAction(invokeOracleRef);
    const submitBirthReportQuestionnaire = useAction(submitBirthReportQuestionnaireRef);
    const enqueueBirthReport = useAction(enqueueBirthReportRef);

    useEffect(() => {
        if (sessionData === null) {
            router.push("/oracle/new");
        }
    }, [sessionData, router]);

    useEffect(() => {
        if (!sessionData || !currentUser?.birthData || reportOnboardingRepairStartedRef.current) return;
        const report = currentUser.birthChartReport;
        const isDedicatedReportSession = sessionData.featureKey === "birth_chart_report"
            || String(report?.oracleSessionId ?? "") === String(sessionId);
        if (!isDedicatedReportSession || report?.status === "completed" || report?.onboardingStep) return;
        reportOnboardingRepairStartedRef.current = true;
        void ensureBirthReportOnboarding({ sessionId }).catch((error) => {
            reportOnboardingRepairStartedRef.current = false;
            console.error("Failed to repair Birth Chart Report onboarding:", error);
        });
    }, [sessionData, currentUser, sessionId, ensureBirthReportOnboarding]);

    useEffect(() => {
        if (!sessionData || !sessionData.messages) return;

        if ((sessionData.status === "active" || sessionData.status === "completed") && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
            setConversationActive();
        } else if (state === "oracle_responding" && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
        }
    }, [sessionData?.status, sessionData?.featureKey, sessionId, setConversationActive, setSessionId, state]);

    useEffect(() => {
        if (!sessionData?.messages || !pendingUserMessage) return;
        const found = sessionData.messages.some(
            (m) => m.role === "user" && m.content === pendingUserMessage
        );
        if (found) setPendingUserMessage(null);
    }, [sessionData?.messages?.length, pendingUserMessage]);

    // Track first content appearing for client-side TTFT measurement
    useEffect(() => {
        if (!isStreaming || !sessionData?.messages) return;
        const currentState = useOracleStore.getState().debugClientTiming;
        if (!currentState.requestStartMs || currentState.firstContentMs) return; // Already captured or not started
        // Find the last assistant message that has content
        const lastAssistant = [...sessionData.messages].reverse().find((m: any) => m.role === "assistant");
        if (lastAssistant && lastAssistant.content && lastAssistant.content.length > 0) {
            setDebugClientTiming({
                requestStartMs: currentState.requestStartMs,
                firstContentMs: Date.now(),
                completeMs: currentState.completeMs,
            });
        }
    }, [sessionData?.messages, isStreaming]);

    useEffect(() => {
        if (state !== "oracle_responding" || !sessionId || !sessionData) return;
        if (hasInvokedRef.current) return;

        const userMessages = sessionData.messages.filter((m) => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (!lastUserMessage) return;

        const assistantCount = sessionData.messages.filter((m) => m.role === "assistant").length;
        const isDedicatedReportSession = sessionData.featureKey === "birth_chart_report"
            || String(currentUser?.birthChartReport?.oracleSessionId ?? "") === String(sessionId);
        const reportOnboardingActive = Boolean(
            isDedicatedReportSession && currentUser?.birthData && currentUser.birthChartReport?.status !== "completed",
        );
        if (!reportOnboardingActive && assistantCount >= userMessages.length) {
            setConversationActive();
            return;
        }

        hasInvokedRef.current = true;

        const callOracle = async () => {
            setIsStreaming(true);
            // Track client-side timing
            const requestStartMs = Date.now();
            setDebugClientTiming({ requestStartMs, firstContentMs: null, completeMs: null });
            // Small delay to let React state settle before streaming begins
            await new Promise((resolve) => setTimeout(resolve, 50));

            try {
                const result = await invokeOracle({
                    sessionId,
                    userQuestion: lastUserMessage.content,
                    timezone,
                    ...(debugModelOverride ? { debugModelOverride } : {}),
                });
                // Capture server-side timing metrics and token counts
                if (result) {
                    setDebugLastMetrics(result.timingMetrics ?? null);
                    setDebugDebugModelUsed(result.debugModelUsed ?? null);
                    setDebugPromptTokens(result.promptTokens ?? null);
                    setDebugCompletionTokens(result.completionTokens ?? null);
                }
                // Track client completion time
                setDebugClientTiming({ requestStartMs, firstContentMs: useOracleStore.getState().debugClientTiming.firstContentMs, completeMs: Date.now() });
            } catch (error) {
                console.error("Oracle invocation failed:", error);
            } finally {
                setIsStreaming(false);
                setConversationActive();
                hasInvokedRef.current = false;
            }
        };

        callOracle();
    }, [state, sessionId, sessionData?.messages?.length, sessionData, currentUser?.birthData, currentUser?.birthChartReport?.status, invokeOracle, setConversationActive, setIsStreaming, debugModelOverride, setDebugLastMetrics, setDebugDebugModelUsed, setDebugClientTiming]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [sessionData?.messages?.length, isStreaming, pendingUserMessage]);

    useEffect(() => {
        if (!currentUser?.birthData || currentUser.birthChartReport?.status === "completed") return;
        const id = window.setInterval(() => setNowMs(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [currentUser?.birthData, currentUser?.birthChartReport?.status]);

    const handleCopy = useCallback((content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    }, []);

    const handleRate = useCallback(async (messageId: Id<"oracle_messages">, rating: "positive" | "negative") => {
        // Find the effective current rating (server-side + optimistic overlay)
        const serverMessage = sessionData?.messages?.find(m => m._id === messageId);
        const serverRating = (serverMessage as any)?.rating as "positive" | "negative" | undefined;
        const currentOverride = ratingOverrides[messageId];
        const currentRating = currentOverride === "none" ? undefined : (currentOverride ?? serverRating);

        if (currentRating === rating) {
            // Unrate — toggle off
            setRatingOverrides(prev => ({ ...prev, [messageId]: "none" }));
            try {
                await unrateMessageMutation({ messageId });
            } catch {
                setRatingOverrides(prev => {
                    const next = { ...prev };
                    delete next[messageId];
                    return next;
                });
            }
        } else {
            // Rate or change rating
            setRatingOverrides(prev => ({ ...prev, [messageId]: rating }));
            try {
                await rateMessageMutation({ messageId, rating });
            } catch {
                setRatingOverrides(prev => {
                    const next = { ...prev };
                    delete next[messageId];
                    return next;
                });
            }
        }
    }, [sessionData, ratingOverrides, rateMessageMutation, unrateMessageMutation]);

    const handleOutcome = useCallback(async (
        messageId: Id<"oracle_messages">,
        current: "resonant" | "not_relevant" | "not_yet_known" | undefined,
        next: "resonant" | "not_relevant" | "not_yet_known",
    ) => {
        await setMessageOutcomeMutation({ messageId, outcome: current === next ? undefined : next });
    }, [setMessageOutcomeMutation]);

    const handleToggleWatch = useCallback(async (messageId: Id<"oracle_messages">) => {
        await toggleWatchItemMutation({ messageId, reviewInDays: 7 });
    }, [toggleWatchItemMutation]);

    const handleShare = useCallback(async (content: string, id: string) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: "Oracle Reading — stars.guide",
                    text: content,
                });
            } else {
                await navigator.clipboard.writeText(content);
                setShared(id);
                setTimeout(() => setShared(null), 2000);
            }
        } catch {
            // Share cancelled or failed — fall back to clipboard
            try {
                await navigator.clipboard.writeText(content);
                setShared(id);
                setTimeout(() => setShared(null), 2000);
            } catch { }
        }
    }, []);

    const handleTryAgain = useCallback(async () => {
        if (isStreaming || state === "oracle_responding") return;
        const messages = sessionData?.messages;
        if (!messages) return;
        const userMessages = messages.filter(m => m.role === "user");
        const lastUserMsg = userMessages[userMessages.length - 1];
        if (!lastUserMsg) return;

        setIsStreaming(true);
        const requestStartMs = Date.now();
        setDebugClientTiming({ requestStartMs, firstContentMs: null, completeMs: null });
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const result = await invokeOracle({
                sessionId,
                userQuestion: lastUserMsg.content,
                timezone,
                ...(debugModelOverride ? { debugModelOverride } : {}),
            });
            if (result) {
                setDebugLastMetrics(result.timingMetrics ?? null);
                setDebugDebugModelUsed(result.debugModelUsed ?? null);
                setDebugPromptTokens(result.promptTokens ?? null);
                setDebugCompletionTokens(result.completionTokens ?? null);
            }
            setDebugClientTiming({ requestStartMs, firstContentMs: useOracleStore.getState().debugClientTiming.firstContentMs, completeMs: Date.now() });
        } catch (error) {
            console.error("Try again failed:", error);
        } finally {
            setIsStreaming(false);
        }
    }, [isStreaming, state, sessionData, sessionId, invokeOracle, timezone, debugModelOverride, setIsStreaming, setDebugClientTiming, setDebugLastMetrics, setDebugDebugModelUsed, setDebugPromptTokens, setDebugCompletionTokens]);

    const handleFeatureSelect = useCallback(async (featureKey: OracleFeatureKey) => {
        if (!isImplementedFeature(featureKey)) return;

        setSelectedFeature(featureKey);
        await updateSessionFeatureMutation({
            sessionId,
            featureKey,
        });
        inputRef.current?.focus();
    }, [sessionId, setSelectedFeature, updateSessionFeatureMutation]);

    const handleFeatureClear = useCallback(async () => {
        clearSelectedFeature();
        // Do NOT clear session feature here — the chart bubble in chat must persist.
    }, [clearSelectedFeature]);

    const handleBirthChartDepthChange = useCallback(async (depth: "core" | "full") => {
        setBirthChartDepth(depth);
        await updateBirthChartDepthMutation({
            sessionId,
            depth,
        });
    }, [setBirthChartDepth, sessionId, updateBirthChartDepthMutation]);

    const handleBinauralGenerate = useCallback(
        async (params: BinauralBeatParams) => {
            const message = serializeBinauralBeatMessage(params);
            await addMessageMutation({
                sessionId,
                role: "user",
                content: message,
            });
            // Do NOT call invokeOracle — this is a metadata message, not a question
        },
        [sessionId, addMessageMutation],
    );

    const handleSendFollowUp = useCallback(async () => {
        const content = inputValue.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
        if (!content || isStreaming) return;

        setInputValue("");
        setPendingUserMessage(content);

        // Dismiss the feature import card in the input area (local UI only).
        // Do NOT clear the session feature — the chart bubble in chat must persist.
        if (selectedFeatureKey) {
            clearSelectedFeature();
        }

        await addMessageMutation({
            sessionId,
            role: "user",
            content,
            modelOptionKey: composerPreferences.modelOptionKey,
            reasoningEffort: composerPreferences.reasoningEffort,
        });

        setIsStreaming(true);
        // Track client-side timing
        const requestStartMs = Date.now();
        setDebugClientTiming({ requestStartMs, firstContentMs: null, completeMs: null });
        // Small delay to let React state settle before streaming begins
        await new Promise((resolve) => setTimeout(resolve, 50));

        try {
            const result = await invokeOracle({
                sessionId,
                userQuestion: content,
                timezone,
                ...(debugModelOverride ? { debugModelOverride } : {}),
            });
            // Capture server-side timing metrics and token counts
            if (result) {
                setDebugLastMetrics(result.timingMetrics ?? null);
                setDebugDebugModelUsed(result.debugModelUsed ?? null);
                setDebugPromptTokens(result.promptTokens ?? null);
                setDebugCompletionTokens(result.completionTokens ?? null);
            }
            // Track client completion time
            setDebugClientTiming({ requestStartMs, firstContentMs: useOracleStore.getState().debugClientTiming.firstContentMs, completeMs: Date.now() });
        } catch (error) {
            console.error("Follow-up Oracle call failed:", error);
        } finally {
            setIsStreaming(false);
        }
    }, [inputValue, selectedFeatureKey, isStreaming, sessionId, addMessageMutation, invokeOracle, setIsStreaming, debugModelOverride, setDebugLastMetrics, setDebugDebugModelUsed, setDebugClientTiming, clearSelectedFeature, composerPreferences.modelOptionKey, composerPreferences.reasoningEffort]);

    const reportStatus = currentUser?.birthChartReport?.status;
    const reportOnboardingStep = currentUser?.birthChartReport?.onboardingStep;
    const reportOriginSessionId = currentUser?.birthChartReport?.oracleSessionId
        ? String(currentUser.birthChartReport.oracleSessionId)
        : null;
    const isReportOriginSession = reportOriginSessionId === String(sessionId);
    const latestOnboardingMessage = sessionData?.messages
        ?.filter((m: any) => m.role === "assistant" && m.modelUsed === "birth_chart_report_onboarding")
        .at(-1);
    const onboardingWelcomeStillRevealing = Boolean(
        latestOnboardingMessage && nowMs - latestOnboardingMessage.createdAt < 5_500,
    );
    const reportQuestionnaireActive = Boolean(
        isReportOriginSession && currentUser?.birthData && reportStatus !== "completed" && reportOnboardingStep === "questionnaire" && !onboardingWelcomeStillRevealing,
    );
    const reportGenerating = Boolean(
        isReportOriginSession && currentUser?.birthData && reportStatus !== "completed" && reportStatus !== "failed" && (reportOnboardingStep === "queued" || reportStatus === "generating"),
    );
    const reportFailed = Boolean(isReportOriginSession && currentUser?.birthData && reportStatus === "failed");
    const showReportReadyCard = Boolean(
        isReportOriginSession && reportStatus === "completed" && dismissedReportReadyForSession !== String(sessionId),
    );

    const handleReportQuestionnaireSubmit = useCallback(async (answers: any) => {
        if (isStreaming || state === "oracle_responding") return;
        const content = "I’m ready — show me what stands out in my chart.";
        setPendingUserMessage(content);
        await addMessageMutation({ sessionId, role: "user", content });
        await submitBirthReportQuestionnaire({ answers, sessionId, priority: 2 });
    }, [isStreaming, state, addMessageMutation, sessionId, submitBirthReportQuestionnaire]);

    const handleDismissReportReady = useCallback(() => {
        setDismissedReportReadyForSession(String(sessionId));
        inputRef.current?.focus();
    }, [sessionId]);

    // Compute countdown for quota cap (burst or weekly)
    const quotaCountdown = React.useMemo(() => {
        if (!quota || quota.allowed || !quota.reason) return null;
        const resetsAt = quota.reason === "burst_cap" ? quota.burstResetsAt : quota.weeklyResetsAt;
        if (!resetsAt) return null;
        const diff = resetsAt - Date.now();
        if (diff <= 0) return null;
        const hours = Math.floor(diff / 3_600_000);
        const minutes = Math.floor((diff % 3_600_000) / 60_000);
        return `${hours}h ${minutes}m`;
    }, [quota, nowMs]);

    if (!sessionData) {
        return (
            <div className="flex-1 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-galactic/50" />
            </div>
        );
    }

    // Single source of truth: Convex reactive data + optimistic pending message
    const serverMessages = sessionData.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt,
        audioData: (m as any).audioData as string | undefined,
        audioStorageId: (m as any).audioStorageId as string | undefined,
        audioUrl: (m as any).audioUrl as string | undefined,
        binauralParams: (m as any).binauralParams as (BinauralBeatParams & { rationale?: any }) | undefined,
        _id: m._id as Id<"oracle_messages">,
        rating: (m as any).rating as "positive" | "negative" | undefined,
        outcome: (m as any).outcome as "resonant" | "not_relevant" | "not_yet_known" | undefined,
        watchReviewAt: (m as any).watchReviewAt as number | undefined,
        journalPrompt: (m as any).journalPrompt as string | undefined,
        modelUsed: (m as any).modelUsed as string | undefined,
    }));
    const allMessages = pendingUserMessage && !serverMessages.some(m => m.role === "user" && m.content === pendingUserMessage)
        ? [...serverMessages, { role: "user" as const, content: pendingUserMessage, createdAt: Date.now(), _id: undefined as Id<"oracle_messages"> | undefined, rating: undefined as "positive" | "negative" | undefined, journalPrompt: undefined as string | undefined }]
        : serverMessages;

    // Show birth chart bubble in chat when session was created with birth chart feature.
    // Key off sessionData.featureKey (persisted), NOT selectedFeatureKey (ephemeral UI state)
    // so the bubble survives the user closing the import card.
    const sessionFeatureKey = (sessionData?.featureKey as OracleFeatureKey | null) ?? null;
    const showChartBubble = isBirthChartFeature(sessionFeatureKey);

    // Read synastryPayload from persisted session data (not the store, which may be cleared after submit)
    const sessionSynastryPayload = (sessionData as any)?.synastryPayload as {
        chartB: any;
        chartBName: string;
    } | null | undefined;
    const showSynastryBubble = isSynastryFeature(sessionFeatureKey)
        && sessionSynastryPayload?.chartB
        && user?.birthData;

    // Insert chart bubble(s) AFTER the first user message
    const firstUserIdx = allMessages.findIndex(m => m.role === "user");
    let renderedMessages;
    if (showSynastryBubble) {
        // Show ONLY synastry charts (both user's + partner's) — no separate birth chart bubble
        renderedMessages = [
            ...allMessages.slice(0, firstUserIdx + 1).map((m, i) => ({ ...m, _key: `msg-${i}` })),
            { role: "synastry-bubble" as const, content: "", createdAt: 0, _key: "synastry-bubble" },
            ...allMessages.slice(firstUserIdx + 1).map((m, i) => ({ ...m, _key: `msg-${firstUserIdx + 2 + i}` })),
        ];
    } else if (showChartBubble && firstUserIdx >= 0) {
        renderedMessages = [
            ...allMessages.slice(0, firstUserIdx + 1).map((m, i) => ({ ...m, _key: `msg-${i}` })),
            { role: "chart-bubble" as const, content: "", createdAt: 0, _key: "chart-bubble" },
            ...allMessages.slice(firstUserIdx + 1).map((m, i) => ({ ...m, _key: `msg-${firstUserIdx + 2 + i}` })),
        ];
    } else {
        renderedMessages = allMessages.map((m, i) => ({ ...m, _key: `msg-${i}` }));
    }

    // Determine input bar state
    const isBusyOrQuotaBlocked = isStreaming || state === "oracle_responding" || !!quotaExhausted;
    const isInputDisabled = isBusyOrQuotaBlocked || reportQuestionnaireActive || reportGenerating;
    const inputPlaceholder = reportQuestionnaireActive
        ? "Answer the report questions above…"
        : reportGenerating
            ? "Your report is being crafted…"
            : isStreaming || state === "oracle_responding"
        ? "Oracle is speaking..."
        : quotaExhausted
            ? "Quota exhausted"
            : "Ask a follow-up...";

    return (
        <div className="flex-1 flex flex-col overflow-hidden z-10">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-3xl mx-auto space-y-6">
                    {renderedMessages.map((msg, i) => {
                        if ((msg as any).role === "synastry-bubble") {
                            return (
                                <motion.div
                                    key="synastry-bubble"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <SynastryChartBubble
                                        chartAData={user!.birthData!}
                                        chartBData={sessionSynastryPayload!.chartB}
                                        username={user!.username}
                                        chartBName={sessionSynastryPayload!.chartBName}
                                    />
                                </motion.div>
                            );
                        }

                        if ((msg as any).role === "chart-bubble") {
                            return (
                                <motion.div
                                    key="chart-bubble"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <OracleChartBubble
                                        birthData={user?.birthData}
                                        username={user?.username}
                                        depth={birthChartDepth}
                                    />
                                </motion.div>
                            );
                        }
                        return (
                            <motion.div
                                key={(msg as any)._key || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className={msg.role === "assistant" ? "group" : undefined}
                            >
                                {msg.role === "user" ? (
                                    isBinauralBeatMessage(msg.content) ? (
                                        (() => {
                                            const beatParams = parseBinauralBeatMessage(msg.content);
                                            return beatParams ? (
                                                <div className="flex justify-end">
                                                    <div className="w-full max-w-2xl">
                                                        <BinauralBeatHistoryCard params={beatParams} />
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()
                                    ) : (
                                        /* User message */
                                        <div className="flex justify-end">
                                            <div className="max-w-[80%] bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md px-5 py-3.5">
                                                <p className="text-sm md:text-base text-white/90 leading-relaxed break-words">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                ) : msg.role === "assistant" ? (() => {
                                    const isLastAssistant = i === renderedMessages.length - 1 ||
                                        !renderedMessages.slice(i + 1).some(m => m.role === "assistant");
                                    const isStreamingThis = isLastAssistant && isStreaming;
                                    const isEmpty = !msg.content;

                                    // Binaural params from message metadata (deterministic generation)
                                    const beatParams = !isStreamingThis ? (msg as any).binauralParams as (BinauralBeatParams & { rationale?: any }) | undefined : undefined;

                                    // Empty streaming message → show loading dots
                                    if (isStreamingThis && isEmpty) {
                                        return (
                                            <div className="flex items-center gap-3 py-4">
                                                <GiCursedStar className="w-4 h-4 text-galactic animate-spin shrink-0" style={{ animationDuration: "3s" }} />
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    </div>
                                                    <span className="text-sm text-white/40 italic">{loadingMessage}</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Normal or streaming-with-content assistant message
                                    const displayContent = isStreamingThis
                                        ? msg.content
                                        : msg.content;
                                    const shouldFakeStreamOnboarding = !isStreamingThis
                                        && (msg as any).modelUsed === "birth_chart_report_onboarding"
                                        && Date.now() - msg.createdAt < 120_000
                                        && isLastAssistant;

                                    // Compute effective rating for action buttons
                                    const msgId = msg._id;
                                    const override = msgId ? ratingOverrides[msgId] : undefined;
                                    const effectiveRating: "positive" | "negative" | undefined = override === "none" ? undefined : (override ?? msg.rating);
                                    const isWatched = Boolean(msg.watchReviewAt);
                                    const isReviewDue = Boolean(msg.watchReviewAt && msg.watchReviewAt <= nowMs && !msg.outcome);

                                    return (
                                        <div className="flex-1 min-w-0 py-2">
                                            {shouldFakeStreamOnboarding ? (
                                                <FakeStreamingOnboardingMessage content={displayContent} />
                                            ) : (
                                                <AssistantMessageContent content={displayContent} isStreamingThis={isStreamingThis} />
                                            )}
                                            {(msg as any).audioUrl ? (
                                                <div className="mt-4">
                                                    <audio
                                                        controls
                                                        src={(msg as any).audioUrl}
                                                        className="w-full h-10 opacity-80 hover:opacity-100 transition-opacity"
                                                    />
                                                </div>
                                            ) : (msg as any).audioStorageId ? (
                                                <div className="mt-4">
                                                    <AudioPlayer storageId={(msg as any).audioStorageId} />
                                                </div>
                                            ) : (msg as any).audioData && !isStreamingThis ? (
                                                <div className="mt-4">
                                                    <audio
                                                        controls
                                                        src={`data:audio/wav;base64,${(msg as any).audioData}`}
                                                        className="w-full h-10 opacity-80 hover:opacity-100 transition-opacity"
                                                    />
                                                </div>
                                            ) : null}
                                            {/* Actions — visible on last response, hover-visible on earlier ones */}
                                            {!isStreamingThis && (
                                                <div className={
                                                    isLastAssistant
                                                        ? "flex items-center gap-1 mt-3 opacity-100 transition-opacity duration-200"
                                                        : "flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                }>
                                                    {/* Copy */}
                                                    <button
                                                        onClick={() => handleCopy(msg.content, "msg-" + i)}
                                                        className="text-white/20 hover:text-white/50 transition-colors p-1"
                                                        aria-label="Copy response"
                                                    >
                                                        {copied === "msg-" + i ? (
                                                            <Check className="w-3.5 h-3.5 text-galactic" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>

                                                    {/* Thumbs up */}
                                                    {msgId && (
                                                        <button
                                                            onClick={() => handleRate(msgId, "positive")}
                                                            className={effectiveRating === "positive" ? "p-1 transition-colors text-galactic" : "p-1 transition-colors text-white/20 hover:text-white/50"}
                                                            aria-label="Good response"
                                                        >
                                                            <ThumbsUp className={effectiveRating === "positive" ? "w-3.5 h-3.5 fill-current" : "w-3.5 h-3.5"} />
                                                        </button>
                                                    )}

                                                    {/* Thumbs down */}
                                                    {msgId && (
                                                        <button
                                                            onClick={() => handleRate(msgId, "negative")}
                                                            className={effectiveRating === "negative" ? "p-1 transition-colors text-galactic" : "p-1 transition-colors text-white/20 hover:text-white/50"}
                                                            aria-label="Bad response"
                                                        >
                                                            <ThumbsDown className={effectiveRating === "negative" ? "w-3.5 h-3.5 fill-current" : "w-3.5 h-3.5"} />
                                                        </button>
                                                    )}

                                                    {/* Explicit, user-controlled retention: save a signal and review it later. */}
                                                    {msgId && (
                                                        <button
                                                            onClick={() => handleToggleWatch(msgId)}
                                                            className={isWatched ? "p-1 transition-colors text-galactic" : "p-1 transition-colors text-white/20 hover:text-white/50"}
                                                            aria-label={isWatched ? "Remove from saved signals" : "Keep this signal for a seven-day review"}
                                                            title={isWatched ? "Saved for review" : "Keep for 7 days"}
                                                        >
                                                            <Bookmark className={isWatched ? "w-3.5 h-3.5 fill-current" : "w-3.5 h-3.5"} />
                                                        </button>
                                                    )}

                                                    {msgId && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className={msg.outcome ? "p-1 transition-colors text-galactic" : "p-1 transition-colors text-white/20 hover:text-white/50"}
                                                                    aria-label="Say whether this reading fits"
                                                                    title="Did this fit?"
                                                                >
                                                                    <CircleDot className="w-3.5 h-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start" className="w-56 border-white/10 bg-[#11101a]/95 text-white shadow-xl backdrop-blur-xl">
                                                                <DropdownMenuLabel className="text-xs font-normal text-white/45">Did this fit real life?</DropdownMenuLabel>
                                                                <DropdownMenuSeparator className="bg-white/10" />
                                                                <DropdownMenuItem onSelect={() => handleOutcome(msgId, msg.outcome, "resonant")} className="focus:bg-white/10 focus:text-white">
                                                                    <CircleDot className="text-emerald-300" /> Resonant
                                                                    {msg.outcome === "resonant" && <Check className="ml-auto text-galactic" />}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleOutcome(msgId, msg.outcome, "not_yet_known")} className="focus:bg-white/10 focus:text-white">
                                                                    <CircleHelp className="text-amber-200" /> Not yet known
                                                                    {msg.outcome === "not_yet_known" && <Check className="ml-auto text-galactic" />}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleOutcome(msgId, msg.outcome, "not_relevant")} className="focus:bg-white/10 focus:text-white">
                                                                    <CircleX className="text-rose-300" /> Not relevant
                                                                    {msg.outcome === "not_relevant" && <Check className="ml-auto text-galactic" />}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                    {isReviewDue && (
                                                        <span className="ml-1 rounded-full border border-galactic/20 bg-galactic/5 px-2 py-0.5 text-[10px] tracking-wide text-galactic/80">
                                                            Ready to review
                                                        </span>
                                                    )}

                                                    {/* Share */}
                                                    <button
                                                        onClick={() => handleShare(msg.content, "msg-" + i)}
                                                        className="text-white/20 hover:text-white/50 transition-colors p-1"
                                                        aria-label="Share response"
                                                    >
                                                        {shared === "msg-" + i ? (
                                                            <Check className="w-3.5 h-3.5 text-galactic" />
                                                        ) : (
                                                            <Share2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>

                                                    {/* Try again — only on latest response */}
                                                    {isLastAssistant && (
                                                        <button
                                                            onClick={handleTryAgain}
                                                            className="text-white/20 hover:text-white/50 transition-colors p-1"
                                                            aria-label="Try again"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Separator + Journal about this */}
                                                    {msg.journalPrompt && (
                                                        <>
                                                            <span className="text-white/10 mx-1">| </span>
                                                            <button
                                                                onClick={() => router.push("/journal?compose=true&oracleSessionId=" + sessionId + "&prompt=" + encodeURIComponent(msg.journalPrompt!))}
                                                                className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary/80 hover:bg-primary/20 hover:text-primary transition-all"
                                                            >
                                                                <GiScrollUnfurled className="w-3 h-3" />
                                                                Journal about this
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {/* Binaural beat card — rendered from message metadata */}
                                            {!isStreamingThis && beatParams && (
                                                <div className="mt-4 w-full max-w-2xl">
                                                    {beatParams.rationale && (
                                                        <p className="text-[10px] text-white/35 italic mb-1.5 pl-1">
                                                            {beatParams.rationale.beatBand} beat
                                                            {beatParams.rationale.personalization
                                                                ? ` — ${beatParams.rationale.personalization}`
                                                                : ""}
                                                        </p>
                                                    )}
                                                    <BinauralBeatHistoryCard params={beatParams} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : null}
                            </motion.div>
                        );
                    })}

                    {/* Fallback loading: shown while isStreaming but before the streaming message appears in Convex */}
                    <AnimatePresence>
                        {isStreaming && renderedMessages[renderedMessages.length - 1]?.role !== "assistant" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 py-4"
                                aria-label="Oracle is consulting the stars"
                            >
                                <GiCursedStar className="w-4 h-4 text-galactic animate-spin shrink-0" style={{ animationDuration: "3s" }} />
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    <span className="text-sm text-white/40 italic">{loadingMessage}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input bar OR Quota Exhausted Banner at bottom */}
            <div className="shrink-0 p-4 bg-linear-to-t from-background via-background/95 to-transparent">
                <div className="max-w-3xl mx-auto">
                    {quotaExhausted ? (
                        /* Calm, composer-sized quota state */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12111a]/90 px-4 py-3.5 shadow-xl shadow-black/20 backdrop-blur-2xl sm:px-5"
                        >
                            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-galactic/60 to-transparent" />
                            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-galactic/20 bg-galactic/10">
                                        <GiCursedStar className="size-4 text-galactic" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-serif text-sm font-medium text-white/90">
                                            {quota?.reason === "weekly_cap"
                                                ? "Your weekly Oracle allowance is resting"
                                                : "The Oracle is pausing between readings"}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                                            <Clock className="size-3.5 text-galactic/70" aria-hidden="true" />
                                            {quotaCountdown
                                                ? `Available again in ${quotaCountdown}`
                                                : "Your allowance will refresh automatically"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setUsageOpen(true)}
                                        className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-3 font-serif text-xs text-white/60 hover:border-galactic/25 hover:bg-galactic/[0.07] hover:text-white"
                                    >
                                        View usage
                                    </Button>
                                    {user?.tier !== "premium" && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setUpgradeOpen(true)}
                                            className={`h-8 rounded-lg border px-3 font-serif text-xs ${user?.tier === "popular"
                                                ? "border-galactic/20 bg-galactic/10 text-galactic hover:bg-galactic/15"
                                                : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                                            }`}
                                        >
                                            Upgrade
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* ─── Normal Input Bar ─── */
                        <>
                            {reportQuestionnaireActive && (
                                <div className="mb-3">
                                    <BirthReportQuestionnaire
                                        disabled={isStreaming || state === "oracle_responding"}
                                        onSubmit={handleReportQuestionnaireSubmit}
                                    />
                                </div>
                            )}
                            {reportGenerating && !reportQuestionnaireActive && reportStatus !== "completed" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-3 rounded-2xl border border-galactic/20 bg-galactic/10 p-4 text-sm text-white/70 backdrop-blur-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-galactic" />
                                        <div>
                                            <div className="font-serif text-white">Crafting your Birth Chart Report…</div>
                                            <div className="text-xs text-white/45">I’ll let you know here as soon as it’s ready.</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {reportFailed && (
                                <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm text-white/70 backdrop-blur-xl">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div><div className="font-serif text-white">The report did not pass its final checks.</div><div className="text-xs text-white/45">Your chart data is safe. Retry starts a fresh quality-checked pass.</div></div>
                                        <Button size="sm" variant="outline" className="rounded-xl border-amber-200/20 bg-amber-200/[0.04]" onClick={() => void enqueueBirthReport({ priority: 2 })}><RotateCcw className="mr-2 size-3.5" /> Retry</Button>
                                    </div>
                                </div>
                            )}
                            {showReportReadyCard && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 backdrop-blur-xl"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="font-serif text-white">Your Birth Chart Report is ready.</div>
                                            <div className="text-xs text-white/45">Open your visual field guide, or continue with Oracle using the calculated chart.</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="rounded-xl border-primary/20 bg-primary/5" onClick={handleDismissReportReady}>Continue chatting</Button>
                                            <Button size="sm" variant="default" className="rounded-xl" onClick={() => router.push("/oracle/birth-chart-report")}>Open report</Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <OracleInput
                                inputRef={inputRef}
                                value={inputValue}
                                onValueChange={setInputValue}
                                onSubmit={handleSendFollowUp}
                                placeholder={inputPlaceholder}
                                disabled={isInputDisabled}
                                canSubmit={Boolean(inputValue.trim() || selectedFeatureKey)}
                                featureKey={selectedFeatureKey}
                                onFeatureSelect={handleFeatureSelect}
                                onFeatureClear={handleFeatureClear}
                                birthData={user?.birthData}
                                username={user?.username}
                                onBinauralGenerate={handleBinauralGenerate}
                                birthChartDepth={birthChartDepth}
                                onBirthChartDepthChange={handleBirthChartDepthChange}
                                modelOptions={composerPreferences.options}
                                modelOptionKey={composerPreferences.modelOptionKey}
                                onModelOptionChange={composerPreferences.setModelOptionKey}
                                reasoningEffort={composerPreferences.reasoningEffort}
                                onReasoningEffortChange={composerPreferences.setReasoningEffort}
                                onUpgrade={() => setUpgradeOpen(true)}
                            />

                            {/* Quota indicator */}
                            {quota && state === "conversation_active" && (
                                <div className="flex justify-end mt-2 px-2">
                                    <span className={`text-[10px] tracking-wide ${quota.burstRemaining <= 0 || quota.weeklyRemaining <= 0 ? "text-amber-400" : "text-white/25"}`}>
                                        Burst: ${(quota.burstRemaining / 1_000_000).toFixed(4)} / ${(quota.burstTotal / 1_000_000).toFixed(2)}
                                        {quota.burstResetsAt
                                            ? ` — resets ${new Date(quota.burstResetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                                            : ""}
                                        {" · "}
                                        Week: ${(quota.weeklyRemaining / 1_000_000).toFixed(4)} / ${(quota.weeklyTotal / 1_000_000).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
