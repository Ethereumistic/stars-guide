# Admin Notifications System — Implementation Plan

## Problem Statement

The app currently has transactional notifications only (referral_completed, friend_request, friend_accepted) — created automatically by backend mutations. There is no way for an admin to compose, schedule, or broadcast custom notifications to users. This plan adds a full admin notification management system at `/admin/notifications` with compose, target, schedule, and broadcast capabilities.

---

## Current Architecture

| Piece | Location | Notes |
|---|---|---|
| Notifications table | `convex/schema.ts` — `notifications` | `userId`, `type` (3 literal union), `fromUserId`, optional `referralId`/`friendshipId`, `message`, `read`, `createdAt` |
| Notification queries/mutations | `convex/notifications.ts` | `list`, `unreadCount`, `markRead`, `markAllRead` |
| Notification bell (inline) | `src/components/layout/navbar.tsx` — `UserMenuNotifications` | Renders inline in avatar dropdown; reads `api.notifications.list` |
| Notification type icons | `src/components/layout/navbar.tsx` — `notificationTypeIcons` | Maps type → icon component |
| Notification bell component | `src/components/notifications/notification-bell.tsx` | Standalone Popover component (currently unused — replaced by inline version) |
| Admin guard | `convex/lib/adminGuard.ts` | `requireAdmin(ctx)` — checks `user.role === "admin"` |
| Admin layout | `src/app/admin/layout.tsx` | Sidebar with sections: main nav, Oracle CMS, Journal CMS |
| Crons | `convex/crons.ts` | Currently only `compute-cosmic-weather` daily |
| User schema fields | `convex/schema.ts` — users | `tier`: free/popular/premium, `role`: user/admin/moderator, `subscriptionStatus`: active/canceled/past_due/trialing/none |

---

## Design Decisions

### Separate broadcast_notifications from notifications

The existing `notifications` table is per-user, written one doc per recipient. For admin broadcasts, we need a **campaign** concept — a single "broadcast notification" record that defines WHO to target, WHAT to say, and WHEN to deliver. Then a delivery job fan-outs per-user docs into the existing `notifications` table.

**Why a separate table?** The `notifications` table is the user-facing inbox. Admin campaigns are a management concern. Keeping them separate means:
- Admin can edit/delete campaigns without touching user inboxes
- Campaign analytics (sent, read rate) are trivial to compute
- The `notifications.type` union stays clean — we add `"admin_broadcast"` as a new literal

### Type union extension

Add `"admin_broadcast"` to the existing `notifications.type` union. This is the only change to the existing table. The frontend already has a fallback icon (`Bell`) for unknown types.

### Cron-based delivery

Convex crons run at most once per minute. For scheduled notifications, a cron job checks a `scheduledNotifications` queue every minute and delivers any that are due. This is simple, reliable, and requires no external scheduler.

---

## Implementation Tasks

### Phase 1: Schema Changes

#### 1.1 Add `scheduledNotifications` table to `convex/schema.ts`

```ts
// Admin-composed notification campaigns (broadcast + scheduled)
scheduledNotifications: defineTable({
    // ─── Content ───
    title: v.string(),                    // Admin-facing campaign name (not shown to users)
    message: v.string(),                  // The notification text shown to users
    type: v.literal("admin_broadcast"),   // Always this value — extends the notifications union

    // ─── Targeting ───
    targetAudience: v.union(
        v.literal("all"),                 // Every user
        v.literal("tier"),                // Filter by subscription tier
        v.literal("role"),                // Filter by role
        v.literal("subscriptionStatus"),  // Filter by subscription status
    ),
    targetFilter: v.optional(v.string()), // The specific value to match, e.g. "free", "premium", "user", "active"

    // ─── Scheduling ───
    status: v.union(
        v.literal("draft"),              // Being composed, not yet scheduled
        v.literal("scheduled"),           // Queued for delivery at scheduledAt
        v.literal("sending"),             // Currently being delivered (transient)
        v.literal("sent"),                // Fully delivered
        v.literal("cancelled"),           // Admin cancelled before delivery
    ),
    scheduledAt: v.number(),             // When to deliver (timestamp ms). For "send now", set to Date.now() on creation.

    // ─── Analytics ───
    sentCount: v.optional(v.number()),    // How many notifications were created
    readCount: v.optional(v.number()),    // How many have been read (updated by a separate cron or on-demand)

    // ─── Metadata ───
    createdBy: v.id("users"),            // Admin who created it
    createdAt: v.number(),
    sentAt: v.optional(v.number()),       // When delivery actually completed
})
    .index("by_status", ["status"])
    .index("by_status_scheduledAt", ["status", "scheduledAt"])
    .index("by_createdBy", ["createdBy"]),
```

#### 1.2 Extend `notifications.type` union in `convex/schema.ts`

Add `v.literal("admin_broadcast")` to the existing union:

```ts
type: v.union(
    v.literal("referral_completed"),
    v.literal("friend_request"),
    v.literal("friend_accepted"),
    v.literal("admin_broadcast"),       // NEW
),
```

Make `fromUserId` optional (broadcasts don't come from a specific user):

```ts
fromUserId: v.optional(v.id("users")),   // Changed from required to optional
```

**Migration note:** Existing `fromUserId` fields are all non-null. Making it optional is backward-compatible — no data migration needed.

---

### Phase 2: Backend — Admin Notification Functions

#### 2.1 Create `convex/notifications/admin.ts`

All admin-facing notification functions. Every function MUST call `requireAdmin(ctx)` first.

| Function | Type | Description |
|---|---|---|
| `listCampaigns` | query | List all scheduledNotifications, sorted by createdAt desc. Paginated (take 50). |
| `getCampaign` | query | Get a single campaign by ID. |
| `createCampaign` | mutation | Create a new campaign (status: "draft" or "scheduled"). Validate all fields. |
| `updateCampaign` | mutation | Edit campaign fields. Only allowed if status is "draft" or "scheduled". |
| `cancelCampaign` | mutation | Set status → "cancelled". Only if status is "scheduled". |
| `deleteCampaign` | mutation | Permanently delete a campaign. Only if status is "draft" or "cancelled". |
| `sendCampaignNow` | mutation | Set scheduledAt to Date.now() and status to "scheduled". The cron picks it up within 60 seconds. Alternatively, call the delivery logic directly if you want instant delivery. |
| `getCampaignAnalytics` | query | Return sentCount, readCount for a campaign. readCount is computed on-demand by counting `read: true` notifications with a matching `scheduledNotificationId`. |

**`createCampaign` arguments:**

```ts
args: {
    title: v.string(),
    message: v.string(),
    targetAudience: v.union(
        v.literal("all"),
        v.literal("tier"),
        v.literal("role"),
        v.literal("subscriptionStatus"),
    ),
    targetFilter: v.optional(v.string()),
    scheduledAt: v.number(),          // Timestamp. Use Date.now() for "send now"
    sendImmediately: v.optional(v.boolean()), // If true, set status to "scheduled" + scheduledAt = Date.now()
}
```

**`sendCampaignNow` delivery logic (shared with cron):**

Create a helper function `deliverCampaign(ctx, campaignId)` that:
1. Sets campaign status → "sending"
2. Queries users based on `targetAudience` + `targetFilter`:
   - `"all"` → `ctx.db.query("users").collect()`
   - `"tier"` → `ctx.db.query("users").withIndex("by_tier", ...)` — **NOTE: add `by_tier` index to users table if missing**
   - `"role"` → scan all users, filter by role (or add `by_role` index)
   - `"subscriptionStatus"` → `ctx.db.query("users").withIndex("by_subscription_status", ...)`
3. For each matched user, inserts a `notifications` doc:
   ```ts
   {
       userId: matchedUser._id,
       type: "admin_broadcast",
       fromUserId: undefined,           // System notification
       message: campaign.message,
       read: false,
       createdAt: Date.now(),
       scheduledNotificationId: campaign._id,  // Link back for analytics
   }
   ```
4. Updates campaign: `sentCount = matchedUsers.length`, `status = "sent"`, `sentAt = Date.now()`

**⚠️ Batch limit:** Convex mutations have a 30-second timeout and 16MB memory limit. For large user bases (>10k users), deliver in batches using `ctx.scheduler.runAfter(0, ...)` to fan out. For the MVP, a simple loop with a reasonable limit (e.g., 10,000 users) is fine.

#### 2.2 Add indexes to users table (if missing)

Check `convex/schema.ts` users table for these indexes. Add if missing:

```ts
.index("by_tier", ["tier"])
.index("by_role", ["role"])
```

#### 2.3 Add `scheduledNotificationId` field to notifications table

```ts
// In notifications table definition, add:
scheduledNotificationId: v.optional(v.id("scheduledNotifications")),
```

---

### Phase 3: Cron-Based Scheduled Delivery

#### 3.1 Add scheduled notification cron to `convex/crons.ts`

```ts
crons.minutely(
    "deliver-scheduled-notifications",
    {},
    internal.notifications.delivery.processScheduledNotifications,
);
```

This runs every minute. The function checks for campaigns with `status === "scheduled"` and `scheduledAt <= Date.now()`, then calls the shared `deliverCampaign` logic.

#### 3.2 Create `convex/notifications/delivery.ts`

```ts
import { internalMutation } from "../_generated/server";

export const processScheduledNotifications = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Find all campaigns due for delivery
        const due = await ctx.db
            .query("scheduledNotifications")
            .withIndex("by_status_scheduledAt", (q) =>
                q.eq("status", "scheduled").lte("scheduledAt", now)
            )
            .collect();

        for (const campaign of due) {
            await deliverCampaign(ctx, campaign._id);
        }
    },
});
```

The `deliverCampaign` helper can live in a shared file (e.g., `convex/notifications/delivery.ts`) and be called from both the cron and the admin `sendCampaignNow` mutation.

**Important:** Import the helper in both places. Do NOT duplicate the logic.

---

### Phase 4: Analytics Cron (Optional — Phase 2)

#### 4.1 Add hourly analytics update cron

```ts
crons.hourly(
    "update-notification-analytics",
    { minuteUTC: 30 },
    internal.notifications.delivery.updateCampaignAnalytics,
);
```

This counts read notifications per campaign and updates `readCount` on the campaign record. Alternatively, compute `readCount` on-demand in `getCampaignAnalytics` for simplicity (no cron needed).

**Recommendation:** Compute on-demand for the MVP. Add the cron later if campaign analytics become a performance concern.

---

### Phase 5: Frontend — Admin Notifications Page

#### 5.1 Add admin sidebar section

**File:** `src/app/admin/layout.tsx`

Add a new section in the sidebar (after Journal CMS):

```tsx
const notificationNavItems = [
    {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Bell,   // from lucide-react
    },
];
```

Add a sidebar section header with `Bell` icon and "NOTIFICATIONS" label, following the same pattern as the Oracle CMS and Journal CMS sections.

Also update the header breadcrumb lookup to include the new items.

#### 5.2 Create admin notifications overview page

**File:** `src/app/admin/notifications/page.tsx` (NEW)

Overview page (following the pattern of `admin/oracle/page.tsx`):

- Stats cards at top:
  - Total campaigns
  - Sent campaigns count
  - Scheduled campaigns count
  - Draft campaigns count
- Quick "Create Notification" button (links to compose form or opens inline form)
- Recent campaigns table/cards showing: title, target, status badge, scheduled time, sent count, read count
- Each campaign row has: Edit (if draft/scheduled), Cancel (if scheduled), Duplicate, Delete (if draft/cancelled) actions

#### 5.3 Campaign compose form

This can be inline on the overview page or a separate route (`/admin/notifications/new`). Use a `Dialog` or a dedicated card with form fields:

| Field | Component | Notes |
|---|---|---|
| **Title** | `Input` | Admin-facing campaign name |
| **Message** | `Textarea` | The notification body shown to users |
| **Target Audience** | `Select` | Options: "All Users", "By Tier", "By Role", "By Subscription Status" |
| **Target Filter** | `Select` | Dynamic options based on audience: tier → free/popular/premium, role → user/admin/moderator, sub status → active/canceled/past_due/trialing/none |
| **Schedule** | Date/Time picker or radio: "Send Now" / "Schedule for later" | For "Schedule for later", show a datetime input |
| **Preview** | Static preview card | Shows how the notification will look in the user menu |

#### 5.4 Campaign list/table

Show all campaigns in a table or card list:

| Column | Description |
|---|---|
| Title | Campaign name |
| Target | Audience + filter, e.g., "Tier: Premium" |
| Status | Badge: draft (gray), scheduled (amber), sending (blue pulse), sent (green), cancelled (red) |
| Scheduled | Formatted date/time |
| Sent / Read | e.g., "1,234 / 892" |
| Actions | Edit, Cancel, Duplicate, Delete |

Use `Badge` component with variant colors matching the status.

---

### Phase 6: Frontend — User-Facing Updates

#### 6.1 Update `notificationTypeIcons` in `src/components/layout/navbar.tsx`

Add the new `admin_broadcast` type:

```ts
const notificationTypeIcons: Record<string, React.ReactNode> = {
    referral_completed: <GiStarSwirl className="size-3.5 text-primary" />,
    friend_request: <UserPlus className="size-3.5 text-blue-400" />,
    friend_accepted: <UserCheck className="size-3.5 text-green-400" />,
    admin_broadcast: <Bell className="size-3.5 text-amber-400" />,  // NEW
};

const notificationTypeLabels: Record<string, string> = {
    referral_completed: "Referral",
    friend_request: "Friend Request",
    friend_accepted: "Friend Accepted",
    admin_broadcast: "Announcement",  // NEW
};
```

#### 6.2 Dismiss individual notifications

The current `markRead` mutation already marks a notification as read. The `UserMenuNotifications` component in `navbar.tsx` already calls `markRead` on click. **No backend change needed.**

To add explicit dismiss (removing from the list entirely), add a `dismissNotification` mutation to `convex/notifications.ts`:

```ts
export const dismissNotification = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notification = await ctx.db.get(args.notificationId);
        if (!notification || notification.userId !== userId) {
            throw new Error("Notification not found");
        }

        await ctx.db.delete(args.notificationId);
    },
});
```

Then in `UserMenuNotifications`, add a dismiss (X) button on each notification item:

```tsx
<Button
    variant="ghost"
    size="icon"
    className="h-5 w-5 shrink-0 text-white/20 hover:text-destructive"
    onClick={(e) => {
        e.stopPropagation();
        dismissNotification({ notificationId: n._id });
    }}
>
    <X className="size-3" />
</Button>
```

#### 6.3 Update `notification-bell.tsx` (if still used)

If the standalone `notification-bell.tsx` component is still imported anywhere, add the same `admin_broadcast` type to its icon/label maps. If it's unused (currently the case), leave it as-is.

---

## Schema Changes Summary

Add to `convex/schema.ts`:

```ts
// New table:
scheduledNotifications: defineTable({ ... })  // As described in Phase 1.1

// Existing notifications table changes:
// 1. Add v.literal("admin_broadcast") to type union
// 2. Make fromUserId optional: v.optional(v.id("users"))
// 3. Add field: scheduledNotificationId: v.optional(v.id("scheduledNotifications"))

// Existing users table — add indexes if missing:
.index("by_tier", ["tier"])
.index("by_role", ["role"])
```

---

## File Change Checklist

| File | Action |
|---|---|
| `convex/schema.ts` | Add `scheduledNotifications` table; extend `notifications.type` union with `"admin_broadcast"`; make `fromUserId` optional; add `scheduledNotificationId` field; add `by_tier`/`by_role` indexes to users if missing |
| `convex/notifications.ts` | Add `dismissNotification` mutation |
| `convex/notifications/admin.ts` | **NEW** — `listCampaigns`, `getCampaign`, `createCampaign`, `updateCampaign`, `cancelCampaign`, `deleteCampaign`, `sendCampaignNow`, `getCampaignAnalytics` |
| `convex/notifications/delivery.ts` | **NEW** — `processScheduledNotifications` (internalMutation for cron), shared `deliverCampaign` helper |
| `convex/crons.ts` | Add `deliver-scheduled-notifications` minutely cron |
| `src/app/admin/layout.tsx` | Add Notifications section to sidebar |
| `src/app/admin/notifications/page.tsx` | **NEW** — Admin notifications overview + compose form |
| `src/components/layout/navbar.tsx` | Add `admin_broadcast` to `notificationTypeIcons`/`notificationTypeLabels`; add dismiss button to `UserMenuNotifications` |

---

## Key Edge Cases

1. **Large user base delivery** — If targeting "all users" and there are >5,000 users, the delivery mutation may time out. Solution: batch delivery using `ctx.scheduler.runAfter(0, internalMutation, { campaignId, offset, limit })` in chunks of 1,000.
2. **Campaign scheduled in the past** — If `scheduledAt` is in the past when the cron runs, deliver immediately. This handles the "send now" case naturally.
3. **Concurrent delivery** — The cron runs every minute. If delivery takes >60 seconds, two crons may overlap. Use the `status: "sending"` state as a lock — the cron only picks up `"scheduled"` campaigns.
4. **Notification spam** — An admin could accidentally send duplicate notifications. Add a "Duplicate campaign" action instead of re-sending. For safety, show a confirmation dialog before sending.
5. **Empty target audience** — If the filter matches 0 users, set status to "sent" with `sentCount: 0`. Don't error.
6. **Message length** — Validate `message` is non-empty and under 500 characters. The notification display area is compact.
7. **Cancelled campaigns** — If an admin cancels a scheduled campaign, the cron must skip it. The `status: "cancelled"` check handles this.
8. **readCount accuracy** — If computing on-demand, query `notifications` with `scheduledNotificationId === campaign._id` and `read === true`. For large sends, this could be slow — consider caching in the campaign record via a periodic cron.

---

## UI Reference

The admin notifications page should follow the existing admin patterns:

- **Sidebar section**: Bell icon + "NOTIFICATIONS" label (matches Oracle CMS / Journal CMS pattern)
- **Overview page**: Stats cards grid + campaign list (matches `admin/oracle/page.tsx` pattern)
- **Compose form**: Card with form fields (matches `admin/oracle/settings/page.tsx` pattern with tabs/cards)
- **Campaign status badges**: Use `Badge` component with appropriate color variants

The user-facing notification display should:
- Show `admin_broadcast` notifications with a Bell icon and "Announcement" label
- Allow dismissing individual notifications via an X button
- Allow marking as read via click (existing behavior)
