"use client";

import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GiCursedStar } from "react-icons/gi";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { getFeatureDefaultPrompt, type OracleFeatureKey } from "@/lib/oracle/features";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";

export default function OracleNewPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const { user } = useUserStore();

    const {
        pendingQuestion,
        selectedFeatureKey,
        setPendingQuestion,
        setSelectedFeature,
        clearSelectedFeature,
        setSessionId,
        setOracleResponding,
        setQuota,
    } = useOracleStore();

    const quota = useQuery(api.oracle.quota.checkQuota);
    const killSwitch = useQuery(api.oracle.settings.getSetting, { key: "kill_switch" });
    const isOracleOffline = killSwitch?.value === "true";

    const createSession = useMutation(api.oracle.sessions.createSession);

    useEffect(() => {
        if (quota) {
            setQuota(quota.remaining ?? null, quota.resetsAt ?? null);
        }
    }, [quota, setQuota]);

    const firstName = user?.username?.split(/[_\s]/)[0] ?? "Seeker";

    const handleFeatureSelect = useCallback(
        (featureKey: OracleFeatureKey) => {
            setSelectedFeature(featureKey);
            inputRef.current?.focus();
        },
        [setSelectedFeature],
    );

    const handleSubmit = useCallback(async () => {
        const questionText = pendingQuestion.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
        if (!questionText) return;
        if (quota && !quota.allowed) return;

        try {
            const sessionId = await createSession({
                featureKey: selectedFeatureKey ?? undefined,
                questionText,
            });

            setSessionId(sessionId);
            setOracleResponding();
            router.push(`/oracle/chat/${sessionId}`);
        } catch (error) {
            console.error("Failed to create Oracle session:", error);
        }
    }, [
        pendingQuestion,
        selectedFeatureKey,
        quota,
        createSession,
        setSessionId,
        setOracleResponding,
        router,
    ]);

    return (
        <AnimatePresence mode="wait">
            {isOracleOffline ? (
                <motion.div
                    key="offline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-4 z-10"
                >
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-6">
                        <GiCursedStar className="w-10 h-10 text-white/20" />
                    </div>
                    <h2 className="text-2xl font-serif text-white/40 mb-2">The Oracle rests</h2>
                    <p className="text-sm text-white/20 font-serif italic">Return soon.</p>
                </motion.div>
            ) : (
                <motion.div
                    key="initial"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-4 z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="mb-8"
                    >
                        <div className="w-20 h-20 rounded-full bg-galactic/10 flex items-center justify-center border border-galactic/20 relative">
                            <div className="absolute inset-0 rounded-full border border-galactic/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
                            <GiCursedStar className="w-10 h-10 text-galactic" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-center mb-10 space-y-3 max-w-xl"
                    >
                        <h1 className="text-3xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-linear-to-br from-white via-white/80 to-galactic/50 pb-1">
                            Welcome, <span className="text-galactic">{firstName}</span>
                        </h1>
                        <p className="text-white/50 text-base md:text-lg font-serif italic text-balance">
                            What truth do you seek from the stars today?
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="w-full max-w-2xl mb-8"
                    >
                        <OracleInput
                            inputRef={inputRef}
                            value={pendingQuestion}
                            onValueChange={setPendingQuestion}
                            onSubmit={handleSubmit}
                            placeholder="Ask the stars anything..."
                            canSubmit={Boolean(pendingQuestion.trim() || selectedFeatureKey)}
                            featureKey={selectedFeatureKey}
                            onFeatureSelect={handleFeatureSelect}
                            onFeatureClear={clearSelectedFeature}
                            birthData={user?.birthData}
                        />

                        {quota && quota.remaining !== undefined && (
                            <div className="flex justify-end mt-2 px-2">
                                <span className={`text-[10px] tracking-wide ${quota.remaining <= 1
                                    ? "text-amber-400"
                                    : "text-white/25"
                                    }`}>
                                    {quota.remaining} question{quota.remaining !== 1 ? "s" : ""} remaining
                                    {quota.resetsAt ? ` — resets ${new Date(quota.resetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : " (lifetime)"}
                                </span>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}