# LLM Generation — Per-Sign Horoscope Output

Source: `convex/horoscopes/generateForSign.ts`

Each sign generation is an independent Convex action. The pipeline processes
all 12 signs, but failure for one does not affect the others.

## Generation Flow

```
1. Validate sign (must be one of 12 canonical names)
2. Load daily_astrology_context for date
   └─ If missing, compute it now (fallback)
3. Map DB record → DailyAstrologyContext type for prompt builder
4. Build prompt via buildHoroscopePrompt({ sign, context })
5. Invoke the `horoscope_generation` AI Gateway feature profile
6. Let the gateway apply its configured model chain, health/cooldown, and telemetry
7. Sanitize LLM output (strip markdown fences)
8. Parse JSON
9. Validate against HoroscopeContentSchema (Zod)
10. If validation fails → try recovery
11. Upsert to daily_horoscopes table
```

## LLM Provider Resolution

Provider selection, model order, fallback, health, cooldown, and attempt events are owned by the `horoscope_generation` profile in `/admin/ai`. Horoscope code supplies the prompt and validates/persists the result; it does not read Oracle provider settings.

## LLM Call Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| model | `gemma3:27b` | Default; may be overridden by provider response |
| temperature | `0.75` | Balanced creativity |
| maxTokens | `4096` | Generous for the output size |
| thinkingMode | `"disabled"` | No chain-of-thought |
| messages | system + user | Two-message conversation |

## Retry Logic

On LLM call failure:
1. Wait 3 seconds (`RETRY_DELAY_MS = 3000`)
2. Retry once with identical parameters
3. If retry fails → mark horoscope as `status: "failed"` with error message
4. If retry succeeds → continue to parse/validate

There is no retry for parsing failures or validation failures — those go
directly to recovery or failure.

## Known Bug: `errorMessage` vs `errors` Field Mismatch

The `upsertHoroscope` mutation originally defined an `errorMessage` field (string), but the Convex schema expects an `errors` field (array of strings). This mismatch meant that when a horoscope generation failed, the error message was written to a field that didn't exist in the schema, so error messages were never persisted on failed horoscope records.

This has been fixed — the mutation now uses `errors: v.optional(v.array(v.string()))` to match the schema. The `markQueued` mutation was unaffected, as it never writes error data.

## JSON Sanitization

`sanitizeLLMJson(raw)` strips potential markdown fences:
```typescript
const cleaned = raw.replace(/```json\n?|```/g, "").trim();
```

Then `JSON.parse(cleaned)` extracts the structured object.

The LLM may output `{ sign, date, content }` or just the content directly.
The code handles both: `const contentObj = parsed?.content ?? parsed`

## Zod Validation (v2.0 Schema)

```typescript
const HoroscopeContentSchema = z.object({
    hook: z.string().min(10).max(120),
    bodyText: z.string().min(50).max(400),
    mantra: z.string().min(5).max(80),
    dailyPillars: z.object({
        vibe: z.string().min(2).max(50),
        powerMove: z.string().min(2).max(50),
        blindSpot: z.string().min(2).max(50),
        luckySpark: z.string().min(2).max(50),
    }),
    domainScores: z.array(DomainScoreSchema).min(4).max(6),
});
```

`DomainScoreSchema` requires:
- `name`: one of "Love", "Career", "Family", "Health", "Finance",
  "Creativity", "Social", "Spirituality"
- `score`: integer 0–100

### Combined Character Limit

After validation, `hook + bodyText` combined must not exceed **450 characters**.
If it does, `bodyText` is truncated to `450 - hook.length` (minimum 50).

## Content Recovery

When Zod validation fails, `tryRecoverContent(parsed)` attempts to extract
valid content from a malformed response. Two strategies:

### Strategy 1: v2.0 Field Extraction

If `hook` and `bodyText` exist in the parsed object (even at wrong nesting
levels), extract them and build a valid v2.0 structure. Missing fields get
safe defaults.

### Strategy 2: v1.0 → v2.0 Conversion

If the output has v1 fields (`insight`, `energy`, `navigate`), convert:
- First sentence of `insight` → `hook`
- Remainder of `insight` + `energy` + `navigate` → `bodyText`
- `cosmicDetails.keyThemes[0]` → `dailyPillars.vibe`
- `cosmicDetails.watchFor` → `dailyPillars.blindSpot`

### Recovery Domain Scores

If domain scores are missing or invalid:
- Filter to only valid domain names
- Ensure at least 4 entries (pad with defaults if needed)
- Cap at 6 entries
- Clamp scores to 0–100 range

Default fallback scores: Love 50, Career 50, Health 50, Social 50.

## Success Path

On successful generation:
```typescript
await ctx.runMutation(internal.horoscopes.generateForSign.upsertHoroscope, {
    date,
    sign,
    status: "generated",
    content: validatedContent,
    modelUsed,
    promptVersion: PROMPT_VERSION,  // "v2.0"
    generationDurationMs,
});
```

> **Note:** The `contextSnapshotId` field exists in the schema but is never populated by the current code. It is reserved for a future improvement.

## Logging

Each generation logs:
- Sign, date, duration (ms), model used, total character count
- Recovery events are logged as warnings
- Failures and LLM errors are logged as errors
