"use client";

import * as React from "react";
import { motion } from "motion/react";

/**
 * Hero0 — Decorative frame that wraps the slide carousel
 *
 * Renders the ambient golden glow and slowly-rotating
 * concentric decorative rings behind the slide content.
 */
export function SlideFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center justify-center"
    >
      {/* Ambient golden glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-72 h-72 md:w-[28rem] md:h-[28rem] bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Slow-rotating outer decorative ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[110%] h-[110%] max-w-[580px] max-h-[580px] rounded-full border border-primary/10"
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
          className="w-[95%] h-[95%] max-w-[520px] max-h-[520px] rounded-full border border-dashed border-primary/[0.07]"
          animate={{ rotate: -360 }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {children}
    </motion.div>
  );
}