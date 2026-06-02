"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

import { SLIDE_DURATIONS } from "./slides/constants";
import { SAMPLE_CHART, PLACEMENTS } from "./slides/placements";
import { getRetrogradeSlides } from "./slides/retrograde-logic";
import { ChartSlide } from "./slides/chart-slide";
import { SignCard } from "./slides/sign-card";
import { RetrogradeCard } from "./slides/retrograde-card";
import { OracleEyeSlide } from "./slides/oracle-eye-slide";
import { SlideIndicators } from "./slides/slide-indicators";
import { HeroText } from "./slides/hero-text";
import { SlideFrame } from "./slides/slide-frame";

/**
 * Hero0 — 4 auto-rotating slides:
 *   Slide 0 (6s): Full natal chart
 *   Slide 1 (3 × 4s): Big Three (Sun → Moon → Rising)
 *   Slide 2 (max 4 × 4s): Retrograde planets
 *   Slide 3 (6s): Oracle Eye
 * All loop continuously.
 */
export function Hero0() {
  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<0 | 1 | 2 | 3>(0);
  const [placementIdx, setPlacementIdx] = React.useState(0);
  const [retroIdx, setRetroIdx] = React.useState(0);
  const [retroSlides, setRetroSlides] = React.useState<
    Awaited<ReturnType<typeof getRetrogradeSlides>>
  >([]);

  React.useEffect(() => {
    setMounted(true);
    setRetroSlides(getRetrogradeSlides());
  }, []);

  const retroCount = retroSlides.length;

  /* ── Phase & sub-slide auto-rotation ─────────────────────── */
  React.useEffect(() => {
    if (!mounted) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 0) {
      timer = setTimeout(() => {
        setPhase(1);
        setPlacementIdx(0);
      }, SLIDE_DURATIONS.chart);
    } else if (phase === 1) {
      timer = setTimeout(() => {
        if (placementIdx < PLACEMENTS.length - 1) {
          setPlacementIdx((prev) => prev + 1);
        } else {
          if (retroCount > 0) {
            setPhase(2);
            setRetroIdx(0);
          } else {
            setPhase(3);
          }
        }
      }, SLIDE_DURATIONS.placement);
    } else if (phase === 2) {
      timer = setTimeout(() => {
        if (retroIdx < retroCount - 1) {
          setRetroIdx((prev) => prev + 1);
        } else {
          setPhase(3);
        }
      }, SLIDE_DURATIONS.retrograde);
    } else {
      timer = setTimeout(() => {
        setPhase(0);
      }, SLIDE_DURATIONS.oracle);
    }

    return () => clearTimeout(timer);
  }, [mounted, phase, placementIdx, retroIdx, retroCount]);

  const currentRetro =
    retroCount > 0 ? retroSlides[retroIdx % retroCount] : null;

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* ── Left: Text ── */}
          <HeroText mounted={mounted} />

          {/* ── Right: Slides ── */}
          <div className="relative">
            <SlideFrame>
              {/* Fixed-aspect container — guarantees consistent height across all slides,
                  so the indicators below never shift. */}
              <div className="relative w-full max-w-[580px] aspect-square overflow-clip mx-auto">
                <AnimatePresence mode="wait">
                  {phase === 0 && <ChartSlide data={SAMPLE_CHART} />}

                  {phase === 1 && PLACEMENTS[placementIdx] && (
                    <motion.div
                      key={`placement-${placementIdx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      <SignCard placement={PLACEMENTS[placementIdx]} />
                    </motion.div>
                  )}

                  {phase === 2 && currentRetro && (
                    <motion.div
                      key={`retro-${currentRetro.planetId}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      <RetrogradeCard retroWindow={currentRetro} />
                    </motion.div>
                  )}

                  {phase === 3 && <OracleEyeSlide />}
                </AnimatePresence>
              </div>
            </SlideFrame>

            {/* Indicators — always visible at bottom of right column */}
            <div className="flex justify-center mt-8">
              <SlideIndicators
                active={phase}
                onSelect={(i) => {
                  setPhase(i);
                  setPlacementIdx(0);
                  setRetroIdx(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}