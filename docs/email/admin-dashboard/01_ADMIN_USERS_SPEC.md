# `/admin/users` — User Management Dashboard

> **Scope**: Full CRUD visibility into the `users` table with search, filtering, bulk actions, profile inspection, and manual email capabilities.  
> **Pattern Reference**: `/admin/notifications/page.tsx` (stats cards + list + dialog forms).

---

## Routes

| Route | Purpose |
|-------|---------|
| `/admin/users` | Main dashboard — user list, stats, search, filters |
| `/admin/users/[userId]` | Individual user profile deep-dive (activity, emails, journal, oracle sessions) |

---

## Page 1: `/admin/users` — User List

### Layout

Same max-width container pattern as existing admin pages (`max-w-6xl space-y-8`).

#### Header Row

```
[Users icon]  Users                [Search input] [Filter dropdowns] [Export CSV] [Refresh]
              1,247 total users
```

- **Search**: Debounced text search across `email`, `username`, and `_id`.
- **Filters** (dropdown multi-select):
  - `role`: user / admin / moderator
  - `tier`: free / popular / premium
  - `subscriptionStatus`: active / canceled / past_due / trialing / none
  - `emailStatus`: active / bounced / complained / unsubscribed / blocked
  - `engagementStatus`: new / active / dormant / churned
- **Export CSV**: Downloads current filtered view as CSV (frontend-side from loaded data; no backend export job needed for MVP).
- **Refresh**: Re-fetches the query (same `refreshKey` pattern as notifications page).

#### Stats Cards (4-column grid)

| Card | Value | Color accent |
|------|-------|-------------|
| Total Users | `users.length` from unfiltered query | White |
| Active (7d) | Count where `lastActiveAt > now - 7d` | Emerald |
| Dormant | Count where `engagementStatus === "dormant"` | Amber |
| Churned | Count where `engagementStatus === "churned"` | Red |

#### User Table

A data table (re-use `shadcn/ui Table` or the project's existing table component if any) with these columns:

| Column | Sortable | Notes |
|--------|----------|-------|
| Avatar + Username | No | 32px circle avatar, username as primary text, email below as muted text |
| Role | Yes | Badge: `user` (zinc), `admin` (galactic/primary), `moderator` (blue) |
| Tier | Yes | Badge: `free` (zinc), `popular` (amber), `premium` (galactic) |
| Subscription | Yes | Text: "Active", "Canceled", etc. |
| Email Status | Yes | Dot + text: `active` (green dot), `bounced` (red), `unsubscribed` (slate), `blocked` (red) |
| Engagement | Yes | Badge: `new` (blue), `active` (emerald), `dormant` (amber), `churned` (red) |
| Last Active | Yes | Relative time: "2 hours ago", "3 days ago", "Never" |
| Created | Yes | ISO date "2026-05-20" |
| Actions | No | View · Edit · Email · Ban |

#### Row Actions

- **View** → navigates to `/admin/users/[userId]`
- **Edit** → opens a dialog to edit `role`, `emailStatus`, `tier`, `subscriptionStatus`
- **Email** → opens a "Send Email" mini-dialog: subject + body (plain text or HTML), channel selector (transactional/marketing), preview, then send via `ctx.runAction(internal.email.sender.sendEmail, ...)`
- **Ban** → opens confirmation dialog; sets `role` to `banned` (requires schema addition, see `03_SCHEMA_CHANGES.md`)

#### Bulk Actions

Checkbox selection on rows + a floating action bar at bottom:

- **Mark as Dormant** — sets `engagementStatus = "dormant"` (bulk mutation)
- **Mark as Churned** — sets `engagementStatus = "churned"`
- **Update Email Status** — dropdown: active / bounced / unsubscribed / blocked
- **Send Email** — opens a bulk email dialog (same as single-user email but with recipient count shown)
- **Export Selected** — CSV of selected rows

#### Pagination

- Server-side cursor pagination (not offset) using Convex's `.paginate()`.
- Default page size: 25.
- Show "Load more" or numbered pagination.

---

## Page 2: `/admin/users/[userId]` — User Profile

### Layout

Two-column layout on desktop (60/40), single column on mobile.

#### Left Column — Identity & Stats

**Profile Card**:
- Large avatar (64px)
- Username (or "No username")
- Email (with copy button)
- User ID (monospace, copyable)
- Role badge (editable inline — dropdown)
- Tier badge (editable inline — dropdown)
- Subscription status (editable inline)
- Email status (editable inline — dropdown with `active`, `bounced`, `complained`, `unsubscribed`, `blocked`)
- Engagement status (editable inline — dropdown with `new`, `active`, `dormant`, `churned`)
- Birth data summary: Sun sign, location, chart computed (yes/no)
- Stardust balance
- Referral count

**Quick Actions Card**:
- [Send Email] — opens email dialog
- [View Birth Chart] — link to public chart page
- [Impersonate] — sign in as this user (future feature, stub button for now)
- [Delete Account] — red destructive button with confirmation

#### Right Column — Activity Timeline

**Timeline** (vertical list, newest first):

- **User Activity Events** (from `user_activity` table if exists, or computed from feature events):
  - Sign-up date
  - Last login
  - First oracle session
  - First journal entry
  - Tier upgrade/downgrade events (from `subscription_history`)
  - Total oracle sessions count
  - Total journal entries count
  - Total page views (from `user_activity`)

- **Email History** (from `emailDeliveries`):
  - List of all emails sent to this user
  - Status per email: sent, delivered, opened, clicked, bounced, failed
  - Subject, sent date, channel (transactional/marketing)
  - Click to view full email content (if stored — see schema discussion in `03_SCHEMA_CHANGES.md`)

- **Notification History** (from `notifications`):
  - Admin broadcasts received
  - Read/unread status

---

## Edit User Dialog

A re-usable dialog component used from both the list row actions and the profile page.

**Fields**:
- Role: select (user / admin / moderator / banned)
- Tier: select (free / popular / premium)
- Subscription Status: select (active / canceled / past_due / trialing / none)
- Email Status: select (active / bounced / complained / unsubscribed / blocked)
- Engagement Status: select (new / active / dormant / churned)
- Settings JSON (advanced): textarea with `settings` object preview/edit (for power users)

**Validation**:
- `emailStatus === "bounced"` → warn: "This user will be excluded from all marketing emails."
- `role === "banned"` → require confirmation: "This will immediately lock the user out."

---

## Send Email Dialog (Single User)

Re-usable component triggered from list or profile.

**Fields**:
- To: pre-filled with user's email (read-only)
- From: select channel → `auth@stars.guide` (transactional) or `oracle@stars.guide` (marketing)
- Subject: text input
- Body: textarea (plain text for MVP; HTML toggle for advanced)
- Template selector (optional): dropdown of existing React Email templates (`WelcomeEmail`, `ReengagementEmail`, etc.) — if selected, pre-fills subject and body
- Preview: renders the email in a small iframe or modal (use `@react-email/render` client-side if possible, or skip for MVP and just show raw HTML)

**Send Button**:
- Calls `useMutation(api.emails.admin.sendManualEmail)` or directly `ctx.runAction(internal.email.sender.sendEmail, ...)`
- On success: toast "Email sent — MessageId: xxx"
- On failure: toast error
- Records the delivery in `emailDeliveries` with `status: "sent"`, `userId`, `campaignId: null`

---

## Convex Queries Needed

See `04_BACKEND_API_SPEC.md` for exact signatures. Summary:

| Query | Purpose |
|-------|---------|
| `users.admin.list` | Paginated user list with optional filters |
| `users.admin.search` | Text search across email/username |
| `users.admin.getById` | Full user doc + computed stats |
| `users.admin.getStats` | Aggregated counts for stats cards |
| `emails.admin.getDeliveriesForUser` | Email history for a user |
| `emails.admin.getNotificationsForUser` | Notification history for a user |

---

## Convex Mutations Needed

| Mutation | Purpose |
|----------|---------|
| `users.admin.updateUser` | Update role, tier, status fields |
| `users.admin.bulkUpdateStatus` | Bulk update engagement/email status |
| `users.admin.deleteUser` | Soft-delete (set `deletedAt`) or hard delete |
| `emails.admin.sendManualEmail` | Send one-off email to a user, record delivery |

---

## Edge Cases & Guardrails

1. **Searching by email must be case-insensitive** — store/search normalized lowercase.
2. **Banned users** — if `role === "banned"`, they cannot sign in. The auth flow should check this. (This may require a Convex Auth middleware change — document as future work if out of scope.)
3. **Email to unsubscribed user** — the send dialog should warn: "This user's emailStatus is unsubscribed. They will not receive marketing emails."
4. **Pagination with filters** — if a filter is applied and the user changes pages, the filter must persist.
5. **Real-time updates** — the user list should auto-refresh if another admin makes changes (Convex reactivity handles this naturally).
