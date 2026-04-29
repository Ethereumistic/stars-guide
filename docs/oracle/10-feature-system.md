# Oracle AI System — Feature System (Birth Chart, Cosmic Recall, etc.)

> Source: ORACLE_EXPLAINED.md §10

---

## Oracle Tools v2 Architecture

The v2 architecture unifies the two birth chart features into a single `birth_chart` tool with a `depth` field (`"core"` or `"full"`). Birth chart **data** is always injected (not feature-gated). Birth chart **instructions** vary by depth.

---

## Feature Definitions

Defined in `src/lib/oracle/features.ts`. Seven features are registered:

| Key | Label | Implemented | Requires Birth Data | Requires Journal Consent | Menu Group |
|-----|-------|-------------|---------------------|--------------------------|------------|
| `attach_files` | Add photos & files | No | No | No | primary |
| `birth_chart` | Birth chart analysis | Yes | Yes | No | primary |
| `synastry_core` | Synastry analysis | No | Yes | No | more |
| `synastry_full` | Deep synastry analysis | No | Yes | No | more |
| `sign_card_image` | Create sign card image | No | Yes | No | more |
| `binaural_beat` | Create binaural beat | No | No | No | more |
| `journal_recall` | Cosmic Recall | Yes | No | Yes | primary |

Only `birth_chart` and `journal_recall` are currently implemented.

---

## Feature Selection Flow

1. User opens the `+` menu in `OracleInput` component
2. Clicks a feature → `onFeatureSelect(featureKey)` is called
3. In `/oracle/new`: stores in Zustand, focuses input, pre-fills default prompt
4. In `/oracle/chat/[id]`: calls `updateSessionFeature` mutation to persist to session, also updates Zustand
5. When user submits, the `featureKey` is passed to `createSession`

---

## Feature Injection

When `invokeOracle` detects an active feature on the session (`session.featureKey`):

1. Resolves the `OracleFeatureDefinition` via `getOracleFeature()`
2. For `birth_chart`:
   - Reads `session.birthChartDepth` (defaults to `"core"` if unset)
   - Attempts to load `oracle_feature_injections` for key `birth_chart_depth_{core|full}` (admin-editable)
   - Falls back to hardcoded `getBirthChartDepthInstructions(depth)` from `featureContext.ts`
   - The instruction block goes into the system prompt; the data goes into the user message separately
3. For other features:
   - Queries `oracle_feature_injections` table for a matching `featureKey` row → this becomes the `featureInjection` string injected into the system prompt
   - Falls back to `activeFeature.fallbackInjectionText`
4. Birth data is ALWAYS injected regardless of feature — see [Birth Context Injection](./11-birth-context-injection.md)

---

## Default Prompts

Features can define a `defaultPrompt` that pre-fills the input:
- `birth_chart`: "Analyze my birth chart through my Sun, Moon, and Ascendant, including the houses they fall in."
- `journal_recall`: "Look through my journal and help me find patterns"

---

## Sign Preview Cards

When `birth_chart` is the active feature, `OracleSignPreviewCards` renders the user's Sun/Moon/Ascendant signs as visual cards above the input, showing sign icon, sign name, element, and house.

---

## Wiring — Feature System Connections

```
Feature selection (UI)
       │
       ├── OracleInput "+" menu ────▶ onFeatureSelect(featureKey)
       │                                    │
       │                                    ├── /oracle/new: store in Zustand, pre-fill defaultPrompt
       │                                    └── /oracle/chat/[id]: updateSessionFeature mutation
       │                                                                   │
       │                                                                   ▼
       │                                                          oracle_sessions.featureKey
       │                                                          oracle_sessions.birthChartDepth (for birth_chart)
       │
       ▼
invokeOracle reads session.featureKey
       │
       ├── getOracleFeature(featureKey) ──────▶ resolves OracleFeatureDefinition
       │
       ├── For birth_chart:
       │       ├── Load birthChartDepth from session (default: "core")
       │       ├── Try DB injection: oracle_feature_injections[birth_chart_depth_{core|full}]
       │       │   └── Fallback: hardcoded getBirthChartDepthInstructions(depth)
       │       └── Result: instruction block → injected into system prompt (Block 3)
       │
       ├── For other features:
       │       ├── Try DB injection: oracle_feature_injections[featureKey]
       │       │   └── Fallback: activeFeature.fallbackInjectionText
       │       └── Result: instruction block → injected into system prompt (Block 3)
       │
       └── Birth data ALWAYS injected into user message (Block 1)
           regardless of feature (see 11-birth-context-injection.md)

Also connected:
  - Intent Classification (13-intent-classification.md) can auto-activate features
  - Journal Context (12-journal-context-injection.md) is injected when consent granted, regardless of feature
```