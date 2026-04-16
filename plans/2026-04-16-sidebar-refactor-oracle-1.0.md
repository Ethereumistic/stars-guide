# Oracle Sidebar Refactor

## Objective

Decompose the monolithic 442-line `src/app/oracle/layout.tsx` into well-scoped, composable components following shadcn/ui and Tailwind best practices. Fix the "Past Whispers" section's known issues (clunky UX, fragile active-session detection, browser `prompt`/`confirm` dialogs). Establish a component architecture that is maintainable, testable, and extensible for upcoming features (journal, group chat, temporary chat).

---

## Current State Analysis

### Problem: Monolithic Layout Component

`src/app/oracle/layout.tsx:106-442` is a single `OracleLayout` function containing ~336 lines of JSX that handles:

1. Auth check and redirect (`layout.tsx:130-133`)
2. Tier/label computation (`layout.tsx:135-138`)
3. Convex queries for sessions (`layout.tsx:115`)
4. Convex mutations for session CRUD (`layout.tsx:116-118`)
5. Entire sidebar header with collapse trigger (`layout.tsx:147-163`)
6. Action button menu — New chat, Search, Journal (`layout.tsx:166-196`)
7. **Entire "Past Whispers" session list** with loading/empty/populated states + dropdown menus (`layout.tsx:198-298`)
8. User profile footer dropdown (`layout.tsx:302-372`)
9. Decorative background orbs (`layout.tsx:376-377`)
10. Top toolbar with CTA and icon buttons (`layout.tsx:379-423`)
11. Search modal integration (`layout.tsx:430-439`)

### Problem: "Past Whispers" Specific Issues

| Issue | Location | Severity |
|---|---|---|
| Fragile active-session detection via `pathname?.includes(session._id)` | `layout.tsx:219` | **High** — substring match can produce false positives if one session ID is a prefix of another |
| No time-grouped sections (Today/Yesterday/Earlier) despite the search modal having this grouping | `layout.tsx:198-298` | **Medium** — the list is a flat chronological list with no visual grouping, making it hard to scan |
| `window.prompt()` for rename | `layout.tsx:257` | **Medium** — blocks main thread, unstyled, jarring UX |
| `window.confirm()` for delete | `layout.tsx:277` | **Medium** — same as above |
| No relative timestamp display on session items | `layout.tsx:218-291` | **Low** — `formatRelativeTime` exists at `layout.tsx:64-76` but is never used on the session list items |
| Entire section hidden when sidebar is collapsed (`group-data-[collapsible=icon]:hidden`) with no icon-only fallback | `layout.tsx:198` | **Low** — acceptable for now, but a tooltip-only session indicator could be a future enhancement |
| `ScrollArea` height is hardcoded via `h-[calc(100%-60px)]` | `layout.tsx:204` | **Low** — fragile, breaks if label height changes |

### Problem: Data Hooks Mixed Directly in Layout

All Convex hooks (`useQuery`, `useMutation`) are called at `layout.tsx:115-118` inside the layout component itself, making them impossible to test independently and tightly coupling the layout to backend concerns.

---

## Target Component Architecture

```
src/app/oracle/layout.tsx  (orchestrator only — thin shell)
  └─ OracleSidebar
       ├─ OracleSidebarHeader          (logo + collapse trigger)
       ├─ OracleSidebarActions         (New chat, Search, Journal buttons)
       ├─ PastWhispersSection          (the main refactor target)
       │    ├─ PastWhispersGroup       (group label + scroll container)
       │    │    ├─ SessionListItem    (single session row + dropdown)
       │    │    └─ SessionListEmpty   (empty state)
       │    └─ DeleteSessionDialog     (AlertDialog for delete confirmation)
       ├─ OracleSidebarFooter          (user avatar + dropdown)
       └─ OracleSidebarInset          (top bar + content area + children)
```

### New File Locations

All new sidebar components live under `src/components/oracle/sidebar/` — this keeps them co-located with the oracle feature but decoupled from the route layout file:

| Component | File |
|---|---|
| `OracleSidebar` | `src/components/oracle/sidebar/oracle-sidebar.tsx` |
| `OracleSidebarHeader` | `src/components/oracle/sidebar/oracle-sidebar-header.tsx` |
| `OracleSidebarActions` | `src/components/oracle/sidebar/oracle-sidebar-actions.tsx` |
| `PastWhispersSection` | `src/components/oracle/sidebar/past-whispers-section.tsx` |
| `SessionListItem` | `src/components/oracle/sidebar/session-list-item.tsx` |
| `SessionListEmpty` | `src/components/oracle/sidebar/session-list-empty.tsx` |
| `DeleteSessionDialog` | `src/components/oracle/sidebar/delete-session-dialog.tsx` |
| `RenameSessionDialog` | `src/components/oracle/sidebar/rename-session-dialog.tsx` |
| `OracleSidebarFooter` | `src/components/oracle/sidebar/oracle-sidebar-footer.tsx` |
| `OracleTopBar` | `src/components/oracle/sidebar/oracle-top-bar.tsx` |
| `useOracleSessions` | `src/components/oracle/sidebar/use-oracle-sessions.ts` (custom hook) |
| `formatRelativeTime` | `src/components/oracle/sidebar/utils.ts` (shared utilities) |
| `collapsedOracleToggle` | `src/components/oracle/sidebar/collapsed-oracle-toggle.tsx` |

---

## Implementation Plan

### Phase 1: Extract Utilities and Custom Hook

- [ ] **1.1** Create `src/components/oracle/sidebar/utils.ts` — Move `formatRelativeTime` (`layout.tsx:64-76`) and `tierLabels` (`layout.tsx:78-82`) into this shared utility file. Rationale: These are pure functions/constants with no React dependency; extracting them first is zero-risk and reduces layout file size.

- [ ] **1.2** Create `src/components/oracle/sidebar/use-oracle-sessions.ts` — Extract a custom hook that encapsulates all Convex session queries and mutations:
  - `useQuery(api.oracle.sessions.getUserSessions)` (currently `layout.tsx:115`)
  - `useMutation(api.oracle.sessions.deleteSession)` (currently `layout.tsx:116`)
  - `useMutation(api.oracle.sessions.renameSession)` (currently `layout.tsx:117`)
  - `useMutation(api.oracle.sessions.toggleStarSession)` (currently `layout.tsx:118`)
  - Helper handlers: `handleDelete(sessionId, isActive)`, `handleRename(sessionId, currentTitle)`, `handleToggleStar(sessionId)`
  - Return `{ sessions, deleteSession, renameSession, toggleStarSession, handleDelete, handleRename, handleToggleStar }`
  - **The `handleDelete` handler will temporarily use `window.confirm` as a stopgap; Phase 2 replaces it with a proper dialog.**
  - **The `handleRename` handler will temporarily use `window.prompt` as a stopgap; Phase 2 replaces it with a proper dialog.**
  - Rationale: Decoupling data fetching from rendering makes each piece independently testable and allows the hook to be reused by both the sidebar and the search modal.

### Phase 2: Extract Dialog Components (Replace Browser APIs)

- [ ] **2.1** Create `src/components/oracle/sidebar/delete-session-dialog.tsx` — A shadcn `AlertDialog` component that replaces the `window.confirm("Delete this whisper?")` call at `layout.tsx:277`. It should:
  - Accept props: `open`, `onOpenChange`, `onConfirm`, `sessionTitle`
  - Use `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel` from `@/components/ui/alert-dialog`
  - Style with the galactic/oracle theme: dark backgrounds, `border-white/15`, `bg-background/95`, `backdrop-blur-xl`, red destructive action button
  - Rationale: Browser `confirm()` is a UX anti-pattern — it blocks the main thread, is unstyled, and breaks the visual consistency of the app.

- [ ] **2.2** Create `src/components/oracle/sidebar/rename-session-dialog.tsx` — A shadcn `Dialog` component that replaces the `window.prompt("Rename chat:", session.title)` call at `layout.tsx:257`. It should:
  - Accept props: `open`, `onOpenChange`, `onRename(newTitle)`, `currentTitle`
  - Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog`
  - Include an `Input` field pre-filled with `currentTitle`, with a "Rename" `Button` in the footer
  - Support Enter key to confirm, Escape to cancel
  - Style consistently with the oracle theme
  - Rationale: Browser `prompt()` is unstyled, blocks the main thread, and provides no input validation or visual hierarchy.

- [ ] **2.3** Update `use-oracle-sessions.ts` to manage dialog state (`deleteTarget`, `renameTarget`) internally and return `DeleteSessionDialog`/`RenameSessionDialog` rendering as part of the hook's return or require consumers to render them. Preferred approach: the hook returns `{ deleteDialogProps, renameDialogProps }` — state-driven props that consumers pass to the dialog components. This keeps the hook stateful but the dialogs renderable from any consumer.
  - Rationale: This pattern keeps confirmation state close to the mutation logic while allowing the dialog components to be rendered at the correct DOM position.

### Phase 3: Extract Sidebar Sub-Components

- [ ] **3.1** Create `src/components/oracle/sidebar/collapsed-oracle-toggle.tsx` — Extract the `CollapsedOracleToggle` component from `layout.tsx:84-104`. This is a self-contained component that only needs `useSidebar()` — a straightforward extraction with zero risk.

- [ ] **3.2** Create `src/components/oracle/sidebar/oracle-sidebar-header.tsx` — Extract the sidebar header section from `layout.tsx:147-163`. This includes the logo, title text, sidebar trigger button, and the collapsed toggle. Props needed: none (uses `useSidebar` hook internally for the collapse trigger). Rationale: Isolating the header makes it easy to adjust spacing, add breadcrumbs, or change branding without touching the layout.

- [ ] **3.3** Create `src/components/oracle/sidebar/oracle-sidebar-actions.tsx` — Extract the action button menu from `layout.tsx:166-196`. Props needed: `onNewChat`, `onSearchOpen`, `isJournalImplemented` (currently false, so the Journal button can be disabled or hidden). Use shadcn `SidebarMenuButton` with `tooltip` prop for icon-only collapsed state. Rationale: This group of buttons is a discrete UI concern and will grow as features (journal, groups) are added.

- [ ] **3.4** Create `src/components/oracle/sidebar/session-list-empty.tsx` — Extract the empty state from `layout.tsx:211-216`. This is a static component with the `GiCursedStar` icon and "Your whispers from the stars will appear here" text. Rationale: Isolating empty states makes them easy to modify, animate, or add illustration to.

- [ ] **3.5** Create `src/components/oracle/sidebar/session-list-item.tsx` — Extract the per-session rendering from `layout.tsx:220-291`. This is the most complex extraction. The component should:
  - Accept props: `session` (the session object), `isActive: boolean`, `onToggleStar(sessionId)`, `onDelete(sessionId)`, `onRename(sessionId, newTitle)`, `onShare(sessionId)`
  - Render the `SidebarMenuButton` + `Link` for navigation + the `DropdownMenu` with Star/Rename/Share/Delete actions
  - Use `isActive` prop instead of computing it internally (the layout will compute it using the fixed pathname check — see Phase 4)
  - Use the `DropdownMenu` components from shadcn (already imported in layout)
  - Trigger `onDelete` and `onRename` callbacks instead of directly using `window.confirm`/`window.prompt` — the parent `PastWhispersSection` will handle opening the dialogs
  - **Fix: Use `SidebarMenuAction` instead of the custom absolute-positioned `<div>` + `<DropdownMenuTrigger>` pattern at `layout.tsx:240-246`**. The shadcn sidebar provides `SidebarMenuAction` (`sidebar.tsx:561-591`) which is purpose-built for this exact pattern — it handles absolute positioning, hover visibility, and `group-data-[collapsible=icon]:hidden` automatically.
  - Render the starred badge using `SidebarMenuBadge` instead of an inline `<Star>` inside the link text, per shadcn best practice. `SidebarMenuBadge` (`sidebar.tsx:593-613`) handles positioning and collapsed-state hiding automatically.
  - Rationale: This is the most complex piece and the most likely to change (adding categories as groups, adding swipe-to-delete on mobile, etc.).

- [ ] **3.6** Create `src/components/oracle/sidebar/past-whispers-section.tsx` — Extract the "Past Whispers" group from `layout.tsx:198-298`. This component:
  - Uses the `useOracleSessions` hook for data
  - Manages `deleteDialogState` and `renameDialogState` locally (or receives from parent)
  - Renders `SidebarGroup` > `SidebarGroupLabel` > `SidebarGroupContent` > `ScrollArea` > `SidebarMenu`
  - Renders `SessionListItem` for each session, computing `isActive` with the **fixed** pathname check (see Phase 4, issue 4.1)
  - Renders `SessionListEmpty` when sessions array is empty
  - Renders `DeleteSessionDialog` and `RenameSessionDialog` as portal-mounted overlays
  - **Fix the ScrollArea height**: Replace the fragile `h-[calc(100%-60px)]` with a flex-based layout. The `SidebarGroup` should use `className="min-h-0 flex-1"` and the `ScrollArea` should use `className="h-full"` — the flex container handles sizing, not a hardcoded pixel calculation.
  - **Add time-grouped sections (Today / Yesterday / Previous 7 Days / Older)** — reuse the `groupLabel` function from `oracle-chat-search-modal.tsx:29-41` (move it to `utils.ts`). Group sessions under `SidebarGroupLabel` sub-labels within the `ScrollArea`. This provides visual scanning affordance that the search modal already has but the sidebar lacks.
  - **Display relative timestamps**: Add `formatRelativeTime(session.lastMessageAt)` below each session title as a secondary `<span>` with `text-[10px] text-white/25` styling. The utility already exists but is unused in the sidebar.
  - Rationale: The Past Whispers section is the most "clunky" part of the current sidebar — time grouping, timestamps, and proper scroll layout address the specific issues called out in the task.

- [ ] **3.7** Create `src/components/oracle/sidebar/oracle-sidebar-footer.tsx` — Extract the user avatar dropdown from `layout.tsx:302-372`. Props needed: `user`, `tierLabel`, `shouldShowUpgrade`, `onSignOut`. Uses `DropdownMenu`, `Avatar`, etc. from shadcn. Rationale: The footer is self-contained and frequently modified (adding plan management, billing links, etc.).

- [ ] **3.8** Create `src/components/oracle/sidebar/oracle-top-bar.tsx` — Extract the top toolbar from `layout.tsx:379-423`. Props needed: `showLogo`, `centerCtaLabel`, `onNewChat`. The decorative blur orbs (`layout.tsx:376-377`) can be included in this component or kept in the layout — they are background decoration. Rationale: The top bar has its own state (`showTopLogo`) and is a distinct visual zone.

### Phase 4: Fix Active Session Detection Bug

- [ ] **4.1** Fix active session detection — Replace the substring match at `layout.tsx:219`:
  - **Current**: `const isActive = pathname?.includes(session._id)` — This can produce false positives because `includes()` matches substrings. For example, if session ID `abc123` exists and another session has ID `abc1234`, navigating to the latter would highlight both.
  - **Fix**: Use exact route matching: `const isActive = pathname === \`/oracle/chat/${session._id}\``
  - This logic should live in `past-whispers-section.tsx` after extraction, computing `isActive` per item.
  - Rationale: This is a correctness bug that will become more likely as session count grows.

### Phase 5: Compose the OracleSidebar and Thin Layout

- [ ] **5.1** Create `src/components/oracle/sidebar/oracle-sidebar.tsx` — A composition component that:
  - Imports and renders: `Sidebar` > `OracleSidebarHeader` + `SidebarContent` > `OracleSidebarActions` + `PastWhispersSection` + `SidebarSeparator` + `OracleSidebarFooter`
  - Passes the required props from `useOracleSessions` hook down to `PastWhispersSection`
  - Passes `user`, `tierLabel`, `shouldShowUpgrade`, `onSignOut` to `OracleSidebarFooter`
  - Does NOT render `SidebarProvider` or `SidebarInset` — those remain in the layout
  - Rationale: Having a single `<OracleSidebar>` component as the composition root for the sidebar makes the layout file trivial to read and makes the sidebar independently renderable/testable.

- [ ] **5.2** Rewrite `src/app/oracle/layout.tsx` as a thin orchestrator — The layout should be reduced to approximately 60-80 lines:
  - Import and call `useOracleSessions` hook (or have `OracleSidebar` call it internally)
  - Import and use `useUserStore`, `useOracleStore` for auth and reset
  - Handle auth redirect
  - Render: `SidebarProvider` > `OracleSidebar` + `SidebarInset` > `OracleTopBar` + `{children}` + `OracleChatSearchModal`
  - Manage `searchOpen` state and pass `onSearchOpen` to sidebar actions
  - Rationale: The layout should be a thin composition layer — it should not contain any UI rendering details.

### Phase 6: Polish and Tailwind Best Practices

- [ ] **6.1** Replace custom absolute-positioned dropdown trigger with `SidebarMenuAction` — In the extracted `SessionListItem`, replace the manual absolute-positioned `<div className="absolute right-2 top-1/2 -translate-y-1/2 ...">` + `<DropdownMenuTrigger>` pattern with shadcn's `SidebarMenuAction` component. The shadcn sidebar system (`sidebar.tsx:561-591`) provides `SidebarMenuAction` specifically for this use case:
  - It handles `absolute` positioning automatically
  - It applies `peer-hover/menu-button:text-sidebar-accent-foreground` for color coordination
  - It supports `showOnHover` prop to hide until the menu item is hovered
  - It respects `group-data-[collapsible=icon]:hidden` for collapsed state
  - Current code at `layout.tsx:240-246` reimplements all of this manually with custom Tailwind classes.

- [ ] **6.2** Replace inline star badge with `SidebarMenuBadge` — In `SessionListItem`, replace the custom `<Star className="shrink-0 h-3 w-3 text-galactic fill-galactic" />` inside the link text with `SidebarMenuBadge`. The shadcn component (`sidebar.tsx:593-613`) handles:
  - Absolute positioning (right-aligned)
  - Automatic hiding in collapsed icon mode
  - Pointer-events-none so it doesn't intercept clicks

- [ ] **6.3** Move repeated Tailwind class patterns into shared `cn()` groups or `cva` variants — Several class strings are duplicated between components:
  - The galactic button style (`border-galactic/40 bg-galactic/15 text-xs uppercase tracking-[0.14em] text-white hover:bg-galactic/25`) appears on buttons in the top bar and elsewhere
  - The sidebar menu button style (`h-10 gap-3 text-white/75 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:justify-center`) is repeated for each action button
  - Create a `src/components/oracle/sidebar/styles.ts` file using `cva` (class-variance-authoriance) to define reusable variants for these patterns, consistent with shadcn's use of `cva` internally (see `sidebar.tsx:488-508`).

- [ ] **6.4** Fix the ScrollArea height calculation — Replace the hardcoded `h-[calc(100%-60px)]` at `layout.tsx:204` with a proper flex-based approach:
  - The `SidebarGroup` already has `min-h-0 flex-1` classes — ensure the `SidebarGroupContent` and `ScrollArea` inherit this with `h-full` instead of a pixel calculation
  - This makes the layout resilient to label height changes, font size changes, or added elements above the list

- [ ] **6.5** Fix search modal debounce from 2000ms to 250ms — In `src/components/oracle-chat-search-modal.tsx:73-79`, the debounce timer of 2000ms is far too long for a client-side filter over an in-memory array. Reduce to 250ms. This is not strictly a sidebar issue but it directly impacts the "Search chats" button experience. Rationale: The filter runs client-side over data that is already in memory (passed as a prop) — there is no network request to justify a 2-second debounce.

### Phase 7: Clean Up and Verify

- [ ] **7.1** Delete the `formatRelativeTime`, `tierLabels`, and `CollapsedOracleToggle` definitions from `src/app/oracle/layout.tsx` after they are moved to their new locations. Remove all unused imports.

- [ ] **7.2** Audit the refactored `layout.tsx` — Ensure it is under 100 lines and contains only: auth check, `SidebarProvider`/`SidebarInset` composition, `OracleChatSearchModal` rendering, and state for `searchOpen`. All other rendering should be delegated to extracted components.

- [ ] **7.3** Verify the refactored sidebar works in all states:
  - Expanded sidebar with sessions list
  - Expanded sidebar with no sessions (empty state)
  - Expanded sidebar while sessions are loading
  - Collapsed (icon-only) sidebar — action buttons visible, whispers hidden
  - Mobile sidebar (Sheet overlay)
  - Active session highlighting
  - Session dropdown: star, rename (dialog), delete (dialog)
  - Search modal opens and closes
  - New chat button resets state and navigates

- [ ] **7.4** Remove the `messages` and `streamingContent` fields from `useOracleStore` if confirmed unused — The chat page (`chat/[sessionId]/page.tsx`) uses Convex reactive data (`sessionData.messages`) exclusively, not the Zustand store's `messages` array. The `streamingContent` field is also unused (the page uses `isStreaming` boolean from the store but streams content through Convex). This is not directly a sidebar issue but it's dead state that complicates the overall oracle architecture. **Skip if investigation shows these are used elsewhere.**

---

## Verification Criteria

1. `src/app/oracle/layout.tsx` is under 100 lines and contains no inline JSX for sidebar components
2. Every sidebar sub-component is in `src/components/oracle/sidebar/` and renders correctly in isolation (no implicit dependency on layout state)
3. Active session detection uses exact pathname matching, not substring `includes()`
4. Delete and rename use shadcn `AlertDialog`/`Dialog` components instead of `window.confirm`/`window.prompt`
5. Past Whispers displays time-grouped sections (Today/Yesterday/Previous 7 Days/Older) with relative timestamps
6. `SidebarMenuAction` and `SidebarMenuBadge` are used instead of custom absolute-positioned elements
7. The `ScrollArea` in Past Whispers uses flex-based height, not `h-[calc(100%-60px)]`
8. Search modal debounce is 250ms or less
9. All existing functionality (sidebar collapse, mobile sheet, session CRUD, search, navigation) continues to work without regression

---

## Potential Risks and Mitigations

1. **Breaking the sidebar collapse state cookie persistence**
   Mitigation: The `SidebarProvider` and `useSidebar` context remain in `layout.tsx` — no change to the provider wrapping. Extracted components use `useSidebar()` hook internally, which is the intended pattern per shadcn sidebar docs.

2. **Session CRUD mutations failing after hook extraction**
   Mitigation: The `useOracleSessions` hook wraps the same Convex `useMutation` calls with the same signatures. The only behavioral change is that delete/rename now go through dialog callbacks instead of browser APIs. The actual mutation calls are identical.

3. **Time-grouping adding visual complexity to a small list**
   Mitigation: Only show group labels when there are 2+ sessions in a group. If the user has very few sessions, the groups collapse naturally and the list looks similar to today.

4. **Moving `OracleChatSearchModal` sessions data through the hook**
   Mitigation: The search modal currently receives sessions as a prop from the layout. After refactoring, `useOracleSessions` provides the same data. The modal can either receive it from the layout (which calls the hook) or import the hook directly. Since the modal is also a `Dialog` that renders outside the sidebar DOM, prop-passing from layout is the cleanest approach.

5. **`SidebarMenuAction` not supporting `DropdownMenuTrigger` as child**
   Mitigation: `SidebarMenuAction` accepts `asChild` prop (inherited from `Slot`). Use `asChild` with `DropdownMenuTrigger` as the child, matching the shadcn sidebar example patterns. If this causes issues, the existing absolute-positioned trigger pattern works as a fallback.

---

## Alternative Approaches

1. **Keep everything in layout.tsx but extract render functions**: Instead of creating separate component files, define `renderPastWhispers()`, `renderSessionItem()`, etc. as inner functions within the layout. **Trade-off**: Minimal file changes, but doesn't solve the fundamental problem — the layout file is still monolithic, functions still share closure scope, and they can't be tested or reused independently. **Not recommended.**

2. **Use a context provider for session data instead of prop drilling**: Create an `OracleSessionsProvider` that wraps the sidebar and provides session data via context. **Trade-off**: Eliminates prop drilling but adds another provider layer and makes data flow harder to trace. Since the session data is only needed in the sidebar and the search modal (which already receives it as a prop), prop passing from the layout is simpler and more explicit. **Can be adopted later if prop drilling becomes burdensome.**

3. **Move `PastWhispersSection` to the Convex route level as a server component**: Fetch sessions server-side in a Next.js layout and pass as props. **Trade-off**: This would enable RSC benefits, but the oracle layout is already `"use client"` because of `useSidebar()`, router, and Convex hooks. Converting to a mixed RSC/client architecture requires significant restructuring (splitting the layout into a server layout + client sidebar component). **Worth considering as a future optimization but out of scope for this refactor.**