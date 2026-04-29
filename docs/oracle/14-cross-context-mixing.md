# Oracle AI System — Cross-Context Mixing

> Source: ORACLE_EXPLAINED.md §14

This is the biggest UX win of the v2 architecture. Because birth data is always injected (not feature-gated) and journal context is always injected (not feature-gated), multiple context blocks coexist in every prompt.

---

## Context Visibility by Session Type

| Session type | Birth data visible | Journal visible | Timespace visible |
|--------------|-------------------|-----------------|-------------------|
| Generic chat (no tool) | ✅ (if saved) | ✅ (if consent) | ✅ |
| `birth_chart` (core or full) | ✅ | ✅ (if consent) | ✅ |
| `journal_recall` | ✅ (if saved) | ✅ (expanded budget) | ✅ |

---

## Example: Cosmic Recall + Birth Chart

User: *"Look through my journal and tell me why my relationships have been so intense lately."*

**Injected context:**
```
[SYSTEM PROMPT]
[COSMIC RECALL MODE] instructions
...
[SYSTEM PROMPT continues with journal context, timespace, etc.]

[USER MESSAGE]
[BIRTH CHART DATA]
Treat the stored chart data below as canonical truth...
Sun: Gemini (House 11) | Venus: Gemini (House 11) | ... all placements ...
House signatures: H1:Leo | ...
Stored aspects: Sun conjunction Venus (orb 1.66°) | ...
[END BIRTH CHART DATA]

Look through my journal and tell me why my relationships have been so intense lately.
```

The AI can now:
1. Search journal entries for relationship mentions
2. See the user's Sun-Venus conjunction in Gemini (H11 — house of friendship/community)
3. Check if any transits are currently activating Venus
4. Give an answer that connects journal patterns + birth chart + current transits

This cross-context mixing is the future of the Oracle.

---

## Wiring — How Contexts Combine in the Prompt

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM PROMPT                            │
│                                                              │
│  Block 1: [SAFETY RULES]          ← always, hardcoded       │
│  Block 2: [SOUL DOCUMENT]         ← always, admin-editable  │
│  Block 3: [FEATURE INSTRUCTIONS]  ← only when feature active│
│  Block 3.5: [TIMESPACE CONTEXT]   ← always, conditionally   │
│  Block 4: [JOURNAL CONTEXT]       ← when consent granted     │
│  Block 5: [TITLE DIRECTIVE]      ← first response only      │
│  Block 6: [JOURNAL PROMPT DIR]    ← when journal + first     │
│                                                              │
│  ↑ Contexts are INDEPENDENT — each is gated by its own      │
│    condition, and multiple can coexist in the same prompt.  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     USER MESSAGE                             │
│                                                              │
│  Block 1: [BIRTH CHART DATA]     ← always when birthData    │
│  Block 2: Sanitized question     ← always                    │
│                                                              │
│  ↑ Birth data is NOT feature-gated: it appears here         │
│    in EVERY session type when the user has birthData saved. │
└─────────────────────────────────────────────────────────────┘

Context source mapping:
  ┌───────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │   Birth Data       │   │  Journal Context  │   │ Timespace Context│
  │ (user.birthData)   │   │ (journal entries) │   │ (datetime/transits)│
  │                    │   │                    │   │                    │
  │ Gated by: user has │   │ Gated by: consent  │   │ Gated by: always   │
  │ birthData saved    │   │ = oracleCanRead... │   │ (conditionally     │
  │                    │   │                    │   │  expanded w/ intent)│
  │ Injected: USER MSG │   │ Injected: SYS BLK4│   │ Injected: SYS BLK3.5│
  │ Depth-agnostic     │   │ Budget varies by   │   │                    │
  │ (always full data) │   │ Cosmic Recall mode │   │                    │
  └───────────────────┘   └──────────────────┘   └──────────────────┘
          │                       │                       │
          └───────────┬───────────┴───────────────────────┘
                      │
              ALL THREE CAN COEXIST
              in a single prompt — this is
              cross-context mixing
```

**The v2 insight**: By separating data injection from feature instructions, you get cross-context mixing for free. The model always sees the full picture; features only add focus instructions.