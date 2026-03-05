# ⭐ ORACLE — North Star Architecture Document
> **stars.guide** | AI Astrology Oracle Product  
> Stack: Next.js 16 · Convex · OpenRouter · TailwindCSS · TypeScript · Cloudflare Workers

---

## 1. Product Vision

Oracle is a **conversational AI astrology guide** embedded inside stars.guide. It answers deeply personal questions across 6 life domains using a multi-step, context-aware conversation flow. The product must feel **mystical yet precise**, and under the hood must be **engineered for quality, cost efficiency, and safety**.

Oracle is not a generic chatbot. It is a **structured intelligence wrapper**. Unlike a typical AI wrapper, Oracle has a critical advantage: **every user has already completed onboarding and provided their full birth data** (date, exact time, geographic coordinates). This means Oracle starts every session with a pre-loaded astrological natal profile that most astrology apps would charge for. This data is auto-injected into every prompt — no asking, no guessing.

Follow-up questions exist exclusively to gather **context about other people** involved in the user's question (a partner, a friend, a rival) — never to ask the user about themselves.

---

## 2. Phase Overview

| Phase | Document | Description |
|-------|----------|-------------|
| **Phase 1** | `PHASE1_CONTENT.md` | Categories, Template Questions, Follow-up Questions |
| **Phase 2** | `PHASE2_PROMPT_ENGINEERING.md` | Natal chart calculation, prompt layers, astronomy-engine integration |
| **Phase 3** | `PHASE3_DATABASE.md` | Convex schema, quota system, tier limits |
| **Phase 4** | `PHASE4_ADMIN.md` | Admin panel `/admin/oracle/*` — full CMS + model config |
| **Phase 5** | `PHASE5_FRONTEND.md` | Frontend component architecture and conversation flow UI |

---

## 3. Core Principles

### 3.1 Birth Data is a First-Class Citizen
Every authenticated user has `users.birthData` in Convex, collected at onboarding. This object contains `date`, `time`, `location` (with lat/long), `sunSign`, `moonSign`, and `risingSign`. This data is **always** injected into the Oracle prompt. It is never optional, never asked for again, and is the foundation of Oracle's precision advantage over every other astrology chatbot.

### 3.2 astronomy-engine Powers the Natal Context
The `astronomy-engine` npm package (already installed) is used at session start to calculate a full real-time astrological profile from the user's birth data: planetary positions, house cusps, aspects, current transits, and upcoming significant events. This calculated data is assembled into a `natalContext` block and injected into the prompt. See Phase 2 for the complete list of what is calculated.

### 3.3 Follow-ups Ask About Other People Only
Follow-up questions exist for one purpose: gathering astrological and situational data about **third parties** mentioned in the question — a romantic partner, a friend, a family member. Questions that are purely about the user's own situation (career path, self-identity, spiritual gifts) may skip follow-ups entirely and go directly to Oracle. This is a UX and quality decision: asking users things we already know destroys trust and signals poor engineering.

### 3.4 Context-First, LLM-Second
Never call the LLM cold. Every Oracle session assembles: natal context (auto-calculated) + third-party context (follow-ups when applicable) + scenario injection + question, before invoking the LLM.

### 3.5 Layered Prompt Architecture
```
soul.md (global persona + safety rails)
  → category_context (domain-level framing)
    → scenario_injection (template-level behavioral rules)
      → natal_context (user's calculated astrological profile — always present)
        → third_party_context (from follow-up answers — when applicable)
          → question (what the user asked)
```
Each layer is independently stored in Convex and independently editable from admin.

### 3.6 Admin as Single Source of Truth
Everything — categories, templates, follow-ups, injections, soul prompt, model config, tier limits — lives in Convex and is managed via `/admin/oracle/*`. Code hardcodes structure, never content or configuration values.

### 3.7 OpenRouter Gateway with 3-Layer Fallback Chain
LLM calls route through OpenRouter. Three fallback models (A → B → C) are configurable from admin. If all three fail, a hardcoded graceful response D is returned. Oracle never surfaces a raw API error to users.

### 3.8 Tiered Quota System — Admin-Controlled
Question limits per user role are stored in `oracle_settings` (Convex), not in code. Admins change limits without deploys. The free tier has a **lifetime** cap; paid tiers reset on a rolling 24-hour window.

---

## 4. User Birth Data Shape

This is the exact shape of `users.birthData` as stored in Convex, available for every authenticated Oracle user:

```typescript
{
  date: "2000-04-14",          // ISO date string
  time: "15:17",               // 24h format, local time at birth location
  location: {
    city: "Sofia",
    country: "Bulgaria",
    countryCode: "bg",
    lat: 42.6977028,           // Required for house system calculation
    long: 23.3217359,          // Required for house system calculation
  },
  sunSign: "Aries",            // Pre-calculated at onboarding
  moonSign: "Virgo",           // Pre-calculated at onboarding
  risingSign: "Leo",           // Pre-calculated at onboarding (requires birth time + location)
}
```

All Oracle Convex actions that invoke the LLM **must** fetch this data before assembling the prompt. See Phase 2 for the complete list of what `astronomy-engine` calculates from it.

---

## 5. Quota System

| Role (`users.role`) | Limit | Reset | Notes |
|---------------------|-------|-------|-------|
| `user` (free) | 5 | **Never** | Lifetime cap. Purchasable with StarDust (future) |
| `popular` | 5 | Every 24h rolling | — |
| `premium` | 10 | Every 24h rolling | — |
| `moderator` | 10 | Every 24h rolling | — |
| `admin` | 999 | Every 24h rolling | Effectively unlimited |
| Unauthenticated | 0 | — | No access, redirect to /login |

All limit values and reset durations are stored in `oracle_settings` and editable from `/admin/oracle/settings`. The Convex quota mutation reads them at runtime — values are never hardcoded.

---

## 6. Data Flow Diagram

```
USER NAVIGATES TO /oracle
        │
        ▼
[Redirect to /oracle/new]
        │
        ▼
[Auth check → unauthenticated: redirect to /login]
        │
        ▼
[Quota check → at lifetime cap (free) or daily cap: show upgrade/StarDust prompt]
        │
        ▼
[users.birthData fetched and held in session context]
        │
        ▼
[User selects Category Badge]
        │
        ▼
[Template Questions appear (2 per category)]
        │
        ▼
[User clicks template → populates input → submits]
        │
        ▼
[Does this template involve a third party? (flag on template)]
   YES → [Follow-up Q1 → Q2 → Q3 (max 3, asking about another person)]
   NO  → [Skip directly to context assembly]
        │
        ▼
[astronomy-engine calculates full natal profile from birthData]
        │
        ▼
[Prompt assembled: soul + category + scenario + natal_context + 3rd_party_context + question]
        │
        ▼
[Quota incremented atomically in Convex]
        │
        ▼
[OpenRouter: try Model A → on fail try B → on fail try C → on fail return hardcoded D]
        │
        ▼
[Oracle streams answer to client via SSE]
        │
        ▼
[Full message saved to oracle_messages, session updated]
        │
        ▼
[Session appears in sidebar "Past Whispers"]
        │
        ▼
[Subsequent messages in session: no quota check, no follow-ups, direct LLM call]
```

---

## 7. File & Folder Structure

```
/app
  /oracle
    /page.tsx                        ← Server redirect to /oracle/new
    /new
      /page.tsx                      ← Oracle home: idle state, badges, input
    /chat
      /[sessionId]
        /page.tsx                    ← Active conversation view

/app/admin/oracle
  /page.tsx                          ← Oracle admin overview dashboard
  /categories/page.tsx
  /templates/page.tsx
  /follow-ups/page.tsx
  /context-injection/page.tsx
  /settings/page.tsx

/convex
  /schema.ts                         ← All table definitions
  /oracle
    /categories.ts
    /templates.ts
    /followUps.ts
    /sessions.ts
    /messages.ts
    /injections.ts
    /settings.ts
    /quota.ts                        ← Check + increment + reset logic
    /llm.ts                          ← OpenRouter action with fallback chain

/lib
  /oracle
    /promptBuilder.ts                ← Assembles all layers into final prompt
    /natalCalculator.ts              ← astronomy-engine wrapper (all calculations)
    /contextAssembler.ts             ← Formats follow-up answers into 3rd party block
    /streamHandler.ts                ← OpenRouter streaming + SSE to client
    /quotaGuard.ts                   ← Client-side quota state helper
```

---

## 8. Tech Stack Decisions

| Concern | Solution | Why |
|---------|----------|-----|
| Database + realtime | Convex | Reactive queries, perfect for live chat sidebar |
| LLM Gateway | OpenRouter | Model-agnostic, single key, fallback chain support |
| Natal chart calculation | `astronomy-engine` | Already installed, precise open-source engine |
| Auth | Convex Auth (`@convex-dev/auth`) | Already in stack |
| Streaming | Convex HTTP actions + SSE | Works on Cloudflare Workers edge runtime |
| State management | Zustand | Already in stack, ideal for conversation state machine |
| Admin forms | react-hook-form + zod | Type-safe, already in stack |
| Animations | motion (Framer Motion) | Already in stack |

---

## 9. Critical Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM gives harmful/unhinged responses | soul.md safety rails + pre-check for crisis keywords before any LLM call |
| Model A down | 3-layer fallback (A→B→C→D hardcoded), all configurable from admin |
| Token costs spiral | natal context is pre-calculated (free); follow-ups eliminated for self-only questions |
| User's birth data is inaccurate | Oracle response notes precision depends on data accuracy; user can update from profile settings |
| Admin sets quota to 0 accidentally | Confirmation modal + minimum value validation (cannot set below 1 for paid tiers) |
| Free tier abuse | Lifetime cap enforced server-side in Convex mutation; role check is authoritative |
| astronomy-engine missing birth time | Degrades gracefully: skips Ascendant/Rising and house cusp calculations, uses noon chart approximation, notes this in context |

---

## 10. MVP Scope

**In MVP (all 5 phases):**
- 6 categories, 12 template questions, follow-ups targeting third-party context
- Full natal chart auto-injection via astronomy-engine
- Soul prompt + category contexts + scenario injections
- 3-model fallback chain via OpenRouter (admin-configurable)
- Tier-based quota system with admin controls
- Full admin CMS at `/admin/oracle/*`
- Sidebar with past sessions
- `/oracle/new` and `/oracle/chat/[sessionId]` routing

**Post-MVP:**
- StarDust purchase flow for additional free-tier questions
- Oracle "memory" — cross-session pattern recognition per user
- Shareable oracle readings (public permalink)
- Voice input
- Synastry mode (compare user chart with third-party's chart)

---

## 11. Inter-Document References

Read and implement phase documents in order:
1. `PHASE1_CONTENT.md` — content layer (questions + follow-ups, all third-party focused)
2. `PHASE2_PROMPT_ENGINEERING.md` — natal calculation + full prompt assembly
3. `PHASE3_DATABASE.md` — build schema + quota tables first
4. `PHASE4_ADMIN.md` — admin CMS including model config and quota controls
5. `PHASE5_FRONTEND.md` — user-facing Oracle UI with routing