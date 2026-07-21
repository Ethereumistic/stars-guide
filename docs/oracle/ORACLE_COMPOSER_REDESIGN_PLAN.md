# Oracle Composer Redesign Plan

Status: implemented; rollout intentionally defaults off  
Scope: Oracle composer UI, user-selectable model routes, reasoning effort, dictation, admin configuration, server enforcement, telemetry, and rollout  
Reference: ChatGPT-style expanding composer supplied by the product owner

Implementation note (2026-07-21): seed or save valid choices in `/admin/ai` → **User models**, then enable **Allow user model selection**. Until that switch is enabled, all existing sessions continue to use the `oracle_chat` feature profile.

## 1. Outcome

Replace the current fixed-height Oracle input with a vertically elastic composer that:

- keeps the existing `+` feature menu and every current Oracle feature flow;
- uses the same visual grammar as the sidebar/avatar menu;
- grows from one line through roughly five or six visible rows, then scrolls internally;
- supports model selection, reasoning effort, dictation, and send controls in a stable bottom rail;
- lets admins publish different model choices to free, popular, and premium users;
- resolves every model and reasoning choice on the server from an opaque option key;
- preserves provider fallback, cooldowns, quota accounting, safety, consent, and observability;
- remains backward-compatible when no user model choices have been configured.

This work should not turn the browser into a provider router. The browser chooses a product-facing option such as `automatic`, `gemma-4`, or `kimi-k2`; the server decides whether that option is allowed and resolves its ordered provider/model chain.

## 2. Current State and Constraints

### Composer

`src/components/oracle/input/oracle-input.tsx` currently uses a single-line `Input` inside a fixed `h-14` shell. It cannot accept or display multiline content and sends on every Enter keydown. The component also owns:

- the feature dropdown;
- journal-consent gating for feature rows;
- active feature badges;
- birth chart, synastry, and binaural feature cards;
- send-button state.

The same component is rendered by both:

- `src/app/(app)/oracle/new/page.tsx` for a new session; and
- `src/app/(app)/oracle/chat/[sessionId]/page.tsx` for follow-ups.

Both pages currently hold an `HTMLInputElement` ref, so both call sites must migrate with the composer.

### AI routing

`/admin/ai` currently manages:

- `ai_providers` as provider endpoints and environment-variable names;
- one `ai_feature_profiles` document per AI feature;
- one ordered `chainJson` and one default `thinkingMode` per feature profile;
- a static model registry used as admin guidance, not as runtime authorization.

Oracle streaming reads the `oracle_chat` feature profile in `convex/aiGateway/streaming.ts`. It already supports ordered fallback, provider health/cooldown, and provider-specific thinking parameters.

The current user schema already has `free`, `popular`, and `premium` tiers. Oracle quota is cost-based and records the actual model used, so more expensive user choices naturally consume more allowance after pricing is applied.

### Dictation

The journal already has a generic browser Speech Recognition wrapper in `src/lib/journal/voiceInput.ts`. Its UI button is coupled to journal Zustand state and should not be reused directly. The low-level recognition code can be promoted to a shared speech module.

Browser Speech Recognition has uneven browser support and may use a browser vendor's hosted recognition service. The Oracle UI must handle unsupported browsers and communicate this limitation without claiming that recognition is always local.

### Security hardening discovered during planning

`invokeOracle` currently accepts `debugModelOverride` in a public action. The debug panel is only rendered for admins, but the action itself must also verify the user's admin role before honoring an override. The user-model work must close this gap rather than creating a second client-controlled override path.

## 3. Product and Design Direction

### Subject and job

The subject is an astrological AI consultation for people who want a personalized reading without needing to understand providers, fallback tiers, or inference APIs. The composer's single job is to turn the user's question and chosen Oracle controls into a clear, trustworthy request.

### Design thesis: the observatory console

Use ChatGPT's proven structure—elastic text area above a stable control rail—but render it as a restrained stars.guide observatory console. The surface should feel quiet enough for long-form reflection, with celestial identity concentrated in one detail instead of a cloud of decorative effects.

The signature is an **eclipse rim**: a one-pixel focus line that moves from galactic violet into solar gold across the upper edge of the composer. It replaces the current diffuse animated outer glow. No other new ornamental effect is needed.

### Compact token system

Use existing theme tokens/classes where possible. These hex values define the intended visual result rather than a second global theme:

| Token | Value | Use |
| --- | --- | --- |
| Void | `#12111A` | Composer and menu surface |
| Observatory | `#1A1922` | Hover/selected rows |
| Starlight | `#F5F5F5` | Primary text and active icons |
| Moon dust | `#A8A3B2` | Placeholder, descriptions, inactive controls |
| Galactic | `#9D4EDD` | Focus, active feature/model, Oracle identity |
| Solar | `#D4AF37` | Premium/default accents and the end of the eclipse rim |

Typography remains part of the existing product system:

- Inter/sans for entered text and plain descriptions;
- Cinzel/serif for short Oracle-facing labels such as model display names;
- Space Mono only for small tier, effort, and status metadata.

### Desktop wireframe

```text
  [large active feature card, only when needed]

  ╭────────────────────────────────────────────────────────────╮
  │ [active feature chip ×]                                    │
  │ Ask the Oracle…                                            │
  │ Additional lines grow upward through 5–6 visible rows…     │
  │                                                            │
  │  [+]  [Automatic ▾]  [High ▾]                 [mic]  [↑]  │
  ╰────────────────────────────────────────────────────────────╯
```

The text region grows; the control rail does not move or reflow at ordinary desktop widths.

### Mobile wireframe

```text
  ╭────────────────────────────────────╮
  │ Ask the Oracle…                    │
  │                                    │
  │ [+] [Model ▾]       [High] [mic][↑]│
  ╰────────────────────────────────────╯
```

At narrow widths, descriptions remain in menus, but control labels may shorten. All controls keep at least a 40px target and the composer respects the bottom safe area.

### Design critique and revision

The first direction preserved the current blurred violet glow around the composer. That made the surface look like a generic dark AI input and competed with feature cards. The revised direction removes that glow, uses a solid translucent observatory surface, and spends the visual emphasis on the single eclipse rim. The result follows the requested ChatGPT structure while retaining a specific stars.guide identity.

## 4. Composer Interaction Specification

### Text entry and growth

- Replace `Input` with a controlled native `textarea`.
- Start at one visible text row inside a composer with a separate bottom rail.
- Auto-size on typed, pasted, programmatic, and dictated content.
- Cap the text region at approximately six rows or `min(38vh, 12rem)`, whichever is smaller.
- After the cap, use an internal thin scrollbar; the page and chat history must not jump.
- Reset height after a successful submit.
- Mirror the server's 2,000-character limit with `maxLength={2000}`.
- Show a quiet character counter only near the limit, for example after 1,800 characters.

Use a small `useAutosizeTextarea` hook with `useLayoutEffect`: set height to `auto`, read `scrollHeight`, and clamp to the configured maximum. Do not rely solely on `field-sizing-content`, because the composer should have deterministic behavior across supported browsers.

### Keyboard behavior

- Enter sends when submission is allowed.
- Shift+Enter inserts a newline.
- Enter during IME composition does not submit.
- Prevent the default newline only when a send actually occurs.
- Escape closes an open menu but does not clear the draft.
- Tab order follows feature → model → effort → dictation → send.

### Control rail

From left to right:

1. Feature `+` menu.
2. Model option trigger.
3. Reasoning-effort trigger.
4. Flexible spacer.
5. Dictation button.
6. Send button.

The send button uses an upward arrow to match the reference structure. It remains visually disabled when there is no text and no sendable active feature. Do not introduce a fake stop-generation state until the backend has real cancellation support.

### Feature menu

Keep the existing features, implementation flags, consent checks, callbacks, and default prompts. Redesign only their presentation and menu composition:

- use the sidebar/user-menu surface: `border-white/10`, `bg-background/90`, `p-0`, strong shadow, and backdrop blur;
- use a responsive width around `20–22rem` rather than the current `w-64`;
- add a small `Oracle tools` label/header;
- render each row with icon, title, and a second-line description or disabled reason;
- show disabled/consent-required status in the second line instead of squeezing it against the title;
- use Radix collision handling and prefer opening above the composer in chat;
- move the simple active-feature badge inside the composer above the textarea;
- keep the large birth chart, synastry, and binaural cards above the composer.

### Model menu

The trigger displays the selected product-facing label, not a provider ID. The menu shows:

- option label and short description;
- optional `Default`, `Popular`, or `Premium` badge;
- availability for the current tier;
- a short `uses more allowance` notice only when configured and accurate;
- locked higher-tier options, if configured to be visible, with an upgrade action.

Recommended first configuration based on the current chain:

- **Automatic** — current `gemma4:31b → kimi-k2.6` chain; default and available to all tiers during rollout;
- **Gemma 4 31B** — Gemma-first route; popular and premium;
- **Kimi K2.6** — Kimi-first route; popular and premium;
- later premium choices can be added entirely from `/admin/ai`.

This seed preserves current behavior before paid choices are enabled. Product labels and descriptions remain admin-configurable.

### Reasoning-effort menu

Use the existing runtime vocabulary with friendly labels:

| Stored/runtime value | User label |
| --- | --- |
| `auto` | Auto |
| `disabled` | Off |
| `low` | Low |
| `medium` | Medium |
| `high` | High |

Only show efforts allowed by the selected model option. If a model option has a fixed effort, show the value without an interactive chevron. On model change, retain the current effort when still allowed; otherwise normalize to the option's default.

Reasoning effort controls inference budget only. Provider reasoning/chain-of-thought must remain separated from user-visible answer content and must not be displayed in the composer or chat.

### Dictation

- Promote the generic recognition wrapper to `src/lib/speech/voice-input.ts`.
- Leave a compatibility re-export for the journal to avoid duplicating or breaking its behavior.
- Add an Oracle-specific `useSpeechDictation` hook and `oracle-dictation-button.tsx`.
- Append finalized utterances to the controlled draft with normalized whitespace.
- Show interim text as a non-persisted listening preview; never submit interim text.
- Stop recognition on submit, unmount, disabled state, navigation, or explicit second click.
- Announce `Listening`, `Stopped`, and permission errors through an `aria-live` region.
- If unsupported, keep a disabled mic with a concise tooltip on desktop and hide it only when mobile space is critically constrained.
- On first use, accurately state that recognition is provided by the browser and may use its speech service.

Server transcription and full duplex voice conversation are future extensions, not part of this implementation.

### Loading, disabled, and error states

- Keep report onboarding, quota, kill-switch, and streaming restrictions authoritative.
- Menus may remain inspectable while quota is exhausted, but send and dictation are disabled.
- While model capabilities load, render a stable `Automatic`/loading trigger without shifting layout.
- If the selected option becomes invalid, normalize silently to the server-provided tier default and show a one-time toast only when the user actively selected the now-invalid option.
- If dictation permission is denied, keep typed input fully usable.

## 5. Server-Authoritative Model Access Design

### Core rule

The client may send only:

- a stable `optionKey`; and
- a reasoning-effort value advertised for that option.

It must never send a normal-user `providerId`, raw `model`, or chain. The server reads the authenticated user, resolves the effective tier, validates the option, selects the chain, normalizes effort, and passes the resolved result to the internal gateway.

### New table: `ai_user_model_options`

Add a structured table rather than placing another large JSON document inside `ai_feature_profiles`:

```ts
{
  featureKey: string,                  // initially "oracle_chat"
  optionKey: string,                   // stable public identifier
  label: string,
  description?: string,
  badge?: string,
  logoUrl?: string,                     // public HTTPS CDN image; icon fallback in UI
  enabled: boolean,
  showWhenLocked: boolean,
  allowedTiers: Array<"free" | "popular" | "premium">,
  defaultForTiers: Array<"free" | "popular" | "premium">,
  chain: Array<{ providerId: string; model: string }>,
  allowedReasoningEfforts: Array<"auto" | "disabled" | "low" | "medium" | "high">,
  defaultReasoningEffort: "auto" | "disabled" | "low" | "medium" | "high",
  usageHint?: string,
  sortOrder: number,
  createdAt: number,
  updatedAt: number,
  updatedBy?: Id<"users">,
}
```

Indexes:

- `by_feature_option` on `featureKey, optionKey`;
- `by_feature_enabled` on `featureKey, enabled`;
- `by_feature_order` on `featureKey, sortOrder`.

Use a structured `chain` for this new table even though existing feature profiles use `chainJson`. Runtime validation and admin editing are safer when the database owns the shape.

### Feature-profile rollout switch

Add optional `allowUserModelSelection` to `ai_feature_profiles`.

- Missing or `false`: current feature `chainJson` and `thinkingMode` remain authoritative.
- `true`: the server resolves a user model option.
- Invalid or empty option configuration: fall back to the feature profile instead of taking Oracle offline.

This makes schema/backend deployment, configuration, and UI rollout independently reversible.

### Sanitized capabilities query

Add an authenticated query such as `oracle/modelOptions:getComposerCapabilities`. It returns only:

```ts
{
  enabled: boolean,
  effectiveTier: "free" | "popular" | "premium",
  defaultOptionKey: string,
  options: Array<{
    optionKey: string,
    label: string,
    description?: string,
    badge?: string,
    available: boolean,
    requiredTier?: "popular" | "premium",
    allowedReasoningEfforts: ReasoningEffort[],
    defaultReasoningEffort: ReasoningEffort,
    usageHint?: string,
  }>,
}
```

Do not return provider IDs, base URLs, model chains, environment-variable names, health data, or pricing internals.

### Route resolver

Create one server helper/internal query used by session mutations and `invokeOracle`. Given authenticated user, feature, requested option, and requested effort, it returns:

```ts
{
  source: "user_option" | "feature_default",
  optionKey?: string,
  chain: Array<{ providerId: string; model: string }>,
  reasoningEffort: ThinkingMode,
  effectiveTier: string,
}
```

Resolution order:

1. Verify authentication and load the current user.
2. Preserve the current tier semantics initially: admin/moderator receive full access; otherwise use `user.tier` with unknown values treated as free.
3. Check `allowUserModelSelection`.
4. Find the requested enabled option and verify the tier is allowed.
5. If invalid, select the enabled default for the effective tier.
6. If there is no valid tier default, return the existing feature profile chain.
7. Normalize reasoning effort against the resolved option's allowed list.
8. Verify every chain entry references an enabled provider at runtime; the gateway still owns health/cooldown and attempt fallback.

Tier resolution should be centralized so quota and model access cannot drift. Do not change canceled/expired-subscription semantics silently in this PR; first preserve current `user.tier` behavior, then audit subscription lifecycle separately.

### Session preference persistence

Add optional fields to `oracle_sessions`:

- `modelOptionKey`;
- `reasoningEffort`.

Add optional request metadata to `oracle_messages`:

- `requestedModelOptionKey`;
- `requestedReasoningEffort`.

`createSession` accepts the opaque preference, validates it in the mutation, and stores the normalized result for the first message. `addMessage` does the same for a follow-up and updates the session preference in the same transaction. This supports first-message routing after navigation and provides historical intent even when the actual provider falls back.

`invokeOracle` resolves again immediately before the LLM call. This second check is intentional: a user may have downgraded, an option may have been disabled, or an admin may have changed access after the session was created.

### Gateway integration

Refactor `callGatewayStreaming` and `streamAIGateway` to accept an internal resolved route containing:

- an ordered chain override; and
- a normalized thinking mode.

The resolved route is created only on the server. Diagnostic raw provider/model overrides remain a separate admin-only path.

The gateway continues to own:

- ordered attempts and tier labels;
- enabled-provider lookup;
- cooldown/health checks;
- provider-specific payload mapping;
- streaming and token collection;
- attempt telemetry.

Oracle continues to own:

- hardcoded input/crisis/output safety;
- pipeline and prompt assembly;
- journal consent and birth-data gating;
- quota precheck and actual-cost increment;
- session/message persistence;
- response contract validation.

### Debug override hardening

Before honoring `debugModelOverride`, `invokeOracle` must verify that the authenticated user is an admin using a server-side query. Unauthorized use should be rejected or ignored and logged. The normal model selector must never reuse this parameter.

## 6. `/admin/ai` Changes

### New `User models` tab

Add a sixth tab dedicated to product-facing model access. Keeping it separate from `Profiles` makes the distinction explicit:

- **Profiles** answer: what model chain does an internal AI feature use by default?
- **User models** answer: what choices may an Oracle user see and use at each plan?

### Panel structure

Use a two-column admin panel consistent with the existing Feature Profiles panel:

- left: ordered model-option list with enabled state, plan badges, and default badges;
- right: selected option editor and chain builder.

Fields:

- stable option key;
- public label and description;
- enabled and `show when locked` toggles;
- allowed-tier checkboxes;
- default-for-tier checkboxes;
- allowed reasoning efforts and default effort;
- optional usage hint;
- sort order;
- ordered chain rows.

### Structured chain builder

Build a reusable `ModelChainBuilder` for the new panel and later reuse it in Feature Profiles:

- provider select from configured providers;
- model preset select plus custom model ID;
- add, remove, move up, and move down controls;
- no drag-and-drop dependency;
- warnings for disabled providers, blank model IDs, duplicate rows, embedding-only presets, or reasoning compatibility;
- advanced JSON import/export may remain available behind a disclosure, but raw JSON is not the primary editing experience.

### Atomic validation

Save the complete Oracle user-model configuration in one admin mutation so these rules are checked transactionally:

- unique `optionKey` within a feature;
- at least one chain entry per enabled option;
- all provider IDs exist;
- at least one allowed tier per enabled option;
- default effort belongs to the allowed effort list;
- exactly one enabled default per tier when user selection is enabled;
- sort orders are normalized;
- disabling an option that is a tier default requires choosing a replacement in the same save.

Use `ConvexError` with field-specific data for expected validation failures so the admin UI can point at the invalid control.

### Safe seed

Add an idempotent `Seed from Oracle profile` action/mutation that:

1. reads the current `oracle_chat.chainJson`;
2. creates one `automatic` option allowed/default for all tiers;
3. copies the profile thinking mode into allowed/default reasoning effort;
4. does not overwrite existing user options;
5. leaves `allowUserModelSelection` off until the admin explicitly enables it.

## 7. Frontend Component Plan

Keep `OracleInput` as the public composition boundary so both route pages continue using one component, but split its responsibilities:

```text
src/components/oracle/input/
  oracle-input.tsx                    composition and feature cards
  oracle-composer-textarea.tsx        textarea, autosize, character limit
  oracle-feature-menu.tsx             current feature logic, redesigned rows
  oracle-model-menu.tsx               sanitized option selection and locks
  oracle-reasoning-menu.tsx           allowed effort selection
  oracle-dictation-button.tsx         Oracle speech state and feedback
  use-autosize-textarea.ts            deterministic height management
  use-oracle-composer-preferences.ts  capabilities, defaulting, normalization
```

Shared additions:

```text
src/lib/speech/voice-input.ts
src/lib/ai/inference-preferences.ts
src/components/ai-admin/user-model-options-panel.tsx
src/components/ai-admin/model-chain-builder.tsx
convex/aiGateway/userModelOptions.ts
```

Update both Oracle route pages to:

- use `RefObject<HTMLTextAreaElement>`;
- hydrate the selected preference from the new-session default or existing session;
- include the opaque option/effort in `createSession` and `addMessage`;
- keep feature selection and synastry validation unchanged;
- pass no raw provider/model from the normal composer;
- stop dictation before submit/navigation.

Prefer local/session-backed composer preference state over adding more global Zustand state. The session already provides the correct handoff from `/oracle/new` to `/oracle/chat/[sessionId]`.

## 8. Telemetry and Observability

Add optional fields to `ai_gateway_events`:

- `routeKey`;
- `requestedThinkingMode`;
- `effectiveUserTier`.

Keep `providerId`, `model`, and gateway tier as actual execution data.

Update the Oracle debug panel to show:

- requested product option;
- normalized reasoning effort;
- actual provider/model;
- fallback tier and whether the requested primary was bypassed;
- access fallback reason such as `tier_not_allowed`, `option_disabled`, or `no_tier_default`.

Do not include question text in new model-selection analytics. Product analytics need only option key, effort, user tier, success/failure, and upgrade-click events.

## 9. Backward-Compatible Rollout

### Phase A — schema and resolver

1. Add optional schema fields and the new table/indexes.
2. Add the centralized resolver and sanitized capabilities query.
3. Add admin-only validation for debug overrides.
4. Leave `allowUserModelSelection` disabled.

No user-visible behavior changes in this phase.

### Phase B — admin configuration

1. Add the `User models` panel and structured chain builder.
2. Seed `automatic` from the existing Oracle profile.
3. Configure paid choices and reasoning policies.
4. Validate the default matrix for free/popular/premium.

The current feature profile remains the runtime path until explicitly enabled.

### Phase C — server routing integration

1. Persist normalized preferences on session/message writes.
2. Resolve again in `invokeOracle`.
3. Pass only the resolved chain/effort to the internal streaming gateway.
4. Add route telemetry and debug output.
5. Enable user routing for internal/admin accounts first.

### Phase D — composer UI

1. Land the textarea/autosize shell and redesigned feature menu.
2. Add model and reasoning menus driven by the capabilities query.
3. Add dictation and accessibility states.
4. Update new-session and chat call sites.
5. Test mobile, desktop, long drafts, feature cards, quota, and onboarding states.

### Phase E — staged access

1. Enable `automatic` for all tiers with no effective routing change.
2. Enable popular choices.
3. Enable premium choices.
4. Monitor fallback rate, cost, latency, refusals, safety blocks, and quota exhaustion by route.
5. Adjust route chains in admin without a frontend deployment.

Rollback is one switch: disable `allowUserModelSelection` and all traffic returns to the existing `oracle_chat` feature profile.

## 10. Verification Plan

### Pure/server tests

Add focused Vitest coverage for:

- free user requesting free, popular, premium, missing, and disabled options;
- popular/premium access matrices;
- admin/moderator behavior;
- missing and duplicate tier defaults;
- effort normalization when switching models;
- downgrade of an existing premium session;
- option disabled between session write and invocation;
- safe fallback to feature profile;
- unauthorized debug override rejection;
- structured chain validation and provider existence;
- actual-cost accounting still uses the model that succeeded.

### Composer interaction tests

Verify manually and, where the current test stack permits, with component tests:

- one through six lines resize without covering chat content;
- seventh line scrolls inside the textarea;
- paste and dictation resize correctly;
- Enter sends, Shift+Enter creates a line, IME Enter does not send;
- send remains disabled for an empty non-feature request;
- active feature/default prompt can still submit;
- all menus are keyboard navigable and remain within the viewport;
- locked model choice opens upgrade and cannot become active;
- effort resets only when incompatible with the new model;
- dictation final text appends once and interim text never submits;
- unsupported/denied speech recognition leaves typing usable;
- 320px mobile layout has no horizontal overflow;
- reduced-motion mode removes nonessential transitions.

### Oracle regressions

Exercise:

- new generic chat and follow-up;
- birth chart feature and depth;
- synastry person/relationship validation;
- journal recall with and without consent;
- deterministic binaural flow that bypasses the LLM where intended;
- birth report questionnaire/generating/ready states;
- quota exhausted state;
- kill switch and crisis response;
- provider failure and fallback;
- admin debug override.

Run the existing production Oracle evaluation suite before changing the production route chains. During implementation, use targeted `pnpm exec vitest` commands only; do not run the repository's prohibited build/check/lint commands unless the user explicitly requests them.

## 11. Acceptance Criteria

The redesign is complete when:

- the composer matches the reference structure while retaining the observatory visual direction;
- drafts visibly grow through normal multiline usage and scroll only after the cap;
- the feature menu has the same surface, spacing, typography, and row hierarchy as the user/sidebar dropdowns;
- free users cannot activate or invoke a paid route through UI changes or direct API calls;
- popular and premium options are entirely admin-configurable without code changes;
- the browser never receives provider credentials, endpoints, raw chains, or admin health data;
- model fallback, provider cooldown, safety, journal consent, quota, and response scanning still run server-side;
- reasoning effort reaches the provider payload but provider reasoning is not shown to users;
- first messages and follow-ups use the selected normalized preference;
- invalid/downgraded/disabled selections fall back predictably;
- actual model and requested option are both observable to admins;
- dictation works where supported and fails gracefully where not supported;
- the current `oracle_chat` profile remains a one-switch rollback path.

## 12. Explicit Non-Goals

Do not fold these into the initial implementation:

- file or image uploads behind the `+` menu;
- full voice conversation or text-to-speech playback;
- server transcription for unsupported browsers;
- showing model chain-of-thought;
- user-supplied API keys or arbitrary model IDs;
- real stop-generation/cancellation without backend cancellation support;
- changing Oracle safety, consent, birth-data, or crisis rules;
- changing subscription expiration semantics without a separate billing audit.

## 13. Documentation Updates Required With Implementation

Update these maintained docs when wiring changes land:

- `docs/oracle/00-MASTER-WIRING-GUIDE.md`;
- `docs/oracle/ORACLE_ARCHITECTURE.md`;
- `docs/oracle/OPERATIONS_AND_DEBUG.md`;
- `docs/ai/AI_PROVIDERS_MODELS.md`.

Do not manually edit `convex/_generated/`; allow the normal Convex tooling to regenerate API/data-model types in the developer environment.
