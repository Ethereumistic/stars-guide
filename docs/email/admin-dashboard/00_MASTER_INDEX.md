# Admin Dashboard: Users & Emails — Master Spec Index

> **Status**: Planning — Ready for implementation delegation  
> **Scope**: Two new admin sections (`/admin/users` + `/admin/emails`) giving full operational control over the user base and email infrastructure.  
> **Dependency**: Builds on the existing MailCow SMTP pipeline (`convex/email/`) and the admin shell (`src/app/(admin)/admin/`).

---

## Problem Statement

Today the app has **zero visibility** into the user base from an admin perspective:

- No user list, search, or filtering in `/admin`
- No way to see who is "dormant" — the current re-engagement cron blindly fires at anyone with `_creationTime > 7 days ago`, which is a useless proxy for actual engagement
- No way to manually send a transactional email (password reset, custom notice) to a specific user
- No way to see email delivery history per user
- No way to manage opt-outs, bounces, or email reputation
- No way to create ad-hoc email campaigns beyond the hardcoded cron jobs
- The `emailDeliveries` table tracks per-email status but there is no admin UI to query it

This spec solves all of the above.

---

## Document Map

| File | Purpose | Estimated Complexity |
|------|---------|---------------------|
| `00_MASTER_INDEX.md` | This file. Roadmap, glossary, cross-references. | — |
| `01_ADMIN_USERS_SPEC.md` | `/admin/users` — user management dashboard: list, search, filter, view profile, edit role/status, bulk actions, activity timeline. | High |
| `02_ADMIN_EMAILS_SPEC.md` | `/admin/emails` — email operations dashboard: campaigns, deliveries, templates, SMTP health, manual send, analytics. | High |
| `03_SCHEMA_CHANGES.md` | All required `convex/schema.ts` additions and modifications. | Medium |
| `04_BACKEND_API_SPEC.md` | All new Convex queries, mutations, and actions with exact signatures. | High |
| `05_FRONTEND_COMPONENTS.md` | React component architecture, page layouts, re-usable sub-components, data table patterns. | Medium |
| `06_CRON_AND_AUTOMATION.md` | Updated cron jobs: proper dormancy detection, welcome series fixes, re-engagement v2. | Medium |
| `07_IMPLEMENTATION_CHECKLIST.md` | Phase-by-phase implementation order with file checklist. | — |

---

## Glossary

| Term | Definition |
|------|------------|
| **Dormant user** | A user whose `lastActiveAt` is > 14 days old AND has `engagementStatus === "dormant"`. Computed by cron, not guessed from `_creationTime`. |
| **Churned user** | A user whose `lastActiveAt` is > 60 days old. Excluded from all marketing emails. |
| **Email status** | Per-user email deliverability state: `active`, `bounced`, `complained`, `unsubscribed`, `blocked`. |
| **Engagement status** | Per-user product-activity state: `new` (0–7d), `active` (engaged recently), `dormant` (14–60d inactive), `churned` (>60d inactive). |
| **Transactional email** | One-to-one email sent on user action or admin request (verify, reset, custom admin notice). Channel = `transactional`. |
| **Marketing email** | Bulk or automated email (horoscope, re-engagement, weekly cosmic). Channel = `marketing`. |
| **Campaign** | An admin-composed email blast with targeting, scheduling, and delivery tracking. |
| **Delivery** | A single record in `emailDeliveries` representing one send attempt to one recipient. |
| **Lead** | A non-registered subscriber captured via widgets (`emailLeads` table). Distinct from registered `users`. |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN DASHBOARD                                  │
├─────────────────────────────┬─────────────────────────────────────────────────┤
│      /admin/users           │            /admin/emails                      │
├─────────────────────────────┼─────────────────────────────────────────────────┤
│  • User list (paginated)    │  • Campaign list (draft/scheduled/sent)         │
│  • Search by email/username │  • Compose campaign ( targeting + schedule )  │
│  • Filter by tier/role/status│  • Delivery log (per-campaign + per-user)       │
│  • View user profile card   │  • SMTP health monitor (auth + oracle)         │
│  • Edit role / emailStatus  │  • Manual one-off send to single user          │
│  • Bulk actions (ban,       │  • Template preview (React Email components)    │
│    mark dormant, etc.)     │  • Email analytics (open/click/bounce rates)    │
│  • Activity timeline        │  • Lead subscriber management                   │
│  • Send email to user       │  • Unsubscribe / bounce management              │
└─────────────────────────────┴─────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONVEX BACKEND                                       │
│  ── queries ──►  users.admin.*  │  emails.admin.*  │  emails.sender.*      │
│  ── mutations ►  users.admin.*  │  emails.admin.*  │  emails.crons.*        │
│  ── actions ──►  emails.sender.sendEmail  │  emails.admin.testSmtp          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Principles

1. **Admin pages are admin-only** — reuse the existing `role !== "admin"` guard in `layout.tsx`.
2. **No breaking changes** to existing email cron jobs until Phase 3 (automation v2).
3. **Re-use existing patterns** — stats cards, dialog forms, data tables, sidebar nav groups all follow the existing admin UI conventions (see `/admin/notifications/page.tsx` as the canonical reference).
4. **Schema first** — all DB changes in `03_SCHEMA_CHANGES.md` must be applied before any frontend/backend work.
5. **Test emails are real** — the "Send Test" buttons in `/admin/emails` call the actual `sendEmail` action to `badjarovv@gmail.com` (or admin's own email), not a mock.

---

## Cross-References

- Existing admin shell: `src/app/(admin)/admin/layout.tsx`
- Existing admin sidebar: `src/components/admin/sidebar/admin-sidebar.tsx`
- Existing notification admin page (pattern reference): `src/app/(admin)/admin/notifications/page.tsx`
- Email sender action: `convex/email/sender.ts`
- Email cron orchestrators: `convex/email/crons.ts`
- Email SMTP lib: `convex/email/lib.ts`
- Transactional email docs: `docs/email/TRANSACTIONAL_EMAIL.md`
- Schema file: `convex/schema.ts`
