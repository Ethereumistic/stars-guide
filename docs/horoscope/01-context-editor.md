# Context Editor

**Route**: `/admin/horoscope/context`
**Backend file**: `convex/admin.ts` → `getSystemSetting`, `upsertSystemSetting`
**DB table**: `systemSettings` (key: `"master_context"`)

## What It Does

Edits the master astrology system prompt. This is the `system` message sent to the LLM for every single horoscope generation call. It defines the AI's identity, writing rules, output format, sign-specific voice guidelines, and the JSON schema the LLM must return.

## How It Works

1. On load, `getSystemSetting({ key: "master_context" })` fetches the current prompt from the `systemSettings` table
2. Admin edits the textarea
3. `upsertSystemSetting({ key: "master_context", content })` upserts the row
4. The content is pulled at generation time by `aiQueries.getSystemSettingInternal({ key: "master_context" })` and injected as the `messages[0].role: "system"` block

## Data Model

```
systemSettings table:
  key: "master_context"        // fixed key
  content: string              // the full system prompt (markdown)
  updatedAt: number            // timestamp
  updatedBy: Id("users")      // admin who saved it
```
Index: `by_key` on `["key"]`

## Token Budget

The UI warns if the prompt exceeds ~6,000 tokens. This is advisory — there's no hard enforcement. The real constraint is the model's context window. If the prompt is too dense, the LLM suffers from "Lost-in-the-Middle" degradation.

## Things to Know

- If `master_context` is empty/null when a generation job runs, the job immediately fails with error `"Master context not configured"`
- The prompt is NOT versioned. Each save overwrites the previous content. There's no undo or history.
- The prompt must instruct the LLM to output JSON matching the Zod schema in `ai.ts` (`LLMResponseSchema`): `{ sign: string, horoscopes: [{ date: "YYYY-MM-DD", content: string }] }`
- Character count and estimated token count are shown in the UI badge bar
- The prompt should include the sign-specific "Likely Felt State" column and the "Planet Felt-Language Guide" — these are referenced by the user message in `callOpenRouter()`
