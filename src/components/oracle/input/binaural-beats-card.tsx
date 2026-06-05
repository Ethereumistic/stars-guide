"use client";

import * as React from "react";
import { X, Save, Search, Check } from "lucide-react";
import { RiPlayFill, RiStopFill, RiHeadphoneLine, RiEqualizer2Line } from "react-icons/ri";
import { TbWaveSine, TbTriangle, TbBrain, TbMoon, TbSun, TbBolt, TbWind, TbInfinity } from "react-icons/tb";
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
  getBrainStateFromBeat,
  type BinauralPreset,
  type BinauralBand,
  type StimulationMode,
  type CarrierSource,
} from "@/lib/binaural-frequencies";
import {
  type BinauralParams,
  type BinauralBeatParams,
  CARRIER_MIN_BINAURAL,
  CARRIER_MAX_BINAURAL,
  CARRIER_MIN_MONAURAL,
  CARRIER_MAX_MONAURAL,
} from "@/lib/binaural-presets";
import { useBinauralPlayer, formatTime } from "@/hooks/use-binaural-player";
import { cn } from "@/lib/utils";

// ── Carrier source display config ────────────────────────────────────────────
const CARRIER_SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  solfeggio: { label: "Solfeggio", icon: "✦", color: "text-violet-300" },
  planetary: { label: "Planetary", icon: "☉", color: "text-amber-300" },
};

const MODE_LABELS: Record<StimulationMode, { label: string; short: string; icon: string; color: string; hint: string }> = {
  binaural: { label: "Binaural", short: "Bin", icon: "🎧", color: "text-emerald-300", hint: "Two tones via headphones — phantom beat" },
  monaural: { label: "Monaural", short: "Mono", icon: "♪", color: "text-sky-300", hint: "Mixed in mono — works on speakers" },
  isochronic: { label: "Isochronic", short: "Iso", icon: "⫸", color: "text-purple-300", hint: "Single pulsing tone — strongest entrainment" },
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

// ── Inline slider (label | track+thumb | value on one row) ──────────────────
function StyledSlider({
  label, value, min, max, step = 1, displayValue, accentColor, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  displayValue: string; accentColor: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center h-[22px]">
      {/* Label (fixed left) */}
      <span className="shrink-0 text-[8px] uppercase tracking-wider text-white/40 font-medium pr-1.5 select-none">{label}</span>
      {/* Track area (flex-1 between label & value) */}
      <div className="relative flex-1 flex items-center h-full group">
        <div className="absolute w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute h-1 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})` }} />
        <div className="absolute size-3 rounded-full border-2 transition-transform group-hover:scale-110 pointer-events-none" style={{ left: `calc(${pct}% - 6px)`, background: accentColor, borderColor: "rgba(0,0,0,0.4)", boxShadow: `0 0 8px ${accentColor}` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute w-full h-full opacity-0 cursor-pointer" style={{ zIndex: 10 }} />
      </div>
      {/* Value (fixed right) */}
      <span className="shrink-0 text-[9px] font-mono tabular-nums text-right pl-1.5 select-none" style={{ color: accentColor }}>{displayValue}</span>
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
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left w-full group" type="button">
          <RiEqualizer2Line className="size-3 text-white/35 shrink-0" />
          <span className="flex-1 text-[10px] font-mono text-white/50 truncate">
            {selectedPreset ? `${selectedPreset.band} · ${selectedPreset.beat} Hz` : "Browse presets…"}
          </span>
          <span className="text-[7px] text-white/20 group-hover:text-white/40 transition-colors uppercase tracking-wider shrink-0">Change</span>
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

// ── Section divider ───────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-white/[0.05] my-1" />;
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label, detail }: { icon: React.ElementType; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3 text-white/25" />
      <span className="text-[8px] uppercase tracking-[0.16em] text-white/30 font-medium">{label}</span>
      {detail && <span className="text-[8px] text-white/15 ml-auto font-mono">{detail}</span>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BinauralBeatsCard({ onDismiss, onGenerate }: BinauralBeatsCardProps) {
  const defaultPreset = BINAURAL_FREQUENCIES.find((f) => f.beat === 10 && f.band === "Alpha" && f.carrierSource !== "solfeggio" && f.carrierSource !== "planetary")!;

  const [beatName, setBeatName] = React.useState("Alpha Flow State");
  const [nameCustomized, setNameCustomized] = React.useState(false);
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
  const isPlaying = status === "playing";

  const beatHz = Math.abs(rightHz - leftHz);
  const accentColor = getBeatAccentColor(beatHz);

  // Derive the active band dynamically from the actual beat frequency
  const brainState = getBrainStateFromBeat(beatHz);
  const bandKey = brainState.name;
  const bandMeta = BAND_META[bandKey] ?? BAND_META["Alpha"];
  const bandColors = getBandColor(bandKey);
  const BandIcon = bandMeta.icon;
  // Auto-update the session name when the band changes (unless user customized it)
  const prevBandRef = React.useRef(bandKey);
  React.useEffect(() => {
    if (prevBandRef.current !== bandKey) {
      if (!nameCustomized) {
        setBeatName(`${bandKey} ${beatHz.toFixed(1)}Hz`);
      }
      prevBandRef.current = bandKey;
    }
  }, [bandKey, beatHz, nameCustomized]);

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
      setNameCustomized(false);
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
    <div className="flex justify-end">
      <div className="relative w-full">
        {/* ── Dismiss X: above the card ── */}
        <div className="flex justify-end mb-1">
          <button type="button" onClick={() => { stop(); onDismiss(); }} className="flex items-center justify-center size-5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200" aria-label="Dismiss">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.08] overflow-hidden relative" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", backdropFilter: "blur(24px)" }}>
          <div className="pointer-events-none absolute -top-10 -left-6 w-56 h-32 rounded-full opacity-30 blur-3xl" style={{ background: bandMeta.glowColor }} />

          {/* ── Header: name + controls (single row) ── */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.06]">
            <input type="text" value={beatName} onChange={(e) => { setBeatName(e.target.value); setNameCustomized(true); }} placeholder="Name…" className="w-[130px] bg-white/[0.04] border border-white/[0.1] rounded-md px-2 py-1 text-[10px] font-serif text-white/90 placeholder:text-white/25 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.06] transition-all" />
            <div className="flex items-center rounded-md border border-white/[0.06] bg-black/20 overflow-hidden shrink-0">
              {(["binaural", "monaural", "isochronic"] as StimulationMode[]).map((mode) => {
                const info = MODE_LABELS[mode];
                const isActive = stimulationMode === mode;
                return (
                  <button key={mode} onClick={() => setStimulationMode(mode)} className={cn("flex items-center justify-center gap-0.5 px-1.5 py-1 text-[8px] font-medium transition-all", isActive ? "bg-white/10 text-white" : "text-white/30 hover:text-white/55")}>
                    <span className="text-[9px]">{info.icon}</span>
                    <span>{info.short}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center rounded-md border border-white/[0.06] bg-black/20 overflow-hidden shrink-0">
              {([{ value: "sine" as OscillatorType, icon: TbWaveSine, label: "Sine" }, { value: "triangle" as OscillatorType, icon: TbTriangle, label: "Tri" }]).map(({ value, icon: Icon, label }) => (
                <button key={value} onClick={() => { setWaveform(value); pushLive({ waveform: value }); }} className={cn("flex items-center gap-0.5 px-1.5 py-1 text-[8px] font-medium transition-all", waveform === value ? "bg-white/10 text-white" : "text-white/30 hover:text-white/55")}>
                  <Icon className="size-2.5" /><span>{label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-md border border-white/[0.06] bg-black/20 overflow-hidden shrink-0">
              {DURATION_OPTIONS.map((opt) => (
                <button key={opt.seconds} onClick={() => setDurationSeconds(opt.seconds)} className={cn("px-1.5 py-1 text-[8px] font-mono font-medium transition-all", durationSeconds === opt.seconds ? "bg-white/10 text-white" : "text-white/30 hover:text-white/55")}>{opt.label}</button>
              ))}
            </div>
            <button onClick={handleSave} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] text-[8px] font-medium text-white/60 hover:text-white transition-all" style={{ boxShadow: `0 0 0 0 ${accentColor}` }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 10px ${bandMeta.glowColor}`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
              <Save className="size-2.5" />Save
            </button>
          </div>

          {/* ── Visualizer + Band badge ── */}
          <div className="flex items-stretch gap-2.5 px-3 pt-2.5 pb-2">
            {/* Band badge */}
            <div className={cn("shrink-0 w-[72px] rounded-xl border p-2 flex flex-col items-center justify-between text-center")} style={{ background: `${bandMeta.glowColor.replace("0.3", "0.08")}`, borderColor: `${bandMeta.glowColor.replace("0.3", "0.25")}` }}>
              <div className={cn("text-[7px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-widest", bandColors.bg, bandColors.text)}>{bandKey}</div>
              <div>
                <div className="text-xl font-mono font-bold tabular-nums leading-none" style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{beatHz.toFixed(1)}</div>
                <div className="text-[7px] text-white/25 mt-0.5 uppercase tracking-wider">Hz</div>
              </div>
              <BandIcon className="size-3.5" style={{ color: accentColor, opacity: 0.7 }} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="relative flex-1 min-h-[44px] max-h-[48px] rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <BeatCanvas leftHz={leftHz} rightHz={rightHz} isPlaying={isPlaying} accentColor={accentColor} />
                <button onClick={handleTogglePlay} className={cn("absolute bottom-1.5 right-1.5 size-7 rounded-md border flex items-center justify-center transition-all backdrop-blur-md", isPlaying ? "border-white/20 text-white/80 hover:bg-white/10" : "border-white/15 text-white/60 hover:text-white hover:border-white/25")} style={{ background: isPlaying ? `${bandMeta.glowColor.replace("0.3", "0.2")}` : "rgba(0,0,0,0.45)", boxShadow: isPlaying ? `0 0 12px ${bandMeta.glowColor}` : "none" }}>
                  {isPlaying ? <RiStopFill className="size-3" /> : <RiPlayFill className="size-3.5 ml-0.5" />}
                </button>
                {isPlaying && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="size-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
                    <span className="text-[7px] font-mono" style={{ color: accentColor, opacity: 0.8 }}>{formatTime(elapsed)}</span>
                  </div>
                )}
              </div>
              <PresetDialog selectedPreset={selectedPreset} onSelect={handlePresetSelect} />
            </div>
          </div>

          {/* ── Controls (carriers + volume + noise only) ── */}
          <div className="px-3 pb-3">
            <div className="rounded-xl p-2.5 border border-white/[0.06] space-y-2" style={{ background: "rgba(255,255,255,0.015)" }}>
              {/* Frequency / Wave / Carrier (mode-dependent labels) */}
              <div>
                {stimulationMode === "isochronic" ? (
                  <>
                    <SectionLabel icon={RiHeadphoneLine} label="Tone" detail={`${leftHz.toFixed(1)} Hz · ${carrierMin}–${carrierMax} Hz`} />
                    <div className="mt-1">
                      <StyledSlider label="Frequency" value={leftHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${leftHz.toFixed(1)} Hz`} accentColor={accentColor} onChange={(v) => { setLeftHz(v); pushLive({ leftHz: v }); }} />
                    </div>
                  </>
                ) : stimulationMode === "monaural" ? (
                  <>
                    <SectionLabel icon={RiHeadphoneLine} label="Waves" detail={`Wave 1 ${leftHz.toFixed(1)} / Wave 2 ${rightHz.toFixed(1)} · ${carrierMin}–${carrierMax} Hz`} />
                    <div className="grid grid-cols-2 gap-x-3 mt-1">
                      <StyledSlider label="Wave 1" value={leftHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${leftHz.toFixed(1)}`} accentColor={accentColor} onChange={(v) => { setLeftHz(v); pushLive({ leftHz: v }); }} />
                      <StyledSlider label="Wave 2" value={rightHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${rightHz.toFixed(1)}`} accentColor={accentColor} onChange={(v) => { setRightHz(v); pushLive({ rightHz: v }); }} />
                    </div>
                  </>
                ) : (
                  <>
                    <SectionLabel icon={RiHeadphoneLine} label="Carrier" detail={`L ${leftHz.toFixed(1)} / R ${rightHz.toFixed(1)} · ${carrierMin}–${carrierMax} Hz`} />
                    <div className="grid grid-cols-2 gap-x-3 mt-1">
                      <StyledSlider label="L" value={leftHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${leftHz.toFixed(1)}`} accentColor={accentColor} onChange={(v) => { setLeftHz(v); pushLive({ leftHz: v }); }} />
                      <StyledSlider label="R" value={rightHz} min={carrierMin} max={carrierMax} step={0.1} displayValue={`${rightHz.toFixed(1)}`} accentColor={accentColor} onChange={(v) => { setRightHz(v); pushLive({ rightHz: v }); }} />
                    </div>
                  </>
                )}
              </div>

              <Divider />

              {/* Volume */}
              <div>
                <SectionLabel icon={MdTune} label="Volume" />
                {stimulationMode === "isochronic" ? (
                  <div className="mt-1">
                    <StyledSlider label="Volume" value={Math.round(leftVolume * 100)} min={0} max={100} displayValue={`${Math.round(leftVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setLeftVolume(v / 100); setRightVolume(0); pushLive({ leftVolume: v / 100, rightVolume: 0 }); }} />
                  </div>
                ) : stimulationMode === "monaural" ? (
                  <div className="grid grid-cols-2 gap-x-3 mt-1">
                    <StyledSlider label="W1 Vol" value={Math.round(leftVolume * 100)} min={0} max={100} displayValue={`${Math.round(leftVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setLeftVolume(v / 100); pushLive({ leftVolume: v / 100 }); }} />
                    <StyledSlider label="W2 Vol" value={Math.round(rightVolume * 100)} min={0} max={100} displayValue={`${Math.round(rightVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setRightVolume(v / 100); pushLive({ rightVolume: v / 100 }); }} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 mt-1">
                    <StyledSlider label="L" value={Math.round(leftVolume * 100)} min={0} max={100} displayValue={`${Math.round(leftVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setLeftVolume(v / 100); pushLive({ leftVolume: v / 100 }); }} />
                    <StyledSlider label="R" value={Math.round(rightVolume * 100)} min={0} max={100} displayValue={`${Math.round(rightVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setRightVolume(v / 100); pushLive({ rightVolume: v / 100 }); }} />
                  </div>
                )}
              </div>

              <Divider />

              {/* Ambient noise */}
              <div>
                <SectionLabel icon={PiWaveformBold} label="Noise" />
                <div className="grid grid-cols-2 gap-x-3 mt-1">
                  <StyledSlider label="Vol" value={Math.round(noiseVolume * 100)} min={0} max={50} displayValue={`${Math.round(noiseVolume * 100)}%`} accentColor={accentColor} onChange={(v) => { setNoiseVolume(v / 100); pushLive({ noiseVolume: v / 100 }); }} />
                  <StyledSlider label="Cut" value={noiseCutoff} min={100} max={3000} step={50} displayValue={`${noiseCutoff}`} accentColor={accentColor} onChange={(v) => { setNoiseCutoff(v); pushLive({ noiseCutoff: v }); }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}