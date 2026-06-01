# Output Schema — Horoscope Content Structure

The daily horoscope is stored as a JSON object inside the `daily_horoscopes`
table's `content` field. The current production format is **v2.0**.

## v2.0 Content Structure

```json
{
  "hook": "The thing you're not saying is the thing that needs saying.",
  "bodyText": "The friction you're feeling isn't resistance — it's the sound of something shifting. That conversation you've been rehearsing in your head? It's time to have it out loud. The other person is more ready than you think.",
  "mantra": "I speak what I've been holding.",
  "dailyPillars": {
    "vibe": "quiet momentum",
    "powerMove": "Send that message",
    "blindSpot": "Your own limits",
    "luckySpark": "A side conversation"
  },
  "domainScores": [
    { "name": "Love", "score": 78 },
    { "name": "Career", "score": 62 },
    { "name": "Health", "score": 55 },
    { "name": "Social", "score": 41 },
    { "name": "Creativity", "score": 83 }
  ]
}
```

## Record-Level Metadata (not part of `content`)

These fields live on the `daily_horoscopes` table record itself, not inside the `content` JSON object:

| Field | Type | Description |
|-------|------|-------------|
| `contextSnapshotId` | optional id | Reference to `daily_astrology_context`. **Reserved/never populated** by current code. |
| `modelUsed` | optional string | LLM model identifier, e.g. `"gemma3:27b"` |
| `promptVersion` | optional string | Prompt template version, e.g. `"v2.0"` |
| `errors` | optional string[] | Error messages if generation failed. **Bug:** previously written as `errorMessage` (string) instead of `errors` (string[]), so this field was never populated. Fixed — see [08-llm-generation.md](./08-llm-generation.md). |
| `generatedAt` | optional number | `Date.now()` timestamp of successful generation |
| `generationDurationMs` | optional number | Wall-clock duration of the LLM call in milliseconds |

## Field Specifications

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `hook` | string | 10–120 chars | Opening line. Must match sign's hook angle. Rational, not mystical. |
| `bodyText` | string | 50–400 chars | 2–3 sentences continuing from hook. No jargon. |
| `mantra` | string | 5–80 chars | First-person ("I trust..."). Specific to sign + day. |
| `dailyPillars.vibe` | string | 2–50 chars | 2–3 words. Overall energy feel. |
| `dailyPillars.powerMove` | string | 2–50 chars | 2–5 words. Most impactful action today. |
| `dailyPillars.blindSpot` | string | 2–50 chars | 2–6 words. What they're likely overlooking. |
| `dailyPillars.luckySpark` | string | 2–50 chars | 2–5 words. Small thing with outsized potential. |
| `domainScores` | array | 4–6 items | Domain scores for life areas. |

### Combined Character Limit

`hook.length + bodyText.length` must **not exceed 450 characters**. This
enforcement happens both in the prompt (LLM instructed to count) and in
post-validation (bodyText truncated if needed).

### Domain Score Names

Valid values for `domainScores[].name`:

Love, Career, Family, Health, Finance, Creativity, Social, Spirituality

Scores are integers 0–100 representing how positively today's energy
supports that domain. The LLM picks 4–6 domains based on which are most
affected by the day's transits. Domain selection should rotate daily.

## v1.0 Content Structure (Legacy)

```json
{
  "insight": "...",
  "energy": "...",
  "navigate": "...",
  "mantra": "...",
  "cosmicDetails": {
    "keyThemes": ["..."],
    "watchFor": "..."
  }
}
```

v1 content is still accepted by the `content` field (stored as `v.any()` in
the schema). The recovery logic in `generateForSign.ts` can convert v1 → v2
format. The admin panel also handles both formats for display (checks for
`hook`/`bodyText` vs `insight`/`energy`/`navigate`).

## Pending / Failed Default Content

When a horoscope record is created (queued but not yet generated) or fails
generation, a placeholder content object is stored:

```json
{
  "hook": "Pending generation." / "Generation failed.",
  "bodyText": "This horoscope is being generated. Check back shortly." / "Please check back shortly.",
  "mantra": "I trust the timing." / "I am patient with the process.",
  "dailyPillars": {
    "vibe": "aligning" / "recovering",
    "powerMove": "Check back soon" / "Try again later",
    "blindSpot": "Coming soon" / "Temporary disruption",
    "luckySpark": "On the way" / "A fresh start"
  },
  "domainScores": [
    { "name": "Love", "score": 50 },
    { "name": "Career", "score": 50 },
    { "name": "Health", "score": 50 },
    { "name": "Social", "score": 50 }
  ]
}
```

## How Content Is Consumed

### Public Sign Page (`/horoscopes/[sign]/[date]`)

- `hook` + `bodyText` → displayed in `HoroscopeContentCard`
- `mantra` → replaces the static sign motto in `SignTitleBlock`
- `dailyPillars` → 4-grid specs section
- `domainScores` → replaces static Element/Modality/Ruler/House specs in
  `DomainScoresGrid`

### Admin Panel (`/admin/horoscope`)

- Full content object displayed in detail dialog
- v1 and v2 formats both handled with conditional rendering
- Override dialog writes v2 format

### Paywall Logic

Content is only served if status is `"generated"` or `"overridden"`. Pending
and failed entries return `null`. Date-based paywall may further restrict
access (see [12-public-queries.md](./12-public-queries.md)).