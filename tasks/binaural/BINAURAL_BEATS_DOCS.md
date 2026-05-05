# Oracle Binaural Beats — System Architecture

> This document is the source of truth for the binaural beats feature. Give it to an AI agent so it can build on top of this foundation without guessing.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Data Model](#2-data-model)
3. [Audio Engine](#3-audio-engine)
4. [AI-Generated Beats: Deterministic Pipeline](#4-ai-generated-beats-deterministic-pipeline)
5. [UI Components](#5-ui-components)
6. [Chat Persistence](#6-chat-persistence)
7. [End-to-End Flow](#7-end-to-end-flow)
8. [Known Bugs](#8-known-bugs)
9. [File Map](#9-file-map)

---

## 1. Feature Overview

Binaural beats are an audio technique where two slightly different frequencies are played into each ear via headphones. The brain perceives a third "beat" frequency equal to the difference between the two tones, which can entrain brainwaves toward specific mental states (sleep, meditation, focus, etc.).

### Two ways beats are created

1. **Manual presets** — User picks a preset or tunes sliders in the `BinauralBeatsCard`, then saves to chat. Purely client-side, no AI involved. Parameters are serialized as a tagged JSON string in a user message (`[BINAURAL_BEAT]...[/BINAURAL_BEAT]`).

2. **AI-generated beats** — User asks the Oracle in natural language ("generate a meditation beat for me"). The system **deterministically generates** beat parameters from code (not from the LLM), injects them as context data into the system prompt, and the LLM simply explains what was generated. Parameters are stored as a `binauralParams` field on the assistant message in Convex — **not** embedded in the LLM's text output.

### Why deterministic, not LLM-generated?

The LLM cannot "generate audio." Asking it to output structured frequency JSON resulted in refusals ("I cannot generate audio files"). The deterministic approach mirrors the birth chart pattern: code generates data, the LLM reads data and writes text about it. The LLM cannot refuse to "read data."

### Audio playback

- **Purely client-side** — no server, no Worker, no network requests. Uses the Web Audio API's `OscillatorNode` (hardware-accelerated).
- **Two oscillators** — left ear gets one frequency, right ear gets another. Panned hard left/right via `StereoPannerNode`.
- **Ambient noise layer** — white noise through a low-pass filter to add texture. Cutoff frequency controls tone (brown → pink → white).
- **Per-ear volume** — independent gain nodes for each ear.
- **Live parameter tuning** — all sliders update the running audio graph in real-time via 50ms frequency/gain ramps.

---

## 2. Data Model

### `BinauralParams` (runtime)

```typescript
// src/lib/binaural-presets.ts

interface BinauralParams {
  leftHz: number           // Left ear frequency (Hz)
  rightHz: number          // Right ear frequency (Hz)
  leftVolume: number       // 0.0 – 1.0
  rightVolume: number      // 0.0 – 1.0
  waveform: OscillatorType // 'sine' | 'triangle' (only these two — others are unusable)
  noiseVolume: number      // 0.0 – 0.5
  noiseCutoff: number      // 100 – 3000 Hz (low-pass filter on noise)
  durationSeconds: number  // Session length
  presetId: string         // BRAIN_STATE_PRESETS id, 'custom', or 'ai_generated'
}
```

### `BinauralBeatParams` (persisted to chat / Convex)

```typescript
interface BinauralBeatParams extends BinauralParams {
  version: 2               // Schema version for migrations
  generatedAt: string      // ISO timestamp
}
```

### `BinauralRationale` (metadata attached to AI-generated beats)

```typescript
interface BinauralRationale {
  intent: string           // First 100 chars of the user's request
  beatBand: string         // "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma"
  beatHz: number           // Actual beat frequency |rightHz - leftHz|
  personalization: string | null  // Birth chart personalization text, or null
}
```

### Convex schema

The `oracle_messages` table has a `binauralParams` optional field:

```typescript
// convex/schema.ts — oracle_messages table
binauralParams: v.optional(v.any())  // BinauralBeatParams & { rationale?: BinauralRationale }
```

This field is only present on assistant messages where a binaural beat was generated. It is **never** embedded in the message `content` string — it's a separate metadata field.

### Hand-tuned presets

| Preset | leftHz | rightHz | Beat | Waveform | Noise Vol | Noise Cut | Duration |
|---|---|---|---|---|---|---|---|
| Deep Sleep | 100 | 101.5 | 1.5 Hz Delta | sine | 5% | 300 Hz | 60m |
| Deep Meditation | 150 | 155 | 5.0 Hz Theta | sine | 10% | 500 Hz | 30m |
| Relaxed Focus | 200 | 210 | 10.0 Hz Alpha | sine | 15% | 800 Hz | 15m |
| Concentration | 250 | 268 | 18.0 Hz Beta | triangle | 10% | 1000 Hz | 30m |
| Peak Performance | 300 | 340 | 40.0 Hz Gamma | sine | 20% | 1400 Hz | 20m |

### Brain state bands (derived from beat frequency)

The beat frequency `|rightHz - leftHz|` maps to a brain state:

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

## 4. AI-Generated Beats: Deterministic Pipeline

This is the core of the AI beat system. The LLM never generates frequency parameters. Code does.

### 4.1 Pipeline Overview

```
User types: "make me a sleep beat"
       │
       ├─ 1. classifyOracleToolIntent() in features.ts
       │     Regex match → { featureKey: "binaural_beats" }
       │     Session feature key is set to "binaural_beats"
       │
       ├─ 2. In invokeOracle (convex/oracle/llm.ts):
       │     activeFeature.key === "binaural_beats"
       │     → generateBinauralBeat(userQuestion, user.birthData)
       │     → returns BinauralBeatParams & { rationale: BinauralRationale }
       │
       ├─ 3. Context injection into system prompt:
       │     getBinauralBeatContext(beat) produces a [BINAURAL BEAT CONTEXT] block
       │     containing the generated parameters as DATA (not instructions to output JSON)
       │
       ├─ 4. LLM responds with natural text explanation
       │     "I've crafted a deep sleep beat for you..."
       │     (The LLM CANNOT refuse — it's just reading data and explaining it)
       │
       ├─ 5. After LLM call completes:
       │     patchMessageBinauralParams stores beat params on the
       │     assistant message's binauralParams field in Convex
       │
       └─ 6. Frontend reads msg.binauralParams from Convex query
             Renders BinauralBeatHistoryCard from metadata
             (No regex parsing of content, no JSON stripping)
```

### 4.2 Intent Classification

**File:** `src/lib/oracle/features.ts`

The regex-based `classifyOracleToolIntent()` function checks the user's message. Binaural patterns (`BINAURAL_INTENT_PATTERNS`) are checked after journal recall and birth chart patterns. These patterns match:

- Explicit generation requests: "generate me a beat", "create a sound for"
- Binaural keywords: "binaural beats for", "frequency tuned to"
- Intent + frequency combos: "sleep frequency", "meditation beat"
- Astrological crossovers: "binaural beat for my chart", "frequency aligned to my moon"
- Sound healing: "sound healing", "solfeggio", "healing frequency"

If matched, the session's `featureKey` is set to `"binaural_beats"`. On subsequent messages in the same session, the feature is already active and re-classification is skipped.

### 4.3 Sub-Intent Extraction

**File:** `src/lib/binaural-presets.ts` — `extractBinauralIntent()`

Once we know the user wants a binaural beat, we determine **what kind** (sleep, focus, meditation, etc.) via keyword matching:

| Sub-intent | Keywords (regex patterns) |
|---|---|
| healing | heal, recover, repair, restor, pain |
| sleep | sleep, insomnia, dream, rest, zzz |
| meditation | meditat, zen, mindful, spiritual, inner peace |
| relaxation | relax, calm, stress, anxious, chill, unwind |
| creativity | creativ, inspir, flow state, artist, imagin |
| study | study, exam, learn, memor, retain |
| focus | focus, concentrat, productiv, adhd, work |
| peak_performance | peak, gamma, cognit, performan, sharp, brain power |

**Priority order** (first match wins): `healing > sleep > meditation > relaxation > creativity > study > focus > peak_performance`. Healing/sleep are most specific; peak_performance is most general.

**Default**: If no keywords match, defaults to `"meditation"` (the most common binaural use case and safest default).

### 4.4 Intent → Frequency Profiles

Each sub-intent maps to a deterministic `BeatProfile`:

| Intent | leftHz | rightHz | Beat Hz | Band | Waveform | Noise Vol | Noise Cut | Duration |
|---|---|---|---|---|---|---|---|---|
| sleep | 100 | 103 | 3 Hz | Delta | sine | 0.15 | 300 | 60m |
| meditation | 150 | 155 | 5 Hz | Theta | sine | 0.10 | 500 | 30m |
| relaxation | 200 | 210 | 10 Hz | Alpha | sine | 0.08 | 800 | 20m |
| focus | 250 | 264 | 14 Hz | Beta | triangle | 0.10 | 1000 | 30m |
| peak_performance | 320 | 350 | 30 Hz | Gamma | sine | 0.12 | 1500 | 20m |
| study | 230 | 243 | 13 Hz | Beta | triangle | 0.10 | 1000 | 30m |
| creativity | 180 | 186 | 6 Hz | Theta | sine | 0.08 | 600 | 30m |
| healing | 120 | 124 | 4 Hz | Theta | sine | 0.15 | 400 | 40m |

### 4.5 Birth Chart Personalization

When the user has birth data on file, the carrier frequencies are adjusted based on their dominant element (Sun + Moon + Rising):

| Element | Carrier Offset | Reasoning |
|---|---|---|
| Fire (Aries, Leo, Sagittarius) | +50 Hz | Higher, energizing carriers |
| Earth (Taurus, Virgo, Capricorn) | -30 Hz | Lower, grounding carriers |
| Air (Gemini, Libra, Aquarius) | +20 Hz | Mid-range, mentally stimulating |
| Water (Cancer, Scorpio, Pisces) | -20 Hz | Low-mid, emotionally flowing |

The offset is applied to both `leftHz` and `rightHz` equally (preserving the beat frequency), then clamped to the 40–600 Hz safe range.

**How the dominant element is determined:** The code collects elements from Sun, Moon, and Ascendant placements (supporting both legacy `placements[]` format and v2 `chart.planets[]` format), then picks the most common element (statistical mode).

### 4.6 Duration Extraction

The user's message is scanned for duration hints:

| Pattern | Duration |
|---|---|
| "20 minutes", "30 min" | Captured number × 60 seconds |
| "1 hr", "2 hours" | Captured number × 3600 seconds |
| "short", "quick", "brief" | 900s (15 min) |
| "long", "extended", "deep" | 3600s (60 min) |
| "standard", "normal", "regular" | 1800s (30 min) |
| No match | Uses the profile's default duration |

All durations are clamped to 300–7200 seconds (5 min – 2 hours).

### 4.7 Safety Clamps

All output parameters are hard-clamped regardless of input:

| Parameter | Min | Max |
|---|---|---|
| leftHz, rightHz | 40 | 600 |
| noiseVolume | 0 | 0.5 |
| noiseCutoff | 100 | 3000 |
| durationSeconds | 300 | 7200 |
| Beat frequency (`|rightHz - leftHz|`) | — | 40 |

If the beat frequency exceeds 40 Hz after carrier offset adjustments, `rightHz` is moved closer to `leftHz` to cap the beat at 40 Hz.

### 4.8 System Prompt Injection

**File:** `src/lib/oracle/featureContext.ts` — `getBinauralBeatContext()`

The generated parameters are injected into the system prompt as a `[BINAURAL BEAT CONTEXT]` block:

```
[BINAURAL BEAT CONTEXT]
A binaural beat session has been generated for the user. Integrate this naturally
into your response — explain what the beat does, why these frequencies were chosen,
and how it relates to their request. You do NOT need to repeat exact Hz values;
the user will see a playable card with full details. Do NOT output any JSON or
prescription blocks.

Intent: make me a sleep beat
Band: Delta (3 Hz beat frequency)
Carrier: 100 Hz (left) / 103 Hz (right)
Waveform: sine
Noise: 0.15 volume, 300 Hz cutoff
Duration: 60 minutes
Tuned for your water-dominant chart placements — water energy responds well to Delta frequencies.
[END BINAURAL BEAT CONTEXT]
```

This is **data context**, not instructions to produce structured output. The LLM reads it the same way it reads birth chart data — as context to reason about. It naturally produces explanatory text about the beat. It cannot refuse.

### 4.9 Message Storage

After the LLM call completes, the beat parameters are stored on the assistant message in Convex:

```
// Convex oracle_messages document:
{
  role: "assistant",
  content: "I've crafted a deep sleep beat for you, calibrated to your Cancer Moon's need for emotional safety...",
  binauralParams: {              // ← separate field, NOT in content
    version: 2,
    leftHz: 100,
    rightHz: 103,
    waveform: "sine",
    noiseVolume: 0.15,
    noiseCutoff: 300,
    durationSeconds: 3600,
    presetId: "ai_generated",
    generatedAt: "2025-01-01T00:00:00Z",
    rationale: {
      intent: "make me a sleep beat",
      beatBand: "Delta",
      beatHz: 3,
      personalization: "Tuned for your water-dominant chart placements..."
    }
  }
}
```

The mutation `patchMessageBinauralParams` (in `convex/oracle/sessions.ts`) patches this field onto the message after the LLM call succeeds and timing metrics are stored.

---

## 5. UI Components

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

Displays:
- Beat label (preset name or "AI Beat" + AI badge for `presetId === "ai_generated"`)
- Brain state band with color
- Frequencies, beat Hz, duration
- Play/Stop button

### Where components are mounted

- **`BinauralBeatsCard`** — inside `OracleInput` component, shown when `featureKey === "binaural_beats"`
- **`BinauralBeatHistoryCard`** — inside `oracle/chat/[sessionId]/page.tsx`, rendered for:
  - **User messages** where `isBeatMessage(msg.content) === true` (manual preset saves)
  - **Assistant messages** where `msg.binauralParams` is defined (AI-generated beats)

---

## 6. Chat Persistence

There are two distinct persistence mechanisms for binaural beats:

### 6.1 Manual presets — `[BINAURAL_BEAT]` tags in user messages

When the user manually creates a beat and clicks "Save to Chat", the parameters are serialized as a tagged JSON string in a **user** message:

```
[BINAURAL_BEAT]{"version":2,"leftHz":200,"rightHz":210,...}[/BINAURAL_BEAT]
```

**Serialization helpers** (`src/lib/binaural-presets.ts`):

| Function | Purpose |
|---|---|
| `serializeBeat(params)` | Wraps params in `[BINAURAL_BEAT]...[/BINAURAL_BEAT]` tags |
| `parseBeat(content)` | Extracts and parses; handles V1→V2 migration |
| `isBeatMessage(content)` | Quick check: does the string contain `[BINAURAL_BEAT]`? |

**Important:** Manual beat messages do NOT trigger the Oracle AI. In the chat page, `handleBinauralGenerate` calls `addMessageMutation` but does NOT call `invokeOracle`.

**Version migration:** `parseBeat` handles two versions:
- **V1 (legacy):** Had `carrierHz` + `beatHz`. Migrated to V2.
- **V2 (current):** Has `leftHz` + `rightHz` + `leftVolume` + `rightVolume`. Fields backfilled to `1` if missing.

### 6.2 AI-generated beats — `binauralParams` field on assistant messages

When the Oracle AI generates a beat, parameters are stored as a **separate metadata field** on the assistant message in Convex:

```
// The assistant message document in oracle_messages table:
{
  _id: "...',
  sessionId: "...",
  role: "assistant",
  content: "I've crafted a deep sleep beat...",    // ← LLM's natural text
  binauralParams: { ... },                          // ← deterministic params (not in content)
  modelUsed: "...",
  // ... other fields
}
```

The frontend reads `msg.binauralParams` directly from the Convex query result. No regex parsing, no content stripping, no risk of malformed JSON.

---

## 7. End-to-End Flow

### Flow A: User asks Oracle for a beat (AI-generated)

```
1. User types "make me a sleep beat" and sends
2. Chat page: addMessageMutation → saves user message to Convex
3. Chat page: invokeOracle action → calls convex/oracle/llm.ts
4. invokeOracle:
   a. classifyOracleToolIntent("make me a sleep beat", ...)
      → matches BINAURAL_INTENT_PATTERNS
      → sets session.featureKey = "binaural_beats"
   b. activeFeature.key === "binaural_beats"
      → generateBinauralBeat("make me a sleep beat", user.birthData)
        - extractBinauralIntent("make me a sleep beat") → "sleep"
        - INTENT_PROFILES["sleep"] → { leftHz: 100, rightHz: 103, ... }
        - Birth chart personalization (if birth data exists)
        - Duration extraction from message
        - Safety clamps applied
      → returns { version: 2, leftHz: 100, rightHz: 103, ..., rationale: {...} }
      → binauralParams = beat
   c. featureInjection = getBinauralBeatContext(beat)
      → produces [BINAURAL BEAT CONTEXT] block with generated params
   d. buildPrompt() → system prompt includes the [BINAURAL BEAT CONTEXT] block
   e. callProviderStreaming() → sends to LLM
   f. LLM responds with natural text explanation (no JSON, no prescriptions)
   g. patchMessageBinauralParams() → stores beat on assistant message
5. Chat page: Convex query reactively updates
   - msg.binauralParams is defined → renders BinauralBeatHistoryCard
   - msg.content → renders as markdown text
6. User sees Oracle's explanation + playable beat card
```

### Flow B: User manually creates a beat (preset/tuned)

```
1. User clicks + menu → selects "Binaural Beats"
2. BinauralBeatsCard appears above input
3. User picks preset or tunes sliders, clicks Play to preview
4. User clicks "Save to Chat"
5. handleBinauralGenerate fires:
   - serializeBeat(params) → "[BINAURAL_BEAT]{...}[/BINAURAL_BEAT]"
   - addMessageMutation → saves as user message
   - Does NOT call invokeOracle (beat messages are metadata, not questions)
6. Chat renders: isBeatMessage(msg.content) → parseBeat → BinauralBeatHistoryCard
```

### Flow C: User asks follow-up in a binaural session

```
1. Session already has featureKey = "binaural_beats" (set during Flow A)
2. User types "make it longer and more calming"
3. invokeOracle:
   a. activeFeature is already set (no re-classification needed)
   b. generateBinauralBeat("make it longer and more calming", user.birthData)
      - extractBinauralIntent → "relaxation" (matches "calming")
      - extractDuration → "longer" matches /\blong\b/ → 3600s
      - New beat generated with different profile
   c. New binauralParams stored on the new assistant message
4. Frontend renders the new beat card
```

---

## 8. Known Bugs

### Bug 1: Cannot save a manual beat on the "New Session" page

**Symptom:** On `/oracle/new`, clicking `+` → "Binaural Beats" → "Save to Chat" does nothing.

**Root cause:** The new session page's `OracleInput` is never passed the `onBinauralGenerate` prop, so the callback is a no-op.

**Fix needed:** Create the session first, then add the beat message. Pass `onBinauralGenerate` to `OracleInput` in the new session page.

---

## 9. File Map

```
src/
├── lib/
│   └── binaural-presets.ts          # Types, presets, serialization, deterministic generation
├── lib/oracle/
│   ├── features.ts                  # Feature definitions + intent classifier (BINAURAL_INTENT_PATTERNS)
│   └── featureContext.ts            # getBinauralBeatContext() — system prompt injection
├── hooks/
│   └── use-binaural-player.ts       # Web Audio engine (play, playLive, updateLive, stop)
├── components/oracle/input/
│   ├── binaural-beats-card.tsx       # Main control panel (tuning + save)
│   ├── binaural-beat-history-card.tsx # Compact replay card for chat
│   └── oracle-input.tsx             # Mounts BinauralBeatsCard when feature active
├── app/oracle/
│   ├── new/page.tsx                 # ⚠️ BUG: missing onBinauralGenerate prop
│   └── chat/[sessionId]/page.tsx    # Renders history cards, invokes Oracle, reads binauralParams
└── app/globals.css                  # .binaural-bar animation keyframes

lib/oracle/
├── featureContext.ts                # Re-export barrel → src/lib/oracle/featureContext.ts
├── promptBuilder.ts                 # System prompt assembly (receives featureInjection)
└── features.ts                      # Re-export barrel → src/lib/oracle/features.ts

convex/oracle/
├── llm.ts                           # invokeOracle action — orchestrates generation + LLM call
├── sessions.ts                      # patchMessageBinauralParams mutation + message CRUD
├── features.ts                      # getFeatureInjection query
└── schema is in                     # convex/schema.ts (binauralParams field on oracle_messages)
```

### Key function call chain (AI-generated beats)

```
User sends message
  → chat page: invokeOracle()
    → classifyOracleToolIntent()              // src/lib/oracle/features.ts
    → generateBinauralBeat()                  // src/lib/binaural-presets.ts
      → extractBinauralIntent()               // keyword → sub-intent
      → INTENT_PROFILES[intent]               // sub-intent → base frequencies
      → birth chart personalization           // element offset from Sun/Moon/Rising
      → extractDuration()                     // parse duration from message
      → safety clamps                         // hard limits on all params
    → getBinauralBeatContext()                // src/lib/oracle/featureContext.ts
    → buildPrompt()                           // lib/oracle/promptBuilder.ts
    → callProviderStreaming()                 // convex/oracle/llm.ts
    → patchMessageBinauralParams()            // convex/oracle/sessions.ts
  → chat page: reads msg.binauralParams
    → BinauralBeatHistoryCard                 // src/components/oracle/input/binaural-beat-history-card.tsx
```
