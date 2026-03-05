# PHASE 3 — Convex Database Architecture
## Full Schema for Oracle Product · Quota System · Tier Limits

---

## Overview

This document defines every Convex table required to power Oracle. Design follows **best practices for AI wrapper products with tiered access**:

- Content tables (admin-editable) are separate from runtime tables (sessions, messages)
- Quota system is server-authoritative — never trust client-side quota state
- Soft deletes on content tables — hard deletes only when no session history references the record
- Prompt content is versioned — every admin save creates a rollback point
- Settings are a key-value store — adding new settings never requires schema changes
- `users.role` is the single source of truth for tier access

---

## User Roles & Quota Rules

Roles come from `users.role` in the existing users table. Oracle reads this field — it does not duplicate it.

| `users.role` | Daily Limit | Lifetime Limit | Reset Type | Notes |
|--------------|-------------|----------------|------------|-------|
| `user` | — | 5 | **Never resets** | Free tier lifetime cap |
| `popular` | 5 | — | Rolling 24h | |
| `premium` | 10 | — | Rolling 24h | |
| `moderator` | 10 | — | Rolling 24h | |
| `admin` | 999 | — | Rolling 24h | Effectively unlimited |
| Unauthenticated | 0 | 0 | — | Blocked at middleware level |

All limit values and reset durations are stored in `oracle_settings` — **never hardcoded**. When the admin changes a limit, it applies immediately to all new Oracle calls.

---

## Schema Overview

```
oracle_categories            ← The 6 domain badges
oracle_templates             ← Template questions (linked to category)
oracle_follow_ups            ← Follow-up questions (linked to template, third-party context only)
oracle_follow_up_options     ← Options for select-type follow-ups
oracle_scenario_injections   ← Per-template prompt behavioral modifiers
oracle_category_contexts     ← Per-category domain framing blocks
oracle_sessions              ← User conversation sessions
oracle_messages              ← Individual messages in a session
oracle_follow_up_answers     ← User's follow-up answers per session
oracle_quota_usage           ← Quota tracking per user (authoritative)
oracle_settings              ← Key-value config (soul prompt, models, limits, etc.)
oracle_prompt_versions       ← Version history for all prompt content
```

---

## Full Convex Schema

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Add to your existing schema.ts:

const oracleTables = {

  // ─── CONTENT TABLES ───────────────────────────────────────────────────────

  oracle_categories: defineTable({
    name: v.string(),                    // "Love", "Work", "Self", etc.
    slug: v.string(),                    // "love", "work" — URL-safe, unique
    icon: v.string(),                    // Lucide icon name or emoji string
    description: v.string(),            // Short description for admin panel
    displayOrder: v.number(),           // Sort order in UI (0-based)
    color: v.string(),                   // Hex color for badge styling
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_display_order", ["displayOrder"])
    .index("by_active", ["isActive"]),

  oracle_templates: defineTable({
    categoryId: v.id("oracle_categories"),
    questionText: v.string(),            // Full template question shown to user
    shortLabel: v.string(),              // Truncated for admin lists
    requiresThirdParty: v.boolean(),    // If false: skip follow-up flow entirely
    displayOrder: v.number(),
    isActive: v.boolean(),
    isDefault: v.boolean(),             // true = seeded by system
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"])
    .index("by_category_active", ["categoryId", "isActive"])
    .index("by_active", ["isActive"]),

  oracle_follow_ups: defineTable({
    templateId: v.id("oracle_templates"),
    questionText: v.string(),
    questionType: v.union(
      v.literal("single_select"),
      v.literal("multi_select"),
      v.literal("free_text"),
      v.literal("date"),               // For third party birth date
      v.literal("sign_picker"),        // 12-sign zodiac picker for third party
      v.literal("conditional"),        // Appears based on previous answer
    ),
    contextLabel: v.string(),           // Label in assembled context: "Their birth date:"
    displayOrder: v.number(),           // 0, 1, 2 (max 3 enforced in mutation)
    isRequired: v.boolean(),
    placeholder: v.optional(v.string()),
    // For conditional questions:
    conditionalOnFollowUpId: v.optional(v.id("oracle_follow_ups")),
    conditionalOnValue: v.optional(v.string()), // Show this Q if previous answer === this value
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_template_active", ["templateId", "isActive"]),

  oracle_follow_up_options: defineTable({
    followUpId: v.id("oracle_follow_ups"),
    label: v.string(),                  // Displayed to user
    value: v.string(),                  // Stored in answer + assembled context
    displayOrder: v.number(),
    isActive: v.boolean(),
  })
    .index("by_follow_up", ["followUpId"]),

  oracle_scenario_injections: defineTable({
    templateId: v.id("oracle_templates"),
    toneModifier: v.string(),
    psychologicalFrame: v.string(),
    avoid: v.string(),
    emphasize: v.string(),
    openingAcknowledgmentGuide: v.string(),
    rawInjectionText: v.optional(v.string()), // Override: full freeform injection text
    useRawText: v.boolean(),            // Toggle: use structured fields vs raw override
    isActive: v.boolean(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template", ["templateId"]),

  oracle_category_contexts: defineTable({
    categoryId: v.id("oracle_categories"),
    contextText: v.string(),
    isActive: v.boolean(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"]),

  // ─── SETTINGS TABLE (key-value) ────────────────────────────────────────────

  oracle_settings: defineTable({
    key: v.string(),
    value: v.string(),                  // Always stored as string — parsed at app layer
    valueType: v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("json"),
    ),
    label: v.string(),                  // Human-readable label for admin
    description: v.optional(v.string()),
    group: v.string(),                  // "model", "quota", "content", "safety", "operational"
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_group", ["group"]),

  // ─── PROMPT VERSION HISTORY ────────────────────────────────────────────────

  oracle_prompt_versions: defineTable({
    entityType: v.union(
      v.literal("soul_prompt"),
      v.literal("category_context"),
      v.literal("scenario_injection"),
    ),
    entityId: v.string(),               // Convex ID of the entity (as string)
    content: v.string(),               // Full content snapshot
    version: v.number(),
    savedBy: v.optional(v.id("users")),
    savedAt: v.number(),
    label: v.optional(v.string()),     // Admin can tag versions: "pre-gpt4o switch"
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_entity_version", ["entityType", "entityId", "version"]),

  // ─── QUOTA TABLE ──────────────────────────────────────────────────────────

  oracle_quota_usage: defineTable({
    userId: v.id("users"),
    // For roles with rolling 24h reset:
    dailyCount: v.number(),             // Questions used in current 24h window
    dailyWindowStart: v.number(),       // Timestamp when current window started (ms)
    // For free tier (lifetime cap):
    lifetimeCount: v.number(),          // Total questions ever asked (never decremented)
    // Metadata
    lastQuestionAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ─── RUNTIME TABLES ────────────────────────────────────────────────────────

  oracle_sessions: defineTable({
    userId: v.id("users"),
    title: v.string(),                  // Auto-generated from first question (truncated ~40 chars)
    categoryId: v.optional(v.id("oracle_categories")),
    templateId: v.optional(v.id("oracle_templates")),
    status: v.union(
      v.literal("collecting_context"),  // In follow-up flow
      v.literal("active"),              // Oracle answered, conversation ongoing
      v.literal("completed"),           // Session ended
    ),
    messageCount: v.number(),
    // Which model was used for the primary Oracle response
    primaryModelUsed: v.optional(v.string()),
    // Was fallback triggered?
    usedFallback: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  oracle_messages: defineTable({
    sessionId: v.id("oracle_sessions"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),          // Oracle's response
      v.literal("follow_up_prompt"),   // A follow-up question shown to the user
    ),
    content: v.string(),
    isFollowUpQuestion: v.boolean(),
    followUpId: v.optional(v.id("oracle_follow_ups")),
    // LLM metadata (only on assistant messages)
    modelUsed: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    fallbackTierUsed: v.optional(v.union(
      v.literal("A"),
      v.literal("B"),
      v.literal("C"),
      v.literal("D"),                  // D = hardcoded fallback
    )),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_created", ["sessionId", "createdAt"]),

  oracle_follow_up_answers: defineTable({
    sessionId: v.id("oracle_sessions"),
    followUpId: v.id("oracle_follow_ups"),
    answer: v.string(),                // Serialized — JSON for multi_select
    skipped: v.boolean(),              // true if user skipped optional question
    answeredAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_followup", ["sessionId", "followUpId"]),

};
```

---

## Quota Convex Functions

### `oracle/quota.ts`

```typescript
// checkQuota(userId): Returns { allowed: boolean, reason?: string, remaining?: number }
// Reads oracle_quota_usage for user, reads limits from oracle_settings, evaluates access.

export const checkQuota = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: "unauthenticated" };

    const role = user.role as string;

    // Read limits from settings
    const limitKey = `quota_limit_${role}`;       // e.g. "quota_limit_premium"
    const resetTypeKey = `quota_reset_${role}`;   // e.g. "quota_reset_premium"
    
    const limitSetting = await ctx.db.query("oracle_settings")
      .withIndex("by_key", q => q.eq("key", limitKey)).first();
    const resetTypeSetting = await ctx.db.query("oracle_settings")
      .withIndex("by_key", q => q.eq("key", resetTypeKey)).first();

    const limit = limitSetting ? parseInt(limitSetting.value) : 0;
    const resetType = resetTypeSetting?.value ?? "never"; // "daily" | "never"

    const usage = await ctx.db.query("oracle_quota_usage")
      .withIndex("by_user", q => q.eq("userId", userId)).first();

    if (!usage) return { allowed: true, remaining: limit };

    if (resetType === "never") {
      // Free tier: check lifetime
      const remaining = limit - usage.lifetimeCount;
      return { allowed: remaining > 0, remaining: Math.max(0, remaining), reason: remaining <= 0 ? "lifetime_cap" : undefined };
    }

    // Daily rolling window
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const windowExpired = now - usage.dailyWindowStart > windowMs;
    
    const count = windowExpired ? 0 : usage.dailyCount;
    const remaining = limit - count;
    
    return { 
      allowed: remaining > 0, 
      remaining: Math.max(0, remaining),
      reason: remaining <= 0 ? "daily_cap" : undefined,
      resetsAt: windowExpired ? now : usage.dailyWindowStart + windowMs,
    };
  }
});

// incrementQuota(userId): Called atomically after successful LLM call
export const incrementQuota = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const role = user?.role as string;
    const resetTypeSetting = await ctx.db.query("oracle_settings")
      .withIndex("by_key", q => q.eq("key", `quota_reset_${role}`)).first();
    const resetType = resetTypeSetting?.value ?? "never";
    
    const now = Date.now();
    const existing = await ctx.db.query("oracle_quota_usage")
      .withIndex("by_user", q => q.eq("userId", userId)).first();

    if (!existing) {
      await ctx.db.insert("oracle_quota_usage", {
        userId,
        dailyCount: 1,
        dailyWindowStart: now,
        lifetimeCount: 1,
        lastQuestionAt: now,
        updatedAt: now,
      });
      return;
    }

    const windowMs = 24 * 60 * 60 * 1000;
    const windowExpired = now - existing.dailyWindowStart > windowMs;

    await ctx.db.patch(existing._id, {
      dailyCount: windowExpired ? 1 : existing.dailyCount + 1,
      dailyWindowStart: windowExpired ? now : existing.dailyWindowStart,
      lifetimeCount: existing.lifetimeCount + 1,
      lastQuestionAt: now,
      updatedAt: now,
    });
  }
});
```

---

## Settings Seed Data

All values stored as strings; parsed at app layer per `valueType`.

### Model Config (`group: "model"`)

| key | valueType | Default | Label |
|-----|-----------|---------|-------|
| `model_a` | string | `google/gemini-2.5-flash` | Primary Model |
| `model_b` | string | `anthropic/claude-sonnet-4` | Fallback Model B |
| `model_c` | string | `x-ai/grok-4.1-fast` | Fallback Model C |
| `temperature` | number | `0.82` | Temperature |
| `max_tokens` | number | `600` | Max Output Tokens |
| `top_p` | number | `0.92` | Top-p |
| `stream_enabled` | boolean | `true` | Streaming |

### Quota Config (`group: "quota"`)

| key | valueType | Default | Label |
|-----|-----------|---------|-------|
| `quota_limit_user` | number | `5` | Free Tier — Lifetime Limit |
| `quota_limit_popular` | number | `5` | Popular Tier — Daily Limit |
| `quota_limit_premium` | number | `10` | Premium Tier — Daily Limit |
| `quota_limit_moderator` | number | `10` | Moderator Tier — Daily Limit |
| `quota_limit_admin` | number | `999` | Admin Tier — Daily Limit |
| `quota_reset_user` | string | `never` | Free Tier Reset Type |
| `quota_reset_popular` | string | `daily` | Popular Reset Type |
| `quota_reset_premium` | string | `daily` | Premium Reset Type |
| `quota_reset_moderator` | string | `daily` | Moderator Reset Type |
| `quota_reset_admin` | string | `daily` | Admin Reset Type |

### Content Config (`group: "content"`)

| key | valueType | Default | Label |
|-----|-----------|---------|-------|
| `soul_prompt` | string | (see Phase 2) | Oracle Soul Prompt |
| `max_follow_ups_per_template` | number | `3` | Max Follow-ups Per Template |
| `oracle_enabled` | boolean | `true` | Oracle Kill Switch |

### Safety Config (`group: "safety"`)

| key | valueType | Default | Label |
|-----|-----------|---------|-------|
| `crisis_response_text` | string | (see Phase 2) | Crisis Response |
| `fallback_response_text` | string | (see Phase 2) | Model Fallback Response D |

---

## Data Integrity Rules

1. **No hard deletes on content tables** while sessions reference those records. Admin panel enforces soft-delete only when `sessionCount > 0`.

2. **`oracle_follow_ups` createFollowUp mutation** must validate that the target template has fewer than `max_follow_ups_per_template` (from settings) active follow-ups before inserting.

3. **Quota increment is atomic** — it must happen in a Convex mutation (not an action) to guarantee consistency. The LLM action calls `ctx.runMutation(api.oracle.quota.incrementQuota, ...)` after a successful response.

4. **Crisis pre-check fires before quota increment** — a crisis response does not consume a user's quota.

5. **`requiresThirdParty: false` templates** — the follow-up flow is skipped entirely, and no `oracle_follow_up_answers` records are created for that session.

6. **Settings upsert** validates that the value string is parseable as the declared `valueType` before saving. Invalid types throw a user-friendly error in the admin panel.