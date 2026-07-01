# Oracle AI System — Multi-Provider Model Chain

> Source: ORACLE_EXPLAINED.md §5

The Oracle uses a **ranked fallback chain** of LLM models, each backed by a configured provider. This is the core resilience mechanism.

---

## Configuration

### Providers (`src/lib/oracle/providers.ts:11-17`)

```typescript
interface ProviderConfig {
  id: string;          // e.g. "openrouter"
  name: string;        // "OpenRouter"
  type: ProviderType;  // "openrouter" | "ollama" | "openai_compatible"
  baseUrl: string;     // "https://openrouter.ai/api/v1"
  apiKeyEnvVar: string; // "OPENROUTER_API_KEY"
}
```

### Model Chain (`src/lib/oracle/providers.ts:19-22`)

```typescript
interface ModelChainEntry {
  providerId: string;  // references a ProviderConfig.id
  model: string;       // e.g. "google/gemini-2.5-flash"
}
```

### Defaults (`src/lib/oracle/providers.ts:24-38`)

```
Provider: OpenRouter (openrouter, https://openrouter.ai/api/v1)
Chain:
  Tier A: openrouter / google/gemini-2.5-flash
  Tier B: openrouter / anthropic/claude-sonnet-4
  Tier C: openrouter / x-ai/grok-4.1-fast
```

---

## Fallback Logic

In `invokeOracle` (`convex/oracle/llm.ts`):

```pseudo
for each entry in modelChain (index i):
  tier = tierForIndex(i)  // 0→"A", 1→"B", 2→"C", ...
  provider = find provider where provider.id == entry.providerId
  if provider not found: skip, log error
  try:
    result = callProviderStreaming(provider, entry.model, ...)
    if result:
      persist message, increment quota
      return { content, modelUsed, fallbackTier }
  catch error:
    log error, continue to next entry

# All models failed:
return hardcoded fallback message (Tier D)
```

The tier label function (`providers.ts:44-48`): index 0 → "A", 1 → "B", ..., 25 → "Z", beyond that uses numeric index.

---

## Request Construction

For each attempt, `callProviderStreaming()` builds:

### 1. URL
`buildProviderUrl(provider)` — strips trailing slashes, appends `/chat/completions`

### 2. Headers
`buildProviderHeaders(provider, apiKey)`:
- OpenRouter: `Authorization: Bearer {key}`, `HTTP-Referer: https://stars.guide`, `X-Title: Stars.Guide Oracle`
- Ollama: optional `Authorization: Bearer {key}` if key present
- OpenAI-compatible: `Authorization: Bearer {key}`
- All: `Content-Type: application/json`

### 3. Body
```json
{
  "model": "<entry.model>",
  "messages": [system, ...history, user],
  "temperature": 0.82,
  "max_tokens": 1000,
  "top_p": 0.92,
  "stream": true
}
```

### 4. API Key Resolution
`process.env[provider.apiKeyEnvVar]` — keys are never in the DB, only env var names.

---

## Validation

On admin save, `upsertProvidersConfig` (`convex/oracle/upsertProviders.ts:11-81`) calls:
- `validateProvidersConfig()` — checks unique IDs, valid types, non-empty baseUrls, apiKeyEnvVar required for non-Ollama
- `validateModelChain()` — checks all providerId references exist, no duplicate provider+model combos, valid model strings

---

## Wiring — How the Model Chain Connects

```
Admin UI (Model tab)
  │
  └── upsertProvidersConfig ──▶ oracle_settings (providers_config, model_chain)
                                        │
                                  invokeOracle reads these at runtime
                                        │
                                        ▼
                                  Fallback chain iteration:
                                        │
                                  ┌─────┴─────┐
                                  │  Tier A    │──▶ success? → return response
                                  │  (primary) │──▶ failure? → try next
                                  └─────┬─────┘
                                        │
                                  ┌─────┴─────┐
                                  │  Tier B    │──▶ success? → return response
                                  │  (fallback)│──▶ failure? → try next
                                  └─────┬─────┘
                                        │
                                  ┌─────┴─────┐
                                  │  Tier C    │──▶ success? → return response
                                  │  (fallback)│──▶ failure? → try next
                                  └─────┬─────┘
                                        │
                                  ┌─────┴─────┐
                                  │  Tier D   │
                                  │  (hardcoded│──▶ always "succeeds" with static text
                                  │  fallback) │
                                  └───────────┘
```

**Debug override:** When `debugModelOverride` is provided by an admin via the Debug Panel, it is prepended to the chain as a new Tier A, pushing all other tiers down. See [Debug Panel](./19-debug-panel.md).