# Oracle AI System — Architecture Overview

> Source: ORACLE_EXPLAINED.md §1

The Oracle is a conversational astrology AI built on a **Convex + Next.js** stack. The architecture has five distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  /oracle/new      — Landing page + first question input      │
│  /oracle/chat/[id] — Chat view with streaming responses      │
│  /admin/oracle/* — Admin settings UI                         │
│  Debug Panel      — Real-time LLM observability (admin only)│
│  Zustand Store    — Client-side Oracle state management      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Convex React hooks
                           │ (useQuery, useMutation, useAction)
┌──────────────────────────▼──────────────────────────────────┐
│                   BACKEND (Convex)                            │
│  oracle/llm.ts       — invokeOracle action (Node runtime)   │
│  oracle/sessions.ts  — Session & message CRUD               │
│  oracle/settings.ts  — Admin settings read/write              │
│  oracle/quota.ts     — Server-authoritative quota checks      │
│  oracle/features.ts  — Feature injection queries             │
│  oracle/debug.ts    — Admin debug queries (provider list, timing) │
│  oracle/upsertProviders.ts — Provider/chain config mutations │
│  lib/adminGuard.ts   — Admin authorization enforcement        │
│                                                               │
│  ═══ Intent Router (LLM + regex fallback) ═══              │
│  lib/oracle/intentRouter.ts — scoreIntentsWithLLM() primary,  │
│                                  scoreIntents() regex fallback│
│  lib/oracle/intentRouterPrompt.ts — LLM prompt + parser       │
│                               │
│  ═══ Pipeline Architecture ═══                              │
│  lib/oracle/pipelines/ — birthChart, journalRecall,           │
│                           binauralBeats, genericChat           │
│  lib/oracle/pipelineTypes.ts — shared types (ScoredIntent,  │
│                                  IntentRouterResult, Pipeline)│
│                               │
│  ═══ Feature System ═══                                      │
│  lib/oracle/features.ts — Regex patterns (fallback),          │
│                           feature definitions, injection text │
│  lib/oracle/featureContext.ts — Universal birth context       │
│                                  builder + depth instructions │
│                                                               │
│  ═══ Journal Integration (consent-gated) ═══                 │
│  journal/context.ts  — [JOURNAL CONTEXT] block builder       │
│  journal/consent.ts  — Consent read/write for Oracle access   │
│  journal/entries.ts  — Journal entry reads for context        │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch (OpenAI-compatible API)
┌──────────────────────────▼──────────────────────────────────┐
│              INFERENCE PROVIDERS (external)                  │
│  OpenRouter, Ollama, OpenAI-compatible endpoints             │
│  Model fallback chain: Tier A → Tier B → Tier C → Tier D    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              JOURNAL SYSTEM (peer, consent-gated)            │
│  See tasks/JOURNAL_EXPLAINED.md for full documentation       │
│  Provides [JOURNAL CONTEXT] block when consent is granted   │
│  oracle_messages.journalPrompt — Journal prompt suggestions  │
│  journal_recall feature — Cosmic Recall with expanded context │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Properties

- **Server-authoritative**: All quota checks, prompt assembly, and LLM calls happen server-side. Client-side quota displays are UX-only hints.
- **Streaming-first**: Tokens stream from the LLM through Convex into the reactive UI in near-real-time (300ms flush intervals).
- **Hardcoded safety first**: The safety rules block is hardcoded in code, always position 1 in the system prompt, and cannot be overridden by admin-editable settings.
- **Multi-provider resilience**: A ranked fallback chain tries multiple models/providers; if all fail, a hardcoded fallback message is returned.
- **LLM intent routing**: The intent classifier uses a fast LLM call (~200 tokens, ~200-500ms) for semantic understanding of the user's message, with regex patterns as a reliable fallback on LLM failure. This handles typos, creative phrasing, and multi-intent detection that regex cannot.
- **Pipeline architecture**: Intents are resolved to pipeline objects that declare their data requirements and build their own prompt blocks. Multiple pipelines can be active simultaneously (e.g., birth_chart + journal_recall). Pipelines are composed by the orchestrator — their system blocks are sorted by priority and their user blocks are merged.
- **Universal birth context** (v2): Birth data is ALWAYS injected into the prompt when available and a pipeline needs it, regardless of which feature is active. Depth is controlled by instructions, not data scope. The birth_chart pipeline injects a [CHART DATA UNAVAILABLE] block when there's no stored data, so the AI responds in chart-reading format and asks for data.
- **Cross-context mixing** (v2): Birth data, journal context, and timespace context coexist in every prompt. A Cosmic Recall session can reference Venus placements because birth data is always present. Data gathering is driven by pipeline requirements — if ANY active pipeline needs it, it's gathered.

## Wiring — What Connects to What

| This component | Depends on | Provides to |
|---|---|---|
| Frontend (Next.js) | Convex backend (queries, mutations, actions) | User interaction, streaming display |
| Convex backend | Inference providers, Journal system, DB | Prompt assembly, LLM invocation, session management |
| Inference providers | — | LLM completions (main Oracle call + intent router call) |
| Intent router (LLM) | Inference providers (fast model from chain) | IntentRouterResult → pipeline resolution |
| Intent router (regex) | Pattern lists in features.ts | IntentRouterResult → pipeline resolution (fallback) |
| Journal system | Convex DB (consent, entries) | `[JOURNAL CONTEXT]` block for Oracle |
| Zustand store | Convex reactive queries | Client state (selected feature, debug metrics, streaming flag) |

See the [Master Wiring Guide](./00-MASTER-WIRING-GUIDE.md) for the complete picture of how all components interconnect.