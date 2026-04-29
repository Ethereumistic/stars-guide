# Oracle AI System — Session & Conversation Management

> Source: ORACLE_EXPLAINED.md §8

---

## Session Lifecycle

### 1. Creation — `createSession` mutation (`sessions.ts`)
- Requires authenticated user
- Stores `userId`, `featureKey` (optional), initial title (first 40 chars of question + "..."), status="active"
- Inserts first user message into `oracle_messages`
- Returns `sessionId`

### 2. Oracle Invocation — `invokeOracle` action (`llm.ts`)
- Loads session with all messages
- Verifies session belongs to user
- Assembles prompt, tries model chain
- Persists assistant message
- Increments quota (first response only)
- Generates title (first response only)

### 3. Follow-up Questions — `addMessage` mutation + `invokeOracle` action
- Client calls `addMessage` to persist user message
- Client calls `invokeOracle` with the same question text
- The full conversation history is included in the prompt (truncated to `maxContextMessages`)

### 4. Session List — `getUserSessions` query (`sessions.ts`)
- Returns last 50 sessions for current user, ordered by most recent

### 5. Session Operations
- `updateSessionStatus` — mark active/completed
- `updateSessionFeature` — change which feature is active
- `updateSessionBirthChartDepth` — change birth chart reading depth (core/full), internal mutation only
- `renameSession` — manually change session title
- `setSessionStarType` — assign "beveled" or "cursed" pin tier
- `deleteSession` — cascade delete all messages then session

---

## Legacy Session Migration

Sessions created before Oracle Tools v2 may have `featureKey: "birth_chart_core"` or `"birth_chart_full"`. On the next `invokeOracle` call, these are automatically migrated:
- `resolvedFeatureKey` is set to `"birth_chart"`
- The session is patched via `updateSessionFeature` with the new key
- `birthChartDepth` is set to `"full"` if the old key was `birth_chart_full`, `"core"` otherwise
- This migration happens transparently; users see no disruption

---

## Wiring — Session Data Flow

```
User action                    Convex mutations/queries        Database tables
─────────────────────────────────────────────────────────────────────────────────
"New Divination" button  ──▶  createSession                ──▶  oracle_sessions + oracle_messages
                                                            ──▶  returns sessionId

User types question       ──▶  createSession (with question)──▶  oracle_sessions + oracle_messages[0]
                                                            ──▶  returns sessionId

Oracle responds           ──▶  invokeOracle (action)        ──▶  reads oracle_sessions + oracle_messages
                                                            ──▶  builds prompt
                                                            ──▶  calls LLM
                                                            ──▶  writes oracle_messages[1] (assistant)
                                                            ──▶  updates oracle_sessions (title, modelUsed)

Follow-up question        ──▶  addMessage                   ──▶  oracle_messages (user message)
                          ──▶  invokeOracle (action)        ──▶  reads full history
                                                            ──▶  writes oracle_messages (assistant)
                                                            ──▶  increments quota (first response only)

Load session sidebar      ──▶  getUserSessions               ──▶  oracle_sessions (last 50, ordered by recent)

Delete session            ──▶  deleteSession                 ──▶  deletes oracle_messages (cascade)
                                                            ──▶  deletes oracle_sessions row
```

The session `featureKey` and `birthChartDepth` fields are read by `invokeOracle` to determine which feature and depth-level instructions to inject into the prompt. They are also auto-set by the intent classifier when no feature is active (see [Intent Classification](./13-intent-classification.md)).