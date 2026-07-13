"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { Id } from "@/../convex/_generated/dataModel";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import {
  getFeatureDefaultPrompt,
  type OracleFeatureKey,
  isSynastryFeature,
} from "@/lib/oracle/features";
import {
  serializeBeat,
  type BinauralBeatParams,
} from "@/lib/binaural-presets";
import { useOracleStore } from "@/store/use-oracle-store";
import { useUserStore } from "@/store/use-user-store";
import {
  detectTimezone,
  getLocalHour,
  getGreetingForHour,
} from "@/lib/timezone";
import { trackOracleChat } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Clock3, LockKeyhole } from "lucide-react";
import type { OracleQuotaSnapshot } from "@/components/oracle/quota-meter";
import { GiPolarStar, GiBeveledStar, GiCursedStar } from "react-icons/gi";
import type { OracleBirthData } from "@/lib/oracle/featureContext";
import { shouldAutoStartBirthChartReport, type BirthChartReportBootstrapUser } from "@/lib/oracle/reportOnboarding";

const ORACLE_INTEL_PROMPTS = [
  {
    eyebrow: "NOW",
    label: "My edge today",
    prompt: "Read today's sky against my birth chart. What is my strongest opportunity right now, how confident is the signal, and what practical move gives me the best edge?",
  },
  {
    eyebrow: "WATCH",
    label: "What could trip me up?",
    prompt: "Read today's sky against my birth chart. What pattern is most likely to trip me up, what early signal should I watch for, and how can I redirect it?",
  },
  {
    eyebrow: "SINCE LAST TIME",
    label: "What changed?",
    prompt: "What has materially changed in my chart since my last Oracle visit? Compare the code-calculated transit evidence, skip anything unchanged, and tell me what new signal deserves attention now.",
  },
  {
    eyebrow: "DEEP CUT",
    label: "A pattern I haven't seen",
    prompt: "Find one important pattern in my birth chart report that I probably haven't recognized yet. Show me the exact evidence, how it appears in real life, and one experiment to test it this week.",
  },
] as const;

const checkOracleQuotaRef = makeFunctionReference<
  "query",
  Record<string, never>,
  OracleQuotaSnapshot
>("oracle/quota:checkQuota");

const getOracleSettingRef = makeFunctionReference<
  "query",
  { key: string },
  { value: string } | null
>("oracle/settings:getSettingPublic");

type CreateOracleSessionArgs = Record<string, unknown> & {
  featureKey?: string;
  questionText: string;
  synastryPayload?: {
    chartB: OracleBirthData;
    source: "friend" | "custom";
    friendUserId?: Id<"users">;
    relationship: string;
    relationshipCategory?: string;
    chartBName: string;
  };
};

const createOracleSessionRef = makeFunctionReference<
  "mutation",
  CreateOracleSessionArgs,
  Id<"oracle_sessions">
>("oracle/sessions:createSession");

const getCurrentUserForReportBootstrapRef = makeFunctionReference<
  "query",
  Record<string, never>,
  BirthChartReportBootstrapUser | null
>("users:current");

const createBirthChartReportSessionRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  Id<"oracle_sessions">
>("oracle/sessions:createBirthChartReportSession");

function PlanBadge({
  currentTier,
  onUpgrade,
  showUpgradeButton,
}: {
  currentTier: "free" | "popular" | "premium";
  onUpgrade: () => void;
  showUpgradeButton: boolean;
}) {
  const currentPlanName =
    currentTier === "free" ? "FREE" : currentTier === "popular" ? "COSMIC FLOW" : "ORACLE";
  const currentPlanColor =
    currentTier === "free" ? "text-white" : currentTier === "popular" ? "text-primary" : "text-galactic";

  // Upgrade button icon and color (based on next tier)
  const upgradeColor =
    currentTier === "free" ? "text-primary" : "text-galactic";
  const upgradeHoverText =
    currentTier === "free" ? "hover:text-primary" : "hover:text-galactic";
  const upgradeHoverBorder =
    currentTier === "free" ? "hover:border-primary/30" : "hover:border-galactic/30";
  const upgradeHoverBg =
    currentTier === "free" ? "hover:bg-primary/10" : "hover:bg-galactic/10";
  const UpgradeIcon = currentTier === "free" ? GiBeveledStar : GiCursedStar;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center gap-2 text-xs leading-none"
    >
      {currentTier === "free" && <GiPolarStar className="size-3 text-white" />}
      {currentTier === "popular" && <GiBeveledStar className="size-3 text-primary" />}
      {currentTier === "premium" && <GiCursedStar className="size-3 text-galactic" />}
      <span className={`${currentPlanColor} font-serif font-medium uppercase`}>
        {currentPlanName}
      </span>
      {showUpgradeButton && (
        <>
          <span className="text-white/30 leading-none">→</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUpgrade}
            className={`h-6 px-2 py-0 text-[10px] font-serif font-bold uppercase tracking-wider ${upgradeColor} border border-transparent ${upgradeHoverText} ${upgradeHoverBorder} ${upgradeHoverBg} transition-all gap-1 text-center leading-none`}
          >
            <UpgradeIcon className="size-3" />
            Upgrade
          </Button>
        </>
      )}
    </motion.div>
  );
}

export default function OracleNewPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const reportBootstrapStartedRef = useRef(false);
  const { user } = useUserStore();
  const [isStartingBirthReport, setIsStartingBirthReport] = useState(false);

  const {
    pendingQuestion,
    selectedFeatureKey,
    birthChartDepth,
    synastryData,
    setPendingQuestion,
    setSelectedFeature,
    setBirthChartDepth,
    clearSelectedFeature,
    setSessionId,
    setOracleResponding,
    setQuota,
    setSynastryChartB,
    setSynastryRelationship,
    clearSynastry,
    clearSynastryChartB,
    setUsageOpen,
    setUpgradeOpen,
  } = useOracleStore();

  const quota = useQuery(checkOracleQuotaRef);
  const currentUserForReportBootstrap = useQuery(getCurrentUserForReportBootstrapRef, {});
  const killSwitch = useQuery(getOracleSettingRef, {
    key: "kill_switch",
  });
  const isOracleOffline = killSwitch?.value === "true";

  const createSession = useMutation(createOracleSessionRef);
  const createBirthChartReportSession = useMutation(createBirthChartReportSessionRef);

  useEffect(() => {
    if (!shouldAutoStartBirthChartReport(currentUserForReportBootstrap) || reportBootstrapStartedRef.current) return;
    reportBootstrapStartedRef.current = true;
    setIsStartingBirthReport(true);
    void createBirthChartReportSession({})
      .then((reportSessionId) => {
        setSessionId(reportSessionId);
        router.replace(`/oracle/chat/${reportSessionId}`);
      })
      .catch((error) => {
        reportBootstrapStartedRef.current = false;
        setIsStartingBirthReport(false);
        console.error("Failed to start the first Birth Chart Report conversation:", error);
      });
  }, [currentUserForReportBootstrap, createBirthChartReportSession, router, setSessionId]);

  useEffect(() => {
    if (quota) {
      setQuota(quota.burstRemaining ?? null, quota.burstResetsAt ?? null);
    }
  }, [quota, setQuota]);

  const firstName = user?.username?.split(/[_\s]/)[0] ?? "Seeker";

  // ── Timezone-aware hour & greeting ───────────────────────────────────
  const [localHour, setLocalHour] = useState<number>(() =>
    typeof window !== "undefined" ? getLocalHour(detectTimezone()) : 12,
  );
  const [timezone] = useState(detectTimezone);

  useEffect(() => {
    // Re-sync every 60 s so the greeting transitions at the hour boundary
    const sync = () => setLocalHour(getLocalHour(timezone));
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  // Persist timezone into the oracle store so future prompt context can use it
  const { setTimezone: storeSetTimezone } = useOracleStore();
  useEffect(() => {
    storeSetTimezone(timezone);
  }, [timezone, storeSetTimezone]);

  const greeting = getGreetingForHour(localHour, firstName);

  const handleFeatureSelect = useCallback(
    (featureKey: OracleFeatureKey) => {
      setSelectedFeature(featureKey);
      inputRef.current?.focus();
    },
    [setSelectedFeature],
  );

  const handleIntelPrompt = useCallback((prompt: string) => {
    setPendingQuestion(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [setPendingQuestion]);

  const handleBinauralGenerate = useCallback(
    async (params: BinauralBeatParams) => {
      if (quota && !quota.allowed) return;

      const message = serializeBeat(params);
      try {
        const newSessionId = await createSession({
          featureKey: "binaural_beats",
          questionText: message,
        });

        setSessionId(newSessionId);
        router.push(`/oracle/chat/${newSessionId}`);
        // Do NOT call setOracleResponding — beat messages don't invoke Oracle AI
      } catch (error) {
        console.error("Failed to create session for binaural beat:", error);
      }
    },
    [quota, createSession, setSessionId, router],
  );

  const handleSubmit = useCallback(async () => {
    const questionText =
      pendingQuestion.trim() || getFeatureDefaultPrompt(selectedFeatureKey);
    if (!questionText) return;
    if (quota && !quota.allowed) return;

    // For synastry, validate that chart B and relationship are set
    if (isSynastryFeature(selectedFeatureKey) && (!synastryData?.chartB || !synastryData?.relationship)) {
      return; // Don't submit — UI shows validation
    }

    try {
      const sessionId = await createSession({
        featureKey: selectedFeatureKey ?? undefined,
        questionText,
        synastryPayload: isSynastryFeature(selectedFeatureKey) && synastryData?.chartB && synastryData?.relationship
          ? {
              chartB: synastryData.chartB,
              source: synastryData.source!,
              friendUserId: synastryData.friendUserId as any,
              relationship: synastryData.relationship!,
              relationshipCategory: synastryData.relationshipCategory ?? "general",
              chartBName: synastryData.chartBName,
            }
          : undefined,
      });

      // Dismiss the feature import card before navigating
      clearSelectedFeature();

      setSessionId(sessionId);
      setOracleResponding();
      trackOracleChat();
      router.push(`/oracle/chat/${sessionId}`);
    } catch (error) {
      console.error("Failed to create Oracle session:", error);
    }
  }, [
    pendingQuestion,
    selectedFeatureKey,
    synastryData,
    quota,
    createSession,
    setSessionId,
    setOracleResponding,
    router,
    clearSelectedFeature,
  ]);

  const currentTier = (user?.tier ?? "free") as "free" | "popular" | "premium";
  const showUpgradeButton = currentTier !== "premium";
  const quotaExhausted = quota?.allowed === false;
  const activeResetAt = quota?.reason === "weekly_cap" ? quota.weeklyResetsAt : quota?.burstResetsAt;
  const quotaResetLabel = activeResetAt
    ? new Date(activeResetAt).toLocaleString(undefined, {
        weekday: activeResetAt - Date.now() > 86_400_000 ? "short" : undefined,
        hour: "numeric",
        minute: "2-digit",
      })
    : "automatically";

  return (
    <>
      <AnimatePresence mode="wait">
        {isStartingBirthReport ? (
          <motion.div
            key="birth-report-bootstrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center"
          >
            <GiCursedStar className="size-10 animate-pulse text-galactic/70" />
            <div>
              <p className="font-serif text-xl text-white/80">Opening your Birth Chart Report</p>
              <p className="mt-2 text-sm text-white/40">Preparing your calculated chart and first questions…</p>
            </div>
          </motion.div>
        ) : isOracleOffline ? (
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
            <h2 className="text-2xl font-serif text-white/40 mb-2">
              The Oracle rests
            </h2>
            <p className="text-sm text-white/20 font-serif italic">
              Return soon.
            </p>
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
            {/* Plan badge above the star + title row */}
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-4"
            >
              <PlanBadge
                currentTier={currentTier}
                onUpgrade={() => setUpgradeOpen(true)}
                showUpgradeButton={showUpgradeButton}
              />
            </motion.div>

            {/* Star + title on same row */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full border border-galactic/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
                <GiCursedStar className="size-12 text-galactic" />
              </div>
              <h1 className="text-2xl md:text-4xl font-serif font-bold bg-clip-text text-transparent bg-linear-to-br from-white via-white/80 to-galactic/50 whitespace-nowrap">
                {greeting}
              </h1>
            </motion.div>

            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="w-full max-w-2xl mb-8"
            >
              <div className={quotaExhausted ? "pointer-events-none opacity-45 saturate-50" : ""}>
                <OracleInput
                inputRef={inputRef}
                value={pendingQuestion}
                onValueChange={setPendingQuestion}
                onSubmit={handleSubmit}
                placeholder={quotaExhausted ? "Oracle access is resting…" : "Ask the stars anything..."}
                disabled={quotaExhausted}
                canSubmit={Boolean((pendingQuestion.trim() || selectedFeatureKey) && (isSynastryFeature(selectedFeatureKey) ? synastryData?.chartB && synastryData?.relationship : true))}
                featureKey={selectedFeatureKey}
                onFeatureSelect={handleFeatureSelect}
                onFeatureClear={clearSelectedFeature}
                birthData={user?.birthData}
                username={user?.username}
                onBinauralGenerate={handleBinauralGenerate}
                birthChartDepth={birthChartDepth}
                onBirthChartDepthChange={setBirthChartDepth}
                synastryState={synastryData}
                onSetSynastryChartB={setSynastryChartB}
                onSetSynastryRelationship={setSynastryRelationship}
                onClearSynastry={clearSynastry}
                onClearSynastryChartB={clearSynastryChartB}
                />
              </div>

              {quotaExhausted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mt-3 overflow-hidden rounded-2xl border border-galactic/20 bg-[#12111a]/95 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
                >
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-galactic/80 to-transparent" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-galactic/25 bg-galactic/10 shadow-[0_0_24px_rgba(157,78,221,0.12)]">
                        <LockKeyhole className="size-4 text-galactic" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-serif text-sm font-medium text-white/90">
                          {quota.reason === "weekly_cap" ? "Your weekly readings are complete" : "The Oracle is gathering its light"}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                          <Clock3 className="size-3.5 text-galactic/70" aria-hidden="true" />
                          Access returns {quotaResetLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-[3.25rem] sm:pl-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUsageOpen(true)}
                        className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-3 font-serif text-xs text-white/60 hover:border-galactic/25 hover:bg-galactic/[0.07] hover:text-white"
                      >
                        View usage
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpgradeOpen(true)}
                        className={`h-8 rounded-lg border px-3 font-serif text-xs ${currentTier === "popular"
                          ? "border-galactic/20 bg-galactic/10 text-galactic hover:bg-galactic/15"
                          : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                        }`}
                      >
                        {currentTier === "premium" ? "Get Stardust" : "Unlock more"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!quotaExhausted && user?.birthData && !selectedFeatureKey && !pendingQuestion.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.65 }}
                  className="mt-4 grid grid-cols-2 gap-2"
                  aria-label="Personalized Oracle readings"
                >
                  {ORACLE_INTEL_PROMPTS.map((item, index) => (
                    <motion.button
                      key={item.eyebrow}
                      type="button"
                      onClick={() => handleIntelPrompt(item.prompt)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.72 + index * 0.06 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-left transition-colors hover:border-galactic/35 hover:bg-galactic/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-galactic/60"
                    >
                      <span className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-galactic/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <span className="block text-[9px] font-medium tracking-[0.22em] text-galactic/65">
                        {item.eyebrow}
                      </span>
                      <span className="mt-1 block font-serif text-[13px] leading-tight text-white/65 transition-colors group-hover:text-white">
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
