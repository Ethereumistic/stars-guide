"use client";

import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Sparkles } from "lucide-react";
import { GiCursedStar } from "react-icons/gi";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import { getFeatureDefaultPrompt, isImplementedFeature, type OracleFeatureKey } from "@/lib/oracle/features";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";

export default function OracleNewPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const { user } = useUserStore();

    const {
        selectedCategorySlug,
        selectedCategoryId,
        selectedTemplateId,
        selectedTemplateRequiresThirdParty,
        pendingQuestion,
        selectedFeatureKey,
        selectCategory,
        deselectCategory,
        selectTemplate,
        setPendingQuestion,
        setSelectedFeature,
        clearSelectedFeature,
        setSessionId,
        setOracleResponding,
        setQuota,
    } = useOracleStore();

    const categories = useQuery(api.oracle.categories.listActiveCategories);
    const templates = useQuery(
        api.oracle.templates.listTemplatesByCategory,
        selectedCategoryId ? { categoryId: selectedCategoryId } : "skip",
    );
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
    const isCategoryActive = selectedCategorySlug !== null;

    useEffect(() => {
        if (isCategoryActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCategoryActive]);

    const handleCategorySelect = useCallback(
        (slug: string, id: string) => {
            if (selectedCategorySlug === slug) {
                deselectCategory();
            } else {
                selectCategory(slug, id as any);
            }
        },
        [selectedCategorySlug, selectCategory, deselectCategory],
    );

    const handleTemplateClick = useCallback(
        (templateId: string, questionText: string, requiresThirdParty: boolean) => {
            selectTemplate(templateId as any, questionText, requiresThirdParty);
            inputRef.current?.focus();
        },
        [selectTemplate],
    );

    const handleFeatureSelect = useCallback(
        (featureKey: OracleFeatureKey) => {
            if (!isImplementedFeature(featureKey)) {
                return;
            }

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
                categoryId: selectedCategoryId ?? undefined,
                templateId: selectedTemplateId ?? undefined,
                featureKey: selectedFeatureKey ?? undefined,
                questionText,
                requiresFollowUps: selectedTemplateRequiresThirdParty,
            });

            setSessionId(sessionId);

            if (selectedTemplateRequiresThirdParty) {
                router.push(`/oracle/chat/${sessionId}`);
            } else {
                setOracleResponding();
                router.push(`/oracle/chat/${sessionId}`);
            }
        } catch (error) {
            console.error("Failed to create Oracle session:", error);
        }
    }, [
        pendingQuestion,
        selectedFeatureKey,
        quota,
        createSession,
        selectedCategoryId,
        selectedTemplateId,
        selectedTemplateRequiresThirdParty,
        setSessionId,
        setOracleResponding,
        router,
    ]);

    const renderInputBar = (variant: "center" | "footer") => (
        <div className={variant === "center" ? "w-full max-w-2xl mx-auto" : "max-w-3xl mx-auto w-full"}>
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
                        {quota.resetsAt ? ` � resets ${new Date(quota.resetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : " (lifetime)"}
                    </span>
                </div>
            )}
        </div>
    );

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
            ) : !isCategoryActive ? (
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
                        {renderInputBar("center")}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-wrap items-center justify-center gap-2 md:gap-3"
                    >
                        {categories?.map((cat, i) => (
                            <motion.button
                                key={cat._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.7 + i * 0.06 }}
                                onClick={() => handleCategorySelect(cat.slug, cat._id)}
                                className="group/cat flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-galactic/15 hover:border-galactic/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(157,78,221,0.15)]"
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span className="text-xs md:text-sm font-medium tracking-wider uppercase text-white/60 group-hover/cat:text-white transition-colors">
                                    {cat.name}
                                </span>
                            </motion.button>
                        ))}
                    </motion.div>
                </motion.div>
            ) : (
                <motion.div
                    key="category-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 flex flex-col overflow-hidden z-10"
                >
                    <div className="flex items-center justify-center gap-2 md:gap-3 py-4 px-4 shrink-0">
                        {categories?.map((cat) => {
                            const isActive = selectedCategorySlug === cat.slug;
                            return (
                                <button
                                    key={cat._id}
                                    onClick={() => handleCategorySelect(cat.slug, cat._id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold tracking-wider uppercase transition-all duration-300 ${isActive
                                        ? "bg-galactic/20 border-galactic/60 text-white shadow-[0_0_15px_rgba(157,78,221,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="hidden sm:inline">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                        <div className="max-w-4xl mx-auto w-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedCategorySlug}
                                    initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
                                    transition={{ duration: 0.35 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-4"
                                >
                                    {templates?.map((tpl, i) => (
                                        <motion.button
                                            key={tpl._id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.08 }}
                                            onClick={() => handleTemplateClick(tpl._id, tpl.questionText, tpl.requiresThirdParty)}
                                            className={`group/card relative text-left p-5 md:p-6 rounded-2xl border transition-all duration-300 flex items-start gap-3 overflow-hidden ${selectedTemplateId === tpl._id
                                                ? "bg-galactic/15 border-galactic/50 shadow-[0_0_30px_rgba(157,78,221,0.2)]"
                                                : "bg-white/4 border-white/8 hover:bg-galactic/10 hover:border-galactic/30 hover:shadow-[0_0_30px_rgba(157,78,221,0.1)]"
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-linear-to-br from-galactic/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-2xl" />

                                            <div className="relative shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-galactic/10 border border-galactic/20 flex items-center justify-center group-hover/card:bg-galactic/20 group-hover/card:border-galactic/40 transition-all duration-300">
                                                <Sparkles className="w-4 h-4 text-white/30 group-hover/card:text-galactic transition-colors duration-300" />
                                            </div>

                                            <div className="relative flex-1 min-w-0">
                                                <span className="text-sm md:text-base font-medium leading-relaxed text-white/70 group-hover/card:text-white transition-colors duration-300 block">
                                                    {tpl.questionText}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 group-hover/card:text-galactic/50 mt-2 block transition-colors duration-300">
                                                    {categories?.find((c) => c._id === tpl.categoryId)?.name} � Tap to ask
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="shrink-0 p-4 bg-linear-to-t from-background via-background/95 to-transparent pointer-events-none"
                    >
                        <div className="pointer-events-auto">
                            {renderInputBar("footer")}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
