"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
    Copy,
    Check,
    Loader2,
    AlertTriangle,
    ArrowUpRight,
    Clock,
} from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import ReactMarkdown from "react-markdown";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { Button } from "@/components/ui/button";
import { getFeatureDefaultPrompt, isImplementedFeature, type OracleFeatureKey } from "@/lib/oracle/features";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";
import { useSmoothedContent } from "@/hooks/use-smoothed-content";
import { useLoadingMessage } from "@/hooks/use-loading-message";

/** Component that renders assistant message content with token-level smoothing when streaming */
function AssistantMessageContent({ content, isStreamingThis }: { content: string; isStreamingThis: boolean }) {
    const smoothedContent = useSmoothedContent(content, isStreamingThis, 40);
    const displayText = isStreamingThis ? smoothedContent : content;

    return (
        <div className="oracle-markdown">
            <ReactMarkdown
                components={{
                    h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-white/90 mt-4 mb-2 border-b border-white/10 pb-1">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-white/80 mt-3 mb-1">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className={`text-sm md:text-base text-white/85 leading-relaxed ${!isStreamingThis ? "mb-3" : ""}`}>
                            {children}
                        </p>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-white/95">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-galactic/80">{children}</em>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-4 space-y-1 my-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-4 space-y-1 my-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm md:text-base text-white/85 leading-relaxed">{children}</li>
                    ),
                    hr: () => (
                        <hr className="border-white/10 my-4" />
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
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
                        <blockquote className="border-l-2 border-galactic/40 pl-3 my-2 text-white/70 italic">
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
                {displayText}
            </ReactMarkdown>
            {isStreamingThis && (
                <span className="inline-block w-2 h-4 bg-galactic/60 ml-0.5 animate-pulse rounded-sm" />
            )}
        </div>
    );
}

export default function OracleChatPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as Id<"oracle_sessions">;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [copied, setCopied] = useState<string | null>(null);
    const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
    const { user } = useUserStore();
    const hasInvokedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const {
        state,
        isStreaming,
        selectedFeatureKey,
        setSessionId,
        setSelectedFeature,
        clearSelectedFeature,
        hydrateSessionFeature,
        setConversationActive,
        setIsStreaming,
    } = useOracleStore();

    const loadingMessage = useLoadingMessage(isStreaming);

    const sessionData = useQuery(api.oracle.sessions.getSessionWithMessages, { sessionId });
    const quota = useQuery(api.oracle.quota.checkQuota);
    const quotaExhausted = quota && !quota.allowed;

    const addMessageMutation = useMutation(api.oracle.sessions.addMessage);
    const updateSessionFeatureMutation = useMutation(api.oracle.sessions.updateSessionFeature);
    const invokeOracle = useAction(api.oracle.llm.invokeOracle);

    useEffect(() => {
        if (sessionData === null) {
            router.push("/oracle/new");
        }
    }, [sessionData, router]);

    useEffect(() => {
        if (!sessionData || !sessionData.messages) return;

        const featureKey = (sessionData.featureKey as OracleFeatureKey | null) ?? null;

        if ((sessionData.status === "active" || sessionData.status === "completed") && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
            hydrateSessionFeature(featureKey);
            setConversationActive();
        } else if (state === "oracle_responding" && !initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            setSessionId(sessionId);
            hydrateSessionFeature(featureKey);
        }
    }, [sessionData?.status, sessionData?.featureKey, hydrateSessionFeature, sessionId, setConversationActive, setSessionId, state]);

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
            // Small delay to let React state settle before streaming begins
            await new Promise((resolve) => setTimeout(resolve, 50));

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
    }, [sessionData?.messages?.length, isStreaming, pendingUserMessage]);

    const handleCopy = useCallback((content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    }, []);

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
        await updateSessionFeatureMutation({
            sessionId,
            featureKey: undefined,
        });
    }, [clearSelectedFeature, sessionId, updateSessionFeatureMutation]);

    const handleSendFollowUp = useCallback(async () => {
        const content = inputValue.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
        if (!content || isStreaming) return;

        setInputValue("");
        setPendingUserMessage(content);

        await addMessageMutation({
            sessionId,
            role: "user",
            content,
        });

        setIsStreaming(true);
        // Small delay to let React state settle before streaming begins
        await new Promise((resolve) => setTimeout(resolve, 50));

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
    }, [inputValue, selectedFeatureKey, isStreaming, sessionId, addMessageMutation, invokeOracle, setIsStreaming]);

    // Compute countdown for daily cap
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
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt,
    }));
    const allMessages = pendingUserMessage && !serverMessages.some(m => m.role === "user" && m.content === pendingUserMessage)
        ? [...serverMessages, { role: "user" as const, content: pendingUserMessage, createdAt: Date.now() }]
        : serverMessages;

    // Determine input bar state
    const isInputDisabled = isStreaming || state === "oracle_responding" || !!quotaExhausted;
    const inputPlaceholder = isStreaming || state === "oracle_responding"
        ? "Oracle is speaking..."
        : quotaExhausted
            ? "Quota exhausted"
            : "Ask a follow-up...";

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
                                                        <span className="text-sm text-white/40 italic">{loadingMessage}</span>
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
                                                <div className="text-sm md:text-base text-white/85 leading-relaxed">
                                                    <AssistantMessageContent content={msg.content} isStreamingThis={isStreamingThis} />
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
                                            <span className="text-sm text-white/40 italic">{loadingMessage}</span>
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
                            />

                            {/* Quota indicator */}
                            {quota && quota.remaining !== undefined && state === "conversation_active" && (
                                <div className="flex justify-end mt-2 px-2">
                                    <span className={`text-[10px] tracking-wide ${quota.remaining <= 1 ? "text-amber-400" : "text-white/25"
                                        }`}>
                                        {quota.remaining} question{quota.remaining !== 1 ? "s" : ""} remaining
                                        {quota.resetsAt
                                            ? ` — resets ${new Date(quota.resetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
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