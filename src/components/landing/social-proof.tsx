"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GiMazeCornea } from "react-icons/gi";
import { ArrowRight, Star } from "lucide-react";
import { zodiacUIConfig } from "@/config/zodiac-ui";

/** Lightweight IntersectionObserver hook — no library needed */
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("revealed");
          io.disconnect();
        }
      },
      { rootMargin: "-80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

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
  const headingRef = useReveal();
  const statsRef = useReveal();
  const ctaRef = useReveal();
  const cardRefs = TESTIMONIALS.map(() => useReveal<HTMLDivElement>());

  return (
    <section className="relative w-full overflow-hidden">
      {/*
        CSS-only reveal animations.
        Elements start invisible via opacity + translate, then transition
        smoothly when IntersectionObserver adds the "revealed" class.
        No JS animation library — pure CSS transitions, zero flicker.
      */}
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-d1 { transition-delay: 0.06s; }
        .reveal-d2 { transition-delay: 0.12s; }
        .reveal-d3 { transition-delay: 0.18s; }
        .reveal-d4 { transition-delay: 0.24s; }
        .reveal.revealed .stat-value {
          opacity: 1;
          transform: scale(1);
        }
        .stat-value {
          opacity: 0;
          transform: scale(0.9);
          transition: opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s;
        }
        .stat-value-d2 { transition: opacity 0.4s ease 0.25s, transform 0.4s ease 0.25s; }
        .stat-value-d3 { transition: opacity 0.4s ease 0.35s, transform 0.4s ease 0.35s; }
      `}</style>

      <div
        ref={headingRef}
        className="reveal text-center mb-12 md:mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">
          Trusted by <span className="text-primary">Stargazers</span>
        </h2>
      </div>

      {/* Stats bar */}
      <div
        ref={statsRef}
        className="reveal max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-px mb-12 md:mb-16"
      >
        {STATS.map((stat, i) => (
          <div key={stat.label} className="text-center px-4 py-6">
            <div
              className={`stat-value stat-value-d${i + 1} text-3xl md:text-4xl font-serif text-primary tracking-tight mb-1`}
            >
              {stat.value}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
        {TESTIMONIALS.map((testimonial, i) => {
          const SignIcon = zodiacUIConfig[testimonial.sign]?.icon;

          return (
            <div
              key={testimonial.name}
              ref={cardRefs[i]}
              className={`reveal reveal-d${i + 1} border border-white/[0.06] bg-black/30 rounded-md p-6 md:p-8 relative group hover:border-white/10 transition-all duration-500`}
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
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div
        ref={ctaRef}
        className="reveal reveal-d2 text-center mt-12 md:mt-16 space-y-4"
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
      </div>
    </section>
  );
}
