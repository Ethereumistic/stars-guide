// Comprehensive binaural beat frequency reference
// Based on scientific research, psychoacoustics, and the standard binaural beats literature
//
// SAFETY STANDARDS (from research):
// - Binaural carrier range: 200–500 Hz (optimal 200–440 Hz for phase-locking)
// - Binaural beat cap: ≤ 30 Hz (above 30 Hz, brain can't fuse two tones — Perrott & Nelson)
// - Beats > 30 Hz auto-switch to monaural mode (no phase-locking required)
// - Gamma (40+ Hz) always uses monaural or isochronic mode
//
// CARRIER SOURCES:
// - 'standard': numerically optimal carriers
// - 'solfeggio': therapeutic Solfeggio frequencies
// - 'planetary': Hans Cousto's cosmic octave frequencies

export type StimulationMode = 'binaural' | 'monaural' | 'isochronic'

export type CarrierSource = 'standard' | 'solfeggio' | 'planetary'

export interface BinauralPreset {
  beat: number;
  band: BinauralBand;
  leftHz: number;
  rightHz: number;
  uses: string[];
  /** Recommended stimulation mode — binaural beats > 30 Hz should use monaural */
  mode: StimulationMode;
  /** Where the carrier frequency comes from */
  carrierSource?: CarrierSource;
}

export type BinauralBand = "Delta" | "Theta" | "Alpha" | "Low Beta" | "Mid Beta" | "High Beta" | "Gamma";

export const BINAURAL_FREQUENCIES: BinauralPreset[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Delta (0.5–4 Hz) — Deep sleep, healing, regeneration
  // All carriers within optimal 200–440 Hz binaural range
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 0.5, band: "Delta", leftHz: 200, rightHz: 200.5, uses: ["deep dreamless sleep", "cellular repair", "growth hormone"], mode: 'binaural' },
  { beat: 1, band: "Delta", leftHz: 200, rightHz: 201, uses: ["pain relief", "deep sleep", "unconscious healing"], mode: 'binaural' },
  { beat: 1.5, band: "Delta", leftHz: 200, rightHz: 201.5, uses: ["sleep induction", "nerve regeneration"], mode: 'binaural' },
  { beat: 2, band: "Delta", leftHz: 200, rightHz: 202, uses: ["nerve regeneration", "deep sleep", "natural painkiller"], mode: 'binaural' },
  { beat: 2.5, band: "Delta", leftHz: 200, rightHz: 202.5, uses: ["pain gate", "deep relaxation", "sedation"], mode: 'binaural' },
  { beat: 3, band: "Delta", leftHz: 200, rightHz: 203, uses: ["deep sleep", "lucid dream onset"], mode: 'binaural' },
  { beat: 3.5, band: "Delta", leftHz: 250, rightHz: 253.5, uses: ["sleep stage 3-4", "memory consolidation"], mode: 'binaural' },
  { beat: 4, band: "Delta", leftHz: 200, rightHz: 204, uses: ["REM sleep", "light meditation", "drowsiness"], mode: 'binaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // Theta (4–8 Hz) — Meditation, creativity, emotional processing
  // Carriers within optimal range, including Schumann resonance
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 4.5, band: "Theta", leftHz: 200, rightHz: 204.5, uses: ["shamanic states", "deep relaxation", "stress relief"], mode: 'binaural' },
  { beat: 5, band: "Theta", leftHz: 200, rightHz: 205, uses: ["vivid imagery", "hypnagogic state", "emotional processing"], mode: 'binaural' },
  { beat: 5.5, band: "Theta", leftHz: 300, rightHz: 305.5, uses: ["intuition boost", "dream recall", "inner child healing"], mode: 'binaural' },
  { beat: 6, band: "Theta", leftHz: 200, rightHz: 206, uses: ["long-term memory", "light trance", "creative ideation"], mode: 'binaural' },
  { beat: 6.3, band: "Theta", leftHz: 200, rightHz: 206.3, uses: ["accelerated learning", "Schumann resonance"], mode: 'binaural' },
  { beat: 7, band: "Theta", leftHz: 200, rightHz: 207, uses: ["deep meditation", "anxiety reduction", "astral projection"], mode: 'binaural' },
  { beat: 7.5, band: "Theta", leftHz: 200, rightHz: 207.5, uses: ["creative visualization", "interiorization"], mode: 'binaural' },
  { beat: 7.83, band: "Theta", leftHz: 200, rightHz: 207.83, uses: ["Schumann resonance", "earth grounding", "circadian sync"], mode: 'binaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // Alpha (8–14 Hz) — Relaxed focus, calm, flow states
  // 300 Hz carrier for 13 Hz aligns with clinical alpha optimization research
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 8, band: "Alpha", leftHz: 200, rightHz: 208, uses: ["relaxed alertness", "stress reduction", "wind-down"], mode: 'binaural' },
  { beat: 8.5, band: "Alpha", leftHz: 200, rightHz: 208.5, uses: ["light relaxation", "open awareness", "mood lift"], mode: 'binaural' },
  { beat: 9, band: "Alpha", leftHz: 200, rightHz: 209, uses: ["serotonin release", "positivity", "mild pain relief"], mode: 'binaural' },
  { beat: 10, band: "Alpha", leftHz: 200, rightHz: 210, uses: ["peak alpha", "mood enhancement", "flow state entry"], mode: 'binaural' },
  { beat: 10.5, band: "Alpha", leftHz: 200, rightHz: 210.5, uses: ["healing visualization", "mid-alpha peak"], mode: 'binaural' },
  { beat: 11, band: "Alpha", leftHz: 200, rightHz: 211, uses: ["calm concentration", "stress recovery", "study mode"], mode: 'binaural' },
  { beat: 12, band: "Alpha", leftHz: 200, rightHz: 212, uses: ["mental clarity", "relaxed thinking", "alpha-beta bridge"], mode: 'binaural' },
  { beat: 13, band: "Alpha", leftHz: 300, rightHz: 313, uses: ["alert relaxation", "task readiness", "transition to focus"], mode: 'binaural' },
  { beat: 14, band: "Alpha", leftHz: 200, rightHz: 214, uses: ["borderline focus", "relaxed alertness"], mode: 'binaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // Low Beta (14–21 Hz) — Focused concentration, cognitive engagement
  // Carriers within safe binaural range
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 14, band: "Low Beta", leftHz: 200, rightHz: 214, uses: ["focused concentration", "problem solving", "waking alertness"], mode: 'binaural' },
  { beat: 15, band: "Low Beta", leftHz: 300, rightHz: 315, uses: ["mental energy", "active thinking", "exam prep"], mode: 'binaural' },
  { beat: 16, band: "Low Beta", leftHz: 200, rightHz: 216, uses: ["cognitive engagement", "reading focus", "working memory"], mode: 'binaural' },
  { beat: 18, band: "Low Beta", leftHz: 400, rightHz: 418, uses: ["alertness", "active processing", "light energizing"], mode: 'binaural' },
  { beat: 20, band: "Low Beta", leftHz: 200, rightHz: 220, uses: ["active problem solving", "complex task focus", "anti-drowsiness"], mode: 'binaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // Mid Beta (21–30 Hz) — Mental stimulation, energized focus
  // Carriers within safe range; approaching 30 Hz binaural fusion limit
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 21, band: "Mid Beta", leftHz: 300, rightHz: 321, uses: ["mental stimulation", "energized focus", "motivation"], mode: 'binaural' },
  { beat: 23, band: "Mid Beta", leftHz: 200, rightHz: 223, uses: ["sustained attention", "creative problem solving"], mode: 'binaural' },
  { beat: 25, band: "Mid Beta", leftHz: 300, rightHz: 325, uses: ["mental sharpness", "active engagement"], mode: 'binaural' },
  { beat: 28, band: "Mid Beta", leftHz: 400, rightHz: 428, uses: ["high cognitive demand", "analytical tasks"], mode: 'binaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // High Beta (30–40 Hz) — Intense focus, alertness
  // ⚠ EXCEEDS 30 Hz BINAURAL FUSION LIMIT — auto-switches to monaural mode
  // Above 30 Hz the brain perceives two separate tones, not a fused beat
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 30, band: "High Beta", leftHz: 300, rightHz: 330, uses: ["intense focus", "adrenaline-like alertness", "use with caution"], mode: 'monaural' },
  { beat: 33, band: "High Beta", leftHz: 400, rightHz: 433, uses: ["fight-or-flight arousal", "crisis thinking", "overstimulation risk"], mode: 'monaural' },
  { beat: 35, band: "High Beta", leftHz: 400, rightHz: 435, uses: ["peak alertness", "high-intensity work"], mode: 'monaural' },
  { beat: 38, band: "High Beta", leftHz: 300, rightHz: 338, uses: ["extreme arousal", "short-term only", "anxiety if prolonged"], mode: 'monaural' },

  // ═══════════════════════════════════════════════════════════════════════
  // Gamma (40+ Hz) — Peak cognition, memory, perception
  // ⚠ EXCEEDS 30 Hz BINAURAL FUSION LIMIT — always uses monaural mode
  // Gamma entrainment via binaural beats is physiologically impossible;
  // monaural beats provide real acoustic amplitude modulation
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 40, band: "Gamma", leftHz: 300, rightHz: 340, uses: ["gamma synchrony", "memory binding", "peak cognition"], mode: 'monaural' },
  { beat: 40, band: "Gamma", leftHz: 432, rightHz: 472, uses: ["gamma synchrony", "perception integration", "scientific tuning carrier"], mode: 'monaural', carrierSource: 'solfeggio' },
  { beat: 60, band: "Gamma", leftHz: 400, rightHz: 460, uses: ["hyperfast processing", "sensory integration", "experimental"], mode: 'monaural' },
  { beat: 100, band: "Gamma", leftHz: 400, rightHz: 500, uses: ["extreme gamma", "research only", "not recommended"], mode: 'isochronic' },

  // ═══════════════════════════════════════════════════════════════════════
  // Solfeggio Carrier Presets — therapeutic carrier frequencies
  // Carriers based on the Solfeggio scale; beat Hz within safe binaural range
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 7, band: "Theta", leftHz: 174, rightHz: 181, uses: ["foundation frequency", "pain relief", "nervous system safety", "solfeggio"], mode: 'binaural', carrierSource: 'solfeggio' },
  { beat: 7, band: "Theta", leftHz: 285, rightHz: 292, uses: ["healing frequency", "cellular regeneration", "tissue repair", "solfeggio"], mode: 'binaural', carrierSource: 'solfeggio' },
  { beat: 10, band: "Alpha", leftHz: 396, rightHz: 406, uses: ["liberation tone", "dissolving fear", "releasing guilt", "solfeggio"], mode: 'binaural', carrierSource: 'solfeggio' },
  { beat: 10, band: "Alpha", leftHz: 417, rightHz: 427, uses: ["transformation tone", "facilitating change", "emotional release", "solfeggio"], mode: 'binaural', carrierSource: 'solfeggio' },
  { beat: 10, band: "Alpha", leftHz: 432, rightHz: 442, uses: ["scientific tuning", "natural harmonic resonance", "meditation", "solfeggio"], mode: 'binaural', carrierSource: 'solfeggio' },
  { beat: 6, band: "Theta", leftHz: 528, rightHz: 534, uses: ["love frequency", "DNA repair", "vitality", "cellular rejuvenation", "solfeggio"], mode: 'monaural', carrierSource: 'solfeggio' },

  // ═══════════════════════════════════════════════════════════════════════
  // Planetary Carrier Presets — Hans Cousto's cosmic octave frequencies
  // Carriers derived from orbital/rotational periods of celestial bodies
  // All within safe binaural carrier range
  // ═══════════════════════════════════════════════════════════════════════
  { beat: 7.83, band: "Theta", leftHz: 136.10, rightHz: 143.93, uses: ["earth year", "stability", "grounding", "circadian sync", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 10, band: "Alpha", leftHz: 194.18, rightHz: 204.18, uses: ["earth day", "grounding", "daily rhythm", "emotional stability", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 7, band: "Theta", leftHz: 210.42, rightHz: 217.42, uses: ["moon", "emotion", "intuition", "cyclical rhythms", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 14, band: "Alpha", leftHz: 141.27, rightHz: 155.27, uses: ["mercury", "mental clarity", "communication", "cognitive sharpness", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 10, band: "Alpha", leftHz: 221.23, rightHz: 231.23, uses: ["venus", "heart processing", "love", "receptivity", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 14, band: "Alpha", leftHz: 144.72, rightHz: 158.72, uses: ["mars", "courage", "drive", "behavioral change", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 10, band: "Alpha", leftHz: 183.58, rightHz: 193.58, uses: ["jupiter", "expansion", "abundance", "spiritual growth", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
  { beat: 7, band: "Theta", leftHz: 147.85, rightHz: 154.85, uses: ["saturn", "discipline", "structure", "commitment", "planetary"], mode: 'binaural', carrierSource: 'planetary' },
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

/** Get the recommended stimulation mode for a given beat Hz. */
export function getRecommendedMode(beatHz: number): StimulationMode {
  // Above 30 Hz the brain cannot fuse binaural beats (Perrott & Nelson).
  // Auto-switch to monaural mode for beats > 30 Hz.
  if (beatHz > 30) return 'monaural'
  return 'binaural'
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

export function filterFrequencies(band?: BinauralBand | null | "all", search?: string, carrierSource?: CarrierSource | null): BinauralPreset[] {
  return BINAURAL_FREQUENCIES.filter((f) => {
    const bandOk = !band || band === "all" || f.band === band;
    const sourceOk = !carrierSource || f.carrierSource === carrierSource;
    const s = (search || "").toLowerCase();
    const searchOk = !s ||
      f.uses.some((u) => u.toLowerCase().includes(s)) ||
      String(f.beat).includes(s) ||
      f.band.toLowerCase().includes(s) ||
      (f.carrierSource && f.carrierSource.toLowerCase().includes(s)) ||
      (f.mode && f.mode.toLowerCase().includes(s));
    return searchOk && bandOk && sourceOk;
  });
}

export function getBrainStateFromBeat(beatHz: number): { name: BinauralBand; band: string; color: string; symbol: string; mode: StimulationMode } {
  const abs = Math.abs(beatHz);
  if (abs <= 4) return { name: "Delta", band: "Deep Sleep", color: "text-blue-200", symbol: "δ", mode: 'binaural' };
  if (abs <= 8) return { name: "Theta", band: "Meditation", color: "text-violet-200", symbol: "θ", mode: 'binaural' };
  if (abs <= 14) return { name: "Alpha", band: "Relaxed Focus", color: "text-emerald-200", symbol: "α", mode: 'binaural' };
  if (abs <= 21) return { name: "Low Beta", band: "Focus", color: "text-lime-200", symbol: "β-", mode: 'binaural' };
  if (abs <= 30) return { name: "Mid Beta", band: "Concentration", color: "text-amber-200", symbol: "β", mode: 'binaural' };
  if (abs <= 40) return { name: "High Beta", band: "Alertness", color: "text-orange-200", symbol: "β+", mode: 'monaural' };
  return { name: "Gamma", band: "Peak Cognition", color: "text-rose-200", symbol: "γ", mode: 'monaural' };
}

export const SOLFEGGIO_FREQUENCIES: { hz: number; name: string; theme: string }[] = [
  { hz: 174, name: 'Foundation', theme: 'Pain relief, nervous system safety' },
  { hz: 285, name: 'Healing', theme: 'Cellular regeneration, tissue repair' },
  { hz: 396, name: 'Liberation', theme: 'Dissolving fear, releasing guilt' },
  { hz: 417, name: 'Transformation', theme: 'Behavioral change, emotional release' },
  { hz: 432, name: 'Scientific Tuning', theme: 'Natural harmonic resonance, meditation' },
  { hz: 528, name: 'Love / DNA', theme: 'Vitality, DNA repair, cellular rejuvenation' },
  { hz: 639, name: 'Harmony', theme: 'Emotional equilibrium, connection' },
  { hz: 741, name: 'Awakening', theme: 'Intuition, mental clarity' },
  { hz: 852, name: 'Intuition', theme: 'Spiritual alignment, higher cognition' },
  { hz: 963, name: 'Crown', theme: 'Peak spiritual engagement' },
]

export const PLANETARY_FREQUENCIES: { hz: number; name: string; body: string; note: string; theme: string }[] = [
  { hz: 136.10, name: 'Earth Year', body: 'Earth', note: 'C#', theme: 'Stability, grounding, circadian sync' },
  { hz: 141.27, name: 'Mercury', body: 'Mercury', note: 'C#', theme: 'Mental clarity, communication' },
  { hz: 144.72, name: 'Mars', body: 'Mars', note: 'D', theme: 'Courage, drive, behavioral change' },
  { hz: 147.85, name: 'Saturn', body: 'Saturn', note: 'D', theme: 'Discipline, structure, commitment' },
  { hz: 183.58, name: 'Jupiter', body: 'Jupiter', note: 'F#', theme: 'Expansion, abundance, growth' },
  { hz: 194.18, name: 'Earth Day', body: 'Earth', note: 'G', theme: 'Grounding, daily rhythm, emotional stability' },
  { hz: 210.42, name: 'Moon', body: 'Moon', note: 'G#', theme: 'Emotion, intuition, cyclical rhythms' },
  { hz: 221.23, name: 'Venus', body: 'Venus', note: 'A', theme: 'Heart, love, receptivity' },
]