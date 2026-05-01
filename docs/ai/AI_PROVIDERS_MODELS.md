# AI Providers & Models — Architecture Guide

> This document is the single source of truth for understanding how AI providers
> and models are configured, stored, resolved, and used across the application.
> If you are an AI agent modifying anything related to LLM calls, provider
> selection, or model registries — **read this document first.**

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Where Things Live](#where-things-live)
3. [Admin Page: /admin/ai](#admin-page-adminai)
4. [Provider Configuration](#provider-configuration)
5. [Model Registry](#model-registry)
6. [Thinking / Reasoning Mode Control](#thinking--reasoning-mode-control)
7. [Model Variants (Weights)](#model-variants-weights)
8. [Capability Badges](#capability-badges)
9. [UI Components](#ui-components)
10. [Backend (Server-Side)](#backend-server-side)
11. [How Each Feature Uses This System](#how-each-feature-uses-this-system)
12. [Data Flow: From Admin UI to LLM Call](#data-flow-from-admin-ui-to-llm-call)
13. [Adding a New Model](#adding-a-new-model)
14. [Adding a New Provider](#adding-a-new-provider)
15. [Critical Rules](#critical-rules)

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN UI (Next.js)                                             │
│                                                                  │
│  /admin/ai ───────────────── CENTRALIZED AI MANAGEMENT           │
│    ├─ Providers tab ────→ ProviderManager ──→ saves providers_config│
│    ├─ Models tab ──────→ ModelRegistry (browse/filter/warnings)   │
│    ├─ Testing tab ─────→ AITestingPanel (live endpoint testing)  │
│    └─ Settings tab ────→ AISettingsPanel (thinking defaults, etc)│
│                                                                  │
│  Oracle Settings ───→ Provider+Model chain selector (A/B/C/D)   │
│  Zeitgeist Engine ──→ AIModelPicker (provider+model selector)   │
│  Generation Desk ───→ AIModelPicker (provider+model selector)   │
│  Any future page  ──→ AIModelPicker (provider+model selector)    │
└────────────┬──────────────────────────────────────┬──────────────┘
             │ mutations                             │ actions
             ▼                                      ▼
┌────────────────────────────────────────────────────────────────┐
│  CONVEX BACKEND                                                 │
│                                                                 │
│  oracle_settings table ── stores providers_config (JSON)        │
│                          stores model_chain (JSON)              │
│                          stores ai_thinking_* (JSON)            │
│                          stores ai_max_tokens_* (JSON)          │
│                                                                 │
│  convex/lib/llmProvider.ts ── resolves provider at runtime     │
│     ── callLLMEndpoint() with thinkingMode support              │
│     ── applyThinkingMode() sends think/reasoning_effort params │
│                                                                 │
│  convex/ai.ts ──────────── horoscope generation (uses above)    │
│                          thinkingMode: "disabled" by default    │
│  convex/oracle/llm.ts ──── oracle streaming (uses above)        │
│  convex/admin.ts ──────── testLLMEndpointAction (for testing)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Where Things Live

| File | Purpose | Runs Where |
|---|---|---|
| `src/app/admin/ai/page.tsx` | **New central AI admin page.** Providers, models, testing, settings. | Frontend |
| `src/components/ai-admin/provider-manager.tsx` | Admin UI to add/edit/delete providers (enhanced with inline editing). | Frontend |
| `src/components/ai-admin/model-registry.tsx` | Browse/search/filter model registry with capability badges and warnings. | Frontend |
| `src/components/ai-admin/ai-testing-panel.tsx` | Live LLM endpoint tester with thinking mode controls. | Frontend |
| `src/components/ai-admin/ai-settings-panel.tsx` | Global AI settings (thinking defaults, tokens, timeouts). | Frontend |
| `src/lib/ai/registry.ts` | **Single source of truth.** Provider types, model definitions, capability badges. | Frontend |
| `src/components/ai/ai-model-picker.tsx` | **Reusable UI component.** Provider + model + variant selector. | Frontend |
| `src/components/ai/model-combobox.tsx` | Model dropdown with capability badges, tooltips, and warnings. | Frontend |
| `src/components/horoscope-admin/model-selector.tsx` | Thin wrapper around AIModelPicker for backward compatibility. | Frontend |
| `src/components/oracle-admin/provider-manager.tsx` | Legacy provider display (now read-only in Oracle Settings). | Frontend |
| `src/components/oracle-admin/model-chain-editor.tsx` | Admin UI for Oracle's ordered fallback model chain. | Frontend |
| `convex/lib/llmProvider.ts` | Server-side runtime. Types, resolveProvider(), callLLMEndpoint() **with thinkingMode**. | Convex (Node.js) |
| `convex/ai.ts` | Horoscope generation engine. Calls callLLMEndpoint() with `thinkingMode: "disabled"`. | Convex (Node.js) |
| `convex/admin.ts` | Admin actions including `testLLMEndpointAction`. | Convex |

### Why are there two provider type files?

`src/lib/ai/registry.ts` (frontend) and `convex/lib/llmProvider.ts` (backend) cannot share code because:
- Convex actions run with `"use node"` and have no access to path aliases like `@/lib/...`
- The frontend uses TypeScript path aliases and React
- They have slightly different interfaces (e.g. the backend `LLMProvider` type is simpler)

Both define the same core shape. Keep them in sync when adding new provider types.

---

## Admin Page: /admin/ai

The new centralized AI Infrastructure admin page at `/admin/ai` has four tabs:

### Providers Tab
- Add, edit (inline), and delete provider configurations
- Auto-fills defaults based on provider type
- Changes save immediately to `oracle_settings.providers_config`
- Shared across all features

### Models Tab
- Browse the full model registry with search and filters
- Filter by provider type (OpenRouter, Ollama, OpenAI Compatible)
- Filter by capability (thinking, vision, code, fast, free, tool use, embedding)
- Shows capability badges, variant info, and warnings for each model
- Summary cards show total models, thinking models, vision models, free tier

### Testing Tab
- Live LLM endpoint tester
- Select any provider + model combination
- **Thinking mode control** — test with "Off", "Low", "Medium", "High", or "Auto"
- See raw content, reasoning/chain-of-thought, and timing
- Exact same code path as production (uses `callLLMEndpoint`)

### Settings Tab
- **Thinking mode defaults** — per feature (generation vs oracle)
- Token limits and timeouts
- Educational content explaining how thinking mode works

---

## Provider Configuration

### What is a Provider?

A provider is an OpenAI-compatible chat completions endpoint. The system supports three types:

| Type | ID | Description | API Key Required? |
|---|---|---|---|
| **OpenRouter** | `openrouter` | Aggregator proxying to many model providers | Yes |
| **Ollama** | `ollama` | Local or cloud-hosted Ollama instance | Optional (local = no key) |
| **OpenAI Compatible** | `openai_compatible` | Any OpenAI-compatible endpoint | Yes |

### ProviderConfig Interface

```typescript
interface ProviderConfig {
  id: string;          // Unique slug, e.g. "openrouter", "ollama_cloud"
  name: string;        // Display name, e.g. "OpenRouter", "Ollama Cloud"
  type: ProviderType;  // "openrouter" | "ollama" | "openai_compatible"
  baseUrl: string;     // API base URL, e.g. "https://openrouter.ai/api/v1"
  apiKeyEnvVar: string;// Environment variable name holding the key, e.g. "OPENROUTER_API_KEY"
}
```

### Where Providers Are Stored

Providers are stored as a JSON string in the `oracle_settings` Convex table:

```
key: "providers_config"
value: '[{"id":"openrouter","name":"OpenRouter","type":"openrouter","baseUrl":"https://openrouter.ai/api/v1","apiKeyEnvVar":"OPENROUTER_API_KEY"}]'
```

**This is the single shared provider list for the entire application.**

### Important: Provider Type Determines Model List

When a provider is selected in the UI, the model dropdown populates based on the provider's `type` field:

- Provider with `type: "openrouter"` → shows `KNOWN_MODELS.openrouter`
- Provider with `type: "ollama"` → shows `KNOWN_MODELS.ollama`
- Provider with `type: "openai_compatible"` → shows `KNOWN_MODELS.openai_compatible`

**If you create a provider with the wrong type, you'll see the wrong models.**

### API Keys

API keys are **never stored in the database.** Only the **name of the environment variable** is stored (e.g. `OPENROUTER_API_KEY`). At runtime, the backend reads `process.env[provider.apiKeyEnvVar]` to get the actual key.

---

## Model Registry

### AIModelEntry Interface

```typescript
interface AIModelEntry {
  id: string;             // Base model ID, e.g. "gemma4" or "google/gemini-2.5-flash"
  name: string;           // Display name, e.g. "Gemma 4"
  capabilities: ModelCapability[];  // Badges: "thinking", "vision", "fast", etc.
  description?: string;   // Tooltip text
  variants?: ModelVariant[];  // Required weight/size tags (see below)
}
```

### How Models Map to Provider Types

The `KNOWN_MODELS` object in `src/lib/ai/registry.ts` is a `Record<ProviderType, AIModelEntry[]>`. Each provider type has its own list.

**These are presets, not exhaustive lists.** Users can always type a custom model ID in the combobox.

### Model IDs

| Provider Type | ID Format | Examples |
|---|---|---|
| OpenRouter | `vendor/model-name` | `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4` |
| OpenRouter (free) | `vendor/model-name:free` | `deepseek/deepseek-r1-0528:free` |
| Ollama / OpenAI Compatible | `model-name` | `deepseek-v4-flash`, `glm-5.1` |
| Ollama with variant | `model-name:variant` | `gemma4:e2b`, `granite4.1:8b` |

⚠️ **The `:` character is overloaded.** In OpenRouter, `:free` is a pricing tier suffix. In Ollama, `:variant` is a required weight/size tag.

---

## Thinking / Reasoning Mode Control

### The Problem

Reasoning/thinking models (DeepSeek R1, Qwen3, Gemma 4, etc.) produce a chain-of-thought before the actual response. For tasks where structured output is needed (like horoscope generation):

1. If the model exhausts its `max_tokens` budget on chain-of-thought, `content` is `null` — you only get reasoning, never the answer
2. If you bump up `max_tokens`, some models spend even more on reasoning and still don't produce content
3. The Oracle feature works fine because it uses streaming and handles the reasoning→content transition gracefully
4. Generation fails because it uses non-streaming calls where `content` is all-or-nothing

### The Solution: Explicit Thinking Mode Control

`callLLMEndpoint()` now accepts a `thinkingMode` parameter:

```typescript
type ThinkingMode = "auto" | "disabled" | "low" | "medium" | "high";
```

| Mode | Description | Ollama | OpenRouter | Use Case |
|---|---|---|---|---|
| **auto** | Don't send any thinking params | (no param) | (no param) | Default. Model decides. |
| **disabled** | Force thinking OFF | `think: false` | `reasoning_effort: "none"` | **Horoscope generation**, any structured JSON task |
| **low** | Minimal reasoning | `think: "low"` | `reasoning_effort: "low"` | Light reasoning tasks |
| **medium** | Balanced reasoning | `think: "medium"` | `reasoning_effort: "medium"` | When you want some reasoning |
| **high** | Deep reasoning | `think: "high"` | `reasoning_effort: "high"` | Complex analysis (like Oracle) |

### How It's Used

**Horoscope Generation** (`convex/ai.ts`):
- Always sends `thinkingMode: "disabled"` — structured JSON output doesn't benefit from chain-of-thought

**Oracle Chat** (`convex/oracle/llm.ts`):
- Uses `thinkingMode: "auto"` (default) — Oracle streaming handles thinking gracefully

**Zeitgeist Synthesis** (`convex/ai.ts`):
- Uses `thinkingMode: "auto"` — short text outputs, thinking not a problem

**Testing Panel** (`/admin/ai` → Testing tab):
- User selects thinking mode manually — test different modes to find what works

### Per-Feature Defaults (in oracle_settings)

| Setting Key | Default | Description |
|---|---|---|
| `ai_thinking_generation` | `"disabled"` | Default for horoscope generation calls |
| `ai_thinking_oracle` | `"auto"` | Default for Oracle chat calls |

These can be configured in `/admin/ai` → Settings tab.

### Why This Works

- **Ollama:** The `think` parameter is a first-class API feature. `think: false` completely disables reasoning mode, making the model behave like a non-reasoning model. `think: "low"` produces minimal chain-of-thought.
- **OpenRouter:** The `reasoning_effort` parameter is supported by many models. It controls how much computational budget goes to reasoning vs. output.
- **The key insight:** For structured tasks like JSON generation, the model doesn't need to "think out loud" — it just needs to follow format instructions. Disabling thinking mode makes reasoning models usable for generation tasks.

---

## Model Variants (Weights)

### The Problem

Some Ollama models require a weight/size tag in the model ID. If you call `gemma4` without a tag, the API returns an error. You must call `gemma4:e2b` or `gemma4:31b`, etc.

### How It Works

Models that require variants have a `variants` array in their registry entry:

```typescript
{
  id: "gemma4",
  name: "Gemma 4",
  capabilities: ["vision", "tool_use", "thinking"],
  variants: [
    { id: "e2b", name: "E2B" },
    { id: "e4b", name: "E4B" },
    { id: "26b", name: "26B" },
    { id: "31b", name: "31B" },
  ],
}
```

### Models With Required Variants

| Model | Available Variants |
|---|---|
| `gemma4` | E2B, E4B, 26B, 31B |
| `nemotron3` | 33B |
| `granite4.1` | 3B, 8B, 30B |
| `mistral-medium-3.5` | 128B |
| `qwen3.6` | 27B, 35B |
| `translategemma` | 4B, 12B, 27B |

---

## Capability Badges

### Available Badges

| Badge | Label | Color | Description |
|---|---|---|---|
| `thinking` | THINK | Purple | Reasoning model — produces chain-of-thought before answering |
| `vision` | VIS | Cyan | Can process and analyze images |
| `code` | CODE | Emerald | Optimized for code generation |
| `fast` | FAST | Amber | Optimized for low-latency responses |
| `free` | FREE | Green | Available on the free tier |
| `embedding` | EMB | Gray | Embedding model — NOT suitable for generation |
| `tool_use` | TOOL | Orange | Supports function/tool calling |

### Warnings

Two badges produce **runtime warnings** when selected:

- **`thinking`** → *"Thinking/reasoning models may produce empty responses if they exhaust their token budget on chain-of-thought. The system sends `think: false` (Ollama) or low reasoning effort (OpenRouter) for structured output tasks."*
- **`embedding`** → *"Embedding models cannot generate text. Do not use for chat, horoscopes, or any generation task."*

---

## UI Components

### AIModelPicker

**The main reusable component.** Used by Horoscope Zeitgeist, Horoscope Generation Desk, and any future feature.

```tsx
import { AIModelPicker } from "@/components/ai";

<AIModelPicker
  providerId={providerId}
  modelId={modelId}
  onProviderChange={setProvider}
  onModelChange={setModel}
  showProvider={true}
  showWarnings={true}
/>
```

### ModelCombobox

The model dropdown component. Can be used standalone:

```tsx
import { ModelCombobox } from "@/components/ai";

<ModelCombobox
  models={modelEntries}
  value={selectedModel}
  onChange={setModel}
  showWarnings={true}
  providerType="ollama"
/>
```

---

## Backend (Server-Side)

### convex/lib/llmProvider.ts

Key functions:

**`parseProvidersConfig(raw)`** — Parses the JSON string from `oracle_settings` into an array of `LLMProvider` objects.

**`resolveProvider(providers, providerId?)`** — Finds a provider by ID. Falls back to the first provider.

**`callLLMEndpoint(opts)`** — Makes the actual HTTP request. Now supports:

```typescript
callLLMEndpoint({
  provider,
  model: "gemma4:e2b",
  messages: [...],
  temperature: 0.75,
  maxTokens: 4096,
  thinkingMode: "disabled",  // ← NEW: controls chain-of-thought
  title: "Stars.Guide Horoscope Engine",
})
```

**`applyThinkingMode(payload, provider, thinkingMode)`** — Adds provider-specific thinking parameters to the request payload:

- Ollama: `think: false` or `think: "low"/"medium"/"high"`
- OpenRouter: `reasoning_effort: "none"/"low"/"medium"/"high"`
- OpenAI Compatible: sends **both** `think` + `reasoning_effort` for maximum compatibility (Ollama Cloud reads `think`, OpenAI-style reads `reasoning_effort`, Together/Groq may ignore both)

Returns `{ content: string | null, reasoning: string | null, raw: any }` — `reasoning` captures the chain-of-thought separately from the actual content.

### Error Handling for Empty Content

When a thinking model produces reasoning but no content, `callLLMEndpoint` throws with a clear error message:

```
Empty content from {provider} — model exhausted token budget on chain-of-thought
(X chars reasoning, 0 chars content). Set thinkingMode to "disabled" or "low"
for structured output tasks.
```

---

## How Each Feature Uses This System

### Oracle

**Admin configures:**
1. Providers in `/admin/ai` → Providers tab (stored as `providers_config`)
2. Ordered model fallback chain in Oracle Settings → Model tab (stored as `model_chain`)
3. Temperature, top_p, streaming, etc. in Oracle Settings

**Runtime:**
- `invokeOracle` reads all settings via `loadRuntimeSettings()`
- Iterates the model chain: Tier A → B → C → ... until one succeeds
- Uses streaming for token-by-token delivery
- `thinkingMode: "auto"` — Oracle handles thinking content gracefully via streaming

**Files:** `convex/oracle/llm.ts`, `src/app/admin/oracle/settings/page.tsx`

### Horoscope — Generation Desk

**Admin selects:**
1. A single provider + model via `AIModelPicker`
2. The selected `providerId` and `modelId` are passed to `startGeneration` mutation

**Runtime:**
- `runGenerationJob` reads the providers config from `oracle_settings`
- Resolves the provider by the passed `providerId`
- Calls `callLLMEndpoint()` with **`thinkingMode: "disabled"`** for each sign×date combination
- This prevents thinking models from exhausting the token budget on chain-of-thought
- The model goes straight to producing structured JSON output

**Files:** `convex/ai.ts`, `src/app/admin/horoscope/generator/page.tsx`

### Horoscope — Zeitgeist Engine

**Runtime:**
- Uses `callLLMEndpoint()` with default `thinkingMode: "auto"` — short outputs, thinking not a problem

**Files:** `convex/ai.ts`, `src/app/admin/horoscope/zeitgeist/page.tsx`

### AI Infrastructure Admin Page

**Runtime:**
- Uses `testLLMEndpointAction` to test provider + model combinations
- Supports all thinking modes for testing
- Uses the same `callLLMEndpoint()` code as production

**Files:** `src/app/admin/ai/page.tsx`, `src/components/ai-admin/`

---

## Data Flow: From Admin UI to LLM Call

### Full lifecycle for a Horoscope generation (with thinking disabled):

```
1. ADMIN adds "Ollama Cloud" provider in /admin/ai → Providers
   → upsertProvidersConfig mutation
   → oracle_settings.providers_config = '[{"id":"ollama_cloud","type":"openai_compatible",...}]'

2. ADMIN opens Generation Desk
   → AIModelPicker reads oracle_settings.providers_config
   → Shows "Ollama Cloud" in provider dropdown
   → Admin selects "Gemma 4" → variant dropdown appears → selects "31B"
   → modelId = "gemma4:31b"

3. ADMIN clicks "Generate"
   → startGeneration({ providerId: "ollama_cloud", modelId: "gemma4:31b", ... })
   → Creates generationJobs record
   → Schedules runGenerationJob

4. runGenerationJob executes (server-side)
   → Reads providers_config from oracle_settings
   → resolveProvider(providers, "ollama_cloud") → { baseUrl, apiKeyEnvVar, ... }
   → callLLMEndpoint({
       provider,
       model: "gemma4:31b",
       messages: [...],
       thinkingMode: "disabled",  ← KEY: disables chain-of-thought
     })

5. callLLMEndpoint builds request:
   → Provider type is "openai_compatible"
   → applyThinkingMode() adds think: false to payload
   → fetch(url, { body: JSON.stringify({
       model: "gemma4:31b",
       messages: [...],
       think: false,  ← Ollama ignores reasoning mode
       max_tokens: 4096,
       temperature: 0.75,
     }) })

6. API Response:
   → { choices: [{ message: { content: "{ \"sign\": \"Cancer\", ... }" } }] }
   → content is present! No null/empty because thinking was disabled
   → sanitizeLLMJson(content) → validated horoscope
```

---

## Adding a New Model

1. Open `src/lib/ai/registry.ts`
2. Find the `KNOWN_MODELS` section for the appropriate provider type(s)
3. Add a new `AIModelEntry`:

```typescript
{
  id: "my-new-model",
  name: "My New Model",
  capabilities: ["fast", "vision"],
  description: "A fast model with vision support.",
  variants: [
    { id: "7b", name: "7B" },
    { id: "13b", name: "13B" },
  ],
}
```

4. If the model has the `thinking` capability, the warning + thinking mode control will appear automatically
5. No backend changes needed — the model ID is passed through as-is to the API

---

## Adding a New Provider

This is done through the Admin UI (`/admin/ai` → Providers tab). No code changes needed.

1. Click "Add Provider"
2. Select provider type (OpenRouter / Ollama / OpenAI Compatible)
3. Fill in: ID, Name, Base URL, API Key Env Var
4. Save

The provider appears in all `AIModelPicker` instances immediately.

### Adding a New Provider *Type*

If you need a fundamentally new provider type (not just a new instance of an existing type):

1. Add the type to `PROVIDER_TYPES` in `src/lib/ai/registry.ts`
2. Add metadata to `PROVIDER_TYPE_INFO`
3. Add a model list to `KNOWN_MODELS`
4. Update `buildProviderHeaders()` in both `src/lib/ai/registry.ts` and `convex/lib/llmProvider.ts`
5. Update `applyThinkingMode()` in `convex/lib/llmProvider.ts` if the new type supports thinking control
6. Update validation in both files

---

## Critical Rules

| # | Rule | Why |
|---|---|---|
| 1 | **Providers are shared.** All features read from the same `oracle_settings.providers_config`. | Single source of truth. Adding a provider in `/admin/ai` makes it available everywhere. |
| 2 | **Model lists are per provider type, not per provider instance.** | Two Ollama providers (local + cloud) show the same model list. |
| 3 | **API keys are never in the DB.** Only env var names are stored. | Security. A DB leak doesn't expose keys. |
| 4 | **Variant tags are required for models that have them.** | Calling `gemma4` without `:e2b` will fail. The UI auto-selects the first variant. |
| 5 | **The `:` in model IDs is ambiguous.** It can be a variant tag OR an OpenRouter pricing suffix. | The variant resolver only activates for models with `variants` defined. `google/gemini-2.5-flash:free` is NOT a variant. |
| 6 | **`response_format: json_object` is never sent.** | Many providers don't support it and return `content: null`. |
| 7 | **Thinking models must use `thinkingMode: "disabled"` for structured output tasks.** | Without this, thinking models exhaust their token budget on chain-of-thought and return `content: null`. The system now enforces this for horoscope generation. |
| 8 | **Custom model IDs are always supported.** | The combobox lets users type any model ID. The registry is presets, not a restriction. |
| 9 | **Keep `src/lib/ai/registry.ts` and `convex/lib/llmProvider.ts` in sync.** | They can't import each other due to the Convex `"use node"` boundary. |
| 10 | **Both `ollama` and `openai_compatible` model lists should match.** | Ollama Cloud endpoints are typically configured as `openai_compatible`. |
| 11 | **Oracle Settings Providers tab is now read-only.** | Provider management moved to `/admin/ai`. Oracle Settings shows current providers with a link to the AI admin page. |
| 12 | **The `/admin/ai` Testing tab uses the same code path as production.** | Tests go through `callLLMEndpoint()` — results are representative of actual behavior. |