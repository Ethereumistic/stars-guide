# Oracle Feature Actions + Feature Injections

## Summary
Implement Oracle feature-mode on the shared input so the `Plus` button becomes the action menu, birth-chart actions become real, and feature-specific prompt context is injected server-side instead of relying on the model to guess chart details.

This pass should ship:
- A shared `oracle-input` component used by both `/oracle/new` and `/oracle/chat/[sessionId]`
- A feature registry with armed-state UI, removable feature badge, and compact Sun/Moon/Ascendant cards
- Real prompt-time chart injection for `birth_chart_core` and `birth_chart_full`
- A third admin tab, `Feature Injections`, for per-feature context documents
- Persistent session-level feature state that can be changed mid-chat and is clearly commented where that behavior is implemented

## Key Changes
### Shared input and menu behavior
- Extract the duplicated composer into `src/components/oracle/input/oracle-input.tsx`.
- Make the left `Plus` button the dropdown trigger; remove the separate right-side `Tools` dropdown from Oracle input.
- Menu shape:
  - Top level: `Add photos & files` then separator, `Birth chart analysis`, `Deep birth chart analysis`, separator, `More >`
  - `More >`: `Synastry analysis`, `Deep synastry analysis`, separator, `Create sign card image`, `Create binaural beat`
- Non-birth-chart items stay visible but disabled/coming-soon in the nested submenu.
- Selecting a supported feature arms the composer instead of auto-submitting.
- When armed, show:
  - a dismissible feature badge with `X`
  - compact Sun, Moon, Ascendant cards above the input, visually derived from the existing sign-card system but resized for Oracle
- If send is pressed with an armed feature and empty text, submit that feature’s default prompt.
- If text exists, submit the typed question and keep the armed feature active.

### Feature model and session persistence
- Add a small feature registry constant with stable keys, labels, default prompts, implementation status, and menu grouping.
- Persist the active feature on `oracle_sessions` via an optional `featureKey`.
- Extend session create/update flows:
  - `createSession` accepts optional `featureKey`
  - add `updateSessionFeature` mutation to set or clear the feature on an active chat
- Extend the Oracle store with `selectedFeatureKey` plus set/clear/hydrate actions.
- On chat page load, hydrate the armed feature from the session.
- If the user switches feature mid-session, update `session.featureKey` and use the new one for that and later turns.
- Add explicit inline comments at:
  - the session-feature update path in the shared input/chat flow
  - the prompt assembly path where session feature resolves to feature-specific context/injection

### Prompt assembly and birth-chart truthfulness
- Add a new feature-injection layer to prompt assembly order:
  - safety
  - soul docs
  - category context
  - scenario injection
  - feature injection
- Extend prompt builder types to accept optional `featureInjection`.
- Stop sending empty natal context for feature sessions; build feature-specific chart payloads before the LLM call.
- Add a dedicated feature-context builder for supported birth-chart features:
  - `birth_chart_core`: use stored `birthData.placements` as source of truth for Sun, Moon, Ascendant sign + house, plus birth metadata
  - `birth_chart_full`: use all stored placements as the base payload and enrich with astronomy-engine-derived chart details only when calculation succeeds
- If enrichment fails, still send the placements-based payload and include an explicit completeness note so the model does not invent missing degrees/aspects.
- The feature context itself should tell Oracle what kind of reading to give:
  - core feature: prioritize Sun/Moon/Ascendant and their houses
  - full feature: prioritize the full placement set and deeper chart synthesis
- Keep normal non-feature Oracle behavior unchanged.

### Admin feature injections
- Add a new persistence layer for per-feature documents, separate from category and scenario injections.
- Add a third tab to `/admin/oracle/context-injection`: `Feature Injections`.
- Admin flow:
  - select feature from registry
  - edit/save injection text for that feature
  - preview system prompt including the selected feature injection layer
- Version feature injections the same way as the other prompt layers.

## Public APIs / Types / Data
- Add optional `featureKey` to `oracle_sessions`.
- Add a new `oracle_feature_injections` table keyed by stable feature key, with versioning fields consistent with the existing injection tables.
- Extend `oracle_prompt_versions.entityType` with `feature_injection`.
- Add Convex query/mutation surface for feature injections:
  - `getFeatureInjection(featureKey)`
  - `listAllFeatureInjections()`
  - `saveFeatureInjection(featureKey, contextText)`
- Add `updateSessionFeature(sessionId, featureKey?)` mutation.
- Add frontend feature type/registry shared by input UI and admin selection so labels/keys stay consistent.

## Test Plan
- Type/build verification:
  - `tsc`
  - app build
- Prompt-path scenarios:
  - core birth-chart feature injects Sun/Moon/Ascendant signs and houses from stored placements
  - full birth-chart feature injects all placements and does not hallucinate when enrichment fails
  - feature injection appears in the system prompt after scenario injection
  - non-feature sessions still build the same prompt as before
- Session behavior scenarios:
  - new session created with armed feature stores `featureKey`
  - empty send with armed feature uses default prompt
  - clearing the badge removes feature state from the next send
  - changing feature in an active chat updates session feature and later turns inherit the new one
- UI scenarios:
  - `Plus` opens the new dropdown
  - `More >` submenu renders disabled upcoming items
  - Sun/Moon/Ascendant cards appear only for relevant armed/active birth-chart features
  - shared input renders correctly in both `/oracle/new` and `/oracle/chat/[sessionId]`
- Admin scenarios:
  - feature injection tab lists supported features
  - save + reload preserves content
  - preview includes the selected feature injection

## Assumptions
- `birthData.placements` is the canonical source for sign/house truth because it is already stored and schema-backed; explicit `sunSign`/`moonSign`/`risingSign` fields can be treated only as optional runtime convenience if present.
- Only `Birth chart analysis` and `Deep birth chart analysis` are functional in this pass.
- `Add photos & files` remains present in the menu but not implemented here.
- The Oracle sign preview above the input should be a compact Oracle-specific derivative, not the full-size dashboard `SignCardV2`.
- Feature injection is session-scoped, but category/template behavior remains available when a session also has those values.
