"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { OracleInput } from "@/components/oracle/input/oracle-input";
import {
  getFeatureDefaultPrompt,
  type OracleFeatureKey,
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
import { UpgradeModal, useUpgradeModal } from "@/components/pricing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { GiPolarStar, GiBeveledStar, GiCursedStar } from "react-icons/gi";

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
  const killSwitch = useQuery(api.oracle.settings.getSettingPublic, {
    key: "kill_switch",
  });
  const isOracleOffline = killSwitch?.value === "true";

  const createSession = useMutation(api.oracle.sessions.createSession);

  // Upgrade modal state via reusable hook
  const { isOpen: upgradeModalOpen, open: openUpgradeModal, close: closeUpgradeModal } = useUpgradeModal();
  const [isYearlyBilling] = useState(false);

  useEffect(() => {
    if (quota) {
      setQuota(quota.remaining ?? null, quota.resetsAt ?? null);
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

  const currentTier = (user?.tier ?? "free") as "free" | "popular" | "premium";
  const showUpgradeButton = currentTier !== "premium";

  return (
    <>
      {/* Full-screen upgrade modal with pricing cards */}
      <UpgradeModal
        userTier={currentTier}
        isOpen={upgradeModalOpen}
        onClose={closeUpgradeModal}
      />

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
                onUpgrade={openUpgradeModal}
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
                onBinauralGenerate={handleBinauralGenerate}
              />

              {quota && quota.remaining !== undefined && (
                <div className="flex justify-end mt-2 px-2">
                  <span
                    className={`text-[10px] tracking-wide ${
                      quota.remaining <= 1 ? "text-amber-400" : "text-white/25"
                    }`}
                  >
                    {quota.remaining} question{quota.remaining !== 1 ? "s" : ""} remaining
                    {quota.resetsAt
                      ? ` — resets ${new Date(quota.resetsAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : " (lifetime)"}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
