"use client";

import { motion } from "motion/react";
import OracleEye from "./oracle-eye";

/**
 * Phase 3 — Oracle Eye
 *
 * A mystical all-seeing eye rendered via WebGL shader (OGL).
 * The pupil animates with procedural saccade movement.
 *
 * The eye is absolutely positioned so it can be large without
 * pushing the text out of the container. The text is pinned
 * to the bottom-center, always inside the circular frame.
 */
export function OracleEyeSlide() {
  return (
    <motion.div
      key="oracle-eye"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full h-full"
    >
      {/* Eye — absolutely positioned so it doesn't push the text.
          Centered horizontally, shifted slightly above center vertically
          to leave room for the text pinned at the bottom. */}
      <div className="absolute -top-[8%] left-1/2 -translate-x-1/2 w-[40rem] h-[35rem]">
        <OracleEye
          intensity={1.4}
          pupilSize={0.6}
          irisWidth={0.25}
          glowIntensity={0.35}
          scale={0.48}
          noiseScale={1.0}
          flameSpeed={1.0}
        />
      </div>

      {/* Text — pinned to the bottom-center of the container */}
      <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2 flex flex-col items-center">
        <motion.h2
          className="text-5xl lg:text-[4.25rem] font-serif tracking-wide text-center text-nowrap"
          style={{ color: "#ffffff" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Oracle AI
        </motion.h2>

        <motion.div
          className="flex items-center gap-2 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
            AI-Powered
          </span>
          <span className="text-primary/25">·</span>
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-primary">
            Real-Time Astronomy
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}