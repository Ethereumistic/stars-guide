# Oracle Multi-Provider Admin UI & Settings Overhaul

## Objective

Transform the Oracle settings admin page (`/admin/oracle/settings`) from a hardcoded OpenRouter-only model selector into a fully dynamic multi-provider system. The backend already supports multiple providers (`ProviderConfig`, `ModelChainEntry`, `callProviderStreaming`, etc.) — the gap is entirely in the admin UI and the data flow between UI ↔ Convex. This plan also addresses: (1) migrating away from legacy `model_a/b/c` to the new `model_chain` + `providers_config` JSON settings, (2) adding runtime validation for provider configs, (3) supporting Ollama and additional providers, (4) allowing custom model names via free-text input alongside preset suggestions, and (5) any Convex errors that are blocking the current setup.

---

## Current State Analysis

### What Already Works (Backend)
- `lib/oracle/providers.ts` defines `ProviderConfig`, `ModelChainEntry`, `PROVIDER_TYPES`, `PROVIDER_TYPE_PRESETS`, `PROVIDER_TYPE_INFO`, `KNOWN_MODELS_PER_PROVIDER_TYPE` — a complete multi-provider data model.
- `convex/oracle/llm.ts:258-304` iterates through `modelChain` entries, looks up the `provider` by `providerId`, and calls each via `callProviderStreaming()` with provider-specific headers and URL construction.
- `convex/oracle/settings.ts:41-109` (`getPromptRuntimeSettings`) already reads `providers_config` and `model_chain` from `oracle_settings`, falling back to legacy `model_a/b/c` keys.
- `convex/oracle/seed.ts:558-583` seeds both new-format (`providers_config` JSON, `model_chain` JSON) and legacy (`model_a/b/c` string) settings.
- `convex/oracle/migrations.ts:108-187` has a V3 migration that creates the new settings.
- `buildProviderHeaders()` and `buildProviderUrl()` in `lib/oracle/providers.ts:75-110` handle OpenRouter, Ollama, and OpenAI-compatible providers correctly.

### What's Broken / Missing (Frontend & Integration)
- **The settings UI** (`src/app/admin/oracle/settings/page.tsx`) only has 3 hardcoded `<Select>` dropdowns with 6 OpenRouter models, writing to legacy `model_a/b/c` keys — it never writes `providers_config` or `model_chain`.
- **The hardcoded `MODEL_OPTIONS` array** (`settings/page.tsx:45-52`) is stale and disconnected from `KNOWN_MODELS_PER_PROVIDER_TYPE` in `providers.ts`.
- **No provider management UI** — there is no way to add, edit, or remove providers from the admin dashboard.
- **No model chain UI** — there is no way to reorder, add, or remove entries from the fallback chain.
- **Type assertions without validation** — `parseProvidersConfig` and `parseModelChain` use `as ProviderConfig[]` / `as ModelChainEntry[]` without runtime shape checks.
- **BOM characters** — `convex/oracle/settings.ts` and `convex/oracle/soul.ts` start with BOM on line 1, which may cause build issues.
- **Duplicate provider files** — `lib/oracle/providers.ts` and `src/lib/oracle/providers.ts` are identical copies; the `lib/` version is the one imported by convex functions.

---

## Implementation Plan

### Phase 1: Backend Hardening & Validation

- [ ] **1.1. Remove BOM characters** from `convex/oracle/settings.ts:1` and `convex/oracle/soul.ts:1`. These zero-width characters can cause subtle build/parse issues in some environments.

- [ ] **1.2. Add runtime validation to `parseProvidersConfig()`** in `lib/oracle/providers.ts:50-59`. Replace the bare `as ProviderConfig[]` assertion with a shape check that verifies each entry has the required fields (`id`, `name`, `type`, `baseUrl`, `apiKeyEnvVar`) and that `type` is one of the valid `ProviderType` values. Malformed entries should be filtered out; if all entries are invalid, fall back to `DEFAULT_PROVIDERS`. This same change must be mirrored in `src/lib/oracle/providers.ts`.

- [ ] **1.3. Add runtime validation to `parseModelChain()`** in `lib/oracle/providers.ts:61-70`. Replace the bare `as ModelChainEntry[]` assertion with a shape check that verifies each entry has `providerId` (string) and `model` (string). Filter out invalid entries; if all are invalid, fall back to `DEFAULT_MODEL_CHAIN`. Mirror in `src/lib/oracle/providers.ts`.

- [ ] **1.4. Add `validateProvidersConfig()`** to `lib/oracle/providers.ts` — a function that checks: (a) no duplicate `id` values, (b) each `type` is a valid `ProviderType`, (c) each `baseUrl` is a valid URL string, (d) `apiKeyEnvVar` is a non-empty string for non-Ollama providers. This will be called by a new Convex mutation for validated upserts.

- [ ] **1.5. Add a `validateModelChain()`** function to `lib/oracle/providers.ts` that checks: (a) each `providerId` references a provider that exists in the current `providers_config`, (b) no duplicate `providerId + model` combinations. Returns validation errors as an array of strings.

- [ ] **1.6. Create `convex/oracle/upsertProviders.ts`** — a new Convex mutation file that accepts `providers_config` JSON and `model_chain` JSON strings, runs them through `validateProvidersConfig()` and `validateModelChain()`, and if valid, upserts them to `oracle_settings` with `valueType: "json"`. This replaces the raw `upsertSetting` for these two special keys and provides server-side validation. Both `providers_config` and `model_chain` should be saved in a single transaction so they stay consistent.

- [ ] **1.7. Update `convex/oracle/settings.ts:getPromptRuntimeSettings`** — once the admin UI is writing `model_chain` and `providers_config` directly, add a deprecation comment on the legacy `model_a/b/c` fallback path (lines 74-92) but keep it for backward compatibility. No functional change yet.

### Phase 2: Admin UI — Provider Management Tab

- [ ] **2.1. Create `src/components/oracle-admin/provider-manager.tsx`** — a new React component for managing providers. This is a "Providers" tab in the settings page.

  **State shape** (local, before save):
  ```typescript
  providers: ProviderConfig[]
  ```
  
  **UI elements:**
  - A list of current providers, each showing: type badge, name, base URL, API key env var name, and edit/delete buttons.
  - An "Add Provider" button that opens a form:
    - `type` — `<Select>` with options: OpenRouter, Ollama, OpenAI Compatible (uses `PROVIDER_TYPE_INFO` for labels/descriptions).
    - On type selection, auto-fill `name`, `baseUrl`, and `apiKeyEnvVar` from `PROVIDER_TYPE_PRESETS` (user can override these).
    - `id` — auto-generated from type (e.g., `openrouter`, `ollama`, `openai_compatible_1`, `ollama_2`) with an option to customize. Must be unique.
    - `name` — text input, pre-filled from preset.
    - `baseUrl` — text input, pre-filled from preset.
    - `apiKeyEnvVar` — text input, pre-filled from preset. Show a helper: "Name of the environment variable containing the API key. The key itself is never stored in the database." For Ollama, show: "Optional for local instances."
  - Delete button on each provider with confirmation dialog.
  - "Save Providers" button that saves `providers_config` as JSON via the `upsertProviders` mutation.

  **Data flow:**
  - On mount, read `providers_config` from `listAllSettings` query result, parse JSON → `ProviderConfig[]`.
  - On save, validate locally (no duplicate IDs, required fields present), then call `upsertProviders` mutation.

- [ ] **2.2. Create `src/components/oracle-admin/model-chain-editor.tsx`** — a new React component for managing the model fallback chain. This is a "Model Chain" section within the existing "Model" tab (or a dedicated new tab).

  **State shape** (local, before save):
  ```typescript
  modelChain: ModelChainEntry[]
  providers: ProviderConfig[] // needed to resolve provider names
  ```
  
  **UI elements:**
  - A drag-to-reorder list (or up/down arrow buttons) of model chain entries. Each entry shows:
    - Tier label (A, B, C, D, ...) as a badge — dynamically calculated from position via `tierForIndex()`.
    - Provider name (resolved from `providers` array using `providerId`).
    - Model name (displayed, with the option to change).
    - Remove button (X icon).
  - An "Add Model to Chain" form at the bottom:
    - Provider `<Select>` — dropdown of available providers (populated from `providers_config`).
    - On provider selection, show model suggestions from `KNOWN_MODELS_PER_PROVIDER_TYPE[provider.type]` as a `<Select>` or combobox.
    - **Critical:** Also allow free-text input for custom model names (since users may use `:free` suffixes on OpenRouter or custom Ollama model names not in the preset list). Use a combobox pattern: suggestions below + type your own.
  - "Save Model Chain" button that saves `model_chain` as JSON via the `upsertProviders` mutation (saves both in one call for consistency).

- [ ] **2.3. Update `src/app/admin/oracle/settings/page.tsx`** — restructure the settings page:
  - Add a new "Providers" tab (5th tab): renders `<ProviderManager />`.
  - Replace the "Model" tab content: remove the three legacy `model_a/b/c` dropdowns and replace with `<ModelChainEditor />`. Keep temperature, top-p, and streaming toggle in this tab.
  - Remove the hardcoded `MODEL_OPTIONS` array entirely.
  - Remove all `modelA/state/setModelA`, `modelB`, `modelC` state variables and their related save logic.
  - The Model tab now saves: `model_chain` (JSON, via the chain editor), `temperature`, `top_p`, `stream_enabled`.

  **Tab structure (new):**
  | Tab | Content |
  |-----|---------|
  | Providers | `<ProviderManager />` — add/edit/remove providers |
  | Model | `<ModelChainEditor />` + temperature/top-p/streaming |
  | Tokens | `<TokenLimitsEditor />` (unchanged) |
  | Quotas | Quota limits (unchanged) |
  | Operations | Kill switch, crisis response, fallback response (unchanged) |

- [ ] **2.4. Import shared types and constants** in the admin page from `src/lib/oracle/providers.ts`: `ProviderConfig`, `ModelChainEntry`, `PROVIDER_TYPES`, `PROVIDER_TYPE_PRESETS`, `PROVIDER_TYPE_INFO`, `KNOWN_MODELS_PER_PROVIDER_TYPE`, `tierForIndex`, `parseProvidersConfig`, `parseModelChain`. These are all already exported and designed for exactly this UI use case.

### Phase 3: Convex Mutations for Provider Settings

- [ ] **3.1. Add `upsertProvidersConfig` mutation** in `convex/oracle/upsertProviders.ts` (created in step 1.6):
  ```
  Args: {
    providersConfig: v.string(),  // JSON string of ProviderConfig[]
    modelChain: v.string(),      // JSON string of ModelChainEntry[]
  }
  ```
  Validation:
  - Parse both JSON strings.
  - Run `validateProvidersConfig()` on the providers array → reject if any errors.
  - Run `validateModelChain()` with the providers array → reject if any errors.
  - Upsert `providers_config` setting (group: "provider", valueType: "json", label: "Provider Configuration").
  - Upsert `model_chain` setting (group: "model", valueType: "json", label: "Model Fallback Chain").
  - Return `{ ok: true }` or throw with validation error messages.

- [ ] **3.2. Expose the new mutation** in the Convex API and import it in the admin settings page. The previous `upsertSetting` is still used for temperature, top_p, stream_enabled, quotas, etc.

- [ ] **3.3. Update the `useEffect` hydration** in `settings/page.tsx` to also hydrate provider and model chain state from `providers_config` and `model_chain` settings, parsing them from JSON.

### Phase 4: Custom Model Input & Combobox

- [ ] **4.1. Build a `ModelCombobox` component** — a combobox (input + dropdown suggestions) that:
  - Shows suggestions from `KNOWN_MODELS_PER_PROVIDER_TYPE[providerType]` when the provider type is known.
  - Allows free-text entry for custom model names.
  - Shows a visual distinction between "suggested" and "custom" models in the dropdown.
  - Debounces input and highlights matching suggestions.

  This can be built using shadcn/ui `Command` + `Popover` components (which are already available in the project via `components.json`), or a simpler approach using an `<Input>` with a suggestions `<div>` that appears below.

- [ ] **4.2. Integrate the combobox into `ModelChainEditor`** — when adding a new model chain entry, the model field uses `ModelCombobox` instead of a plain `<Select>`. The provider dropdown determines which suggestion list to show.

### Phase 5: Ollama & Multi-Provider Support Testing

- [ ] **5.1. Verify Ollama connectivity** — ensure `buildProviderUrl()` correctly constructs `http://localhost:11434/v1/chat/completions` for a local Ollama instance. Verify `buildProviderHeaders()` omits the `Authorization` header when no API key is provided for Ollama (it already does this correctly).

- [ ] **5.2. Verify `callProviderStreaming()`** handles Ollama responses — Ollama's OpenAI-compatible `/v1/chat/completions` endpoint returns SSE format that should work with the existing stream parser. Test with a local Ollama instance.

- [ ] **5.3. Add environment variable documentation** — the admin UI should display the required environment variables for each provider type. When a user adds an Ollama provider, the UI should indicate that `OLLAMA_API_KEY` is optional for local instances. No code change needed in the provider infrastructure — this is a UI concern handled in step 2.1.

- [ ] **5.4. Add a "Test Connection" button** to the provider form in the admin UI (optional enhancement, lower priority). This would call a new Convex action that pings the provider's `/models` endpoint to verify connectivity and API key validity. Can be implemented as a follow-up.

### Phase 6: Deprecation & Cleanup

- [ ] **6.1. Mark legacy `model_a/b/c` settings as deprecated** — add a clear comment in `convex/oracle/settings.ts` on the legacy fallback path (lines 74-92). The V3 migration and seed data will continue to write these keys for backward compatibility, but the admin UI will no longer update them.

- [ ] **6.2. Remove the `MODEL_OPTIONS` array** from `settings/page.tsx`. It is replaced by the dynamic model chain editor that reads from `KNOWN_MODELS_PER_PROVIDER_TYPE`.

- [ ] **6.3. Consider removing the `model_a`, `model_b`, `model_c` seed entries** from `convex/oracle/seed.ts:586-588` in a future migration, once the admin UI has been writing `model_chain` reliably. For now, keep them for backward compatibility.

- [ ] **6.4. Consolidate `lib/oracle/providers.ts` and `src/lib/oracle/providers.ts`** — Currently both files contain the full implementation. Make `lib/oracle/providers.ts` a thin re-export (like other files in that directory): `export * from "../../src/lib/oracle/providers"`. This eliminates the duplication risk.

---

## Verification Criteria

1. **Multi-provider admin UI**: The `/admin/oracle/settings` page has a "Providers" tab where you can add, edit, and remove providers (OpenRouter, Ollama, OpenAI Compatible) with auto-filled presets.
2. **Model chain editor**: The "Model" tab shows a reorderable list of model chain entries with tier labels (A, B, C, ...), each showing the provider name and model ID. Adding a new entry shows provider-specific model suggestions with free-text override.
3. **Data persistence**: Saving providers and model chain writes `providers_config` and `model_chain` JSON to `oracle_settings`, and these values are correctly parsed by `getPromptRuntimeSettings` on next load.
4. **Ollama support**: Adding an Ollama provider with `http://localhost:11434/v1` as base URL and a model like `llama3.1` results in successful Oracle calls when Ollama is running locally.
5. **Validation**: Invalid provider configs (missing fields, duplicate IDs) and invalid model chains (referencing non-existent providers) are rejected by the Convex mutation with descriptive error messages.
6. **Backward compatibility**: Existing sessions continue to work. Legacy `model_a/b/c` settings in the DB still function as fallback if `model_chain` is not set.
7. **No regression**: The existing Token Limits, Quota, and Operations tabs continue to work identically.
8. **BOM-free**: `convex/oracle/settings.ts` and `convex/oracle/soul.ts` no longer start with BOM characters.

---

## Potential Risks and Mitigations

1. **Risk: Breaking existing Oracle queries during migration**
   Mitigation: The `getPromptRuntimeSettings` fallback path (lines 74-92) ensures that even if `model_chain` or `providers_config` are empty/malformed, the system falls back to `DEFAULT_MODEL_CHAIN` → `DEFAULT_PROVIDERS`. The new admin UI will always write valid `model_chain` and `providers_config` because of server-side validation.

2. **Risk: Type assertion bypass in `parseProvidersConfig` / `parseModelChain`**
   Mitigation: Phase 1 (steps 1.2, 1.3) adds runtime shape validation before the type assertion, filtering out malformed entries and falling back to defaults.

3. **Risk: Admin saves invalid JSON for `providers_config` or `model_chain`**
   Mitigation: The new `upsertProvidersConfig` mutation (step 3.1) validates both JSON structure and semantic rules before persisting. The existing `upsertSetting` only checks `JSON.parse()` succeeds — the new mutation adds schema-level checks.

4. **Risk: Provider ID references in `model_chain` pointing to deleted providers**
   Mitigation: The `validateModelChain()` function (step 1.5) cross-references `providerId` values against the current `providers_config`. The Convex mutation saves both settings atomically, so a chain can't reference a provider that was just deleted in the same save.

5. **Risk: Ollama connectivity issues from Convex cloud deployment**
   Mitigation: Convex actions run in a Node.js environment. If Ollama runs on `localhost:11434`, it must be accessible from the Convex deployment environment. For local dev, this works when Convex is also local. For production, the user would need to provide a cloud-accessible Ollama endpoint. The admin UI should make this clear when adding an Ollama provider. This is a documentation/UX concern, not a code bug.

6. **Risk: UI complexity from drag-to-reorder model chain**
   Mitigation: If drag-and-drop is too complex, start with simple up/down arrow buttons to reorder chain entries. The data structure is just an array, so reordering is a simple swap operation. Drag-and-drop can be added later as an enhancement.

---

## Alternative Approaches

1. **Alternative: Keep legacy `model_a/b/c` UI and add a separate "Advanced" tab for providers + model chain**
   Trade-offs: Simpler initial change but perpetuates the legacy format. Users must manage two different interfaces for the same concept. Not recommended — this creates confusion about which settings actually take effect.

2. **Alternative: Use a Convex table (`oracle_providers`, `oracle_model_chain`) instead of JSON settings**
   Trade-offs: Better queryability and type safety from Convex schema, but requires schema migration, seeding changes, and query updates across `settings.ts`, `llm.ts`, and `seed.ts`. The current approach of storing as JSON in the key-value `oracle_settings` table is simpler and matches the existing pattern. This could be a future improvement if the system grows more complex.

3. **Alternative: Use a server action to "ping" providers on save**
   Trade-offs: More robust but adds network latency to the save flow and requires error handling for timeouts. Can be added as an optional "Test Connection" button later (step 5.4).

4. **Alternative: Single-file approach — keep all new components inside `page.tsx`**
   Trade-offs: Faster to implement but creates a 700+ line file that's hard to maintain. The proposed approach of separate `ProviderManager` and `ModelChainEditor` components is more maintainable and testable.

---

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `convex/oracle/settings.ts` | Modify | Remove BOM on line 1. Add deprecation comment on legacy path. |
| `convex/oracle/soul.ts` | Modify | Remove BOM on line 1. |
| `convex/oracle/upsertProviders.ts` | **Create** | New Convex mutation for validated provider + model chain upserts. |
| `lib/oracle/providers.ts` | Modify | Add `validateProvidersConfig()`, `validateModelChain()`, runtime shape checks in `parseProvidersConfig` and `parseModelChain`. |
| `src/lib/oracle/providers.ts` | Modify | Mirror the same changes. Then convert to thin re-export: `export * from "../../lib/oracle/providers"`. |
| `src/app/admin/oracle/settings/page.tsx` | **Major rewrite** | Add "Providers" tab, replace model dropdowns with `ModelChainEditor`, remove `MODEL_OPTIONS`, add `ModelCombobox`, add provider + chain state hydration. |
| `src/components/oracle-admin/provider-manager.tsx` | **Create** | Provider management component (CRUD for providers). |
| `src/components/oracle-admin/model-chain-editor.tsx` | **Create** | Model chain editor component (reorderable list + add/remove + combobox). |
| `src/components/oracle-admin/model-combobox.tsx` | **Create** | Combobox component with suggestions + free-text input for model selection. |