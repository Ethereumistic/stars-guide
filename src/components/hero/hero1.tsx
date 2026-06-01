"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiMazeCornea, GiCursedStar } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion } from "motion/react";
import { calculateFullChart, type ChartData } from "@/lib/birth-chart/full-chart";
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view";

/**
 * Hero1 — "Orbital Chart"
 *
 * Split layout: editorial text left, massive animated natal chart right.
 * The chart slowly breathes/pulses and has a golden ambient glow.
 * Typography uses staggered motion reveals with Cinzel serif.
 * Desktop: 2-column split. Mobile: chart hidden behind a fade, text on top.
 */

const SAMPLE_CHART = calculateFullChart(1995, 6, 15, 12, 0, 40.7128, -74.006);

export function Hero1() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
      {/* Background: subtle radial gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vh] opacity-[0.04]"
          style={{ background: "radial-gradient(circle at 70% 50%, var(--sun) 0%, transparent 50%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* ── Left: Text Content ─────────────────────── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-7 order-2 lg:order-1">

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-serif text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Precision Astronomy
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-2"
            >
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                <span className="block text-foreground">Navigate Your</span>
                <span className="block bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Cosmic Journey
                </span>
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-xl text-base sm:text-lg text-muted-foreground font-sans leading-relaxed"
            >
              Your personal AI astrologer that remembers your story, understands
              your patterns, and guides you through life's transits with{" "}
              <span className="text-foreground font-medium italic">wisdom</span>,{" "}
              not{" "}
              <span className="text-foreground font-medium italic">fortune-telling</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <Button
                size="lg"
                asChild
                className="group relative overflow-hidden font-serif uppercase tracking-widest text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
              >
                <Link href="/onboarding" className="flex items-center gap-2">
                  <GiMazeCornea className="size-5 transition-transform group-hover:rotate-180 duration-700" />
                  <span>Birth Chart</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="galactic"
                asChild
                className="group font-serif uppercase tracking-widest text-base px-8 py-6 transition-all duration-300"
              >
                <Link href="/readings" className="flex items-center gap-2">
                  <GiCursedStar className="size-5 transition-transform group-hover:scale-110 duration-300" />
                  <span>Ask Oracle</span>
                </Link>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-6 flex flex-col sm:flex-row items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["cura", "mihaela", "rada", "maria"].map((name) => (
                    <Avatar key={name} className="size-8 border-2 border-background">
                      <AvatarImage
                        src={`https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/testimonials/${name}.webp`}
                        alt={name}
                      />
                    </Avatar>
                  ))}
                </div>
                <span className="font-sans italic">Join 10,000+ cosmic seekers</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-2 font-sans italic">
                <span className="text-primary">★★★★★</span>
                <span>Powered by precision astronomy</span>
              </div>
            </motion.div>
          </div>

          {/* ── Right: Animated Chart ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
            animate={mounted ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-1 lg:order-2 flex items-center justify-center"
          >
            {/* Ambient golden glow behind chart */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Slow-rotating outer decorative ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[110%] h-[110%] max-w-[500px] max-h-[500px] rounded-full border border-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-1.5 rounded-full bg-primary/30" />
              </motion.div>
            </div>

            {/* Counter-rotating inner ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[95%] h-[95%] max-w-[440px] max-h-[440px] rounded-full border border-dashed border-primary/[0.07]"
                animate={{ rotate: -360 }}
                transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* The actual chart */}
            <div className="relative w-full max-w-[340px] md:max-w-[420px] lg:max-w-[480px] aspect-square">
              <ChartCircleView data={SAMPLE_CHART} />
            </div>

            {/* Floating degree markers */}
            <motion.div
              className="absolute top-4 right-4 lg:top-2 lg:right-2 text-[10px] font-mono text-primary/50 tracking-wider"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {SAMPLE_CHART.ascendant?.signId.replace("_", " ")} Rising
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}