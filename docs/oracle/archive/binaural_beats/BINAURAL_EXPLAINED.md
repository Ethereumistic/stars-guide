# Binaural Beats — Full Technical Explanation

> This document explains how the Binaural Beats feature works inside Oracle AI, from user message to audio output. It covers the deterministic generation pipeline, intent detection, explicit parameter extraction, stimulation modes (binaural/monaural/isochronic), noise types (including Grey and Blue noise), Web Audio playback, birth chart personalization, Solfeggio and Planetary carrier frequencies, and UI rendering. Last updated: 2025-07-13.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [The Generation Pipeline (Deterministic)](#3-the-generation-pipeline-deterministic)
4. [Intent Detection & Keyword Mapping](#4-intent-detection--keyword-mapping)
5. [Explicit Parameter Extraction](#5-explicit-parameter-extraction)
6. [Noise-Only Mode (White/Pink/Brown Noise)](#6-noise-only-mode-whitepinkbrown-noise)
7. [Birth Chart Personalization](#7-birth-chart-personalization)
8. [The Audio Player (Web Audio API)](#8-the-audio-player-web-audio-api)
9. [Message Serialization & Deserialization](#9-message-serialization--deserialization)
10. [Feature Context (System Prompt Injection)](#10-feature-context-system-prompt-injection)
11. [Oracle Pipeline Integration](#11-oracle-pipeline-integration)
12. [UI Components](#12-ui-components)
13. [Frequency Presets Library](#13-frequency-presets-library)
14. [Priority System & Conflict Resolution](#14-priority-system--conflict-resolution)
15. [Safety Clamps & Validation](#15-safety-clamps--validation)
16. [Key Design Decisions & Trade-offs](#16-key-design-decisions--trade-offs)

---

## 1. Feature Overview

The Binaural Beats feature allows Oracle AI users to request audio sessions — either binaural beats (two tones at slightly different frequencies feeding each ear) or pure noise (white, pink, or brown noise) — that are generated **deterministically** on the server and played back in the browser using the Web Audio API.

The system works in two modes:

| Mode | What Happens | Example User Message |
|------|-------------|---------------------|
| **Binaural Beat** | Two carrier oscillators at different Hz per ear, plus optional background noise | "play me an alpha wave for focus" |
| **Noise-Only** | Carrier oscillators muted, noise layer becomes the primary audio | "give me white noise for sleep" |

The user never directly specifies audio parameters. Instead, they describe what they want in natural language, and the system **extracts intent, explicit parameters, and ear preferences** to deterministically generate the correct session.

---

## 2. Architecture & Data Flow

```
User Message
    │
    ▼
Intent Router (features.ts)
    │  Regex patterns detect binaural intent
    ▼
Binaural Beats Pipeline (pipelines/binauralBeats.ts)
    │  Calls generateBinauralBeat(userMessage, birthData)
    ▼
binaural-presets.ts — Deterministic Generation
    │
    ├── detectNoiseIntent()          → Is this a noise-only request?
    ├── extractExplicitBeatHz()      → Did the user specify a frequency?
    ├── extractExplicitBand()        → Did they name a brain band?
    ├── extractHigherEar()           → Did they request an ear preference?
    ├── extractBinauralIntent()      → Keyword-based intent (sleep, focus, etc.)
    ├── extractDuration()            → Duration hint
    ├── Birth chart personalization  → Carrier offset from dominant element
    └── Safety clamps                → Enforce valid ranges
    │
    ▼
BinauralBeatParams (JSON object)
    │
    ├──→ serializeBeat() → embedded in AI message as [BINAURAL_BEAT]{...}[/BINAURAL_BEAT]
    │
    ├──→ getBinauralBeatContext() → injected into system prompt so AI explains the session
    │
    └──→ parseBeat() → on the frontend, renders BinauralBeatHistoryCard / BinauralBeatsCard
                           │
                           ▼
                     useBinauralPlayer hook
                           │
                           ├──→ AudioContext + OscillatorNodes (binaural carriers)
                           ├──→ AudioBufferSourceNode (noise generator)
                           ├──→ GainNodes (volume, fade-in/fade-out)
                           ├──→ BiquadFilterNode (low-pass on noise)
                           └──→ StereoPannerNodes (hard-pan left/right)
```

---

## 3. The Generation Pipeline (Deterministic)

The core function is `generateBinauralBeat()` in `src/lib/binaural-presets.ts`. It takes:

```
generateBinauralBeat(userMessage: string, birthData?: BirthDataLike | null)
  → BinauralBeatParams & { rationale: BinauralRationale }
```

### Phase 0: Noise Detection

Before any binaural logic runs, `detectNoiseIntent()` checks whether the user explicitly asked for white, pink, or brown noise (rather than a binaural beat). If a noise-only request is detected, the function short-circuits to `generateNoiseOnlyBeat()` and returns `leftVolume=0, rightVolume=0` with the appropriate noise configuration.

See [§6 Noise-Only Mode](#6-noise-only-mode-whitepinkbrown-noise) for details.

### Phase 1: Determine Beat Frequency and Band

The priority order is:

```
Explicit Hz in beat range (0.5–50 Hz)  →  override everything
Explicit band name (theta, delta, etc.) →  use band's default Hz  
Intent keywords (sleep, focus, etc.)    →  map to band → Hz
Default                                  →  Alpha 10 Hz
```

**Explicit Hz** — If the user said "7 hertz", "7.5 Hz", or "frequency of 7", the system uses that exact value (within 0.5–50 Hz). Values above 50 Hz are treated as carrier specifications, not beat frequencies, and the system falls back to band/intent detection.

**Explicit Band** — If the user said "theta wave" or "alpha state", the system uses the band's default beat Hz:
- Delta → 3 Hz
- Theta → 7 Hz
- Alpha → 10 Hz
- (Low) Beta → 18 Hz
- Gamma → 40 Hz

**Intent Keywords** — If no explicit parameter was given, the system maps intent keywords to a band. See [§4](#4-intent-detection--keyword-mapping).

### Phase 2: Ear Preference

`extractHigherEar()` parses patterns like:
- "higher frequency in left ear" → left ear gets the higher Hz
- "left ear higher" → left ear gets the higher Hz
- "higher on the right" → right ear gets the higher Hz

By convention, `rightHz = leftHz + beatHz` (right ear is higher). If the user wants the left ear higher, the frequencies are swapped. The beat frequency (`|leftHz - rightHz|`) is always preserved regardless of ear preference.

### Phase 3: Birth Chart Personalization

If birth data is available, the system determines the user's dominant astrological element (fire, earth, air, water) and shifts **both carrier frequencies** by the same offset:

| Element | Offset |
|---------|--------|
| Fire    | +30 Hz |
| Air     | +15 Hz |
| Earth   | -20 Hz |
| Water   | -15 Hz |

Because both channels shift by the same amount, the **beat frequency is never altered** by personalization. Only the carrier pitch changes.

### Phase 4: Duration

Duration is extracted from the message or defaults to 30 minutes (1800 seconds):
- "15 min" → 900s
- "1 hour" → 3600s
- "quick" → 900s
- "long" or "deep" → 3600s
- Clamped to 300s–7200s (5 min – 2 hours)

### Phase 5: Safety Clamps

All final values are clamped to safe ranges:
- Carrier frequencies: 80–600 Hz
- Beat frequency: ≤ 50 Hz
- Noise volume: 0–0.5

### Phase 6: Build Output

The function returns a `BinauralBeatParams` object plus a `BinauralRationale` (internal metadata used for the AI's system prompt context):

```typescript
interface BinauralBeatParams {
  version: 2
  name: string               // e.g. "Theta 7Hz" or "Pink Noise"
  leftHz: number             // Left ear carrier frequency
  rightHz: number            // Right ear carrier frequency
  leftVolume: number         // 0.0 – 1.0 (0 for noise-only)
  rightVolume: number        // 0.0 – 1.0 (0 for noise-only)
  waveform: OscillatorType   // 'sine' or 'triangle'
  noiseVolume: number        // 0.0 – 0.5
  noiseCutoff: number        // Low-pass filter Hz (100–20000)
  noiseType: NoiseType       // 'white' | 'pink' | 'brown' | 'none'
  durationSeconds: number    // 300 – 7200
  presetId: string            // 'ai_generated' or preset ID
  generatedAt: string        // ISO timestamp
}

interface BinauralRationale {
  intent: string              // First 100 chars of user message
  beatBand: string           // Band name (e.g. "Theta") or "Noise"
  beatHz: number              // Beat frequency (0 for noise-only)
  personalization: string | null  // Birth chart rationale text
  noiseType?: NoiseType       // Only present for noise-only sessions
}
```

---

## 4. Intent Detection & Keyword Mapping

When the user doesn't specify an explicit frequency or band, `extractBinauralIntent()` matches keyword patterns to determine the desired brain state.

### Intent Priority Order

Noise intents have **highest priority**, followed by the most specific binaural intents:

```
white_noise → pink_noise → brown_noise → healing → sleep → meditation →
relaxation → creativity → study → focus → peak_performance
```

If no keywords match, the default intent is `"relaxation"` → Alpha 10 Hz.

### Keyword Patterns

| Intent | Regex Patterns | Default Band & Hz |
|--------|---------------|-------------------|
| `sleep` | `sleep`, `slip`, `insomnia`, `dream*`, `rest`, `zzz`, `night` | Delta 3 Hz |
| `meditation` | `meditat*`, `zen`, `mindful*`, `spiritual`, `inner peace` | Theta 7 Hz |
| `focus` | `focus`, `concentrat*`, `productiv*`, `adhd`, `work` | Low Beta 18 Hz |
| `relaxation` | `relax*`, `calm`, `stress`, `anxious`, `chill`, `unwind` | Alpha 10 Hz |
| `peak_performance` | `peak`, `gamma`, `cognit*`, `performan*`, `sharp`, `brain power` | Gamma 40 Hz |
| `study` | `stud*`, `exam`, `learn`, `memor*`, `retain` | Low Beta 14 Hz |
| `creativity` | `creativ*`, `inspir*`, `flow state`, `artist*`, `imagin*` | Theta 6 Hz |
| `healing` | `heal*`, `recover*`, `repair*`, `restor*`, `pain` | Theta 7.83 Hz |
| `white_noise` | `white noise`, `white sound` | Noise-only |
| `pink_noise` | `pink noise`, `pink sound` | Noise-only |
| `brown_noise` | `brown noise`, `brown sound`, `red noise`, `red sound` | Noise-only |

### Preset Lookup

Once an intent and target Hz are determined, `findPresetForBeat(beatHz, bandHint)` searches the `BINAURAL_FREQUENCIES` table for the closest matching entry. If an exact match exists, it's used. Otherwise, the entry with the smallest `|preset.beat - targetHz|` distance is selected, optionally filtered by band.

---

## 5. Explicit Parameter Extraction

Three extractor functions give users direct control over the generated session. These are checked **before** intent keywords and take absolute priority.

### `extractExplicitBeatHz(message)`

Parses explicit frequency values from the message:
- Matches: "7 hertz", "7 Hz", "7.5 hz", "frequency of 7", "7 hz theta"
- When multiple Hz values appear (e.g., "200 Hz carrier with 7 Hz beat"), prefers the value in the binaural beat range (0.5–50 Hz)
- Values above 50 Hz are treated as carrier specifications and ignored for beat determination

### `extractExplicitBand(message)`

Parses explicit brain band names:
- Matches: "theta", "delta", "alpha", "beta", "gamma"
- Compound forms: "theta wave", "delta sleep", "alpha state"
- Multi-word bands: "low beta", "high beta", "mid beta"
- Returns the band's default Hz along with the band name and Hz range

### `extractHigherEar(message)`

Parses which ear should receive the higher frequency:
- Matches: "higher frequency in left ear", "left ear higher", "higher on the left"
- Also matches right-ear variants
- Returns `"left"`, `"right"`, or `null` (defaults to right ear higher)

### Priority Resolution

When multiple explicit parameters conflict:
1. **Explicit Hz in beat range** → wins over everything
2. **Explicit band name** → used if no Hz, provides the band name for labeling
3. **Both Hz and band** → Hz determines frequency, band determines label. E.g., "7 hz theta" uses 7 Hz and labels it Theta.
4. **Intent keywords** → used only when no explicit specs exist

---

## 6. Noise-Only Mode (White/Pink/Brown Noise)

When the user explicitly requests noise without binaural tones, the system enters noise-only mode.

### Detection: `detectNoiseIntent(message)`

The function requires **both** a noise/sound keyword AND a specific noise color (or a generic "just noise" pattern):

| Pattern | Result |
|---------|--------|
| "white noise" | `white` |
| "pink noise" / "ambient noise" | `pink` |
| "brown noise" / "red noise" | `brown` |
| "just noise" / "pure noise" | `pink` (default) |

**Critical guard:** If the user also specifies a binaural frequency or brain band (e.g., "10 hz alpha with background noise"), the noise intent is suppressed. Binaural parameters always take priority over noise-only mode.

### Noise Presets

```typescript
const NOISE_PRESETS = [
  { id: 'white', cutoff: 20000, volume: 0.15 },  // Full spectrum — bright hiss
  { id: 'pink',  cutoff: 800,   volume: 0.18 },  // Per-octave balance — warm
  { id: 'brown', cutoff: 300,   volume: 0.22 },  // Low rumble — deep & soothing
]
```

### Noise Generation in `generateNoiseOnlyBeat()`

When noise-only mode is active:
- **Carrier oscillators are muted** (`leftVolume = 0`, `rightVolume = 0`)
- **Noise volume is boosted** (1.2× the preset volume, since noise is the primary audio)
- **Left/Right Hz are set to 200** structurally but inaudible
- **Cutoff** is set to the noise-type-appropriate value (20000 for white, 800 for pink, 300 for brown)

### Noise Generation Algorithms (Web Audio)

Three different algorithms generate noise buffers in `use-binaural-player.ts`:

| Noise Type | Algorithm | Spectral Character |
|-----------|-----------|-------------------|
| White | Uniform random samples (`Math.random() * 2 - 1`) | Equal energy at all frequencies |
| Pink | Voss-McCartney algorithm (7-row accumulator) | Equal energy per octave |
| Brown | Leaky integrator random walk (`lastOut + 0.02 * white`) / 1.02 | Energy drops 6 dB/octave |

All noise buffers are 2 seconds long and looped via `AudioBufferSourceNode.loop = true`.

---

## 7. Birth Chart Personalization

When birth data is available, the system personalizes the carrier frequencies based on the user's dominant astrological element.

### Element Detection

The system collects the signs of the Sun, Moon, and Ascendant from the birth chart, maps each sign to an element, and picks the **modal element** (most frequent):

```
Aries/Leo/Sagittarius → Fire (+30 Hz offset)
Taurus/Virgo/Capricorn → Earth (-20 Hz offset)
Gemini/Libra/Aquarius → Air (+15 Hz offset)
Cancer/Scorpio/Pisces → Water (-15 Hz offset)
```

### Carrier Offset

Both `leftHz` and `rightHz` are shifted by the same offset (clamped to 80–600 Hz). This changes the **pitch** of the carrier tones but preserves the **beat frequency** exactly.

Example: Theta 7 Hz beat, Fire-dominant chart:
- Base: L 200 / R 207
- After +30 offset: L 230 / R 237
- Beat: 237 − 230 = 7 Hz (unchanged)

### Personalization Rationale Text

The system generates an explanation like:
> "Tuned for your fire-dominant chart — fire energy resonates well with Theta frequencies."

This is included in the `BinauralRationale.personalization` field and injected into the AI's system prompt context.

---

## 8. The Audio Player (Web Audio API)

The player is implemented as `useBinauralPlayer()` in `src/hooks/use-binaural-player.ts`.

### Audio Graph

```
                    ┌──────────────┐
  Oscillator L ─────│ leftHz freq  │
  (sine/triangle)   │ pan = -1     │
                    │              │
                    │  Left Gain   │──── master gain ──── destination
                    │  (volume)    │     (3s fade-in)
                    └──────────────┘

                    ┌──────────────┐
  Oscillator R ─────│ rightHz freq │
  (sine/triangle)   │ pan = +1     │
                    │              │
                    │  Right Gain  │──── master gain ──── destination
                    │  (volume)    │
                    └──────────────┘

                    ┌──────────────┐
  Noise Buffer ─────│ loop = true  │
  (2s, noise type)  │              │
                    │  Low-pass    │──── noise gain ──── master gain
                    │  filter       │     (scaled by mode)
                    │  (cutoff Hz) │
                    └──────────────┘
```

### Key Behaviors

| Behavior | Detail |
|----------|--------|
| **Fade-in** | Master gain ramps from 0.001 → 1.0 over 3 seconds |
| **Fade-out** | On stop, master gain ramps to 0.001 over 2 seconds, then cleanup |
| **Noise volume scaling** | Binaural mode: noise at 0.3× volume (background layer). Noise-only mode: noise at 1.2× volume (primary audio). |
| **Oscillator suppression** | If `leftVolume === 0 && leftHz === 0` (noise-only), left/right oscillators are not created at all |
| **Live updates** | `updateLive()` ramps frequency and gain changes over 50ms for smooth transitions |
| **Auto-stop** | Timed mode (`play()`) stops when `elapsed >= durationSeconds` |

### Noise Type Switching

Changing `noiseType` requires a **full graph rebuild** (different buffer generation algorithm). This is NOT available via `updateLive()` — it requires calling `playLive()` or `play()` again with new params.

---

## 9. Message Serialization & Deserialization

### Serialization

The `serializeBeat()` function wraps the JSON params in a tagged block:

```
[BINAURAL_BEAT]{"version":2,"name":"Theta 7Hz","leftHz":207,"rightHz":200,...}[/BINAURAL_BEAT]
```

This tagged block is embedded in the AI's response message. The `isBeatMessage()` function detects it, and `parseBeat()` extracts the JSON.

### Version Compatibility

- **V2 format** — `leftHz` and `rightHz` directly (current)
- **V1 format** — `carrierHz` + `beatHz` (legacy), automatically migrated to V2 on parse
- **Backward compatibility** — Missing fields default: `leftVolume=1`, `rightVolume=1`, `noiseType='pink'`, `noiseVolume=0` → `noiseType='none'`

### V2 Fields Added

The V2 format added:
- `leftHz` / `rightHz` (replacing `carrierHz` + `beatHz`)
- `leftVolume` / `rightVolume` (independent ear volume control)
- `noiseType` (white/pink/brown/none)
- `name` (session name, e.g. "Theta 7Hz" or "Pink Noise")

---

## 10. Feature Context (System Prompt Injection)

When a binaural beat or noise session is generated, `getBinauralBeatContext()` builds a system prompt block that tells the AI what was generated so it can explain the session naturally.

### Binaural Beat Context

```
[BINAURAL BEAT CONTEXT]
A binaural beat session has been generated for the user. Integrate this naturally
into your response — explain what the beat does, why these frequencies were chosen,
and how it relates to their request.

Intent: 7 hertz theta wave I want the higher frequency to be in my left ear
Band: Theta (7 Hz beat frequency)
Carrier: 207 Hz (left) / 200 Hz (right)
Waveform: sine
Noise: 0.1 volume, 500 Hz cutoff
Duration: 30 minutes
Tuned for your fire-dominant chart — fire energy resonates well with Theta frequencies.
[END BINAURAL BEAT CONTEXT]
```

### Noise-Only Context

```
[BINAURAL BEAT CONTEXT]
A noise-only session has been generated for the user. Integrate this naturally into
your response — explain what the noise type does, why it was chosen, and how it
relates to their request.

Intent: white noise so I can sleep safely
Mode: Noise-only (white noise)
Binaural carriers: MUTED (volume = 0)
Noise type: white
Noise volume: 0.15
Full spectrum (no filter)
Duration: 30 minutes
White noise — equal energy across all frequencies. Bright, hissing sound ideal for
masking sudden environmental noises and blocking distractions.
[END BINAURAL BEAT CONTEXT]
```

The AI is instructed **not** to output JSON or prescription blocks — it explains the session conversationally, and the user sees a playable card widget with the technical details.

---

## 11. Oracle Pipeline Integration

The binaural beats feature is wired into the Oracle pipeline system via `src/lib/oracle/pipelines/binauralBeats.ts`.

### Pipeline Phases

1. **`buildPromptBlocks(ctx)`** — Called during prompt assembly:
   - Generates the beat deterministically via `generateBinauralBeat(ctx.userQuestion, birthData)`
   - Stores the result in a module-scoped variable `lastGeneratedBeat`
   - Builds the system prompt context via `getBinauralBeatContext()`
   - Returns system blocks (soul document + binaural context)

2. **`afterResponse(response, ctx)`** — Called after the AI responds:
   - Reads `lastGeneratedBeat`
   - Returns a `PostResponseAction` of type `"store_binaural_params"` with the params
   - Clears `lastGeneratedBeat` to prevent stale data across requests

### Data Requirements

The binaural pipeline doesn't require birth data or journal context, but it uses birth data for **personalization** when available:
- `needsBirthData`: false (optional, enhances with personalization)
- `needsJournalContext`: false
- `needsTimespace`: true (timestamp context)

### Intent Router

The intent router in `src/lib/oracle/features.ts` detects binaural requests using regex patterns:

```typescript
/\b(generate|create|make|craft|compose)\s+(me\s+)?(a\s+)?(binaural\s+)?beat/i
/\bbinaural\b.*\b(for|tuned|aligned|my|generate|create|me)\b/i
/\bbinaural\s+beat/i
/\bbinaural\b.*\b(my\s+)?(chart|sign|birth|sun|moon|rising|placement|element)\b/i
// ... plus many more
```

These patterns are checked **after** journal recall and birth chart detection, ensuring binaural-specific requests are properly routed.

---

## 12. UI Components

### BinauralBeatHistoryCard (`binaural-beat-history-card.tsx`)

Renders in the chat history for each message that contains a binaural beat. Displays:
- **Binaural mode**: Band symbol (δ, θ, α, β, γ), beat frequency, left/right Hz, band badge
- **Noise-only mode**: Noise type label ("White Noise", "Pink Noise", "Brown Noise"), hides L/R display
- Beat visualizer (animated canvas wave)
- Play/Stop button
- Progress bar (elapsed time / total duration)

### BinauralBeatsCard (`binaural-beats-card.tsx`)

The interactive card shown in the Oracle input area when the binaural feature is active. Allows manual control of:
- Preset selection (searchable dropdown of all `BINAURAL_FREQUENCIES`)
- Carrier frequency (left/right Hz sliders, 20–1000 Hz)
- Volume (left/right, 0–100%)
- Ambient noise (volume and cutoff sliders)
- Waveform (sine / triangle)
- Duration (15m / 30m / 60m presets)
- Play/stop controls with `playLive()` for instant playback
- "Save to Chat" button that serializes the current params

### Noise-Only Display

When `params.noiseType !== 'none'` and `params.leftVolume === 0 && params.rightVolume === 0`:
- The frequency display changes from "Δ 7.00 Hz" to the noise type label
- The L/R Hz display is hidden
- The band badge shows the noise type color and symbol
- The visualizer still animates using the structurally-present frequencies (in noise-only, these are inaudible)

---

## 13. Frequency Presets Library

`src/lib/binaural-frequencies.ts` contains the complete frequency table with 40+ entries across 7 brain bands:

| Band | Hz Range | Count | Symbol | Uses |
|------|----------|-------|--------|------|
| Delta | 0.5–4 Hz | 8 | δ | Deep sleep, healing, pain relief |
| Theta | 4–8 Hz | 8 | θ | Meditation, creativity, Schumann resonance (7.83 Hz) |
| Alpha | 8–14 Hz | 9 | α | Relaxed focus, flow state, mood enhancement |
| Low Beta | 14–21 Hz | 5 | β- | Concentration, problem-solving |
| Mid Beta | 21–30 Hz | 4 | β | Mental stimulation, sharp analysis |
| High Beta | 30–40 Hz | 4 | β+ | Intense focus, alertness (caution) |
| Gamma | 40–100 Hz | 4 | γ | Peak cognition, memory binding (experimental) |

Each entry specifies `leftHz`, `rightHz` (carrier pair), `beat` (difference), `band`, and `uses` (searchable keywords).

Helper functions:
- `getBandSymbol(band)` — Returns the Greek letter symbol
- `getBandColor(band)` — Returns Tailwind CSS color classes
- `getBrainStateFromBeat(hz)` — Returns band info for any Hz value
- `filterFrequencies(band?, search?)` — Filters presets for the UI dropdown

---

## 14. Priority System & Conflict Resolution

When a user message contains multiple signals, the system resolves conflicts in a strict priority order:

### Example Conflict Scenarios

| User Message | Explicit Hz | Explicit Band | Intent Keywords | Noise Intent | Result |
|-------------|------------|---------------|----------------|-------------|--------|
| "7 hertz theta wave, higher in left ear" | 7 Hz | Theta | — | — | Theta 7Hz, L>R |
| "theta wave for sleep" | — | Theta | sleep | — | Theta 7Hz (band wins) |
| "10 hz alpha with background noise" | 10 Hz | Alpha | — | pink (suppressed) | Alpha 10Hz binaural |
| "white noise for sleep" | — | — | sleep | white | White noise (no binaural) |
| "just noise" | — | — | — | pink | Pink noise |
| "I want to relax" | — | — | relaxation | — | Alpha 10Hz |
| "200 Hz carrier with 7 Hz beat" | 7 Hz* | — | — | — | Theta-ish 7Hz (*7 in beat range wins) |

### Key Rules

1. **Noise intent suppresses binaural** — Unless the user also specified explicit Hz or brain band
2. **Explicit Hz overrides everything** — Even if "theta wave" says 7 Hz, if the user says "5 hz theta", it's 5 Hz labeled Theta
3. **Explicit band overrides intent** — "theta wave" for relaxation still gives Theta 7 Hz, not Alpha 10 Hz
4. **Ear preference never changes beat** — Swapping left/right preserves `|leftHz - rightHz|`

---

## 15. Safety Clamps & Validation

Final output values are always clamped:

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| leftHz / rightHz | 80 | 600 | From preset |
| Beat Hz | 0.5 | 50 | From intent |
| Noise volume | 0 | 0.5 | 0.1 (binaural) / 0.15-0.22 (noise) |
| Noise cutoff | 100 | 20000 | 500 (binaural) / 300-20000 (noise type) |
| Duration | 300 (5 min) | 7200 (2 hr) | 1800 (30 min) |
| leftVolume / rightVolume | 0 | 1 | 1 (binaural) / 0 (noise-only) |

Beat frequency safety: if `|rightHz - leftHz| > 50`, the beat is clamped to 50 Hz while preserving ear preference direction.

Carrier range safety: if any channel falls below 80 Hz after personalization, it's raised to 80 Hz + a proportion of the beat frequency.

---

## 16. Key Design Decisions & Trade-offs

### Why Deterministic Generation (Not LLM-Generated)?

The beat parameters are computed deterministically from the user's message, not by asking the LLM to "generate" them. This ensures:
- **Reproducibility** — Same input always produces same output
- **Safety** — No risk of the LLM generating invalid or dangerous frequencies
- **Auditability** — Every parameter can be traced to a specific extraction rule
- **Testability** — The generation logic can be unit-tested independently

The LLM's role is limited to **explaining** the session conversationally, based on the context injected by `getBinauralBeatContext()`.

### Why V2 Format with leftHz/rightHz?

The original V1 format used `carrierHz + beatHz`, which assumes right ear is always higher. V2 uses explicit `leftHz` and `rightHz` to support:
- **Ear preference** — Left ear can be higher or lower
- **Noise-only mode** — Carriers can have volume 0 (inaudible)
- **Asymmetric volumes** — `leftVolume` and `rightVolume` are independent

### Why 2-Second Noise Buffers?

The noise buffers are generated as 2-second `AudioBuffer`s and looped via `AudioBufferSourceNode.loop = true`. This creates perfectly seamless audio with no gap. Pink and brown noise are stationary processes (their statistical properties don't change over time), so a 2-second loop is perceptually identical to infinite noise.

### Why Not Use the Cloudflare Worker?

The current implementation generates audio entirely in the browser using the Web Audio API's `OscillatorNode` and `AudioBufferSourceNode`. This was chosen over the original spec's Worker-based approach because:
- **Zero latency** — No network round-trip before audio starts
- **No server cost** — All computation is client-side
- **Real-time control** — Frequencies can be adjusted live via `updateLive()`
- **Live preview** — The interactive card allows manual frequency changes without regeneration

The original spec's Worker-based DSP pipeline (with WAV generation) remains available as an alternative architecture but is not currently used.

### Why Phase Accumulators?

The noise algorithms use `Math.random()` which is sufficient for perception. The oscillator frequencies are set directly on `OscillatorNode.frequency`, which uses the browser's internal phase accumulator — so there are no phase discontinuity issues at the JavaScript level.

### Module-Scoped Beat Storage

The pipeline uses a module-scoped `lastGeneratedBeat` variable to pass data between `buildPromptBlocks()` and `afterResponse()`. This works because:
- Within a single Convex action, `buildPromptBlocks()` is always called before `afterResponse()`
- Concurrent actions that don't use binaural will see `null` and return no action
- The variable is cleared after reading to prevent stale data

This is a pragmatic trade-off — the alternative would require threading the beat through the entire pipeline, adding complexity for no functional benefit.