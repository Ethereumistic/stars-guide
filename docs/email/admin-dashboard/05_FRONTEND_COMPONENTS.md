# Frontend Component Architecture

> **Scope**: All React components, pages, and hooks for `/admin/users` and `/admin/emails`.  
> **Pattern Reference**: `src/app/(admin)/admin/notifications/page.tsx` — stats cards, dialog forms, data tables, badge systems, toast feedback.

---

## File Map

| File | Type | Description |
|------|------|-------------|
| `src/app/(admin)/admin/users/page.tsx` | Page | User list dashboard |
| `src/app/(admin)/admin/users/[userId]/page.tsx` | Page | Individual user profile |
| `src/app/(admin)/admin/emails/page.tsx` | Page | Email operations (tabbed) |
| `src/components/admin/sidebar/admin-sidebar.tsx` | Modify | Add Users + Emails nav sections |
| `src/components/admin/users/user-table.tsx` | Component | Re-usable user data table |
| `src/components/admin/users/user-stats.tsx` | Component | Stats cards for users page |
| `src/components/admin/users/user-filters.tsx` | Component | Filter bar (search + dropdowns) |
| `src/components/admin/users/edit-user-dialog.tsx` | Component | Edit user fields dialog |
| `src/components/admin/users/send-email-dialog.tsx` | Component | Send one-off email dialog |
| `src/components/admin/users/user-profile-card.tsx` | Component | Profile info card |
| `src/components/admin/users/activity-timeline.tsx` | Component | Activity + email history timeline |
| `src/components/admin/emails/campaign-list.tsx` | Component | Email campaign list |
| `src/components/admin/emails/campaign-form.tsx` | Component | Create/edit campaign dialog |
| `src/components/admin/emails/delivery-log.tsx` | Component | Delivery log table |
| `src/components/admin/emails/delivery-detail.tsx` | Component | Delivery detail modal |
| `src/components/admin/emails/smtp-health.tsx` | Component | SMTP health monitor card |
| `src/components/admin/emails/template-gallery.tsx` | Component | Template grid + preview |
| `src/components/admin/emails/lead-table.tsx` | Component | Email leads table |
| `src/components/admin/shared/data-table.tsx` | Component | Generic data table wrapper (if none exists) |
| `src/components/admin/shared/stats-card.tsx` | Component | Generic stats card (if none exists) |
| `src/components/admin/shared/status-badge.tsx` | Component | Generic status badge system |
| `src/hooks/use-admin-users.ts` | Hook | Convex queries for user management |
| `src/hooks/use-admin-emails.ts` | Hook | Convex queries for email management |

---

## 1. Admin Sidebar Update

Modify `src/components/admin/sidebar/admin-sidebar.tsx` to add two new nav sections.

### Add after `notificationNavItems` (in the Global group):

```typescript
const usersNavItems = [
    { title: "Users", href: "/admin/users", icon: Users }, // import Users from "lucide-react"
];

const emailsNavItems = [
    { title: "Emails", href: "/admin/emails", icon: Mail }, // import Mail from "lucide-react"
];
```

### Add to JSX inside the "Global" `SidebarGroup`:

```tsx
{/* Users */}
<NavSection
    title="Users"
    icon={<Users className="h-4 w-4 text-galactic shrink-0" />}
    items={usersNavItems}
    defaultOpen={false}
    isItemActive={(item) => pathname === item.href}
/>

{/* Emails */}
<NavSection
    title="Emails"
    icon={<Mail className="h-4 w-4 text-galactic shrink-0" />}
    items={emailsNavItems}
    defaultOpen={false}
    isItemActive={(item) => pathname === item.href}
/>
```

### Update `src/app/(admin)/admin/page.tsx`

Add two new tool cards to the `tools` array:

```typescript
{
    section: "Operations",
    icon: <Users className="h-5 w-5 text-galactic" />,
    items: [
        {
            href: "/admin/users",
            icon: Users,
            title: "User Management",
            copy: "Browse, search, filter, and manage all registered users. Send emails, view activity, edit statuses.",
        },
    ],
},
{
    section: "Operations",
    icon: <Mail className="h-5 w-5 text-galactic" />,
    items: [
        {
            href: "/admin/emails",
            icon: Mail,
            title: "Email Operations",
            copy: "Campaigns, delivery tracking, SMTP health, templates, leads, and manual email sends.",
        },
    ],
},
```

---

## 2. Reusable Sub-Components

### `StatusBadge`

A unified badge component for all status types across both dashboards.

```typescript
// src/components/admin/shared/status-badge.tsx
interface StatusBadgeProps {
    status: string;
    variant?: "role" | "tier" | "subscription" | "email" | "engagement" | "delivery" | "campaign" | "lead";
}

// Maps each variant+status to a color config:
// role: user=zinc, admin=primary, moderator=blue, banned=red
// tier: free=zinc, popular=amber, premium=galactic
// email: active=emerald, bounced=red, complained=red, unsubscribed=slate, blocked=red
// engagement: new=blue, active=emerald, dormant=amber, churned=red
// delivery: sent=blue, delivered=emerald, opened=amber, clicked=galactic, bounced=red, failed=red
// campaign: draft=zinc, scheduled=amber, active=emerald, paused=amber, completed=emerald, sending=blue
// lead: pending=amber, active=emerald, unsubscribed=slate, bounced=red
```

### `StatsCard`

```typescript
// src/components/admin/shared/stats-card.tsx
interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: "default" | "emerald" | "amber" | "red" | "galactic";
    icon?: React.ReactNode;
}
```

Re-use the exact same card markup as `/admin/notifications/page.tsx`.

### `DataTable`

If the project does not already have a generic data table component, create a lightweight one:

```typescript
// src/components/admin/shared/data-table.tsx
interface DataTableProps<T> {
    columns: { key: string; header: string; sortable?: boolean; width?: string; render?: (row: T) => React.ReactNode }[];
    rows: T[];
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
    selectable?: boolean;
    selectedRows?: Set<string>;
    onSelectRow?: (id: string, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    emptyState?: React.ReactNode;
}
```

For MVP, use the shadcn/ui `Table` primitive directly in each page instead of a generic wrapper. Add the generic wrapper only if repetition becomes painful.

---

## 3. `/admin/users` Page Components

### `UserFilters`

A horizontal bar with:
- Search input (left, 300px wide)
- Filter dropdowns: Role, Tier, Subscription, Email Status, Engagement Status
- "Clear Filters" button
- "Export CSV" button
- Result count: "Showing 25 of 1,247"

**State management**: All filter state in the page component URL query params (`useSearchParams`) so filters survive refresh.

### `UserTable`

Uses shadcn `Table` with:
- Checkbox column (for bulk select)
- Avatar + name/email column
- Role badge
- Tier badge
- Subscription text
- Email status dot + text
- Engagement badge
- Last active relative time
- Created date
- Actions: 3-dot menu with View, Edit, Email, Ban

**Pagination**: "Load More" button at bottom (cursor-based) or numbered pages.

### `EditUserDialog`

Dialog content:
- Role dropdown
- Tier dropdown
- Subscription status dropdown
- Email status dropdown
- Engagement status dropdown
- Warning text for `banned` role or `bounced` email status
- Save / Cancel buttons

### `SendEmailDialog`

Dialog content:
- To: read-only email display
- From channel: `transactional` / `marketing` toggle
- Subject input
- Body textarea (plain text for MVP)
- Template selector: dropdown of React Email templates
- If template selected: subject auto-fills, body becomes read-only preview notice
- [Preview] button → opens sub-dialog with rendered HTML
- [Send] button → calls `api.emails.admin.sendManualEmail`
- Toast on success/failure

### `BulkActionBar`

Floating bar at bottom of screen when rows are selected:
```
[3 selected]  [Mark Dormant] [Mark Churned] [Update Email Status ▼] [Send Email] [Export] [Clear]
```

---

## 4. `/admin/users/[userId]` Page Components

### Layout: Two-column grid

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
        <UserProfileCard />
        <QuickActions />
    </div>
    <div className="space-y-6">
        <ActivityTimeline />
        <EmailHistory />
        <NotificationHistory />
    </div>
</div>
```

### `UserProfileCard`

- Avatar (64px)
- Username + email (with copy buttons)
- User ID (monospace, copyable)
- Inline editable fields: role, tier, subscription status, email status, engagement status
- Birth data summary: Sun sign, location, chart status
- Stardust + referral count
- All badges use `StatusBadge` component

### `QuickActions`

- [Send Email] → opens `SendEmailDialog`
- [View Birth Chart] → Link to `https://stars.guide/[username]`
- [Delete Account] → destructive red button with confirmation dialog

### `ActivityTimeline`

Vertical timeline with left border line:
- Sign-up event
- Last login
- First oracle session
- First journal entry
- Tier changes (from `subscription_history`)
- Recent activity events

Each item: icon + label + relative time.

### `EmailHistory`

Mini table (last 20 deliveries):
- Subject
- Status badge
- Channel badge
- Sent date
- Click → opens `DeliveryDetail` modal (reused from email dashboard)

### `NotificationHistory`

Mini list (last 20 notifications):
- Message text (truncated)
- Read/unread badge
- Created date

---

## 5. `/admin/emails` Page Components

### Tabbed Layout

```tsx
<Tabs defaultValue="overview">
    <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
    </TabsList>

    <TabsContent value="overview"><EmailOverview /></TabsContent>
    <TabsContent value="campaigns"><CampaignManager /></TabsContent>
    <TabsContent value="deliveries"><DeliveryManager /></TabsContent>
    <TabsContent value="leads"><LeadManager /></TabsContent>
    <TabsContent value="templates"><TemplateGallery /></TabsContent>
</Tabs>
```

### `EmailOverview`

- 4 stats cards (total deliveries, sent 24h, bounced 24h, open rate 7d)
- `SmtpHealth` card
- Recent campaigns mini-list (last 5)
- Recent failures mini-list (last 5 bounced/failed in 24h)

### `SmtpHealth`

```tsx
<Card>
    <CardHeader>
        <CardTitle className="text-sm">SMTP Health</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
        {/* auth@stars.guide */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", health.auth ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-sm">auth@stars.guide</span>
            </div>
            <span className="text-xs text-muted-foreground">{health.auth ? "Connected" : "Failed"}</span>
        </div>
        {/* oracle@stars.guide */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", health.oracle ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-sm">oracle@stars.guide</span>
            </div>
            <span className="text-xs text-muted-foreground">{health.oracle ? "Connected" : "Failed"}</span>
        </div>
        <Button onClick={testSmtp} disabled={testing}>
            {testing ? <Loader2 className="animate-spin" /> : "Test Both"}
        </Button>
        {health.errors.length > 0 && (
            <div className="text-xs text-red-400">{health.errors.join("; ")}</div>
        )}
    </CardContent>
</Card>
```

**State**: `useMutation(api.emails.admin.testSmtp)` triggered on button click. Results displayed inline.

### `CampaignManager`

- Header with [New Campaign] button
- Campaign list (same pattern as notification campaigns)
- Create/Edit dialog: `CampaignForm`

### `CampaignForm`

Fields:
1. Campaign name
2. Type select
3. Subject
4. Template selector (React Email template names + "Custom HTML")
5. If custom HTML: textarea for raw HTML
6. If template selected: [Preview] button
7. Target audience section:
   - Radio group: All users / By tier / By engagement / By email status / By segment / Specific emails
   - Conditional sub-input based on selection
8. Schedule: Send now / Schedule (date+time)
9. From channel: transactional / marketing
10. Actions: Save Draft / Schedule / Send Now

### `DeliveryManager`

- Filter bar: Status multi-select, Channel select, Date range, Search by email, Campaign select
- Delivery table with columns from spec
- Pagination
- Click row → `DeliveryDetail` drawer

### `DeliveryDetail`

Side drawer (not modal) for better UX:
- Recipient info + user link
- Full status timeline with timestamps
- Message ID (copyable)
- Email HTML preview in 600px iframe
- Campaign info
- SMTP error details (if failed)

### `LeadManager`

- Filter bar: Status, Source, Search
- Lead table
- Bulk actions
- Edit status dialog

### `TemplateGallery`

Grid of template cards:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {templates.map((t) => (
        <Card key={t.name}>
            <CardHeader>
                <CardTitle className="text-sm">{t.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="aspect-[4/3] rounded border bg-white/5" /> {/* Placeholder for thumbnail */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => preview(t)}>Preview</Button>
                    <Button variant="outline" size="sm" onClick={() => testSend(t)}>Test Send</Button>
                </div>
            </CardContent>
        </Card>
    ))}
</div>
```

**Template Preview Modal**:
- Problem: `@react-email/render` requires Node.js and React DOM server
- Solution: Create a Convex action `emails.admin.renderTemplate` that takes `{ templateName, props }` and returns `{ html: string }`
- The frontend calls this action, then renders the returned HTML in an iframe

```typescript
// Convex action stub:
export const renderTemplate = internalAction({
    args: {
        templateName: v.string(),
        props: v.optional(v.string()), // JSON string
    },
    handler: async (_ctx, args) => {
        // Dynamically import the template from emails/ directory
        // Render with @react-email/render
        // Return HTML string
    },
});
```

---

## 6. Convex React Hooks

### `useAdminUsers`

```typescript
export function useAdminUsers(filters: UserFilters) {
    const [paginationOpts, setPaginationOpts] = useState({ cursor: "", numItems: 25 });
    const users = useQuery(api.users.admin.list, { ...filters, paginationOpts });
    const stats = useQuery(api.users.admin.getStats);
    return { users, stats, paginationOpts, setPaginationOpts };
}
```

### `useAdminEmails`

```typescript
export function useAdminEmails() {
    const campaigns = useQuery(api.emails.admin.listCampaigns, {});
    const stats = useQuery(api.emails.admin.getStats);
    const testSmtp = useMutation(api.emails.admin.testSmtp);
    return { campaigns, stats, testSmtp };
}
```

---

## 7. Styling Conventions

All admin pages follow the existing dark-theme conventions:
- Cards: `border-border/50 bg-card/50 backdrop-blur-sm`
- Inputs: `bg-white/5 border-white/10`
- Badges: colored with 15% background opacity + 30% border opacity
- Fonts: `font-serif` for headings, `font-mono` for metadata/labels
- Spacing: `space-y-8` between sections, `gap-4` in grids
- Max width: `max-w-6xl`

Do NOT create new color tokens. Use the existing Tailwind setup (`text-galactic`, `bg-card`, etc.).
