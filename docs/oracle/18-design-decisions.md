# Oracle AI System — Key Design Decisions & Trade-offs

> Source: ORACLE_EXPLAINED.md §18

---

### 1. Hardcoded Safety Rules vs. DB-Stored
Safety rules are hardcoded in code, not editable from admin. This is intentional: changes require code review and a deploy, preventing a single admin from accidentally weakening safety. The trade-off is slower iteration on safety rules.

### 2. Single Soul Document vs. Modular Sections
The old 7-document soul system was replaced with one unified `oracle_soul` document. This simplifies admin editing (one textarea vs. seven) and reduces prompt assembly complexity from 7 parameters to fewer. The trade-off is that the document is larger and less modular.

### 3. Title Generation via Response Append vs. Separate Call
Embedding the title directive in the main prompt and parsing it from the response saves a separate LLM call. The trade-off is that not all models reliably follow the instruction, requiring the `deriveTitleFromContent` fallback.

### 4. Env-Var API Keys vs. DB-Stored Keys
API keys are never stored in the database. Only the **environment variable name** is stored. The actual key is resolved from `process.env` at runtime. This prevents database leaks from exposing API keys but requires environment configuration on the Convex deployment.

### 5. Birth Data in User Message vs. System Prompt (v2 refined)
The birth chart **data** lives in the user message as `[BIRTH CHART DATA]`, while the birth chart **reading instructions** (core vs full depth) live in the system prompt. This separation ensures:
- The model treats chart data as user-provided facts (not system instructions)
- Instructions are system-level directives the model must follow
- Depth can be changed without altering data injection

### 6. Pipeline-Gated Birth Context vs. Universal Injection (v2 change)
Birth data is injected only when a pipeline declares `needsBirthData: true`. Only `birth_chart` and `synastry` pipelines do this. The `generic_chat` pipeline intentionally sets `needsBirthData: false` — generic conversations don't need the full chart. When multiple pipelines are active, birth data IS injected if any pipeline needs it.

### 7. Depth via Instructions, Not Data Scope (v2 change)
Previously, "core" mode only injected Sun/Moon/Ascendant (3 placements, 4 aspects) while "full" mode injected everything (14 placements, 12 houses, 8 aspects). The v2 architecture ALWAYS injects the full data and uses instruction blocks to tell the model where to focus. This means:
- A user in "core" mode who asks "What about my Venus?" gets a real answer — the AI sees Venus
- No data is thrown away based on feature selection
- The AI always has the full picture
- Depth is a prompt instruction, not a data filter

### 8. Journal Context is Pipeline-Gated (v2 change)
Journal context is injected only when a pipeline declares `needsJournalContext: true` AND the user has consented. The `journal_recall` pipeline sets `needsJournalContext: true`; `binaural_beats` and `synastry` set it to `false`. This means journal context is not present in every session — only when its data is relevant to the active feature.

### 9. Streaming Flush Interval (50ms)
The streaming flush interval is a flat 50ms (`MIN_FLUSH_INTERVAL_MS = 50`). Each SSE chunk triggers a potential flush, throttled to at most once per 50ms. This balances UI responsiveness against Convex write load.

### 10. Quota Incremented Only on Success
Quota is only incremented after a successful LLM response. Crisis responses, kill-switch responses, and all-models-failed responses do NOT consume quota. This means failures don't penalize the user.

### 11. Admin Guard as the Real Enforcement
The `requireAdmin()` check in every admin-facing Convex function is the real security layer, not the Next.js route guards. A motivated attacker could call Convex functions directly via the API; `requireAdmin` ensures they'd be rejected.

### 12. Journal Context is Non-Blocking
Journal context assembly is wrapped in try/catch in `invokeOracle`. If it fails for any reason (consent missing, database error, empty journal), Oracle proceeds without journal context. The user always gets a reading — just without journal-awareness. This ensures the Journal integration never degrades Oracle's reliability.

### 13. Journal Consent is Server-Enforced
The consent check happens server-side in `assembleJournalContext()`. The `[JOURNAL CONTEXT]` block is only built when `journal_consent.oracleCanReadJournal === true`. The client cannot bypass this — even if the frontend failed to check consent, the backend function would return `null`. The `requiresJournalConsent` flag on Oracle features is a UX hint (greying out disabled features), not a security enforcement.

### 14. Journal Prompt Suggestions are Optional
The `JOURNAL_PROMPT_DIRECTIVE` uses the word "MAY" (not "MUST"). Oracle only suggests a journal prompt when it naturally touches on emotional themes. This avoids spammy prompts on every response and maintains the conversational feel.

### 15. Intent Routing Before Feature Injection (v3 change)
The intent router runs BEFORE feature injection in `invokeOracle`. This means the routing decision determines which pipeline(s) get activated. The router uses a fast LLM call for semantic understanding (handling typos, creative phrasing, multi-intent detection), falling back to regex on failure. **The LLM router does NOT gate intent detection on data availability** — birth chart/synastry intents are always detected regardless of data. However, **the regex fallback DOES gate** `birth_chart` and `synastry` behind `hasBirthData === true`. Journal recall intent is filtered after routing if the user hasn't consented. This ensures users get chart-reading format even without stored data (the AI asks for it), rather than falling back to generic chat.

The LLM router adds ~200-500ms latency on the first message of a new session only. Subsequent messages use the persisted `featureKey` (manual selection shortcut, zero latency). The regex fallback ensures the system never breaks — if the LLM call fails, times out, or returns invalid JSON, the original regex patterns are used instead.

### 16. Legacy Feature Key Migration (v2 change)
Sessions created before v2 may have `featureKey: "birth_chart_core"` or `"birth_chart_full"`. Rather than requiring a database migration, the `invokeOracle` action detects these legacy keys on the next call and automatically patches the session to `featureKey: "birth_chart"` with the appropriate `birthChartDepth`. This is transparent to the user and requires no admin action.