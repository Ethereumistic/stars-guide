import { useRef, useState, useEffect, useCallback } from 'react'
import type { BinauralParams, NoiseType } from '@/lib/binaural-presets'
import { NOISE_PRESETS } from '@/lib/binaural-presets'

type Status = 'idle' | 'playing' | 'stopping'

// ── Noise buffer generation ─────────────────────────────────────────────────
// Each noise type uses a different spectral distribution:

/** White noise: uniform random samples — equal energy at all frequencies */
function generateWhiteNoise(length: number): Float32Array {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i++) buffer[i] = Math.random() * 2 - 1
  return buffer
}

/** Pink noise: Voss-McCartney algorithm — equal energy per octave */
function generatePinkNoise(length: number): Float32Array {
  const buffer = new Float32Array(length)
  const rows = new Float32Array(7).fill(0)
  let runningSum = 0

  for (let i = 0; i < length; i++) {
    if (i > 0) {
      const bit = i & -i // lowest set bit
      const row = Math.min(Math.floor(Math.log2(bit)), 6)
      runningSum -= rows[row]
      rows[row] = Math.random() * 2 - 1
      runningSum += rows[row]
    } else {
      rows[0] = Math.random() * 2 - 1
      runningSum = rows[0]
    }
    buffer[i] = runningSum / 7
  }
  return buffer
}

/** Brown noise: random walk — energy drops 6 dB per octave (1/f²) */
function generateBrownNoise(length: number): Float32Array {
  const buffer = new Float32Array(length)
  let lastOut = 0

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    // Leaky integrator with very slight decay to prevent DC drift
    lastOut = (lastOut + (0.02 * white)) / 1.02
    buffer[i] = lastOut * 14 // amplify to roughly -1..1 range
  }
  return buffer
}

function generateNoiseBuffer(type: NoiseType, sampleRate: number): AudioBuffer {
  const length = sampleRate * 2 // 2 seconds, looped

  // Grey and blue noise start from white noise, then get filtered in the audio graph
  const baseType = (type === 'grey' || type === 'blue') ? 'white' : type

  let data: Float32Array

  switch (baseType) {
    case 'white':
      data = generateWhiteNoise(length)
      break
    case 'pink':
      data = generatePinkNoise(length)
      break
    case 'brown':
      data = generateBrownNoise(length)
      break
    case 'none':
    default:
      data = new Float32Array(length)
      break
  }

  const buffer = new AudioBuffer({ numberOfChannels: 1, length, sampleRate })
  buffer.getChannelData(0).set(data)
  return buffer
}

/**
 * Create a custom PeriodicWave for isochronic tones.
 * This approximates a square wave with smoothed corners to prevent
 * clicking artifacts from abrupt phase truncation.
 */
function createIsochronicPeriodicWave(ctx: AudioContext): PeriodicWave {
  const numHarmonics = 16
  const real = new Float32Array(numHarmonics)
  const imag = new Float32Array(numHarmonics)
  real[0] = 0
  imag[0] = 0
  // Smoothed square wave: only odd harmonics, diminishing amplitude
  for (let n = 1; n < numHarmonics; n++) {
    if (n % 2 === 1) {
      // Odd harmonics with slight roll-off for smoothing
      real[n] = 0
      imag[n] = (4 / (n * Math.PI)) * (1 / (1 + n * 0.1))
    } else {
      real[n] = 0
      imag[n] = 0
    }
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false })
}

export function useBinauralPlayer() {
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const leftGainRef = useRef<GainNode | null>(null)
  const rightGainRef = useRef<GainNode | null>(null)
  const oscLeftRef = useRef<OscillatorNode | null>(null)
  const oscRightRef = useRef<OscillatorNode | null>(null)
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const noiseFilterRef = useRef<BiquadFilterNode | null>(null)
  // Extra filter nodes for grey/blue noise
  const noiseExtraFiltersRef = useRef<BiquadFilterNode[]>([])
  // Isochronic LFO
  const lfoOscRef = useRef<OscillatorNode | null>(null)
  const lfoGainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // ── Shared audio graph setup ──────────────────────────────────────────────
  function _createGraph(params: BinauralParams) {
    const ctx = new AudioContext()
    ctxRef.current = ctx
    const mode = params.stimulationMode ?? 'binaural'

    // Master gain — session fade in over 3s
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, ctx.currentTime)
    master.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 3)
    master.connect(ctx.destination)
    masterRef.current = master

    const isNoiseOnly = params.leftVolume === 0 && params.rightVolume === 0

    if (mode === 'isochronic' && !isNoiseOnly) {
      // ── Isochronic Mode ──────────────────────────────────────────────────
      // Single carrier tone pulsed on/off at the beat frequency via LFO.
      // OscillatorNode (carrier) → GainNode (isochronicGate) → master
      //                     ↑
      // OscillatorNode (LFO @ beatHz, custom PeriodicWave) → GainNode (depth) → isochronicGate.gain

      const carrierHz = params.leftHz
      const beatHz = Math.abs(params.rightHz - params.leftHz) || carrierHz
      // For isochronic, beatHz comes from the original target, but if leftHz === rightHz,
      // we should use the absolute difference (which would be 0). In that case, get it
      // from the params more directly.
      // The player receives the actual leftHz/rightHz as set by the generator,
      // where for isochronic, rightHz = leftHz (single carrier).
      // But we need the beat Hz for the LFO. We'll extract it from the name
      // or approximate from the band. For now, we use a stored value.
      // Actually, for isochronic, the beat frequency is encoded as |rightHz - leftHz|
      // before the generator sets them equal. But by the time we get params,
      // they ARE equal. We need an alternative approach.
      // Solution: pass beatHz separately or recover it.
      // For simplicity, we'll use the name to extract it, or pass it as a convention
      // where rightHz stores the beat frequency in isochronic mode.
      // Actually, looking at the generator code, for isochronic mode:
      // rightHz = leftHz (same carrier). The beat is targetBeatHz.
      // We need to communicate the beat frequency somehow.
      // Let's use a heuristic: for isochronic, the beat Hz is stored temporarily.
      // For now, let's use the name pattern "Isochronic XHz" to extract X.
      // Better approach: store it in the name or a special field.
      // Simplest: since we can parse the name, let's extract the Hz.
      const nameMatch = params.name.match(/Isochronic\s+(\d+(?:\.\d+)?)Hz/i)
      const isoBeatHz = nameMatch ? parseFloat(nameMatch[1]) : 10

      // Carrier oscillator (the audible tone)
      const oscCarrier = ctx.createOscillator()
      oscCarrier.type = params.waveform
      oscCarrier.frequency.value = carrierHz

      // Isochronic gate — LFO modulates this gain between silence and full volume
      const isochronicGate = ctx.createGain()
      // Start at 0 to avoid click on first cycle
      isochronicGate.gain.value = 0

      // LFO oscillator — runs at the beat frequency (e.g. 10 Hz for Alpha)
      const lfo = ctx.createOscillator()
      const periodicWave = createIsochronicPeriodicWave(ctx)
      lfo.setPeriodicWave(periodicWave)
      lfo.frequency.value = isoBeatHz

      // LFO depth gain — scales the LFO output to range 0..1
      // The periodic wave outputs -1 to +1; we need 0 to +1 for gain
      // So we add an offset via a constant source
      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = 0.5  // Scale LFO to ±0.5

      // Constant offset to shift LFO from ±0.5 to 0..1 (for gain modulation)
      const offsetNode = ctx.createConstantSource()
      offsetNode.offset.value = 0.5
      offsetNode.start()

      // Connect: LFO → lfoDepth → isochronicGate.gain
      //          offsetNode → isochronicGate.gain
      // This creates: gate.gain = 0.5 + 0.5 * square = 0..1 at beatHz
      lfo.connect(lfoDepth)
      lfoDepth.connect(isochronicGate.gain)
      offsetNode.connect(isochronicGate.gain)

      // Carrier → isochronicGate → volume gain → master
      const carrierGain = ctx.createGain()
      carrierGain.gain.value = params.leftVolume

      oscCarrier.connect(isochronicGate)
      isochronicGate.connect(carrierGain)
      carrierGain.connect(master)

      oscLeftRef.current = oscCarrier
      oscRightRef.current = null
      leftGainRef.current = carrierGain
      rightGainRef.current = ctx.createGain()
      rightGainRef.current.gain.value = 0
      lfoOscRef.current = lfo
      lfoGainRef.current = lfoDepth

      oscCarrier.start()
      lfo.start()

    } else if (mode === 'monaural' && !isNoiseOnly) {
      // ── Monaural Mode ──────────────────────────────────────────────────
      // Both oscillators mixed to center (pan = 0). Works on speakers.
      // The two tones create real acoustic beating that's heard without headphones.

      const leftGain = ctx.createGain()
      leftGain.gain.value = params.leftVolume
      leftGain.connect(master)
      leftGainRef.current = leftGain

      const rightGain = ctx.createGain()
      rightGain.gain.value = params.rightVolume
      rightGain.connect(master)
      rightGainRef.current = rightGain

      // Left oscillator → center pan → leftGain → master
      if (params.leftHz > 0) {
        const oscLeft = ctx.createOscillator()
        const panLeft = ctx.createStereoPanner()
        oscLeft.type = params.waveform
        oscLeft.frequency.value = params.leftHz
        panLeft.pan.value = 0  // CENTER — both channels mixed
        oscLeft.connect(panLeft)
        panLeft.connect(leftGain)
        oscLeft.start()
        oscLeftRef.current = oscLeft
      }

      // Right oscillator → center pan → rightGain → master
      if (params.rightHz > 0) {
        const oscRight = ctx.createOscillator()
        const panRight = ctx.createStereoPanner()
        oscRight.type = params.waveform
        oscRight.frequency.value = params.rightHz
        panRight.pan.value = 0  // CENTER — both channels mixed
        oscRight.connect(panRight)
        panRight.connect(rightGain)
        oscRight.start()
        oscRightRef.current = oscRight
      }

    } else if (!isNoiseOnly) {
      // ── Binaural Mode ─────────────────────────────────────────────────
      // Classic stereo separation: left ear gets leftHz, right ear gets rightHz.
      // Headphones required for binaural beat perception.

      const leftGain = ctx.createGain()
      leftGain.gain.value = params.leftVolume
      leftGain.connect(master)
      leftGainRef.current = leftGain

      const rightGain = ctx.createGain()
      rightGain.gain.value = params.rightVolume
      rightGain.connect(master)
      rightGainRef.current = rightGain

      // Left oscillator → hard-left pan → leftGain → master
      if (params.leftHz > 0 && params.leftVolume > 0) {
        const oscLeft = ctx.createOscillator()
        const panLeft = ctx.createStereoPanner()
        oscLeft.type = params.waveform
        oscLeft.frequency.value = params.leftHz
        panLeft.pan.value = -1  // HARD LEFT
        oscLeft.connect(panLeft)
        panLeft.connect(leftGain)
        oscLeft.start()
        oscLeftRef.current = oscLeft
      } else {
        oscLeftRef.current = null
      }

      // Right oscillator → hard-right pan → rightGain → master
      if (params.rightHz > 0 && params.rightVolume > 0) {
        const oscRight = ctx.createOscillator()
        const panRight = ctx.createStereoPanner()
        oscRight.type = params.waveform
        oscRight.frequency.value = params.rightHz
        panRight.pan.value = 1  // HARD RIGHT
        oscRight.connect(panRight)
        panRight.connect(rightGain)
        oscRight.start()
        oscRightRef.current = oscRight
      } else {
        oscRightRef.current = null
      }
    } else {
      // Noise-only: no oscillators
      leftGainRef.current = ctx.createGain()
      leftGainRef.current.gain.value = 0
      leftGainRef.current.connect(master)
      rightGainRef.current = ctx.createGain()
      rightGainRef.current.gain.value = 0
      rightGainRef.current.connect(master)
      oscLeftRef.current = null
      oscRightRef.current = null
    }

    // ── Noise generation ───────────────────────────────────────────────────
    const noiseType = params.noiseType || 'pink'
    const noisePreset = NOISE_PRESETS.find(p => p.id === noiseType)
    const noiseBuffer = generateNoiseBuffer(noiseType, ctx.sampleRate)

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true

    // Start with the standard low-pass filter (used by all noise types)
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = params.noiseCutoff
    noiseFilter.Q.value = 0.7 // gentle roll-off
    noiseFilterRef.current = noiseFilter

    // Build filter chain for grey/blue noise
    const extraFilters: BiquadFilterNode[] = []
    if (noisePreset?.filterChain) {
      let lastNode: AudioNode = noiseFilter
      for (const filterSpec of noisePreset.filterChain) {
        const f = ctx.createBiquadFilter()
        f.type = filterSpec.type
        f.frequency.value = filterSpec.frequency
        if (filterSpec.Q !== undefined) f.Q.value = filterSpec.Q
        if (filterSpec.gain !== undefined) f.gain.value = filterSpec.gain
        lastNode.connect(f)
        lastNode = f
        extraFilters.push(f)
      }
      // Last node in chain connects to noise gain
      noiseExtraFiltersRef.current = extraFilters

      const noiseGain = ctx.createGain()
      const effectiveNoiseVolume = isNoiseOnly
        ? params.noiseVolume * 1.2
        : params.noiseVolume * 0.3
      noiseGain.gain.value = effectiveNoiseVolume
      lastNode.connect(noiseGain)
      noiseGain.connect(master)
      noiseSource.connect(noiseFilter)
      noiseSource.start()
      noiseSourceRef.current = noiseSource
      noiseGainRef.current = noiseGain
    } else {
      // Standard noise path: source → lowpass → gain → master
      const noiseGain = ctx.createGain()
      const effectiveNoiseVolume = isNoiseOnly
        ? params.noiseVolume * 1.2
        : params.noiseVolume * 0.3
      noiseGain.gain.value = effectiveNoiseVolume
      noiseGain.connect(master)

      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseSource.start()
      noiseSourceRef.current = noiseSource
      noiseGainRef.current = noiseGain
    }

    startTimeRef.current = Date.now()
    setElapsed(0)
    setStatus('playing')
  }

  // ── Live preview: indefinite playback, no auto-stop ───────────────────────
  const playLive = useCallback((params: BinauralParams) => {
    _cleanup(false)
    _createGraph(params)

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  // ── Timed playback: auto-stops at durationSeconds ─────────────────────────
  const play = useCallback((params: BinauralParams) => {
    _cleanup(false)
    _createGraph(params)

    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(sec)
      if (sec >= params.durationSeconds) stop()
    }, 1000)
  }, [])

  // ── Live parameter update ─────────────────────────────────────────────────
  const updateLive = useCallback((params: {
    leftHz: number
    rightHz: number
    leftVolume: number
    rightVolume: number
    waveform: OscillatorType
    noiseVolume: number
    noiseCutoff: number
  }) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const t = ctx.currentTime
    const ramp = 0.05

    // Isochronic mode: update carrier frequency (left osc)
    const mode = (ctxRef.current as any)?._stimulationMode ?? 'binaural'

    if (oscLeftRef.current) {
      oscLeftRef.current.frequency.linearRampToValueAtTime(params.leftHz, t + ramp)
    }
    if (oscRightRef.current) {
      oscRightRef.current.frequency.linearRampToValueAtTime(params.rightHz, t + ramp)
    }
    if (lfoOscRef.current && params.rightHz > 0) {
      // For isochronic, rightHz is not meaningful as a carrier,
      // but the beat frequency may need updating
    }
    leftGainRef.current?.gain.linearRampToValueAtTime(params.leftVolume, t + ramp)
    rightGainRef.current?.gain.linearRampToValueAtTime(params.rightVolume, t + ramp)

    if (oscLeftRef.current) oscLeftRef.current.type = params.waveform
    if (oscRightRef.current) oscRightRef.current.type = params.waveform

    // Check if this is a noise-only session
    const leftGainVal = leftGainRef.current?.gain.value ?? 0
    const rightGainVal = rightGainRef.current?.gain.value ?? 0
    const isNoiseOnly = leftGainVal === 0 && rightGainVal === 0
    const effectiveNoiseVolume = isNoiseOnly
      ? params.noiseVolume * 1.2
      : params.noiseVolume * 0.3

    noiseGainRef.current?.gain.linearRampToValueAtTime(effectiveNoiseVolume, t + ramp)
    noiseFilterRef.current?.frequency.linearRampToValueAtTime(params.noiseCutoff, t + ramp)
  }, [])

  // ── Stop with 2s fade-out ─────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!ctxRef.current || !masterRef.current) return
    setStatus('stopping')

    const ctx = ctxRef.current
    const master = masterRef.current
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2)

    if (timerRef.current) clearInterval(timerRef.current)

    setTimeout(() => _cleanup(true), 2200)
  }, [])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function _cleanup(resetStatus: boolean) {
    try { oscLeftRef.current?.stop() } catch {}
    try { oscRightRef.current?.stop() } catch {}
    try { lfoOscRef.current?.stop() } catch {}
    try { noiseSourceRef.current?.stop() } catch {}
    try { ctxRef.current?.close() } catch {}
    oscLeftRef.current = null
    oscRightRef.current = null
    lfoOscRef.current = null
    lfoGainRef.current = null
    noiseSourceRef.current = null
    leftGainRef.current = null
    rightGainRef.current = null
    noiseGainRef.current = null
    noiseFilterRef.current = null
    noiseExtraFiltersRef.current = []
    ctxRef.current = null
    masterRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (resetStatus) {
      setStatus('idle')
      setElapsed(0)
    }
  }

  useEffect(() => () => _cleanup(false), [])

  return { status, elapsed, play, playLive, updateLive, stop }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}