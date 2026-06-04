// ── Deterministic Binaural Beat Generation ──────────────────────────────────
//
// SAFETY STANDARDS (from neuroacoustic research):
// - Binaural carrier range: 200–500 Hz (optimal 200–440 Hz for phase-locking)
// - Binaural beat cap: ≤ 30 Hz (above 30 Hz, brain can't fuse — Perrott & Nelson)
// - Beats > 30 Hz auto-switch to monaural mode (acoustic summation, no phase-locking)
// - Gamma (40+ Hz) always uses monaural or isochronic
//
// CARRIER SOURCES:
// - 'standard': numerically optimal carriers
// - 'solfeggio': therapeutic Solfeggio frequencies (174–963 Hz)
// - 'planetary': Hans Cousto's cosmic octave frequencies (136–221 Hz)

import { BINAURAL_FREQUENCIES, type BinauralBand, type StimulationMode, type CarrierSource } from './binaural-frequencies';

export type NoiseType = 'white' | 'pink' | 'brown' | 'grey' | 'blue' | 'none'
export type { StimulationMode, CarrierSource }

// ── Optimal frequency ranges (based on research) ──────────────────────────────
// Binaural carriers: 200–500 Hz (optimal 200–440 Hz for phase-locking)
// Monaural/Isochronic carriers: 100–800 Hz (no phase-locking constraint)
// Beat frequency: ≤ 30 Hz for binaural (Perrott & Nelson fusion limit)
export const CARRIER_MIN_BINAURAL = 200
export const CARRIER_MAX_BINAURAL = 500
export const CARRIER_MIN_MONAURAL = 100
export const CARRIER_MAX_MONAURAL = 800
export const BEAT_MAX_BINAURAL = 30
export const BEAT_MAX_MONAURAL = 100

export const NOISE_PRESETS: { id: NoiseType; label: string; symbol: string; description: string; cutoff: number; volume: number; filterChain?: { type: BiquadFilterType; frequency: number; Q?: number; gain?: number }[] }[] = [
  { id: 'white', label: 'White Noise', symbol: '∿', description: 'Equal energy across all frequencies — bright, hissing sound ideal for masking sudden environmental noises', cutoff: 20000, volume: 0.15 },
  { id: 'pink',  label: 'Pink Noise',  symbol: '∿', description: 'Equal energy per octave — balanced, warm sound that promotes relaxation and deep sleep', cutoff: 800, volume: 0.18 },
  { id: 'brown', label: 'Brown Noise', symbol: '∿', description: 'Energy drops 6 dB per octave — deep, rumbling roar ideal for profound relaxation and tinnitus relief', cutoff: 300, volume: 0.22 },
  {
    id: 'grey', label: 'Grey Noise', symbol: '∿',
    description: 'Perceptually flat — inverse Fletcher-Munson equal-loudness contour. The gold standard for masking tinnitus and treating hyperacusis. Sounds smooth, balanced, and natural.',
    cutoff: 20000, volume: 0.20,
    filterChain: [
      { type: 'lowshelf', frequency: 250, gain: 6 },       // Boost bass to compensate for ear insensitivity
      { type: 'peaking', frequency: 3500, Q: 1.0, gain: -12 }, // Scoop out harsh, resonant midrange
      { type: 'highshelf', frequency: 10000, gain: 4 },    // Boost highs for air and clarity
    ],
  },
  {
    id: 'blue', label: 'Blue Noise', symbol: '∿',
    description: 'Power increases +3 dB per octave — airy, bright hiss that masks low-frequency environmental rumbles like traffic and HVAC',
    cutoff: 15000, volume: 0.12,
    filterChain: [
      { type: 'highpass', frequency: 2000, Q: 0.7 },
    ],
  },
]

export interface BinauralParams {
  name: string             // User-defined name for the session
  leftHz: number           // Left ear frequency (Hz)
  rightHz: number          // Right ear frequency (Hz)
  leftVolume: number       // 0.0 – 1.0
  rightVolume: number      // 0.0 – 1.0
  waveform: OscillatorType // 'sine' | 'triangle'
  noiseVolume: number      // 0.0 – 0.5
  noiseCutoff: number      // Hz — low-pass filter on noise; 100–3000 for binaural, up to 20000 for white noise
  noiseType: NoiseType     // white | pink | brown | grey | blue | none
  durationSeconds: number
  presetId: string         // preset id or 'custom'
  stimulationMode: StimulationMode  // binaural | monaural | isochronic
  carrierSource?: CarrierSource    // 'standard' | 'solfeggio' | 'planetary'
}

export interface BinauralBeatParams extends BinauralParams {
  version: 2
  generatedAt: string
}

export type PresetId = string

// ── Chat message serialization ──────────────────────────────────────────────
export function serializeBeat(params: BinauralBeatParams): string {
  return `[BINAURAL_BEAT]${JSON.stringify(params)}[/BINAURAL_BEAT]`
}

export function parseBeat(content: string): BinauralBeatParams | null {
  const match = content.match(/\[BINAURAL_BEAT\](.*?)\[\/BINAURAL_BEAT\]/)
  if (!match) return null
  try {
    const p = JSON.parse(match[1])

    // V2 format — native leftHz / rightHz
    if (p.version === 2 && typeof p.leftHz === 'number') {
      if (p.leftVolume === undefined) p.leftVolume = 1
      if (p.rightVolume === undefined) p.rightVolume = 1
      if (p.name === undefined) p.name = 'Custom Beat'
      if (p.noiseType === undefined) p.noiseType = 'pink'
      // Backfill noiseType: if noiseVolume is 0, treat as 'none'
      if (p.noiseVolume === 0) p.noiseType = 'none'
      // Backfill stimulationMode: older messages lack this field
      if (p.stimulationMode === undefined) {
        const beatHz = Math.abs((p.rightHz ?? 0) - (p.leftHz ?? 0))
        p.stimulationMode = beatHz > 30 ? 'monaural' : 'binaural'
      }
      // Backfill carrierSource
      if (p.carrierSource === undefined) p.carrierSource = 'standard'
      return p
    }

    // V1 format — migrate carrierHz + beatHz → leftHz + rightHz
    if (p.version === 1 && typeof p.carrierHz === 'number') {
      const beatHz = p.beatHz ?? 10
      const mode: StimulationMode = beatHz > 30 ? 'monaural' : 'binaural'
      return {
        version: 2,
        name: 'Custom Beat',
        leftHz: p.carrierHz,
        rightHz: p.carrierHz + beatHz,
        leftVolume: 1,
        rightVolume: 1,
        waveform: p.waveform ?? 'sine',
        noiseVolume: p.pinkNoiseVolume ?? 0.15,
        noiseCutoff: p.noiseCutoff ?? 800,
        noiseType: 'pink',
        durationSeconds: p.durationSeconds ?? 900,
        presetId: p.presetId ?? 'custom',
        generatedAt: p.generatedAt ?? new Date().toISOString(),
        stimulationMode: mode,
        carrierSource: 'standard',
      }
    }
  } catch {}
  return null
}

export function isBeatMessage(content: string): boolean {
  return content.includes('[BINAURAL_BEAT]')
}

export type BinauralIntent =
  | "sleep" | "meditation" | "focus" | "relaxation"
  | "peak_performance" | "study" | "creativity" | "healing"
  | "white_noise" | "pink_noise" | "brown_noise" | "grey_noise" | "blue_noise"
  | "isochronic" | "monaural"

export interface BinauralRationale {
  intent: string
  beatBand: string
  beatHz: number
  personalization: string | null
  noiseType?: NoiseType  // present only for noise-only sessions
  stimulationMode: StimulationMode
  carrierSource?: CarrierSource // present when using Solfeggio or Planetary carriers
}

export function serializeBeatRationale(rationale: BinauralRationale): string {
  return JSON.stringify(rationale);
}

export function parseBeatRationale(json: string): BinauralRationale | null {
  try {
    const r = JSON.parse(json);
    // Backfill stimulationMode for older rationale objects
    if (r.stimulationMode === undefined) {
      const beatHz = r.beatHz ?? 0
      r.stimulationMode = beatHz > 30 ? 'monaural' : 'binaural'
    }
    return r;
  } catch {
    return null;
  }
}

// ── Explicit parameter extraction from user message ─────────────────────────
// These extract explicit numeric/band specs the user stated directly.
// They take absolute priority over keyword-based intent detection.

/**
 * Extract an explicit beat frequency (Hz) from the user message.
 * Matches patterns like "7 hertz", "7hz", "7 Hz", "7.5 hz", "frequency of 7",
 * "7 hz theta", "7 hz beat", "7 hertz theta wave".
 *
 * When multiple Hz values appear (e.g. "200 Hz carrier with 7 Hz beat"),
 * prefers the value that falls within the binaural beat range (0.5–50 Hz).
 * Returns the numeric Hz value, or null if no explicit frequency was found.
 */
export function extractExplicitBeatHz(message: string): number | null {
  // Collect all Hz values mentioned in the message
  const allHz: number[] = []
  const hzPattern = /\b(\d+(?:\.\d+)?)\s*(?:hz|hertz)\b/gi
  let match: RegExpExecArray | null
  while ((match = hzPattern.exec(message)) !== null) {
    allHz.push(parseFloat(match[1]))
  }

  // Pattern: "frequency of <number>" or "frequency at <number>"
  const freqOfMatch = message.match(/frequency\s+(?:of|at|:)\s+(\d+(?:\.\d+)?)/i)
  if (freqOfMatch) allHz.push(parseFloat(freqOfMatch[1]))

  if (allHz.length === 0) return null

  // If any value is within binaural beat range, prefer it (closest to known beats)
  const beatRangeValues = allHz.filter(h => h >= 0.5 && h <= 50)
  if (beatRangeValues.length > 0) {
    // Return the first beat-range value found (leftmost in the message)
    return beatRangeValues[0]
  }

  // Fallback: return the first Hz value found (could be a carrier freq)
  return allHz[0]
}

/**
 * Map of brain band names to their Hz ranges and the default beat Hz for that band.
 */
const BAND_MAP: Record<string, { band: BinauralBand; defaultBeat: number; rangeMin: number; rangeMax: number }> = {
  delta: { band: "Delta", defaultBeat: 3, rangeMin: 0.5, rangeMax: 4 },
  theta: { band: "Theta", defaultBeat: 7, rangeMin: 4, rangeMax: 8 },
  alpha: { band: "Alpha", defaultBeat: 10, rangeMin: 8, rangeMax: 14 },
  beta:  { band: "Low Beta", defaultBeat: 18, rangeMin: 14, rangeMax: 30 },
  gamma: { band: "Gamma", defaultBeat: 40, rangeMin: 30, rangeMax: 100 },
}

/**
 * Extract an explicit brain band name from the user message.
 * Matches: "theta wave", "delta", "alpha state", "beta", "gamma", etc.
 */
export function extractExplicitBand(message: string): { band: BinauralBand; defaultBeat: number; rangeMin: number; rangeMax: number } | null {
  const lowerMessage = message.toLowerCase()

  // Multi-word bands first
  if (/\blow\s*beta\b/.test(lowerMessage)) return BAND_MAP["beta"]
  if (/\bhigh\s*beta\b/.test(lowerMessage)) return { band: "High Beta", defaultBeat: 33, rangeMin: 30, rangeMax: 40 }
  if (/\bmid\s*beta\b/.test(lowerMessage)) return { band: "Mid Beta", defaultBeat: 25, rangeMin: 21, rangeMax: 30 }

  // Single-word bands
  if (/\bdelta\b/.test(lowerMessage)) return BAND_MAP["delta"]
  if (/\btheta\b/.test(lowerMessage)) return BAND_MAP["theta"]
  if (/\balpha\b/.test(lowerMessage)) return BAND_MAP["alpha"]
  if (/\bgamma\b/.test(lowerMessage)) return BAND_MAP["gamma"]

  // "beta" alone — default to low beta
  if (/\bbeta\b/.test(lowerMessage)) return BAND_MAP["beta"]

  return null
}

/**
 * Extract ear preference from the user message.
 * Determines which ear should receive the higher frequency.
 * Returns null if no preference stated (defaults to right=higher).
 */
export function extractHigherEar(message: string): "left" | "right" | null {
  const lowerMessage = message.toLowerCase()

  if (
    /higher.*(?:left|l\b)/.test(lowerMessage) ||
    /(?:left|l\b).*higher/.test(lowerMessage) ||
    /left\s+ear\s+(?:gets|should|must|to|will)\s+(?:have|receive|get|be|play)/.test(lowerMessage) ||
    /(?:left|l)\s+ear\s+higher/.test(lowerMessage) ||
    /(?:left|l)\s+(?:channel|side|ear)\s+higher/.test(lowerMessage)
  ) {
    return "left"
  }

  if (
    /higher.*(?:right|r\b)/.test(lowerMessage) ||
    /(?:right|r\b).*higher/.test(lowerMessage) ||
    /right\s+ear\s+higher/.test(lowerMessage) ||
    /(?:right|r)\s+ear\s+higher/.test(lowerMessage)
  ) {
    return "right"
  }

  return null
}

/**
 * Extract explicit stimulation mode preference from the user message.
 * "isochronic" / "pulsing tone" → isochronic
 * "monaural" / "speaker" / "no headphones" → monaural
 * Default → binaural
 */
export function extractStimulationMode(message: string): StimulationMode {
  const lower = message.toLowerCase()
  if (/isochronic/i.test(lower) || /puls\w*\s*tone/i.test(lower) || /puls\w*\s*beat/i.test(lower) || /pulse\s*tone/i.test(lower) || /pulsating/i.test(lower)) return 'isochronic'
  if (/monaural/i.test(lower) || /mono\s*beat/i.test(lower) || /speaker.*beat/i.test(lower) || /no\s*headphone/i.test(lower) || /without\s*headphone/i.test(lower)) return 'monaural'
  return 'binaural'
}

/**
 * Extract carrier source preference from the user message.
 * "solfeggio" / specific Solfeggio name → 'solfeggio'
 * "planetary" / planet name → 'planetary'
 * Default → 'standard'
 */
export function extractCarrierSource(message: string): CarrierSource | null {
  const lower = message.toLowerCase()
  if (/solfeggio/i.test(lower)) return 'solfeggio'
  if (/planetary/i.test(lower) || /\bearth\b.*\bfreq/i.test(lower) || /\bmoon\b.*\bfreq/i.test(lower) || /\bvenus\b.*\bfreq/i.test(lower) || /\bmars\b.*\bfreq/i.test(lower) || /\bjupiter\b.*\bfreq/i.test(lower) || /\bsaturn\b.*\bfreq/i.test(lower) || /\bmercury\b.*\bfreq/i.test(lower)) return 'planetary'
  // Solfeggio frequency names
  if (/\bfoundation\b.*\bfreq/i.test(lower) || /174\s*hz/i.test(lower) || /\bhealing\s+freq\b/i.test(lower) || /285\s*hz/i.test(lower) || /\bliberation\b/i.test(lower) || /396\s*hz/i.test(lower) || /\btransformation\b.*\bfreq/i.test(lower) || /417\s*hz/i.test(lower) || /432\s*hz/i.test(lower) || /\bscientific\s+tuning\b/i.test(lower) || /528\s*hz/i.test(lower) || /\blove\s+freq\b/i.test(lower) || /\bdna\s+freq\b/i.test(lower)) return 'solfeggio'
  // Planetary body names in the context of frequencies
  if (/\bearth\s+(year|day)\b/i.test(lower) || /\bmoon\s+freq\b/i.test(lower) || /\bvenus\s+freq\b/i.test(lower) || /\bmars\s+freq\b/i.test(lower) || /\bjupiter\s+freq\b/i.test(lower) || /\bsaturn\s+freq\b/i.test(lower) || /\bmercury\s+freq\b/i.test(lower) || /136\.10/i.test(lower) || /194\.18/i.test(lower) || /210\.42/i.test(lower) || /221\.23/i.test(lower) || /141\.27/i.test(lower) || /144\.72/i.test(lower) || /183\.58/i.test(lower) || /147\.85/i.test(lower)) return 'planetary'
  return null
}

/**
 * Find the best matching preset in BINAURAL_FREQUENCIES for a given beat Hz.
 */
function findPresetForBeat(beatHz: number, bandHint?: string): { beat: number; band: string; leftHz: number; rightHz: number; mode: StimulationMode } {
  // Try exact match first (within 0.01 Hz tolerance)
  let exact = BINAURAL_FREQUENCIES.find(f =>
    Math.abs(f.beat - beatHz) < 0.01 &&
    (!bandHint || f.band === bandHint)
  )
  if (exact) return { beat: exact.beat, band: exact.band, leftHz: exact.leftHz, rightHz: exact.rightHz, mode: exact.mode }

  // Closest match, optionally filtered by band
  let candidates = bandHint
    ? BINAURAL_FREQUENCIES.filter(f => f.band === bandHint)
    : BINAURAL_FREQUENCIES

  if (candidates.length === 0) {
    candidates = BINAURAL_FREQUENCIES // fallback to all if band filter yields nothing
  }

  let best = candidates[0]
  let bestDist = Math.abs(candidates[0].beat - beatHz)
  for (const f of candidates) {
    const dist = Math.abs(f.beat - beatHz)
    if (dist < bestDist) {
      best = f
      bestDist = dist
    }
  }

  return { beat: best.beat, band: best.band, leftHz: best.leftHz, rightHz: best.rightHz, mode: best.mode }
}

// Get the best matching preset from frequencies library (intent-based)
function getBestMatchingPreset(intent: BinauralIntent): { beat: number; band: string; leftHz: number; rightHz: number; mode: StimulationMode } {
  // Noise intents don't map to binaural presets — they return a zero-beat placeholder
  const noiseDefaults: Record<string, { beat: number; band: string; leftHz: number; rightHz: number; mode: StimulationMode }> = {
    white_noise: { beat: 0, band: "Noise", leftHz: 0, rightHz: 0, mode: 'binaural' },
    pink_noise:  { beat: 0, band: "Noise", leftHz: 0, rightHz: 0, mode: 'binaural' },
    brown_noise: { beat: 0, band: "Noise", leftHz: 0, rightHz: 0, mode: 'binaural' },
    grey_noise:  { beat: 0, band: "Noise", leftHz: 0, rightHz: 0, mode: 'binaural' },
    blue_noise:  { beat: 0, band: "Noise", leftHz: 0, rightHz: 0, mode: 'binaural' },
  };
  if (intent in noiseDefaults) return noiseDefaults[intent];

  // Stimulation mode intents — use specific modes with default beat frequencies
  if (intent === 'isochronic') {
    const match = BINAURAL_FREQUENCIES.find(f => f.band === 'Alpha' && Math.abs(f.beat - 10) < 0.01)
    return match ? { beat: match.beat, band: match.band, leftHz: match.leftHz, rightHz: match.rightHz, mode: 'isochronic' } : { beat: 10, band: 'Alpha', leftHz: 200, rightHz: 210, mode: 'isochronic' }
  }
  if (intent === 'monaural') {
    const match = BINAURAL_FREQUENCIES.find(f => f.band === 'Alpha' && Math.abs(f.beat - 10) < 0.01)
    return match ? { beat: match.beat, band: match.band, leftHz: match.leftHz, rightHz: match.rightHz, mode: 'monaural' } : { beat: 10, band: 'Alpha', leftHz: 200, rightHz: 210, mode: 'monaural' }
  }

  const intentMap: Record<string, { beat: number; band: string }> = {
    sleep: { beat: 3, band: "Delta" },
    meditation: { beat: 7, band: "Theta" },
    focus: { beat: 18, band: "Low Beta" },
    relaxation: { beat: 10, band: "Alpha" },
    peak_performance: { beat: 40, band: "Gamma" },
    study: { beat: 14, band: "Low Beta" },
    creativity: { beat: 6, band: "Theta" },
    healing: { beat: 7.83, band: "Theta" },
  };

  const { beat, band } = intentMap[intent];
  const match = BINAURAL_FREQUENCIES.find(f => f.beat === beat && f.band === band);
  return match ? { beat: match.beat, band: match.band, leftHz: match.leftHz, rightHz: match.rightHz, mode: match.mode } : { beat: 10, band: "Alpha", leftHz: 200, rightHz: 210, mode: 'binaural' };
}

const INTENT_KEYWORDS: Record<BinauralIntent, RegExp[]> = {
  sleep:            [/\bsl(?:eep|ip)\b/i, /insomnia/i, /\bdre(?:am|em)\w*\b/i, /\bres?t\b/i, /\bzzz\b/i, /night\b/i],
  meditation:       [/meditat/i, /\bzen\b/i, /mindful/i, /spiritual/i, /inner peace/i],
  focus:            [/focus/i, /concentrat/i, /productiv/i, /\badhd\b/i, /\bwork\b/i],
  relaxation:       [/relax/i, /calm/i, /stress/i, /anxious/i, /\bchill\b/i, /unwind/i],
  peak_performance: [/peak/i, /gamma/i, /cognit/i, /performan/i, /sharp/i, /brain power/i],
  study:            [/\bstud[iy]/i, /exam/i, /\blearn\b/i, /memor/i, /retain/i],
  creativity:       [/creativ/i, /inspir/i, /flow state/i, /artist/i, /imagin/i],
  healing:          [/heal/i, /recover/i, /repair/i, /restor/i, /\bpain\b/i],
  white_noise:      [/white\s*noise/i, /\bwhite\s*sound\b/i],
  pink_noise:       [/pink\s*noise/i, /\bpink\s*sound\b/i],
  brown_noise:      [/brown\s*noise/i, /\bbrown\s*sound\b/i, /\bred\s*noise/i, /\bred\s*sound\b/i],
  grey_noise:       [/grey\s*noise/i, /gray\s*noise/i, /grey\s*sound/i, /gray\s*sound/i],
  blue_noise:       [/blue\s*noise/i, /\bblue\s*sound\b/i],
  isochronic:       [/isochronic/i, /\bpuls\w*\s*tone/i, /\bpuls\w*\s*beat/i, /pulse\s*tone/i, /\bpulsating/i],
  monaural:         [/monaural/i, /mono\s*beat/i, /\bspeaker\b.*\bbeat/i, /no\s*headphone/i, /without\s*headphone/i],
}

// Priority order: noise types first, then stimulation modes, then binaural intents
const INTENT_PRIORITY: BinauralIntent[] = [
  "white_noise", "pink_noise", "brown_noise", "grey_noise", "blue_noise",
  "isochronic", "monaural",
  "healing", "sleep", "meditation", "relaxation",
  "creativity", "study", "focus", "peak_performance",
]

const SIGN_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
}

const ELEMENT_CARRIER_OFFSET: Record<string, number> = {
  fire:  +30,
  earth: -20,
  air:   +15,
  water: -15,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function mode(strings: string[]): string {
  const counts = new Map<string, number>()
  for (const s of strings) {
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  let best = strings[0]
  let bestCount = 0
  for (const [s, c] of counts) {
    if (c > bestCount) { best = s; bestCount = c }
  }
  return best
}

/** Extract the binaural sub-intent (sleep, focus, etc.) from the user message */
export function extractBinauralIntent(message: string): BinauralIntent {
  for (const intent of INTENT_PRIORITY) {
    for (const pattern of INTENT_KEYWORDS[intent]) {
      if (pattern.test(message)) return intent
    }
  }
  return "relaxation" // default to alpha/relaxed focus
}

/** Extract duration hint from user message, or null for default */
function extractDuration(message: string): number | null {
  const minMatch = message.match(/\b(\d+)\s*min(?:ute)?s?\b/i)
  if (minMatch) return clamp(parseInt(minMatch[1], 10) * 60, 300, 7200)

  const hrMatch = message.match(/\b(\d+)\s*hr(?:s?|ours?)?\b/i)
  if (hrMatch) return clamp(parseInt(hrMatch[1], 10) * 3600, 300, 7200)

  if (/\bshort\b|\bquick\b|\bbrief\b/i.test(message)) return 900
  if (/\blong\b|\bextended\b|\bdeep\b/i.test(message)) return 3600
  if (/\bstandard\b|\bnormal\b|\bregular\b/i.test(message)) return 1800

  return null
}

/**
 * Detect if the user message explicitly asks for a noise-only session.
 * Only triggers on explicit noise requests.
 */
function detectNoiseIntent(message: string): NoiseType | null {
  const lower = message.toLowerCase()

  // Must contain a noise/sound keyword to qualify
  if (!/\bnoise\b|\bsound\b|\bsounds?\b|\bstatic\b|\bhum\b/.test(lower)) return null

  // If the user explicitly specifies a binaural frequency or brain band,
  // they want a binaural beat with noise as background — NOT pure noise.
  const hasExplicitHz = /\b(\d+(?:\.\d+)?)\s*(?:hz|hertz)\b/i.test(message)
  const hasExplicitBand = /\bdelta\b|\btheta\b|\balpha\b|\bbeta\b|\bgamma\b/i.test(lower)
  const hasBinauralKeyword = /\bbeat\b|\bbinaural\b|\bwave\b|\bfrequency\b|\bhz\b/i.test(lower)
  if ((hasExplicitHz || hasExplicitBand) && hasBinauralKeyword) return null

  if (/white\s*noise/i.test(lower)) return 'white'
  if (/pink\s*noise/i.test(lower)) return 'pink'
  if (/brown\s*noise/i.test(lower) || /red\s*noise/i.test(lower)) return 'brown'
  if (/grey\s*noise/i.test(lower) || /gray\s*noise/i.test(lower)) return 'grey'
  if (/blue\s*noise/i.test(lower)) return 'blue'

  // Generic "noise" without color → pink noise (most versatile)
  if (/just\s*noise|pure\s*noise|only\s*noise|noise\s*(?:for|to|help|so)|noise\s*only|background\s*noise|ambient\s*noise|\bgive\s*me\s*noise/i.test(lower)) return 'pink'

  return null
}

/**
 * Generate a noise-only binaural beat session.
 * Carriers are muted (volume=0), noise is cranked up.
 */
function generateNoiseOnlyBeat(
  noiseType: NoiseType,
  userMessage: string,
  birthData?: BirthDataLike | null,
): BinauralBeatParams & { rationale: BinauralRationale } {
  const preset = NOISE_PRESETS.find(p => p.id === noiseType)!
  const duration = extractDuration(userMessage) ?? 1800

  const noiseNames: Record<NoiseType, string> = {
    white: 'White Noise',
    pink: 'Pink Noise',
    brown: 'Brown Noise',
    grey: 'Grey Noise',
    blue: 'Blue Noise',
    none: 'No Noise',
  }

  let personalizationText: string | null = null
  if (birthData) {
    const elements: string[] = []
    if (birthData.placements) {
      for (const p of birthData.placements) {
        if (p.body === 'Sun' || p.body === 'Moon' || p.body === 'Ascendant') {
          const sign = p.sign.toLowerCase()
          const el = SIGN_ELEMENT[sign]
          if (el) elements.push(el)
        }
      }
    }
    if (birthData.chart) {
      if (birthData.chart.ascendant?.signId) {
        const el = SIGN_ELEMENT[birthData.chart.ascendant.signId.toLowerCase()]
        if (el) elements.push(el)
      }
      if (birthData.chart.planets) {
        for (const p of birthData.chart.planets) {
          if (p.id === 'sun' || p.id === 'moon') {
            const el = SIGN_ELEMENT[p.signId.toLowerCase()]
            if (el) elements.push(el)
          }
        }
      }
    }
    if (elements.length > 0) {
      const dominantElement = mode(elements)
      personalizationText = `Tuned for your ${dominantElement}-dominant chart — ${dominantElement} energy benefits from ${noiseNames[noiseType].toLowerCase()}.`
    }
  }

  const params: BinauralBeatParams = {
    version: 2,
    name: noiseNames[noiseType],
    leftHz: 200,
    rightHz: 200,
    leftVolume: 0,
    rightVolume: 0,
    waveform: 'sine',
    noiseVolume: preset.volume,
    noiseCutoff: preset.cutoff,
    noiseType,
    durationSeconds: clamp(duration, 300, 7200),
    presetId: 'ai_generated',
    generatedAt: new Date().toISOString(),
    stimulationMode: 'binaural', // Not relevant for noise-only, but required by schema
    carrierSource: 'standard',
  }

  const rationale: BinauralRationale = {
    intent: userMessage.slice(0, 100),
    beatBand: 'Noise',
    beatHz: 0,
    personalization: personalizationText,
    noiseType,
    stimulationMode: 'binaural',
  }

  return { ...params, rationale }
}

interface BirthDataLike {
  placements?: Array<{ body: string; sign: string }>
  chart?: {
    ascendant?: { signId: string } | null
    planets?: Array<{ id: string; signId: string }>
  }
}

/** Deterministically generate binaural/monaural/isochronic beat params from user message + optional birth data */
export function generateBinauralBeat(
  userMessage: string,
  birthData?: BirthDataLike | null,
): BinauralBeatParams & { rationale: BinauralRationale } {
  // ── Phase 0: Noise detection ─────────────────────────────────────────────
  const noiseIntent = detectNoiseIntent(userMessage)
  if (noiseIntent) {
    return generateNoiseOnlyBeat(noiseIntent, userMessage, birthData)
  }

  // ── Phase 0.5: Stimulation mode detection ──────────────────────────────────
  const userRequestedMode = extractStimulationMode(userMessage)

  // ── Phase 1: Determine beat frequency, band, and carrier source ──────────
  const explicitBeatHz = extractExplicitBeatHz(userMessage)
  const explicitBandInfo = extractExplicitBand(userMessage)
  const higherEar = extractHigherEar(userMessage)
  const intent = extractBinauralIntent(userMessage)
  const carrierSource = extractCarrierSource(userMessage)

  let targetBeatHz: number
  let targetBand: string
  let preset: { beat: number; band: string; leftHz: number; rightHz: number; mode: StimulationMode }

  if (explicitBeatHz !== null) {
    if (explicitBeatHz > 50) {
      // Too high for a beat Hz — treat as a carrier specification.
      if (explicitBandInfo) {
        targetBeatHz = explicitBandInfo.defaultBeat
        targetBand = explicitBandInfo.band
        preset = findPresetForBeat(targetBeatHz, targetBand)
      } else {
        preset = getBestMatchingPreset(intent)
        targetBeatHz = preset.beat
        targetBand = preset.band
      }
    } else {
      targetBeatHz = clamp(explicitBeatHz, 0.5, 50)

      if (explicitBandInfo) {
        targetBand = explicitBandInfo.band
        preset = findPresetForBeat(targetBeatHz, targetBand)
      } else {
        targetBand = inferBandFromHz(targetBeatHz)
        preset = findPresetForBeat(targetBeatHz, targetBand)
      }
    }
  } else if (explicitBandInfo) {
    targetBeatHz = explicitBandInfo.defaultBeat
    targetBand = explicitBandInfo.band
    preset = findPresetForBeat(targetBeatHz, targetBand)
  } else {
    preset = getBestMatchingPreset(intent)
    targetBeatHz = preset.beat
    targetBand = preset.band
  }

  // Use the preset's carrier frequencies as the base, but override
  // the beat Hz with the target if they differ.
  let leftHz = preset.leftHz
  let rightHz = preset.rightHz
  const presetDifference = Math.abs(preset.rightHz - preset.leftHz)

  if (Math.abs(presetDifference - targetBeatHz) > 0.01) {
    rightHz = leftHz + targetBeatHz
  }

  // ── Phase 2: Ear preference ──────────────────────────────────────────────
  if (higherEar === "left") {
    const temp = leftHz
    leftHz = rightHz
    rightHz = temp
  }

  // ── Phase 3: Personalize carrier with birth chart ──────────────────────────
  let personalizationText: string | null = null

  if (birthData) {
    const elements: string[] = []
    if (birthData.placements) {
      for (const p of birthData.placements) {
        if (p.body === "Sun" || p.body === "Moon" || p.body === "Ascendant") {
          const sign = p.sign.toLowerCase()
          const el = SIGN_ELEMENT[sign]
          if (el) elements.push(el)
        }
      }
    }
    if (birthData.chart) {
      if (birthData.chart.ascendant?.signId) {
        const el = SIGN_ELEMENT[birthData.chart.ascendant.signId.toLowerCase()]
        if (el) elements.push(el)
      }
      if (birthData.chart.planets) {
        for (const p of birthData.chart.planets) {
          if (p.id === "sun" || p.id === "moon") {
            const el = SIGN_ELEMENT[p.signId.toLowerCase()]
            if (el) elements.push(el)
          }
        }
      }
    }
    if (elements.length > 0) {
      const dominantElement = mode(elements)
      const offset = ELEMENT_CARRIER_OFFSET[dominantElement] ?? 0
      // Shift both channels by the same offset — preserves beat frequency
      leftHz = leftHz + offset
      rightHz = rightHz + offset
      personalizationText = `Tuned for your ${dominantElement}-dominant chart — ${dominantElement} energy resonates well with ${targetBand} frequencies.`
    }
  }

  // ── Phase 4: Extract duration ───────────────────────────────────────────
  const duration = extractDuration(userMessage) ?? 1800

  // ── Phase 5: Auto-switch stimulation mode ─────────────────────────────────
  // Beats > 30 Hz cannot be perceived as binaural (Perrott & Nelson)
  // → auto-switch to monaural mode unless user explicitly requested isochronic
  const finalMode: StimulationMode = userRequestedMode === 'isochronic'
    ? 'isochronic'
    : targetBeatHz > BEAT_MAX_BINAURAL && userRequestedMode === 'binaural'
      ? 'monaural'  // Override binaural to monaural when beat exceeds fusion limit
      : userRequestedMode !== 'binaural'
        ? userRequestedMode  // Respect explicit monaural/isochronic requests
        : targetBeatHz > BEAT_MAX_BINAURAL
          ? 'monaural'  // Auto-switch for high beats
          : 'binaural'

  // ── Phase 5b: Choose carrier frequency range based on mode ─────────────────
  const carrierMin = finalMode === 'binaural' ? CARRIER_MIN_BINAURAL : CARRIER_MIN_MONAURAL
  const carrierMax = finalMode === 'binaural' ? CARRIER_MAX_BINAURAL : CARRIER_MAX_MONAURAL

  // ── Phase 5c: For isochronic mode, use same carrier on both channels ───────
  // Isochronic tones don't need two different frequencies — they pulse a single tone.
  if (finalMode === 'isochronic') {
    // Use the left channel Hz as the carrier, pulse via LFO in the player
    rightHz = leftHz
  }

  // ── Phase 6: Build params with safety clamps ─────────────────────────────
  // CRITICAL: Clamp carriers as a pair to preserve the beat frequency.
  // Individual clamping can destroy the beat when both channels are near the boundary.
  const beatHzFinal = Math.min(targetBeatHz, finalMode === 'binaural' ? BEAT_MAX_BINAURAL : BEAT_MAX_MONAURAL)

  // Shift both channels up/down together until both are within range
  const minChannel = Math.min(leftHz, rightHz)
  const maxChannel = Math.max(leftHz, rightHz)
  if (minChannel < carrierMin) {
    // Both channels are too low — shift up to preserve beat
    const deficit = carrierMin - minChannel
    leftHz += deficit
    rightHz += deficit
  }
  if (maxChannel + (Math.max(leftHz, rightHz) - maxChannel) > carrierMax) {
    // Both channels are too high — shift down to preserve beat
    const actualMax = Math.max(leftHz, rightHz)
    if (actualMax > carrierMax) {
      const excess = actualMax - carrierMax
      leftHz -= excess
      rightHz -= excess
    }
  }
  // Final individual clamp as a safety net (should rarely change anything)
  leftHz = clamp(leftHz, carrierMin, carrierMax)
  rightHz = clamp(rightHz, carrierMin, carrierMax)

  const params: BinauralBeatParams = {
    version: 2,
    name: finalMode === 'isochronic'
      ? `Isochronic ${targetBeatHz}Hz`
      : finalMode === 'monaural'
        ? `Monaural ${targetBand} ${targetBeatHz}Hz`
        : `${targetBand} ${targetBeatHz}Hz`,
    leftHz,
    rightHz,
    leftVolume:  finalMode === 'isochronic' ? 1 : 1,
    rightVolume: finalMode === 'isochronic' ? 0 : 1,  // Isochronic: single carrier
    waveform:    "sine",
    noiseVolume: 0.1,
    noiseCutoff: 500,
    noiseType: 'pink' as NoiseType,
    durationSeconds: clamp(duration, 300, 7200),
    presetId:    "ai_generated",
    generatedAt: new Date().toISOString(),
    stimulationMode: finalMode,
    carrierSource: carrierSource ?? 'standard',
  }

  // Safety: ensure beat frequency is within range for the mode
  const computedBeat = Math.abs(params.rightHz - params.leftHz)
  if (finalMode === 'binaural' && computedBeat > BEAT_MAX_BINAURAL) {
    const sign = params.leftHz > params.rightHz ? -1 : 1
    params.rightHz = params.leftHz + sign * BEAT_MAX_BINAURAL
  }

  // Safety: ensure both channels are within valid carrier range
  params.leftHz = clamp(params.leftHz, carrierMin, carrierMax)
  params.rightHz = clamp(params.rightHz, carrierMin, carrierMax)

  // ── Phase 7: Build rationale ────────────────────────────────────────────
  const rationale: BinauralRationale = {
    intent: userMessage.slice(0, 100),
    beatBand: targetBand,
    beatHz: Math.abs(params.rightHz - params.leftHz),
    personalization: personalizationText,
    stimulationMode: finalMode,
    carrierSource: carrierSource ?? undefined,
  }

  return { ...params, rationale }
}

/**
 * Infer the brain band from a beat Hz value.
 * Used when the user specifies an explicit Hz but not a band name.
 */
function inferBandFromHz(hz: number): BinauralBand {
  if (hz <= 4) return "Delta"
  if (hz <= 8) return "Theta"
  if (hz <= 14) return "Alpha"
  if (hz <= 21) return "Low Beta"
  if (hz <= 30) return "Mid Beta"
  if (hz <= 40) return "High Beta"
  return "Gamma"
}