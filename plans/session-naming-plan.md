# Session Title Generation — Implementation Plan

## Objective

Fix the broken automatic session title generation and add admin-configurable provider + model selection for title generation in the Oracle Settings dashboard. The title generation config will live inside the existing **Model** tab, split into a two-column layout — left column for Oracle inference model chain, right column for title generation model chain (with the same A/B/C fallback pattern). This allows admins to pick cheap/fast models specifically for title generation while keeping the fallback reliability of the chain system.

---

## Current Implementation Analysis

### How Title Generation Works Today

1. **On session creation** (`convex/oracle/sessions.ts:82-85`): The title is immediately set to a truncated version of the user's first question (max 40 chars + "..."). This is the fallback placeholder.

2. **Client-side trigger** (`src/app/oracle/chat/[sessionId]/page.tsx:101-117`): A `useEffect` fires after the first Oracle response completes (streaming done, assistant message with content > 20 chars exists, `titleGenerated` flag is not yet `true`). It calls `generateTitle({ sessionId })` — a Convex action.

3. **AI title generation** (`convex/oracle/sessions.ts:414-498`): The `generateSessionTitle` action:
   - Fetches the first question text from the session
   - Retrieves the full runtime settings (providers + model chain)
   - Constructs a compact system prompt asking for a max 5-word title in JSON format
   - **Iterates through the same model fallback chain used for Oracle inference** (Tier A, B, C, etc.)
   - On success: parses JSON, calls `updateSessionTitle` internal mutation which sets the title and `titleGenerated: true`
   - On failure of all models: silently fails — the session keeps its truncated-question title forever

### The Problem

The title generation uses the **exact same model chain** as the main Oracle inference. This means:

1. **Cost**: Title generation invokes SOTA/expensive models (e.g., `claude-sonnet-4`, `grok-4.1`) for a task that needs only a tiny, cheap model. Generating a 5-word title from a short question requires minimal intelligence.

2. **Reliability**: If the first model in the chain is slow or down, title generation waits for timeouts across the entire chain. There's no independent fallback configured for titles.

3. **No admin control**: There is zero configuration for title generation in the admin dashboard. The `/admin/oracle/settings` page has no way to specify which provider/model should be used for titles.

4. **Silent failure**: If all models in the chain fail, `titleGenerated` is never set to `true`, but no retry is ever attempted. The session is stuck with the truncated question title.

### Relevant Files

| File | Purpose |
|---|---|
| `convex/oracle/sessions.ts:414-498` | `generateSessionTitle` action — the broken title generator |
| `convex/oracle/sessions.ts:313-325` | `updateSessionTitle` internal mutation |
| `convex/oracle/sessions.ts:70-110` | `createSession` mutation (initial truncated title) |
| `convex/oracle/settings.ts:41-109` | `getPromptRuntimeSettings` query (loads providers + model chain) |
| `src/app/oracle/chat/[sessionId]/page.tsx:92-117` | Client-side trigger for title generation |
| `src/app/admin/oracle/settings/page.tsx` | Admin settings page (5 tabs: Providers, Model, Tokens, Quotas, Operations) |
| `src/components/oracle-admin/provider-manager.tsx` | Provider manager component |
| `src/components/oracle-admin/model-chain-editor.tsx` | Model fallback chain editor |
| `src/components/oracle-admin/model-combobox.tsx` | Model selection combobox |
| `src/lib/oracle/providers.ts` | Provider/model types, validation, defaults, URL/header builders |
| `convex/oracle/upsertProviders.ts` | Mutation for persisting provider + model chain config |
| `convex/schema.ts:375-391` | `oracle_settings` table schema |

---

## Implementation Plan

### Phase 1: Backend — Title Chain Configuration

- [ ] **1.1** Add `title_generation_chain` as a new JSON setting in the `oracle_settings` table (group: `model`). It will be stored as a JSON string containing a `ModelChainEntry[]` array — the same shape as `model_chain`, enabling the same A/B/C fallback pattern:
  ```json
  [
    { "providerId": "openrouter", "model": "google/gemini-2.5-flash" }
  ]
  ```
  This reuses the existing `ModelChainEntry` type and validation infrastructure. A single-entry chain is fine for cheap title generation, but admins can add fallback tiers if desired.

- [ ] **1.2** Add `DEFAULT_TITLE_CHAIN` constant in `src/lib/oracle/providers.ts` alongside the existing `DEFAULT_MODEL_CHAIN` and `DEFAULT_PROVIDERS`. Default to a single cheap entry: `[{ providerId: "openrouter", model: "google/gemini-2.5-flash" }]`. Also add a `parseTitleChain` function (identical pattern to `parseModelChain` — falls back to `DEFAULT_TITLE_CHAIN` if missing/empty) and `validateTitleChain` function (reuses existing `validateModelChain` logic — validates provider IDs exist, no duplicate entries).

- [ ] **1.3** Update `convex/oracle/settings.ts` — in the `getPromptRuntimeSettings` query, add parsing of `title_generation_chain` from the settings map. Add a new `titleChain` field to the returned object alongside `providers` and `modelChain`:
  ```ts
  titleChain: parseTitleChain(modelMap.title_generation_chain)
  ```

- [ ] **1.4** Rewrite `generateSessionTitle` action in `convex/oracle/sessions.ts` (lines 414-498). Instead of iterating the main Oracle model chain:
  1. Read `titleChain` from runtime settings
  2. Iterate through the **title chain** (not the main chain), looking up each entry's provider
  3. For each entry: make the compact title API call (same system prompt, `max_tokens: 30`, `temperature: 0.2`, `response_format: { type: "json_object" }`)
  4. On first success: parse JSON, update title via `updateSessionTitle`, set `titleGenerated: true`, return
  5. On failure of an entry: log and try the next entry in the title chain
  6. If all entries fail: call `markTitleGenerationAttempted` (new mutation from 3.3) to set `titleGenerated: true` anyway, preventing infinite retries. The truncated question remains as fallback.
  7. Use the same `buildProviderUrl` / `buildProviderHeaders` helpers already used for the main chain

- [ ] **1.5** Update the `upsertProviders` mutation in `convex/oracle/upsertProviders.ts` to also persist `title_generation_chain`. Add a new argument `titleGenerationChain: v.optional(v.string())` that, if provided, validates against providers and upserts the title chain setting. All three configs (`providers_config`, `model_chain`, `title_generation_chain`) should be persisted atomically when any model/provider config is saved.

### Phase 2: Frontend — Two-Column Model Tab

- [ ] **2.1** Update `src/app/admin/oracle/settings/page.tsx` — Reorganize the Model tab (`TabsContent value="model"`) into a **two-column grid layout**:
  - **Left column** ("Oracle Inference"): The existing `ModelChainEditor`, temperature slider, top-p slider, and streaming toggle — exactly as they are today, unchanged.
  - **Right column** ("Session Titles"): A new `ModelChainEditor` instance wired to a `titleChain` state, with its own save logic. This column reuses the exact same `ModelChainEditor` component — same tier badges (A, B, C...), same provider dropdown + model combobox for adding entries, same reorder/delete UX.
  - The two columns sit side-by-side on desktop, and stack vertically on mobile (responsive `grid-cols-1 lg:grid-cols-2`).

  Add state for `titleChain` alongside the existing `modelChain` state:
  ```ts
  const [titleChain, setTitleChain] = React.useState<ModelChainEntry[]>([]);
  ```
  Parse it from settings in the existing `useEffect`:
  ```ts
  setTitleChain(parseTitleChain(get("title_generation_chain")));
  ```

- [ ] **2.2** The overall Card for the Model tab now wraps both columns. The CardHeader stays at the top with the existing "Model Fallback Chain" title and the "Save Model Settings" button. The button's save handler should persist `model_chain`, `title_generation_chain`, temperature, top_p, and stream_enabled all at once via `upsertProviders` (with the new `titleGenerationChain` argument) plus `upsertSetting` calls for the scalar settings. This ensures everything on the Model tab is saved atomically.

- [ ] **2.3** Add a distinct visual label above the right column's `ModelChainEditor`. Use a `Badge` or heading like "Session Title Generation" with a brief description: "Models used to generate short titles for chat sessions. Use cheap/fast models — this is a simple task." This helps admins understand the purpose and choose appropriate models.

- [ ] **2.4** No new component needed — `ModelChainEditor` is already reusable and accepts `chain`, `providers`, and `onChange` props. The same component renders both the Oracle inference chain and the title generation chain. The only difference is the state they're wired to.

### Phase 3: Reliability & Error Handling

- [ ] **3.1** Add structured error logging in `generateSessionTitle`. Currently errors are logged with a bare `console.error`. Enhance to include provider ID, model name, HTTP status, and response body excerpt. This makes it possible to diagnose title generation failures from Convex logs without debugging the client.

- [ ] **3.2** Add a `markTitleGenerationAttempted` internal mutation in `convex/oracle/sessions.ts`:
  ```ts
  export const markTitleGenerationAttempted = internalMutation({
    args: { sessionId: v.id("oracle_sessions") },
    handler: async (ctx, { sessionId }) => {
      await ctx.db.patch(sessionId, { titleGenerated: true, updatedAt: Date.now() });
    },
  });
  ```
  Call this mutation after the title chain has been fully iterated (whether or not AI generation succeeded). This ensures the client `useEffect` won't re-trigger title generation on every render even if all models failed. The truncated question remains as a perfectly acceptable fallback.

- [ ] **3.3** In the `generateSessionTitle` action, always call `markTitleGenerationAttempted` at the end of the action (after the chain loop completes), regardless of success or failure. This replaces the current pattern where `titleGenerated: true` is only set by `updateSessionTitle` on success.

### Phase 4: Validation & Cleanup

- [ ] **4.1** Validate in `upsertProviders` that every `providerId` in `titleGenerationChain` references a valid provider from `providersConfig`. Reuse the existing `validateModelChain` function (it already checks for unknown provider IDs and duplicate entries) by passing `parsedTitleChain` and `parsedProviders` to it.

- [ ] **4.2** Extend `KNOWN_MODELS_PER_PROVIDER_TYPE` in `src/lib/oracle/providers.ts` with additional cheap/free model suggestions that are ideal for title generation. The existing presets already include free models like `google/gemini-2.5-flash:free`, `meta-llama/llama-4-maverick:free`, etc. Consider adding a brief comment section in the constant marking which models are particularly well-suited for title tasks, so the admin UI combobox shows them as suggestions.

- [ ] **4.3** Update the Convex schema comment on `oracle_sessions.title` (line 429) to reflect the new behavior: "Auto-generated from first question (~40 chars) as placeholder; replaced by AI-generated title from dedicated title chain."

---

## Verification Criteria

1. **Admin UI**: The Model tab on `/admin/oracle/settings` shows a two-column layout — left column for Oracle inference chain (existing), right column for title generation chain (new). Both use the same `ModelChainEditor` component with provider dropdowns, model comboboxes, and tier badges.

2. **Config persistence**: Adding models to the title chain, clicking Save, and reloading the page shows the saved title chain entries with their tier badges.

3. **Title generation works end-to-end**: Starting a new Oracle chat session, receiving a response, and seeing the sidebar session title change from the truncated question to an AI-generated 5-word title.

4. **Configurable chain**: Changing the title chain in admin settings (e.g., adding a fallback Tier B model) and creating a new session uses the configured chain for title generation, falling back to Tier B if Tier A fails.

5. **Graceful fallback**: If all models in the title chain fail, the session keeps its truncated-question title, `titleGenerated` is set to `true` to prevent infinite retries, and the client UI doesn't keep firing title generation calls.

6. **Cost efficiency**: Title generation uses the dedicated title chain (typically a single cheap model), not the full Oracle inference chain. Admins can configure cheap models like `google/gemini-2.5-flash`.

7. **Default behavior**: Without any admin configuration, title generation defaults to `[{ providerId: "openrouter", model: "google/gemini-2.5-flash" }]` — a cheap, fast model appropriate for this task.

8. **Validation**: Saving a title chain that references a non-existent provider ID shows a validation error, using the same validation UX as the main model chain.

9. **Independence**: The title chain and Oracle inference chain are fully independent — changing one does not affect the other. They share the same provider pool but have separate model selections.

10. **Responsive layout**: On desktop, the Model tab shows two columns side-by-side. On mobile, they stack vertically.

---

## Potential Risks and Mitigations

1. **Risk**: Breaking the existing `upsertProviders` mutation by adding the `titleGenerationChain` argument  
   **Mitigation**: Make the argument optional (`v.optional(v.string())`) so existing code paths that don't pass it continue to work. The admin UI will always include it, but the mutation won't crash if omitted.

2. **Risk**: Title generation still fails silently in production  
   **Mitigation**: Add structured `console.warn` logging with provider/model/status info. The `markTitleGenerationAttempted` mutation ensures the client doesn't re-trigger on every render.

3. **Risk**: Admin selects a model that doesn't support `response_format: { type: "json_object" }` (required by the title prompt)  
   **Mitigation**: Add a note in the admin UI description: "Select models that support JSON mode (`response_format: json_object`). Most modern models (Gemini, Claude, GPT, Llama 3.x+) support this. If the model doesn't, title generation will fall back to the truncated question." The fallback chain and `markTitleGenerationAttempted` ensure graceful degradation.

4. **Risk**: Race condition — title generation runs while the Oracle inference response is still streaming  
   **Mitigation**: Title generation only fires after streaming completes (the existing `isStreaming` guard in the client `useEffect`) and uses the separate title chain. No overlap.

5. **Risk**: Migration — existing sessions with `titleGenerated: undefined` but working titles  
   **Mitigation**: No migration needed. The `titleGenerated` check in the client `useEffect` handles both `false` and `undefined` (both are falsy). Sessions that already have AI-generated titles will have `titleGenerated: true` and will be skipped.

6. **Risk**: Two-column layout may feel cramped on smaller screens  
   **Mitigation**: Use `grid-cols-1 lg:grid-cols-2` responsive grid so columns stack on mobile/tablet. Both columns use the same `ModelChainEditor` which is vertically compact per entry.

---

## Alternative Approaches

1. **Single model selector (no fallback chain) for titles**: Instead of a full chain with A/B/C tiers, just have a single provider+model dropdown for title generation. Simpler UI but less resilient. **Rejected** per user request — the user wants the same fallback chain capability for titles as for Oracle inference.

2. **New 6th tab for title models**: Add a separate "Title Model" tab to the settings page. **Rejected** per user feedback — better UX to keep all model configuration in one place within the existing Model tab using a two-column layout.

3. **Use a Convex cron job for title generation**: Schedule title generation as a background task rather than a client-triggered action. This would decouple it from the user's session experience but adds complexity and latency. **Deferred** — the current client-triggered action approach works; background processing is an optimization for later.

4. **Store title chain as two separate settings** (`title_provider` + `title_model`): This would only support a single model, not a fallback chain. **Rejected** because it doesn't match the user's requirement for fallback capability.

---

## Key Model Recommendations for Title Generation

These models are suitable for title generation — they are cheap, fast, and competent enough for 5-word title extraction:

| Model | Provider | Cost | Notes |
|---|---|---|---|
| `stepfun/step-3.5-flash:free` | OpenRouter | Free | Fast free option |
| `google/gemini-2.5-flash:free` | OpenRouter | Free | Free tier on OpenRouter, may have rate limits |
| `meta-llama/llama-4-maverick:free` | OpenRouter | Free | Good free alternative if rate-limited on Gemini |
| `mistralai/mistral-small-3.1-24b-instruct:free` | OpenRouter | Free | Another free option |

The default chain should be a single entry: `[{ providerId: "openrouter", model: "stepfun/step-3.5-flash:free" }]` — it costs fractions of a cent per request and responds in under 500ms. Admins can add a free model like `google/gemini-2.5-flash:free` as Tier B fallback if desired.

