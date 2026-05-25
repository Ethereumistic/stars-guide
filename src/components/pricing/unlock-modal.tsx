"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { PricingCard } from "./pricing-card";
import { StardustCard } from "./stardust-purchase";
import { plans, type PricingPlan } from "./pricing-data";
import { cn } from "@/lib/utils";
import { StarsBackground, ShootingStars } from "@/components/hero/stars-canvas";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UnlockModalProps {
    /** Which plan tier the user currently has */
    userTier: "free" | "popular" | "premium";
    /** Which tier is required for this specific content */
    requiredTier: "popular" | "premium";
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback to close the modal */
    onClose: () => void;
}

/**
 * Determines which items to show based on:
 * - The user's current tier
 * - The tier required to unlock this content
 * 
 * Logic:
 * - If content requires "popular" and user is "free" → show Popular + Premium + Stardust
 * - If content requires "popular" and user is "free" → show Popular + Stardust
 * - If content requires "premium" and user is "free" → show Popular + Premium + Stardust
 * - If content requires "premium" and user is "popular" → show Premium + Stardust
 * - If content requires "premium" and user is "premium" → show only Stardust
 */
function getVisibleItems(
    userTier: UnlockModalProps["userTier"],
    requiredTier: UnlockModalProps["requiredTier"]
) {
    type Item = { type: "subscription" | "stardust"; plan?: PricingPlan };
    const result: Item[] = [];

    // Show subscription options if user doesn't have the required tier
    if (userTier !== "premium") {
        // Always show popular if user is free (it's cheaper than premium)
        if (userTier === "free") {
            const popular = plans.find((p) => p.tier === "popular");
            if (popular) result.push({ type: "subscription", plan: popular });
        }
    }

    // Always show premium option (even if user has popular, maybe they want to upgrade)
    if (userTier !== "premium") {
        const premium = plans.find((p) => p.tier === "premium");
        if (premium) result.push({ type: "subscription", plan: premium });
    }

    // Always show Star Dust as a pay-as-you-go alternative
    result.push({ type: "stardust" });

    return result;
}

export function UnlockModal({
    userTier,
    requiredTier,
    isOpen,
    onClose,
}: UnlockModalProps) {
    const [isYearly, setIsYearly] = React.useState(false);
    const billingValue = isYearly ? "yearly" : "monthly";

    const visibleItems = getVisibleItems(userTier, requiredTier);

    if (visibleItems.length === 0) return null;

    const count = visibleItems.length;
    const is3 = count === 3;

    // Grid: 3-col on desktop when 3 items, 2-col on desktop when 2 items
    const gridClass = is3
        ? "grid-cols-1 lg:grid-cols-3 gap-6"
        : count === 2
            ? "grid-cols-1 lg:grid-cols-2 gap-6"
            : "grid-cols-1 max-w-md mx-auto";

    // Title based on required tier
    const requiredPlan = plans.find((p) => p.tier === requiredTier);
    const unlockText = requiredTier === "popular"
        ? "Unlock Yesterday & Tomorrow"
        : "Unlock the Full Week";

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AnimatePresence>
                {isOpen && (
                    <DialogPrimitive.Portal forceMount>
                        {/* Overlay */}
                        <DialogPrimitive.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                            />
                        </DialogPrimitive.Overlay>

                        {/* Full-screen modal content */}
                        <DialogPrimitive.Content asChild>
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className={cn(
                                    "fixed inset-0 z-50 flex flex-col",
                                    "bg-background/95 backdrop-blur-xl",
                                    "overflow-y-auto overflow-x-hidden",
                                    "px-4 sm:px-6 md:px-12 py-8 md:py-12",
                                    "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
                                )}
                            >
                                {/* Cosmic background */}
                                <ShootingStars
                                    minSpeed={15}
                                    maxSpeed={35}
                                    minDelay={800}
                                    maxDelay={3000}
                                    starColor="#d4af37"
                                    trailColor="#8b7355"
                                />
                                <StarsBackground
                                    starDensity={0.0002}
                                    allStarsTwinkle={true}
                                    twinkleProbability={0.8}
                                    minTwinkleSpeed={0.3}
                                    maxTwinkleSpeed={1.2}
                                />

                                {/* Close button */}
                                <DialogPrimitive.Close
                                    className={cn(
                                        "fixed top-4 right-4 z-[60]",
                                        "flex items-center justify-center",
                                        "text-white/40 hover:text-white",
                                        "transition-colors duration-200",
                                        "focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    )}
                                    aria-label="Close"
                                >
                                    <X className="size-5" />
                                </DialogPrimitive.Close>

                                {/* Inner content */}
                                <div className="relative w-full max-w-6xl mx-auto flex-1 flex flex-col">
                                    {/* Header */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                        className="text-center mb-8 md:mb-10"
                                    >
                                        <DialogPrimitive.Title className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                                            {unlockText}
                                        </DialogPrimitive.Title>
                                        <DialogPrimitive.Description className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-6">
                                            {requiredTier === "popular"
                                                ? "Get access to yesterday and tomorrow's horoscopes."
                                                : "Unlock the full 7-day horoscope archive."}
                                        </DialogPrimitive.Description>

                                        {/* Billing cycle tabs */}
                                        <Tabs
                                            value={billingValue}
                                            onValueChange={(v) => setIsYearly(v === "yearly")}
                                            className="mx-auto w-max"
                                        >
                                            <TabsList className="relative flex items-center p-1 bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm h-auto">
                                                <TabsTrigger
                                                    value="monthly"
                                                    className="relative w-32 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                                >
                                                    Monthly
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="yearly"
                                                    className="relative w-32 text-center px-4 py-2.5 text-sm font-medium data-[state=active]:text-white text-white/60 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300"
                                                >
                                                    Yearly
                                                    <span className="absolute -top-3 -right-2 bg-primary text-[#0A0F1A] text-[10px] font-bold px-2 py-0.5 rounded-full rotate-3 shadow-md">
                                                        -44%
                                                    </span>
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </motion.div>

                                    {/* Cards grid */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className={cn("grid w-full items-stretch", gridClass)}
                                    >
                                        {visibleItems.map((item, index) => (
                                            <div
                                                key={item.type + (item.plan?.tier ?? "stardust")}
                                                className={cn(
                                                    "relative w-full h-full",
                                                    "[transition:z-index_0ms_linear_1000ms] hover:z-50",
                                                    is3 && index === 0 ? "lg:z-10" : "",
                                                    // Middle card gets z-10 on 2-col
                                                    !is3 && count === 2 && index === 0 ? "lg:z-10" : ""
                                                )}
                                            >
                                                {item.type === "stardust" ? (
                                                    <StardustCard defaultPackage={2} />
                                                ) : (
                                                    <PricingCard
                                                        plan={item.plan!}
                                                        index={index}
                                                        isYearly={isYearly}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                </div>
                            </motion.div>
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                )}
            </AnimatePresence>
        </DialogPrimitive.Root>
    );
}

/**
 * Hook to manage unlock modal state with required tier context.
 */
export function useUnlockModal() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [requiredTier, setRequiredTier] = React.useState<"popular" | "premium">("popular");

    return {
        isOpen,
        requiredTier,
        open: (tier: "popular" | "premium" = "popular") => {
            setRequiredTier(tier);
            setIsOpen(true);
        },
        close: () => setIsOpen(false),
    };
}