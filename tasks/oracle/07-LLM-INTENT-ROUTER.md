# PROBLEM: Regex Intent Classifier Fails on Typos and Creative Phrasing

> **Status:** Bug — Critical
> **Severity:** P0 — Users with stored birth data get generic responses when they ask about their chart with any typo or creative phrasing
> **Affected:** `src/lib/oracle/intentRouter.ts` — the `scoreIntents()` function
> **Root Cause:** Regex-based intent classification is fundamentally unreliable for natural language

---

## The Bug

The `scoreIntents()` function uses regex patterns (`BIRTH_CHART_INTENT_PATTERNS`, `JOURNAL_RECALL_PATTERNS`, `BINAURAL_INTENT_PATTERNS`) to detect user intent. These patterns are exact-match regexes that **completely miss** any user message with:

- Typos: "analize my bierht chart", "drep analysis of my brith chart"
- Creative phrasing: "tell me what the stars say about me", "how does my sky map affect love"
- Informal language: "whats my signs say", "read my stars"
- Multilingual fragments: "mi carta astral", "mon thème astral"
- Abbreviations: "do my chart", "chart reading pls"

### Reproduction

1. User has birth data stored (`hasBirthData=true`)
2. User types: **"analize my bierht chart"**
3. Expected: `birth_chart` intent detected → chart reading with depth instructions + birth data
4. Actual: `generic_chat(1.00:fallback_no_match)` → AI responds "I don't have your birth data" or generic chat

**Log evidence:**
```
[Oracle] Intent: ["generic_chat(1.00:fallback_no_match)"], hasBirthData=true, hasJournalConsent=true
```

The regex `/\b(analy[sz]e|read|interpret|explain|...)\b.*\b(birth\s*chart|brith\s*chart|natal\s*chart|chart)\b/i` requires:
- An exact action verb ("analyze", "read", "interpret", etc.)
- An exact chart noun ("birth chart", "brith chart", "natal chart", "chart")

"analize" ≠ "analyze" and "bierht" ≠ "birth" → **hard miss**. The user gets generic_chat.

---

## Why Regex Is the Wrong Primitive

Regex classification for natural language intent has fundamental flaws:

1. **No fuzzy matching** — A single typo collapses the entire classification
2. **No semantic understanding** — "what do my stars say about love?" is clearly a chart question but matches zero patterns
3. **No composition** — "search my journal for patterns in my Venus placement" needs journal_recall + birth_chart, but regex picks one
4. **Maintenance burden** — Every new phrasing requires a new regex. The existing patterns are already 20+ lines and still miss cases
5. **Language-dependent** — The patterns only work in English. Any code-switching or non-English input is invisible

The pipeline architecture we built (Tasks 01–05) is **correct** — the problem is purely in the intent detection layer that feeds it.

---

## The Proper Solution: LLM-Based Intent Router

Instead of regex, use a fast, cheap LLM call to classify intent. This is a **pre-routing prompt** — a small, focused LLM call that returns structured intent data before the main Oracle call.

### Architecture

```
User message → invokeOracle
                 │
                 ├─ (existing safety gates)
                 │
                 ├─ LLM Intent Router ← fast model (Gemini Flash / DeepSeek Fast)
                 │   Input: user message + available features
                 │   Output: JSON { intents: [{pipeline, confidence, depth}], primary }
                 │   Cost: ~50-100 tokens input, ~20-50 tokens output
                 │   Latency: ~200-500ms (fast model)
                 │
                 ├─ Pipeline resolution from intents
                 │
                 ├─ Data gathering (pipeline-driven)
                 │
                 ├─ Main LLM call (with pipeline-composed prompt)
                 │
                 └─ Response + post-processing
```

### Intent Router Prompt Design

```
You are an intent classifier for an astrological AI called Oracle.

Given a user's message, classify which features they want. Return JSON.

Available features:
- birth_chart: Chart reading, natal analysis, placement interpretation, transit analysis
- journal_recall: Journal pattern search, Cosmic Recall, emotional themes from entries
- binaural_beats: Sound/frequency generation, meditation audio, binaural beats
- generic_chat: General conversation, casual chat, questions not matching other features

Multiple features CAN be active simultaneously (e.g., journal + chart).

Rules:
- Match intent, not spelling. "analize my bierht chart" = birth_chart
- Match semantics, not keywords. "what do my stars say about love?" = birth_chart
- "look through my journal for patterns with my Venus" = journal_recall + birth_chart
- If uncertain, prefer generic_chat over misclassification
- Chart depth: mention of "deep", "detailed", "full", "complete" → depth=full, otherwise depth=core

Respond with ONLY this JSON structure:
{"intents": [{"pipeline": "birth_chart", "confidence": 0.9, "metadata": {"depth": "core"}}, ...]}

User message: "analize my bierht chart"
```

### Key Design Decisions

1. **Use the fastest available model** — This call should be on Gemini Flash or equivalent. It's a simple classification task that doesn't need a powerful model. The entire prompt + output is ~200 tokens.

2. **Cache intent results per session** — Once a session's feature is auto-activated and persisted, the intent router isn't called again for that session. Only the first message in a new session needs routing.

3. **Fall back to regex on LLM failure** — If the intent router LLM call fails (timeout, error, invalid JSON), fall back to the existing regex patterns. This ensures the system degrades gracefully.

4. **Cost is negligible** — ~150 tokens input + ~50 output at Gemini Flash pricing ≈ $0.00005 per call. For a system already making a 1000+ token main call, this is trivial.

5. **Latency is acceptable** — 200-500ms for the routing call can be overlapped with data gathering. Total added latency before the main call: ~200ms.

6. **Two-call architecture** — The intent router is a separate, fast call before the main Oracle call. It does NOT replace the main call. The main call still does the chart reading, journal search, etc.

---

## Implementation Plan

### Step 1: Create the LLM Intent Router Prompt

File: `src/lib/oracle/intentRouterPrompt.ts`

Define the system prompt for the intent classifier. Include:
- Available features (birth_chart, journal_recall, binaural_beats, generic_chat)
- Composition rules (multiple features can match)
- Depth rules for birth_chart
- Spelling tolerance note
- JSON output format

### Step 2: Implement `scoreIntentsWithLLM()`

File: `src/lib/oracle/intentRouter.ts`

Add a new function alongside the existing regex-based `scoreIntents()`:

```typescript
export async function scoreIntentsWithLLM(params: {
  question: string;
  hasBirthData: boolean;
  hasJournalConsent: boolean;
  currentFeatureKey: string | null;
  providers: ProviderConfig[];
  modelChain: ModelChainEntry[];
}): Promise<IntentRouterResult>
```

This function:
1. Builds a small prompt with the user's message and available features
2. Makes a fast LLM call (first available provider, prefer fast models)
3. Parses the JSON response
4. Returns `IntentRouterResult` (same type as `scoreIntents`)
5. On failure (timeout, invalid JSON, LLM error), falls back to `scoreIntents()` (regex)

### Step 3: Wire into invokeOracle

File: `convex/oracle/llm.ts`

Replace the current `scoreIntents()` call with `scoreIntentsWithLLM()`:

```typescript
// Before (regex-only):
const intentResult = scoreIntents({ ... });

// After (LLM with regex fallback):
const intentResult = await scoreIntentsWithLLM({ ... });
```

The LLM call uses the provider router to select a fast model. If the call fails, it falls back to regex.

### Step 4: Cache intent per session

The session's `featureKey` is already persisted after intent detection. On subsequent messages in the same session, the `currentFeatureKey` is already set, so the intent router returns immediately (manual selection path, confidence 1.0). This means the LLM call only happens on the **first message** of a new session.

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/oracle/intentRouter.ts` | Add `scoreIntentsWithLLM()` function that calls a fast LLM for intent classification, with regex fallback |
| `src/lib/oracle/intentRouterPrompt.ts` | New file — the system prompt for the intent classifier |
| `convex/oracle/llm.ts` | Replace `scoreIntents()` call with `scoreIntentsWithLLM()` (async), add LLM call + caching |

### Files that stay UNCHANGED

- `src/lib/oracle/pipelineTypes.ts` — `IntentRouterResult` and `ScoredIntent` types are already correct
- All pipeline files — they just receive intents, don't care how they were detected
- `src/lib/oracle/features.ts` — `classifyOracleToolIntent()` kept as regex fallback
- Provider router — unchanged
- Streaming infrastructure — unchanged

---

## What This Fixes

| Input | Current (regex) | After (LLM) |
|-------|----------------|--------------|
| "analize my bierht chart" | generic_chat (miss) | birth_chart (hit) |
| "tell me what the stars say about love" | generic_chat (miss) | birth_chart (hit) |
| "look through my journal for patterns with my Venus" | journal_recall (one feature) | journal_recall + birth_chart (both) |
| "make me a sleep sound" | binaural_beats (might hit) | binaural_beats (confident hit) |
| "hey what's up" | generic_chat (correct) | generic_chat (correct) |
| "mi carta astral" | generic_chat (miss) | birth_chart (hit) |

---

## Immediate Workaround (Already Implemented)

The fix in `src/lib/oracle/intentRouter.ts` that removed the `hasBirthData` gate ensures that intent detection is not blocked by data availability. The birth chart pipeline now includes a `[CHART DATA UNAVAILABLE]` system prompt block when the user doesn't have stored data, so the AI asks for it in chart-reading format.

But spelling errors and creative phrasing still defeat the regex. The LLM router is the proper fix.

---

## Regex Patterns Are Still Useful As Fallback

Keep the existing regex patterns in `src/lib/oracle/features.ts`. They serve as:
1. **Zero-latency fallback** — if the LLM router fails, regex is instant
2. **Cost-free baseline** — no tokens spent on obvious cases like "analyze my birth chart" (exact match)
3. **Safety net** — ensures the system works even if all LLM providers are down

The LLM router should be the **primary** path. Regex should be the **fallback** path.