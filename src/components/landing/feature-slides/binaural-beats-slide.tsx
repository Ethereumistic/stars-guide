"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Headphones } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

interface BinauralBeatsSlideProps {
  isActive?: boolean;
  wasActive?: boolean;
}

/* ── Brainwave frequency types (order: Alpha, Beta, Delta, Theta) ── */

const BRAINWAVE_TYPES = [
  {
    name: "Alpha",
    symbol: "α",
    range: "8–14 Hz",
    hz: "10",
    state: "Relaxation",
  },
  {
    name: "Beta",
    symbol: "β",
    range: "14–30 Hz",
    hz: "20",
    state: "Focus",
  },
  {
    name: "Delta",
    symbol: "δ",
    range: "0.5–4 Hz",
    hz: "3.5",
    state: "Deep Sleep",
  },
  {
    name: "Theta",
    symbol: "θ",
    range: "4–8 Hz",
    hz: "6.0",
    state: "Meditation",
  },
];

/* ── Card color themes (one per card, no gradients) ── */

const CARD_THEMES = [
  {
    // Alpha — white
    activeBorder: "border-white/25",
    activeBg: "rgba(255,255,255,0.05)",
    symbolColor: "text-white",
    stateColor: "text-white/50",
    glowRgba: "rgba(255,255,255,0.4)",
  },
  {
    // Beta — sky
    activeBorder: "border-sky-400/30",
    activeBg: "rgba(56,189,248,0.06)",
    symbolColor: "text-sky-400",
    stateColor: "text-sky-400/50",
    glowRgba: "rgba(56,189,248,0.4)",
  },
  {
    // Delta — primary
    activeBorder: "border-primary/30",
    activeBg: "oklch(0.7838 0.0891 83.577 / 0.08)",
    symbolColor: "text-primary",
    stateColor: "text-primary/50",
    glowRgba: "oklch(0.7838 0.0891 83.577 / 0.4)",
  },
  {
    // Theta — galactic (purple)
    activeBorder: "border-galactic/30",
    activeBg: "rgba(157,78,221,0.06)",
    symbolColor: "text-galactic",
    stateColor: "text-galactic/50",
    glowRgba: "rgba(157,78,221,0.4)",
  },
];

/* ── Visualizer color palette per frequency ── */

type RGBA = [number, number, number];

interface FreqVisual {
  /** Base RGB for bars, particles, glows */
  color: RGBA;
  /** Animation speed multiplier (low Hz → slow, high Hz → fast) */
  speed: number;
  /** Wave amplitude (low Hz → wide gentle, high Hz → tight intense) */
  waveAmplitude: number;
  /** Number of wave peaks around the ring */
  waveFreq: number;
}

const FREQ_VISUALS: FreqVisual[] = [
  {
    // Alpha 8–14 Hz — calm, steady
    color: [220, 220, 240],
    speed: 0.014,
    waveAmplitude: 0.3,
    waveFreq: 10,
  },
  {
    // Beta 14–30 Hz — fast, sharp
    color: [56, 189, 248],
    speed: 0.028,
    waveAmplitude: 0.5,
    waveFreq: 20,
  },
  {
    // Delta 0.5–4 Hz — very slow, deep (primary amber)
    color: [212, 180, 117],
    speed: 0.005,
    waveAmplitude: 0.2,
    waveFreq: 4,
  },
  {
    // Theta 4–8 Hz — slow, dreamy
    color: [157, 78, 221],
    speed: 0.009,
    waveAmplitude: 0.25,
    waveFreq: 6,
  },
];

function rgba(c: RGBA, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* ── Circular Waveform Canvas Visualizer ───────────────────── */

function ResonanceVisualizer({
  isActive,
  activeFreq,
}: {
  isActive?: boolean;
  activeFreq: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);
  const barsRef = React.useRef(new Float32Array(64).fill(0));
  const phaseRef = React.useRef(0);
  // Smoothly interpolated current color/speed
  const lerpRef = React.useRef({
    r: 220,
    g: 220,
    b: 240,
    speed: 0.014,
    amp: 0.3,
    freq: 10,
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const cx = W / 2;
    const cy = H / 2;
    const minDim = Math.min(W, H);
    const innerR = minDim * 0.17;
    const maxBarH = minDim * 0.16;
    const numBars = 64;
    let running = true;

    const lerp = lerpRef.current;
    const target = FREQ_VISUALS[activeFreq];

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      // Smoothly lerp towards target frequency params
      const lerpRate = 0.03;
      lerp.r += (target.color[0] - lerp.r) * lerpRate;
      lerp.g += (target.color[1] - lerp.g) * lerpRate;
      lerp.b += (target.color[2] - lerp.b) * lerpRate;
      lerp.speed += (target.speed - lerp.speed) * lerpRate;
      lerp.amp += (target.waveAmplitude - lerp.amp) * lerpRate;
      lerp.freq += (target.waveFreq - lerp.freq) * lerpRate;

      phaseRef.current += lerp.speed;

      const col: RGBA = [lerp.r, lerp.g, lerp.b];
      const breathe = Math.sin(phaseRef.current * 0.4) * minDim * 0.006;
      const effectiveInnerR = innerR + breathe;

      /* ── Radial bars ── */
      for (let i = 0; i < numBars; i++) {
        const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;

        const waveTarget =
          (Math.sin(phaseRef.current * 1.1 + i * (lerp.freq * 0.11)) *
            lerp.amp +
            Math.sin(phaseRef.current * 0.6 + i * (lerp.freq * 0.06)) *
              lerp.amp *
              0.6 +
            0.35) *
          maxBarH;

        barsRef.current[i] += (waveTarget - barsRef.current[i]) * 0.07;
        const barH = Math.max(2, barsRef.current[i]);

        const baseR = effectiveInnerR + 5;
        const x1 = cx + Math.cos(angle) * baseR;
        const y1 = cy + Math.sin(angle) * baseR;
        const x2 = cx + Math.cos(angle) * (baseR + barH);
        const y2 = cy + Math.sin(angle) * (baseR + barH);

        const intensity = barH / maxBarH;

        // Glow
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rgba(col, intensity * 0.12);
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();

        // Bar
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = rgba(col, 0.15 + intensity * 0.7);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      /* ── Inner sine wave ring ── */
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const a = (i * Math.PI) / 180;
        const wave =
          Math.sin(a * lerp.freq + phaseRef.current * 2) * 1.5 +
          Math.sin(a * (lerp.freq * 0.6) - phaseRef.current * 1.3) * 1;
        const r = effectiveInnerR + wave;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = rgba(col, 0.12);
      ctx.lineWidth = 1;
      ctx.stroke();

      animRef.current = requestAnimationFrame(animate);
    };

    if (isActive) {
      animate();
    }

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [isActive, activeFreq]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/* ── Main Slide Component ──────────────────────────────────── */

export function BinauralBeatsSlide({ isActive }: BinauralBeatsSlideProps) {
  const [activeFreq, setActiveFreq] = React.useState(0);

  /* Reset + auto-cycle brainwave types */
  React.useEffect(() => {
    if (!isActive) {
      setActiveFreq(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveFreq((prev) => (prev + 1) % BRAINWAVE_TYPES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive]);

  const visual = FREQ_VISUALS[activeFreq];
  const cardTheme = CARD_THEMES[activeFreq];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 h-full items-center px-6 md:px-12 max-w-[1600px] mx-auto py-8 lg:py-0">
      {/* ── Left Column: Title & Info (1 col) ── */}
      <motion.div
        className="space-y-6 col-span-1"
        initial={{ opacity: 0, x: -40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="space-y-4">
          <span className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-galactic/5 border-galactic/15 text-galactic">
            Resonance
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.1]">
            Binaural
            <br />
            Beats
          </h2>
          <p className="text-muted-foreground text-sm md:text-base uppercase tracking-widest font-medium max-w-md">
            Sound frequencies tuned to your natal chart
          </p>
        </div>

        <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-sm">
          Each planetary placement carries a unique vibrational signature. Our
          engine maps your chart to precise binaural frequencies — two tones
          woven together to guide your brainwaves into deep cosmic alignment.
        </p>

        {/* Brainwave frequency cards */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {BRAINWAVE_TYPES.map((bw, i) => {
            const theme = CARD_THEMES[i];
            const isActiveCard = i === activeFreq;

            return (
              <motion.button
                key={bw.name}
                onClick={() => setActiveFreq(i)}
                className={cn(
                  "relative flex flex-col items-center justify-center aspect-square rounded-xl p-2 text-center transition-all duration-500 cursor-pointer",
                  isActiveCard
                    ? "border " + theme.activeBorder
                    : "border border-white/5 hover:border-white/10 hover:bg-white/[0.03]",
                )}
                style={{
                  background: isActiveCard
                    ? theme.activeBg
                    : "rgba(255,255,255,0.02)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
              >
                {/* Title */}
                <p
                  className={cn(
                    "text-[10px] font-serif uppercase tracking-wider transition-colors duration-300",
                    isActiveCard ? theme.stateColor : "text-white/40",
                  )}
                >
                  {bw.name}
                </p>

                {/* Greek symbol with glow */}
                <div className="relative flex items-center justify-center my-1.5">
                  {isActiveCard && (
                    <div
                      className="absolute w-10 h-10 rounded-full blur-xl opacity-40"
                      style={{ backgroundColor: theme.glowRgba }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative text-xl md:text-2xl font-light transition-colors duration-300",
                      isActiveCard ? theme.symbolColor : "text-white/25",
                    )}
                  >
                    {bw.symbol}
                  </span>
                </div>

                {/* State */}
                <p
                  className={cn(
                    "text-[9px] tracking-wide leading-tight transition-colors duration-300",
                    isActiveCard ? theme.stateColor : "text-white/25",
                  )}
                >
                  {bw.state}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Feature note */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-8 h-8 rounded-full bg-galactic/10 border border-galactic/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-galactic/80" />
          </div>
          <div className="text-[11px] text-muted-foreground/50 leading-snug">
            <p className="font-medium text-white/60">
              Stereo headphones required
            </p>
            <p>Binaural perception needs left & right channels</p>
          </div>
        </div>
      </motion.div>

      {/* ── Right Column: Circular Visualizer (2 cols) ── */}
      <motion.div
        className="col-span-2 flex items-center justify-center h-full"
        initial={{ opacity: 0, x: 40 }}
        animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <div className="relative w-full max-w-[520px] aspect-square">
          {/* Deep background glow — color reacts to active freq */}
          <motion.div
            className="absolute inset-0 rounded-full blur-[100px]"
            animate={
              isActive
                ? {
                    scale: [1, 1.12, 1],
                    opacity: [0.2, 0.35, 0.2],
                    backgroundColor: rgba(visual.color, 0.25),
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Secondary glow */}
          <motion.div
            className="absolute inset-[15%] rounded-full blur-[80px]"
            animate={
              isActive
                ? {
                    scale: [1, 1.08, 1],
                    opacity: [0.15, 0.25, 0.15],
                    backgroundColor: rgba(visual.color, 0.3),
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Canvas: radial bars — reacts to frequency */}
          <ResonanceVisualizer isActive={isActive} activeFreq={activeFreq} />

          {/* Expanding ripple rings — color reacts */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={
                isActive
                  ? {
                      scale: [0.25, 1.5],
                      opacity: [0.5, 0],
                      borderColor: rgba(visual.color, 0.08 - i * 0.015),
                    }
                  : { opacity: 0 }
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Central orb — color reacts */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="relative flex items-center justify-center rounded-full"
              animate={
                isActive
                  ? {
                      scale: [1, 1.05, 1],
                      opacity: [0.85, 1, 0.85],
                      background: `radial-gradient(circle at 38% 32%,
                        ${rgba(visual.color, 0.3)},
                        ${rgba(visual.color, 0.18)} 55%,
                        ${rgba(visual.color, 0.06)})`,
                      boxShadow: `0 0 50px ${rgba(visual.color, 0.3)}, 0 0 100px ${rgba(visual.color, 0.12)}, inset 0 0 25px ${rgba(visual.color, 0.1)}`,
                      borderColor: rgba(visual.color, 0.2),
                    }
                  : { opacity: 0 }
              }
              style={{
                width: "min(22%, 120px)",
                height: "min(22%, 120px)",
                border: "1px solid rgba(167, 139, 250, 0.2)",
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFreq}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p
                      className="text-base lg:text-lg font-mono font-bold leading-none"
                      style={{ color: rgba(visual.color, 0.9) }}
                    >
                      {BRAINWAVE_TYPES[activeFreq].hz}
                    </p>
                    <p
                      className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] mt-1"
                      style={{ color: rgba(visual.color, 0.5) }}
                    >
                      Hz · {BRAINWAVE_TYPES[activeFreq].name}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Inner ring decoration */}
              <motion.div
                className="absolute inset-[8%] rounded-full pointer-events-none"
                animate={{ borderColor: rgba(visual.color, 0.12) }}
                style={{ border: "1px solid transparent" }}
              />
            </motion.div>
          </div>

          {/* Corner frequency labels */}
          {isActive && (
            <>
              <motion.span
                className="absolute top-[8%] left-[8%] text-[9px] font-mono"
                style={{ color: rgba(visual.color, 0.25) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                200 Hz base
              </motion.span>
              <motion.span
                className="absolute bottom-[8%] right-[8%] text-[9px] font-mono"
                style={{ color: rgba(visual.color, 0.25) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                stereo separation
              </motion.span>
              <motion.span
                className="absolute top-[8%] right-[8%] text-[9px] font-mono"
                style={{ color: rgba(visual.color, 0.2) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                ♪ personalized
              </motion.span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
