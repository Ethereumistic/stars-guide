# Extend Binaural Beats — Task Spec

## Context

The Binaural Beats feature is partially implemented. The Cloudflare Worker at `workers/binaural-worker/` generates a 30-second loopable WAV and returns it. The Next.js frontend (`src/components/oracle/input/binaural-beats-card.tsx`) lets users pick a brain state preset, adjust carrier/noise, and play. The Web Audio API loops the 30-second segment via `AudioBufferSourceNode.loop = true`.

There are **two problems** to fix and **one new feature** to add.

---

## Task 1: Fix the Loop Fade Bug (Critical)

### Problem

The DSP code in `workers/binaural-worker/src/dsp.ts` applies a 3-second fade-in and 3-second fade-out envelope to **every** 30-second WAV segment. Because the browser loops this segment via `AudioBufferSourceNode.loop = true`, the volume dips down and ramps back up every 30 seconds — creating an audible and unusable pulsing volume effect.

### Required Fix

**In the Worker DSP (`workers/binaural-worker/src/dsp.ts`):**
- Remove the fade-in and fade-out envelope from `generateBinauralPCM`. The loop segment should be generated at constant amplitude (no envelope at all). The segment starts and ends at whatever phase the oscillators happen to be at — since the binaural tone is a continuous sine, the loop transition will be near-silent naturally (the waveform crosses zero thousands of times per second).
- Keep the `0.85` headroom scaling but remove all envelope code.

**In the frontend hook (`src/hooks/use-binaural-player.ts`):**
- Add a `GainNode` to the Web Audio graph for fade-in/fade-out at the **session** level (not the loop level).
- When `generate()` is called and playback starts, ramp the gain from `0.0` to `1.0` over 3 seconds using `gainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 3)`. Call `gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime)` first to set the starting point.
- When `stop()` is called, ramp the gain from current value to `0.0` over 2 seconds using `gainNode.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 2)`, then actually stop the source node after the ramp completes (use `setTimeout` or `audioCtx.addEventListener` for the 2-second delay).
- When auto-stop fires at the end of the chosen duration, also do the 2-second fade-out instead of an abrupt stop.
- The audio graph becomes: `source → gainNode → audioCtx.destination`.

### Files to Modify

| File | Change |
|------|--------|
| `workers/binaural-worker/src/dsp.ts` | Remove fade envelope from `generateBinauralPCM` |
| `src/hooks/use-binaural-player.ts` | Add `GainNode` with session-level fade-in/fade-out |
| `src/components/oracle/input/binaural-beats-card.tsx` | No changes needed (hook handles it) |

### Verification

- Generate a 1-minute session (carrier 200, beat 10, noise 15%).
- Listen through one full loop boundary (~30 seconds). There must be **zero** volume dip or swell.
- Stop mid-playback — volume should fade out smoothly over ~2 seconds.
- Start playback — volume should fade in smoothly over ~3 seconds.

---

## Task 2: Save Binaural Beat Params to Session

### Goal

When a user generates a binaural beat, save the generation parameters as JSON metadata so that:
1. The beat can be displayed in the chat history as a card the user can replay.
2. We can later build a "presets" marketplace/community feature.
3. The user can re-generate the exact same beat on demand.

### Architecture

No file storage needed. The binaural params are ~100 bytes of JSON. Store them as metadata on the Oracle chat message itself.

### Step 2.1: Define the BinauralBeatParams Type

In `src/lib/binaural-presets.ts`, add:

```typescript
export interface BinauralBeatParams {
  /** Version for future migrations */
  version: 1;
  /** Carrier frequency in Hz (left ear) */
  carrierHz: number;
  /** Beat frequency in Hz (difference between left and right) */
  beatHz: number;
  /** Pink noise volume 0.0–0.5 */
  pinkNoiseVolume: number;
  /** Session duration in seconds (playback duration, not loop length) */
  durationSeconds: number;
  /** Brain state preset ID, or "custom" if user manually adjusted */
  presetId: string;
  /** ISO timestamp of generation */
  generatedAt: string;
}
```

### Step 2.2: Modify oracle-input.tsx / Chat Page Flow

Currently, `BinauralBeatsCard` is a self-contained component that only plays audio. It needs to communicate the generated params back to the parent so they can be saved.

**Option A (Recommended): Callback prop**

Add an `onGenerate` callback prop to `BinauralBeatsCard`:

```typescript
interface BinauralBeatsCardProps {
  onDismiss: () => void;
  onGenerate?: (params: BinauralBeatParams) => void;
}
```

When the user clicks "Generate & Play" and the audio starts playing successfully (status transitions to `"playing"`), call `onGenerate` with the full params object.

In `oracle-input.tsx`, pass this callback. In the chat page (`src/app/oracle/chat/[sessionId]/page.tsx`), handle the callback by saving the params as a special user message or by calling a Convex mutation to attach metadata to the session.

**The simplest approach:** When `onGenerate` fires, automatically send a structured user message like:

```
[BINAURAL_BEAT]
{"version":1,"carrierHz":200,"beatHz":10,...}
[/BINAURAL_BEAT]
```

This message gets saved via the existing `addMessageMutation` and appears in the chat as a binaural beat card (see Step 2.3).

### Step 2.3: Render Saved Beats in Chat History

In the chat message rendering loop (`src/app/oracle/chat/[sessionId]/page.tsx`), detect messages that contain the `[BINAURAL_BEAT]...[/BINAURAL_BEAT]` wrapper. Instead of rendering them as normal text messages, render them as a `BinauralBeatHistoryCard` — a compact card that shows:

- The brain state name and carrier Hz
- A "Play" button that regenerates the beat from the saved params
- A "Stop" button when playing
- Elapsed time / duration

This card uses the same `useBinauralPlayer` hook internally. When the user clicks "Play", it calls `generate()` with the saved params — the Worker regenerates the identical WAV from the same inputs.

### Step 2.4: Helper to Parse Saved Params

Create `src/lib/binaural-presets.ts` (append to existing file):

```typescript
export function isBinauralBeatMessage(content: string): boolean {
  return content.startsWith("[BINAURAL_BEAT]") && content.includes("[/BINAURAL_BEAT]");
}

export function parseBinauralBeatMessage(content: string): BinauralBeatParams | null {
  const match = content.match(/\[BINAURAL_BEAT\]\n?([\s\S]*?)\n?\[\/BINAURAL_BEAT\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.version === 1 && typeof parsed.carrierHz === "number") {
      return parsed as BinauralBeatParams;
    }
  } catch {}
  return null;
}

export function serializeBinauralBeatMessage(params: BinauralBeatParams): string {
  return `[BINAURAL_BEAT]\n${JSON.stringify(params, null, 2)}\n[/BINAURAL_BEAT]`;
}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/oracle/input/binaural-beat-history-card.tsx` | Compact replay card for chat history |

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/binaural-presets.ts` | Add `BinauralBeatParams` type, parse/serialize helpers |
| `src/components/oracle/input/binaural-beats-card.tsx` | Add `onGenerate` callback, build `BinauralBeatParams` and call it |
| `src/components/oracle/input/oracle-input.tsx` | Pass `onGenerate` through to `BinauralBeatsCard` |
| `src/app/oracle/chat/[sessionId]/page.tsx` | Handle `onGenerate` by sending structured message; detect & render beat cards in chat |

### Important Notes

- **Do NOT modify existing Convex schema.** The binaural beat data is stored as a regular user message with a special text format. This avoids any migration.
- **Do NOT modify any existing message sending logic.** The `onGenerate` callback fires independently of the normal send flow. It calls `addMessageMutation` directly with the serialized beat params.
- **The beat card should NOT trigger Oracle AI response.** It's a metadata message, not a question. After saving the beat message, do NOT call `invokeOracle`. Just save it and render it.
- The `BinauralBeatHistoryCard` should use its own instance of `useBinauralPlayer` (each card in the chat has its own player state).

### Verification

- Generate a beat. Close the card. Scroll up in the chat. The beat should appear as a compact card with the params.
- Click "Play" on the history card. The beat should regenerate and play.
- Refresh the page. The beat card should still render from the persisted message.

---

## Task 3: Preset Quick-Select

### Goal

Allow users to save their own custom binaural beat formulas and quick-select from a list of presets (both built-in and user-created).

### Step 3.1: Built-in Presets Already Exist

The existing `BRAIN_STATE_PRESETS` in `src/lib/binaural-presets.ts` are the built-in presets. No changes needed.

### Step 3.2: User Custom Presets (Future — Spec Only)

This is **not** to be implemented now. Just ensure the `BinauralBeatParams` type and the serialization format support it. Specifically:

- The `presetId` field in `BinauralBeatParams` should be `"custom"` when the user manually adjusted params away from a built-in preset, or the built-in preset ID (e.g. `"relaxed_focus"`) when they used one directly.
- When we later add user presets, we'll add a `name` field and store them in Convex. The current schema doesn't need to change.

### Verification (for this task)

- When generating with a built-in preset selected, the saved params have `presetId: "relaxed_focus"` (or whichever).
- When generating after manually adjusting carrier Hz away from the preset default, the saved params have `presetId: "custom"`.

---

## Implementation Order

1. **Task 1** (fade fix) — Do this first. It's a quick fix to DSP + hook and makes the feature actually usable.
2. **Task 2** (save params) — Depends on Task 1 being done. This is the bulk of the work.
3. **Task 3** (preset tracking) — This is just ensuring the `presetId` field is populated correctly. Trivial once Task 2 is done.

## Quality Gates

Before marking complete, verify:

- [ ] 30-second loop is seamless — no volume dip or swell at loop boundary
- [ ] Fade-in on start is smooth (3 seconds)
- [ ] Fade-out on stop is smooth (2 seconds), including auto-stop at session end
- [ ] Generating a beat saves a structured message to the chat
- [ ] The saved message renders as a replayable card, not raw text
- [ ] Clicking Play on the history card regenerates and plays the beat
- [ ] Refreshing the page preserves the beat card in chat history
- [ ] `presetId` is correctly set to the built-in preset ID or `"custom"`
- [ ] Beat messages do NOT trigger Oracle AI responses
- [ ] No existing oracle-input.tsx or chat page features are broken

## Existing File Map (for reference)

```
workers/binaural-worker/
  wrangler.toml
  src/index.ts          ← Worker entry: POST /binaural/generate
  src/dsp.ts            ← DSP: generateBinauralPCM + buildWav

src/
  lib/binaural-presets.ts              ← Preset definitions, types
  hooks/use-binaural-player.ts         ← Web Audio API hook
  components/oracle/input/
    oracle-input.tsx                   ← Main input bar with + menu
    binaural-beats-card.tsx            ← Controls + playing UI
  app/oracle/chat/[sessionId]/page.tsx ← Chat page with message rendering
```
