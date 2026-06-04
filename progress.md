## Progress: Admin Dashboard Implementation

### Phase 0: Schema & Infrastructure
- [x] Schema changes applied (users: emailStatus, engagementStatus, lastActiveAt, lastLoginAt, deletedAt, banned role, indexes)
- [x] Schema changes applied (emailCampaigns: expanded status, htmlContent, reactEmailTemplate, campaignData, targetType, targetFilter, targetEmails, delivery counts, sentBy, indexes)
- [x] Schema changes applied (emailDeliveries: subject, htmlPreview, channel, errorMessage, errorCode, indexes)
- [x] Schema changes applied (emailPreferences: unsubscribedAt, unsubscribeReason, disabledTypes)
- [x] Schema changes applied (emailSegments: expanded criteria with emailStatus + full engagement)

### Phase 1: Backend — User Management API
- [x] convex/users/admin.ts — list, getById, getStats, updateUser, bulkUpdateStatus, deleteUser, patchEngagementStatus
- [x] convex/users/crons.ts — computeEngagementStatus
- [x] convex/users/activity.ts — trackActivity
- [x] compute-engagement-status cron registered in convex/crons.ts

### Phase 2: Backend — Email Management API
- [x] convex/emails/admin.ts — All queries, mutations, actions (listCampaigns, getCampaign, listDeliveries, getDelivery, listLeads, getStats, createCampaign, updateCampaign, deleteCampaign, sendCampaignNow, pauseCampaign, resumeCampaign, sendManualEmail, updateLeadStatus, bulkUpdateLeads, deleteLead, testSmtp, deliverCampaign, deliverManualEmails, finalizeCampaign)

### Phase 3: Backend — Cron Job Updates
- [x] sendReengagementEmails v2 — uses engagementStatus, emailStatus, emailPreferences, deduplication
- [x] sendDailyHoroscopeEmails v2 — respects emailStatus, engagementStatus, emailPreferences
- [x] sendWeeklyCosmicEmails v2 — respects emailStatus, engagementStatus, emailPreferences, records delivery
- [x] sendWelcomeEmails — records failed delivery
- [x] refreshEmailSegments v2 — uses engagementStatus + emailStatus
- [x] Added getRecentDeliveryForUser, getEmailPrefsForUser internal queries

### Phase 4: Frontend — Admin Sidebar & Navigation
- [x] Admin sidebar updated with Users + Emails nav sections
- [x] Admin dashboard page updated with Users + Emails tool cards

### Phase 5: Frontend — User Dashboard
- [x] /admin/users page — full user list with stats, filters, table, edit/send email dialogs, bulk actions, CSV export

### Phase 6: Frontend — User Profile
- [ ] /admin/users/[userId] page — individual user profile

### Phase 7: Frontend — Email Dashboard
- [x] /admin/emails page — full tabbed interface with:
  - [x] Overview tab: stats cards, SMTP health monitor, recent campaigns, recent failures
  - [x] Campaigns tab: campaign list, create/edit dialog with targeting & scheduling, send/pause/resume/delete
  - [x] Deliveries tab: filter bar, table with status/channel, detail dialog with copyable messageId
  - [x] Leads tab: filters, table with bulk select, bulk status update, delete
  - [x] Templates tab: 5 template cards, test send dialog

### Shared Components
- [x] StatusBadge component with all variant color maps (role, tier, subscription, email, engagement, delivery, campaign, lead)
- [x] StatsCard component with accent colors

### Remaining
- [ ] /admin/users/[userId] page (Phase 6)
- [ ] Integration & polish (Phase 8)