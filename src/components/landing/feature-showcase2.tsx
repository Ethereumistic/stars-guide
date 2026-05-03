"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BirthChartSlide } from "./feature-slides/birth-chart-slide";
import { LearnSlide } from "./feature-slides/learn-slide";
import { AstronomicalEngineSlide } from "./feature-slides/astronomical-engine-slide";
import { DeepReadingsSlide } from "./feature-slides/deep-readings-slide";
import { BinauralBeatsSlide } from "./feature-slides/binaural-beats-slide";

/* ── Types ──────────────────────────────────────────────────── */

interface SlideDef {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  rightTitle: string;
  rightDescription: string;
  accentColor?: string;
}

/* ── Slide Config ─────────────────────────────────────────── */

const SLIDES: SlideDef[] = [
  {
    id: "birth-chart",
    badge: "Astrological Foundation",
    title: "Cast Your Birth Chart",
    subtitle: "Discover your cosmic blueprint in seconds",
    rightTitle: "Visualize Your Cosmos",
    rightDescription:
      "Watch the stars align in real-time as you enter your birth details.",
    accentColor: "text-primary",
  },
  {
    id: "celestial-archive",
    badge: "Zodiac Library",
    title: "Celestial Archive",
    subtitle: "Explore the mythology and meaning of every sign",
    rightTitle: "Ancient Wisdom",
    rightDescription:
      "Dive into centuries of astrological knowledge curated for modern seekers.",
    accentColor: "text-amber-400",
  },
  {
    id: "deep-readings",
    badge: "Oracle",
    title: "Deep Readings",
    subtitle: "Daily horoscopes powered by real celestial positions",
    rightTitle: "Living Transits",
    rightDescription:
      "Your reading updates as the planets move — not generic fluff.",
    accentColor: "text-emerald-400",
  },
  {
    id: "astronomical-engine",
    badge: "Live Sky",
    title: "Astronomical Engine",
    subtitle: "Real-time planetary positions and sky events",
    rightTitle: "The Living Sky",
    rightDescription:
      "Track retrogrades, lunar phases, and major conjunctions as they happen.",
    accentColor: "text-sky-400",
  },
  {
    id: "binaural-beats",
    badge: "Resonance",
    title: "Binaural Beats",
    subtitle: "Sound frequencies tuned to your natal chart",
    rightTitle: "Harmonic Healing",
    rightDescription:
      "Experience audio sessions engineered to your unique celestial frequencies.",
    accentColor: "text-violet-400",
  },
];

const TOTAL_SLIDES = SLIDES.length;

/* ── Desktop Horizontal Scroll ─────────────────────────────── */

function DesktopShowcase() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [wasActiveStates, setWasActiveStates] = React.useState<boolean[]>(() =>
    Array(TOTAL_SLIDES).fill(false),
  );
  const [isContainerVisible, setIsContainerVisible] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeIndexRef = React.useRef(0);

  /* IntersectionObserver — prevents first slide from animating before scroll reaches it */
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsContainerVisible(entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  /* Snap-based horizontal translation — 20% transition zones (matches example) */
  const snapInputs: number[] = [];
  const snapOutputs: string[] = [];

  for (let i = 0; i < TOTAL_SLIDES; i++) {
    const slideStart = i / TOTAL_SLIDES;
    const slideEnd = (i + 1) / TOTAL_SLIDES;
    const transitionZone = (slideEnd - slideStart) * 0.2;

    if (i === 0) {
      snapInputs.push(0);
      snapOutputs.push("0vw");
    }

    snapInputs.push(slideStart + transitionZone);
    snapOutputs.push(`-${i * 100}vw`);

    snapInputs.push(slideEnd - transitionZone);
    snapOutputs.push(`-${i * 100}vw`);

    if (i === TOTAL_SLIDES - 1) {
      snapInputs.push(1);
      snapOutputs.push(`-${i * 100}vw`);
    }
  }

  const x = useTransform(scrollYProgress, snapInputs, snapOutputs);

  /* Active index tracking — exact logic from example */
  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      let newIndex = 0;

      for (let i = 0; i < TOTAL_SLIDES; i++) {
        const slideStart = i / TOTAL_SLIDES;
        const slideEnd = (i + 1) / TOTAL_SLIDES;
        const transitionZone = (slideEnd - slideStart) * 0.2;
        const slideMidpoint = (slideStart + slideEnd) / 2;

        if (latest >= slideMidpoint) {
          newIndex = i;
        }
        if (i === 0 && latest < slideEnd - transitionZone) {
          newIndex = 0;
        }
      }

      for (let i = TOTAL_SLIDES - 1; i >= 0; i--) {
        const slideStart = i / TOTAL_SLIDES;
        const slideEnd = (i + 1) / TOTAL_SLIDES;
        const transitionZone = (slideEnd - slideStart) * 0.2;
        if (
          latest >= slideStart + transitionZone &&
          latest <= slideEnd - transitionZone
        ) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== activeIndexRef.current) {
        const prevIndex = activeIndexRef.current;
        activeIndexRef.current = newIndex;
        setWasActiveStates((prev) => {
          const updated = [...prev];
          updated[prevIndex] = true;
          return updated;
        });
        setActiveIndex(newIndex);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, TOTAL_SLIDES]);

  /* Navigate to a specific slide by scrolling the page (exact from example) */
  const navigateToSlide = React.useCallback(
    (slideIndex: number) => {
      if (!containerRef.current) return;
      const containerTop = containerRef.current.offsetTop;
      const totalScrollHeight =
        containerRef.current.scrollHeight - window.innerHeight;

      const slideCenter = (slideIndex + 0.5) / TOTAL_SLIDES;
      const targetScroll = containerTop + slideCenter * totalScrollHeight;

      window.scrollTo({
        top: targetScroll,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [TOTAL_SLIDES, prefersReducedMotion],
  );

  const handlePrev = React.useCallback(() => {
    if (activeIndex === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigateToSlide(activeIndex - 1);
    }
  }, [activeIndex, navigateToSlide]);

  const handleNext = React.useCallback(() => {
    if (activeIndex === TOTAL_SLIDES - 1) {
      if (containerRef.current) {
        const containerBottom =
          containerRef.current.offsetTop + containerRef.current.offsetHeight;
        window.scrollTo({ top: containerBottom, behavior: "smooth" });
      }
    } else {
      navigateToSlide(activeIndex + 1);
    }
  }, [activeIndex, TOTAL_SLIDES, navigateToSlide]);

  return (
    <div
      ref={containerRef}
      className="relative hidden lg:block"
      style={{ height: `${TOTAL_SLIDES * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Chevron Left */}
        <button
          onClick={handlePrev}
          className="absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card hover:shadow-xl transition-all duration-200 group cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Chevron Right */}
        <button
          onClick={handleNext}
          className="absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card hover:shadow-xl transition-all duration-200 group cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Horizontal sliding container */}
        <motion.div className="flex h-full" style={{ x }}>
          {SLIDES.map((slide, index) => (
            <section
              key={slide.id}
              className="shrink-0 w-screen h-full flex items-center justify-center overflow-hidden"
            >
              {index === 0 ? (
                <BirthChartSlide
                  isActive={index === activeIndex && isContainerVisible}
                  wasActive={wasActiveStates[index] && index !== activeIndex}
                />
              ) : index === 1 ? (
                <LearnSlide
                  isActive={index === activeIndex && isContainerVisible}
                  wasActive={wasActiveStates[index] && index !== activeIndex}
                />
              ) : index === 2 ? (
                <DeepReadingsSlide
                  isActive={index === activeIndex && isContainerVisible}
                  wasActive={wasActiveStates[index] && index !== activeIndex}
                />
              ) : index === 3 ? (
                <AstronomicalEngineSlide
                  isActive={index === activeIndex && isContainerVisible}
                  wasActive={wasActiveStates[index] && index !== activeIndex}
                />
              ) : (
                <BinauralBeatsSlide
                  isActive={index === activeIndex && isContainerVisible}
                  wasActive={wasActiveStates[index] && index !== activeIndex}
                />
              )}
            </section>
          ))}
        </motion.div>

        {/* Progress indicator — pill style (matches example) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => navigateToSlide(i)}
              className={cn(
                "h-2 transition-all rounded-full duration-300 cursor-pointer hover:opacity-80",
                i === activeIndex
                  ? "w-12 bg-primary"
                  : "w-2 bg-muted hover:bg-muted-foreground/40",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Vertical Scroll ────────────────────────────────── */

function MobileShowcase() {
  return (
    <div
      className="lg:hidden bg-background"
      style={{
        scrollSnapType: "y mandatory",
        scrollPadding: "0px",
      }}
    >
      {SLIDES.map((slide, index) => (
        <section
          key={slide.id}
          className="min-h-screen flex items-center justify-center snap-start snap-always py-12"
        >
          {index === 0 ? (
            <BirthChartSlide isActive={true} />
          ) : index === 1 ? (
            <LearnSlide isActive={true} />
          ) : index === 2 ? (
            <DeepReadingsSlide isActive={true} />
          ) : index === 3 ? (
            <AstronomicalEngineSlide isActive={true} />
          ) : (
            <BinauralBeatsSlide isActive={true} />
          )}
        </section>
      ))}
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────────── */

export function FeatureShowcase2() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return <MobileShowcase />;
  }

  return <DesktopShowcase />;
}
