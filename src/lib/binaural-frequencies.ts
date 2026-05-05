// Comprehensive binaural beat frequency reference
// Based on scientific research and the standard binaural beats literature
// Carrier frequencies optimized for 100-500 Hz range (optimal binaural entrainment)

export interface BinauralPreset {
  beat: number;
  band: BinauralBand;
  leftHz: number;
  rightHz: number;
  uses: string[];
}

export type BinauralBand = "Delta" | "Theta" | "Alpha" | "Low Beta" | "Mid Beta" | "High Beta" | "Gamma";

export const BINAURAL_FREQUENCIES: BinauralPreset[] = [
  // Delta (0.5–4 Hz) — Deep sleep, healing, regeneration
  { beat: 0.5, band: "Delta", leftHz: 100, rightHz: 100.5, uses: ["deep dreamless sleep", "cellular repair", "growth hormone"] },
  { beat: 1, band: "Delta", leftHz: 100, rightHz: 101, uses: ["pain relief", "deep sleep", "unconscious healing"] },
  { beat: 1.5, band: "Delta", leftHz: 120, rightHz: 121.5, uses: ["sleep induction", "nerve regeneration"] },
  { beat: 2, band: "Delta", leftHz: 100, rightHz: 102, uses: ["nerve regeneration", "deep sleep", "natural painkiller"] },
  { beat: 2.5, band: "Delta", leftHz: 200, rightHz: 202.5, uses: ["pain gate", "deep relaxation", "sedation"] },
  { beat: 3, band: "Delta", leftHz: 100, rightHz: 103, uses: ["deep sleep", "lucid dream onset"] },
  { beat: 3.5, band: "Delta", leftHz: 250, rightHz: 253.5, uses: ["sleep stage 3-4", "memory consolidation"] },
  { beat: 4, band: "Delta", leftHz: 100, rightHz: 104, uses: ["REM sleep", "light meditation", "drowsiness"] },

  // Theta (4–8 Hz) — Meditation, creativity, emotional processing
  { beat: 4.5, band: "Theta", leftHz: 200, rightHz: 204.5, uses: ["shamanic states", "deep relaxation", "stress relief"] },
  { beat: 5, band: "Theta", leftHz: 100, rightHz: 105, uses: ["vivid imagery", "hypnagogic state", "emotional processing"] },
  { beat: 5.5, band: "Theta", leftHz: 300, rightHz: 305.5, uses: ["intuition boost", "dream recall", "inner child healing"] },
  { beat: 6, band: "Theta", leftHz: 200, rightHz: 206, uses: ["long-term memory", "light trance", "creative ideation"] },
  { beat: 6.3, band: "Theta", leftHz: 100, rightHz: 106.3, uses: ["accelerated learning", "Schumann resonance"] },
  { beat: 7, band: "Theta", leftHz: 200, rightHz: 207, uses: ["deep meditation", "anxiety reduction", "astral projection"] },
  { beat: 7.5, band: "Theta", leftHz: 100, rightHz: 107.5, uses: ["creative visualization", "interiorization"] },
  { beat: 7.83, band: "Theta", leftHz: 200, rightHz: 207.83, uses: ["Schumann resonance", "earth grounding", "circadian sync"] },

  // Alpha (8–14 Hz) — Relaxed focus, calm, flow states
  { beat: 8, band: "Alpha", leftHz: 200, rightHz: 208, uses: ["relaxed alertness", "stress reduction", "wind-down"] },
  { beat: 8.5, band: "Alpha", leftHz: 100, rightHz: 108.5, uses: ["light relaxation", "open awareness", "mood lift"] },
  { beat: 9, band: "Alpha", leftHz: 200, rightHz: 209, uses: ["serotonin release", "positivity", "mild pain relief"] },
  { beat: 10, band: "Alpha", leftHz: 100, rightHz: 110, uses: ["peak alpha", "mood enhancement", "flow state entry"] },
  { beat: 10.5, band: "Alpha", leftHz: 200, rightHz: 210.5, uses: ["healing visualization", "mid-alpha peak"] },
  { beat: 11, band: "Alpha", leftHz: 100, rightHz: 111, uses: ["calm concentration", "stress recovery", "study mode"] },
  { beat: 12, band: "Alpha", leftHz: 200, rightHz: 212, uses: ["mental clarity", "relaxed thinking", "alpha-beta bridge"] },
  { beat: 13, band: "Alpha", leftHz: 300, rightHz: 313, uses: ["alert relaxation", "task readiness", "transition to focus"] },
  { beat: 14, band: "Alpha", leftHz: 100, rightHz: 114, uses: ["borderline focus", "relaxed alertness"] },

  // Low Beta (14–21 Hz) — Focused concentration, cognitive engagement
  { beat: 14, band: "Low Beta", leftHz: 200, rightHz: 214, uses: ["focused concentration", "problem solving", "waking alertness"] },
  { beat: 15, band: "Low Beta", leftHz: 300, rightHz: 315, uses: ["mental energy", "active thinking", "exam prep"] },
  { beat: 16, band: "Low Beta", leftHz: 200, rightHz: 216, uses: ["cognitive engagement", "reading focus", "working memory"] },
  { beat: 18, band: "Low Beta", leftHz: 400, rightHz: 418, uses: ["alertness", "active processing", "light energizing"] },
  { beat: 20, band: "Low Beta", leftHz: 200, rightHz: 220, uses: ["active problem solving", "complex task focus", "anti-drowsiness"] },

  // Mid Beta (21–30 Hz) — Mental stimulation, energized focus
  { beat: 21, band: "Mid Beta", leftHz: 300, rightHz: 321, uses: ["mental stimulation", "energized focus", "motivation"] },
  { beat: 23, band: "Mid Beta", leftHz: 200, rightHz: 223, uses: ["sustained attention", "creative problem solving"] },
  { beat: 25, band: "Mid Beta", leftHz: 300, rightHz: 325, uses: ["mental sharpness", "active engagement"] },
  { beat: 28, band: "Mid Beta", leftHz: 400, rightHz: 428, uses: ["high cognitive demand", "analytical tasks"] },

  // High Beta (30–40 Hz) — Intense focus, alertness (use with caution)
  { beat: 30, band: "High Beta", leftHz: 300, rightHz: 330, uses: ["intense focus", "adrenaline-like alertness", "hyperactivity risk"] },
  { beat: 33, band: "High Beta", leftHz: 500, rightHz: 533, uses: ["fight-or-flight arousal", "crisis thinking", "overstimulation risk"] },
  { beat: 35, band: "High Beta", leftHz: 400, rightHz: 435, uses: ["peak alertness", "high-intensity work"] },
  { beat: 38, band: "High Beta", leftHz: 300, rightHz: 338, uses: ["extreme arousal", "short-term only", "anxiety if prolonged"] },

  // Gamma (40+ Hz) — Peak cognition, memory, perception (experimental)
  { beat: 40, band: "Gamma", leftHz: 400, rightHz: 440, uses: ["gamma synchrony", "memory binding", "peak cognition"] },
  { beat: 40, band: "Gamma", leftHz: 200, rightHz: 240, uses: ["gamma synchrony", "perception integration", "lower carrier"] },
  { beat: 60, band: "Gamma", leftHz: 500, rightHz: 560, uses: ["hyperfast processing", "sensory integration", "experimental"] },
  { beat: 100, band: "Gamma", leftHz: 400, rightHz: 500, uses: ["extreme gamma", "research only", "not recommended"] },
];

export const BINAURAL_BANDS: { id: BinauralBand; label: string; range: string; symbol: string }[] = [
  { id: "Delta", label: "Delta", range: "0.5–4 Hz", symbol: "δ" },
  { id: "Theta", label: "Theta", range: "4–8 Hz", symbol: "θ" },
  { id: "Alpha", label: "Alpha", range: "8–14 Hz", symbol: "α" },
  { id: "Low Beta", label: "Low Beta", range: "14–21 Hz", symbol: "β-" },
  { id: "Mid Beta", label: "Mid Beta", range: "21–30 Hz", symbol: "β" },
  { id: "High Beta", label: "High Beta", range: "30–40 Hz", symbol: "β+" },
  { id: "Gamma", label: "Gamma", range: "40+ Hz", symbol: "γ" },
];

export function getBandSymbol(band: BinauralBand): string {
  const b = BINAURAL_BANDS.find(b => b.id === band);
  return b?.symbol ?? band.charAt(0);
}

export function getBandColor(band: BinauralBand): { bg: string; text: string } {
  const colors: Record<BinauralBand, { bg: string; text: string }> = {
    Delta: { bg: "bg-blue-900/60", text: "text-blue-200" },
    Theta: { bg: "bg-violet-900/60", text: "text-violet-200" },
    Alpha: { bg: "bg-emerald-900/60", text: "text-emerald-200" },
    "Low Beta": { bg: "bg-lime-900/60", text: "text-lime-200" },
    "Mid Beta": { bg: "bg-amber-900/60", text: "text-amber-200" },
    "High Beta": { bg: "bg-orange-900/60", text: "text-orange-200" },
    Gamma: { bg: "bg-rose-900/60", text: "text-rose-200" },
  };
  return colors[band];
}

export function filterFrequencies(band?: BinauralBand | null | "all", search?: string): BinauralPreset[] {
  return BINAURAL_FREQUENCIES.filter((f) => {
    const bandOk = !band || band === "all" || f.band === band;
    const s = (search || "").toLowerCase();
    const searchOk = !s ||
      f.uses.some((u) => u.toLowerCase().includes(s)) ||
      String(f.beat).includes(s) ||
      f.band.toLowerCase().includes(s);
    return searchOk;
  });
}

export function getBrainStateFromBeat(beatHz: number): { name: BinauralBand; band: string; color: string; symbol: string } {
  const abs = Math.abs(beatHz);
  if (abs <= 4) return { name: "Delta", band: "Deep Sleep", color: "text-blue-200", symbol: "δ" };
  if (abs <= 8) return { name: "Theta", band: "Meditation", color: "text-violet-200", symbol: "θ" };
  if (abs <= 14) return { name: "Alpha", band: "Relaxed Focus", color: "text-emerald-200", symbol: "α" };
  if (abs <= 21) return { name: "Low Beta", band: "Focus", color: "text-lime-200", symbol: "β-" };
  if (abs <= 30) return { name: "Mid Beta", band: "Concentration", color: "text-amber-200", symbol: "β" };
  if (abs <= 40) return { name: "High Beta", band: "Alertness", color: "text-orange-200", symbol: "β+" };
  return { name: "Gamma", band: "Peak Cognition", color: "text-rose-200", symbol: "γ" };
}