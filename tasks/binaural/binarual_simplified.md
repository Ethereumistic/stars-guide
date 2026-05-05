# Binaural Beats — Lean Rewrite Spec

## What to Delete

- `workers/binaural-worker/` — the entire Worker. Gone.
- `src/hooks/use-binaural-player.ts` — rewrite from scratch (50 lines, not 150)
- `src/components/oracle/input/binaural-beats-card.tsx` — rewrite (simpler, no loading state)
- Any `.env` entries for `NEXT_PUBLIC_BINAURAL_WORKER_URL`

Keep:
- `src/lib/binaural-presets.ts` — keep the preset definitions and types, simplify

---

## Why the Worker is Gone

The previous architecture fetched a WAV file from a Worker and looped it via
`AudioBufferSourceNode`. The Worker existed solely to generate sine wave math.

The browser's Web Audio API has `OscillatorNode` — a native hardware-accelerated
sine wave generator running on the audio thread. Two oscillators, offset by the
beat frequency, panned hard left and right. That IS a binaural beat. No file, no
fetch, no Worker, no loop segment, no fade bug, no loading state.

---

## New Architecture (Client Only)

```
Button click
  → new AudioContext()
  → OscillatorNode (carrierHz) → StereoPannerNode(-1) → GainNode → destination
  → OscillatorNode (carrierHz + beatHz) → StereoPannerNode(+1) → GainNode → destination
  → oscillators.start()
  → gain ramps 0 → 1 over 3s (fade in)
  → timer counts up to durationSeconds
  → at end: gain ramps 1 → 0 over 2s, then oscillators.stop()

Stop button
  → gain ramps 1 → 0 over 2s, then oscillators.stop()
```

No network. Starts in milliseconds. Works offline. No loop artifacts. No fade bug
possible because there is no loop.

---

## File 1: `src/hooks/use-binaural-player.ts` (rewrite)

```typescript
import { useRef, useState, useEffect } from 'react'
import type { BinauralParams } from '@/lib/binaural-presets'

type Status = 'idle' | 'playing' | 'stopping'

export function useBinauralPlayer() {
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const osc1Ref = useRef<OscillatorNode | null>(null)
  const osc2Ref = useRef<OscillatorNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  function play(params: BinauralParams) {
    // Clean up any existing session first
    _cleanup(false)

    const ctx = new AudioContext()
    ctxRef.current = ctx

    // Gain node for session-level fade in/out
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 3)
    gain.connect(ctx.destination)
    gainRef.current = gain

    // Pink noise approximation: low-pass filtered white noise
    // Simple approach: a BiquadFilter on a noise source
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 800
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = params.pinkNoiseVolume * 0.3
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(gain)
    noiseSource.start()

    // Left oscillator: carrier frequency, panned hard left
    const osc1 = ctx.createOscillator()
    const pan1 = ctx.createStereoPanner()
    osc1.frequency.value = params.carrierHz
    pan1.pan.value = -1
    osc1.connect(pan1)
    pan1.connect(gain)
    osc1Ref.current = osc1

    // Right oscillator: carrier + beat frequency, panned hard right
    const osc2 = ctx.createOscillator()
    const pan2 = ctx.createStereoPanner()
    osc2.frequency.value = params.carrierHz + params.beatHz
    pan2.pan.value = 1
    osc2.connect(pan2)
    pan2.connect(gain)
    osc2Ref.current = osc2

    osc1.start()
    osc2.start()
    noiseSource.start()

    startTimeRef.current = Date.now()
    setElapsed(0)
    setStatus('playing')

    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(sec)
      if (sec >= params.durationSeconds) stop()
    }, 1000)
  }

  function stop() {
    if (!ctxRef.current || !gainRef.current) return
    setStatus('stopping')

    const ctx = ctxRef.current
    const gain = gainRef.current
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2)

    if (timerRef.current) clearInterval(timerRef.current)

    setTimeout(() => _cleanup(true), 2200)
  }

  function _cleanup(resetStatus: boolean) {
    osc1Ref.current?.stop()
    osc2Ref.current?.stop()
    ctxRef.current?.close()
    osc1Ref.current = null
    osc2Ref.current = null
    ctxRef.current = null
    gainRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (resetStatus) {
      setStatus('idle')
      setElapsed(0)
    }
  }

  useEffect(() => () => _cleanup(false), [])

  return { status, elapsed, play, stop }
}
```

---

## File 2: `src/lib/binaural-presets.ts` (replace entirely)

```typescript
export interface BinauralParams {
  carrierHz: number
  beatHz: number
  pinkNoiseVolume: number   // 0.0 – 0.5
  durationSeconds: number
  presetId: string          // preset id or 'custom'
}

export interface BinauralBeatParams extends BinauralParams {
  version: 1
  generatedAt: string
}

export const BRAIN_STATE_PRESETS = [
  { id: 'deep_sleep',       label: 'Deep Sleep',       beatHz: 1.5, carrierHz: 120, duration: 3600 },
  { id: 'deep_meditation',  label: 'Deep Meditation',  beatHz: 5,   carrierHz: 160, duration: 1800 },
  { id: 'relaxed_focus',    label: 'Relaxed Focus',    beatHz: 10,  carrierHz: 200, duration: 900  },
  { id: 'concentration',    label: 'Concentration',    beatHz: 18,  carrierHz: 250, duration: 1800 },
  { id: 'peak_performance', label: 'Peak Performance', beatHz: 40,  carrierHz: 320, duration: 1200 },
] as const

export type PresetId = typeof BRAIN_STATE_PRESETS[number]['id']

// Chat message serialization
export function serializeBeat(params: BinauralBeatParams): string {
  return `[BINAURAL_BEAT]${JSON.stringify(params)}[/BINAURAL_BEAT]`
}

export function parseBeat(content: string): BinauralBeatParams | null {
  const match = content.match(/\[BINAURAL_BEAT\](.*?)\[\/BINAURAL_BEAT\]/)
  if (!match) return null
  try {
    const p = JSON.parse(match[1])
    if (p.version === 1 && typeof p.carrierHz === 'number') return p
  } catch {}
  return null
}

export function isBeatMessage(content: string): boolean {
  return content.includes('[BINAURAL_BEAT]')
}
```

---

## File 3: `binaural-beats-card.tsx` (rewrite, no loading state)

The card has two views: controls and playing. No loading state exists anymore
because playback starts in milliseconds.

**Controls view — 4 elements:**
1. Brain state pill selector (maps to beatHz + sets carrierHz default)
2. Carrier Hz slider (80–500, step 10)
3. Duration segmented selector: 15m | 30m | 60m
4. Ambient slider (0–40%, step 5%)
5. "Play" button

**Playing view:**
1. Brain state label + carrier Hz subtitle
2. Elapsed / total time (use `formatTime` helper)
3. "Stop" button

**Props:**
```typescript
interface Props {
  onDismiss: () => void
  onGenerate: (params: BinauralBeatParams) => void
}
```

When Play is clicked:
1. Call `player.play(params)`
2. Build a `BinauralBeatParams` object with `version: 1` and `generatedAt: new Date().toISOString()`
3. Call `props.onGenerate(params)` — parent handles saving to chat

When Stop is clicked: call `player.stop()`, which fades out over 2s then resets to idle automatically.

Selecting a preset auto-sets `carrierHz` and `durationSeconds` to the preset defaults,
but the user can override with the sliders. If any slider is moved away from preset
defaults, set `presetId = 'custom'`.

---

## File 4: `binaural-beat-history-card.tsx` (compact, new)

A minimal card that renders in the chat history for saved beats.

Props: `{ params: BinauralBeatParams }`

Uses its own `useBinauralPlayer()` instance (each history card is independent).

Shows:
- Preset label (look up from `BRAIN_STATE_PRESETS` by `presetId`, fallback "Custom")
- `{carrierHz} Hz carrier · {beatHz} Hz beat`
- Duration formatted
- Play / Stop button
- Elapsed time when playing

---

## Changes to Existing Files

### `oracle-input.tsx`
- Add "Binaural Beats" to the `+` menu
- When active, render `<BinauralBeatsCard onDismiss={...} onGenerate={handleBeatGenerated} />`
- `handleBeatGenerated`: call `addMessageMutation` with `serializeBeat(params)` as content — do NOT call `invokeOracle` after this message

### `oracle/chat/[sessionId]/page.tsx`
- In the message render loop: check `isBeatMessage(msg.content)`
- If true: render `<BinauralBeatHistoryCard params={parseBeat(msg.content)} />`
- If false: render normally

---

## What's Gone vs Before

| Before | Now |
|--------|-----|
| Cloudflare Worker | Deleted |
| WAV DSP math | Deleted |
| lamejs / WAV header | Deleted |
| wrangler.toml cpu_ms config | Deleted |
| 30-second loop segment | Deleted |
| Fade bug (loop envelope) | Impossible — no loop |
| Loading state (fetch) | Deleted — starts instantly |
| `NEXT_PUBLIC_BINAURAL_WORKER_URL` env var | Deleted |
| ~200 lines of Worker code | ~80 lines of hook |

## Quality Gates

- [ ] Playback starts in under 200ms from button click (no fetch)
- [ ] Left and right channels are different (beat is audible in headphones)
- [ ] Fade in over 3 seconds on play
- [ ] Fade out over 2 seconds on stop and auto-stop
- [ ] Auto-stop fires at chosen duration
- [ ] Generating saves a compact card to chat history
- [ ] History card replays the exact params
- [ ] History card persists after page refresh
- [ ] Beat messages do NOT trigger Oracle AI response
- [ ] No Worker deployment needed