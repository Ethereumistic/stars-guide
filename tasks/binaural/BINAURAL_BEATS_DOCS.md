# Oracle Binaural Beats — System Architecture

> This document is the source of truth for the binaural beats feature. Give it to an AI agent so it can build on top of this foundation without guessing.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Data Model](#2-data-model)
3. [Audio Engine](#3-audio-engine)
4. [UI Components](#4-ui-components)
5. [Chat Serialization](#5-chat-serialization)
6. [Current User Flow](#6-current-user-flow)
7. [Known Bugs](#7-known-bugs)
8. [Planned: AI-Generated Beats](#8-planned-ai-generated-beats)

---

## 1. Feature Overview

Binaural beats are an audio technique where two slightly different frequencies are played into each ear via headphones. The brain perceives a third "beat" frequency equal to the difference between the two tones, which can entrain brainwaves toward specific mental states (sleep, meditation, focus, etc.).

### How it works in this app

- **Purely client-side** — no server, no Worker, no network requests. Uses the Web Audio API's `OscillatorNode` (hardware-accelerated).
- **Two oscillators** — left ear gets one frequency, right ear gets another. Panned hard left/right via `StereoPannerNode`.
- **Ambient noise layer** — white noise through a low-pass filter to add texture. Cutoff frequency controls tone (brown → pink → white).
- **Per-ear volume** — independent gain nodes for each ear. Users can isolate or balance channels.
- **Live parameter tuning** — all sliders update the running audio graph in real-time via 50ms frequency/gain ramps.
- **Chat persistence** — beat parameters are serialized as a tagged JSON string in chat messages. History cards can replay exact parameters.
- **No AI involved yet** — presets are hand-tuned. See §8 for the planned AI integration.

---

## 2. Data Model

### `BinauralParams` (runtime, all files)

```typescript
// src/lib/binaural-presets.ts

interface BinauralParams {
  leftHz: number           // Left ear frequency, 20–1000 Hz
  rightHz: number          // Right ear frequency, 20–1000 Hz
  leftVolume: number       // Left ear volume, 0.0–1.0
  rightVolume: number      // Right ear volume, 0.0–1.0
  waveform: OscillatorType // 'sine' | 'triangle' (only these two — others are unusable)
  noiseVolume: number      // Ambient noise volume, 0.0–0.5
  noiseCutoff: number      // Noise low-pass filter, 100–3000 Hz
  durationSeconds: number  // Session length for saved beats
  presetId: string         // BRAIN_STATE_PRESETS id or 'custom'
}
```

### `BinauralBeatParams` (persisted to chat)

```typescript
interface BinauralBeatParams extends BinauralParams {
  version: 2               // Schema version for migrations
  generatedAt: string      // ISO timestamp
}
```

### Presets

Each preset is a full snapshot of all parameters:

| Preset | leftHz | rightHz | Beat | Waveform | Noise Vol | Noise Cut | Duration |
|---|---|---|---|---|---|---|---|
| Deep Sleep | 100 | 101.5 | 1.5 Hz Delta | sine | 5% | 300 Hz | 60m |
| Deep Meditation | 150 | 155 | 5.0 Hz Theta | sine | 10% | 500 Hz | 30m |
| Relaxed Focus | 200 | 210 | 10.0 Hz Alpha | sine | 15% | 800 Hz | 15m |
| Concentration | 250 | 268 | 18.0 Hz Beta | triangle | 10% | 1000 Hz | 30m |
| Peak Performance | 300 | 340 | 40.0 Hz Gamma | sine | 20% | 1400 Hz | 20m |

### Brain state bands (derived from beat frequency)

The beat frequency `|rightHz - leftHz|` maps to a brain state, displayed with color coding:

| Band | Range | Color | State |
|---|---|---|---|
| Delta | 0–4 Hz | indigo | Deep Sleep |
| Theta | 4–8 Hz | violet | Deep Meditation |
| Alpha | 8–13 Hz | cyan | Relaxed Focus |
| Beta | 13–30 Hz | amber | Concentration |
| Gamma | 30–50 Hz | rose | Peak Performance |

---

## 3. Audio Engine

### File: `src/hooks/use-binaural-player.ts`

### Audio graph

```
┌─────────────────┐     ┌──────────┐     ┌────────────┐
│  oscLeft (Hz)   │────▶│ panLeft  │────▶│            │
│  type: waveform │     │ pan: -1  │     │  leftGain  │──┐
└─────────────────┘     └──────────┘     │  (volume)  │  │
                                          └────────────┘  │
┌─────────────────┐     ┌──────────┐     ┌────────────┐  │    ┌─────────┐    ┌────────────┐
│  oscRight (Hz)  │────▶│ panRight │────▶│            │  ├───▶│ master  │───▶│ destination│
│  type: waveform │     │ pan: +1  │     │ rightGain  │  │    │ (fade)  │    └────────────┘
└─────────────────┘     └──────────┘     │  (volume)  │  │    └─────────┘
                                          └────────────┘  │
┌─────────────────┐     ┌──────────┐     ┌────────────┐  │
│  noiseSource    │────▶│ noiseFilt│────▶│            │  │
│  (white noise)  │     │ lowpass  │     │ noiseGain  │──┘
│  loop: true     │     │ cutoff   │     │ (volume)   │
└─────────────────┘     └──────────┘     └────────────┘
```

### API

| Method | Purpose | Auto-stop? |
|---|---|---|
| `playLive(params)` | Start indefinite playback for tuning | No |
| `play(params)` | Start timed playback (history card replay) | Yes, at `durationSeconds` |
| `updateLive(params)` | Smoothly ramp all parameters on running graph | — |
| `stop()` | 2s fade-out then cleanup | — |

### Smooth ramps

All frequency and volume changes use `linearRampToValueAtTime` with a 50ms ramp time. Waveform type changes are instant (`osc.type = ...`). This prevents audible clicks/pops.

### Fade behavior

- **Fade in**: Master gain ramps 0.001 → 1.0 over 3 seconds on play
- **Fade out**: Master gain ramps current → 0.001 over 2 seconds on stop/auto-stop
- After fade-out completes (2.2s timeout), all nodes are stopped and AudioContext is closed

---

## 4. UI Components

### `BinauralBeatsCard` — Main control panel

**File:** `src/components/oracle/input/binaural-beats-card.tsx`

**Props:**
```typescript
{
  onDismiss: () => void
  onGenerate?: (params: BinauralBeatParams) => void
}
```

**Single unified view** — no separate "playing" state. All controls always visible. When playing, a compact visualizer appears at the top.

**Controls layout (top to bottom):**
1. Header with close button
2. Playing indicator (visualizer bars + beat info + elapsed) — only when playing
3. Beat indicator (beat Hz + brain state band) — only when idle
4. Preset pills (5 brain states)
5. Left ear — Hz slider (20–1000) + volume slider (0–100%)
6. Right ear — Hz slider (20–1000) + volume slider (0–100%)
7. Waveform toggle — Sine | Triangle
8. Ambient — volume slider (0–50%) + tone/cutoff slider (100–3000 Hz)
9. Duration — 15m | 30m | 60m
10. Action buttons — Play/Stop toggle + Save to Chat

**Live tuning:** Every slider calls `updateLive()` when audio is playing. Presets call `updateLive()` with all parameters at once.

### `BinauralBeatHistoryCard` — Chat history replay

**File:** `src/components/oracle/input/binaural-beat-history-card.tsx`

**Props:**
```typescript
{
  params: BinauralBeatParams
}
```

Compact inline card that renders inside chat messages. Uses `play()` (timed playback with auto-stop). Each history card has its own independent `useBinauralPlayer()` instance.

### Where components are mounted

- **`BinauralBeatsCard`** — inside `OracleInput` component, shown when `featureKey === "binaural_beats"`
- **`BinauralBeatHistoryCard`** — inside `oracle/chat/[sessionId]/page.tsx`, rendered for messages where `isBeatMessage(msg.content) === true`

---

## 5. Chat Serialization

### Format

Beat parameters are stored as a user message with a tagged JSON payload:

```
[BINAURAL_BEAT]{"version":2,"leftHz":200,"rightHz":210,...}[/BINAURAL_BEAT]
```

### Serialization helpers (`src/lib/binaural-presets.ts`)

| Function | Purpose |
|---|---|
| `serializeBeat(params)` | Wraps params in `[BINAURAL_BEAT]...[/BINAURAL_BEAT]` tags |
| `parseBeat(content)` | Extracts and parses; handles V1→V2 migration |
| `isBeatMessage(content)` | Quick check: does the string contain `[BINAURAL_BEAT]`? |

### Version migration

`parseBeat` handles two versions:

**V1 (legacy):** Had `carrierHz` + `beatHz`. Migrated to V2 as:
- `leftHz = carrierHz`
- `rightHz = carrierHz + beatHz`
- `noiseVolume = pinkNoiseVolume`
- `leftVolume` and `rightVolume` default to `1`

**V2 (current):** Has `leftHz` + `rightHz` + `leftVolume` + `rightVolume`. Fields `leftVolume`/`rightVolume` are backfilled to `1` if missing from older V2 messages.

### Important: Beat messages do NOT trigger Oracle AI

In `oracle/chat/[sessionId]/page.tsx`, `handleBinauralGenerate` calls `addMessageMutation` with the serialized beat, but does NOT call `invokeOracle`. Beat messages are metadata, not questions.

---

## 6. Current User Flow

### Starting a beat session (existing chat)

1. User clicks `+` button on the Oracle input bar
2. Selects "Binaural Beats" from the dropdown menu
3. `OracleInput` sets `featureKey = "binaural_beats"` via `onFeatureSelect`
4. `BinauralBeatsCard` appears above the input bar
5. User adjusts parameters (or picks a preset)
6. User clicks **Play** → `playLive()` starts audio
7. User tweaks sliders → `updateLive()` adjusts audio in real-time
8. User clicks **Stop** → 2s fade-out
9. User clicks **Save to Chat** → `onGenerate` fires → parent saves to chat as user message

### Replaying a saved beat (history card)

1. In the chat, `isBeatMessage(msg.content)` detects a beat message
2. `parseBeat(msg.content)` extracts params
3. `BinauralBeatHistoryCard` renders with a Play button
4. User clicks Play → `play(params)` starts timed playback
5. Auto-stops at `durationSeconds` with fade-out

---

## 7. Known Bugs

### Bug 1: Cannot select Binaural Beats on the "New Session" page

**Symptom:** On `/oracle/new`, clicking the `+` menu and selecting "Binaural Beats" sets the feature key, which shows the `BinauralBeatsCard` — but the card's "Save to Chat" calls `onBinauralGenerate`, which is **never passed** to `OracleInput` on the new session page.

**Root cause:** Look at `/oracle/new/page.tsx`:

```tsx
<OracleInput
  // ... props ...
  onFeatureSelect={handleFeatureSelect}
  onFeatureClear={clearSelectedFeature}
  // ❌ Missing: onBinauralGenerate
/>
```

The `OracleInput` component accepts `onBinauralGenerate?: (params) => void`, but the new session page never passes it. So when the card calls `onGenerate?.(beatParams)`, it's a no-op.

**Fix needed:**
1. On `/oracle/new`, when `onBinauralGenerate` fires:
   - Create a new session with `featureKey: "binaural_beats"` and `questionText` set to the serialized beat message
   - Navigate to the new session's chat page
   - Do NOT invoke Oracle AI
2. Pass `onBinauralGenerate` to `OracleInput` in the new page

### Bug 2: Cannot save a beat to a session that doesn't exist yet

**Symptom:** Same as Bug 1 — the new session page has no session ID, so there's nowhere to save.

**Fix needed:** Same as Bug 1 — create the session first, then add the beat message.

### Bug 3: The `+` menu shows "Binaural Beats" as disabled in some states

**Symptom:** If there's a race condition on the quota query or consent query, the feature may appear briefly disabled.

**Root cause:** `isFeatureDisabled` in `OracleInput` returns `true` while `consent` is `undefined` (loading). The binaural_beats feature doesn't require journal consent, but the loading state of the consent query can cause a flash of disabled state.

**Fix needed:** Make the disabled check skip the consent loading gate for features that don't require consent:

```typescript
function isFeatureDisabled(feat): boolean {
  if (!feat.implemented) return true
  if (feat.requiresJournalConsent) {
    if (consent === undefined) return true // still loading
    // ...
  }
  return false
}
```

This logic is already correct in the code, but the `consent` query loading may still cause the entire dropdown to feel sluggish. Consider making the consent query non-blocking for non-consent features.

### Bug 4: Waveform CSS animation overflow

The `.binaural-bar` animation scales bars from 2px to 16px. If the container has `overflow: hidden`, bars may clip. The current container uses `h-4` (16px) which matches the animation peak, so this should be fine — but verify on all browsers.

---

## 8. Planned: AI-Generated Beats

### Goal

Allow the Oracle AI to generate binaural beats that are **personalized to the user's birth chart data**. The user asks something like "Generate a meditation beat for my moon sign" and the Oracle AI outputs a structured formula that the sound synthesizer interprets into exact audio parameters.

### Architecture

```
User asks Oracle AI
  → Oracle AI outputs structured [BINAURAL_PRESCRIPTION] block
  → Frontend parses block
  → Renders as BinauralBeatHistoryCard (or inline prescription card)
  → User clicks Play to hear the AI-generated beat
```

### Proposed AI Output Format

The Oracle AI would output a tagged block similar to the existing `[BINAURAL_BEAT]` format, but with additional astrological context:

```
[BINAURAL_PRESCRIPTION]
{
  "version": 2,
  "leftHz": 174,
  "rightHz": 184,
  "leftVolume": 1,
  "rightVolume": 0.8,
  "waveform": "sine",
  "noiseVolume": 0.12,
  "noiseCutoff": 600,
  "durationSeconds": 1800,
  "presetId": "ai_generated",
  "generatedAt": "2025-01-01T00:00:00Z",
  "rationale": {
    "sign": "Pisces",
    "element": "Water",
    "intent": "Deep meditation aligned with lunar placement",
    "beatBand": "Theta"
  }
}
[/BINAURAL_PRESCRIPTION]
```

### What needs to be built

#### 1. Prompt injection for the Oracle AI

Add a directive to the Oracle system prompt (in `promptBuilder.ts`) when `binaural_beats` feature is active:

```
[BINAURAL PRESCRIPTION MODE]
When the user asks you to generate a binaural beat, output a [BINAURAL_PRESCRIPTION] block
with the following JSON structure. Choose frequencies based on:
- The user's birth chart (sun/moon/rising signs, elements, modalities)
- The user's stated intent (sleep, focus, meditation, etc.)
- Classical frequency associations (174 Hz solfeggio, 432 Hz, etc.)

Frequency guidelines:
- leftHz: 20–1000 Hz (base frequency)
- rightHz: leftHz + beat Hz (the difference creates the binaural beat)
- Beat frequency targets: Delta 0.5–4 Hz (sleep), Theta 4–8 Hz (meditation),
  Alpha 8–13 Hz (relaxation), Beta 13–30 Hz (focus), Gamma 30–50 Hz (peak)
- waveform: "sine" (pure) or "triangle" (warmer)
- noiseVolume: 0–0.5 (ambient texture)
- noiseCutoff: 100–3000 Hz (brown noise at 100–300, pink at 500–1000, white at 1500+)

Also include a "rationale" object explaining why you chose these frequencies
in relation to the user's astrological profile.
[END BINAURAL PRESCRIPTION MODE]
```

#### 2. Frontend parsing

Add to `src/lib/binaural-presets.ts`:

```typescript
export function isPrescriptionMessage(content: string): boolean {
  return content.includes('[BINAURAL_PRESCRIPTION]')
}

export function parsePrescription(content: string): BinauralBeatParams & { rationale?: ... } | null {
  // Parse [BINAURAL_PRESCRIPTION]...[/BINAURAL_PRESCRIPTION] blocks
  // from AI assistant messages
}
```

#### 3. Rendering in chat

In `oracle/chat/[sessionId]/page.tsx`, check assistant messages for `[BINAURAL_PRESCRIPTION]` blocks:

```typescript
// In the message render loop:
if (msg.role === "assistant" && isPrescriptionMessage(msg.content)) {
  const prescription = parsePrescription(msg.content)
  const cleanContent = stripPrescriptionFromContent(msg.content)
  return (
    <>
      {/* Render the text portion normally */}
      <AssistantMessageContent content={cleanContent} isStreamingThis={isStreamingThis} />
      {/* Render the prescription as a playable card */}
      {prescription && <BinauralBeatHistoryCard params={prescription} />}
    </>
  )
}
```

#### 4. Feature activation flow

Two paths for AI-generated beats:

**Path A — Explicit feature selection:**
User selects "Binaural Beats" from the `+` menu, types a prompt like "Create a beat for my chart", Oracle AI responds with a prescription.

**Path B — Natural language intent (like birth chart):**
User types "Generate a meditation beat tied to my moon sign" in a normal conversation. The intent classifier (`classifyOracleToolIntent` in `features.ts`) detects binaural intent and auto-activates the feature. Add binaural intent patterns:

```typescript
const BINAURAL_INTENT_PATTERNS: RegExp[] = [
  /\b(generate|create|make)\s+(a\s+)?(binaural\s+)?beat/i,
  /\bfrequency\s+(for|tuned|aligned)\b/i,
  /\b(sleep|meditation|focus)\s+(frequency|beat|tone)\b/i,
  /\bbinaural\b.*\b(my\s+)?(chart|sign|birth)\b/i,
]
```

#### 5. Astrological frequency mapping (reference for prompt)

The Oracle AI needs a frequency mapping framework. This is soft knowledge that goes into the prompt injection — not hardcoded rules:

| Astrological factor | Frequency tendency |
|---|---|
| Fire signs (Aries, Leo, Sagittarius) | Higher carrier (300–500 Hz), Beta/Gamma beats |
| Earth signs (Taurus, Virgo, Capricorn) | Lower carrier (80–200 Hz), Delta/Alpha beats |
| Air signs (Gemini, Libra, Aquarius) | Mid carrier (200–350 Hz), Alpha/Beta beats |
| Water signs (Cancer, Scorpio, Pisces) | Low-mid carrier (100–250 Hz), Theta/Alpha beats |
| Moon sign | Strongest influence on emotional/meditative beats |
| Sun sign | General energy and carrier frequency baseline |
| Rising sign | Modulates the "attack" — triangle vs sine preference |

---

## File Map

```
src/
├── lib/
│   └── binaural-presets.ts          # Types, presets, serialization, parsing
├── hooks/
│   └── use-binaural-player.ts       # Web Audio engine (play, playLive, updateLive, stop)
├── components/oracle/input/
│   ├── binaural-beats-card.tsx       # Main control panel (tuning + save)
│   └── binaural-beat-history-card.tsx # Compact replay card for chat
├── components/oracle/input/
│   └── oracle-input.tsx             # Mounts BinauralBeatsCard when feature active
├── app/oracle/
│   ├── new/page.tsx                 # ⚠️ BUG: missing onBinauralGenerate prop
│   └── chat/[sessionId]/page.tsx    # Renders history cards, handles save
└── app/globals.css                  # .binaural-bar animation keyframes

lib/oracle/
├── promptBuilder.ts                 # System prompt assembly (needs prescription injection)
└── features.ts                      # Feature definitions + intent classifier
```
