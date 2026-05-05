export interface BinauralParams {
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

export const BRAIN_STATE_PRESETS = [
  { id: 'deep_sleep',       label: 'Deep Sleep',       leftHz: 100, rightHz: 101.5, waveform: 'sine' as const,     leftVolume: 1, rightVolume: 1, noiseVolume: 0.05, noiseCutoff: 300,  duration: 3600 },
  { id: 'deep_meditation',  label: 'Deep Meditation',  leftHz: 150, rightHz: 155,   waveform: 'sine' as const,     leftVolume: 1, rightVolume: 1, noiseVolume: 0.10, noiseCutoff: 500,  duration: 1800 },
  { id: 'relaxed_focus',    label: 'Relaxed Focus',    leftHz: 200, rightHz: 210,   waveform: 'sine' as const,     leftVolume: 1, rightVolume: 1, noiseVolume: 0.15, noiseCutoff: 800,  duration: 900  },
  { id: 'concentration',    label: 'Concentration',    leftHz: 250, rightHz: 268,   waveform: 'triangle' as const, leftVolume: 1, rightVolume: 1, noiseVolume: 0.10, noiseCutoff: 1000, duration: 1800 },
  { id: 'peak_performance', label: 'Peak Performance', leftHz: 300, rightHz: 340,   waveform: 'sine' as const,     leftVolume: 1, rightVolume: 1, noiseVolume: 0.20, noiseCutoff: 1400, duration: 1200 },
] as const

export type PresetId = typeof BRAIN_STATE_PRESETS[number]['id']

// ── Brain state band from beat frequency ────────────────────────────────────
export function getBrainState(beatHz: number): { name: string; band: string; color: string } {
  const abs = Math.abs(beatHz)
  if (abs <= 4)   return { name: 'Delta',  band: 'Deep Sleep',      color: 'text-indigo-400' }
  if (abs <= 8)   return { name: 'Theta',  band: 'Deep Meditation', color: 'text-violet-400' }
  if (abs <= 13)  return { name: 'Alpha',  band: 'Relaxed Focus',   color: 'text-cyan-400' }
  if (abs <= 30)  return { name: 'Beta',   band: 'Concentration',   color: 'text-amber-400' }
  if (abs <= 50)  return { name: 'Gamma',  band: 'Peak Performance',color: 'text-rose-400' }
  return { name: 'Ultra', band: 'Beyond typical range', color: 'text-white/40' }
}

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
      // Backfill leftVolume/rightVolume for V2 messages saved before they existed
      if (p.leftVolume === undefined) p.leftVolume = 1
      if (p.rightVolume === undefined) p.rightVolume = 1
      return p
    }

    // V1 format — migrate carrierHz + beatHz → leftHz + rightHz
    if (p.version === 1 && typeof p.carrierHz === 'number') {
      return {
        version: 2,
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

// ── Deterministic Binaural Beat Generation ──────────────────────────────────

export type BinauralIntent =
  | "sleep" | "meditation" | "focus" | "relaxation"
  | "peak_performance" | "study" | "creativity" | "healing"

export interface BinauralRationale {
  intent: string
  beatBand: string
  beatHz: number
  personalization: string | null
}

interface BeatProfile {
  leftHz: number
  rightHz: number
  waveform: OscillatorType
  noiseVolume: number
  noiseCutoff: number
  durationSeconds: number
  band: string
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

const INTENT_PROFILES: Record<BinauralIntent, BeatProfile> = {
  sleep: {
    leftHz: 100, rightHz: 103,       // 3 Hz beat (Delta)
    waveform: "sine",
    noiseVolume: 0.15, noiseCutoff: 300,
    durationSeconds: 3600,            // 60 min
    band: "Delta",
  },
  meditation: {
    leftHz: 150, rightHz: 155,       // 5 Hz beat (Theta)
    waveform: "sine",
    noiseVolume: 0.10, noiseCutoff: 500,
    durationSeconds: 1800,            // 30 min
    band: "Theta",
  },
  relaxation: {
    leftHz: 200, rightHz: 210,       // 10 Hz beat (Alpha)
    waveform: "sine",
    noiseVolume: 0.08, noiseCutoff: 800,
    durationSeconds: 1200,            // 20 min
    band: "Alpha",
  },
  focus: {
    leftHz: 250, rightHz: 264,       // 14 Hz beat (Beta)
    waveform: "triangle",
    noiseVolume: 0.10, noiseCutoff: 1000,
    durationSeconds: 1800,            // 30 min
    band: "Beta",
  },
  peak_performance: {
    leftHz: 320, rightHz: 350,       // 30 Hz beat (Gamma)
    waveform: "sine",
    noiseVolume: 0.12, noiseCutoff: 1500,
    durationSeconds: 1200,            // 20 min
    band: "Gamma",
  },
  study: {
    leftHz: 230, rightHz: 243,       // 13 Hz beat (Beta)
    waveform: "triangle",
    noiseVolume: 0.10, noiseCutoff: 1000,
    durationSeconds: 1800,
    band: "Beta",
  },
  creativity: {
    leftHz: 180, rightHz: 186,       // 6 Hz beat (Theta)
    waveform: "sine",
    noiseVolume: 0.08, noiseCutoff: 600,
    durationSeconds: 1800,
    band: "Theta",
  },
  healing: {
    leftHz: 120, rightHz: 124,       // 4 Hz beat (Delta/Theta border)
    waveform: "sine",
    noiseVolume: 0.15, noiseCutoff: 400,
    durationSeconds: 2400,            // 40 min
    band: "Theta",
  },
}

// ── Birth chart personalization ────────────────────────────────────────────

const SIGN_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
}

const ELEMENT_CARRIER_OFFSET: Record<string, number> = {
  fire:  +50,
  earth: -30,
  air:   +20,
  water: -20,
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
  return "meditation" // safest default
}

/** Extract duration hint from user message, or null for default */
function extractDuration(message: string): number | null {
  // "20 minutes", "30 min", etc.
  const minMatch = message.match(/\b(\d+)\s*min(?:ute)?s?\b/i)
  if (minMatch) return clamp(parseInt(minMatch[1], 10) * 60, 300, 7200)

  // "1 hr", "2 hours", etc.
  const hrMatch = message.match(/\b(\d+)\s*hr(?:s?|ours?)?\b/i)
  if (hrMatch) return clamp(parseInt(hrMatch[1], 10) * 3600, 300, 7200)

  // Named durations
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

  // 2. Get base profile
  const baseProfile = INTENT_PROFILES[intent]

  // 3. Personalize with birth chart (if available)
  let leftHz = baseProfile.leftHz
  let rightHz = baseProfile.rightHz
  let personalizationText: string | null = null

  if (birthData) {
    // Collect elements from Sun, Moon, Rising
    const elements: string[] = []

    // From placements (legacy format)
    if (birthData.placements) {
      for (const p of birthData.placements) {
        if (p.body === "Sun" || p.body === "Moon" || p.body === "Ascendant") {
          const sign = p.sign.toLowerCase()
          const el = SIGN_ELEMENT[sign]
          if (el) elements.push(el)
        }
      }
    }

    // From chart (v2 format)
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
      leftHz = clamp(leftHz + offset, 40, 600)
      rightHz = clamp(rightHz + offset, 40, 600)
      personalizationText = `Tuned for your ${dominantElement}-dominant chart placements — ${dominantElement} energy responds well to ${baseProfile.band} frequencies.`
    }
  }

  // 4. Extract duration
  const duration = extractDuration(userMessage) ?? baseProfile.durationSeconds

  // 5. Build params with safety clamps
  const params: BinauralBeatParams = {
    version: 2,
    leftHz:      clamp(leftHz, 40, 600),
    rightHz:     clamp(rightHz, 40, 600),
    leftVolume:  1,
    rightVolume: 1,
    waveform:    baseProfile.waveform,
    noiseVolume: clamp(baseProfile.noiseVolume, 0, 0.5),
    noiseCutoff: clamp(baseProfile.noiseCutoff, 100, 3000),
    durationSeconds: clamp(duration, 300, 7200),
    presetId:    "ai_generated",
    generatedAt: new Date().toISOString(),
  }

  // 6. Safety: ensure beat frequency ≤ 40 Hz
  const beatHz = Math.abs(params.rightHz - params.leftHz)
  if (beatHz > 40) {
    params.rightHz = params.leftHz + Math.sign(params.rightHz - params.leftHz) * 40
  }

  // 7. Build rationale
  const rationale: BinauralRationale = {
    intent: userMessage.slice(0, 100),
    beatBand: baseProfile.band,
    beatHz: Math.abs(params.rightHz - params.leftHz),
    personalization: personalizationText,
  }

  return { ...params, rationale }
}
