"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface PlaceholderSlideProps {
  badge: string;
  title: string;
  subtitle: string;
  rightTitle: string;
  rightDescription: string;
  accentColor?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  wasActive?: boolean;
}

export function PlaceholderSlide({
  badge,
  title,
  subtitle,
  rightTitle,
  rightDescription,
  accentColor = "text-primary",
  icon,
  isActive,
}: PlaceholderSlideProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 h-full items-center px-6 md:px-12 max-w-[1600px] mx-auto">
      {/* Left Column */}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, x: -40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-4">
          <span
            className={cn(
              "inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-primary/5 border-primary/10",
              accentColor,
            )}
          >
            {badge}
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.1]">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base uppercase tracking-widest font-medium max-w-md">
            {subtitle}
          </p>
        </div>

        {icon && (
          <div className="pt-4 opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </motion.div>

      {/* Right Column */}
      <motion.div
        className="flex items-center justify-center lg:justify-end"
        initial={{ opacity: 0, x: 40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <div className="max-w-md space-y-4 text-right lg:text-right">
          <h3 className="text-2xl md:text-3xl font-serif tracking-tight">
            {rightTitle}
          </h3>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            {rightDescription}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
