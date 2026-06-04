# Oracle AI System — User-Facing Flow (End-to-End Walkthrough)

> Source: ORACLE_EXPLAINED.md §15

---

### Phase 1: User Opens Oracle

1. User navigates to `/oracle` → server-side redirect to `/oracle/new`
2. Layout (`src/app/oracle/layout.tsx`) wraps all oracle pages with sidebar + top bar
3. `OracleNewPage` renders: greeting with username, Oracle icon with pulse animation, `OracleInput` component
4. Client queries `checkQuota` and `getSetting("kill_switch")`
5. If kill switch is on, shows "The Oracle rests" instead of input
6. Quota remaining is displayed below input

---

### Phase 2: User Types Question

1. User types in `OracleInput` — standard text input with Enter-to-send
2. Optional: user selects a feature from `+` dropdown menu
3. If feature requires birth data but user has none, the feature context will include a "birth data unavailable" block (handled server-side)
4. If feature requires journal consent but user hasn't granted it, the feature is disabled in the dropdown with "Requires journal access" tooltip
5. Zustand store tracks `pendingQuestion` and `selectedFeatureKey`

---

### Phase 3: User Submits

1. `handleSubmit` in `OracleNewPage` calls `createSession` mutation with `{ featureKey, questionText }`
2. `createSession` creates `oracle_sessions` row + first `oracle_messages` row (role=user)
3. Returns `sessionId`
4. Zustand: `setSessionId(sessionId)`, `setOracleResponding()`
5. Client navigates to `/oracle/chat/${sessionId}`

---

### Phase 4: Oracle Invokes

1. `OracleChatPage` renders, observes `state === "oracle_responding"`
2. Detects there's a user message without a corresponding assistant response
3. Calls `invokeOracle` action with `{ sessionId, userQuestion, timezone }`
4. **Server-side execution** (the full `invokeOracle` pipeline):
   a. Input validation (max length check)
   b. Kill switch check → if on, return fallback
   c. Crisis detection → if triggered, return crisis response
   d. Load session + messages
   e. Load runtime settings (soul, model params, providers, chain)
   f. Load user (birthData, identity)
   g. **Build birth context** — when a pipeline needs it (`needsBirthData: true`) and `user.birthData` exists (`buildUniversalBirthContext`)
   h. Resolve active feature (with legacy migration for `birth_chart_core`/`birth_chart_full`)
   i. Fetch journal consent status
   j. Run intent routing (`scoreIntentsWithLLM`) — LLM call for semantic classify, regex fallback on failure; auto-activate and persist `featureKey` + `birthChartDepth`
   k. Resolve active pipelines from intents — map to pipeline objects, compose data requirements
   l. Gather pipeline data (birth data if any pipeline needs it, journal context if any pipeline needs it + consent, timespace)
   m. Build feature injection (depth-specific for `birth_chart`, standard for others)
   n. **Assemble journal context** — if any active pipeline needs it AND `hasJournalConsent === true` (expanded budget for Cosmic Recall)
   o. Build timespace context
   p. Compose prompt blocks from ALL active pipelines (system blocks sorted by priority; user blocks merged + sanitized question)
   q. Build conversation history (truncated)
   p. Iterate model chain:
      - For each entry: find provider, resolve API key from env, build URL/headers/body, fetch
      - If streaming: create message placeholder, read SSE stream, flush throttled to 50ms, parse title, finalize
      - If non-streaming: parse complete response, create/finalize message
      - On success: increment quota (first response only), generate title, return
      - On failure: log, try next model
   q. If all models fail: insert hardcoded fallback message
5. Action resolves, client sets `isStreaming = false`, `setConversationActive()`

---

### Phase 5: User Sees Response

1. During streaming: Convex reactive queries update the message content every 50ms (throttled)
2. UI shows growing text with blinking cursor
3. After completion: full response visible, copy button appears
4. Session title updated (from TITLE: line parsing)
5. Quota indicator updated

---

### Phase 6: Follow-up Questions

1. User types follow-up in bottom input bar
2. `handleSendFollowUp` fires:
   a. Calls `addMessage` mutation to persist user message
   b. Sets pending optimistic message for immediate display
   c. Calls `invokeOracle` with the new question
3. The LLM receives full conversation history, so context is maintained
4. Birth data is re-built fresh per-message (never stale)
5. Response appears as new assistant message

---

### Phase 7: Session Sidebar

- Left sidebar lists all sessions (most recent first, max 50)
- Each session shows title, model used indicator
- Actions: rename, star type (beveled/cursed), delete
- "New Divination" button to start fresh
- Search modal (Cmd+K style) for finding past sessions

---

## Wiring — Full Request Lifecycle

```
[Phase 1-2: User opens Oracle + types question]
       │
       ▼
[Phase 3: Submit]
  createSession ──▶ oracle_sessions + oracle_messages[0=USER]
  navigate to /oracle/chat/{sessionId}
       │
       ▼
[Phase 4: invokeOracle]
  ┌─ kill_switch? ── YES → return fallback (Tier D)
  ├─ crisis? ────── YES → return crisis response (Tier D)
  ├─ input valid? ── NO  → reject
  └─ valid request ↓
       │
  Load settings → Build birth context → Resolve feature → Intent route (LLM)
       │         → Assemble journal → Build timespace → Compose prompt blocks
       │
       ▼
  Model chain iteration (Tier A → B → C → D)
       │
       ▼
  [Phase 5: Response]
  Stream to UI via Convex reactivity (50ms throttled flush)
  Parse TITLE: line → update session title
  Increment quota (first response only)
       │
       ▼
  [Phase 6: Follow-up]
  addMessage ──▶ oracle_messages[N=USER]
  invokeOracle ──▶ oracle_messages[N+1=ASSISTANT]
  (full history included in prompt)
       │
       ▼
  [Phase 7: Sidebar]
  getUserSessions ──▶ list of oracle_sessions (last 50)
```