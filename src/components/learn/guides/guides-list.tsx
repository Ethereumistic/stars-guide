"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Guide } from "@/lib/guides-data";

interface GuideCardProps {
  guide: Guide;
  index: number;
}

export function GuideCard({ guide, index }: GuideCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group relative"
    >
      <Link href={`/learn/guides/${guide.slug}`}>
        <div className="border border-white/10 bg-black/50 rounded-md p-8 hover:border-primary/40 transition-all duration-300 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              {guide.readingTimeMinutes} min read
            </span>
            <span className="text-white/30 text-xs">→</span>
          </div>

          <h2 className="text-2xl font-serif text-white mb-3 group-hover:text-primary transition-colors">
            {guide.title}
          </h2>

          <p className="text-white/60 text-sm mb-6 flex-1">
            {guide.subtitle}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {guide.secondaryKeywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-wider text-white/40 rounded-sm"
              >
                {kw}
              </span>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <span className="text-primary/80 text-sm font-medium">
              Read guide →
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

interface GuidesListProps {
  guides: Guide[];
}

export function GuidesList({ guides }: GuidesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {guides.map((guide, i) => (
        <GuideCard key={guide.slug} guide={guide} index={i} />
      ))}
    </div>
  );
}