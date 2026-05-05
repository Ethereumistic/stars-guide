// ── Deterministic Binaural Beat Generation ──────────────────────────────────
import { BINAURAL_FREQUENCIES } from './binaural-frequencies';

export interface BinauralParams {
  name: string             // User-defined name for the beat
  leftHz: number           // Left ear frequency (Hz)
  rightHz: number          // Right ear frequency (Hz)
  leftVolume: number       // 0.0 – 1.0
  rightVolume: number      // 0.0 – 1.0
  waveform: OscillatorType // 'sine' | 'triangle'
  noiseVolume: number      // 0.0 – 0.5
  noiseCutoff: number      // 100 – 3000 Hz (low-pass filter on noise)
  durationSeconds: number
  presetId: string         // preset id or 'custom'
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
      return p
    }

    // V1 format — migrate carrierHz + beatHz → leftHz + rightHz
    if (p.version === 1 && typeof p.carrierHz === 'number') {
      return {
        version: 2,
        name: 'Custom Beat',
        leftHz: p.carrierHz,
        rightHz: p.carrierHz + (p.beatHz ?? 10),
        leftVolume: 1,
        rightVolume: 1,
        waveform: p.waveform ?? 'sine',
        noiseVolume: p.pinkNoiseVolume ?? 0.15,
        noiseCutoff: p.noiseCutoff ?? 800,
        durationSeconds: p.durationSeconds ?? 900,
        presetId: p.presetId ?? 'custom',
        generatedAt: p.generatedAt ?? new Date().toISOString(),
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

export interface BinauralRationale {
  intent: string
  beatBand: string
  beatHz: number
  personalization: string | null
}

export function serializeBeatRationale(rationale: BinauralRationale): string {
  return JSON.stringify(rationale);
}

export function parseBeatRationale(json: string): BinauralRationale | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Get the best matching preset from frequencies library
function getBestMatchingPreset(intent: BinauralIntent): { beat: number; band: string; leftHz: number; rightHz: number } {
  const intentMap: Record<BinauralIntent, { beat: number; band: string }> = {
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
  return match ? { beat: match.beat, band: match.band, leftHz: match.leftHz, rightHz: match.rightHz } : { beat: 10, band: "Alpha", leftHz: 100, rightHz: 110 };
}

const INTENT_KEYWORDS: Record<BinauralIntent, RegExp[]> = {
  sleep:            [/sl[ei]p/i, /insomnia/i, /dr[ei]m/i, /r[ea]st/i, /\bzzz\b/i],
  meditation:       [/meditat/i, /\bzen\b/i, /mindful/i, /spiritual/i, /inner peace/i],
  focus:            [/focus/i, /concentrat/i, /productiv/i, /\badhd\b/i, /\bwork\b/i],
  relaxation:       [/relax/i, /calm/i, /stress/i, /anxious/i, /\bchill\b/i, /unwind/i],
  peak_performance: [/peak/i, /gamma/i, /cognit/i, /performan/i, /sharp/i, /brain power/i],
  study:            [/\bstud[iy]/i, /exam/i, /\blearn\b/i, /memor/i, /retain/i],
  creativity:       [/creativ/i, /inspir/i, /flow state/i, /artist/i, /imagin/i],
  healing:          [/heal/i, /recover/i, /repair/i, /restor/i, /\bpain\b/i],
}

// Priority order: most specific first
const INTENT_PRIORITY: BinauralIntent[] = [
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

interface BirthDataLike {
  placements?: Array<{ body: string; sign: string }>
  chart?: {
    ascendant?: { signId: string } | null
    planets?: Array<{ id: string; signId: string }>
  }
}

/** Deterministically generate binaural beat params from user message + optional birth data */
export function generateBinauralBeat(
  userMessage: string,
  birthData?: BirthDataLike | null,
): BinauralBeatParams & { rationale: BinauralRationale } {
  // 1. Extract intent
  const intent = extractBinauralIntent(userMessage)

  // 2. Get matching preset
  const basePreset = getBestMatchingPreset(intent)

  // 3. Personalize with birth chart (if available)
  let leftHz = basePreset.leftHz
  let rightHz = basePreset.rightHz
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
      leftHz = clamp(leftHz + offset, 80, 600)
      rightHz = clamp(rightHz + offset, 80, 600)
      personalizationText = `Tuned for your ${dominantElement}-dominant chart — ${dominantElement} energy resonates well with ${basePreset.band} frequencies.`
    }
  }

  // 4. Extract duration
  const duration = extractDuration(userMessage) ?? 1800

  // 5. Build params with safety clamps
  const params: BinauralBeatParams = {
    version: 2,
    name: `${basePreset.band} ${basePreset.beat}Hz`,
    leftHz:      clamp(leftHz, 80, 600),
    rightHz:     clamp(rightHz, 80, 600),
    leftVolume:  1,
    rightVolume: 1,
    waveform:    "sine",
    noiseVolume: 0.1,
    noiseCutoff: 500,
    durationSeconds: clamp(duration, 300, 7200),
    presetId:    "ai_generated",
    generatedAt: new Date().toISOString(),
  }

  // 6. Safety: ensure beat frequency ≤ 50 Hz
  const beatHz = Math.abs(params.rightHz - params.leftHz)
  if (beatHz > 50) {
    params.rightHz = params.leftHz + Math.sign(params.rightHz - params.leftHz) * 50
  }

  // 7. Build rationale
  const rationale: BinauralRationale = {
    intent: userMessage.slice(0, 100),
    beatBand: basePreset.band,
    beatHz: Math.abs(params.rightHz - params.leftHz),
    personalization: personalizationText,
  }

  return { ...params, rationale }
}