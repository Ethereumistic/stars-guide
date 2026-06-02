"use client";

import { motion } from "motion/react";

/* ── Slide Indicators (4 dots) ─────────────────────────────── */

export function SlideIndicators({
  active,
  onSelect,
}: {
  active: 0 | 1 | 2 | 3;
  onSelect: (i: 0 | 1 | 2 | 3) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {([0, 1, 2, 3] as const).map((i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="relative h-1.5 rounded-full transition-all duration-500 cursor-pointer"
          style={{
            width: i === active ? 28 : 8,
            backgroundColor: i === active ? "var(--primary)" : "rgba(255,255,255,0.15)",
          }}
        >
          {i === active && (
            <motion.div
              className="absolute inset-0 rounded-full bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}