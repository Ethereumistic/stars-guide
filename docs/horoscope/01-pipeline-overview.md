# Horoscope Pipeline — Overview

The daily horoscope pipeline generates AI-written, sign-specific horoscopes for
all 12 zodiac signs every day. It combines real astronomical computation with a
carefully engineered LLM prompt that translates raw planetary data into felt
human experience.

## Pipeline Stages

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CRON SCHEDULE (UTC)                            │
│                                                                      │
│  00:05  Compute Cosmic Weather    (astronomy snapshot)              │
│  00:10  Generate Felt Language    (LLM emotional translation)       │
│  02:00  Queue Daily Horoscopes   (12 sign generations staggered)   │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stage 1 — Astronomy Engine                                         │
│  Source: convex/lib/astronomyEngine.ts                              │
│  Computes planet positions, moon phase, active aspects, retrograde  │
│  Written to: cosmicWeather table                                    │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stage 1b — Felt Language (optional emotional layer)               │
│  Source: convex/cosmicWeather.ts (generateFeltLanguage)             │
│  Reads cosmicWeather → translates to 4-6 sentences felt prose      │
│  Written to: cosmicWeather.feltLanguage field                      │
│  Note: Currently stored but not injected into horoscope prompts     │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stage 2 — Daily Context Enrichment                                 │
│  Source: convex/horoscopes/computeDailyContext.ts                    │
│  Reads cosmicWeather → adds retrograde context, VoC moon, stellium  │
│  detection, dominant element, energy signature, aspect summary     │
│  Written to: daily_astrology_context table                          │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stage 3 — Prompt Construction (per sign)                            │
│  Source: convex/horoscopes/prompt.ts                                │
│  Builds Section A (astronomical context), Section B (sign framing   │
│  + hook angle), Section C (output schema + rules)                  │
│  Output: { system, user } prompt pair                                │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stage 4 — LLM Generation (per sign)                                │
│  Source: convex/horoscopes/generateForSign.ts                       │
│  Calls LLM with prompt, parses JSON, validates via Zod, writes     │
│  Written to: daily_horoscopes table                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `convex/crons.ts` | Cron schedule definitions |
| `convex/cosmicWeather.ts` | Cosmic weather compute/store/serve |
| `convex/lib/astronomyEngine.ts` | Pure astronomy computation layer |
| `convex/lib/astrology/contextBuilder.ts` | Rule-based context enrichment |
| `convex/lib/astrology/signTraits.ts` | Per-sign character sketches |
| `convex/horoscopes/computeDailyContext.ts` | Daily context assembly + enrichment |
| `convex/horoscopes/queueDailyGenerations.ts` | Cron entrypoint, 12-sign stagger |
| `convex/horoscopes/generateForSign.ts` | Per-sign LLM generation |
| `convex/horoscopes/prompt.ts` | v2.0 prompt template builder |
| `convex/horoscopes/queries.ts` | Public-facing horoscope queries |
| `convex/horoscopes/admin.ts` | Admin override/retry/trigger actions |
| `convex/horoscopes/helpers.ts` | Admin auth check + status reset |
| `convex/horoscopes/ratings.ts` | User thumbs-up/down feedback on horoscopes |

## Database Tables

| Table | Key Index | Written By | Purpose |
|-------|-----------|------------|---------|
| `cosmicWeather` | `by_date` | `cosmicWeather.computeAndStore` | Raw astronomical snapshot |
| `daily_astrology_context` | `by_date` | `computeDailyContext` | Enriched context for prompt |
| `daily_horoscopes` | `by_date_sign` | `generateForSign` / admin | Final LLM-generated horoscope |

## See Also

- [02-cron-schedule.md](./02-cron-schedule.md) — Timing and time zone details
- [03-astronomy-engine.md](./03-astronomy-engine.md) — How positions/aspects are computed
- [04-daily-context-enrichment.md](./04-daily-context-enrichment.md) — Context building logic
- [05-energy-signature.md](./05-energy-signature.md) — How the energy signature is derived
- [06-retrograde-context.md](./06-retrograde-context.md) — Retrograde window calculation
- [07-prompt-construction.md](./07-prompt-construction.md) — Prompt template Sections A/B/C
- [08-llm-generation.md](./08-llm-generation.md) — LLM call, validation, and error recovery
- [09-output-schema.md](./09-output-schema.md) — Final horoscope content structure
- [10-database-storage.md](./10-database-storage.md) — Convex table schemas and indexes
- [11-admin-panel.md](./11-admin-panel.md) — Admin dashboard and override tools
- [12-public-queries.md](./12-public-queries.md) — Paywall logic and public queries
- [13-journal-integration.md](./13-journal-integration.md) — Journal entry astro context