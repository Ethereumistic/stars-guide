# Binaural Beats: Deterministic Generation via Intent Classification

> The current LLM-based prescription approach is architecturally wrong. This document explains why, how modern AI products actually invoke tools from natural language, and proposes a deterministic generation pipeline that mirrors our birth chart pattern.

---

## 1. The Problem: Asking the LLM to Generate Structured Data

### What we built (and why it fails)

Our initial implementation injects a `[BINAURAL PRESCRIPTION MODE]` block into the system prompt that tells the LLM:

> "You CAN generate binaural beats. Output a `[BINAURAL_PRESCRIPTION]` JSON block. NEVER refuse."

When the user says "generate me a binaural beat", the LLM responds:

> "I cannot generate audio files or binaural beats. I'm an astrological intelligence..."

The prompt instructions failed. The LLM's training overrides the system prompt because:

1. **The LLM thinks it's being asked to produce audio.** "Generate a beat" sounds like "generate a sound file," and the LLM knows it can't do that.
2. **Structured JSON in a special block is unnatural.** The LLM's training strongly biases against outputting non-conversational formats outside of tool-calling contexts.
3. **System prompt overrides are unreliable.** You can say "you CAN do X" all you want, but the model's foundational training wins most fights against prompt injection.

### Why birth chart works and binaural beats doesn't

Birth chart follows a **data-driven** pattern:

```
User: "Analyze my birth chart"
  → Intent classifier detects birth_chart
  → Chart DATA injected into user message: "[BIRTH CHART DATA] Sun: Cancer, Moon: Pisces, ..."
  → Instruction injected into system prompt: "Here's how to format your reading..."
  → LLM reads data and writes text about it ✅ (natural LLM behavior)
```

Binaural beats as originally built follows a **capability-granting** pattern:

```
User: "Generate me a binaural beat"
  → Intent classifier detects binaural_beats
  → Instruction injected into system prompt: "Output this JSON block... You CAN do this..."
  → No data injected — LLM is asked to INVENT structured frequencies
  → LLM refuses because it thinks generating audio is outside its scope ❌
```

The birth chart pattern works because the LLM is doing what LLMs do naturally: **reading data and writing text about it**. The binaural pattern fails because we're asking the LLM to do something unnatural: **output structured JSON masquerading as a capability it doesn't believe it has.**

---

## 2. How Modern AI Products Actually Use Tools

### The function/tool calling API

ChatGPT, Claude, and every serious AI product uses **function calling** (OpenAI) or **tool use** (Anthropic), not prompt injection. Here's how ChatGPT generates images:

```python
# The API call includes a tools definition
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "draw me a cat wearing a hat"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "dall_e_image_generation",
            "description": "Generate an image from a text description",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string"},
                    "size": {"type": "string", "enum": ["1024x1024"]}
                }
            }
        }
    }]
)

# The LLM doesn't generate the image. It outputs a TOOL CALL:
# response.choices[0].message.tool_calls[0] = {
#     "function": {
#         "name": "dall_e_image_generation",
#         "arguments": '{"prompt": "a cat wearing a hat", "size": "1024x1024"}'
#     }
# }

# The SYSTEM executes the tool, gets the image, and returns it.
```

Key insight: **the LLM never generates the image. It generates a tool call.** The system executes the tool. The LLM's job is limited to:
1. Understanding the user's natural language intent
2. Deciding which tool to call
3. Providing the tool's input parameters (which can be simple enums/strings, not complex domain knowledge)

The heavy lifting (image generation, web search, code execution) is always done by deterministic backend code, not by the LLM.

### Why this is robust

The LLM can't "refuse to generate an image" because it's not being asked to. It's being asked: *given these tools, does the user want to use one?* And the LLM is very good at that — it's a classification decision, not a generation task. The LLM sees `"draw me a cat"` and maps it to `dall_e_image_generation({ prompt: "a cat wearing a hat" })`. It doesn't need to know how DALL-E works internally.

### Our Oracle doesn't use tool calling

Looking at our `callProviderStreaming` in `convex/oracle/llm.ts`, we send a plain chat completion request — no `tools` parameter, no function definitions. The model has no concept of what tools are available to it. This is why prompt injection is fragile: the LLM has no structural affordance for "I can do this thing."

---

## 3. Two Approaches: Architecture Comparison

### Approach A: Add Tool Calling (the "proper" way)

Add OpenAI-compatible tool definitions to the API call:

```typescript
const tools = [{
    type: "function",
    function: {
        name: "generate_binaural_beat",
        description: "Generate a binaural beat session for the user. Use this when the user asks for a binaural beat, frequency session, or sound healing.",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    enum: ["sleep", "meditation", "focus", "relaxation", "peak_performance"],
                    description: "The primary mental state the user wants to achieve"
                },
                duration_hint: {
                    type: "string",
                    enum: ["short", "standard", "long"],
                    description: "Quick (15min), standard (30min), or long (60min)"
                }
            },
            required: ["intent"]
        }
    }
}]
```

When the LLM calls `generate_binaural_beat({ intent: "sleep" })`, we:
1. Intercept the tool call in the streaming response
2. Run our deterministic generation logic
3. Return the result to the LLM as a tool message
4. The LLM writes a natural explanation

**Pros:** Robust, scalable (adding future tools is easy), the LLM can't refuse because it's just calling a function, not "generating audio"
**Cons:** Requires significant infrastructure changes (tool calling support in streaming, tool call parsing, multi-turn tool execution loop, changes to message storage)

### Approach B: Deterministic Generation + LLM Explanation (the pragmatic way)

Keep our intent classifier, but move beat generation out of the LLM entirely:

```
User: "gen mi a binaral beatz"
  → Intent classifier detects binaural_beats
  → Backend deterministically generates beat params (from user intent + chart data)
  → Beat params injected into system prompt as CONTEXT (not instructions)
  → LLM told: "A binaural beat has been generated for the user. Explain it."
  → LLM reads the params and writes natural text ✅
  → Beat params stored on message as metadata (not in LLM output)
  → Frontend renders card from metadata
```

This mirrors birth chart exactly:
- Birth chart: inject chart DATA, LLM analyzes it
- Binaural beats: inject beat DATA, LLM explains it

**Pros:** Follows existing pattern, no tool calling infrastructure needed, deterministic frequencies (always safe), LLM can't refuse because it's just explaining something that already exists
**Cons:** The LLM doesn't "choose" the frequencies (but that's actually a strength — deterministic params are safer), less flexible for future tool types

### Recommendation: Approach B

Approach B is the right call because:

1. **It mirrors our most successful pattern.** Birth chart works exactly this way: data-driven, not capability-granting.
2. **Zero infrastructure changes.** No tool calling, no streaming changes, no message schema changes.
3. **Safer frequency ranges.** Deterministic generation with hard clamps is more reliable than LLM-generated JSON that might hallucinate `leftHz: 0` or `rightHz: 9999`.
4. **The LLM can't refuse.** It's just being asked to explain a beat that was already generated. "Here's a binaural beat that was created for you. Explain it." is something no LLM will refuse.
5. **Intent classification stays.** Our regex-based classifier is fast, cheap, and reliable. Tool calling would require a full LLM round-trip just to decide whether to call a tool — slower and more expensive for a decision we can make locally.

---

## 4. Deterministic Beat Generation: Rules & Logic

### 4.1 Intent Extraction

The intent classifier already determines that the user wants a binaural beat. But we also need to determine **what kind** of beat (sleep, focus, meditation, etc.).

This is a **keyword extraction** problem, not an LLM problem:

```typescript
type BinauralIntent = 
  | "sleep" | "meditation" | "focus" | "relaxation" 
  | "peak_performance" | "study" | "creativity" | "healing"

const INTENT_KEYWORDS: Record<BinauralIntent, RegExp[]> = {
  sleep:           [/sl[ei]p/i, /insomnia/i, /dr[ei]m/i, /r[ea]st/i, /\bzzz\b/i],
  meditation:      [/meditat/i, /\bzen\b/i, /mindful/i, /spiritual/i, /inner peace/i],
  focus:           [/focus/i, /concentrat/i, /productiv/i, /stud[iy]/i, /\badhd\b/i, /work/i],
  relaxation:      [/relax/i, /calm/i, /stress/i, /anxious/i, /\bchill\b/i, /unwind/i],
  peak_performance: [/peak/i, /gamma/i, /cognit/i, /performan/i, /sharp/i, /brain power/i],
  study:           [/\bstud[iy]/i, /exam/i, /learn/i, /memor/i, /retain/i],
  creativity:      [/creativ/i, /inspir/i, /flow state/i, /artist/i, /imagin/i],
  healing:         [/heal/i, /recover/i, /repair/i, /restor/i, /pain/i],
}
```

If multiple intents match, use the first match in this priority order: `healing > sleep > meditation > relaxation > creativity > study > focus > peak_performance`. Why? Because healing/sleep are the most specific, and peak_performance is the most general (high beta/gamma can also apply to focus).

If no intent matches, default to **meditation** (the most common binaural use case and the safest default).

### 4.2 Intent → Frequency Mapping

These are the core deterministic rules. The LLM's "personalization" is reduced to explanatory text about WHY these frequencies were chosen — the frequencies themselves are always computed by code.

```typescript
interface BeatProfile {
  leftHz: number          // Carrier frequency (left ear)
  rightHz: number         // Carrier frequency (right ear)  
  waveform: OscillatorType
  noiseVolume: number     // 0.0–0.5
  noiseCutoff: number     // 100–3000 Hz
  durationSeconds: number
  band: string            // Delta|Theta|Alpha|Beta|Gamma
}

const INTENT_PROFILES: Record<BinauralIntent, BeatProfile> = {
  sleep: {
    leftHz: 100, rightHz: 103,    // 3 Hz beat (Delta)
    waveform: "sine",
    noiseVolume: 0.15, noiseCutoff: 300, // Brown noise
    durationSeconds: 3600,         // 60 min
    band: "Delta",
  },
  meditation: {
    leftHz: 150, rightHz: 155,    // 5 Hz beat (Theta)
    waveform: "sine",
    noiseVolume: 0.10, noiseCutoff: 500, // Pink noise
    durationSeconds: 1800,         // 30 min
    band: "Theta",
  },
  relaxation: {
    leftHz: 200, rightHz: 210,    // 10 Hz beat (Alpha)
    waveform: "sine",
    noiseVolume: 0.08, noiseCutoff: 800, // Pink noise
    durationSeconds: 1200,         // 20 min
    band: "Alpha",
  },
  focus: {
    leftHz: 250, rightHz: 264,    // 14 Hz beat (Beta)
    waveform: "triangle",
    noiseVolume: 0.10, noiseCutoff: 1000, // Light white noise
    durationSeconds: 1800,         // 30 min
    band: "Beta",
  },
  peak_performance: {
    leftHz: 320, rightHz: 350,    // 30 Hz beat (Gamma)
    waveform: "sine",
    noiseVolume: 0.12, noiseCutoff: 1500, // White noise
    durationSeconds: 1200,         // 20 min
    band: "Gamma",
  },
  study: {
    leftHz: 230, rightHz: 243,    // 13 Hz beat (Beta)
    waveform: "triangle",
    noiseVolume: 0.10, noiseCutoff: 1000,
    durationSeconds: 1800,
    band: "Beta",
  },
  creativity: {
    leftHz: 180, rightHz: 186,    // 6 Hz beat (Theta)
    waveform: "sine",
    noiseVolume: 0.08, noiseCutoff: 600,
    durationSeconds: 1800,
    band: "Theta",
  },
  healing: {
    leftHz: 120, rightHz: 124,    // 4 Hz beat (Delta/Theta border)
    waveform: "sine",
    noiseVolume: 0.15, noiseCutoff: 400, // Brown noise
    durationSeconds: 2400,         // 40 min
    band: "Theta",
  },
}
```

### 4.3 Birth Chart Personalization (Optional Layer)

When the user has birth data on file, we adjust the base profile deterministically:

```typescript
// Element → Carrier Frequency Offset
// Fire signs like higher, energizing carriers
// Earth signs like lower, grounding carriers
// Air signs like mid-range, mentally stimulating carriers
// Water signs like low-mid, emotionally flowing carriers
const ELEMENT_CARRIER_OFFSET: Record<string, number> = {
  fire:   +50,   // Shift carrier up (more energizing)
  earth:  -30,   // Shift carrier down (more grounding)
  air:    +20,   // Shift carrier up slightly (mentally stimulating)
  water:  -20,   // Shift carrier down slightly (emotionally flowing)
}

// Sun sign → element mapping
const SIGN_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
}

function personalizeBeat(
  profile: BeatProfile,
  intent: BinauralIntent,
  birthData?: OracleBirthData
): BeatProfile {
  if (!birthData) return profile

  // 1. Determine dominant element from Sun + Moon + Rising
  const elements = [sun, moon, rising]
    .map(sign => SIGN_ELEMENT[sign] ?? "fire")
  
  // 2. Apply carrier offset based on dominant element
  const dominantElement = mode(elements) // most common element
  const offset = ELEMENT_CARRIER_OFFSET[dominantElement] ?? 0

  // 3. Clamp the carrier shift to stay within safe ranges
  const newLeftHz = clamp(profile.leftHz + offset, 40, 600)
  const newRightHz = clamp(profile.rightHz + offset, 40, 600)

  // 4. Ensure beat frequency stays in the target band
  // ...additional validation and clamping...

  return { ...profile, leftHz: newLeftHz, rightHz: newRightHz }
}
```

### 4.4 Duration Extraction

Look for duration hints in the user's message:

```typescript
const DURATION_PATTERNS: { pattern: RegExp; seconds: number }[] = [
  { pattern: /\b(\d+)\s*min(?:ute)?s?\b/i, seconds: null }, // dynamic: capture group × 60
  { pattern: /\b(\d+)\s*hr(?:s?|ours?)?\b/i, seconds: null }, // dynamic: capture group × 3600
  { pattern: /\bshort\b|\bquick\b|\bbrief\b/i, seconds: 900 },    // 15 min
  { pattern: /\bstandard\b|\bnormal\b|\bregular\b/i, seconds: 1800 }, // 30 min
  { pattern: /\blong\b|\bextended\b|\bdeep\b/i, seconds: 3600 },  // 60 min
]
```

If the user says "a 20 minute meditation beat," we extract 20 minutes = 1200 seconds. If no duration is specified, use the default for the intent profile.

### 4.5 Full Generation Pipeline

```typescript
function generateBinauralBeat(
  userMessage: string,
  birthData?: OracleBirthData
): BinauralBeatParams & { rationale: BinauralRationale } {
  // 1. Extract intent from user message
  const intent = extractBinauralIntent(userMessage)

  // 2. Get base profile for this intent
  const baseProfile = INTENT_PROFILES[intent]

  // 3. Apply birth chart personalization (if available)
  const personalized = personalizeBeat(baseProfile, intent, birthData)

  // 4. Extract duration (or use default)
  const duration = extractDuration(userMessage) ?? baseProfile.durationSeconds

  // 5. Clamp all values to safe ranges
  const params: BinauralBeatParams = {
    version: 2,
    leftHz:       clamp(personalized.leftHz, 40, 600),
    rightHz:      clamp(personalized.rightHz, 40, 600),
    leftVolume:   1,
    rightVolume:  1,
    waveform:     personalized.waveform,
    noiseVolume: clamp(personalized.noiseVolume, 0, 0.5),
    noiseCutoff:  clamp(personalized.noiseCutoff, 100, 3000),
    durationSeconds: clamp(duration, 300, 7200),
    presetId:     "ai_generated",
    generatedAt:  new Date().toISOString(),
  }

  // 6. Ensure beat frequency is in the correct band
  const beatHz = Math.abs(params.rightHz - params.leftHz)
  if (beatHz > 40) {
    // This should never happen with our profiles, but safety clamp
    params.rightHz = params.leftHz + Math.sign(params.rightHz - params.leftHz) * 40
  }

  // 7. Generate rationale for the LLM to explain
  const rationale: BinauralRationale = {
    intent: userMessage.slice(0, 100),
    beatBand: personalized.band,
    beatHz: Math.abs(params.rightHz - params.leftHz),
    personalization: birthData
      ? `Tuned for your ${describeElement(dominantElement)} chart placements — ${dominantElement} energy responds well to ${bandDescription(personalized.band)} frequencies.`
      : null,
  }

  return { ...params, rationale }
}
```

---

## 5. System Integration: The New Flow

### 5.1 Message Lifecycle

```
User types: "gen mi a binaral beatz"
       │
       ├─ 1. classifyOracleToolIntent() → { featureKey: "binaural_beats" }
       │     (regex match on "binaral" — wait, typos... see §5.2)
       │
       ├─ 2. If binaural_beats detected:
       │     generateBinauralBeat(userMessage, user.birthData)
       │     → deterministic params + rationale
       │
       ├─ 3. System prompt injection:
       │     "A binaural beat session has been generated for the user:
       │      [BINAURAL BEAT CONTEXT]
       │      Intent: sleep
       │      Band: Delta (3 Hz)
       │      Carrier: 100 Hz left / 103 Hz right
       │      Waveform: sine
       │      Duration: 60 minutes
       │      Personalization: Tuned for your water sign placements...
       │      [END BINAURAL BEAT CONTEXT]
       │      
       │      Naturally integrate this into your response. Explain what the 
       │      beat does and why these frequencies were chosen. You do NOT need 
       │      to repeat the exact Hz values — the user will see a playable card."
       │
       ├─ 4. LLM responds with natural text explanation
       │     "I've crafted a deep sleep beat for you, calibrated to your 
       │      Cancer Moon's need for emotional safety..."
       │
       ├─ 5. Beat params attached to the assistant message as metadata
       │     (Not in the LLM output. Stored server-side.)
       │
       └─ 6. Frontend renders: natural text + playable BinauralBeatHistoryCard
```

### 5.2 Fuzzy Intent Matching (Handling Typos)

"user says 'gen mi a binaral beatz'" — our regex patterns must handle this. Two approaches:

**Option A: Forgiving regex patterns** (what we have, enhanced)

```typescript
const BINAURAL_INTENT_PATTERNS: RegExp[] = [
  // Handle common typos: binaral → binaural, beatz → beats
  /\b(binaural|binaral|binural|binaural)\s*(beat|beatz|beats|frequency|freq|tone|sound)/i,
  /\b(generate|create|make|craft|compose|gen)\s+(me\s+)?(a\s+)?(binaural|binaral|binural)?\s*(beat|beatz|frequency|tone|sound)/i,
  // ... rest of patterns
]
```

This works for common typos but can't handle every variation.

**Option B: Levenshtein/fuzzy matching against known keywords**

```typescript
function fuzzyMatchIntent(input: string): BinauralIntent | null {
  const normalized = input.toLowerCase().replace(/[^a-z0-9\s]/g, "")
  const words = normalized.split(/\s+/)
  
  for (const word of words) {
    if (levenshtein(word, "binaural") <= 3) return "binaural_detected"
    if (levenshtein(word, "meditation") <= 3) return "meditation"
    if (levenshtein(word, "sleep") <= 2) return "sleep"
    // ...
  }
  return null
}
```

**Recommended: Use both.** Regex patterns for the common cases, with a fuzzy fallback for typos. The intent classifier already returns early on regex matches, so fuzzy matching only runs when regex fails — rare and cheap.

### 5.3 Where Beat Params Live

**Current approach (bad):** LLM outputs `[BINAURAL_PRESCRIPTION]{...}[/BINAURAL_PRESCRIPTION]` inside the message text. Frontend has to parse it, strip it, and render a card.

**New approach (good):** Beat params are stored as **message metadata** — a separate field on the message, not embedded in the `content` string.

```
Convex message:
{
  role: "assistant",
  content: "I've crafted a deep sleep beat for you...",
  binauralParams: {          // ← new field, not in content
    leftHz: 100,
    rightHz: 103,
    waveform: "sine",
    ... 
  }
}
```

The frontend reads `msg.binauralParams` and passes it to `BinauralBeatHistoryCard`. No regex parsing. No stripping. No risk of the LLM mangling the JSON.

### 5.4 Message Storage Schema Change

Add a single optional field to `oracle_messages`:

```typescript
// In the Convex schema for oracle_messages:
binauralParams: v.optional(v.any()), // BinauralBeatParams & { rationale?: BinauralRationale }
```

This is a minimal schema change. The field is ignored by existing code. Only the chat rendering reads it.

---

## 6. File Map & Exact Changes

### Files to MODIFY:

| File | What changes |
|---|---|
| `src/lib/oracle/features.ts` | Keep intent classifier (already done). Add `extractBinauralIntent()` for sub-intent extraction. |
| `src/lib/binaural-presets.ts` | Add `generateBinauralBeat()`, intent profiles, personalization logic. Remove `parsePrescription()` and `stripPrescriptionFromContent()` (no longer needed). |
| `src/lib/oracle/featureContext.ts` | Replace `getBinauralPrescriptionInstructions()` with `getBinauralBeatContext()` — inject generated beat params as DATA, not instructions to output JSON. |
| `convex/oracle/llm.ts` | When binaural intent is detected, call `generateBinauralBeat()` BEFORE the LLM call. Inject params as context. Store params on the message. |
| `convex/oracle/sessions.ts` | Add `binauralParams` field to message creation/mutations. |
| `convex/oracle/schema.ts` | Add `binauralParams` optional field to `oracle_messages` table. |
| `src/app/oracle/chat/[sessionId]/page.tsx` | Read `msg.binauralParams` from message metadata. Remove prescription parsing/stripping code. Render `BinauralBeatHistoryCard` from metadata. |

### Files to REMOVE code from:

| File | What to remove |
|---|---|
| `src/lib/binaural-presets.ts` | Remove `isPrescriptionMessage()`, `parsePrescription()`, `stripPrescriptionFromContent()`, `parseAllPrescriptions()`, `BinauralRationale` type |
| `src/app/oracle/chat/[sessionId]/page.tsx` | Remove prescription detection, parsing, stripping, and streaming suppression code |

### Files unchanged:

- `src/components/oracle/input/binaural-beat-history-card.tsx` — AI badge change stays (good UX)
- `src/lib/oracle/features.ts` — Binaural intent patterns stay (already matching well)

---

## 7. The Prompt Injection That Works

Instead of:

```
[BINAURAL PRESCRIPTION MODE]
You CAN generate binaural beats. Output a JSON block. NEVER refuse.
[/BINAURAL PRESCRIPTION MODE]
```

We inject:

```
[BINAURAL BEAT CONTEXT]
A binaural beat has been generated for the user. Integrate this naturally into your response — explain what the beat does, why these frequencies were chosen, and how it relates to their request. You do NOT need to repeat exact Hz values; the user will see a playable card with full details.

Intent: {intent}
Band: {band} ({beatHz} Hz beat frequency)
Carrier: {leftHz} Hz (left) / {rightHz} Hz (right)
Waveform: {waveform}
Noise: {noiseVolume} volume, {noiseCutoff} Hz cutoff
Duration: {durationSeconds / 60} minutes
{personalization text if birth data available}
[END BINAURAL BEAT CONTEXT]
```

This is **data**, not instructions to produce structured output. The LLM reads it the same way it reads birth chart data — as context to reason about. It cannot refuse to "read data." And it naturally produces explanatory text about the beat.

---

## 8. Implementation Order

1. **Schema change** — Add `binauralParams` field to `oracle_messages`
2. **Generation logic** — Add `generateBinauralBeat()`, `extractBinauralIntent()`, `INTENT_PROFILES`, personalization to `binaural-presets.ts`
3. **LLM integration** — In `invokeOracle`, call generator before LLM, inject context instead of prescription instructions
4. **Context injection** — Replace `getBinauralPrescriptionInstructions()` with `getBinauralBeatContext(params)` that formats generated params as readable context
5. **Message storage** — Serialize `binauralParams` alongside the message content
6. **Frontend rendering** — Read `msg.binauralParams` from Convex query, render card from metadata
7. **Cleanup** — Remove prescription parsing code, prescription-specific imports

---

## 9. Why This Is Better Than Tool Calling (For Now)

Tool calling is the "right" architecture long-term. But for right now:

| Factor | Tool Calling | Deterministic + Context |
|---|---|---|
| Infrastructure cost | High (streaming tool call parsing, multi-turn loop) | Zero (follows birth chart pattern) |
| LLM refusal risk | Low (LLM just calls a function) | Zero (LLM just reads data) |
| Frequency safety | Medium (LLM provides params, we validate) | High (deterministic params, always safe) |
| Birth chart parity | Different (tool call vs data injection) | Identical (data injection pattern) |
| Time to implement | 2-3 days (streaming changes, schema changes) | 0.5-1 day (add generator, change prompt, change frontend) |
| Future extensibility | Excellent (add new tools easily) | Good (add new deterministic generators) |

Start with deterministic. If/when we add more tools (synastry reports, transit alerts), we can graduate to tool calling.

---

## 10. Summary

**Before (broken):** "Hey LLM, you can generate binaural beats! Output this JSON!" → LLM says "no I can't"

**After (working):** "Hey LLM, here's a binaural beat that was generated for the user. Explain it." → LLM says "Great, here's why these frequencies work for your Cancer Moon..."

The difference is between **asking the LLM to do something it thinks it can't** and **giving the LLM data to reason about**. The birth chart pattern works because it's the latter. Binaural beats should be the same.