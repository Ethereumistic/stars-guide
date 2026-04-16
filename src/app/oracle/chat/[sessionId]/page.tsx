"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
    Send,
    Copy,
    Check,
    Loader2,
    CalendarDays,
    SkipForward,
    AlertTriangle,
    ArrowUpRight,
    Clock,
} from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFeatureDefaultPrompt, isImplementedFeature, type OracleFeatureKey } from "@/lib/oracle/features";
import { useOracleStore, type FollowUpData } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";

const ZODIAC_SIGNS = [
    { id: "aries", symbol: "♈", name: "Aries" },
    { id: "taurus", symbol: "♉", name: "Taurus" },
    { id: "gemini", symbol: "♊", name: "Gemini" },
    { id: "cancer", symbol: "♋", name: "Cancer" },
    { id: "leo", symbol: "♌", name: "Leo" },
    { id: "virgo", symbol: "♍", name: "Virgo" },
    { id: "libra", symbol: "♎", name: "Libra" },
    { id: "scorpio", symbol: "♏", name: "Scorpio" },
    { id: "sagittarius", symbol: "♐", name: "Sagittarius" },
    { id: "capricorn", symbol: "♑", name: "Capricorn" },
    { id: "aquarius", symbol: "♒", name: "Aquarius" },
    { id: "pisces", symbol: "♓", name: "Pisces" },
];

export default function OracleChatPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as Id<"oracle_sessions">;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [followUpInput, setFollowUpInput] = useState("");
    const [dateInput, setDateInput] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
    const { user } = useUserStore();
    const hasInvokedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const {
        state,
        isStreaming,
        followUps,
        currentFollowUpIndex,
        followUpAnswers,
        selectedFeatureKey,
        setSessionId,
        setSelectedFeature,
        clearSelectedFeature,
        hydrateSessionFeature,
        setOracleResponding,
        setConversationActive,
        setIsStreaming,
        startFollowUpCollection,
        answerFollowUp,
        skipFollowUp,
        advanceFollowUp,
    } = useOracleStore();

    const sessionData = useQuery(api.oracle.sessions.getSessionWithMessages, { sessionId });
    const followUpsData = useQuery(
        api.oracle.followUps.getFollowUpsByTemplate,
        sessionData?.templateId ? { templateId: sessionData.templateId } : "skip",
    );
    const quota = useQuery(api.oracle.quota.checkQuota);
    const quotaExhausted = quota && !quota.allowed;

    const addMessageMutation = useMutation(api.oracle.sessions.addMessage);
    const saveFollowUpAnswer = useMutation(api.oracle.sessions.saveFollowUpAnswer);
    const updateSessionFeatureMutation = useMutation(api.oracle.sessions.updateSessionFeature);
    const invokeOracle = useAction(api.oracle.llm.invokeOracle);
    const generateTitle = useAction(api.oracle.sessions.generateSessionTitle);

    // Track whether we've already triggered title generation for this session
    const titleGenTriggeredRef = useRef(false);

    // Reset title gen tracking when session changes
    useEffect(() => {
        titleGenTriggeredRef.current = false;
    }, [sessionId]);

    // Trigger AI title generation after the first Oracle response completes
    useEffect(() => {
        if (isStreaming) return;
        if (!sessionData) return;
        if (titleGenTriggeredRef.current) return;
        // Skip if AI already auto-generated a title for this session
        if ((sessionData as any).titleGenerated) return;

        const hasCompleteAssistant = sessionData.messages.some(
            (m) => m.role === "assistant" && m.content.length > 20
        );
        if (!hasCompleteAssistant) return;

        titleGenTriggeredRef.current = true;
        generateTitle({ sessionId }).catch((err) =>
            console.error("Title generation failed:", err)
        );
    }, [isStreaming, sessionData, sessionId]);

    useEffect(() => {
        if (sessionData === null) {
            router.push("/oracle/new");
        }
    }, [sessionData, router]);

    useEffect(() => {
        if (!sessionData || !sessionData.messages) return;

        const featureKey = (sessionData.featureKey as OracleFeatureKey | null) ?? null;

        if (sessionData.status === "collecting_context" && followUpsData) {
            setSessionId(sessionId);
            hydrateSessionFeature(featureKey);
            startFollowUpCollection(followUpsData as FollowUpData[]);
        } else if ((sessionData.status === "active" || sessionData.status === "completed") && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
            hydrateSessionFeature(featureKey);
            setConversationActive();
        } else if (state === "oracle_responding" && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
            hydrateSessionFeature(featureKey);
        }
    }, [sessionData?.status, sessionData?.featureKey, followUpsData, hydrateSessionFeature, sessionId, setConversationActive, setSessionId, startFollowUpCollection, state]);

    useEffect(() => {
        if (!sessionData?.messages || !pendingUserMessage) return;
        const found = sessionData.messages.some(
            (m) => m.role === "user" && m.content === pendingUserMessage
        );
        if (found) setPendingUserMessage(null);
    }, [sessionData?.messages?.length, pendingUserMessage]);

    useEffect(() => {
        if (state !== "oracle_responding" || !sessionId || !sessionData) return;
        if (hasInvokedRef.current) return;

        const userMessages = sessionData.messages.filter((m) => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (!lastUserMessage) return;

        const assistantCount = sessionData.messages.filter((m) => m.role === "assistant").length;
        if (assistantCount >= userMessages.length) {
            setConversationActive();
            return;
        }

        hasInvokedRef.current = true;

        const callOracle = async () => {
            setIsStreaming(true);
            await new Promise((resolve) => setTimeout(resolve, 500));

            try {
                await invokeOracle({
                    sessionId,
                    userQuestion: lastUserMessage.content,
                });
            } catch (error) {
                console.error("Oracle invocation failed:", error);
            } finally {
                setIsStreaming(false);
                setConversationActive();
                hasInvokedRef.current = false;
            }
        };

        callOracle();
    }, [state, sessionId, sessionData?.messages?.length, sessionData, invokeOracle, setConversationActive, setIsStreaming]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [sessionData?.messages?.length, isStreaming, currentFollowUpIndex, pendingUserMessage]);

    const handleCopy = useCallback((content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    }, []);

    const handleFollowUpAnswer = useCallback(async (followUpId: string, answer: string) => {
        answerFollowUp(followUpId, answer);

        await saveFollowUpAnswer({
            sessionId,
            followUpId: followUpId as Id<"oracle_follow_ups">,
            answer,
            skipped: false,
        });

        setTimeout(() => {
            const { currentFollowUpIndex, followUps } = useOracleStore.getState();
            if (currentFollowUpIndex < followUps.length - 1) {
                advanceFollowUp();
            } else {
                setOracleResponding();
            }
        }, 400);
    }, [sessionId, answerFollowUp, saveFollowUpAnswer, advanceFollowUp, setOracleResponding]);

    const handleFollowUpSkip = useCallback(async (followUpId: string) => {
        skipFollowUp(followUpId);

        await saveFollowUpAnswer({
            sessionId,
            followUpId: followUpId as Id<"oracle_follow_ups">,
            answer: "",
            skipped: true,
        });

        setTimeout(() => {
            const { currentFollowUpIndex, followUps } = useOracleStore.getState();
            if (currentFollowUpIndex < followUps.length - 1) {
                advanceFollowUp();
            } else {
                setOracleResponding();
            }
        }, 400);
    }, [sessionId, skipFollowUp, saveFollowUpAnswer, advanceFollowUp, setOracleResponding]);

    const handleFeatureSelect = useCallback(async (featureKey: OracleFeatureKey) => {
        if (!isImplementedFeature(featureKey)) return;

        // Session feature changes are persisted here on purpose. This is the single
        // place where a mid-chat feature switch becomes the active feature for the
        // current and future turns of this session.
        setSelectedFeature(featureKey);
        await updateSessionFeatureMutation({
            sessionId,
            featureKey,
        });
        inputRef.current?.focus();
    }, [sessionId, setSelectedFeature, updateSessionFeatureMutation]);

    const handleFeatureClear = useCallback(async () => {
        clearSelectedFeature();
        await updateSessionFeatureMutation({
            sessionId,
            featureKey: undefined,
        });
    }, [clearSelectedFeature, sessionId, updateSessionFeatureMutation]);

    const handleSendFollowUp = useCallback(async () => {
        const content = followUpInput.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
        if (!content || isStreaming) return;

        setFollowUpInput("");
        setPendingUserMessage(content);

        await addMessageMutation({
            sessionId,
            role: "user",
            content,
        });

        setIsStreaming(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
            await invokeOracle({
                sessionId,
                userQuestion: content,
            });
        } catch (error) {
            console.error("Follow-up Oracle call failed:", error);
        } finally {
            setIsStreaming(false);
        }
    }, [followUpInput, selectedFeatureKey, isStreaming, sessionId, addMessageMutation, invokeOracle, setIsStreaming]);
    /* ─── Render a Follow-Up Answer Widget ─── */
    const renderAnswerWidget = (fu: FollowUpData) => {
        switch (fu.questionType) {
            case "single_select":
            case "multi_select":
                return fu.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {fu.options.map((opt) => (
                            <motion.button
                                key={opt._id}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handleFollowUpAnswer(fu._id as string, opt.value)}
                                className="px-4 py-2.5 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-galactic/15 hover:border-galactic/40 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(157,78,221,0.2)]"
                            >
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>
                ) : null;

            case "free_text":
                return (
                    <div className="flex gap-2">
                        <Input
                            placeholder={fu.placeholder ?? "Type your answer..."}
                            value={followUpInput}
                            onChange={(e) => setFollowUpInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && followUpInput.trim()) {
                                    handleFollowUpAnswer(fu._id as string, followUpInput.trim());
                                    setFollowUpInput("");
                                }
                            }}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-galactic/30"
                        />
                        <Button
                            size="sm"
                            onClick={() => {
                                if (followUpInput.trim()) {
                                    handleFollowUpAnswer(fu._id as string, followUpInput.trim());
                                    setFollowUpInput("");
                                }
                            }}
                            disabled={!followUpInput.trim()}
                            className="bg-galactic/20 hover:bg-galactic/30 text-white border-0"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "date":
                return (
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                                type="date"
                                value={dateInput}
                                onChange={(e) => setDateInput(e.target.value)}
                                className="bg-white/5 border-white/10 text-white pl-10 scheme-dark focus-visible:ring-galactic/30"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (dateInput) {
                                    handleFollowUpAnswer(fu._id as string, dateInput);
                                    setDateInput("");
                                }
                            }}
                            disabled={!dateInput}
                            className="bg-galactic/20 hover:bg-galactic/30 text-white border-0"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "sign_picker":
                return (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {ZODIAC_SIGNS.map((sign) => (
                            <motion.button
                                key={sign.id}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleFollowUpAnswer(fu._id as string, sign.name)}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-white/8 bg-white/4 hover:bg-galactic/15 hover:border-galactic/40 transition-all duration-300 group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">{sign.symbol}</span>
                                <span className="text-[10px] tracking-wider uppercase text-white/40 group-hover:text-white/70 transition-colors">{sign.name}</span>
                            </motion.button>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    // Compute countdown for daily cap (must be above early return — Rules of Hooks)
    const quotaCountdown = React.useMemo(() => {
        if (!quota || quota.reason !== "daily_cap" || !quota.resetsAt) return null;
        const diff = quota.resetsAt - Date.now();
        if (diff <= 0) return null;
        const hours = Math.floor(diff / 3_600_000);
        const minutes = Math.floor((diff % 3_600_000) / 60_000);
        return `${hours}h ${minutes}m`;
    }, [quota]);

    if (!sessionData) {
        return (
            <div className="flex-1 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-galactic/50" />
            </div>
        );
    }

    // Single source of truth: Convex reactive data + optimistic pending message
    const serverMessages = sessionData.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "follow_up_prompt",
        content: m.content,
        createdAt: m.createdAt,
    }));
    const allMessages = pendingUserMessage && !serverMessages.some(m => m.role === "user" && m.content === pendingUserMessage)
        ? [...serverMessages, { role: "user" as const, content: pendingUserMessage, createdAt: Date.now() }]
        : serverMessages;

    // Determine input bar state
    const isInputDisabled = state === "follow_up_collection" || isStreaming || state === "oracle_responding" || !!quotaExhausted;
    const inputPlaceholder = state === "follow_up_collection"
        ? "Answer above to continue..."
        : isStreaming || state === "oracle_responding"
            ? "Oracle is speaking..."
            : quotaExhausted
                ? "Quota exhausted"
                : "Ask a follow-up...";

    // Filter follow-ups for conditional logic
    const visibleFollowUps = followUps.filter((fu) => {
        if (!fu.conditionalOnFollowUpId) return true;
        // Show only if the conditional follow-up was answered with the expected value
        const depAnswer = followUpAnswers[fu.conditionalOnFollowUpId as string];
        if (!depAnswer || depAnswer === "__skipped__") return false;
        if (fu.conditionalOnValue && depAnswer !== fu.conditionalOnValue) return false;
        return true;
    });


    return (
        <div className="flex-1 flex flex-col overflow-hidden z-10">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-3xl mx-auto space-y-6">
                    {allMessages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                            {msg.role === "user" ? (
                                /* User message */
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] bg-galactic/15 border border-galactic/20 rounded-2xl rounded-br-md px-5 py-3.5">
                                        <p className="text-sm md:text-base text-white/90 leading-relaxed">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            ) : msg.role === "assistant" ? (() => {
                                const isLastAssistant = i === allMessages.length - 1 ||
                                    !allMessages.slice(i + 1).some(m => m.role === "assistant");
                                const isStreamingThis = isLastAssistant && isStreaming;
                                const isEmpty = !msg.content;

                                // Empty streaming message → show loading dots
                                if (isStreamingThis && isEmpty) {
                                    return (
                                        <div className="flex gap-3">
                                            <div className="shrink-0 w-8 h-8 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center mt-1">
                                                <GiCursedStar className="w-4 h-4 text-galactic animate-spin" style={{ animationDuration: "3s" }} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tl-md px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                            <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                            <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                        </div>
                                                        <span className="text-sm text-white/40 italic">Consulting the stars...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // Normal or streaming-with-content assistant message
                                return (
                                    <div className="flex gap-3">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center mt-1">
                                            <GiCursedStar className={`w-4 h-4 text-galactic ${isStreamingThis ? 'animate-spin' : ''}`} style={isStreamingThis ? { animationDuration: "3s" } : undefined} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tl-md px-5 py-4">
                                                <div className="text-sm md:text-base text-white/85 leading-relaxed whitespace-pre-wrap">
                                                    {msg.content}
                                                    {isStreamingThis && (
                                                        <span className="inline-block w-2 h-4 bg-galactic/60 ml-0.5 animate-pulse rounded-sm" />
                                                    )}
                                                </div>
                                            </div>
                                            {/* Actions — only show when not streaming */}
                                            {!isStreamingThis && (
                                                <div className="flex items-center gap-2 mt-2 px-2">
                                                    <button
                                                        onClick={() => handleCopy(msg.content, `msg-${i}`)}
                                                        className="text-white/25 hover:text-white/60 transition-colors"
                                                        aria-label="Copy response"
                                                    >
                                                        {copied === `msg-${i}` ? (
                                                            <Check className="w-3.5 h-3.5 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : null}
                        </motion.div>
                    ))}

                    {/* Follow-up collection UI */}
                    <AnimatePresence>
                        {state === "follow_up_collection" && visibleFollowUps.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.4 }}
                                className="space-y-5"
                            >
                                {visibleFollowUps.map((fu, idx) => {
                                    const globalIdx = followUps.indexOf(fu);
                                    if (globalIdx > currentFollowUpIndex) return null;
                                    const isActive = globalIdx === currentFollowUpIndex;
                                    const answered = followUpAnswers[fu._id as string];

                                    return (
                                        <motion.div
                                            key={fu._id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.4 }}
                                        >
                                            {/* Oracle asking the follow-up */}
                                            <div className="flex gap-3 mb-3">
                                                <div className="shrink-0 w-8 h-8 rounded-full bg-galactic/10 border border-galactic/20 flex items-center justify-center mt-1">
                                                    <GiCursedStar className="w-4 h-4 text-galactic/60" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">
                                                        Question {idx + 1} of {visibleFollowUps.length}
                                                    </p>
                                                    <p className="text-sm text-white/70">
                                                        {fu.questionText}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Answer widget */}
                                            {isActive && !answered ? (
                                                <div className="ml-11 space-y-3">
                                                    {renderAnswerWidget(fu)}

                                                    {/* Skip button for optional */}
                                                    {!fu.isRequired && (
                                                        <button
                                                            onClick={() => handleFollowUpSkip(fu._id as string)}
                                                            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"
                                                        >
                                                            <SkipForward className="w-3 h-3" />
                                                            Skip this question
                                                        </button>
                                                    )}
                                                </div>
                                            ) : answered ? (
                                                <motion.div
                                                    className="ml-11"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.25 }}
                                                >
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-galactic/10 border border-galactic/20 text-sm text-galactic/80">
                                                        <Check className="w-3 h-3" />
                                                        {answered === "__skipped__" ? "Skipped" : answered}
                                                    </span>
                                                </motion.div>
                                            ) : null}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Fallback loading: shown while isStreaming but before the streaming message appears in Convex */}
                    <AnimatePresence>
                        {isStreaming && allMessages[allMessages.length - 1]?.role !== "assistant" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex gap-3 items-start"
                                aria-label="Oracle is consulting the stars"
                            >
                                <div className="shrink-0 w-8 h-8 rounded-full bg-galactic/15 border border-galactic/25 flex items-center justify-center">
                                    <GiCursedStar className="w-4 h-4 text-galactic animate-spin" style={{ animationDuration: "3s" }} />
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tl-md px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <span className="w-2 h-2 rounded-full bg-galactic/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </div>
                                            <span className="text-sm text-white/40 italic">Consulting the stars...</span>
                                        </div>
                                    </div>
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
                        /* ─── Quota Exhausted Banner ─── */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-950/30 backdrop-blur-2xl p-5"
                        >
                            <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none" />
                            <div className="relative flex items-start gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {quota?.reason === "lifetime_cap" ? (
                                        <>
                                            <p className="text-sm font-medium text-amber-200/90 mb-1">
                                                You&apos;ve used all free Oracle sessions
                                            </p>
                                            <p className="text-xs text-amber-200/50 mb-3 leading-relaxed">
                                                Upgrade to Cosmic Flow or Oracle tier to continue consulting the stars — or purchase more with StarDust.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-galactic hover:bg-galactic/80 text-white text-xs gap-1.5 rounded-xl"
                                                    onClick={() => router.push("/pricing")}
                                                >
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                    Upgrade
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-amber-500/20 text-amber-200/70 hover:bg-amber-500/10 text-xs rounded-xl"
                                                    onClick={() => router.push("/stardust")}
                                                >
                                                    Buy StarDust
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-amber-200/90 mb-1">
                                                You&apos;ve reached today&apos;s limit
                                            </p>
                                            <p className="text-xs text-amber-200/50 leading-relaxed flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Oracle returns in {quotaCountdown ?? "a few hours"}.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* ─── Normal Input Bar ─── */
                        <>
                            <OracleInput
                                inputRef={inputRef}
                                value={followUpInput}
                                onValueChange={setFollowUpInput}
                                onSubmit={handleSendFollowUp}
                                placeholder={inputPlaceholder}
                                disabled={isInputDisabled}
                                canSubmit={Boolean(followUpInput.trim() || selectedFeatureKey)}
                                featureKey={selectedFeatureKey}
                                onFeatureSelect={handleFeatureSelect}
                                onFeatureClear={handleFeatureClear}
                                birthData={user?.birthData}
                            />

                            {/* Quota indicator */}
                            {quota && quota.remaining !== undefined && state === "conversation_active" && (
                                <div className="flex justify-end mt-2 px-2">
                                    <span className={`text-[10px] tracking-wide ${quota.remaining <= 1 ? "text-amber-400" : "text-white/25"
                                        }`}>
                                        {quota.remaining} question{quota.remaining !== 1 ? "s" : ""} remaining
                                        {quota.resetsAt
                                            ? ` � resets ${new Date(quota.resetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                                            : " (lifetime)"}
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
