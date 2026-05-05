"use client";

import * as React from "react";
import { Play, Pause, Square } from "lucide-react";
import { getBandColor, getBandSymbol, getBrainStateFromBeat } from "@/lib/binaural-frequencies";
import { type BinauralBeatParams } from "@/lib/binaural-presets";
import { useBinauralPlayer, formatTime } from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Beat Visualizer (compact version for history card) ──────────────────────
function BeatVisualizer({ leftHz, rightHz, isPlaying }: { leftHz: number; rightHz: number; isPlaying: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);

  const beatHz = Math.abs(rightHz - leftHz);

  const getBeatColor = (hz: number) => {
    if (hz <= 4) return "#93c5fd";
    if (hz <= 8) return "#c4b5fd";
    if (hz <= 14) return "#6ee7b7";
    if (hz <= 21) return "#bef264";
    if (hz <= 30) return "#fcd34d";
    if (hz <= 40) return "#fdba74";
    return "#fda4af";
  };

  const beatColor = getBeatColor(beatHz);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    function draw(timestamp: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        return;
      }

      const t = timestamp / 1000;

      const beatAmplitude = height * 0.35;
      ctx.beginPath();
      ctx.strokeStyle = beatColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;

      for (let x = 0; x <= width; x++) {
        const phase = (x / width) * Math.PI * 6;
        const envelope = Math.sin(phase + t * beatHz * 0.15);
        const y = centerY + envelope * beatAmplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      const beatPhase = (timestamp / 1000 * beatHz) % 1;
      const indicatorX = beatPhase * width;
      const indicatorY = centerY + Math.sin(beatPhase * Math.PI * 2) * beatAmplitude;
      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, 3, 0, Math.PI * 2);
      ctx.fillStyle = beatColor;
      ctx.globalAlpha = 0.95;
      ctx.fill();

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [leftHz, rightHz, isPlaying, beatHz, beatColor]);

  return (
    <canvas ref={canvasRef} className="w-full h-10 rounded-lg bg-white/[0.02]" />
  );
}

interface BinauralBeatHistoryCardProps {
  params: BinauralBeatParams;
}

export function BinauralBeatHistoryCard({ params }: BinauralBeatHistoryCardProps) {
  const { status, elapsed, play, stop } = useBinauralPlayer();

  const isAIGenerated = params.presetId === "ai_generated";
  const isPlaying = status === "playing" || status === "stopping";
  const beatHz = Math.abs(params.rightHz - params.leftHz);
  const brainState = getBrainStateFromBeat(beatHz);
  const bandColors = getBandColor(brainState.name);
  const symbol = getBandSymbol(brainState.name);

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
      durationSeconds: params.durationSeconds,
      presetId: params.presetId,
    });
  }, [params]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Band Symbol */}
          <div className={cn(
            "size-10 rounded-lg flex items-center justify-center text-2xl font-serif",
            bandColors.bg, bandColors.text
          )}>
            {symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-serif text-white/90">{params.name || "Custom Beat"}</p>
              {isAIGenerated && (
                <span className="text-[8px] font-medium text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  AI
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50 font-mono">
              {formatTime(params.durationSeconds)}
            </p>
          </div>
        </div>

        {/* Play/Stop Button */}
        <button
          onClick={isPlaying ? stop : handlePlay}
          className={cn(
            "flex items-center justify-center size-10 rounded-lg border transition-all",
            isPlaying
              ? "bg-white/15 border-white/25 text-white/70 hover:bg-white/20"
              : "bg-white/10 border-white/20 text-white/70 hover:bg-white/15 hover:text-white"
          )}
          aria-label={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? (
            <Square className="size-3.5 fill-current" />
          ) : (
            <Play className="size-4 ml-0.5" />
          )}
        </button>
      </div>

      {/* Visualizer */}
      <BeatVisualizer leftHz={params.leftHz} rightHz={params.rightHz} isPlaying={isPlaying} />

      {/* Info Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm tabular-nums text-white font-medium font-mono">
            Δ {beatHz.toFixed(2)} Hz
          </span>
          <div className="flex items-center gap-1">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", bandColors.bg, bandColors.text)}>
              {symbol} {brainState.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
          <span>L {params.leftHz}</span>
          <span>/</span>
          <span>R {params.rightHz}</span>
        </div>
      </div>

      {/* Progress — always visible */}
      <div className="flex items-center gap-2 text-[9px] text-white/40 font-mono">
        <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/40 rounded-full transition-all"
            style={{ width: `${Math.min((elapsed / params.durationSeconds) * 100, 100)}%` }}
          />
        </div>
        <span>{isPlaying ? `${formatTime(elapsed)} / ` : ''}{formatTime(params.durationSeconds)}</span>
      </div>
    </div>
  );
}