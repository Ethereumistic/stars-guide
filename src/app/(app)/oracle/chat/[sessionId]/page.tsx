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
    ArrowDown,
} from "lucide-react";
import { GiCursedStar, GiScrollUnfurled } from "react-icons/gi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { useOracleComposerPreferences } from "@/components/oracle/input/use-oracle-composer-preferences";
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
import { OracleAssistantMessage } from "./_components/oracle-assistant-message";
import { OracleSectionStream } from "./_components/oracle-section-stream";
import { OracleTurnStatus } from "./_components/oracle-turn-status";
import { OracleTurnError } from "./_components/oracle-turn-error";
import { useOracleTurnController } from "./_hooks/use-oracle-turn-controller";
import { useSmartChatScroll } from "./_hooks/use-smart-chat-scroll";
import type { OracleConversationView } from "./_types";
import { isTerminalTurn } from "./_types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getAudioUrlRef = makeFunctionReference<"query", { storageId: Id<"_storage"> }, string | null>("oracle/sessions:getAudioUrl");
const getSessionConversationRef = makeFunctionReference<"query", { sessionId: Id<"oracle_sessions"> }, OracleConversationView | null>("oracle/sessions:getSessionConversation");
const getCurrentUserRef = makeFunctionReference<"query", Record<string, never>, any>("users:current");
const checkQuotaRef = makeFunctionReference<"query", Record<string, never>, OracleQuotaSnapshot>("oracle/quota:checkQuota");
const setMessageOutcomeRef = makeFunctionReference<"mutation", { messageId: Id<"oracle_messages">; outcome?: "resonant" | "not_relevant" | "not_yet_known" }, null>("oracle/feedback:setMessageOutcome");
const toggleWatchItemRef = makeFunctionReference<"mutation", { messageId: Id<"oracle_messages">; reviewInDays?: number }, { saved: boolean }>("oracle/feedback:toggleWatchItem");
const addMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:addMessage");
const updateSessionFeatureRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:updateSessionFeature");
const updateBirthChartDepthRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:setSessionBirthChartDepth");
const rateMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:rateMessage");
const unrateMessageRef = makeFunctionReference<"mutation", any, any>("oracle/sessions:unrateMessage");
const ensureTurnForUnansweredMessageRef = makeFunctionReference<"mutation", {
    sessionId: Id<"oracle_sessions">;
    clientRequestId: string;
    timezone?: string;
}, unknown>("oracle/turns:ensureTurnForUnansweredMessage");
const recordFirstClientVisibleRef = makeFunctionReference<"mutation", {
    turnId: Id<"oracle_turns">;
    timestamp: number;
}, { recorded: boolean; timestamp: number }>("oracle/turns:recordFirstClientVisible");
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
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const [shared, setShared] = useState<string | null>(null);
    const [ratingOverrides, setRatingOverrides] = useState<Record<string, "positive" | "negative" | "none">>({});
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [dismissedReportReadyForSession, setDismissedReportReadyForSession] = useState<string | null>(null);
    const { user } = useUserStore();
    const legacyMigrationStartedRef = useRef(false);
    const reportOnboardingRepairStartedRef = useRef(false);
    const recordedVisibleTurnIdsRef = useRef(new Set<string>());

    const {
        state,
        selectedFeatureKey,
        birthChartDepth,
        setSessionId,
        setSelectedFeature,
        setBirthChartDepth,
        clearSelectedFeature,
        setConversationActive,
        timezone,
        debugModelOverride,
        setUsageOpen,
        setUpgradeOpen,
        setDebugClientTiming,
    } = useOracleStore();

    const sessionData = useQuery(getSessionConversationRef, { sessionId });
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
    const ensureTurnForUnansweredMessage = useMutation(ensureTurnForUnansweredMessageRef);
    const recordFirstClientVisible = useMutation(recordFirstClientVisibleRef);
    const submitBirthReportQuestionnaire = useAction(submitBirthReportQuestionnaireRef);
    const enqueueBirthReport = useAction(enqueueBirthReportRef);
    const turnController = useOracleTurnController({
        sessionId,
        activeTurn: sessionData?.activeTurn ?? null,
        timezone,
        debugModelOverride,
    });
    const contentVersion = sessionData
        ? `${sessionData.messages.length}:${sessionData.activeTurn?.lastSequence ?? 0}:${sessionData.activeTurn?.status ?? "idle"}`
        : "loading";
    const smartScroll = useSmartChatScroll(contentVersion);

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
        if (!sessionData) return;
        setSessionId(sessionId);
        setConversationActive();
    }, [sessionData, sessionId, setConversationActive, setSessionId]);

    useEffect(() => {
        if (!sessionData?.messages || !turnController.pendingContent) return;
        const found = sessionData.messages.some(
            (m) => m.role === "user" && m.content === turnController.pendingContent
        );
        if (found) turnController.clearPendingContent();
    }, [sessionData?.messages, turnController]);

    useEffect(() => {
        const activeTurn = sessionData?.activeTurn;
        if (!activeTurn) return;
        const currentState = useOracleStore.getState().debugClientTiming;
        const assistant = sessionData.messages.find((message) => message._id === activeTurn.assistantMessageId);
        if (!currentState.requestStartMs || currentState.requestStartMs !== activeTurn.createdAt) {
            setDebugClientTiming({
                requestStartMs: activeTurn.createdAt,
                firstContentMs: assistant?.content ? Date.now() : null,
                completeMs: null,
            });
        } else if (!currentState.firstContentMs && assistant?.content) {
            setDebugClientTiming({
                requestStartMs: activeTurn.createdAt,
                firstContentMs: Date.now(),
                completeMs: null,
            });
        }
    }, [sessionData?.activeTurn, sessionData?.messages, setDebugClientTiming]);

    useEffect(() => {
        if (!sessionData) return;
        const turn = [...sessionData.turns].reverse().find((candidate) => {
            if (candidate.firstClientVisibleAt !== undefined) return false;
            const message = sessionData.messages.find((item) => item._id === candidate.assistantMessageId);
            const hasPublishedSection = sessionData.sections.some(
                (section) => section.turnId === candidate._id && section.status === "published" && Boolean(section.content),
            );
            return Boolean(message?.content) || hasPublishedSection;
        });
        if (!turn || recordedVisibleTurnIdsRef.current.has(String(turn._id))) return;
        recordedVisibleTurnIdsRef.current.add(String(turn._id));
        void recordFirstClientVisible({ turnId: turn._id, timestamp: Date.now() }).catch(() => {
            recordedVisibleTurnIdsRef.current.delete(String(turn._id));
        });
    }, [recordFirstClientVisible, sessionData]);

    useEffect(() => {
        if (!sessionData?.turns.length) return;
        const latestTurn = sessionData.turns[sessionData.turns.length - 1];
        if (!isTerminalTurn(latestTurn)) return;
        const timing = useOracleStore.getState().debugClientTiming;
        if (timing.requestStartMs !== latestTurn.createdAt || timing.completeMs) return;
        setDebugClientTiming({
            requestStartMs: latestTurn.createdAt,
            firstContentMs: timing.firstContentMs,
            completeMs: latestTurn.completedAt ?? latestTurn.failedAt ?? latestTurn.cancelledAt ?? latestTurn.updatedAt,
        });
    }, [sessionData?.turns, setDebugClientTiming]);

    useEffect(() => {
        if (!sessionData || sessionData.activeTurn || legacyMigrationStartedRef.current) return;
        const lastMessage = sessionData.messages[sessionData.messages.length - 1];
        const dedicatedReport = sessionData.featureKey === "birth_chart_report";
        if (!lastMessage || lastMessage.role !== "user" || isBinauralBeatMessage(lastMessage.content) || dedicatedReport) return;
        legacyMigrationStartedRef.current = true;
        void ensureTurnForUnansweredMessage({
            sessionId,
            clientRequestId: crypto.randomUUID(),
            timezone,
        }).catch((error) => {
            legacyMigrationStartedRef.current = false;
            console.error("Failed to migrate the unanswered Oracle message:", error);
        });
    }, [ensureTurnForUnansweredMessage, sessionData, sessionId, timezone]);

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

    const handleRecover = useCallback(async (turn: NonNullable<OracleConversationView["activeTurn"]>) => {
        try {
            const result = await turnController.recover(turn);
            if (result?.existingActive && result.sessionId !== sessionId) {
                router.push(`/oracle/chat/${result.sessionId}`);
            }
        } catch (error) {
            console.error("Oracle recovery failed:", error);
        }
    }, [router, sessionId, turnController]);

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
        if (!content || turnController.busy) return;

        setInputValue("");

        // Do NOT clear the session feature — the chart bubble in chat must persist.

        try {
            const result = await turnController.begin({
                content,
                modelOptionKey: composerPreferences.modelOptionKey,
                reasoningEffort: composerPreferences.reasoningEffort,
            });
            if (!result) {
                setInputValue(content);
            } else if (result.existingActive && result.sessionId !== sessionId) {
                router.push(`/oracle/chat/${result.sessionId}`);
            } else if (selectedFeatureKey) {
                clearSelectedFeature();
            }
        } catch (error) {
            setInputValue(content);
            console.error("Failed to begin the Oracle turn:", error);
        }
    }, [inputValue, selectedFeatureKey, turnController, clearSelectedFeature, composerPreferences.modelOptionKey, composerPreferences.reasoningEffort, router, sessionId]);

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
        if (turnController.busy) return;
        const content = "I’m ready — show me what stands out in my chart.";
        await addMessageMutation({ sessionId, role: "user", content });
        await submitBirthReportQuestionnaire({ answers, sessionId, priority: 2 });
    }, [turnController.busy, addMessageMutation, sessionId, submitBirthReportQuestionnaire]);

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

    // Single source of truth: Convex reactive data plus the mutation-pending user bubble.
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
        turnId: m.turnId,
        streamProtocolVersion: m.streamProtocolVersion,
    }));
    const allMessages = turnController.pendingContent && !serverMessages.some(m => m.role === "user" && m.content === turnController.pendingContent)
        ? [...serverMessages, { role: "user" as const, content: turnController.pendingContent, createdAt: Date.now(), _id: undefined as Id<"oracle_messages"> | undefined, rating: undefined as "positive" | "negative" | undefined, journalPrompt: undefined as string | undefined, turnId: undefined, streamProtocolVersion: undefined }]
        : serverMessages;
    const turnById = new Map(sessionData.turns.map((turn) => [String(turn._id), turn]));

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
    const isBusyOrQuotaBlocked = turnController.busy || !!quotaExhausted;
    const isInputDisabled = isBusyOrQuotaBlocked || reportQuestionnaireActive || reportGenerating;
    const inputPlaceholder = reportQuestionnaireActive
        ? "Answer the report questions above…"
        : reportGenerating
            ? "Your report is being crafted…"
            : turnController.busy
        ? "Oracle is working on this reading…"
        : quotaExhausted
            ? "Quota exhausted"
            : "Ask a follow-up...";

    return (
        <div className="relative flex-1 flex flex-col overflow-hidden z-10">
            {/* Messages area */}
            <div ref={smartScroll.viewportRef} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10">
                <div ref={smartScroll.contentRef} className="max-w-3xl mx-auto space-y-6">
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
                                    const turn = msg.turnId ? turnById.get(String(msg.turnId)) : undefined;
                                    const turnSections = turn
                                        ? sessionData.sections.filter((section) => section.turnId === turn._id)
                                        : [];
                                    const isStreamingThis = Boolean(turn?.active);
                                    const terminalWithContent = Boolean(msg.content) && (!turn || isTerminalTurn(turn));
                                    const rendersValidatedSections = Boolean(
                                        turn?.publicationMode === "validated_sections" && turnSections.some((section) => section.content),
                                    );
                                    // Binaural params from message metadata (deterministic generation)
                                    const beatParams = !isStreamingThis ? (msg as any).binauralParams as (BinauralBeatParams & { rationale?: any }) | undefined : undefined;

                                    // Empty streaming message → show loading dots
                                    // Normal or streaming-with-content assistant message
                                    const displayContent = msg.content;
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
                                            {rendersValidatedSections && turn ? (
                                                <OracleSectionStream turn={turn} sections={turnSections} />
                                            ) : shouldFakeStreamOnboarding ? (
                                                <FakeStreamingOnboardingMessage content={displayContent} />
                                            ) : displayContent ? (
                                                <OracleAssistantMessage content={displayContent} growing={isStreamingThis} />
                                            ) : null}
                                            {turn?.active && (
                                                <OracleTurnStatus
                                                    turn={turn}
                                                    sections={turnSections}
                                                    stopping={turnController.stopMutationPending}
                                                    onStop={() => void turnController.stop()}
                                                />
                                            )}
                                            {turn && isTerminalTurn(turn) && (
                                                <OracleTurnError
                                                    turn={turn}
                                                    recovering={turnController.recoveryMutationPending}
                                                    onRecover={() => void handleRecover(turn)}
                                                />
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
                                            {terminalWithContent && (
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

                    <div ref={smartScroll.bottomRef} />
                </div>
            </div>

            <AnimatePresence>
                {smartScroll.showJumpToLatest && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={smartScroll.jumpToLatest}
                            className="pointer-events-auto rounded-full border-white/12 bg-background/90 px-3 text-xs text-white/70 shadow-xl backdrop-blur-xl hover:border-galactic/25 hover:bg-background hover:text-white"
                        >
                            <ArrowDown className="mr-1.5 size-3.5" aria-hidden="true" />
                            Jump to latest
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                        disabled={turnController.busy}
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
