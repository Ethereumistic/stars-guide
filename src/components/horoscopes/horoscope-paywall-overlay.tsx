"use client";

import { motion } from "motion/react";
import { Lock, ArrowUpRight } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface HoroscopePaywallOverlayProps {
    /** Which tier is required to unlock this date */
    requiredTier: "popular" | "premium";
    /** ISO date string YYYY-MM-DD — shown in the date pill */
    date: string;
    /** Callback when user clicks unlock */
    onUnlock: () => void;
}

/**
 * HoroscopePaywallOverlay — Minimal Lock Card
 * ─────────────────────────────────────────────────────────────────
 * A stripped-down locked state for yesterday/tomorrow horoscopes.
 * 
 * Design principles:
 * - Minimal: just the lock, date, and one unified unlock button
 * - No tier names (no "Cosmic Flow" or "Oracle" labels)
 * - Shows what it unlocks: "Unlock Yesterday & Tomorrow"
 * - Color-coded: popular = primary (gold), premium = galactic (violet)
 * - Opens the UnlockModal with upgrade options when clicked
 */
export function HoroscopePaywallOverlay({
    requiredTier,
    date,
    onUnlock,
}: HoroscopePaywallOverlayProps) {
    const isPopular = requiredTier === "popular";

    // Tier-keyed tokens
    const tier = isPopular
        ? {
              hex: "#D4AF37",
              rgb: "212, 175, 55",
              text: "text-primary",
              border: "border-primary/20",
              btn: "bg-primary text-primary-foreground hover:bg-primary/90",
              unlockText: "Unlock Yesterday & Tomorrow",
          }
        : {
              hex: "#9D4EDD",
              rgb: "157, 78, 221",
              text: "text-galactic",
              border: "border-galactic/20",
              btn: "bg-galactic/15 text-white border border-galactic/50 hover:bg-galactic/25 hover:border-galactic/70",
              unlockText: "Unlock the Full Week",
          };

    // Friendly date label for the pill
    const parsed = parseISO(date);
    const displayDate = isValid(parsed)
        ? format(parsed, "EEE · MMM d, yyyy").toUpperCase()
        : date;

    return (
        <div className={cn(
            "relative border border-white/10 bg-black/50 rounded-md overflow-hidden min-h-134",
            "before:absolute before:inset-0 before:pointer-events-none",
            "before:rounded-md before:opacity-0 before:transition-opacity"
        )}>
            {/* Subtle tier-colored vignette */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(120% 80% at 50% 50%, rgba(${tier.rgb}, 0.08) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)
                    `,
                }}
            />

            {/* Subtle grain texture */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                }}
            />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 min-h-134 flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-12 text-center gap-8"
            >
                {/* Lock icon */}
                <motion.div
                    className="relative flex items-center justify-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Glow aura */}
                    <div
                        className="absolute inset-0 rounded-full blur-xl"
                        style={{
                            backgroundColor: tier.hex,
                            opacity: 0.15,
                        }}
                    />
                    
                    {/* Lock circle */}
                    <div
                        className={cn(
                            "relative w-16 h-16 rounded-full flex items-center justify-center",
                            "border",
                            tier.border
                        )}
                        style={{
                            background: `radial-gradient(circle at 50% 30%, rgba(${tier.rgb}, 0.15) 0%, rgba(0,0,0,0.4) 70%)`,
                            boxShadow: `0 0 30px -8px ${tier.hex}`,
                        }}
                    >
                        <Lock
                            className={cn("size-6", tier.text)}
                            strokeWidth={1.5}
                            style={{ filter: `drop-shadow(0 0 4px ${tier.hex})` }}
                        />
                    </div>
                </motion.div>

                {/* Locked text - shows what's being unlocked */}
                <div className="space-y-1">
                    <p className="text-sm font-mono tracking-[0.15em] uppercase text-white/40">
                        {displayDate}
                    </p>
                    <h2 className="text-lg sm:text-xl font-serif text-white tracking-tight">
                        Unlock Yesterday & Tomorrow
                    </h2>
                </div>

                {/* Unified unlock button */}
                <button
                    onClick={onUnlock}
                    className={cn(
                        "group relative inline-flex items-center justify-center gap-2",
                        "h-11 px-6 rounded-md",
                        "font-serif font-bold tracking-[0.15em] text-sm uppercase",
                        "transition-all duration-300",
                        tier.btn
                    )}
                    style={{
                        boxShadow: `0 0 20px -4px rgba(${tier.rgb}, 0.4)`,
                    }}
                >
                    <span>Unlock</span>
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
            </motion.div>
        </div>
    );
}