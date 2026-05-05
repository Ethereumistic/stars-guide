# Task: AI-Generated Binaural Beats via Natural Language

> Implement natural-language binaural beat generation in the Oracle. When a user expresses binaural/sound-healing intent (e.g. "Generate a meditation beat for my moon sign" or "I need a focus frequency during mercury retrograde"), the Oracle AI produces a structured `[BINAURAL_PRESCRIPTION]` block in its response. The frontend parses this block, strips it from the visible text, and renders a playable `BinauralBeatHistoryCard` inline in the chat — just like manual beats, but AI-personalized to the user's birth chart and stated need.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Frequency Reference Guide](#2-frequency-reference-guide)
3. [Intent Classification](#3-intent-classification)
4. [Prompt Injection](#4-prompt-injection)
5. [Server-Side Changes (Oracle LLM)](#5-server-side-changes-oracle-llm)
6. [Frontend Parsing & Serialization](#6-frontend-parsing--serialization)
7. [Chat Rendering](#7-chat-rendering)
8. [File Map & Exact Paths](#8-file-map--exact-paths)
9. [Implementation Order](#9-implementation-order)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Architecture Overview

```
User types: "Create a sleep beat aligned with my water sign placements"
   │
   ├─ Step 1: Intent Classification (features.ts)
   │   classifyOracleToolIntent() detects binaural intent
   │   → auto-activates "binaural_beats" feature on the session
   │
   ├─ Step 2: Prompt Injection (llm.ts → promptBuilder.ts)
   │   buildSystemPrompt() includes [BINAURAL PRESCRIPTION MODE] block
   │   buildUserMessage() includes [BIRTH CHART DATA] (if user has birth data)
   │
   ├─ Step 3: Oracle AI Response
   │   Oracle AI outputs markdown response + embedded [BINAURAL_PRESCRIPTION] block
   │
   ├─ Step 4: Frontend Parse (chat/[sessionId]/page.tsx)
   │   isPrescriptionMessage() detects block in assistant message
   │   parsePrescription() extracts params + rationale
   │   stripPrescriptionFromContent() removes block from visible text
   │
   └─ Step 5: Render
       Visible text → ReactMarkdown as normal
       Prescription → BinauralBeatHistoryCard (playable, saveable)
```

### Key Design Principles

- **Existing patterns**: Follow the exact same architecture as birth chart intent classification → feature activation → prompt injection → structured output → frontend parse. Study how `classifyOracleToolIntent()`, `birth_chart` feature injection, and `parseTitleFromResponse()` work.
- **No new backend tables**: The prescription is embedded in the assistant message content. No new Convex tables needed.
- **Reuse existing audio engine**: `BinauralBeatHistoryCard` + `useBinauralPlayer` already handle playback. The prescription just produces `BinauralBeatParams` — the same type the history card already accepts.
- **Beat messages do NOT invoke Oracle**: When a beat is saved to chat (manual or AI-generated), it's a metadata message. The existing `handleBinauralGenerate` already skips `invokeOracle`.

---

## 2. Frequency Reference Guide

This section defines the frequency ranges the Oracle AI must respect when generating prescriptions. Include this reference in the prompt injection so the AI stays within scientifically grounded and sonically usable boundaries.

### 2.1 Brain State Frequency Bands (Beat Frequency = |rightHz − leftHz|)

| Band | Beat Range | State | Use Case |
|---|---|---|---|
| Delta | 0.5–4 Hz | Deep Sleep | Sleep aid, healing, unconscious repair |
| Theta | 4–8 Hz | Deep Meditation | Meditation, creativity, emotional processing |
| Alpha | 8–13 Hz | Relaxed Focus | Relaxation, light meditation, stress relief |
| Beta | 13–30 Hz | Active Concentration | Focus, problem-solving, productivity |
| Gamma | 30–40 Hz | Peak Performance | High cognition, insight, processing speed |

**Hard limit**: Beat frequency MUST be between 0.5 and 40 Hz. Beyond 40 Hz the binaural effect is imperceptible and produces discomfort.

### 2.2 Carrier Frequency Ranges (leftHz / rightHz)

The carrier frequency is the base tone. The beat frequency is layered on top as a difference between left and right ear.

| Purpose | Carrier Range | Rationale |
|---|---|---|
| Deep Sleep / Delta | 60–120 Hz | Low carriers feel physically soothing, blend with brown noise |
| Theta / Meditation | 100–200 Hz | Mid-low carriers feel warm and enveloping |
| Alpha / Relaxation | 150–300 Hz | Balanced carriers, pleasant without being distracting |
| Beta / Focus | 200–400 Hz | Mid carriers maintain alertness without harshness |
| Gamma / Peak | 300–500 Hz | Higher carriers feel energizing and crisp |

**Hard limits**:
- Minimum carrier: 40 Hz (below this, sine waves become felt rather than heard, causing discomfort)
- Maximum carrier: 600 Hz (above this, binaural perception degrades and tones become piercing)
- The two carriers (leftHz, rightHz) must be close enough that the brain can fuse them: `max(rightHz, leftHz) - min(rightHz, leftHz) ≤ 40`

### 2.3 Waveform Selection

| Waveform | Character | When to Use |
|---|---|---|
| `sine` | Pure, clean, neutral | Sleep, meditation, relaxation — most use cases |
| `triangle` | Warmer, slightly richer harmonics | Focus, concentration, when a fuller tone is preferred |

**Default to `sine` unless the user specifically wants a richer tone.**

### 2.4 Ambient Noise Layer

| Noise Type | noiseCutoff Range | Character |
|---|---|---|
| Brown noise | 100–300 Hz | Deep rumble, very soothing — ideal for sleep/delta |
| Pink noise | 300–1000 Hz | Balanced, natural — ideal for meditation/theta/alpha |
| White noise | 1000–3000 Hz | Bright, hissing — useful for focus/beta/gamma masking |

| Parameter | Range | Notes |
|---|---|---|
| `noiseVolume` | 0.0–0.5 | Default to 0.05–0.15 for most presets. Go higher (0.2–0.3) for sleep or if the user wants "immersive" texture. 0 = no noise. |
| `noiseCutoff` | 100–3000 Hz | Controls the tone character. Lower = brown, higher = white. |

### 2.5 Duration

| Duration | Typical Use |
|---|---|
| 900 seconds (15 min) | Quick focus session, light meditation |
| 1200 seconds (20 min) | Standard session |
| 1800 seconds (30 min) | Deep meditation, extended focus |
| 3600 seconds (60 min) | Sleep, long meditation |

Let the user's stated need drive duration. Default to 1800 if unspecified.

### 2.6 Per-Ear Volume

| Parameter | Range | Default |
|---|---|---|
| `leftVolume` | 0.0–1.0 | 1.0 |
| `rightVolume` | 0.0–1.0 | 1.0 |

Default both to 1.0. Only adjust for specific reasons:
- User has hearing imbalance
- AI wants to create a specific spatial effect (e.g., emphasizing left hemisphere processing)
- User explicitly requests channel balance change

---

## 3. Intent Classification

### File to modify: `src/lib/oracle/features.ts`

Add binaural intent patterns to `classifyOracleToolIntent()`. These are checked AFTER journal recall patterns and AFTER birth chart patterns, since binaural intent is less common than chart intent.

### 3.1 Intent Patterns

```typescript
const BINAURAL_INTENT_PATTERNS: RegExp[] = [
  // Explicit generation requests
  /\b(generate|create|make|craft|compose)\s+(a\s+)?(binaural\s+)?beat/i,
  /\b(generate|create|make)\s+(a\s+)?(sound|frequency|tone|audio)\s+(for|tuned|aligned)/i,

  // Binaural-specific keywords
  /\bbinaural\b.*\b(for|tuned|aligned|my|generate|create)\b/i,
  /\b(frequency|frequencies)\s+(for|tuned|aligned|to\s+my)\b/i,

  // Intent + frequency/beat combination
  /\b(sleep|meditation|focus|concentration|relaxation|peak)\s+(frequency|frequencies|beat|beats|tone|tones|sound|sounds)\b/i,
  /\b(beat|beats|tone|tones)\s+(for|to\s+help|to\s+aid)\s+(sleep|meditation|focus|concentration|relaxation)\b/i,

  // Astrological + frequency crossover
  /\bbinaural\b.*\b(my\s+)?(chart|sign|birth|sun|moon|rising|placement|element)\b/i,
  /\b(frequency|sound|beat)\s+(for|aligned|tuned)\s+.*\b(sign|chart|moon|sun|mercury|venus|mars|retrograde|transit)\b/i,

  // "Sound healing" / "frequency healing" style requests
  /\b(sound\s+healing|frequency\s+healing|solfeggio|healing\s+frequency|healing\s+sound)\b/i,
  /\b(sleep\s+frequency|meditation\s+frequency|focus\s+frequency)\b/i,
]
```

### 3.2 Classifier Integration

In `classifyOracleToolIntent()`, add a new block AFTER the birth chart classification (step 2/3) and BEFORE the "no match" fallback (step 4):

```typescript
// 3. Binaural beats — sound/frequency intent
if (BINAURAL_INTENT_PATTERNS.some((p) => p.test(question))) {
  return { featureKey: "binaural_beats", reason: "binaural_intent" }
}

// 4. No match
return { featureKey: null, reason: "no_match" }
```

**Note**: Binaural intent does NOT require `hasBirthData`. A user without birth data can still request a generic beat ("Generate a focus beat for me"). However, when birth data IS present, the prompt injection will include chart data for personalized generation.

---

## 4. Prompt Injection

### 4.1 Feature Injection Text

When `activeFeature.key === "binaural_beats"`, inject the binaural prescription mode block into the system prompt. This follows the exact same pattern as the birth chart depth injection.

**Location in `convex/oracle/llm.ts`** — in the feature injection block (around line 179-197), add a case for `binaural_beats`:

```typescript
if (activeFeature.key === "birth_chart") {
  // ... existing birth chart depth logic ...
} else if (activeFeature.key === "binaural_beats") {
  // Try DB injection first (admin-editable), fall back to hardcoded
  try {
    const binauralRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
      featureKey: "binaural_beats",
    });
    featureInjection = binauralRecord?.contextText ?? getBinauralPrescriptionInstructions();
  } catch (e) {
    featureInjection = getBinauralPrescriptionInstructions();
  }
} else {
  // ... existing generic fallback ...
}
```

### 4.2 The Prescription Mode Block (hardcoded fallback)

Create this function in `src/lib/oracle/featureContext.ts` (or a new file, following the existing pattern):

```typescript
export function getBinauralPrescriptionInstructions(): string
```

The returned string should contain:

```
[BINAURAL PRESCRIPTION MODE]

You have the ability to generate personalized binaural beat prescriptions. When the user asks for a beat, frequency, or sound session, output a [BINAURAL_PRESCRIPTION] block.

## How Binaural Beats Work
Two slightly different frequencies play into each ear via headphones. The brain perceives a third "beat" equal to the difference. This beat entrains brainwaves toward specific mental states.

## Frequency Guidelines (MUST respect these limits)

### Beat Frequency (|rightHz − leftHz|) — determines the mental state:
- Delta (0.5–4 Hz): Deep Sleep — physical healing, unconscious repair
- Theta (4–8 Hz): Deep Meditation — creativity, emotional processing, spiritual work
- Alpha (8–13 Hz): Relaxed Focus — stress relief, light meditation, calm alertness
- Beta (13–30 Hz): Active Concentration — productivity, problem-solving, analytical work
- Gamma (30–40 Hz): Peak Performance — high cognition, insight, rapid processing
- HARD LIMIT: Beat frequency MUST be 0.5–40 Hz. Never exceed 40 Hz.

### Carrier Frequency (leftHz / rightHz) — the audible tone:
- Sleep/Delta: 60–120 Hz
- Meditation/Theta: 100–200 Hz
- Relaxation/Alpha: 150–300 Hz
- Focus/Beta: 200–400 Hz
- Peak/Gamma: 300–500 Hz
- HARD LIMITS: Carrier must be 40–600 Hz. The two carriers must be within 40 Hz of each other.

### Waveform:
- "sine": Pure, clean tone. Default for sleep, meditation, relaxation.
- "triangle": Warmer with harmonics. Good for focus, concentration.
- Default to "sine" unless the user wants a richer tone.

### Ambient Noise:
- noiseVolume: 0.0–0.5. Default 0.08–0.15. Higher for sleep (0.15–0.25).
- noiseCutoff: 100–3000 Hz. 100–300 = brown (deep, soothing), 300–1000 = pink (balanced), 1000+ = white (bright).
- Use brown noise for sleep/delta, pink for meditation/alpha, white for focus/beta.

### Duration:
- Default 1800 (30 minutes) unless the user specifies otherwise.
- Common: 900 (15m), 1200 (20m), 1800 (30m), 3600 (60m).

### Volume:
- leftVolume and rightVolume: 0.0–1.0, default both 1.0.
- Only adjust for specific reasons (user has hearing imbalance, wants spatial effect).

## Personalization Using Birth Chart Data

If [BIRTH CHART DATA] is present in the user's message, use it to personalize the prescription:

### Element-based frequency tendencies:
- Fire signs (Aries, Leo, Sagittarius): Higher carriers (300–500 Hz), Beta/Gamma beats. These placements thrive with energizing frequencies.
- Earth signs (Taurus, Virgo, Capricorn): Lower carriers (80–200 Hz), Delta/Alpha beats. These placements respond to grounding frequencies.
- Air signs (Gemini, Libra, Aquarius): Mid carriers (200–350 Hz), Alpha/Beta beats. These placements benefit from mentally stimulating frequencies.
- Water signs (Cancer, Scorpio, Pisces): Low-mid carriers (100–250 Hz), Theta/Alpha beats. These placements resonate with emotionally flowing frequencies.

### Placement-based personalization:
- Moon sign: Primary influence on emotional/meditative beats. Match the beat frequency to the moon's element.
- Sun sign: General energy baseline and carrier frequency range.
- Rising/Ascendant: Modulates waveform preference — fire/air risings may prefer triangle, earth/water risings prefer sine.
- Mercury placement: Relevant for focus/study beats. Retrograde Mercury → lower carrier, calmer beat.
- Mars placement: Relevant for energy/peak-performance beats. Mars sign element drives the frequency range.

### Contextual adjustments:
- Mercury retrograde: Lower the carrier by 20–40 Hz. Use sine waveform. Shift toward alpha/theta.
- Saturn transit/heavy Saturn: Use lower carriers, add brown noise texture for grounding.
- Jupiter transit: Can support higher carriers and gamma experimentation.
- Eclipses or intense transits: Default to calming theta/alpha with brown/pink noise.

## Output Format

When generating a binaural beat, you MUST output a [BINAURAL_PRESCRIPTION] block. Place it at the END of your response, after your explanatory text.

### Format:
[BINAURAL_PRESCRIPTION]
{
  "leftHz": <number>,
  "rightHz": <number>,
  "leftVolume": <number, 0.0–1.0>,
  "rightVolume": <number, 0.0–1.0>,
  "waveform": "<sine|triangle>",
  "noiseVolume": <number, 0.0–0.5>,
  "noiseCutoff": <number, 100–3000>,
  "durationSeconds": <number>,
  "presetId": "ai_generated",
  "version": 2,
  "generatedAt": "<ISO 8601 timestamp>",
  "rationale": {
    "intent": "<what the user asked for>",
    "beatBand": "<Delta|Theta|Alpha|Beta|Gamma>",
    "beatHz": <number>,
    "personalization": "<brief explanation of how chart data influenced the choice, or null if no chart data>"
  }
}
[/BINAURAL_PRESCRIPTION]

### Rules:
1. Always validate: beatHz = |rightHz − leftHz| must fall within the target band.
2. Always validate: both carriers within 40–600 Hz.
3. Always validate: |rightHz − leftHz| ≤ 40.
4. The rationale.personalization field should be 1–2 sentences explaining the astrological reasoning, or null if no birth data is available.
5. Output the block EXACTLY as shown — do not add markdown formatting (```json etc) around it.
6. You may output multiple [BINAURAL_PRESCRIPTION] blocks if the user asks for multiple beats, but default to one.

[END BINAURAL PRESCRIPTION MODE]
```

### 4.3 Important: Birth Chart Data Is Already Injected

The `buildUserMessage()` function in `lib/oracle/promptBuilder.ts` already injects `[BIRTH CHART DATA]` into the user message when the user has birth data on file. The binaural prescription mode block references this data by name. **No changes needed to the user message builder.**

---

## 5. Server-Side Changes (Oracle LLM)

### File: `convex/oracle/llm.ts`

#### 5.1 Feature injection for `binaural_beats`

In the `invokeOracle` handler, in the feature injection section (currently handles `birth_chart` and generic features), add a specific case for `binaural_beats`:

```typescript
// Around line 190 in the existing code:
if (activeFeature.key === "birth_chart") {
  // ... existing birth chart logic ...
} else if (activeFeature.key === "binaural_beats") {
  try {
    const binauralRecord = await ctx.runQuery(api.oracle.features.getFeatureInjection, {
      featureKey: "binaural_beats",
    });
    featureInjection = binauralRecord?.contextText ?? getBinauralPrescriptionInstructions();
  } catch (e) {
    featureInjection = getBinauralPrescriptionInstructions();
  }
} else {
  // ... existing generic fallback for other features ...
}
```

#### 5.2 Import the new function

Add to imports at the top of `convex/oracle/llm.ts`:
```typescript
import { getBinauralPrescriptionInstructions } from "../../lib/oracle/featureContext";
```

Or create a separate file `lib/oracle/binauralContext.ts` and import from there — whichever matches the project's preference for modularity.

#### 5.3 Post-processing: Strip Prescription from Stored Content

The `[BINAURAL_PRESCRIPTION]` block must be present in the AI's raw response for the frontend to parse, but should be stripped from the message content before storing in Convex so it doesn't appear as visible text.

**In `callProviderStreaming()`** (both streaming and non-streaming paths), after `parseJournalPromptFromResponse()`, add:

```typescript
import { stripPrescriptionFromContent } from "../../lib/oracle/binauralPrescription"; // or wherever you put it

// After journal prompt parsing:
const { contentWithoutPrescription, prescriptions } = parsePrescriptionsFromContent(contentWithoutPrompt);
```

Then store `contentWithoutPrescription` as the message content, but attach the prescriptions as metadata.

**However**, there's a simpler approach: let the raw content (including the prescription block) be stored as-is in Convex. The frontend already handles stripping when rendering (see Section 7). This avoids touching the server-side response pipeline at all.

**Recommended approach: Store the prescription block in the message content, let the frontend strip it during rendering.** This is simpler and matches how `TITLE:` and `JOURNAL_PROMPT:` are handled — parsed out of the stored content on the client side.

---

## 6. Frontend Parsing & Serialization

### File: `src/lib/binaural-presets.ts`

Add the following functions alongside the existing `serializeBeat`, `parseBeat`, `isBeatMessage`:

#### 6.1 Prescription Rationale Type

```typescript
export interface BinauralRationale {
  intent: string
  beatBand: string
  beatHz: number
  personalization: string | null
}
```

#### 6.2 Detection

```typescript
export function isPrescriptionMessage(content: string): boolean {
  return content.includes("[BINAURAL_PRESCRIPTION]")
}
```

#### 6.3 Parsing

```typescript
export function parsePrescription(content: string): (BinauralBeatParams & { rationale?: BinauralRationale }) | null {
  const match = content.match(/\[BINAURAL_PRESCRIPTION\]\s*({[\s\S]*?})\s*\[\/BINAURAL_PRESCRIPTION\]/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[1])

    // Validate required fields exist and are numbers
    if (typeof raw.leftHz !== "number" || typeof raw.rightHz !== "number") return null

    // Clamp to safe ranges (defensive — the AI should respect limits, but we enforce)
    const result: BinauralBeatParams & { rationale?: BinauralRationale } = {
      version: 2,
      leftHz: Math.max(40, Math.min(600, raw.leftHz)),
      rightHz: Math.max(40, Math.min(600, raw.rightHz)),
      leftVolume: Math.max(0, Math.min(1, raw.leftVolume ?? 1)),
      rightVolume: Math.max(0, Math.min(1, raw.rightVolume ?? 1)),
      waveform: raw.waveform === "triangle" ? "triangle" : "sine", // only allow these two
      noiseVolume: Math.max(0, Math.min(0.5, raw.noiseVolume ?? 0.1)),
      noiseCutoff: Math.max(100, Math.min(3000, raw.noiseCutoff ?? 800)),
      durationSeconds: Math.max(300, Math.min(7200, raw.durationSeconds ?? 1800)),
      presetId: "ai_generated",
      generatedAt: raw.generatedAt ?? new Date().toISOString(),
    }

    // Ensure beat frequency doesn't exceed 40 Hz — if it does, move rightHz closer to leftHz
    const beatHz = Math.abs(result.rightHz - result.leftHz)
    if (beatHz > 40) {
      // Keep leftHz fixed, adjust rightHz to be leftHz + 40 (or leftHz - 40)
      result.rightHz = result.leftHz + Math.sign(result.rightHz - result.leftHz) * 40
    }

    if (raw.rationale && typeof raw.rationale === "object") {
      result.rationale = {
        intent: String(raw.rationale.intent ?? ""),
        beatBand: String(raw.rationale.beatBand ?? ""),
        beatHz: Number(raw.rationale.beatHz ?? beatHz),
        personalization: raw.rationale.personalization ? String(raw.rationale.personalization) : null,
      }
    }

    return result
  } catch {
    return null
  }
}
```

#### 6.4 Stripping Prescription from Visible Content

```typescript
export function stripPrescriptionFromContent(content: string): string {
  return content
    .replace(/\[BINAURAL_PRESCRIPTION\]\s*{[\s\S]*?}\s*\[\/BINAURAL_PRESCRIPTION\]/g, "")
    .trim()
}
```

#### 6.5 Parsing Multiple Prescriptions (if AI outputs more than one)

```typescript
export function parseAllPrescriptions(content: string): (BinauralBeatParams & { rationale?: BinauralRationale })[] {
  const results: (BinauralBeatParams & { rationale?: BinauralRationale })[] = []
  const regex = /\[BINAURAL_PRESCRIPTION\]\s*({[\s\S]*?})\s*\[\/BINAURAL_PRESCRIPTION\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const parsed = parsePrescription(match[0])
    if (parsed) results.push(parsed)
  }
  return results
}
```

---

## 7. Chat Rendering

### File: `src/app/oracle/chat/[sessionId]/page.tsx`

In the message rendering loop (where messages are mapped to JSX), modify the **assistant message** rendering to detect and handle prescription blocks.

#### 7.1 Current Pattern (for reference)

Currently, user messages are checked for beat messages:
```tsx
{msg.role === "user" ? (
  isBinauralBeatMessage(msg.content) ? (
    <BinauralBeatHistoryCard params={...} />
  ) : (
    // normal user bubble
  )
) : msg.role === "assistant" ? (
  // assistant message rendering
) : null}
```

#### 7.2 New Pattern for Assistant Messages

Inside the `msg.role === "assistant"` branch, before the existing rendering logic, check for prescriptions:

```tsx
// Inside the assistant branch:
const hasPrescription = isPrescriptionMessage(msg.content)
const prescriptionParams = hasPrescription ? parsePrescription(msg.content) : null
const cleanContent = hasPrescription ? stripPrescriptionFromContent(msg.content) : msg.content
```

Then render:
```tsx
// Use cleanContent instead of msg.content for the markdown rendering:
<AssistantMessageContent content={cleanContent} isStreamingThis={isStreamingThis} />

// After the assistant message bubble, render the prescription card:
{!isStreamingThis && prescriptionParams && (
  <div className="mt-3">
    {/* Optional: show rationale */}
    {prescriptionParams.rationale && (
      <p className="text-[10px] text-white/35 italic mb-1.5 pl-1">
        {prescriptionParams.rationale.beatBand} beat
        {prescriptionParams.rationale.personalization
          ? ` — ${prescriptionParams.rationale.personalization}`
          : ""}
      </p>
    )}
    <BinauralBeatHistoryCard params={prescriptionParams} />
  </div>
)}
```

**During streaming** (`isStreamingThis === true`): Don't try to parse prescriptions from partial content. The block might be incomplete. Just render whatever content is available (the streaming display already handles partial content gracefully). Once streaming completes, the prescription will appear.

A good approach: check for prescriptions only when `!isStreamingThis` (message is complete). During streaming, just render the raw content including any partial prescription text — it'll look a bit messy for a moment but self-corrects when the message finalizes.

Alternatively, you can suppress prescription-tag rendering during streaming:
```tsx
const displayContent = isStreamingThis
  ? msg.content.replace(/\[BINAURAL_PRESCRIPTION\][\s\S]*$/, "🎵 Generating beat...")
  : cleanContent
```

---

## 8. File Map & Exact Paths

### Files to CREATE or MODIFY:

| File | Action | What to do |
|---|---|---|
| `src/lib/binaural-presets.ts` | **MODIFY** | Add `isPrescriptionMessage()`, `parsePrescription()`, `stripPrescriptionFromContent()`, `parseAllPrescriptions()`, `BinauralRationale` type |
| `src/lib/oracle/features.ts` | **MODIFY** | Add `BINAURAL_INTENT_PATTERNS` array, add binaural check in `classifyOracleToolIntent()` |
| `src/lib/oracle/featureContext.ts` | **MODIFY** | Add `getBinauralPrescriptionInstructions()` export |
| `convex/oracle/llm.ts` | **MODIFY** | Add `binaural_beats` case in feature injection block, import `getBinauralPrescriptionInstructions` |
| `src/app/oracle/chat/[sessionId]/page.tsx` | **MODIFY** | Import prescription helpers, detect prescriptions in assistant messages, render `BinauralBeatHistoryCard` with rationale |
| `src/components/oracle/input/binaural-beat-history-card.tsx` | **MODIFY** | Optional: Add "AI Generated" badge when `params.presetId === "ai_generated"`, show rationale text |

### Files to REFERENCE (read-only, do not modify):

| File | Why |
|---|---|
| `src/hooks/use-binaural-player.ts` | Audio engine API — `play()` accepts `BinauralParams`, used by history card |
| `src/components/oracle/input/binaural-beats-card.tsx` | Manual beat creation card — reference for how `onGenerate` works |
| `src/components/oracle/input/oracle-input.tsx` | Where `BinauralBeatsCard` is mounted — `onBinauralGenerate` prop |
| `src/app/oracle/new/page.tsx` | New session page — now passes `onBinauralGenerate` (recently fixed) |
| `lib/oracle/promptBuilder.ts` | `buildSystemPrompt()`, `buildUserMessage()`, `parseTitleFromResponse()` — understand the layered prompt assembly |
| `lib/oracle/safetyRules.ts` | Always first in system prompt — prescription mode goes after these |
| `convex/oracle/features.ts` | `getFeatureInjection` query — DB-backed feature injection lookup |
| `src/store/use-oracle-store.ts` | Oracle state management — understand `setConversationActive`, `setIsStreaming` |
| `tasks/binaural/BINAURAL_BEATS_DOCS.md` | Full system architecture doc — read for deep context on existing implementation |

---

## 9. Implementation Order

Do these steps in order. Each step should be testable independently.

### Step 1: Frontend Parsing (binaural-presets.ts)

Add the prescription types and helper functions. This has no dependencies on other changes and can be tested with unit tests or browser console.

**Test**: Import the helpers and test with a sample prescription string:
```typescript
const test = '[BINAURAL_PRESCRIPTION]{"leftHz":200,"rightHz":210,"leftVolume":1,"rightVolume":1,"waveform":"sine","noiseVolume":0.1,"noiseCutoff":800,"durationSeconds":1800,"presetId":"ai_generated","version":2,"generatedAt":"2025-01-01T00:00:00Z","rationale":{"intent":"Focus beat for Gemini sun","beatBand":"Alpha","beatHz":10,"personalization":"Gemini air sign → mid carrier, alpha beat"}}[/BINAURAL_PRESCRIPTION]'

console.log(isPrescriptionMessage(test)) // true
console.log(parsePrescription(test)) // parsed object
console.log(stripPrescriptionFromContent("Some text " + test + " more text")) // "Some text  more text"
```

### Step 2: Intent Classification (features.ts)

Add the `BINAURAL_INTENT_PATTERNS` and integrate into `classifyOracleToolIntent()`.

**Test**: Call the classifier directly:
```typescript
classifyOracleToolIntent("Generate a sleep beat for me", null, false, false)
// → { featureKey: "binaural_beats", reason: "binaural_intent" }

classifyOracleToolIntent("Create a meditation frequency aligned with my moon sign", null, true, false)
// → { featureKey: "binaural_beats", reason: "binaural_intent" }

classifyOracleToolIntent("Analyze my birth chart in depth", null, true, false)
// → { featureKey: "birth_chart", depth: "full", reason: "deep_chart_intent" } (not binaural)

classifyOracleToolIntent("What's my horoscope today?", null, false, false)
// → { featureKey: null, reason: "no_match" }
```

### Step 3: Prompt Injection (featureContext.ts + llm.ts)

Add `getBinauralPrescriptionInstructions()` and the feature injection case in the LLM handler.

**Test**: Create a new Oracle session, type "Generate a focus beat for me". Verify in the Oracle debug panel that the system prompt includes `[BINAURAL PRESCRIPTION MODE]`.

### Step 4: Chat Rendering (chat/[sessionId]/page.tsx)

Add prescription detection and rendering in assistant messages.

**Test**: Ask the Oracle to generate a beat. Verify:
1. The assistant response renders as normal markdown (no visible `[BINAURAL_PRESCRIPTION]` tags)
2. A `BinauralBeatHistoryCard` appears below the response
3. Clicking Play on the card produces audio
4. The rationale text appears above the card

### Step 5: Polish (binaural-beat-history-card.tsx)

Optional improvements:
- Show "AI Generated" badge when `presetId === "ai_generated"`
- Show rationale text (personalization explanation)
- Allow saving the AI-generated beat as a new manual message (so the user can replay it later without scrolling back)

---

## 10. Testing Checklist

### Intent Classification
- [ ] "Generate a sleep beat for me" → `binaural_beats`
- [ ] "Create a meditation frequency aligned with my moon sign" → `binaural_beats`
- [ ] "I need a focus beat during mercury retrograde" → `binaural_beats`
- [ ] "Binaural beats for my chart" → `binaural_beats`
- [ ] "Sound healing for relaxation" → `binaural_beats`
- [ ] "Analyze my birth chart in depth" → `birth_chart` (NOT binaural)
- [ ] "What's my horoscope?" → `null` (no match)
- [ ] "Generate a beat" while birth_chart feature is already active → `null` (manual override, don't reclassify)

### Prompt Injection
- [ ] When `binaural_beats` feature is active, system prompt includes `[BINAURAL PRESCRIPTION MODE]`
- [ ] Birth chart data is injected into user message when user has birth data on file
- [ ] Prescription mode block includes all frequency constraints
- [ ] Prescription mode block includes element-based personalization guidelines

### AI Output
- [ ] Oracle AI outputs a valid `[BINAURAL_PRESCRIPTION]...[/BINAURAL_PRESCRIPTION]` block
- [ ] Block contains valid JSON with all required fields
- [ ] `leftHz` and `rightHz` are within 40–600 Hz
- [ ] Beat frequency `|rightHz - leftHz|` is within 0.5–40 Hz
- [ ] `waveform` is either "sine" or "triangle"
- [ ] `noiseVolume` is within 0.0–0.5
- [ ] `noiseCutoff` is within 100–3000
- [ ] `presetId` is "ai_generated"
- [ ] `rationale` object is present with meaningful text

### Frontend Rendering
- [ ] Prescription block is NOT visible in the rendered markdown
- [ ] `BinauralBeatHistoryCard` renders below the assistant message
- [ ] Card shows correct beat info (Hz, brain state, duration)
- [ ] Play button produces correct audio
- [ ] Auto-stop works at `durationSeconds`
- [ ] Rationale text is displayed above or within the card
- [ ] During streaming, partial prescription text doesn't break the UI

### Edge Cases
- [ ] AI outputs invalid JSON in the prescription block → `parsePrescription` returns null → card doesn't render, text renders as-is
- [ ] AI outputs out-of-range frequencies → parser clamps to safe ranges
- [ ] User has no birth data → beat is generated without personalization, `rationale.personalization` is null
- [ ] User requests multiple beats → `parseAllPrescriptions` handles multiple blocks
- [ ] Streaming response with partial block → doesn't crash, renders correctly when complete
- [ ] Existing manual beat messages still work correctly (backward compatibility with `isBeatMessage`)
- [ ] Beat saved from manual card still works in new session page (Bug 1/2 fix still intact)

### No Regressions
- [ ] Birth chart analysis still works with natural language
- [ ] Journal recall still works with natural language
- [ ] Manual binaural beats card still works (select from `+` menu, tune, play, save)
- [ ] Binaural beats from the `+` menu on new session page still works
- [ ] History card replay still works for previously saved beats
