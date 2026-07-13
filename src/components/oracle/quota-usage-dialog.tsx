"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { GiBeveledStar, GiCursedStar, GiPolarStar, GiStarSwirl } from "react-icons/gi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OracleQuotaMeter, type OracleQuotaSnapshot } from "./quota-meter";

const checkQuotaRef = makeFunctionReference<"query", Record<string, never>, OracleQuotaSnapshot>(
  "oracle/quota:checkQuota",
);

type Tier = "free" | "popular" | "premium";

interface OracleQuotaUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  onGetMoreUsage: () => void;
}

const tierPresentation = {
  free: { name: "FREE", color: "text-white", nextColor: "text-primary", Icon: GiPolarStar, UpgradeIcon: GiBeveledStar },
  popular: { name: "COSMIC FLOW", color: "text-primary", nextColor: "text-galactic", Icon: GiBeveledStar, UpgradeIcon: GiCursedStar },
  premium: { name: "ORACLE", color: "text-galactic", nextColor: "text-galactic", Icon: GiCursedStar, UpgradeIcon: GiCursedStar },
} satisfies Record<Tier, { name: string; color: string; nextColor: string; Icon: typeof GiPolarStar; UpgradeIcon: typeof GiPolarStar }>;

export function OracleQuotaUsageDialog({ open, onOpenChange, currentTier, onGetMoreUsage }: OracleQuotaUsageDialogProps) {
  const quota = useQuery(checkQuotaRef, open ? {} : "skip");
  const plan = tierPresentation[currentTier];
  const canUpgrade = currentTier !== "premium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto border-white/10 bg-[#15141c]/98 p-6 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl sm:max-w-2xl sm:p-7">
        <DialogHeader className="text-left">
          <DialogTitle className="font-sans text-2xl font-semibold tracking-tight">Usage</DialogTitle>
        </DialogHeader>

        {quota === undefined ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-white/40">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading usage…
          </div>
        ) : (
          <OracleQuotaMeter quota={quota} />
        )}

        <div className="flex min-h-16 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.015] px-5 py-4 sm:px-6">
          <span className="text-sm font-semibold text-white/85 sm:text-base">Usage limits reset</span>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-serif text-xs text-primary">
              Automatically
            </span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-center gap-4 py-1" aria-hidden="true">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm text-white/35">Get more usage</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onGetMoreUsage}
            className="group flex min-h-32 flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.055] px-5 text-center transition-colors hover:border-primary/25 hover:bg-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="flex items-center justify-center gap-2 text-xs leading-none">
              <plan.Icon className={`size-4 ${plan.color}`} />
              <span className={`font-serif font-medium ${plan.color}`}>{plan.name}</span>
              {canUpgrade && (
                <>
                  <span className="text-white/25">→</span>
                  <plan.UpgradeIcon className={`size-4 ${plan.nextColor}`} />
                  <span className={`font-serif font-bold uppercase tracking-wider ${plan.nextColor}`}>Upgrade</span>
                </>
              )}
            </div>
            <span className="font-serif text-base font-semibold text-white/90">
              {canUpgrade ? "Upgrade plan" : "View plan"}
            </span>
          </button>

          <button
            type="button"
            onClick={onGetMoreUsage}
            className="group flex min-h-32 flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.055] px-5 text-center transition-colors hover:border-galactic/25 hover:bg-galactic/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-galactic/60"
          >
            <span className="relative flex size-7 items-center justify-center">
              <GiStarSwirl className="size-6 text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />
              <Plus className="absolute -right-2 -top-1 size-3.5 text-galactic" />
            </span>
            <span className="font-serif text-base font-semibold text-white/90">Get Stardust</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
