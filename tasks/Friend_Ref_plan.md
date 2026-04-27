# Referral System + Friends System — Implementation Plan

## Problem Statement

The current referral system only works for email+password sign-ups because the invite page (`/invite/[username]`) renders a `<SignUpForm>` (password-only). OAuth users (Google, X, Facebook) land on generic auth pages and have no way to apply a referral code. Additionally, there is no friends system.

## Current Architecture

| Piece | Location | Notes |
|---|---|---|
| Invite page | `src/app/invite/[username]/page.tsx` | Hardcodes `<SignUpForm>` — OAuth users can't use it |
| Referral tracker | `src/components/providers/referral-tracker.tsx` | Reads `localStorage("starsguide_referrer")` after auth, calls `referrals.recordReferral` |
| Referral mutation | `convex/referrals.ts` — `recordReferral` | Creates pending referral; completion happens in `users.ts` → `updateBirthData` |
| Schema | `convex/schema.ts` — `referrals` table | `referrerId`, `refereeId`, `status` (pending/completed), `rewardAmount` |
| Auth config | `convex/auth.ts` | Google, Apple, GitHub, Twitter, Facebook, Password providers |

---

## Design Decisions

### Separate Tables — Do NOT unify referrals and friends

Referrals and friends share surface similarities (invites, statuses) but differ in purpose and lifecycle:

| | Referrals | Friends |
|---|---|---|
| Direction | One-time, asymmetric (referrer → referee) | Symmetric bidirectional relationship |
| Trigger | New user signup via invite link | Existing users connect |
| Completion | Referee completes birth data → stardust reward | Other user accepts request |
| Reward | Yes (stardust) | No |
| Identifiers | Invite link (username-based) | username, phone, email lookup |

**Verdict:** Keep `referrals` table as-is. Add a new `friendships` table. Share a single `notifications` table for both.

---

## Implementation Tasks

### Phase 1: Fix Referrals for OAuth Users

#### 1.1 Rewrite the invite page to support all auth methods

**File:** `src/app/invite/[username]/page.tsx`

- Replace the hardcoded `<SignUpForm>` with a unified auth component that shows **all** sign-in options (Google, X, Facebook, email+password).
- Continue storing `localStorage("starsguide_referrer", username)` as before.
- The page should look like a normal sign-in/sign-up page but with the referral-themed copy.

#### 1.2 Preserve referral code through OAuth redirects

**Problem:** OAuth redirects (Google → callback → app) lose `localStorage` if the user navigates away and the callback redirects to `/` instead of back to `/invite/[username]`.

**Solution — cookie fallback:**

- In the invite page, also set a cookie: `document.cookie = "starsguide_referrer=<username>; path=/; max-age=604800; SameSite=Lax"`.
- In `ReferralTracker`, check `localStorage` first, then fall back to reading `document.cookie`.
- Clear both on successful referral recording.

#### 1.3 No changes needed to `convex/referrals.ts`

The `recordReferral` mutation already:
- Takes `referrerUsername` (no auth-method dependency)
- Checks for existing referrals
- Works with any authenticated user

The `updateBirthData` handler already completes pending referrals. This logic is correct for both email and OAuth users.

---

### Phase 2: Notifications Table (shared by referrals & friends)

#### 2.1 Add `notifications` table to schema

**File:** `convex/schema.ts`

```ts
notifications: defineTable({
    userId: v.id("users"),           // Recipient
    type: v.union(
        v.literal("referral_completed"),  // Your referral succeeded
        v.literal("friend_request"),      // Someone sent you a friend request
        v.literal("friend_accepted"),     // Your friend request was accepted
    ),
    fromUserId: v.id("users"),      // Who triggered it
    relatedId: v.optional(v.id("referrals")),    // Link to referral record
    // OR
    relatedId: v.optional(v.any()),  // Use v.any() or add a friendshipId field
    message: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
})
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"]),
```

> **Note:** If you want typed polymorphic references, use two optional fields: `referralId: v.optional(v.id("referrals"))` and `friendshipId: v.optional(v.id("friendships"))`.

#### 2.2 Create `convex/notifications.ts`

Queries and mutations:

| Function | Type | Description |
|---|---|---|
| `list` | query | Get notifications for current user, sorted by `createdAt` desc |
| `unreadCount` | query | Count of unread notifications (for badge) |
| `markRead` | mutation | Mark one notification as read |
| `markAllRead` | mutation | Mark all as read |

---

### Phase 3: Friends System

#### 3.1 Add `friendships` table to schema

**File:** `convex/schema.ts`

```ts
friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),       // The user being requested
    status: v.union(
        v.literal("pending"),          // Awaiting response
        v.literal("accepted"),         // Both are friends
        v.literal("declined"),         // Rejected
        v.literal("blocked"),          // One-way block
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_requester", ["requesterId"])
    .index("by_addressee", ["addresseeId"])
    .index("by_requester_addressee", ["requesterId", "addresseeId"]),
```

**Important:** Always store with `requesterId < addresseeId` (lexicographic) to prevent duplicates. On lookup, query both directions.

#### 3.2 Create `convex/friends.ts`

| Function | Type | Description |
|---|---|---|
| `sendRequest` | mutation | Find user by username, phone, or email. Create `friendships` doc (pending) + notification. |
| `acceptRequest` | mutation | Set status → "accepted", create notification for requester |
| `declineRequest` | mutation | Set status → "declined" |
| `removeFriend` | mutation | Delete or set status to a terminal state |
| `listFriends` | query | Return accepted friendships for current user (both directions), with user profiles |
| `listPending` | query | Return incoming pending requests for current user |
| `listSent` | query | Return outgoing pending requests for current user |
| `getFriendshipStatus` | query | Check relationship between current user and a target user |

**`sendRequest` argument:**

```ts
args: {
    identifier: v.string(),  // username, email, or phone
    identifierType: v.union(
        v.literal("username"),
        v.literal("email"),
        v.literal("phone"),
    ),
}
```

Lookup logic:
1. If `identifierType === "username"` → query `users` by `by_username` index
2. If `identifierType === "email"` → query `users` by `by_email` index
3. If `identifierType === "phone"` → scan `users` (no phone index currently — **add `by_phone` index to users table**)

**Validation in `sendRequest`:**
- Cannot send to yourself
- Cannot duplicate existing pending/accepted friendship
- Both users must exist

#### 3.3 Add `by_phone` index to users table

**File:** `convex/schema.ts`

```ts
// On the users table definition, add:
.index("by_phone", ["phone"])
```

---

### Phase 4: Hook Notifications into Referral Completion

#### 4.1 Update `updateBirthData` to create a notification

**File:** `convex/users.ts` — inside `updateBirthData` handler, after completing the referral:

```ts
if (pendingReferral) {
    // ... existing stardust + completion logic ...

    // NEW: Notify the referrer
    await ctx.db.insert("notifications", {
        userId: referrer._id,
        type: "referral_completed",
        fromUserId: userId,
        referralId: pendingReferral._id,
        message: `${user.username} joined through your invite! +${pendingReferral.rewardAmount} stardust`,
        read: false,
        createdAt: Date.now(),
    });
}
```

---

### Phase 5: Frontend

#### 5.1 Referral invite page rewrite

**File:** `src/app/invite/[username]/page.tsx`

- Replace `<SignUpForm>` with your app's standard sign-in/sign-up component that includes all OAuth buttons (Google, X, Facebook) plus email+password.
- Keep the themed copy ("@username invited you…").
- Set both `localStorage` and cookie for the referrer username.

#### 5.2 Update `ReferralTracker`

**File:** `src/components/providers/referral-tracker.tsx`

- Add cookie fallback: if `localStorage` is empty, read from `document.cookie`.
- Clear both on success/failure.

#### 5.3 Friends UI components (new)

- **Friend request sender:** Input field accepting username/email/phone + send button
- **Friends list:** Shows accepted friends with remove option
- **Pending requests list:** Shows incoming requests with accept/decline
- **Sent requests list:** Shows outgoing pending requests with cancel option
- **Notification bell:** Shows `unreadCount` badge, dropdown with notification list, mark-read actions

#### 5.4 Referral dashboard (optional but nice)

- Show user's referral link (`stars.guide/invite/<username>`)
- Show referral count, completed count, stardust earned
- Share buttons (copy link, X, etc.)

---

## Schema Changes Summary

Add to `convex/schema.ts`:

```ts
// New index on existing users table:
.index("by_phone", ["phone"])

// New tables:
notifications: defineTable({ ... })  // As described in Phase 2
friendships: defineTable({ ... })    // As described in Phase 3
```

No changes to the existing `referrals` table — it's correct as-is.

---

## File Change Checklist

| File | Action |
|---|---|
| `convex/schema.ts` | Add `by_phone` index on users, add `notifications` table, add `friendships` table |
| `convex/referrals.ts` | No changes needed |
| `convex/users.ts` | Add notification insert in `updateBirthData` (3 lines) |
| `convex/notifications.ts` | **New file** — list, unreadCount, markRead, markAllRead |
| `convex/friends.ts` | **New file** — sendRequest, acceptRequest, declineRequest, removeFriend, listFriends, listPending, listSent, getFriendshipStatus |
| `src/app/invite/[username]/page.tsx` | Rewrite to show all auth providers (OAuth + email) |
| `src/components/providers/referral-tracker.tsx` | Add cookie fallback for OAuth redirect resilience |
| `src/components/friends/*` | **New** — Friend request UI, friends list, pending list |
| `src/components/notifications/*` | **New** — Notification bell, dropdown, list |

---

## Key Edge Cases to Handle

1. **OAuth user clicks referral link → signs in with Google → redirected to `/` → `localStorage` survives if same tab.** Cookie fallback covers cross-tab/cross-redirect cases.
2. **User already logged in visits `/invite/[username]`** — `ReferralTracker` fires immediately since `isAuthenticated` is true. Works fine.
3. **Duplicate friend requests** — Query both `(requesterId, addresseeId)` and `(addresseeId, requesterId)` before creating.
4. **Referring yourself** — Already handled in `recordReferral`.
5. **Phone number format** — Normalize before querying (strip spaces, dashes, leading `+` handling).
6. **Email case sensitivity** — Normalize to lowercase before querying.
