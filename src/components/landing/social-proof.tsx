"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GiMazeCornea } from "react-icons/gi";
import { ArrowRight, Star } from "lucide-react";
import { zodiacUIConfig } from "@/config/zodiac-ui";

const TESTIMONIALS = [
  {
    name: "Rada",
    avatar: "rada",
    sign: "aries",
    text: "checked the transits before a big meeting, timing was dead on. been opening this every morning since, which says a lot cause i quit apps after 2 days",
  },
  {
    name: "Mihaela",
    avatar: "mihaela",
    sign: "scorpio",
    text: "the oracle brought up a saturn return pattern i hadn't told anyone about. genuinely spooked. never had an app do that before and i've tried them all",
  },
  {
    name: "Tsveti",
    avatar: "cura",
    sign: "capricorn",
    text: "compared the chart math with my swiss ephemeris. planet positions, house cusps, all matched exactly. only astrology app where i actually trust the numbers",
  },
  {
    name: "Maria",
    avatar: "maria",
    sign: "taurus",
    text: "venus return reading pointed straight at a creative project i'd been putting off for months. launched my first collection two weeks later. wouldn't have without this",
  },
];

const STATS = [
  { value: "10,000+", label: "Cosmic Seekers" },
  { value: "2M+", label: "Readings Generated" },
  { value: "99.7%", label: "Calculation Accuracy" },
];

export function SocialProof() {
  return (
    <section className="relative w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
          Trusted by <span className="text-primary">Stargazers</span>
        </h2>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-px mb-12 md:mb-16"
      >
        {STATS.map((stat, i) => (
          <div key={stat.label} className="text-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: 0.2 + i * 0.1,
                type: "spring",
              }}
              className="text-3xl md:text-4xl font-serif text-primary tracking-tight mb-1"
            >
              {stat.value}
            </motion.div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
              {stat.label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
        {TESTIMONIALS.map((testimonial, i) => {
          const SignIcon = zodiacUIConfig[testimonial.sign]?.icon;

          return (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="border border-white/[0.06] bg-black/30 rounded-md p-6 md:p-8 relative group hover:border-white/10 transition-all duration-500"
            >
              {/* Quote mark */}
              <span className="absolute top-4 right-6 text-5xl font-serif text-white/[0.03] leading-none select-none group-hover:text-white/[0.06] transition-colors">
                &ldquo;
              </span>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} className="size-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-sm md:text-base text-white/60 font-sans leading-relaxed mb-6 relative z-10">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border border-white/10">
                  <AvatarImage
                    src={`https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/testimonials/${testimonial.avatar}.webp`}
                    alt={testimonial.name}
                  />
                </Avatar>
                <div>
                  <span className="text-sm font-serif text-white/80 block">
                    {testimonial.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {SignIcon && (
                      <SignIcon className="size-3 text-primary/50" />
                    )}
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                      {testimonial.sign}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center mt-12 md:mt-16 space-y-4"
      >
        <p className="text-muted-foreground/60 font-sans text-sm">
          Join thousands who trust stars.guide for cosmic guidance
        </p>
        <Button
          size="lg"
          asChild
          className="group font-serif uppercase tracking-widest text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
        >
          <Link href="/onboarding" className="flex items-center gap-2">
            <GiMazeCornea className="size-5 transition-transform group-hover:rotate-180 duration-700" />
            <span>Begin Your Journey</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 duration-300" />
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}
