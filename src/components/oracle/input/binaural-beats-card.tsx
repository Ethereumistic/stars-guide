"use client";

import * as React from "react";
import { Brain, Headphones, Save, Square } from "lucide-react";
import {
  BRAIN_STATE_PRESETS,
  getBrainState,
  type BinauralParams,
  type BinauralBeatParams,
} from "@/lib/binaural-presets";
import {
  useBinauralPlayer,
  formatTime,
} from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "60m", seconds: 3600 },
] as const;

const WAVEFORM_OPTIONS: { value: OscillatorType; label: string }[] = [
  { value: "sine",     label: "Sine" },
  { value: "triangle", label: "Triangle" },
];

// ── Slider component ────────────────────────────────────────────────────────
const sliderCls = `w-full h-1 rounded-full appearance-none bg-white/10 accent-galactic cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-galactic
  [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-galactic [&::-moz-range-thumb]:border-0`

// ── Props ───────────────────────────────────────────────────────────────────
interface BinauralBeatsCardProps {
  onDismiss: () => void;
  onGenerate?: (params: BinauralBeatParams) => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export function BinauralBeatsCard({ onDismiss, onGenerate }: BinauralBeatsCardProps) {
  const defaultPreset = BRAIN_STATE_PRESETS[2]; // relaxed_focus
  const [activePresetId, setActivePresetId] = React.useState<string>(defaultPreset.id);
  const [leftHz, setLeftHz]         = React.useState<number>(defaultPreset.leftHz);
  const [rightHz, setRightHz]       = React.useState<number>(defaultPreset.rightHz);
  const [leftVolume, setLeftVolume] = React.useState<number>(defaultPreset.leftVolume);
  const [rightVolume, setRightVolume] = React.useState<number>(defaultPreset.rightVolume);
  const [waveform, setWaveform]     = React.useState<OscillatorType>(defaultPreset.waveform);
  const [noiseVolume, setNoiseVolume] = React.useState<number>(defaultPreset.noiseVolume);
  const [noiseCutoff, setNoiseCutoff] = React.useState<number>(defaultPreset.noiseCutoff);
  const [durationSeconds, setDurationSeconds] = React.useState<number>(defaultPreset.duration);

  const { status, elapsed, playLive, updateLive, stop } = useBinauralPlayer();

  const isPlaying = status === "playing" || status === "stopping";
  const beatHz = Math.abs(rightHz - leftHz);
  const brainState = getBrainState(beatHz);
  const noisePct = Math.round(noiseVolume * 100);

  // ── Push all current params to live audio ─────────────────────────────────
  const pushLive = React.useCallback(
    (overrides: Partial<BinauralParams> = {}) => {
      if (status !== "playing") return;
      updateLive({
        leftHz: overrides.leftHz ?? leftHz,
        rightHz: overrides.rightHz ?? rightHz,
        leftVolume: overrides.leftVolume ?? leftVolume,
        rightVolume: overrides.rightVolume ?? rightVolume,
        waveform: overrides.waveform ?? waveform,
        noiseVolume: overrides.noiseVolume ?? noiseVolume,
        noiseCutoff: overrides.noiseCutoff ?? noiseCutoff,
      });
    },
    [status, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, updateLive],
  );

  // ── Preset selection (sets ALL controls) ──────────────────────────────────
  const handlePresetSelect = React.useCallback(
    (preset: (typeof BRAIN_STATE_PRESETS)[number]) => {
      setActivePresetId(preset.id);
      setLeftHz(preset.leftHz);
      setRightHz(preset.rightHz);
      setLeftVolume(preset.leftVolume);
      setRightVolume(preset.rightVolume);
      setWaveform(preset.waveform);
      setNoiseVolume(preset.noiseVolume);
      setNoiseCutoff(preset.noiseCutoff);
      setDurationSeconds(preset.duration);

      if (status === "playing") {
        updateLive({
          leftHz: preset.leftHz,
          rightHz: preset.rightHz,
          leftVolume: preset.leftVolume,
          rightVolume: preset.rightVolume,
          waveform: preset.waveform,
          noiseVolume: preset.noiseVolume,
          noiseCutoff: preset.noiseCutoff,
        });
      }
    },
    [status, updateLive],
  );

  // ── Play / Stop toggle ────────────────────────────────────────────────────
  const handleTogglePlay = React.useCallback(() => {
    if (isPlaying) { stop(); return; }
    playLive({ leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, presetId: activePresetId });
  }, [isPlaying, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, activePresetId, playLive, stop]);

  // ── Save to Chat ──────────────────────────────────────────────────────────
  const handleSave = React.useCallback(() => {
    const preset = BRAIN_STATE_PRESETS.find((p) => p.id === activePresetId);
    const isCustom =
      leftHz !== preset?.leftHz ||
      rightHz !== preset?.rightHz ||
      leftVolume !== preset?.leftVolume ||
      rightVolume !== preset?.rightVolume ||
      waveform !== preset?.waveform ||
      noiseVolume !== preset?.noiseVolume ||
      noiseCutoff !== preset?.noiseCutoff ||
      durationSeconds !== preset?.duration;
    const presetId = isCustom ? "custom" : (preset?.id ?? "custom");

    onGenerate?.({
      version: 2,
      leftHz, rightHz, leftVolume, rightVolume, waveform,
      noiseVolume, noiseCutoff, durationSeconds, presetId,
      generatedAt: new Date().toISOString(),
    });
  }, [activePresetId, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, onGenerate]);

  React.useEffect(() => { return () => { stop() } }, [stop]);

  return (
    <div className="relative rounded-2xl border border-galactic/20 bg-galactic/5 backdrop-blur-2xl p-3.5 space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-galactic/15 border border-galactic/25">
            <Brain className="size-3 text-galactic" />
          </div>
          <span className="text-[11px] font-medium tracking-wide text-white/70 uppercase">
            Binaural Beats
          </span>
        </div>
        <button
          onClick={() => { stop(); onDismiss(); }}
          className="text-white/30 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* ── Playing: compact visualizer + info ── */}
      {isPlaying && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-[2px] h-4 shrink-0 overflow-visible">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="binaural-bar" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 tabular-nums">
                L {leftHz} · R {rightHz} · Δ{beatHz.toFixed(1)} Hz
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-medium ${brainState.color}`}>{brainState.name}</span>
                <span className="text-[10px] tabular-nums text-white/40">{formatTime(elapsed)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Beat info (always visible) ── */}
      {!isPlaying && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/30">Beat</span>
            <span className="text-[11px] tabular-nums text-white/70 font-medium">{beatHz.toFixed(1)} Hz</span>
          </div>
          <span className={`text-[9px] font-medium ${brainState.color}`}>
            {brainState.name} · {brainState.band}
          </span>
        </div>
      )}

      {/* ── Presets ── */}
      <div className="flex flex-wrap gap-1">
        {BRAIN_STATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-medium tracking-wide transition-all border",
              activePresetId === preset.id
                ? "bg-galactic/20 border-galactic/40 text-galactic"
                : "bg-white/[0.03] border-white/[0.06] text-white/45 hover:bg-white/[0.06] hover:text-white/65",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* ── Left ear: Hz + Vol ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium">← Left</span>
          <span className="text-[11px] text-white/55 tabular-nums">{leftHz} Hz · {Math.round(leftVolume * 100)}%</span>
        </div>
        <input type="range" min={20} max={1000} step={1} value={leftHz}
          onChange={(e) => { const v = Number(e.target.value); setLeftHz(v); pushLive({ leftHz: v }); }}
          className={sliderCls} />
        <input type="range" min={0} max={100} step={1} value={Math.round(leftVolume * 100)}
          onChange={(e) => { const v = Number(e.target.value) / 100; setLeftVolume(v); pushLive({ leftVolume: v }); }}
          className={sliderCls} />
      </div>

      {/* ── Right ear: Hz + Vol ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium">Right →</span>
          <span className="text-[11px] text-white/55 tabular-nums">{rightHz} Hz · {Math.round(rightVolume * 100)}%</span>
        </div>
        <input type="range" min={20} max={1000} step={1} value={rightHz}
          onChange={(e) => { const v = Number(e.target.value); setRightHz(v); pushLive({ rightHz: v }); }}
          className={sliderCls} />
        <input type="range" min={0} max={100} step={1} value={Math.round(rightVolume * 100)}
          onChange={(e) => { const v = Number(e.target.value) / 100; setRightVolume(v); pushLive({ rightVolume: v }); }}
          className={sliderCls} />
      </div>

      {/* ── Waveform ── */}
      <div className="flex gap-1">
        {WAVEFORM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setWaveform(opt.value); pushLive({ waveform: opt.value }); }}
            className={cn(
              "flex-1 rounded-md py-1 text-[10px] font-medium transition-all border text-center",
              waveform === opt.value
                ? "bg-galactic/20 border-galactic/40 text-galactic"
                : "bg-white/[0.03] border-white/[0.06] text-white/45 hover:bg-white/[0.06] hover:text-white/65",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Ambient: Volume + Tone ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium">Ambient</span>
          <span className="text-[11px] text-white/55 tabular-nums">{noisePct}% · {noiseCutoff} Hz</span>
        </div>
        <input type="range" min={0} max={50} step={1} value={noisePct}
          onChange={(e) => { const v = Number(e.target.value) / 100; setNoiseVolume(v); pushLive({ noiseVolume: v }); }}
          className={sliderCls} />
        <input type="range" min={100} max={3000} step={50} value={noiseCutoff}
          onChange={(e) => { const v = Number(e.target.value); setNoiseCutoff(v); pushLive({ noiseCutoff: v }); }}
          className={sliderCls} />
      </div>

      {/* ── Duration ── */}
      <div className="flex gap-1">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.seconds}
            onClick={() => setDurationSeconds(opt.seconds)}
            className={cn(
              "flex-1 rounded-md py-1 text-[10px] font-medium transition-all border text-center",
              durationSeconds === opt.seconds
                ? "bg-galactic/20 border-galactic/40 text-galactic"
                : "bg-white/[0.03] border-white/[0.06] text-white/45 hover:bg-white/[0.06] hover:text-white/65",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex gap-1.5 pt-0.5">
        <button
          onClick={handleTogglePlay}
          className={cn(
            "flex-1 rounded-lg text-xs font-medium py-2 transition-all flex items-center justify-center gap-1.5 border",
            isPlaying
              ? "bg-white/8 border-white/12 text-white/60 hover:bg-white/12 hover:text-white/80"
              : "bg-galactic/20 border-galactic/40 text-galactic hover:bg-galactic/30 hover:border-galactic/50",
          )}
        >
          {isPlaying ? <><Square className="size-3 fill-current" /> Stop</> : <><Headphones className="size-3.5" /> Play</>}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-galactic/15 border border-galactic/30 text-galactic text-xs font-medium py-2
            hover:bg-galactic/25 hover:border-galactic/45 transition-all flex items-center justify-center gap-1.5"
        >
          <Save className="size-3.5" />
          Save to Chat
        </button>
      </div>
    </div>
  );
}
