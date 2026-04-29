# Oracle AI System — Admin Configuration Surface

> Source: ORACLE_EXPLAINED.md §3

The admin UI lives at `/admin/oracle/settings` (file: `src/app/admin/oracle/settings/page.tsx`). It is a tabbed interface with 6 tabs:

---

### Tab 1: Soul
- Full-text editor for the unified soul document (`oracle_soul` key)
- Shows character count
- "Restore Default" button to reset to `DEFAULT_ORACLE_SOUL`
- Save triggers `upsertSetting` mutation

### Tab 2: Providers
- `ProviderManager` component (`src/components/oracle-admin/provider-manager.tsx`)
- Add/remove provider endpoints
- Each provider has: `id`, `name`, `type` (openrouter/ollama/openai_compatible), `baseUrl`, `apiKeyEnvVar`
- API keys are NOT stored in the database — only the **environment variable name** is stored. The actual key is read from `process.env[provider.apiKeyEnvVar]` at invocation time.
- Saved as JSON string via `upsertProvidersConfig` mutation which validates with `validateProvidersConfig()`

### Tab 3: Model
- `ModelChainEditor` component (`src/components/oracle-admin/model-chain-editor.tsx`)
- Ordered list of `{providerId, model}` entries with drag reorder
- Each entry shows its fallback tier badge (A, B, C...)
- Model combobox with known model suggestions per provider type
- Temperature slider (0–1, step 0.05, default 0.82)
- Top-p slider (0.5–1, step 0.01, default 0.92)
- Streaming toggle (default on)
- Saves providers + chain + temperature + top_p + stream_enabled atomically

### Tab 4: Limits
- `max_response_tokens` — sent as `max_tokens` to the LLM (100–16000, default 1000)
- `max_context_messages` — max conversation history messages in prompt (2–100, default 20)

### Tab 5: Quotas
- Per-role quota limits: free, popular, premium, moderator, admin
- Free tier uses lifetime cap; all others use rolling 24h window

### Tab 6: Operations
- **Kill Switch**: Toggle Oracle on/off with CONFIRM dialog
- **Crisis Response**: Editable text for crisis intervention messages
- **Fallback Response**: Editable text for when all models fail

---

## Authentication

All admin queries/mutations call `requireAdmin()` (`convex/lib/adminGuard.ts:12-21`) which:
1. Calls `getAuthUserId(ctx)` — throws if unauthenticated
2. Fetches user, verifies `user.role === "admin"` — throws if not admin
3. Returns `{ userId, user }` for downstream use

---

## Wiring — How Admin Config Reaches the LLM Pipeline

```
Admin UI
  │
  ├─ Tab: Soul ──────── upsertSetting("oracle_soul", text) ────▶ oracle_settings table
  │                                                                          │
  ├─ Tab: Providers ─── upsertProvidersConfig({...}) ────────────▶ oracle_settings table (providers_config)
  │                                                                          │
  ├─ Tab: Model ─────── upsertProvidersConfig + upsertSetting ──▶ oracle_settings table (model_chain, temperature, top_p, stream_enabled)
  │                                                                          │
  ├─ Tab: Limits ─────── upsertSetting("max_response_tokens", ...) ▶ oracle_settings table
  │                                                                          │
  ├─ Tab: Quotas ─────── upsertSetting("quota_limit_*", ...) ───▶ oracle_settings table
  │                                                                          │
  └─ Tab: Operations ─── upsertSetting("kill_switch", ...) ─────▶ oracle_settings table
                                                                             │
                                                               All read by invokeOracle at runtime
                                                               via loadRuntimeSettings()
```

Every setting flows through the `oracle_settings` table, which `invokeOracle` reads at the start of every request. There is no caching — the DB is the source of truth.