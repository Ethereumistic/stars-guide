# Oracle — How Everything Is Wired
> Reference document for any engineer or AI agent picking up this codebase.

---

## What Oracle Is

Oracle is a conversational astrology AI inside stars.guide. Users ask questions about their life across 6 domains (Self, Love, Work, Social, Destiny, Spirituality). Oracle answers using the user's real natal chart as context.

Every user who reaches Oracle has already completed onboarding and provided birth data. Oracle is never called blind — it always has a full astrological profile before touching the LLM.

---

## The One Thing That Makes Oracle Different

`users.birthData` exists for every user:

```typescript
{
  date: "2000-04-14",
  time: "15:17",
  location: { city: "Sofia", country: "Bulgaria", lat: 42.6977, long: 23.3217 },
  sunSign: "Aries",
  moonSign: "Virgo",
  risingSign: "Leo"
}
```

Before every LLM call, `lib/oracle/natalCalculator.ts` runs `astronomy-engine` against this data and produces a full natal context block (10 planets + house cusps + North/South Nodes + Chiron + current transits + Saturn return status + Moon phase). This block is ~270 tokens and is injected into every Oracle prompt as Layer 4. Oracle never asks users about their own signs or birth data — it already has everything.

**Follow-up questions exist only to gather data about third parties** (a partner, a friend) when a question involves another person. Templates flagged `requiresThirdParty: false` skip follow-ups entirely.

---

## Request Lifecycle (one complete Oracle session)

```
1. User navigates to /oracle → server redirects to /oracle/new

2. Auth check (middleware) → unauthenticated: redirect to /login

3. Quota check (Convex query: oracle/quota.checkQuota)
   → blocked: QuotaExhaustedBanner shown, stop here
   → allowed: continue

4. User selects category badge
   → Convex query: oracle_templates by categoryId

5. User clicks template question → populates input → submits

6. IF template.requiresThirdParty === true:
   → Fetch oracle_follow_ups for templateId
   → Show Q1 → user answers → show Q2 → ... (max 3)
   → Save each answer to oracle_follow_up_answers

7. IF template.requiresThirdParty === false:
   → Skip follow-up flow entirely

8. natalCalculator.ts runs astronomy-engine on users.birthData
   → Returns full natal context block

9. promptBuilder.ts assembles the final prompt:
   Layer 1: soul_prompt (from oracle_settings)
   Layer 2: category context (from oracle_category_contexts)
   Layer 3: scenario injection (from oracle_scenario_injections)
   Layer 4: natal context block (calculated, always present)
   Layer 5: third-party context (from follow-up answers, if applicable)
   Layer 6: user's question

10. Safety pre-check runs on user's question text
    → Crisis keywords detected: return crisis_response_text, do NOT increment quota, stop

11. Convex action (oracle/llm.ts) calls OpenRouter:
    Try model_a → on fail try model_b → on fail try model_c → on fail return fallback_response_text (D)

12. Session is created in oracle_sessions (status: "collecting_context" → "active")
    Client navigates to /oracle/chat/{sessionId}

13. Response streams via SSE from Convex HTTP action → client useOracleStream hook

14. On stream complete:
    → Full message saved to oracle_messages
    → oracle_quota_usage incremented (Convex mutation, atomic)
    → Session status updated to "active"

15. Session appears in sidebar ("Past Whispers") via reactive Convex query

16. Subsequent messages in same session:
    → No quota check (quota consumed at session open)
    → No follow-ups
    → Full message history sent to LLM each turn
```

---

## Database Tables (Convex)

**Content tables** (admin-editable, all soft-delete):
- `oracle_categories` — the 6 domain badges
- `oracle_templates` — questions per category; has `requiresThirdParty: boolean`
- `oracle_follow_ups` — questions about third parties, linked to templates (max 3 per template)
- `oracle_follow_up_options` — answer options for select-type follow-ups
- `oracle_scenario_injections` — per-template prompt behavioral rules
- `oracle_category_contexts` — per-category domain framing text

**Config table** (key-value, always strings, parsed at app layer):
- `oracle_settings` — everything configurable: soul prompt, model A/B/C/D, temperature, max_tokens, top_p, quota limits per role, crisis text, fallback text, kill switch

**Runtime tables**:
- `oracle_sessions` — one per conversation; has `status`, `templateId`, `categoryId`
- `oracle_messages` — all messages including follow-up prompts and Oracle responses; tracks `modelUsed`, `fallbackTierUsed`, token counts
- `oracle_follow_up_answers` — user's answers to follow-up questions, scoped to session
- `oracle_quota_usage` — one row per user; has `dailyCount`, `dailyWindowStart`, `lifetimeCount`

**Version history**:
- `oracle_prompt_versions` — snapshot of soul prompt / category context / scenario injection on every admin save; supports rollback

---

## Prompt Assembly Detail

`lib/oracle/promptBuilder.ts` produces two strings:

**systemPrompt** (sent as `role: "system"`):
```
{soul_prompt}
---
{category_context for selected category}
---
{scenario_injection for selected template}
```

**userMessage** (sent as `role: "user"`):
```
{natal context block from natalCalculator}

{third-party context block from contextAssembler}   ← only if requiresThirdParty

My question: {user's question}
```

The LLM payload:
```typescript
{
  model: settings.model_a,          // falls back to model_b, model_c, then D
  temperature: settings.temperature, // recommended 0.82
  max_tokens: settings.max_tokens,   // recommended 600
  top_p: settings.top_p,             // recommended 0.92
  stream: true,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ]
}
```

For follow-up messages within an active session, the full message history (all previous `oracle_messages` for that session) is prepended before the new user message.

---

## Quota System

Stored entirely in `oracle_settings` — never hardcoded. Keys follow the pattern `quota_limit_{role}` and `quota_reset_{role}`.

| Role | Reset | Default limit |
|------|-------|---------------|
| `user` | Never (lifetime) | 5 |
| `popular` | 24h rolling | 5 |
| `premium` | 24h rolling | 10 |
| `moderator` | 24h rolling | 10 |
| `admin` | 24h rolling | 999 |
| Unauthenticated | — | 0 (blocked at middleware) |

`oracle/quota.ts` has two functions:
- `checkQuota(userId)` — query, returns `{ allowed, remaining, reason, resetsAt }`
- `incrementQuota(userId)` — mutation, called after successful LLM response (not before)

Crisis responses do not consume quota. The increment only fires after a successful model response.

---

## Model Fallback Chain

Configured in `oracle_settings` as `model_a`, `model_b`, `model_c`. All selectable from admin using this list:

```
x-ai/grok-4.1-fast          (default A — fast, cost-efficient)
x-ai/grok-4.1
google/gemini-2.5-flash-lite
google/gemini-2.5-flash      (recommended A)
anthropic/claude-sonnet-4    (recommended B — best quality)
openai/gpt-4.1-mini
arcee-ai/trinity-large-preview:free
stepfun/step-3.5-flash:free
z-ai/glm-4.5-air:free
NONE                         (disables the slot)
```

`oracle/llm.ts` tries A → B → C sequentially. If all fail, `fallback_response_text` (D) is returned as a hardcoded string. The user always sees a graceful Oracle-voiced message — never a raw error.

---

## astronomy-engine Calculations (`lib/oracle/natalCalculator.ts`)

Input: `users.birthData` (date + time + lat/long)

Calculates:
- **Natal planets**: ecliptic longitude → zodiac sign + degree for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **Ascendant + 12 house cusps**: Placidus system using Local Sidereal Time + lat
- **North/South Nodes**: Moon's ascending node
- **Chiron**: from ephemeris
- **Current transits**: same 10 planets for today's date
- **Transit aspects**: conjunction (0° ±8°), opposition (180° ±8°), trine (120° ±8°), square (90° ±8°), sextile (60° ±6°) between today's planets and natal planets
- **Saturn return**: active if current Saturn within 5° of natal Saturn
- **Current Moon phase**: name + sign

Graceful degradation: if birth time is null/missing → skip Ascendant and house cusps, use noon chart, note this in context. If `astronomy-engine` throws → fall back to `sunSign`/`moonSign`/`risingSign` from `birthData` directly. Never block the session.

---

## Routing

```
/oracle                          → server redirect to /oracle/new
/oracle/new                      → IDLE state: welcome, category badges, input
/oracle/chat/[sessionId]         → active conversation; resumes in-progress follow-up flow if session.status === "collecting_context"
/admin/oracle/                   → dashboard
/admin/oracle/categories
/admin/oracle/templates
/admin/oracle/follow-ups
/admin/oracle/context-injection  → soul prompt versions, category contexts, scenario injections
/admin/oracle/settings           → model config, quota limits, kill switch
```

---

## Admin Panel Capabilities

Everything Oracle does is configurable from `/admin/oracle/*` without code changes:

- Enable/disable Oracle globally (kill switch)
- Edit the soul prompt (versioned, rollbackable)
- Edit category context per domain (versioned)
- Edit scenario injection per template (versioned)
- Select model A / B / C / D fallback text
- Tune temperature (recommended 0.82), max_tokens (recommended 600), top_p (recommended 0.92)
- Set quota limits per role
- Edit follow-up questions and options per template
- Toggle `requiresThirdParty` on any template
- View version history and restore any prompt to a previous version

All admin mutations check `users.role === 'admin'` server-side in Convex — frontend route protection is UX only.

---

## Key Files

```
convex/oracle/
  categories.ts      queries + mutations for oracle_categories
  templates.ts       queries + mutations for oracle_templates
  followUps.ts       queries + mutations for oracle_follow_ups + options
  sessions.ts        create, update, getWithMessages
  messages.ts        save messages, follow-up answers
  quota.ts           checkQuota (query) + incrementQuota (mutation)
  settings.ts        getSetting, getAllSettings, upsertSetting
  injections.ts      scenario injections + category contexts + version history
  llm.ts             OpenRouter action with fallback chain + streaming

lib/oracle/
  natalCalculator.ts    astronomy-engine wrapper → natal context block
  promptBuilder.ts      assembles all 6 layers into systemPrompt + userMessage
  contextAssembler.ts   formats follow-up answers into third-party context block
  streamHandler.ts      SSE stream from OpenRouter to client
  quotaGuard.ts         client-side quota state helper (UX only, not authoritative)

app/oracle/
  page.tsx              server redirect to /oracle/new
  new/page.tsx          IDLE state UI
  chat/[sessionId]/page.tsx   conversation view

app/admin/oracle/
  page.tsx              dashboard
  categories/page.tsx
  templates/page.tsx
  follow-ups/page.tsx
  context-injection/page.tsx
  settings/page.tsx
```

---

## State Management (Zustand)

`OracleStore` manages conversation flow state on the client. States in order:

`idle` → `template_selection` → `follow_up_collection` (skipped if `requiresThirdParty: false`) → `oracle_responding` → `conversation_active`

The store holds: selected category/template, pending question text, follow-up answers in progress, streaming content, quota remaining. Convex queries are reactive and update the store automatically — the store does not duplicate Convex data, it only holds ephemeral UI state and streaming buffers.

---

## What Oracle Knows About the User (Before They Say Anything)

When Oracle opens, it has:
1. User's first name (from `users` table)
2. Full natal chart: all 10 planets by sign and degree, 12 house cusps, Nodes, Chiron
3. Current transits and which natal planets they are aspecting right now
4. Whether the user is in their Saturn return
5. Current Moon phase and sign

This is what Oracle cites in responses. The soul prompt instructs Oracle to always reference at least 2–3 specific placements per response, never speak generically.
