# Oracle AI System — Operational Controls

> Source: ORACLE_EXPLAINED.md §16

---

## Kill Switch

- **Key**: `kill_switch` in `oracle_settings`
- **Values**: `"true"` (offline) or `"false"` (live)
- **Effect**: When `"true"`, every `invokeOracle` call immediately returns the fallback message without calling any LLM
- **Admin UI**: Toggle switch with CONFIRM dialog requiring user to type "CONFIRM"
- Also shown on `/admin/oracle` overview page with LIVE/OFFLINE badge

---

## Fallback Response Text

- **Key**: `fallback_response_text` in `oracle_settings`
- **Used in two places**: kill switch response and all-models-failed response
- **Default**: "The stars are momentarily beyond my reach - cosmic interference is rare, but it happens. Please try again in a moment. ->"
- Editable in admin Operations tab

---

## Crisis Response Text

- **Key**: `crisis_response_text` in `oracle_settings`
- **Default**: "I see you, and what you're carrying right now matters deeply. Please reach out to the Crisis Text Line - text HOME to 741741 - or call the 988 Suicide & Crisis Lifeline."
- Editable in admin Operations tab

---

## Wiring — Operational Controls in the invokeOracle Pipeline

```
invokeOracle entry
       │
       ▼
  1. Read kill_switch from oracle_settings
       │
       ├── "true"  ──▶ Return fallback_response_text immediately
       │                Message: modelUsed="kill_switch", fallbackTierUsed="D"
       │                No LLM call. No quota consumed.
       │
       └── "false" ──▶ Continue ↓
                         │
  2. Crisis keyword scan on user question
                         │
                         ├── Match found ──▶ Return crisis_response_text immediately
                         │                     Message: modelUsed="crisis_response", fallbackTierUsed="D"
                         │                     No LLM call. No quota consumed.
                         │
                         └── No match ──▶ Continue ↓
                                            │
  3. ... [prompt assembly, model chain iteration] ...
                         │
  4. All models failed ──▶ Return fallback_response_text
                              Message: modelUsed="fallback", fallbackTierUsed="D"
                              No quota consumed.

Summary of Tier D responses (no LLM call):
  ┌──────────────────────┬───────────────────────┬─────────────────┐
  │ Trigger              │ modelUsed             │ Quota consumed? │
  ├──────────────────────┼───────────────────────┼─────────────────┤
  │ Kill switch active   │ "kill_switch"         │ No              │
  │ Crisis keyword match │ "crisis_response"     │ No              │
  │ All models failed    │ "fallback"            │ No              │
  └──────────────────────┴───────────────────────┴─────────────────┘
```