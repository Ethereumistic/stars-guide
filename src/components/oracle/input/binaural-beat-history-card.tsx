"use client";

import * as React from "react";
import { Square } from "lucide-react";
import { RiPlayFill, RiHeadphoneLine } from "react-icons/ri";
import { TbWaveSine, TbBrain, TbMoon, TbSun, TbBolt, TbDroplet, TbWind, TbInfinity } from "react-icons/tb";
import { PiWaveformBold } from "react-icons/pi";
import { getBandColor, getBandSymbol, getBrainStateFromBeat } from "@/lib/binaural-frequencies";
import { type BinauralBeatParams, type NoiseType, type StimulationMode, NOISE_PRESETS } from "@/lib/binaural-presets";
import { useBinauralPlayer, formatTime } from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Noise type display config ─────────────────────────────────────────────────
const NOISE_DISPLAY: Record<string, {
  label: string;
  symbol: string;
  color: { bg: string; text: string };
  gradient: string;
  glowColor: string;
}> = {
  white: {
    label: "White Noise",
    symbol: "∿",
    color: { bg: "bg-slate-700/60", text: "text-slate-200" },
    gradient: "from-slate-400/20 via-slate-300/10 to-transparent",
    glowColor: "rgba(148,163,184,0.3)",
  },
  pink: {
    label: "Pink Noise",
    symbol: "∿",
    color: { bg: "bg-rose-900/60", text: "text-rose-200" },
    gradient: "from-rose-500/20 via-rose-400/10 to-transparent",
    glowColor: "rgba(251,113,133,0.3)",
  },
  brown: {
    label: "Brown Noise",
    symbol: "∿",
    color: { bg: "bg-amber-900/60", text: "text-amber-200" },
    gradient: "from-amber-700/20 via-amber-600/10 to-transparent",
    glowColor: "rgba(217,119,6,0.3)",
  },
  grey: {
    label: "Grey Noise",
    symbol: "∿",
    color: { bg: "bg-neutral-700/60", text: "text-neutral-200" },
    gradient: "from-neutral-400/20 via-neutral-300/10 to-transparent",
    glowColor: "rgba(163,163,163,0.3)",
  },
  blue: {
    label: "Blue Noise",
    symbol: "∿",
    color: { bg: "bg-sky-900/60", text: "text-sky-200" },
    gradient: "from-sky-500/20 via-sky-400/10 to-transparent",
    glowColor: "rgba(56,189,248,0.3)",
  },
};

// ── Band config with icons and rich visuals ───────────────────────────────────
const BAND_CONFIG: Record<string, {
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  accentColor: string;
  label: string;
  description: string;
}> = {
  Delta: {
    icon: TbMoon,
    gradient: "from-blue-500/25 via-blue-400/12 to-transparent",
    glowColor: "rgba(147,197,253,0.35)",
    accentColor: "#93c5fd",
    label: "Deep Sleep",
    description: "0.5–4 Hz",
  },
  Theta: {
    icon: TbBrain,
    gradient: "from-violet-500/25 via-violet-400/12 to-transparent",
    glowColor: "rgba(196,181,253,0.35)",
    accentColor: "#c4b5fd",
    label: "Deep Meditation",
    description: "4–8 Hz",
  },
  Alpha: {
    icon: TbWind,
    gradient: "from-emerald-500/25 via-emerald-400/12 to-transparent",
    glowColor: "rgba(110,231,183,0.35)",
    accentColor: "#6ee7b7",
    label: "Relaxed Focus",
    description: "8–14 Hz",
  },
  "Low Beta": {
    icon: TbSun,
    gradient: "from-lime-500/25 via-lime-400/12 to-transparent",
    glowColor: "rgba(190,242,100,0.35)",
    accentColor: "#bef264",
    label: "Light Focus",
    description: "14–21 Hz",
  },
  "Mid Beta": {
    icon: TbBolt,
    gradient: "from-yellow-500/25 via-yellow-400/12 to-transparent",
    glowColor: "rgba(252,211,77,0.35)",
    accentColor: "#fcd34d",
    label: "Active Mind",
    description: "21–30 Hz",
  },
  "High Beta": {
    icon: TbBolt,
    gradient: "from-orange-500/25 via-orange-400/12 to-transparent",
    glowColor: "rgba(253,186,116,0.35)",
    accentColor: "#fdba74",
    label: "Peak Alert",
    description: "30–40 Hz",
  },
  Gamma: {
    icon: TbInfinity,
    gradient: "from-pink-500/25 via-pink-400/12 to-transparent",
    glowColor: "rgba(253,164,175,0.35)",
    accentColor: "#fda4af",
    label: "Peak Cognition",
    description: "40–100 Hz",
  },
};

function getBeatAccentColor(hz: number): string {
  if (hz <= 4) return "#93c5fd";
  if (hz <= 8) return "#c4b5fd";
  if (hz <= 14) return "#6ee7b7";
  if (hz <= 21) return "#bef264";
  if (hz <= 30) return "#fcd34d";
  if (hz <= 40) return "#fdba74";
  return "#fda4af";
}

function getModeDisplay(mode: StimulationMode | undefined): { label: string; description: string; icon: string } {
  switch (mode) {
    case 'monaural': return { label: 'Monaural', description: 'Mixed - works on speakers', icon: '♬' }
    case 'isochronic': return { label: 'Isochronic', description: 'Pulsing - strongest entrainment', icon: '⫸' }
    default: return { label: 'Binaural', description: 'Stereo - headphones required', icon: '🎧' }
  }
}

function isNoiseOnly(params: BinauralBeatParams): params is BinauralBeatParams & { noiseType: "white" | "pink" | "brown" | "grey" | "blue" } {
  return params.noiseType !== "none" && params.noiseType !== undefined && params.leftVolume === 0 && params.rightVolume === 0;
}

// ── Mesmerizing waveform visualizer ──────────────────────────────────────────
function BeatVisualizer({
  leftHz,
  rightHz,
  isPlaying,
  accentColor,
}: {
  leftHz: number;
  rightHz: number;
  isPlaying: boolean;
  accentColor: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);
  const beatHz = Math.abs(rightHz - leftHz);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const cy = H / 2;

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    const rgb = hexToRgb(accentColor);

    function draw(ts: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      if (!isPlaying) {
        // Idle: softly glowing dormant line with particles
        const idleGrad = ctx.createLinearGradient(0, 0, W, 0);
        idleGrad.addColorStop(0, "rgba(255,255,255,0.0)");
        idleGrad.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`);
        idleGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
        idleGrad.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`);
        idleGrad.addColorStop(1, "rgba(255,255,255,0.0)");
        ctx.strokeStyle = idleGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();

        // Subtle frequency dots
        const dotCount = Math.max(3, Math.min(10, Math.round(beatHz)));
        for (let i = 0; i < dotCount; i++) {
          const x = (W / (dotCount + 1)) * (i + 1);
          const size = i % 2 === 0 ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.arc(x, cy, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)`;
          ctx.fill();
        }
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const t = ts / 1000;

      // ── Glow shadow ──
      ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`;
      ctx.shadowBlur = 12;

      // ── Primary binaural interference wave ──
      // Simulate left + right carrier interference: sin(2π·L·t) + sin(2π·R·t)
      const amplitude = H * 0.36;
      const speed = beatHz * 0.12;

      const waveGrad = ctx.createLinearGradient(0, 0, W, 0);
      waveGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.0)`);
      waveGrad.addColorStop(0.1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      waveGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},1.0)`);
      waveGrad.addColorStop(0.9, `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      waveGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.0)`);

      ctx.beginPath();
      ctx.strokeStyle = waveGrad;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;

      for (let x = 0; x <= W; x++) {
        const phase = (x / W) * Math.PI * 8;
        // Amplitude envelope — broader, more organic
        const envelopeAmp = Math.sin(phase * 0.5 + t * speed) * Math.sin(phase * 0.25);
        const y = cy + envelopeAmp * amplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ── Secondary harmonic wave (carrier ghost) ──
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      const harmGrad = ctx.createLinearGradient(0, 0, W, 0);
      harmGrad.addColorStop(0, "transparent");
      harmGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`);
      harmGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = harmGrad;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = cy + Math.sin((x / W) * Math.PI * 18 + t * leftHz * 0.02) * (H * 0.1);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ── Fill under the primary wave ──
      ctx.globalAlpha = 0.07;
      ctx.shadowBlur = 0;
      const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
      fillGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      fillGrad.addColorStop(1, "transparent");
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const phase = (x / W) * Math.PI * 8;
        const envelopeAmp = Math.sin(phase * 0.5 + t * speed) * Math.sin(phase * 0.25);
        const y = cy + envelopeAmp * amplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(W, cy);
      ctx.lineTo(0, cy);
      ctx.closePath();
      ctx.fill();

      // ── Traveling pulse indicator ──
      ctx.globalAlpha = 1;
      ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`;
      ctx.shadowBlur = 16;
      const pulsePhase = (t * beatHz) % 1;
      const px = pulsePhase * W;
      const pPhase = (px / W) * Math.PI * 8;
      const pEnv = Math.sin(pPhase * 0.5 + t * speed) * Math.sin(pPhase * 0.25);
      const py = cy + pEnv * amplitude;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
      ctx.fill();
      // Inner dot
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},1)`;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [leftHz, rightHz, isPlaying, accentColor, beatHz]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ── Ear frequency display ─────────────────────────────────────────────────────
function EarIndicator({ side, hz, accentColor }: { side: "L" | "R"; hz: number; accentColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <RiHeadphoneLine
        className="size-3"
        style={{ color: accentColor, opacity: 0.7 }}
      />
      <span className="text-[9px] font-mono" style={{ color: accentColor, opacity: 0.6 }}>
        {side}
      </span>
      <span className="text-[10px] font-mono text-white/50 tabular-nums">{hz} Hz</span>
    </div>
  );
}

// ── Main History Card ─────────────────────────────────────────────────────────
interface BinauralBeatHistoryCardProps {
  params: BinauralBeatParams;
}

export function BinauralBeatHistoryCard({ params }: BinauralBeatHistoryCardProps) {
  const { status, elapsed, play, stop } = useBinauralPlayer();

  const isPlaying = status === "playing" || status === "stopping";
  const noiseMode = isNoiseOnly(params);
  const beatHz = Math.abs(params.rightHz - params.leftHz);
  const brainState = getBrainStateFromBeat(beatHz);
  const isAIGenerated = params.presetId === "ai_generated";
  const stimulationMode = params.stimulationMode ?? 'binaural';
  const modeInfo = getModeDisplay(stimulationMode);

  // Determine carrier source label
  const carrierLabel = params.carrierSource === 'solfeggio' ? 'Solfeggio'
    : params.carrierSource === 'planetary' ? 'Planetary'
    : undefined

  const bandKey = brainState.name as keyof typeof BAND_CONFIG;
  const bandCfg = BAND_CONFIG[bandKey] ?? BAND_CONFIG["Alpha"];
  const accentColor = noiseMode
    ? (NOISE_DISPLAY[params.noiseType!]?.glowColor?.replace(/rgba\((.+?),.+\)/, "rgb($1)") ?? "#94a3b8")
    : getBeatAccentColor(beatHz);
  const glowColor = noiseMode
    ? (NOISE_DISPLAY[params.noiseType!]?.glowColor ?? "rgba(148,163,184,0.3)")
    : bandCfg.glowColor;
  const gradient = noiseMode
    ? (NOISE_DISPLAY[params.noiseType!]?.gradient ?? "from-slate-400/20 to-transparent")
    : bandCfg.gradient;

  const BandIcon = noiseMode ? PiWaveformBold : bandCfg.icon;
  const bandLabel = noiseMode
    ? (NOISE_DISPLAY[params.noiseType!]?.label ?? "Noise")
    : brainState.name;
  const bandDescription = noiseMode ? "" : bandCfg.description;
  const bandColors = noiseMode
    ? (NOISE_DISPLAY[params.noiseType!]?.color ?? { bg: "bg-slate-700/60", text: "text-slate-200" })
    : getBandColor(brainState.name);

  const progressPct = Math.min((elapsed / params.durationSeconds) * 100, 100);

  const handlePlay = React.useCallback(() => {
    play({
      name: params.name,
      leftHz: params.leftHz,
      rightHz: params.rightHz,
      leftVolume: params.leftVolume,
      rightVolume: params.rightVolume,
      waveform: params.waveform,
      noiseVolume: params.noiseVolume,
      noiseCutoff: params.noiseCutoff,
      noiseType: params.noiseType ?? (params.leftVolume === 0 ? "pink" : "none"),
      durationSeconds: params.durationSeconds,
      presetId: params.presetId,
      stimulationMode: params.stimulationMode ?? 'binaural',
    });
  }, [params, play]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.08]"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Ambient glow blob */}
      <div
        className="pointer-events-none absolute -top-8 -left-4 w-48 h-28 rounded-full opacity-40 blur-3xl"
        style={{ background: glowColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-6 right-4 w-32 h-20 rounded-full opacity-25 blur-2xl"
        style={{ background: glowColor }}
      />

      {/* Top gradient strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r", gradient, "opacity-60")} />

      <div className="relative z-10 p-4 space-y-3">

        {/* ── Header Row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon badge */}
            <div
              className={cn(
                "relative size-11 rounded-xl flex items-center justify-center shrink-0 border",
                bandColors.bg
              )}
              style={{ borderColor: `${glowColor.replace("0.3", "0.3")}` }}
            >
              <BandIcon className={cn("size-5", bandColors.text)} />
              {isPlaying && (
                <span
                  className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-black/30"
                  style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
                />
              )}
            </div>

            {/* Name + meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-serif text-white/90 leading-tight truncate">
                  {params.name || "Custom Beat"}
                </p>
                {isAIGenerated && (
                  <span className="text-[8px] font-medium text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    AI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                    bandColors.bg,
                    bandColors.text
                  )}
                >
                  {bandLabel}
                </span>
                {stimulationMode !== 'binaural' && (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
                    {modeInfo.icon} {modeInfo.label}
                  </span>
                )}
                {carrierLabel && (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                    {carrierLabel}
                  </span>
                )}
                {bandDescription && (
                  <span className="text-[9px] text-white/30 font-mono">{bandDescription}</span>
                )}
              </div>
            </div>
          </div>

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? stop : handlePlay}
            className={cn(
              "size-10 shrink-0 rounded-xl border flex items-center justify-center transition-all duration-200",
              isPlaying
                ? "border-white/20 text-white/70 hover:bg-white/10"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
            )}
            style={
              isPlaying
                ? { background: `${glowColor.replace("0.3", "0.15")}`, boxShadow: `0 0 12px ${glowColor}` }
                : { background: "rgba(255,255,255,0.05)" }
            }
            aria-label={isPlaying ? "Stop" : "Play"}
          >
            {isPlaying ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <RiPlayFill className="size-4 ml-0.5" />
            )}
          </button>
        </div>

        {/* ── Visualizer ── */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            height: "52px",
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <BeatVisualizer
            leftHz={params.leftHz}
            rightHz={params.rightHz}
            isPlaying={isPlaying}
            accentColor={accentColor}
          />
        </div>

        {/* ── Frequency row + ear display ── */}
        {!noiseMode && (
          <div className="flex items-center justify-between">
            {/* Beat Hz big */}
            <div className="flex items-baseline gap-1.5">
              <TbWaveSine className="size-3.5 text-white/30" />
              <span
                className="text-base font-mono font-bold tabular-nums"
                style={{ color: accentColor }}
              >
                {beatHz.toFixed(2)}
              </span>
              <span className="text-[9px] text-white/30 font-mono">Hz beat</span>
            </div>
            {/* Ear indicators */}
            <div className="flex items-center gap-3">
              <EarIndicator side="L" hz={params.leftHz} accentColor={accentColor} />
              <EarIndicator side="R" hz={params.rightHz} accentColor={accentColor} />
            </div>
          </div>
        )}

        {/* ── Progress bar ── */}
        <div className="space-y-1.5">
          <div
            className="relative h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${glowColor.replace("0.3", "0.6")}, ${accentColor})`,
                boxShadow: isPlaying ? `0 0 6px ${accentColor}` : "none",
              }}
            />
            {/* Pulse head */}
            {isPlaying && progressPct > 0 && progressPct < 100 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full"
                style={{
                  left: `${progressPct}%`,
                  background: accentColor,
                  boxShadow: `0 0 8px ${accentColor}`,
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-white/25">
              {isPlaying ? formatTime(elapsed) : "—"}
            </span>
            <span className="text-[9px] font-mono text-white/25">
              {formatTime(params.durationSeconds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}