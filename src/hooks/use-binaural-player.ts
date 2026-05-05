import { useRef, useState, useEffect, useCallback } from 'react'
import type { BinauralParams } from '@/lib/binaural-presets'

type Status = 'idle' | 'playing' | 'stopping'

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // ── Shared audio graph setup ──────────────────────────────────────────────
  function _createGraph(params: BinauralParams) {
    const ctx = new AudioContext()
    ctxRef.current = ctx

    // Master gain — session fade in over 3s
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, ctx.currentTime)
    master.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 3)
    master.connect(ctx.destination)
    masterRef.current = master

    // Per-ear gain nodes for individual volume control
    const leftGain = ctx.createGain()
    leftGain.gain.value = params.leftVolume
    leftGain.connect(master)
    leftGainRef.current = leftGain

    const rightGain = ctx.createGain()
    rightGain.gain.value = params.rightVolume
    rightGain.connect(master)
    rightGainRef.current = rightGain

    // Left oscillator → hard-left pan → leftGain → master
    const oscLeft = ctx.createOscillator()
    const panLeft = ctx.createStereoPanner()
    oscLeft.type = params.waveform
    oscLeft.frequency.value = params.leftHz
    panLeft.pan.value = -1
    oscLeft.connect(panLeft)
    panLeft.connect(leftGain)
    oscLeftRef.current = oscLeft

    // Right oscillator → hard-right pan → rightGain → master
    const oscRight = ctx.createOscillator()
    const panRight = ctx.createStereoPanner()
    oscRight.type = params.waveform
    oscRight.frequency.value = params.rightHz
    panRight.pan.value = 1
    oscRight.connect(panRight)
    panRight.connect(rightGain)
    oscRightRef.current = oscRight

    // Noise → low-pass filter → noiseGain → master
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = params.noiseCutoff
    noiseFilterRef.current = noiseFilter
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = params.noiseVolume * 0.3
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noiseSource.start()
    noiseSourceRef.current = noiseSource
    noiseGainRef.current = noiseGain

    oscLeft.start()
    oscRight.start()

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

    oscLeftRef.current?.frequency.linearRampToValueAtTime(params.leftHz, t + ramp)
    oscRightRef.current?.frequency.linearRampToValueAtTime(params.rightHz, t + ramp)
    leftGainRef.current?.gain.linearRampToValueAtTime(params.leftVolume, t + ramp)
    rightGainRef.current?.gain.linearRampToValueAtTime(params.rightVolume, t + ramp)

    if (oscLeftRef.current) oscLeftRef.current.type = params.waveform
    if (oscRightRef.current) oscRightRef.current.type = params.waveform

    noiseGainRef.current?.gain.linearRampToValueAtTime(params.noiseVolume * 0.3, t + ramp)
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
    try { noiseSourceRef.current?.stop() } catch {}
    try { ctxRef.current?.close() } catch {}
    oscLeftRef.current = null
    oscRightRef.current = null
    noiseSourceRef.current = null
    leftGainRef.current = null
    rightGainRef.current = null
    noiseGainRef.current = null
    noiseFilterRef.current = null
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
