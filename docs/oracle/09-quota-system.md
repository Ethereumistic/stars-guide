# Oracle AI System — Quota System

> Source: ORACLE_EXPLAINED.md §9

---

## Server-Authoritative Design

The quota check happens in `checkQuota` (`convex/oracle/quota.ts:14-73`). This is a **Convex query** — the server is the authority. Client-side displays are only UX hints.

---

## Quota Logic by Plan

| Plan | Reset Type | Behavior |
|------|-----------|----------|
| free | Lifetime | `limit - lifetimeCount`; never resets |
| popular | Rolling 24h | `limit - dailyCount`; resets when window expires |
| premium | Rolling 24h | Same as popular |
| moderator | Rolling 24h | Same as popular |
| admin | Rolling 24h | Same, but very high limit (999) |

The plan is determined by: `(user.role === "admin" || user.role === "moderator") ? user.role : user.tier`

---

## Reading Limits

- **Limit**: read from `oracle_settings` key `quota_limit_{plan}` (defaults: free=5, popular=5, premium=10, moderator=10, admin=999)
- **Reset type**: read from `oracle_settings` key `quota_reset_{plan}` (default: free="never", others not in defaults — falls to "never" then uses daily)

---

## Increment

`incrementQuota` mutation (`quota.ts:82-127`):
- Called only after a successful LLM response (not for crisis/kill-switch/hardcoded-fallback)
- Increments both `dailyCount` and `lifetimeCount`
- If 24h window expired, resets `dailyCount` to 1 and starts new window

---

## Client-Side UX

- First question page: shows "X questions remaining" with reset time
- Chat page: shows remaining count; when exhausted, shows upgrade CTA or countdown timer
- Free tier lifetime cap → upgrade prompt
- Daily cap → countdown timer until reset

---

## Wiring — Quota Check and Increment Flow

```
invokeOracle entry
       │
       ├─ Kill switch check ──── if ON: return fallback (NO quota consumed)
       │
       ├─ Crisis detection ────── if triggered: return crisis response (NO quota consumed)
       │
       ├─ ... prompt assembly, model chain iteration ...
       │
       ├─ Successful LLM response
       │       │
       │       ├── Is this the first response in the session? (checked by quota logic)
       │       │       │
       │       │       YES ──▶ incrementQuota(userId) ───▶ oracle_quota_usage (dailyCount++, lifetimeCount++)
       │       │       NO  ──▶ skip quota increment (follow-ups in same session don't count extra)
       │       │
       │       └── Return response to client
       │
       └─ All models failed ──── return hardcoded fallback (NO quota consumed)
```

**Key guarantee**: Quota is ONLY consumed after a genuine, successful LLM response. Crisis responses, kill switch responses, and all-models-failed responses do NOT consume quota.

```
Client-side quota display:
       │
       ├── checkQuota query ──────▶ reads oracle_quota_usage for current user
       │                                computes remaining = limit - count
       │                                returns { remaining, resetTime, plan }
       │
       └── UI shows remaining + timer/upgrade CTA
           (this is a UX hint only — server enforces quota at invocation time)
```