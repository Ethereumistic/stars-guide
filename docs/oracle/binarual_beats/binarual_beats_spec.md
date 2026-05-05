# Agent Prompt: Binaural Beats Feature — Full End-to-End Implementation

## Your Mission

Build the Binaural Beats feature end-to-end: a Cloudflare Worker that generates
a short loopable WAV buffer using pure math DSP, wired to a Next.js UI accessible
from the oracle-input.tsx `+` menu, with Web Audio API handling looping and duration
on the client. The user controls carrier Hz, beat Hz, duration, and pink noise volume
from UI cards, hits generate, and gets a playing binaural beat session.

---

## Architecture Overview

```
User opens oracle-input.tsx → clicks + → selects "Binaural Beats"
  → BinauralBeatsCard component renders with 4 controls
  → User adjusts params and clicks Generate

Next.js frontend POSTs to Cloudflare Worker
  Worker: pure math DSP → 30-second loopable WAV → returns binary response

Browser receives WAV ArrayBuffer
  Web Audio API: decodes buffer → loops it → stops after chosen duration
  UI shows: playing state, time elapsed, stop button
```

No Convex involvement in the hot path. No file storage needed. No DB writes.
The Worker generates on demand and returns raw bytes. The browser handles all
playback logic.

---

## Part 1: Cloudflare Worker

### 1.1 Location

This Worker does not yet exist in the project. Create it, and follow the implementation below. The Worker handles
all audio generation routes.

### 1.2 wrangler.toml — Required Config Change

You MUST add this to wrangler.toml or the Worker will hit the default 30s CPU
limit. You are on the Workers Paid plan ($5/month) which allows up to 5 minutes:

```toml
[limits]
cpu_ms = 60000
```

60 seconds of CPU time is more than enough for a 30-second WAV segment. This is
a one-line config change that unlocks the feature.

### 1.3 New Route: POST /binaural/generate

The Worker must handle:

```
POST /binaural/generate
Content-Type: application/json

{
  "carrierHz": 200,
  "beatHz": 10,
  "loopDurationSeconds": 30,
  "pinkNoiseVolume": 0.15,
  "sampleRate": 44100
}
```

Response:
```
Content-Type: audio/wav
Content-Disposition: attachment; filename="binaural.wav"
[raw WAV binary]
```

CORS headers must be set so the Next.js frontend can fetch this cross-origin:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Handle OPTIONS preflight requests with 204.

### 1.4 Input Validation

Validate all inputs and return 400 with a JSON error if out of range:

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| carrierHz | 80 | 500 | 200 |
| beatHz | 0.5 | 100 | 10 |
| loopDurationSeconds | 10 | 60 | 30 |
| pinkNoiseVolume | 0.0 | 0.5 | 0.15 |
| sampleRate | 22050 | 44100 | 44100 |

### 1.5 DSP Implementation

Generate stereo PCM samples using phase accumulators. This is the ONLY correct
way — do NOT use `Math.sin(2 * Math.PI * freq * t)`. That formula causes phase
discontinuities (audible clicks). Phase accumulators carry phase forward
continuously:

```typescript
function generateBinauralPCM(
  carrierHz: number,
  beatHz: number,
  durationSeconds: number,
  pinkNoiseVolume: number,
  sampleRate: number
): { left: Int16Array; right: Int16Array } {
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const left = new Int16Array(totalSamples);
  const right = new Int16Array(totalSamples);

  // Phase accumulators
  let leftPhase = 0;
  let rightPhase = 0;

  // Pink noise state (Voss-McCartney — 7 octave rows)
  const pinkRows = new Float32Array(7).fill(0);
  let pinkRunningSum = 0;

  const leftFreqStep = (2 * Math.PI * carrierHz) / sampleRate;
  const rightFreqStep = (2 * Math.PI * (carrierHz + beatHz)) / sampleRate;

  // Fade envelope: 3-second fade in, 3-second fade out
  const fadeInSamples = 3 * sampleRate;
  const fadeOutSamples = 3 * sampleRate;

  for (let i = 0; i < totalSamples; i++) {
    // Phase accumulation
    leftPhase += leftFreqStep;
    rightPhase += rightFreqStep;

    // Wrap phase to prevent float32 precision drift over long durations
    if (leftPhase > 2 * Math.PI) leftPhase -= 2 * Math.PI;
    if (rightPhase > 2 * Math.PI) rightPhase -= 2 * Math.PI;

    // Sine samples
    let lSample = Math.sin(leftPhase);
    let rSample = Math.sin(rightPhase);

    // Pink noise (Voss-McCartney algorithm)
    // Update one octave row per sample based on trailing zero count of i
    if (i > 0) {
      const bit = i & -i; // lowest set bit
      const row = Math.min(Math.floor(Math.log2(bit)), 6);
      const oldVal = pinkRows[row];
      pinkRows[row] = Math.random() * 2 - 1;
      pinkRunningSum += pinkRows[row] - oldVal;
    }
    const pink = pinkRunningSum / 7; // normalize to roughly -1..1

    // Mix pink noise into both channels equally
    lSample += pink * pinkNoiseVolume;
    rSample += pink * pinkNoiseVolume;

    // Amplitude envelope
    let env = 1.0;
    if (i < fadeInSamples) {
      env = i / fadeInSamples;
      env = env * env; // ease-in curve
    } else if (i > totalSamples - fadeOutSamples) {
      const remaining = totalSamples - i;
      env = remaining / fadeOutSamples;
      env = env * env; // ease-out curve
    }

    // Apply envelope and scale to Int16 range
    // 0.85 headroom to prevent clipping when pink noise peaks
    const scale = 0.85 * env * 32767;
    left[i] = Math.max(-32768, Math.min(32767, Math.round(lSample * scale)));
    right[i] = Math.max(-32768, Math.min(32767, Math.round(rSample * scale)));
  }

  return { left, right };
}
```

### 1.6 WAV File Assembly

Write a standard WAV header manually. No npm packages needed — it's 44 bytes:

```typescript
function buildWav(
  left: Int16Array,
  right: Int16Array,
  sampleRate: number
): Uint8Array {
  const numSamples = left.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Helper to write ASCII string
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);        // subchunk size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved stereo samples: L R L R L R ...
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(offset, left[i], true);
    offset += 2;
    view.setInt16(offset, right[i], true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
```

### 1.7 Worker Handler

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method === 'POST' && url.pathname === '/binaural/generate') {
      return handleGenerate(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleGenerate(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body');
  }

  const carrierHz = clamp(Number(body.carrierHz ?? 200), 80, 500);
  const beatHz = clamp(Number(body.beatHz ?? 10), 0.5, 100);
  const loopDurationSeconds = clamp(Number(body.loopDurationSeconds ?? 30), 10, 60);
  const pinkNoiseVolume = clamp(Number(body.pinkNoiseVolume ?? 0.15), 0, 0.5);
  const sampleRate = [22050, 44100].includes(Number(body.sampleRate))
    ? Number(body.sampleRate)
    : 44100;

  const { left, right } = generateBinauralPCM(
    carrierHz, beatHz, loopDurationSeconds, pinkNoiseVolume, sampleRate
  );
  const wav = buildWav(left, right, sampleRate);

  return new Response(wav, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'audio/wav',
      'Content-Length': wav.byteLength.toString(),
      'Content-Disposition': 'inline; filename="binaural.wav"',
      'Cache-Control': 'no-store',
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
```

---

## Part 2: Next.js Frontend

### 2.1 Where to Add the Entry Point

Find `oracle-input.tsx`. It has a `+` button that opens a menu of feature options.
Add `"Binaural Beats"` as a new entry in that menu. When selected, it should set
a state value like `activeFeature: 'binaural_beats'` that causes the
`BinauralBeatsCard` component to render above or near the input area.

### 2.2 BinauralBeatsCard Component

Create this at `components/binaural-beats-card.tsx` (or wherever components live
in this project — match existing conventions).

The card has two states: **CONTROLS** (default) and **PLAYING**.

#### CONTROLS State UI

Display 4 controls as labeled cards/sliders:

**1. Brain State (maps to beatHz)**
Do not expose raw Hz numbers to the user. Show named presets that set beatHz:
- Deep Sleep → 1.5 Hz
- Deep Meditation → 5 Hz
- Relaxed Focus → 10 Hz (default)
- Concentration → 18 Hz
- Peak Performance → 40 Hz

Render as a segmented button row or pill selector.

**2. Carrier Frequency (carrierHz)**
Slider: 80 Hz to 500 Hz, step 10, default 200 Hz.
Label shows current value: "Carrier: 200 Hz"
Small helper text: "Lower = grounding, Higher = cerebral"

**3. Session Duration**
Segmented selector: 5 min | 15 min | 30 min | 60 min
This is the playback duration — NOT the loop length. The loop is always 30s;
the browser stops playback after the chosen duration.
Default: 15 min.

**4. Ambient Texture (pinkNoiseVolume)**
Slider: 0% to 40%, step 5%, default 15%.
Label: "Ambient: 15%"
Helper text: "Adds background texture for longer sessions"

Below the controls, a single button: **"Generate & Play"**

#### PLAYING State UI

Once generation starts, transition to playing state:

- Show a minimal waveform animation (CSS animation is fine — doesn't need to be
  real audio visualization)
- Show elapsed time / total duration: "4:32 / 15:00"
- A **Stop** button
- The brain state name and carrier Hz as subtitle: "Relaxed Focus · 200 Hz"

### 2.3 Web Audio API Playback Logic

This is the most important part of the frontend. Implement as a custom hook:
`hooks/use-binaural-player.ts`

```typescript
// Pseudocode — implement fully in TypeScript

export function useBinauralPlayer() {
  // State
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  async function generate(params: BinauralParams) {
    setStatus('loading');
    stop(); // clean up any previous session

    try {
      // 1. Fetch the loop segment from the Worker
      const response = await fetch(`${WORKER_URL}/binaural/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierHz: params.carrierHz,
          beatHz: params.beatHz,
          loopDurationSeconds: 30, // always request 30-second loop
          pinkNoiseVolume: params.pinkNoiseVolume,
          sampleRate: 44100,
        }),
      });

      if (!response.ok) throw new Error('Worker error');

      // 2. Decode WAV to AudioBuffer
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // 3. Create looping source node
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true; // native Web Audio loop — zero-gap, seamless
      source.connect(audioCtx.destination);
      source.start();
      sourceRef.current = source;

      // 4. Start elapsed time ticker
      startTimeRef.current = Date.now();
      setElapsed(0);
      setStatus('playing');

      timerRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startTimeRef.current;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        setElapsed(elapsedSec);

        // Auto-stop when duration is reached
        if (elapsedSec >= params.durationSeconds) {
          stop();
        }
      }, 1000);

    } catch (err) {
      setStatus('error');
      console.error('Binaural generation failed:', err);
    }
  }

  function stop() {
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setElapsed(0);
  }

  // Clean up on unmount
  useEffect(() => () => stop(), []);

  return { status, elapsed, generate, stop };
}
```

**Critical:** `source.loop = true` on an `AudioBufferSourceNode` creates a
perfectly seamless loop with zero gap. This is the correct, native Web Audio API
way to loop audio. Do not use `<audio loop>` HTML element — it has a gap on loop.
Use `AudioBufferSourceNode` only.

### 2.4 WORKER_URL Configuration

Add to `.env.local`:
```
NEXT_PUBLIC_BINAURAL_WORKER_URL=https://your-worker.workers.dev
```

Use `process.env.NEXT_PUBLIC_BINAURAL_WORKER_URL` in the hook. If this is the
same Worker already used in the project (e.g. oracle-worker), just add the
`/binaural/generate` route to it rather than deploying a separate Worker.

### 2.5 Format Time Helper

```typescript
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
```

---

## Part 3: Integration with oracle-input.tsx

### 3.1 What to Change in oracle-input.tsx

1. Find the `+` button handler that opens the feature selection menu.
2. Add a new menu item: label `"Binaural Beats"`, icon can be a brain or
   headphones icon (use whatever icon library is already in the project).
3. When selected, set `activeAttachment` or similar state to `'binaural_beats'`.
4. In the render area above the text input (where other feature cards appear),
   render `<BinauralBeatsCard />` when `activeAttachment === 'binaural_beats'`.
5. The card should be dismissible — clicking X or selecting a different feature
   should call `stop()` on the player and reset state.

### 3.2 Do Not Break Existing Features

Do not modify any existing attachment types, upload handlers, or message sending
logic. The binaural beats card is purely additive — it renders above the input,
plays audio, and has no interaction with message sending or Convex.

---

## Part 4: Preset Definitions (Shared Constants)

Create `lib/binaural-presets.ts` (or equivalent location matching project
conventions):

```typescript
export const BRAIN_STATE_PRESETS = [
  {
    id: 'deep_sleep',
    label: 'Deep Sleep',
    beatHz: 1.5,
    suggestedCarrierHz: 120,
    suggestedDuration: 60,
    description: 'Delta waves for deep sleep',
  },
  {
    id: 'deep_meditation',
    label: 'Deep Meditation',
    beatHz: 5,
    suggestedCarrierHz: 160,
    suggestedDuration: 30,
    description: 'Theta waves for meditation',
  },
  {
    id: 'relaxed_focus',
    label: 'Relaxed Focus',
    beatHz: 10,
    suggestedCarrierHz: 200,
    suggestedDuration: 15,
    description: 'Alpha waves for calm focus',
  },
  {
    id: 'concentration',
    label: 'Concentration',
    beatHz: 18,
    suggestedCarrierHz: 250,
    suggestedDuration: 30,
    description: 'Beta waves for sharp thinking',
  },
  {
    id: 'peak_performance',
    label: 'Peak Performance',
    beatHz: 40,
    suggestedCarrierHz: 320,
    suggestedDuration: 20,
    description: 'Gamma waves for peak cognition',
  },
] as const;

export type BrainStatePresetId = typeof BRAIN_STATE_PRESETS[number]['id'];

export interface BinauralParams {
  carrierHz: number;
  beatHz: number;
  durationSeconds: number;
  pinkNoiseVolume: number;
}
```

When the user selects a brain state preset, auto-populate `carrierHz` with
`suggestedCarrierHz` and `durationSeconds` with `suggestedDuration` as defaults,
but keep the controls editable so the user can override them.

---

## Part 5: File Structure Summary

Files to CREATE:
```
components/binaural-beats-card.tsx     ← UI card with controls and playing state
hooks/use-binaural-player.ts           ← Web Audio API playback logic
lib/binaural-presets.ts                ← Preset definitions and types
```

Files to MODIFY:
```
oracle-input.tsx                       ← Add binaural beats to + menu
[worker]/src/index.ts                  ← Add POST /binaural/generate route
[worker]/src/binaural/dsp.ts           ← New file: generateBinauralPCM + buildWav
wrangler.toml                          ← Add [limits] cpu_ms = 60000
.env.local                             ← Add NEXT_PUBLIC_BINAURAL_WORKER_URL
```

Files to DELETE:
```
Any Worker file that contained the old binaural beats generation (full-duration WAV/MP3)
Any Convex action that called the old binaural Worker
```

---

## Part 6: Implementation Order

Work in this exact order so each step is testable before proceeding:

**Step 1 — Worker DSP module**
Create `dsp.ts` with `generateBinauralPCM` and `buildWav`. Add a temporary GET
`/binaural/test` route in the Worker that generates a 10-second session with
default params and returns it. Test with `wrangler dev`, download the file, and
verify it plays with audible binaural pulsing in headphones. Left and right
channels must sound slightly different. If they sound identical, the beat
frequency offset is wrong.

**Step 2 — Worker POST route**
Replace the test GET route with the full POST `/binaural/generate` handler with
validation and CORS. Test with curl:
```
curl -X POST http://localhost:8787/binaural/generate \
  -H "Content-Type: application/json" \
  -d '{"carrierHz":200,"beatHz":10,"loopDurationSeconds":30,"pinkNoiseVolume":0.15}' \
  --output test.wav
```
Open test.wav and verify it sounds correct and loops seamlessly (play it twice
back to back — the transition should be inaudible).

**Step 3 — wrangler.toml cpu_ms**
Add `[limits] cpu_ms = 60000` to wrangler.toml. Deploy to production. Test the
same curl against the production URL.

**Step 4 — Preset constants**
Create `lib/binaural-presets.ts`. No UI yet, just the data.

**Step 5 — useBinauralPlayer hook**
Create the hook. Test it from a temporary `<TestPlayer />` component that has a
hardcoded "Generate" button. Verify the loop is seamless, the timer works, and
auto-stop fires correctly at the end of the duration.

**Step 6 — BinauralBeatsCard component**
Build the full card UI. Wire it to the hook. Test all brain state presets and
all duration options.

**Step 7 — oracle-input.tsx integration**
Add the entry point to the + menu. Mount the card. Test the full flow from
clicking + through generation to playback.

---

## Part 7: Quality Gates

Before this feature is considered done, verify all of the following:

- [ ] Worker deploys without error with `cpu_ms = 60000` in wrangler.toml
- [ ] POST `/binaural/generate` returns a valid WAV in under 10 seconds for all
      input combinations
- [ ] WAV file plays in browser without errors or silent output
- [ ] Left and right channels are different (verifiable by temporarily mono-ing
      each channel — the beat effect disappears when channels are identical)
- [ ] Loop is seamless — no click, gap, or pop when the 30-second segment loops
- [ ] Auto-stop fires at exactly the chosen duration
- [ ] Stop button immediately halts playback and cleans up AudioContext
- [ ] Selecting a new brain state preset updates carrierHz automatically
- [ ] Pink noise is audible at 15% but does not mask the binaural pulsing
- [ ] Feature appears in oracle-input.tsx + menu
- [ ] Dismissing the card stops playback
- [ ] No existing oracle-input.tsx features are broken

---

## Technical Notes for the Agent

**On phase accumulators:** The provided DSP code uses phase accumulators, not
`sin(2π*f*t)`. This is non-negotiable. The formula `sin(2π*f*t)` produces the
correct frequency but causes phase discontinuities between samples when frequency
changes, and also accumulates floating point error over millions of samples. Phase
accumulators are the industry-standard DSP approach.

**On AudioBufferSourceNode looping:** The Web Audio API's `source.loop = true`
property creates a sample-accurate loop with zero gap. This is only possible
because the loop segment was generated with matching start and end phase values.
The fade-in/fade-out envelope in the DSP code ensures the WAV starts and ends at
zero amplitude, making the loop transition inaudible regardless of phase alignment.

**On the 30-second loop length:** This is the key insight of the architecture.
A binaural beat at a fixed carrier and beat frequency is perfectly periodic —
the waveform repeats every single cycle (~25ms for a 40Hz beat). A 30-second
segment contains tens of thousands of complete cycles. When looped natively by
the Web Audio API, the result is indistinguishable from a file that is hours long.
The user's experience of a 60-minute session is: one 30-second WAV downloaded
once, played 120 times in sequence by the browser.

**On Worker CPU time:** A 30-second stereo session at 44100 Hz is 2,646,000 samples.
At approximately 500k samples/second in wrangler dev (pessimistic Node.js mode),
this takes about 5 seconds. Production V8 in a real Worker isolate is typically
2–5x faster, putting generation at 1–2.5 seconds. With `cpu_ms = 60000`, this
has a 60x safety margin.

**On AudioContext in Next.js:** AudioContext must be created inside a user gesture
handler (the "Generate & Play" button click) to comply with browser autoplay
policies. Do not create AudioContext at component mount time. The `generate()`
function is called directly from the button's onClick handler.

**On TypeScript in the Worker:** Use `Uint8Array` and `DataView` for all binary
operations. `Buffer` is a Node.js API and is not available in Cloudflare Workers.
`ArrayBuffer`, `DataView`, `Int16Array`, `Uint8Array`, and `Float32Array` are all
available as Web Standard APIs in Workers.