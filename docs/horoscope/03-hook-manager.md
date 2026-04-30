# Hook Manager

**Route**: `/admin/horoscope/hooks`
**Backend file**: `convex/hooks.ts`
**DB table**: `hooks`

## What It Does

Manages hook archetypes — the opening patterns for horoscope copy. Each hook defines a specific opening style (e.g., "The Mirror Hook" names something the reader is already doing). The generation pipeline injects the assigned hook into the LLM prompt so the AI writes in that style.

## The 4 Default Hooks

| Hook | Moon Phase Mapping | Opening Style |
|---|---|---|
| **The Mirror Hook** | `waxing` | Names something the reader is probably already doing/feeling. Reaction: "...how did you know?" |
| **The Permission Hook** | `new_moon` | Gives explicit permission to feel/do something they've been denying. Deeply validating. |
| **The Gentle Provocation** | `waning` | Challenges a pattern with warmth, not accusation. Creates self-recognition. |
| **The Observation Hook** | `full_moon` | Describes the reader's situation back to them as if the horoscope has been watching. |

## Auto-Assignment Logic

In `hooks.ts` → `getAssignedHook`:

```
1. If hookId provided (manual admin override) → use that hook (if active)
2. Else if moonPhaseCategory matches a hook's moonPhaseMapping → use that hook
3. Else → fallback to the first active hook
```

Moon phase categories come from `astronomyEngine.getMoonPhaseCategory()`:
- Phase names containing "new" → `"new_moon"`
- Phase names containing "full" → `"full_moon"`
- Phase names containing "waxing" or "first quarter" → `"waxing"`
- Phase names containing "waning" or "last quarter" → `"waning"`

## How Hooks Get Injected Into Prompts

In `ai.ts` → `formatHookForPrompt()`:
```
HOOK ARCHETYPE FOR THIS HOROSCOPE:
Type: The Mirror Hook
Description: Names something the reader is probably already doing or feeling...
Examples of this hook style:
1. "Still refreshing that one app, hoping the news has changed?"
2. "You've been moving fast lately — but do you actually know where you're going?"

Open the horoscope with this hook type. Do not copy the examples — use them as tone reference only.
```

This block is appended to the user message in `callOpenRouter()`.

## Data Model

```
hooks table:
  name: string                   // e.g., "The Mirror Hook"
  description: string            // one-sentence description
  examples: string[]             // 2-5 example opening lines
  isActive: boolean              // only active hooks are eligible for assignment
  moonPhaseMapping: string|null  // "new_moon" | "waxing" | "full_moon" | "waning" | null
  createdAt: number
  updatedAt: number
```
Index: `by_active` on `["isActive"]`

## CRUD Operations

- `getAll` — fetches all hooks (admin query)
- `create` — new hook with name, description, examples, active state, optional moon phase mapping
- `update` — patch any field by hookId
- `toggleActive` — flip isActive boolean
- `deleteHook` — permanent delete
- `seed` — idempotent: creates the 4 default hooks if the table is empty

## Admin UI Features

- Active vs Inactive sections (inactive hooks are dimmed)
- Moon phase auto-assignment grid showing which phase maps to which hook
- Sheet-based create/edit form with 2-5 example lines
- "Seed Defaults" button appears only when the hooks table is empty

## Things to Know

- A hook can have no `moonPhaseMapping` — it'll never be auto-selected but can be manually chosen
- Multiple hooks can map to the same moon phase, but `getAssignedHook` returns the first match
- Hooks are DB-driven. Adding/editing hooks requires zero deploys — changes take effect on the next generation run
- The "Auto-Assignment" card shows unassigned phases as "Unassigned" — this is informational only, not enforced
