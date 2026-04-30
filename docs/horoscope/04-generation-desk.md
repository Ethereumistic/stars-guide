# Generation Desk

**Route**: `/admin/horoscope/generator`
**Backend file**: `convex/admin.ts` → `startGeneration`, `getJobProgress`, `getRecentJobs`
**Core engine**: `convex/ai.ts` → `runGenerationJob`
**DB tables**: `generationJobs`, `horoscopes`, `cosmicWeather`

## What It Does

Triggers AI horoscope generation. The admin selects a zeitgeist, model, date range, and signs. The system creates a job record, schedules a server-side action, and the admin watches progress in real-time.

## The Full Generation Flow

```
Admin UI                    Server
────────                    ──────
startGeneration() ────────► validates signs, dates
                             checks for overlapping running jobs (concurrency guard)
                             creates generationJobs record (status: "running")
                             schedules internal.ai.runGenerationJob via scheduler.runAfter(0)
                             returns jobId ◄─────── client subscribes to getJobProgress
                             
                          runGenerationJob():
                            1. Fetch job details, zeitgeist, master_context
                            2. Fetch/compute cosmic weather for target dates
                            3. Auto-assign hook archetype (by moon phase)
                            4. For each sign:
                               a. Build prompt (system + user message with all context layers)
                               b. Call OpenRouter API
                               c. Validate response with Zod (LLMResponseSchema)
                               d. On validation failure → retry once
                               e. On success → upsertHoroscopes (persist immediately)
                               f. Update job progress (completed/failed count)
                               g. Sleep 2s between signs (rate limit protection)
                            5. Mark job as "completed" or "partial"
```

## The Prompt Structure (v3)

The LLM receives two messages:

### System Message
```
master_context content (from Context Editor)
```

### User Message
```
TARGET SIGN: Aries
TARGET DATES: 2025-03-10, 2025-03-11, ...

MOON PHASE FRAME: Full Moon — Peak Intensity
  Frame: What's been underground surfaces. Emotions are amplified.
  ...

COSMIC WEATHER:
  Planet Positions: Mars in Gemini (12.5°), Venus in Pisces (24.1°), ...
  Retrogrades: Mercury
  Moon: Full Moon, 98.2% illuminated
  Active Aspects: Mars trine Jupiter (orb: 1.2°)
  Translate relevant planetary data into felt language. Never name a planet directly.

COLLECTIVE EMOTIONAL STATE (ZEITGEIST):
  [emotional zeitgeist text]
  This is how the world FEELS right now — not what happened.

HOOK ARCHETYPE FOR THIS HOROSCOPE:
  Type: The Mirror Hook
  Description: Names something the reader is probably already doing...
  Examples:
  1. "Still refreshing that one app?"
  Open the horoscope with this hook type. Do not copy the examples.

TASK:
  Generate horoscopes for Aries for the dates above.
  Output ONLY valid JSON matching the schema in the system prompt.
```

## Context Layers (in order of injection)

1. **Master Context** — system message, the core rules/format/sign voices
2. **Moon Phase Frame** — emotional container from `astronomyEngine.getMoonPhaseFrame()`
3. **Cosmic Weather** — real astronomical data translated to felt language
4. **Emotional Zeitgeist** — how the world is feeling right now
5. **Hook Archetype** — the opening style instruction

## Response Validation (Zod)

```typescript
LLMResponseSchema = z.object({
  sign: z.enum(["Aries", "Taurus", ...]),
  horoscopes: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    content: z.string().min(1),
  })).min(1).max(7),
});
```
Character count (330-460) is NOT enforced here — it's only a visual guide in the Review UI. The admin has final say.

## Concurrency Guard

`startGeneration` checks for running jobs with overlapping target dates. If one exists, the mutation throws: `"A generation job for overlapping dates is already running."` This prevents two jobs from writing to the same sign×date simultaneously.

## Error Handling

- **Per-sign retry**: validation failure or network error → retry once after 3s
- **Total failure cap**: if 6+ signs fail, the entire job aborts (`status: "failed"`)
- **Partial success**: if some signs succeed but others fail, job status is `"partial"`
- **On-demand cosmic weather**: if the cron hasn't computed weather for a target date yet, the engine computes it on-the-fly before proceeding

## Cosmic Weather

Auto-computed daily at 00:05 UTC by `crons.ts`. Also computable on-demand via the admin "Recompute" button on the overview page. If missing at generation time, `runGenerationJob` computes it inline. The computation is pure (no DB writes) in `astronomyEngine.computeSnapshot()`, then stored via `cosmicWeather.upsertSnapshot`.

## Safety Constants

```typescript
MAX_RETRIES_PER_SIGN = 2;       // 1 original + 1 retry
RETRY_DELAY_MS = 3000;          // 3s between retries
MAX_TOTAL_FAILURES = 6;         // abort job threshold
INTER_SIGN_DELAY_MS = 2000;     // rate limit protection between signs
```

## Available Models

Defined in the frontend `generator/page.tsx` as `MODEL_OPTIONS`. All go through OpenRouter:
- `x-ai/grok-4.1-fast`, `x-ai/grok-4.1`
- `google/gemini-2.5-flash-lite`, `google/gemini-2.5-flash`
- `anthropic/claude-sonnet-4`
- `openai/gpt-4.1-mini`
- `arcee-ai/trinity-large-preview:free`

Generation temperature is hardcoded at `0.75`. `response_format: { type: "json_object" }` forces JSON output.

## Job States

| Status | Meaning |
|---|---|
| `running` | Currently processing signs |
| `completed` | All signs succeeded |
| `partial` | Some signs succeeded, some failed |
| `failed` | 6+ signs failed or fatal error |
| `cancelled` | (reserved, not currently implemented) |

## Data Model

```
generationJobs table:
  adminUserId: Id("users")
  zeitgeistId: Id("zeitgeists")
  modelId: string              // e.g., "x-ai/grok-4.1-fast"
  targetDates: string[]        // ["2025-03-10", "2025-03-11"]
  targetSigns: string[]        // ["Aries", "Taurus", ...]
  status: "running" | "completed" | "partial" | "failed" | "cancelled"
  progress: { completed, failed, total }
  errors: string[]             // per-sign error messages
  startedAt: number
  completedAt: number | null
  rawZeitgeist: string | null
  emotionalZeitgeist: string | null
  hookId: Id("hooks") | null
```
Indexes: `by_status`, `by_admin`
