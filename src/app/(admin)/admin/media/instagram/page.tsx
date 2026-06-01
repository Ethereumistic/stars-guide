"use client";

import { compositionalSigns } from "@/astrology/signs";
import { zodiacUIConfig } from "@/config/zodiac-ui";
import { CompactSignCard } from "@/components/horoscopes/compact-sign-card";
import { motion } from "motion/react";

export default function InstagramMediaPage() {
  return (
    <div className="max-w-6xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Instagram Media
        </h1>
        <p className="text-muted-foreground mt-1">
          Select a sign to create an Instagram story/post screenshot.
        </p>
      </div>

      {/* Sign Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {compositionalSigns.map((sign, index) => {
          const ui = zodiacUIConfig[sign.id];
          if (!ui) return null;
          return (
            <motion.div
              key={sign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <CompactSignCard
                data={sign}
                ui={ui}
                href={`/admin/media/instagram/${sign.id}`}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}