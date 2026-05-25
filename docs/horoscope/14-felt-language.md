# Felt Language — Emotional Translation of Cosmic Weather

Source: `convex/cosmicWeather.ts` (functions `generateFeltLanguage`,
`dailyFeltLanguageJob`, `storeFeltLanguage`)

## What It Is

"Felt language" is an LLM-generated emotional translation of the raw
astronomical snapshot. It converts planet positions, aspects, and retrograde
status into 4–6 sentences of felt human experience — with zero astrological
terminology.

## When It Runs

- **00:10 UTC daily** via the `generate-felt-language` cron
- 5 minutes after cosmic weather is computed (ensures the snapshot exists)
- On-demand via admin panel button

## Generation Flow

```
1. Fetch cosmicWeather record for date
2. Skip if feltLanguage already exists (idempotent, unless force=true)
3. Resolve LLM provider from oracle_settings
4. Build translation prompt (system + user)
5. Call LLM (model: google/gemini-2.5-flash-lite, temperature: 0.4)
6. Store result in cosmicWeather.feltLanguage field
```

## The Prompt

### System Prompt

```
You are an astrology translator. Your job is to convert raw astronomical
data into emotionally resonant felt language for horoscope writers.

Rules:
- Never name a planet directly
- Never name a sign directly
- Write 4-6 sentences of felt human experience
- Focus on collective mood: what energy is in the air
- No prediction, no advice — only description of the energetic climate
- No mention of degrees, orbs, or technical terms
Output only the paragraph, no preamble.
```

### User Prompt

Constructed from the cosmic weather data:

```
Translate this astronomical snapshot to felt language:

Moon: Waxing Gibbous, 68% illuminated
Active Aspects: Mercury opposition Saturn (orb: 2.1°); Venus trine Jupiter (orb: 1.5°)
Retrogrades: Mercury, Saturn
Moon Phase Frame: MOON PHASE FRAME: Waxing Gibbous — Almost There
  Frame: Refinement energy. The gap between where you are and the goal
  feels frustrating.
  Language: "You're in the final stretch. Don't change the plan now."
  ...
```

The moon phase frame comes from `getMoonPhaseFrame()` in
`astronomyEngine.ts` — a set of narrative containers that describe the
emotional quality of each lunar phase.

## LLM Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| model | `google/gemini-2.5-flash-lite` | Lightweight, fast |
| temperature | `0.4` | Low — more consistent/less creative |
| maxTokens | `300` | Short paragraph output |
| thinkingMode | (not specified) | Default |

## Storage

Written to `cosmicWeather.feltLanguage` via `storeFeltLanguage` mutation,
along with `feltLanguageGeneratedAt = Date.now()`.

The field is **optional** — if LLM generation fails (missing API key, network
error), the cosmicWeather record still exists without felt language.

## Idempotency

If `feltLanguage` already exists on the record, the cron skips generation
(`force: false`). The admin "Generate Felt Language" button passes
`force: true` to override this check.

## How Felt Language Is Used

Currently, felt language is **stored but not directly injected** into the
horoscope generation prompt. The prompt uses the structured astronomical
context from `daily_astrology_context` instead.

Potential future use: felt language could be included in Section A of the
horoscope prompt as emotional framing, or displayed on the public-facing
cosmic weather page as a collective mood summary.