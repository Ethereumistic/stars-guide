"use client";

import * as React from "react";
import { X, Save, Search, Check } from "lucide-react";
import { RiPlayFill, RiStopFill, RiHeadphoneLine, RiEqualizer2Line } from "react-icons/ri";
import { TbWaveSine, TbTriangle, TbBrain, TbMoon, TbSun, TbBolt, TbDroplet, TbWind, TbInfinity, TbAdjustments } from "react-icons/tb";
import { PiWaveformBold } from "react-icons/pi";
import { GiMusicalNotes } from "react-icons/gi";
import { MdTune } from "react-icons/md";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BINAURAL_FREQUENCIES,
  BINAURAL_BANDS,
  filterFrequencies,
  getBandColor,
  getBandSymbol,
  getRecommendedMode,
  SOLFEGGIO_FREQUENCIES,
  PLANETARY_FREQUENCIES,
  type BinauralPreset,
  type BinauralBand,
  type StimulationMode,
  type CarrierSource,
} from "@/lib/binaural-frequencies";
import {
  type BinauralParams,
  type BinauralBeatParams,
  type NoiseType,
  CARRIER_MIN_BINAURAL,
  CARRIER_MAX_BINAURAL,
  CARRIER_MIN_MONAURAL,
  CARRIER_MAX_MONAURAL,
  NOISE_PRESETS,
} from "@/lib/binaural-presets";
import { useBinauralPlayer, formatTime } from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Carrier source display config ────────────────────────────────────────────
const CARRIER_SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  solfeggio: { label: "Solfeggio", icon: "✦", color: "text-violet-300" },
  planetary: { label: "Planetary", icon: "☉", color: "text-amber-300" },
};

const MODE_LABELS: Record<StimulationMode, { label: string; short: string; icon: string; color: string }> = {
  binaural:   { label: "Binaural", short: "Bin",  icon: "🎧", color: "text-emerald-300" },
  monaural:   { label: "Monaural", short: "Mono", icon: "♩",  color: "text-sky-300" },
  isochronic: { label: "Isochronic", short: "Iso", icon: "⫸", color: "text-purple-300" },
};

// ── Duration options ──────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
] as const;

// ── Band icon/color map ───────────────────────────────────────────────────────
const BAND_META: Record<string, {
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  description: string;
}> = {
  Delta: { icon: TbMoon, accentColor: "#93c5fd", glowColor: "rgba(147,197,253,0.3)", description: "Deep sleep & healing" },
  Theta: { icon: TbBrain, accentColor: "#c4b5fd", glowColor: "rgba(196,181,253,0.3)", description: "Meditation & creativity" },
  Alpha: { icon: TbWind, accentColor: "#6ee7b7", glowColor: "rgba(110,231,183,0.3)", description: "Relaxed focus & flow" },
  "Low Beta": { icon: TbSun, accentColor: "#bef264", glowColor: "rgba(190,242,100,0.3)", description: "Concentration" },
  "Mid Beta": { icon: TbBolt, accentColor: "#fcd34d", glowColor: "rgba(252,211,77,0.3)", description: "Mental stimulation" },
  "High Beta": { icon: TbBolt, accentColor: "#fdba74", glowColor: "rgba(253,186,116,0.3)", description: "Peak alertness" },
  Gamma: { icon: TbInfinity, accentColor: "#fda4af", glowColor: "rgba(253,164,175,0.3)", description: "Peak cognition" },
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

// ── Slider component ──────────────────────────────────────────────────────────
function StyledSlider({
  label, value, min, max, step = 1, displayValue, accentColor, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  displayValue: string; accentColor: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/35 font-medium">{label}</span>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: accentColor }}>{displayValue}</span>
      </div>
      <div className="relative h-6 flex items-center group">
        <div className="absolute w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute h-1 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute w-full h-full opacity-0 cursor-pointer" style={{ zIndex: 10 }} />
        <div className="absolute size-4 rounded-full border-2 transition-transform group-hover:scale-110 pointer-events-none" style={{ left: `calc(${pct}% - 8px)`, background: accentColor, borderColor: "rgba(0,0,0,0.4)", boxShadow: `0 0 8px ${accentColor}` }} />
      </div>
    </div>
  );
}

// ── Beat canvas visualizer ────────────────────────────────────────────────────
function BeatCanvas({ leftHz, rightHz, isPlaying, accentColor }: { leftHz: number; rightHz: number; isPlaying: boolean; accentColor: string }) {
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
    function hexToRgb(hex: string) { return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }; }
    const rgb = hexToRgb(accentColor);
    function draw(ts: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      if (!isPlaying) {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "transparent"); grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`); grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        const n = Math.max(3, Math.min(10, Math.round(beatHz)));
        for (let i = 0; i < n; i++) { const x = (W / (n + 1)) * (i + 1); ctx.beginPath(); ctx.arc(x, cy, i % 2 === 0 ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`; ctx.fill(); }
        animRef.current = requestAnimationFrame(draw); return;
      }
      const t = ts / 1000; const amp = H * 0.38; const speed = beatHz * 0.12;
      ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`; ctx.shadowBlur = 10;
      const wGrad = ctx.createLinearGradient(0, 0, W, 0);
      wGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`); wGrad.addColorStop(0.15, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`); wGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`); wGrad.addColorStop(0.85, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`); wGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.strokeStyle = wGrad; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath();
      for (let x = 0; x <= W; x++) { const phase = (x / W) * Math.PI * 8; const y = cy + Math.sin(phase * 0.5 + t * speed) * Math.sin(phase * 0.25) * amp; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.globalAlpha = 0.15; ctx.lineWidth = 1; ctx.shadowBlur = 3; ctx.beginPath();
      for (let x = 0; x <= W; x++) { const y = cy + Math.sin((x / W) * Math.PI * 20 + t * leftHz * 0.02) * H * 0.1; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},1)`; ctx.shadowBlur = 14;
      const pp = (t * beatHz) % 1; const ppx = pp * W; const pphase = (ppx / W) * Math.PI * 8; const ppy = cy + Math.sin(pphase * 0.5 + t * speed) * Math.sin(pphase * 0.25) * amp;
      ctx.beginPath(); ctx.arc(ppx, ppy, 5, 0, Math.PI * 2); ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`; ctx.fill();
      ctx.beginPath(); ctx.arc(ppx, ppy, 3, 0, Math.PI * 2); ctx.fillStyle = accentColor; ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [leftHz, rightHz, isPlaying, accentColor, beatHz]);
  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ── Preset Dialog ─────────────────────────────────────────────────────────────
function PresetDialog({ selectedPreset, onSelect }: { selectedPreset: BinauralPreset | null; onSelect: (preset: BinauralPreset) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeBand, setActiveBand] = React.useState<BinauralBand | "all">("all");
  const [activeSource, setActiveSource] = React.useState<CarrierSource | "all">("all");

  const filteredPresets = React.useMemo(
    () => filterFrequencies(activeBand === "all" ? null : activeBand, query, activeSource === "all" ? null : activeSource),
    [activeBand, query, activeSource]
  );

  const handleSelect = (preset: BinauralPreset) => { onSelect(preset); setOpen(false); setQuery(""); setActiveBand("all"); setActiveSource("all"); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left w-full group" type="button">
          <RiEqualizer2Line className="size-3.5 text-white/35 shrink-0" />
          <span className="flex-1 text-[11px] font-mono text-white/50 truncate">
            {selectedPreset ? `${selectedPreset.band} · ${selectedPreset.beat} Hz` : "Browse presets…"}
          </span>
          <span className="text-[8px] text-white/20 group-hover:text-white/40 transition-colors uppercase tracking-wider shrink-0">Change</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-[#0d0b14] border border-white/10 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/70">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <DialogTitle className="text-sm font-serif text-white/80 flex items-center gap-2">
            <GiMusicalNotes className="size-4 text-white/40" />
            Choose a Frequency Preset
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <Search className="size-3.5 text-white/25 shrink-0" />
            <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by use, band, Hz, solfeggio, planetary…" className="flex-1 bg-transparent text-[12px] text-white/70 placeholder:text-white/25 focus:outline-none" />
            {query && (<button onClick={() => setQuery("")} className="text-white/25 hover:text-white/50"><X className="size-3" /></button>)}
          </div>
        </div>

        {/* Band filter pills */}
        <div className="flex items-center gap-1.5 px-4 pb-1 overflow-x-auto scrollbar-none">
          <button onClick={() => setActiveBand("all")} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-medium border transition-all", activeBand === "all" ? "bg-white/15 border-white/25 text-white" : "bg-transparent border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/15")}>All</button>
          {BINAURAL_BANDS.map((band) => {
            const bandColors = getBandColor(band.id);
            return (<button key={band.id} onClick={() => setActiveBand(band.id)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-medium border transition-all", activeBand === band.id ? cn("border-transparent", bandColors.bg, bandColors.text) : "bg-transparent border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/15")}>{band.symbol} {band.id}</button>);
          })}
        </div>

        {/* Carrier source filter pills */}
        <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-none">
          <button onClick={() => setActiveSource("all")} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-medium border transition-all", activeSource === "all" ? "bg-white/15 border-white/25 text-white" : "bg-transparent border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/15")}>All Sources</button>
          <button onClick={() => setActiveSource("solfeggio")} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-medium border transition-all", activeSource === "solfeggio" ? "bg-violet-900/60 border-violet-500/30 text-violet-200" : "bg-transparent border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/15")}>✦ Solfeggio</button>
          <button onClick={() => setActiveSource("planetary")} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-medium border transition-all", activeSource === "planetary" ? "bg-amber-900/60 border-amber-500/30 text-amber-200" : "bg-transparent border-white/[0.07] text-white/35 hover:text-white/55 hover:border-white/15")}>☉ Planetary</button>
        </div>

        {/* Preset list */}
        <div className="overflow-y-auto max-h-80 px-3 pb-4 space-y-1">
          {filteredPresets.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-white/25">No presets found</div>
          ) : (
            filteredPresets.map((preset) => {
              const bandColors = getBandColor(preset.band);
              const meta = BAND_META[preset.band];
              const BandIcon = meta?.icon ?? TbWaveSine;
              const isActive = selectedPreset?.beat === preset.beat && Math.abs((selectedPreset?.leftHz ?? 0) - preset.leftHz) < 0.5 && (selectedPreset?.carrierSource ?? "standard") === (preset.carrierSource ?? "standard");
              const modeInfo = MODE_LABELS[preset.mode];

              return (
                <button key={`${preset.beat}-${preset.leftHz}-${preset.carrierSource ?? "standard"}`} onClick={() => handleSelect(preset)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left", isActive ? "border-white/15 bg-white/[0.07]" : "border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]")}>
                  <div className={cn("size-9 rounded-xl shrink-0 flex items-center justify-center", bandColors.bg)}><BandIcon className={cn("size-4", bandColors.text)} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-mono text-white/85 tabular-nums">{preset.beat} Hz</span>
                      <span className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded-full", bandColors.bg, bandColors.text)}>{preset.band}</span>
                      {preset.mode !== "binaural" && <span className="text-[7px] font-medium px-1 py-0.5 rounded-full bg-sky-900/40 text-sky-300 border border-sky-500/20">{modeInfo.icon} {modeInfo.short}</span>}
                      {preset.carrierSource && preset.carrierSource !== "standard" && <span className={cn("text-[7px] font-medium px-1 py-0.5 rounded-full border", preset.carrierSource === "solfeggio" ? "bg-violet-900/40 text-violet-300 border-violet-500/20" : "bg-amber-900/40 text-amber-300 border-amber-500/20")}>{CARRIER_SOURCE_LABELS[preset.carrierSource]?.icon} {CARRIER_SOURCE_LABELS[preset.carrierSource]?.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {preset.uses.slice(0, 3).map((use) => (<span key={use} className="text-[8px] text-white/30">{use}</span>))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[9px] font-mono text-white/30">
                      <RiHeadphoneLine className="size-2.5" />
                      <span>{preset.leftHz}/{preset.rightHz}</span>
                    </div>
                  </div>
                  {isActive && <Check className="size-3.5 text-white/60 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface BinauralBeatsCardProps {
  onDismiss: () => void;
  onGenerate?: (params: BinauralBeatParams) => void;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BinauralBeatsCard({ onDismiss, onGenerate }: BinauralBeatsCardProps) {
  const defaultPreset = BINAURAL_FREQUENCIES.find((f) => f.beat === 10 && f.band === "Alpha" && f.carrierSource !== "solfeggio" && f.carrierSource !== "planetary")!;

  const [beatName, setBeatName] = React.useState("Alpha Flow State");
  const [selectedPreset, setSelectedPreset] = React.useState<BinauralPreset>(defaultPreset);
  const [leftHz, setLeftHz] = React.useState(defaultPreset.leftHz);
  const [rightHz, setRightHz] = React.useState(defaultPreset.rightHz);
  const [leftVolume, setLeftVolume] = React.useState(1);
  const [rightVolume, setRightVolume] = React.useState(1);
  const [waveform, setWaveform] = React.useState<OscillatorType>("sine");
  const [noiseVolume, setNoiseVolume] = React.useState(0.1);
  const [noiseCutoff, setNoiseCutoff] = React.useState(500);
  const [durationSeconds, setDurationSeconds] = React.useState(1800);
  const [stimulationMode, setStimulationMode] = React.useState<StimulationMode>(defaultPreset.mode);

  const { status, elapsed, playLive, updateLive, stop } = useBinauralPlayer();
  const isPlaying = status === "playing" || status === "stopping";

  const beatHz = Math.abs(rightHz - leftHz);
  const accentColor = getBeatAccentColor(beatHz);
  const bandKey = selectedPreset?.band ?? "Alpha";
  const bandMeta = BAND_META[bandKey] ?? BAND_META["Alpha"];
  const bandColors = getBandColor(bandKey as BinauralBand);
  const BandIcon = bandMeta.icon;
  const modeInfo = MODE_LABELS[stimulationMode];

  // Dynamic carrier range based on mode
  const carrierMin = stimulationMode === "binaural" ? CARRIER_MIN_BINAURAL : CARRIER_MIN_MONAURAL;
  const carrierMax = stimulationMode === "binaural" ? CARRIER_MAX_BINAURAL : CARRIER_MAX_MONAURAL;

  // ── Preset select ─────────────────────────────────────────────────────────
  const handlePresetSelect = React.useCallback(
    (preset: BinauralPreset) => {
      setSelectedPreset(preset);
      setLeftHz(preset.leftHz);
      setRightHz(preset.rightHz);
      setBeatName(`${preset.band} ${preset.beat}Hz`);
      setStimulationMode(preset.mode);
      if (isPlaying) pushLive({ leftHz: preset.leftHz, rightHz: preset.rightHz });
    },
    [isPlaying]
  );

  // ── Push live ─────────────────────────────────────────────────────────────
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
    [status, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, updateLive]
  );

  // ── Play / Stop ───────────────────────────────────────────────────────────
  const handleTogglePlay = React.useCallback(() => {
    if (isPlaying) { stop(); return; }
    playLive({
      name: beatName,
      leftHz, rightHz, leftVolume, rightVolume,
      waveform, noiseVolume, noiseCutoff,
      noiseType: "pink" as const,
      durationSeconds, presetId: "custom",
      stimulationMode,
    });
  }, [isPlaying, beatName, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, playLive, stop, stimulationMode]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = React.useCallback(() => {
    onGenerate?.({
      version: 2,
      name: beatName,
      leftHz, rightHz, leftVolume, rightVolume,
      waveform, noiseVolume, noiseCutoff,
      noiseType: "pink" as const,
      durationSeconds, presetId: "custom",
      generatedAt: new Date().toISOString(),
      stimulationMode,
      carrierSource: selectedPreset?.carrierSource ?? "standard",
    });
  }, [beatName, leftHz, rightHz, leftVolume, rightVolume, waveform, noiseVolume, noiseCutoff, durationSeconds, onGenerate, stimulationMode, selectedPreset]);

  React.useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", backdropFilter: "blur(24px)" }}>
      <div className="pointer-events-none absolute -top-10 -left-6 w-56 h-32 rounded-full opacity-30 blur-3xl" style={{ background: bandMeta.glowColor }} />

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="size-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
          <GiMusicalNotes className="size-3 text-white/50" />
        </div>
        <input type="text" value={beatName} onChange={(e) => setBeatName(e.target.value)} placeholder="Name your session…" className="flex-1 min-w-0 bg-transparent text-[13px] font-serif text-white/80 placeholder:text-white/25 focus:outline-none" />
        <button onClick={() => { stop(); onDismiss(); }} className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5"><X className="size-4" /></button>
      </div>

      {/* ── Visualizer + Info ── */}
      <div className="flex items-stretch gap-3 px-4 pt-4 pb-3">
        <div className={cn("shrink-0 w-[88px] rounded-xl border p-3 flex flex-col items-center justify-between text-center")} style={{ background: `${bandMeta.glowColor.replace("0.3", "0.08")}`, borderColor: `${bandMeta.glowColor.replace("0.3", "0.25")}` }}>
          <div className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-widest", bandColors.bg, bandColors.text)}>{bandKey}</div>
          <div>
            <div className="text-2xl font-mono font-bold tabular-nums leading-none" style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{beatHz.toFixed(1)}</div>
            <div className="text-[8px] text-white/25 mt-0.5 uppercase tracking-wider">Hz</div>
          </div>
          <BandIcon className="size-4" style={{ color: accentColor, opacity: 0.7 }} />
          {/* Mode indicator */}
          {stimulationMode !== "binaural" && (
            <div className={cn("text-[7px] font-medium px-1.5 py-0.5 rounded-full mt-1", stimulationMode === "monaural" ? "bg-sky-900/40 text-sky-300" : "bg-purple-900/40 text-purple-300")}>
              {modeInfo.icon} {modeInfo.label}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="relative flex-1 min-h-[52px] max-h-[58px] rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <BeatCanvas leftHz={leftHz} rightHz={rightHz} isPlaying={isPlaying} accentColor={accentColor} />
            <button onClick={handleTogglePlay} className={cn("absolute bottom-2 right-2 size-8 rounded-lg border flex items-center justify-center transition-all backdrop-blur-md", isPlaying ? "border-white/20 text-white/80 hover:bg-white/10" : "border-white/15 text-white/60 hover:text-white hover:border-white/25")} style={{ background: isPlaying ? `${bandMeta.glowColor.replace("0.3", "0.2")}` : "rgba(0,0,0,0.45)", boxShadow: isPlaying ? `0 0 12px ${bandMeta.glowColor}` : "none" }}>
              {isPlaying ? <RiStopFill className="size-3.5" /> : <RiPlayFill className="size-4 ml-0.5" />}
            </button>
            {isPlaying && (
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="size-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
                <span className="text-[8px] font-mono" style={{ color: accentColor, opacity: 0.8 }}>{formatTime(elapsed)}</span>
              </div>
            )}
          </div>
          <PresetDialog selectedPreset={selectedPreset} onSelect={handlePresetSelect} />
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-4 pb-4 space-y-4">
        {/* Stimulation Mode */}
        <div className="rounded-xl p-3 space-y-3 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TbAdjustments className="size-3.5 text-white/30" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/30 font-medium">Stimulation Mode</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-1">
            {(["binaural", "monaural", "isochronic"] as StimulationMode[]).map((mode) => {
              const info = MODE_LABELS[mode];
              const isActive = stimulationMode === mode;
              return (
                <button key={mode} onClick={() => setStimulationMode(mode)} className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all", isActive ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}>
                  <span className="text-[11px]">{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-white/25 leading-relaxed">
            {stimulationMode === "binaural" && "🎧 Two tones via headphones — perceived phantom beat via brainstem phase-locking. Carriers 200–500 Hz."}
            {stimulationMode === "monaural" && "♩ Two tones mixed in mono — real acoustic beating. Works on speakers. Carriers 100–800 Hz."}
            {stimulationMode === "isochronic" && "⫸ Single pulsing tone — strongest cortical entrainment. Works on speakers. No beat frequency needed."}
          </p>
        </div>

        {/* Carrier frequencies */}
        <div className="rounded-xl p-3 space-y-3 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <RiHeadphoneLine className="size-3.5 text-white/30" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/30 font-medium">Carrier Frequencies</span>
            <span className="text-[8px] text-white/20 ml-auto">{carrierMin}–{carrierMax} Hz</span>
          </div>
          <StyledSlider label={stimulationMode === "isochronic" ? "Carrier" : "Left Ear"} value={leftHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${leftHz.toFixed(1)} Hz`} accentColor={accentColor} onChange={(v) => { setLeftHz(v); pushLive({ leftHz: v }); }} />
          {stimulationMode !== "isochronic" && (
            <StyledSlider label="Right Ear" value={rightHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${rightHz.toFixed(1)} Hz`} accentColor={accentColor} onChange={(v) => { setRightHz(v); pushLive({ rightHz: v }); }} />
          )}
        </div>

        {/* Volume */}
        <div className="rounded-xl p-3 space-y-3 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <MdTune className="size-3.5 text-white/30" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/30 font-medium">Volume</span>
          </div>
          {stimulationMode !== "isochronic" && (
            <>
              <StyledSlider label="Left" value={Math.round(leftVolume * 100)} min={0} max={100} displayValue={`${Math.round(leftVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setLeftVolume(v / 100); pushLive({ leftVolume: v / 100 }); }} />
              <StyledSlider label="Right" value={Math.round(rightVolume * 100)} min={0} max={100} displayValue={`${Math.round(rightVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setRightVolume(v / 100); pushLive({ rightVolume: v / 100 }); }} />
            </>
          )}
          {stimulationMode === "isochronic" && (
            <StyledSlider label="Volume" value={Math.round(leftVolume * 100)} min={0} max={100} displayValue={`${Math.round(leftVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setLeftVolume(v / 100); setRightVolume(0); pushLive({ leftVolume: v / 100, rightVolume: 0 }); }} />
          )}
        </div>

        {/* Ambient noise */}
        <div className="rounded-xl p-3 space-y-3 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <PiWaveformBold className="size-3.5 text-white/30" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/30 font-medium">Ambient Noise</span>
          </div>
          <StyledSlider label="Volume" value={Math.round(noiseVolume * 100)} min={0} max={50} displayValue={`${Math.round(noiseVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setNoiseVolume(v / 100); pushLive({ noiseVolume: v / 100 }); }} />
          <StyledSlider label="Cutoff" value={noiseCutoff} min={100} max={3000} step={50} displayValue={`${noiseCutoff} Hz`} accentColor={accentColor} onChange={(v) => { setNoiseCutoff(v); pushLive({ noiseCutoff: v }); }} />
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/[0.08] overflow-hidden">
            {([{ value: "sine" as OscillatorType, icon: TbWaveSine, label: "Sine" }, { value: "triangle" as OscillatorType, icon: TbTriangle, label: "Tri" }]).map(({ value, icon: Icon, label }) => (
              <button key={value} onClick={() => { setWaveform(value); pushLive({ waveform: value }); }} className={cn("flex items-center gap-1 px-3 py-2 text-[10px] font-medium transition-all", waveform === value ? "bg-white/12 text-white" : "bg-white/[0.03] text-white/35 hover:bg-white/[0.06] hover:text-white/55")}>
                <Icon className="size-3.5" />{label}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-xl border border-white/[0.08] overflow-hidden">
            {DURATION_OPTIONS.map((opt) => (
              <button key={opt.seconds} onClick={() => setDurationSeconds(opt.seconds)} className={cn("px-3 py-2 text-[10px] font-mono font-medium transition-all", durationSeconds === opt.seconds ? "bg-white/12 text-white" : "bg-white/[0.03] text-white/35 hover:bg-white/[0.06] hover:text-white/55")}>{opt.label}</button>
            ))}
          </div>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] text-[11px] font-medium text-white/70 hover:text-white transition-all" style={{ boxShadow: `0 0 0 0 ${accentColor}` }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${bandMeta.glowColor}`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
            <Save className="size-3.5" />Save to Chat
          </button>
        </div>
      </div>
    </div>
  );
}