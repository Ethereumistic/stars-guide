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
