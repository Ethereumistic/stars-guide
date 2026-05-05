"use client";

import * as React from "react";
import { Brain, Headphones, Square } from "lucide-react";
import {
  BRAIN_STATE_PRESETS,
  getBrainState,
  type BinauralBeatParams,
} from "@/lib/binaural-presets";
import {
  useBinauralPlayer,
  formatTime,
} from "@/hooks/use-binaural-player";

interface BinauralBeatHistoryCardProps {
  params: BinauralBeatParams;
}

export function BinauralBeatHistoryCard({
  params,
}: BinauralBeatHistoryCardProps) {
  const { status, elapsed, play, stop } = useBinauralPlayer();

  const preset = BRAIN_STATE_PRESETS.find((p) => p.id === params.presetId);
  const label = preset?.label ?? "Custom Beat";
  const isPlaying = status === "playing" || status === "stopping";
  const beatHz = Math.abs(params.rightHz - params.leftHz);
  const brainState = getBrainState(beatHz);

  const handlePlay = React.useCallback(() => {
    play({
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
  }, [params, play]);

  return (
    <div className="rounded-xl border border-galactic/20 bg-galactic/5 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-galactic/15 border border-galactic/25 shrink-0">
        <Brain className="size-4 text-galactic" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-white/80 truncate">{label}</p>
          <span className={`text-[9px] font-medium ${brainState.color}`}>
            {brainState.name}
          </span>
        </div>
        <p className="text-[10px] text-white/40">
          L {params.leftHz} Hz · R {params.rightHz} Hz · Δ{beatHz.toFixed(1)} Hz · {formatTime(params.durationSeconds)}
        </p>
        {isPlaying && (
          <p className="text-[10px] text-galactic/70 tabular-nums mt-0.5">
            {formatTime(elapsed)} / {formatTime(params.durationSeconds)}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {isPlaying ? (
          <button
            onClick={stop}
            className="flex items-center justify-center size-8 rounded-lg bg-white/8 border border-white/12
              text-white/60 hover:bg-white/12 hover:text-white/80 transition-all"
            aria-label="Stop"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="flex items-center justify-center size-8 rounded-lg bg-galactic/20 border border-galactic/40
              text-galactic hover:bg-galactic/30 transition-all"
            aria-label="Play"
          >
            <Headphones className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
