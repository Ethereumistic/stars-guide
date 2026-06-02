"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiMazeCornea, GiCursedStar } from "react-icons/gi";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion } from "motion/react";

/**
 * Hero0 — Left-column text block
 *
 * Contains the headline, sub-copy, CTA buttons, and social proof.
 * Accepts a `mounted` flag so entrance animations fire only after
 * the client has hydrated.
 */
export function HeroText({ mounted }: { mounted: boolean }) {
  return (
    <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-7">
      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="space-y-2"
      >
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
          <span className="block text-foreground">Navigate Your</span>
          <span className="block whitespace-nowrap bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Cosmic Journey
          </span>
        </h1>
      </motion.div>

      {/* Sub-copy */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-xl text-base sm:text-lg text-muted-foreground font-sans leading-relaxed"
      >
        Your personal AI astrologer that remembers your story, understands
        your patterns, and guides you through life's transits with{" "}
        <span className="text-foreground font-medium italic">wisdom</span>, not{" "}
        <span className="text-foreground font-medium italic">fortune-telling</span>.
      </motion.p>

      {/* CTA buttons */}
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

      {/* Social proof */}
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
  );
}