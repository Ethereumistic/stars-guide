# Task 01: Add `maxConcurrent` to Provider Config

> **Type:** Additive (non-breaking)
> **Files changed:** `src/lib/ai/registry.ts`, `convex/oracle/upsertProviders.ts`, `src/components/ai-admin/provider-manager.tsx`
> **No behavior change.** The new field is optional. Existing providers default to unlimited. Nothing reads it yet.

---

## What You're Doing

Adding a `maxConcurrent` field to `ProviderConfig` so the admin can specify how many simultaneous LLM calls each provider supports. This is data infrastructure for the Provider Router (Task 02).

Currently, providers are defined as:
```typescript
interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKeyEnvVar: string;
}
```

After this task:
```typescript
interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKeyEnvVar: string;
  maxConcurrent?: number;  // NEW — max simultaneous LLM calls. undefined = unlimited
}
```

---

## Step-by-Step

### Step 1: Update `ProviderConfig` in `src/lib/ai/registry.ts`

Add `maxConcurrent?: number` to the `ProviderConfig` interface.

The field is optional. When `undefined`, it means "unlimited" (backward compatible with all existing provider configs in the DB).

### Step 2: Update validation in `convex/oracle/upsertProviders.ts`

In `validateProvidersConfig()`, add validation for the new field:
- If present, must be a number >= 1
- If absent/undefined, that's valid (means unlimited)

Also update `parseProvidersConfig()` to preserve the field when parsing from JSON.

### Step 3: Update `DEFAULT_PROVIDERS` in `src/lib/ai/registry.ts`

The default OpenRouter provider doesn't need `maxConcurrent` (it's unlimited by default). No change needed here, but add a comment noting the field exists.

### Step 4: Update `ProviderManager` component (`src/components/ai-admin/provider-manager.tsx`)

Add a number input field for "Max Concurrent" on each provider card:

**Display mode** (existing card layout):
- Show "Max Concurrent: 3" or "Max Concurrent: Unlimited" next to the base URL

**Edit mode** (existing edit form):
- Add a number input labeled "Max Concurrent Requests" with helper text:
  "Maximum simultaneous LLM calls this provider supports. Leave empty for unlimited."
- Min value: 1
- Optional field — can be empty

**Add mode** (existing add dialog):
- Add the same number input, pre-filled to empty (unlimited)

**Important:** When saving, include `maxConcurrent` in the provider object only if the field has a value. If empty, omit it or set to `undefined` (both work since the field is optional).

### Step 5: Update `PROVIDER_TYPE_PRESETS` in `src/lib/oracle/providers.ts`

No change needed — presets are just defaults for new providers. The `maxConcurrent` field will be empty for new providers, which is correct (they'll configure it manually).

---

## Verification

After completing this task:
1. Open `/admin/oracle/settings` → Providers tab
2. Existing providers should display "Max Concurrent: Unlimited" 
3. Edit a provider → set max concurrent to 3 → save
4. Refresh the page → the value should persist
5. Add a new provider → leave max concurrent empty → save → should show "Unlimited"
6. All existing Oracle functionality should work exactly as before (nothing reads this field yet)

---

## What NOT to Do

- Do NOT create a database migration. The `providers_config` is stored as a JSON string in `oracle_settings`. The new field just appears in the JSON naturally.
- Do NOT change any behavior in `invokeOracle` or `callProviderStreaming`.
- Do NOT remove or rename any existing fields.
- Do NOT change the schema. Provider config is not a table — it's a JSON value in `oracle_settings`.
