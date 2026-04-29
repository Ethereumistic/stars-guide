# Oracle AI System — Birth Context Injection

> Source: ORACLE_EXPLAINED.md §11

> This section documents the v2 universal birth context architecture. Birth data is always injected when the user has it saved — regardless of which feature is active. Depth is controlled by instructions, not data scope.

---

## Architecture: Data vs. Instructions

The v2 architecture separates **birth data** from **birth chart reading instructions**:

| Layer | Where | What | When |
|-------|-------|------|------|
| Birth data | User message (`[BIRTH CHART DATA]`) | All placements, houses, aspects | ALWAYS when `user.birthData` exists |
| Reading instructions | System prompt (feature injection) | Core depth or Full depth instructions | Only when `birth_chart` feature is active |

This separation is the key v2 change. Previously, "core" mode threw away most of the data (only injecting Sun/Moon/Ascendant), and "full" mode injected everything. Now both depths get the SAME full data — the instruction block tells the model which to focus on.

---

## Universal Birth Context Builder

`buildUniversalBirthContext()` in `src/lib/oracle/featureContext.ts`:

This function is called **before** feature selection check in `invokeOracle`, making it independent of `activeFeature`. It ALWAYS returns the full chart:

```
Treat the stored chart data below as canonical truth. Do not invent different signs, houses, or aspects.
Birth data: 2000-04-14 at 15:17
Location: New York, US | Timezone: America/New_York

Canonical stored placements:
- Ascendant: Cancer (House 1, direct)
- Sun: Aries 14.25° (House 10, direct, dignity: exaltation)
- Moon: Pisces 22.01° (House 9, direct)
- Mercury: Aries 8.10° (House 10, retrograde)
- Venus: Gemini 1.66° (House 11, direct, dignity: domicile)
- Mars: Leo 15.30° (House 2, direct)
... (all 14 placements)

House signatures:
H1:Cancer | H2:Leo | H3:Virgo | ... | H12:Gemini

Stored aspects:
- Sun conjunction Venus (orb 1.66°)
- Moon trine Jupiter (orb 0.82°)
... (up to 8, sorted by tightest orb)
```

---

## Depth-Specific Instructions

When `birth_chart` is the active feature, a depth-specific instruction block is injected into the system prompt:

**Core Depth** (`birth_chart_depth_core`):
```
[BIRTH CHART READING — CORE DEPTH]
Focus on how the Big Three (Sun, Moon, Ascendant) interact as a triad.
Explain each house placement — the house IS the context, the sign is the style.
For aspects, prioritize the tightest orbs. Name what the aspect creates.
Identify the primary tension or friction point and name it directly.
Output format: 1) Chart Ruler / Core Identity, 2) The Big Three, 3) Key Aspects, 4) Tension/Friction.
[END BIRTH CHART READING — CORE DEPTH]
```

**Full Depth** (`birth_chart_depth_full`):
```
[BIRTH CHART READING — FULL DEPTH]
Give a layered interpretation of the full chart while staying anchored to the stored placements.
Prioritize deeper synthesis: themes, clusters, houses, aspects, Nodes, Part of Fortune.
Identify the primary tension AND the primary gift. Name both directly.
[END BIRTH CHART READING — FULL DEPTH]
```

Both depths receive the SAME data via the user message. The instructions just tell the model where to focus.

---

## Depth Resolution

In `invokeOracle`:
1. If `session.featureKey === "birth_chart"`, read `session.birthChartDepth`
2. If `birthChartDepth` is not set, default to `"core"`
3. Load depth instructions: try DB injection (`birth_chart_depth_core` / `birth_chart_depth_full`), fall back to hardcoded `getBirthChartDepthInstructions(depth)`

---

## Data Sources

The birth context builder reads from `user.birthData` which has two schemas:
1. **Legacy**: `birthData.placements[]` with `{body, sign, house}`
2. **Chart**: `birthData.chart` with ascendant, planets (with longitude/retrograde/dignity), houses, aspects

Both are handled gracefully. The builder resolves placements from `chart.planets` first, falling back to `placements`.

---

## birthCalculator.ts (alternate, currently unused in LLM path)

`src/lib/oracle/birthCalculator.ts` provides `calculateBirthContext()` and `calculateDegradedBirthContext()` which compute charts on-the-fly from raw birth data. These are designed for when birth data changes and the chart hasn't been pre-stored. The current LLM path uses pre-stored chart data via `buildUniversalBirthContext()` instead.

---

## Token Budget

Full birth data injection costs ~450 tokens vs. ~175 tokens for the old core-only data. The net cost difference is ~0.03 cents per message — negligible given the architectural simplicity it enables.

---

## Wiring — Birth Data in the Prompt Pipeline

```
invokeOracle
       │
       ├── user.birthData exists?
       │       │
       │       YES:
       │       │
       │       ├── buildUniversalBirthContext(user.birthData)
       │       │       │
       │       │       ├── Reads from birthData.chart.planets (preferred)
       │       │       │   or birthData.placements (legacy fallback)
       │       │       │
       │       │       └── Returns: [BIRTH CHART DATA] block (ALL placements, houses, aspects)
       │       │
       │       │   This block goes into the USER MESSAGE (Block 1)
       │       │   regardless of which feature is active
       │       │
       │       NO:
       │       │
       │       └── birthContext = null (no birth data block injected)
       │
       ├── session.featureKey === "birth_chart"?
       │       │
       │       YES:
       │       │
       │       ├── Read session.birthChartDepth (default: "core")
       │       │
       │       ├── Try: oracle_feature_injections[birth_chart_depth_{depth}]
       │       │   Fallback: getBirthChartDepthInstructions(depth)
       │       │
       │       │   This instruction block goes into the SYSTEM PROMPT (Block 3)
       │       │
       │       NO:
       │       │
       │       └── No birth chart instructions in system prompt
       │
       └── Result: Data (user message) is always full when available.
                   Instructions (system prompt) vary by depth only when birth_chart is active.
                   A Cosmic Recall session STILL gets the full birth chart data in the user message.
```