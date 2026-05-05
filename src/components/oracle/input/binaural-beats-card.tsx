"use client";

import * as React from "react";
import { Play, Square, Save, ChevronDown, Search, X } from "lucide-react";
import { GiMusicalNotes } from "react-icons/gi";

// ── Inline SVG waveform icons (avoiding extra dependencies) ──────────────────
const _SineIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 6 C 4 1, 7 11, 10 6 S 16 1, 19 6 S 22 11, 23 6" />
  </svg>
);

const _TriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6 L 7 1 L 13 11 L 19 1 L 23 6" />
  </svg>
);
import {
  BINAURAL_FREQUENCIES,
  BINAURAL_BANDS,
  filterFrequencies,
  getBandColor,
  getBandSymbol,
  type BinauralPreset,
  type BinauralBand,
} from "@/lib/binaural-frequencies";
import {
  type BinauralParams,
  type BinauralBeatParams,
} from "@/lib/binaural-presets";
import {
  useBinauralPlayer,
  formatTime,
} from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────
const CARRIER_MIN = 20;
const CARRIER_MAX = 1000;
const CARRIER_STEP = 0.1;

const DURATION_OPTIONS = [
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "60m", seconds: 3600 },
] as const;

const WAVEFORM_OPTIONS: { value: OscillatorType; label: string }[] = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Triangle" },
];

// ── Slider CSS ───────────────────────────────────────────────────────────────
const sliderCls = `w-full h-1 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
  [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0`

// ── Props ───────────────────────────────────────────────────────────────────
interface BinauralBeatsCardProps {
  onDismiss: () => void;
  onGenerate?: (params: BinauralBeatParams) => void;
}

// ── Beat Visualizer Canvas ───────────────────────────────────────────────────
function BeatCanvas({ leftHz, rightHz, isPlaying }: { leftHz: number; rightHz: number; isPlaying: boolean }) {
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
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    function draw(timestamp: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying) {
        // Idle: show subtle grid + beat frequency dots
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        const dotCount = Math.min(12, Math.ceil(beatHz));
        for (let i = 0; i < dotCount; i++) {
          const x = (width / (dotCount + 1)) * (i + 1);
          ctx.beginPath();
          ctx.arc(x, centerY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fill();
        }
        return;
      }

      const t = timestamp / 1000;

      // Primary wave
      const beatAmplitude = height * 0.42;
      ctx.beginPath();
      ctx.strokeStyle = beatColor;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9;

      for (let x = 0; x <= width; x++) {
        const phase = (x / width) * Math.PI * 7;
        const envelope = Math.sin(phase + t * beatHz * 0.18);
        const y = centerY + envelope * beatAmplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Subtle carrier wave overlay
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin((x / width) * Math.PI * 10 + t * leftHz * 0.015) * (height * 0.12);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Beat phase indicator dot
      const beatPhase = (timestamp / 1000 * beatHz) % 1;
      const indicatorX = beatPhase * width;
      const indicatorY = centerY + Math.sin(beatPhase * Math.PI * 2) * beatAmplitude;
      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, 5, 0, Math.PI * 2);
      ctx.fillStyle = beatColor;
      ctx.globalAlpha = 1;
      ctx.fill();

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [leftHz, rightHz, isPlaying, beatHz, beatColor]);

  return (
    <canvas ref={canvasRef} className="w-full h-full rounded-lg" />
  );
}

// ── Preset Dropdown with Search ─────────────────────────────────────────────
function PresetDropdown({
  presets,
  selectedPreset,
  onSelect,
  onSearch,
}: {
  presets: BinauralPreset[];
  selectedPreset: BinauralPreset | null;
  onSelect: (preset: BinauralPreset) => void;
  onSearch: (q: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeBand, setActiveBand] = React.useState<BinauralBand | "all">("all");
  const ref = React.useRef<HTMLDivElement>(null);

  const filteredPresets = React.useMemo(() => {
    return filterFrequencies(activeBand === "all" ? null : activeBand, query);
  }, [activeBand, query]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    onSearch(q);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-left hover:bg-white/[0.06] transition-colors"
      >
        <Search className="size-3 text-white/30 shrink-0" />
        <span className="flex-1 text-[11px] text-white/50 font-mono truncate">
          {selectedPreset ? `${selectedPreset.band} ${selectedPreset.beat}Hz` : "Select a beat..."}
        </span>
        <ChevronDown className={cn("size-3 text-white/30 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0a0812] border border-white/12 rounded-xl shadow-2xl shadow-black/60 overflow-hidden max-h-80 overflow-y-auto">
          {/* Search inside dropdown */}
          <div className="sticky top-0 bg-[#0a0812] p-2 border-b border-white/[0.06]">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search uses, band, frequency..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/12"
              autoFocus
            />
          </div>

          {/* Band filter pills */}
          <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setActiveBand("all")}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-medium transition-all border",
                activeBand === "all"
                  ? "bg-white/15 border-white/25 text-white"
                  : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]"
              )}
            >
              All
            </button>
            {BINAURAL_BANDS.map((band) => (
              <button
                key={band.id}
                onClick={() => setActiveBand(band.id)}
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-medium transition-all border",
                  activeBand === band.id
                    ? cn("border-transparent", getBandColor(band.id).bg, getBandColor(band.id).text)
                    : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.05]"
                )}
              >
                {band.symbol} {band.label}
              </button>
            ))}
          </div>

          {/* Preset list */}
          <div className="p-1.5 space-y-0.5">
            {filteredPresets.length === 0 ? (
              <p className="text-[10px] text-white/30 text-center py-4">No matches</p>
            ) : (
              filteredPresets.slice(0, 20).map((preset) => {
                const bandColors = getBandColor(preset.band);
                const symbol = getBandSymbol(preset.band);
                const isActive = selectedPreset?.beat === preset.beat && Math.abs(selectedPreset?.leftHz - preset.leftHz) < 0.5;

                return (
                  <button
                    key={`${preset.beat}-${preset.leftHz}-${preset.rightHz}`}
                    onClick={() => { onSelect(preset); setOpen(false); setQuery(""); }}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-lg border transition-all",
                      isActive
                        ? "bg-white/10 border-white/20"
                        : "border-transparent hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("size-6 rounded flex items-center justify-center text-[11px] font-serif", bandColors.bg, bandColors.text)}>
                        {symbol}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-white/80 font-mono">{preset.beat} Hz</span>
                          <span className={cn("text-[8px] font-medium px-1 py-0.5 rounded-full", bandColors.bg, bandColors.text)}>
                            {preset.band}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {preset.uses.slice(0, 3).map((use) => (
                            <span key={use} className="text-[8px] text-white/30 bg-white/[0.03] px-1 py-0.5 rounded">
                              {use}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[8px] text-white/25 font-mono shrink-0">
                        {preset.leftHz}/{preset.rightHz}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function BinauralBeatsCard({ onDismiss, onGenerate }: BinauralBeatsCardProps) {
  const defaultPreset = BINAURAL_FREQUENCIES.find(f => f.beat === 10 && f.band === "Alpha")!;

  const [beatName, setBeatName] = React.useState<string>("Alpha Flow State");
  const [selectedPreset, setSelectedPreset] = React.useState<BinauralPreset>(defaultPreset);
  const [leftHz, setLeftHz] = React.useState<number>(defaultPreset.leftHz);
  const [rightHz, setRightHz] = React.useState<number>(defaultPreset.rightHz);
  const [leftVolume, setLeftVolume] = React.useState<number>(1);
  const [rightVolume, setRightVolume] = React.useState<number>(1);
  const [waveform, setWaveform] = React.useState<OscillatorType>("sine");
  const [noiseVolume, setNoiseVolume] = React.useState<number>(0.1);
  const [noiseCutoff, setNoiseCutoff] = React.useState<number>(500);
  const [durationSeconds, setDurationSeconds] = React.useState<number>(1800);

  const { status, elapsed, playLive, updateLive, stop } = useBinauralPlayer();
  const isPlaying = status === "playing" || status === "stopping";
  const beatHz = Math.abs(rightHz - leftHz);
  const brainState = selectedPreset ? { band: selectedPreset.band } : { band: "Alpha" as BinauralBand };
  const bandColors = getBandColor(brainState.band);
  const symbol = getBandSymbol(brainState.band);

  // ── Select preset ─────────────────────────────────────────────────────────
  const handlePresetSelect = React.useCallback((preset: BinauralPreset) => {
    setSelectedPreset(preset);
    setLeftHz(preset.leftHz);
    setRightHz(preset.rightHz);
    setBeatName(`${preset.band} ${preset.beat}Hz`);

    if (isPlaying) {
      pushLive({ leftHz: preset.leftHz, rightHz: preset.rightHz });
    }
  }, [isPlaying, updateLive]);

  // ── Push to live audio ─────────────────────────────────────────────────────
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

  // ── Play / Stop toggle ─────────────────────────────────────────────────────
  const handleTogglePlay = React.useCallback(() => {
    if (isPlaying) { stop(); return; }
    playLive({
      name: beatName,
      leftHz, rightHz, leftVolume, rightVolume,
      waveform, noiseVolume, noiseCutoff,
      durationSeconds, presetId: "custom"
    });
  }, [isPlaying, beatName, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, playLive, stop]);

  // ── Save to Chat ───────────────────────────────────────────────────────────
  const handleSave = React.useCallback(() => {
    onGenerate?.({
      version: 2,
      name: beatName,
      leftHz, rightHz, leftVolume, rightVolume,
      waveform, noiseVolume, noiseCutoff,
      durationSeconds, presetId: "custom",
      generatedAt: new Date().toISOString(),
    });
  }, [beatName, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, onGenerate]);

  React.useEffect(() => { return () => { stop() } }, [stop]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden">

      {/* === HEADER === */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex size-5 items-center justify-center rounded-full bg-white/10 border border-white/15">
            <GiMusicalNotes className="size-2.5 text-white/60" />
          </div>
          <span className="font-serif text-[11px] font-medium tracking-wide text-white/60 uppercase">
            Binaural
          </span>
        </div>
        <input
          type="text"
          value={beatName}
          onChange={(e) => setBeatName(e.target.value)}
          placeholder="Name your beat..."
          className="flex-1 min-w-0 px-2 py-1 rounded-md bg-transparent text-[13px] text-white/80 font-serif placeholder:text-white/20 focus:outline-none focus:bg-white/[0.03]"
        />
        <button
          onClick={() => { stop(); onDismiss(); }}
          className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-md hover:bg-white/5"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* === MAIN DISPLAY === */}
      <div className="flex gap-3 p-4">
        {/* Beat Info Card */}
        <div className="w-32 shrink-0 flex flex-col items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-1">
          {/* Band badge */}
          <div className={cn("text-[8px] font-medium px-2 py-0.5 rounded-full uppercase tracking-widest", bandColors.bg, bandColors.text)}>
            {symbol} {brainState.band}
          </div>

          {/* Big Hz display */}
          <div className="font-serif text-3xl text-white/90 leading-none tabular-nums py-0.5">
            {beatHz.toFixed(1)}
          </div>
          <div className="text-[8px] text-white/25 uppercase tracking-widest">Hz</div>

          {/* L/R indicator */}
          <div className="flex items-center gap-1 text-[8px] font-mono text-white/30 mt-0.5">
            <span>L {leftHz.toFixed(0)}</span>
            <span>/</span>
            <span>R {rightHz.toFixed(0)}</span>
          </div>
        </div>

        {/* Visualizer + Play Button */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Canvas area */}
          <div className="relative flex-1 min-h-[52px] max-h-[56px] rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <BeatCanvas leftHz={leftHz} rightHz={rightHz} isPlaying={isPlaying} />

            {/* Play button — overlaid on the visualizer */}
            <button
              onClick={handleTogglePlay}
              className={cn(
                "absolute bottom-2 right-2 flex items-center justify-center size-9 rounded-lg border transition-all backdrop-blur-md",
                isPlaying
                  ? "bg-white/15 border-white/25 text-white/80 hover:bg-white/20"
                  : "bg-black/40 border-white/20 text-white/70 hover:bg-black/60 hover:text-white hover:border-white/30"
              )}
              aria-label={isPlaying ? "Stop" : "Play"}
            >
              {isPlaying ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <Play className="size-4 ml-0.5" />
              )}
            </button>

            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] text-emerald-400/80 font-mono uppercase tracking-widest">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-1.5">
            <PresetDropdown
                presets={[]}
                selectedPreset={selectedPreset}
                onSelect={handlePresetSelect}
                onSearch={() => { }}
              />
            </div>
          </div>
        </div>

      {/* === CONTROLS === */}
      <div className="px-4 pb-4 space-y-3">

        {/* Carrier Frequencies */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-medium">Carrier Hz</span>
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
              <span>L: {leftHz.toFixed(1)}</span>
              <span>R: {rightHz.toFixed(1)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-white/35">← Left</span>
                <input
                  type="number"
                  min={CARRIER_MIN}
                  max={CARRIER_MAX}
                  step={CARRIER_STEP}
                  value={leftHz}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) {
                      setLeftHz(Math.max(CARRIER_MIN, Math.min(CARRIER_MAX, v)));
                      pushLive({ leftHz: v });
                    }
                  }}
                  className="w-16 bg-transparent text-right text-[11px] tabular-nums font-mono text-white/70 focus:outline-none"
                />
              </div>
              <input
                type="range"
                min={CARRIER_MIN}
                max={CARRIER_MAX}
                step={CARRIER_STEP}
                value={leftHz}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setLeftHz(v);
                  pushLive({ leftHz: v });
                }}
                className={sliderCls}
              />
            </div>
            <div className="space-y-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-white/35">Right →</span>
                <input
                  type="number"
                  min={CARRIER_MIN}
                  max={CARRIER_MAX}
                  step={CARRIER_STEP}
                  value={rightHz}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) {
                      setRightHz(Math.max(CARRIER_MIN, Math.min(CARRIER_MAX, v)));
                      pushLive({ rightHz: v });
                    }
                  }}
                  className="w-16 bg-transparent text-right text-[11px] tabular-nums font-mono text-white/70 focus:outline-none"
                />
              </div>
              <input
                type="range"
                min={CARRIER_MIN}
                max={CARRIER_MAX}
                step={CARRIER_STEP}
                value={rightHz}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setRightHz(v);
                  pushLive({ rightHz: v });
                }}
                className={sliderCls}
              />
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-medium">Volume</span>
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
              <span>L: {Math.round(leftVolume * 100)}%</span>
              <span>R: {Math.round(rightVolume * 100)}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "← Left", value: leftVolume, onChange: (v: number) => { setLeftVolume(v); pushLive({ leftVolume: v }); } },
              { label: "Right →", value: rightVolume, onChange: (v: number) => { setRightVolume(v); pushLive({ rightVolume: v }); } },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/35">{label}</span>
                  <span className="text-[10px] font-mono text-white/50">{Math.round(value * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(value * 100)}
                  onChange={(e) => onChange(Number(e.target.value) / 100)}
                  className={sliderCls}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Ambient Noise */}
        <div className="space-y-1.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-medium">Ambient</span>
            <span className="text-[9px] font-mono text-white/40">{Math.round(noiseVolume * 100)}% · {noiseCutoff}Hz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] text-white/25 shrink-0">Vol</span>
            <input type="range" min={0} max={50} step={1} value={Math.round(noiseVolume * 100)}
              onChange={(e) => { const v = Number(e.target.value) / 100; setNoiseVolume(v); pushLive({ noiseVolume: v }); }}
              className={`flex-1 ${sliderCls}`} />
            <span className="text-[7px] text-white/25 shrink-0">Hz</span>
            <input type="range" min={100} max={3000} step={50} value={noiseCutoff}
              onChange={(e) => { const v = Number(e.target.value); setNoiseCutoff(v); pushLive({ noiseCutoff: v }); }}
              className={`flex-1 ${sliderCls}`} />
          </div>
        </div>

        {/* Action button group */}
        <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10">
          {/* Waveform toggle */}
          {WAVEFORM_OPTIONS.map((opt) => {
            const isActive = waveform === opt.value;
            const Icon = opt.value === "sine" ? _SineIcon : _TriangleIcon;
            return (
              <button
                key={opt.value}
                onClick={() => { setWaveform(opt.value); pushLive({ waveform: opt.value }); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-white"
                    : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                )}
                aria-label={opt.label}
              >
                <Icon className="size-3.5" />
                {opt.label}
              </button>
            );
          })}

          <div className="w-px bg-white/10 shrink-0" />

          {/* Duration toggle */}
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => setDurationSeconds(opt.seconds)}
              className={cn(
                "flex-1 px-3 py-2.5 text-[10px] font-mono font-medium transition-all",
                durationSeconds === opt.seconds
                  ? "bg-white/10 text-white"
                  : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
              )}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px bg-white/10 shrink-0" />

          {/* Save to Chat */}
          <button
            onClick={handleSave}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-medium bg-white/8 text-white/80 hover:bg-white/12 hover:text-white transition-all"
          >
            <Save className="size-3.5" />
            Save to Chat
          </button>
        </div>
      </div>
    </div>
  );
}