# Implementation Checklist

> **How to use this**: Each phase builds on the previous. Do NOT skip phases. Within a phase, items can be parallelized. Mark each item `[ ]` → `[x]` as completed.

---

## Phase 0: Schema & Infrastructure (Foundation)

**Goal**: All database changes applied and tested. No frontend/backend work before this is done.

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 0.1 | Add `emailStatus`, `engagementStatus`, `lastActiveAt`, `lastLoginAt`, `deletedAt` fields to `users` table | `convex/schema.ts` | All optional |
| 0.2 | Expand `users.role` union to include `"banned"` | `convex/schema.ts` | Existing values unaffected |
| 0.3 | Add `users` indexes: `by_email_status`, `by_engagement_status`, `by_last_active` | `convex/schema.ts` | |
| 0.4 | Add expanded fields to `emailCampaigns` | `convex/schema.ts` | `htmlContent`, `reactEmailTemplate`, `campaignData`, `targetType`, `targetFilter`, `targetEmails`, delivery counts, `sentBy` |
| 0.5 | Add `emailCampaigns` indexes: `by_type`, `by_status_created` | `convex/schema.ts` | |
| 0.6 | Add expanded fields to `emailDeliveries` | `convex/schema.ts` | `subject`, `htmlPreview`, `channel`, `errorMessage`, `errorCode` |
| 0.7 | Add `emailDeliveries` indexes: `by_channel`, `by_email_status` | `convex/schema.ts` | |
| 0.8 | Add `unsubscribedAt`, `unsubscribeReason`, `disabledTypes` to `emailPreferences` | `convex/schema.ts` | |
| 0.9 | Expand `emailSegments.criteria` to include `emailStatus` and full `engagement` options | `convex/schema.ts` | |
| 0.10 | Run `npx convex dev` to push schema changes | Terminal | Verify no validation errors on existing docs |
| 0.11 | Create `convex/users/crons.ts` skeleton | `convex/users/crons.ts` | File + imports |
| 0.12 | Create `convex/users/admin.ts` skeleton | `convex/users/admin.ts` | File + imports |
| 0.13 | Create `convex/emails/admin.ts` skeleton | `convex/emails/admin.ts` | File + imports |
| 0.14 | Create `convex/users/activity.ts` skeleton | `convex/users/activity.ts` | File + imports |

**Validation**: After 0.10, open Convex dashboard and confirm no red errors on any table.

---

## Phase 1: Backend — User Management API

**Goal**: All Convex functions for `/admin/users` are working.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 1.1 | Implement `users.admin.list` query | `convex/users/admin.ts` | 0.1–0.3 |
| 1.2 | Implement `users.admin.getById` query | `convex/users/admin.ts` | 0.1–0.3 |
| 1.3 | Implement `users.admin.getStats` query | `convex/users/admin.ts` | 0.1–0.3 |
| 1.4 | Implement `users.admin.getAllActiveUsers` internalQuery | `convex/users/admin.ts` | 0.1–0.3 |
| 1.5 | Implement `users.admin.updateUser` mutation | `convex/users/admin.ts` | 0.1–0.3 |
| 1.6 | Implement `users.admin.bulkUpdateStatus` mutation | `convex/users/admin.ts` | 0.1–0.3 |
| 1.7 | Implement `users.admin.deleteUser` soft-delete mutation | `convex/users/admin.ts` | 0.1–0.3 |
| 1.8 | Implement `users.admin.patchEngagementStatus` internalMutation | `convex/users/admin.ts` | 0.1–0.3 |
| 1.9 | Implement `users.crons.computeEngagementStatus` internalAction | `convex/users/crons.ts` | 1.4, 1.8 |
| 1.10 | Register `compute-engagement-status` cron in `convex/crons.ts` | `convex/crons.ts` | 1.9 |
| 1.11 | Implement `users.activity.trackActivity` mutation | `convex/users/activity.ts` | 0.1 |
| 1.12 | Wire `trackActivity` calls into app (login + page view + oracle + journal) | Multiple | 1.11 |

**Validation**: Use Convex dashboard to run `users.admin.getStats` and `users.admin.list` — confirm they return data without errors.

---

## Phase 2: Backend — Email Management API

**Goal**: All Convex functions for `/admin/emails` are working.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 2.1 | Implement `emails.admin.listCampaigns` query | `convex/emails/admin.ts` | 0.4–0.5 |
| 2.2 | Implement `emails.admin.getCampaign` query | `convex/emails/admin.ts` | 0.4–0.5 |
| 2.3 | Implement `emails.admin.listDeliveries` query | `convex/emails/admin.ts` | 0.6–0.7 |
| 2.4 | Implement `emails.admin.getDelivery` query | `convex/emails/admin.ts` | 0.6–0.7 |
| 2.5 | Implement `emails.admin.listLeads` query | `convex/emails/admin.ts` | 0.1 |
| 2.6 | Implement `emails.admin.getStats` query | `convex/emails/admin.ts` | 0.6 |
| 2.7 | Implement `emails.admin.createCampaign` mutation | `convex/emails/admin.ts` | 0.4–0.5 |
| 2.8 | Implement `emails.admin.updateCampaign` mutation | `convex/emails/admin.ts` | 0.4–0.5 |
| 2.9 | Implement `emails.admin.sendCampaignNow` mutation | `convex/emails/admin.ts` | 0.4–0.5 |
| 2.10 | Implement `emails.admin.deliverCampaign` internalAction | `convex/emails/admin.ts` | 2.9, `convex/email/sender.ts` |
| 2.11 | Implement `emails.admin.sendManualEmail` mutation | `convex/emails/admin.ts` | 0.6 |
| 2.12 | Implement `emails.admin.deliverManualEmails` internalAction | `convex/emails/admin.ts` | 2.11, `convex/email/sender.ts` |
| 2.13 | Implement `emails.admin.testSmtp` action | `convex/emails/admin.ts` | `convex/email/sender.ts` |
| 2.14 | Implement `emails.admin.updateLeadStatus` mutation | `convex/emails/admin.ts` | 0.1 |
| 2.15 | Implement `emails.admin.bulkUpdateLeads` mutation | `convex/emails/admin.ts` | 0.1 |
| 2.16 | Implement `emails.admin.deleteLead` mutation | `convex/emails/admin.ts` | 0.1 |
| 2.17 | Implement `emails.admin.renderTemplate` internalAction | `convex/emails/admin.ts` | `emails/` templates |
| 2.18 | Create `isEligibleForEmail` helper | `convex/email/helpers.ts` (new) | 0.1, 0.8 |

**Validation**: Use Convex dashboard to test `testSmtp` — confirm both auth and oracle channels return success.

---

## Phase 3: Backend — Cron Job Updates

**Goal**: Existing email crons use new engagement logic and respect email statuses.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 3.1 | Refactor `sendReengagementEmails` to use `engagementStatus === "dormant"` | `convex/email/crons.ts` | 1.9, 2.18 |
| 3.2 | Add `emailStatus`, `emailPreferences`, and deduplication checks to re-engagement | `convex/email/crons.ts` | 0.1, 0.8, 2.18 |
| 3.3 | Fix re-engagement to record `recordDelivery` on BOTH success and failure | `convex/email/crons.ts` | 0.6 |
| 3.4 | Add `emailStatus` and `emailPreferences` checks to `sendDailyHoroscopeEmails` | `convex/email/crons.ts` | 0.1, 0.8, 2.18 |
| 3.5 | Add `emailStatus` and `emailPreferences` checks to `sendWeeklyCosmicEmails` | `convex/email/crons.ts` | 0.1, 0.8, 2.18 |
| 3.6 | Fix `sendWelcomeEmails` to record delivery on failure | `convex/email/crons.ts` | 0.6 |
| 3.7 | Update `refreshEmailSegments` to use new `engagementStatus` + `emailStatus` | `convex/email/crons.ts` | 0.1, 0.9 |
| 3.8 | Run `computeEngagementStatus` once manually from dashboard to backfill | Convex dashboard | 1.9 |

**Validation**: Trigger `sendReengagementEmails` manually from Convex dashboard — verify it only targets users with `engagementStatus === "dormant"` and `emailStatus === "active"`.

---

## Phase 4: Frontend — Admin Sidebar & Navigation

**Goal**: New nav items visible and routing works.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 4.1 | Add Users + Emails sections to `AdminSidebar` | `src/components/admin/sidebar/admin-sidebar.tsx` | — |
| 4.2 | Add Users + Emails tool cards to admin dashboard | `src/app/(admin)/admin/page.tsx` | 4.1 |
| 4.3 | Create `/admin/users/page.tsx` skeleton | `src/app/(admin)/admin/users/page.tsx` | 4.1 |
| 4.4 | Create `/admin/users/[userId]/page.tsx` skeleton | `src/app/(admin)/admin/users/[userId]/page.tsx` | 4.1 |
| 4.5 | Create `/admin/emails/page.tsx` skeleton with tabs | `src/app/(admin)/admin/emails/page.tsx` | 4.1 |
| 4.6 | Verify all routes load without errors | Browser | 4.1–4.5 |

---

## Phase 5: Frontend — User Dashboard (`/admin/users`)

**Goal**: User list page fully functional.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 5.1 | Create `StatusBadge` shared component | `src/components/admin/shared/status-badge.tsx` | — |
| 5.2 | Create `StatsCard` shared component (or verify one exists) | `src/components/admin/shared/stats-card.tsx` | — |
| 5.3 | Create `UserStats` component | `src/components/admin/users/user-stats.tsx` | 5.2, 1.3 |
| 5.4 | Create `UserFilters` component | `src/components/admin/users/user-filters.tsx` | — |
| 5.5 | Create `UserTable` component | `src/components/admin/users/user-table.tsx` | 5.1, 1.1 |
| 5.6 | Create `EditUserDialog` component | `src/components/admin/users/edit-user-dialog.tsx` | 5.1, 1.5 |
| 5.7 | Create `SendEmailDialog` component | `src/components/admin/users/send-email-dialog.tsx` | 2.11 |
| 5.8 | Create `BulkActionBar` component | `src/components/admin/users/bulk-action-bar.tsx` | 1.6 |
| 5.9 | Assemble `/admin/users/page.tsx` with all components | `src/app/(admin)/admin/users/page.tsx` | 5.1–5.8 |
| 5.10 | Add pagination logic (cursor-based) | `src/app/(admin)/admin/users/page.tsx` | 5.9 |
| 5.11 | Add URL query param sync for filters | `src/app/(admin)/admin/users/page.tsx` | 5.9 |
| 5.12 | Add CSV export | `src/app/(admin)/admin/users/page.tsx` | 5.9 |

**Validation**: Open `/admin/users`. Confirm: stats cards load, table displays users, filters work, pagination works, edit dialog saves, send email sends a real test email.

---

## Phase 6: Frontend — User Profile (`/admin/users/[userId]`)

**Goal**: Individual user profile page fully functional.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 6.1 | Create `UserProfileCard` component | `src/components/admin/users/user-profile-card.tsx` | 5.1, 1.2 |
| 6.2 | Create `QuickActions` component | `src/components/admin/users/quick-actions.tsx` | 5.7, 1.7 |
| 6.3 | Create `ActivityTimeline` component | `src/components/admin/users/activity-timeline.tsx` | 1.2 |
| 6.4 | Create `EmailHistory` component | `src/components/admin/users/email-history.tsx` | 2.3 |
| 6.5 | Create `NotificationHistory` component | `src/components/admin/users/notification-history.tsx` | 1.2 |
| 6.6 | Assemble `/admin/users/[userId]/page.tsx` | `src/app/(admin)/admin/users/[userId]/page.tsx` | 6.1–6.5 |

**Validation**: Click a user from the list → profile loads. Confirm all sections display correct data. Test "Send Email" from profile page.

---

## Phase 7: Frontend — Email Dashboard (`/admin/emails`)

**Goal**: All email tabs functional.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 7.1 | Create `EmailOverview` component | `src/components/admin/emails/email-overview.tsx` | 2.6, 2.1 |
| 7.2 | Create `SmtpHealth` component | `src/components/admin/emails/smtp-health.tsx` | 2.13 |
| 7.3 | Create `CampaignList` component | `src/components/admin/emails/campaign-list.tsx` | 5.1, 2.1 |
| 7.4 | Create `CampaignForm` component | `src/components/admin/emails/campaign-form.tsx` | 2.7, 2.8, 2.9, 2.17 |
| 7.5 | Create `DeliveryLog` component | `src/components/admin/emails/delivery-log.tsx` | 2.3 |
| 7.6 | Create `DeliveryDetail` drawer/modal | `src/components/admin/emails/delivery-detail.tsx` | 2.4 |
| 7.7 | Create `LeadTable` component | `src/components/admin/emails/lead-table.tsx` | 2.5, 2.14 |
| 7.8 | Create `TemplateGallery` component | `src/components/admin/emails/template-gallery.tsx` | 2.17 |
| 7.9 | Assemble `/admin/emails/page.tsx` with all tabs | `src/app/(admin)/admin/emails/page.tsx` | 7.1–7.8 |
| 7.10 | Add template preview modal (iframe with rendered HTML) | `src/components/admin/emails/template-gallery.tsx` | 2.17 |
| 7.11 | Add test-send flow for templates | `src/components/admin/emails/template-gallery.tsx` | 2.12 |

**Validation**: Open `/admin/emails`. Confirm: overview stats load, SMTP test works, campaigns list shows, creating a campaign works, delivery log shows records, templates preview renders correctly.

---

## Phase 8: Integration & Polish

**Goal**: Everything works together. Edge cases handled.

| # | Task | File(s) | Depends On |
|---|------|---------|------------|
| 8.1 | Add `trackActivity` call on login | `convex/auth.ts` or frontend sign-in | 1.11 |
| 8.2 | Add `trackActivity` call on page navigation | `src/app/(shell)/layout.tsx` or similar | 1.11 |
| 8.3 | Add `trackActivity` call on new oracle message | `convex/oracle/...` | 1.11 |
| 8.4 | Add `trackActivity` call on journal entry creation | `convex/journal/...` | 1.11 |
| 8.5 | Ensure `emailStatus` is checked in ALL email sending paths | Audit all `convex/email/` files | 2.18 |
| 8.6 | Add toast notifications for all admin actions | Various pages | — |
| 8.7 | Add loading states (skeletons) for all tables | Various components | — |
| 8.8 | Add empty states for all lists | Various components | — |
| 8.9 | Test full flow: create campaign → send now → verify delivery log | Manual test | 7.9 |
| 8.10 | Test full flow: edit user → ban → verify they disappear from lists | Manual test | 5.6 |
| 8.11 | Test full flow: send manual email from user profile → verify inbox | Manual test | 5.7 |
| 8.12 | Run `pnpm lint` and fix all errors | Terminal | All above |
| 8.13 | Run `pnpm build` and fix all errors | Terminal | All above |

---

## Phase 9: Documentation & Handoff

**Goal**: Another developer can maintain this.

| # | Task | File(s) |
|---|------|---------|
| 9.1 | Update `docs/email/TRANSACTIONAL_EMAIL.md` with admin dashboard info | `docs/email/TRANSACTIONAL_EMAIL.md` |
| 9.2 | Update `docs/email/MIGRATION_SUMMARY.md` with this change set | `docs/email/MIGRATION_SUMMARY.md` |
| 9.3 | Add inline JSDoc to all new Convex functions | `convex/users/admin.ts`, `convex/emails/admin.ts`, etc. |
| 9.4 | Update AGENTS.md with new admin routes | `/AGENTS.md` |
| 9.5 | Delete this checklist's placeholder items and mark final | This file |

---

## Estimated Effort

| Phase | Tasks | Est. Hours | Can Parallelize? |
|-------|-------|-----------|------------------|
| 0 | 15 | 2 | No |
| 1 | 12 | 4 | Partial |
| 2 | 18 | 6 | Partial |
| 3 | 8 | 3 | No (depends on 1+2) |
| 4 | 6 | 1 | No |
| 5 | 12 | 5 | Yes (with 6) |
| 6 | 6 | 3 | Yes (with 5) |
| 7 | 11 | 6 | Yes (with 5+6) |
| 8 | 13 | 4 | No |
| 9 | 5 | 1 | No |
| **Total** | **106** | **~35** | — |

**Delegation Strategy**:
- **Agent A**: Phases 0–3 (backend + schema + crons)
- **Agent B**: Phases 4–7 (frontend + pages + components) — can start after Phase 1 is complete
- **Agent C**: Phase 8 (integration, testing, polish) — after A & B are done

Or a single agent can do the full stack sequentially.
