# Stars.Guide: Next.js + Convex Admin Orchestration Plan (v2 — Production Hardened)

## 1. Tech Stack Requirements
* **Framework:** Next.js 16 (App Router).
* **Database & Backend:** Convex (ALREADY INSTALLED) (`pnpm i convex`).
* **Styling & UI:** Tailwind CSS, Shadcn UI Components (ALREADY INSTALLED) (`Sidebar`, `DataTable`, `Form`, `Textarea`, `DatePicker`, `Select`, `Progress`). The pnpm add @tanstack/react-table is also installed specifically for DataTable.
* **AI Gateway:** OpenRouter API (using `fetch` inside Convex Node actions).
* **Schema Validation:** Zod v4 (ALREADY INSTALLED in `package.json`).

---

## 2. Security Architecture (Two-Layer Admin Protection)

### Layer 1: Next.js Middleware (UI Gate)
The existing `middleware.ts` already uses `convexAuthNextjsMiddleware` and checks authentication. We extend this with a dedicated admin route matcher.

**Implementation:** Add an `isAdminPage` matcher to the existing middleware. For admin-prefixed routes, verify the user's session has the `"admin"` role. If not, redirect to `/dashboard`.

```typescript
// src/middleware.ts — ADDITIONS to existing middleware

const isAdminPage = createRouteMatcher(["/admin", "/admin/(.*)"]);

// Inside the middleware handler, AFTER the existing authentication check:
if (isAdminPage(request) && isAuthenticated) {
    // Fetch user role from Convex via the auth session.
    // If the session token doesn't carry the role claim, redirect.
    // The admin layout will perform the definitive server-side check.
    // This middleware layer is a fast UI gate, not a security boundary.
}
```

> **IMPORTANT:** Next.js middleware on Cloudflare Workers runs at the Edge. It CANNOT make direct Convex DB calls. The middleware serves as a first-line deterrent. The real enforcement happens in Layer 2.

### Layer 2: Convex Backend Guard (The Law)
Every single admin-facing Convex mutation and action MUST independently verify the caller's role. This is non-negotiable because a motivated attacker can call Convex functions directly, bypassing the Next.js UI entirely.

```typescript
// convex/lib/adminGuard.ts — Shared utility

import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHORIZED: Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
        throw new Error("FORBIDDEN: Admin access required");
    }
    return { userId, user };
}
```

Every admin mutation/action starts with:
```typescript
const { userId } = await requireAdmin(ctx);
```

### Layer 3: Admin Layout Server-Side Check
The `/admin/layout.tsx` component performs a server-side data fetch on mount. If the current user's `role !== "admin"`, it renders a redirect. This prevents any admin UI from flashing for unauthorized users.

---

## 3. Convex Schema Definition (`convex/schema.ts`)
Add the following tables to the EXISTING schema (alongside `authTables`, `users`, `subscription_history`, `referrals`, `rateLimits`):

```typescript
// ADD these tables to the existing defineSchema() call

systemSettings: defineTable({
    key: v.string(),         // e.g., "master_context"
    content: v.string(),     // Raw markdown of the master prompt
    updatedAt: v.number(),   // Timestamp of last edit
    updatedBy: v.id("users"), // Which admin made the change
}).index("by_key", ["key"]),

zeitgeists: defineTable({
    title: v.string(),
    isManual: v.boolean(),
    archetypes: v.optional(v.array(v.string())),
    summary: v.string(),
    createdBy: v.id("users"),   // Audit: which admin created this
    createdAt: v.number(),
}).index("by_createdAt", ["createdAt"]),

horoscopes: defineTable({
    zeitgeistId: v.id("zeitgeists"),
    sign: v.string(),            // Strictly one of the 12 canonical names
    targetDate: v.string(),      // ISO format "YYYY-MM-DD" (UTC-normalized)
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("failed")),
    generatedBy: v.optional(v.id("generationJobs")), // Link to the job that created it
}).index("by_sign_and_date", ["sign", "targetDate"])
  .index("by_status", ["status"])
  .index("by_date", ["targetDate"]),

generationJobs: defineTable({
    adminUserId: v.id("users"),      // WHO triggered it
    zeitgeistId: v.id("zeitgeists"), // WHAT context was used
    modelId: v.string(),             // WHICH model (e.g., "x-ai/grok-4.1-fast")
    targetDates: v.array(v.string()),
    targetSigns: v.array(v.string()),
    status: v.union(
        v.literal("running"),
        v.literal("completed"),
        v.literal("partial"),        // Some signs succeeded, some failed
        v.literal("failed"),
        v.literal("cancelled")
    ),
    progress: v.object({
        completed: v.number(),
        failed: v.number(),
        total: v.number(),
    }),
    errors: v.optional(v.array(v.string())), // Per-sign error messages
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
}).index("by_status", ["status"])
  .index("by_admin", ["adminUserId"]),
```

---

## 4. Convex Actions & Resilience (`convex/ai.ts`)
Convex actions using `"use node"` must be engineered for LLM unreliability.

### A. `synthesizeZeitgeist` (Action)
* Takes an array of archetypal events. Calls OpenRouter. Returns a 3-sentence psychological summary.
* **Admin Guard:** Must call `requireAdmin(ctx)` before executing.

### B. `runGenerationJob` (Internal Action — The Core Engine)
This is the heart of the system. It runs **entirely server-side** and is **never called directly by the client**.

**Architecture: Fire-and-Forget with Progress Tracking**

```
Admin clicks "Generate"
  → Client calls api.admin.startGeneration (a lightweight mutation)
    → requireAdmin(ctx) — enforce role
    → Check for existing "running" jobs for overlapping dates → reject if found
    → Insert a generationJobs record (status: "running")
    → ctx.scheduler.runAfter(0, internal.ai.runGenerationJob, { jobId })
  → Client subscribes to useQuery(api.admin.getJobProgress, { jobId })
    → Reactively displays live progress bar
```

**Why this pattern matters:** The browser is ONLY a progress viewer, not a critical link in the execution chain. If the admin closes the tab, the Convex action continues running server-side and saves results directly via internal mutations. Zero data loss.

### C. Per-Sign Processing (Inside `runGenerationJob`)
The action processes signs **one at a time** (not in batches of 3) to stay well within Convex's 10-minute action timeout:

```typescript
for (const sign of targetSigns) {
    try {
        const result = await callOpenRouter(sign, dates, zeitgeist, modelId);
        const validated = LLMResponseSchema.safeParse(result);
        
        if (!validated.success) {
            // Zod validation failed — retry once
            const retryResult = await callOpenRouter(sign, dates, zeitgeist, modelId);
            const retryValidated = LLMResponseSchema.safeParse(retryResult);
            
            if (!retryValidated.success) {
                failedCount++;
                errors.push(`${sign}: ${retryValidated.error.message}`);
                await ctx.runMutation(internal.admin.updateJobProgress, { jobId, failedCount, errors });
                
                if (failedCount >= MAX_TOTAL_FAILURES) {
                    await ctx.runMutation(internal.admin.failJob, { jobId, errors });
                    return; // ABORT entire job
                }
                continue; // Move to next sign
            }
            
            await ctx.runMutation(internal.admin.upsertHoroscopes, { 
                data: retryValidated.data, zeitgeistId, jobId 
            });
        } else {
            await ctx.runMutation(internal.admin.upsertHoroscopes, { 
                data: validated.data, zeitgeistId, jobId 
            });
        }
        
        completedCount++;
        await ctx.runMutation(internal.admin.updateJobProgress, { jobId, completedCount });
        
    } catch (error) {
        // Network error, timeout, 429, 500, etc.
        failedCount++;
        errors.push(`${sign}: ${error.message}`);
        
        if (failedCount >= MAX_TOTAL_FAILURES) {
            await ctx.runMutation(internal.admin.failJob, { jobId, errors });
            return;
        }
    }
    
    // Rate limit protection: sleep between signs
    await new Promise(r => setTimeout(r, 2000));
}
```

### D. Retry & Budget Safety Constants

```typescript
const MAX_RETRIES_PER_SIGN = 2;        // Max 2 attempts per sign (1 original + 1 retry)
const RETRY_DELAY_MS = 3000;           // Wait 3s before retry
const MAX_TOTAL_FAILURES = 6;          // If 6+ signs fail, abort the entire job
const INTER_SIGN_DELAY_MS = 2000;      // Sleep between signs to respect rate limits
```

### E. The JSON Sanitizer (Crucial Utility)
Even instructed otherwise, LLMs sometimes return ` ```json { ... } ``` ` instead of raw JSON.
Before parsing the OpenRouter response, run a regex utility to strip markdown wrappers:
```typescript
function sanitizeLLMJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
}
```

### F. Zod Schema Validation (The LLM Lie Defense)
Every LLM response is validated INSIDE the Convex action, BEFORE any database write.

```typescript
import { z } from "zod";

const VALID_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

const HoroscopeEntrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    content: z.string()
        .min(330, "Content below 330 character minimum")
        .max(460, "Content exceeds 460 character maximum"),
});

const LLMResponseSchema = z.object({
    sign: z.enum(VALID_SIGNS),
    horoscopes: z.array(HoroscopeEntrySchema).min(1).max(7),
});

export type ValidatedHoroscope = z.infer<typeof LLMResponseSchema>;
```

**What this catches:**
| LLM Hallucination | Without Zod | With Zod |
|---|---|---|
| `"date": "Friday the 13th"` | Silently stored, breaks index | ❌ Rejected: regex fails |
| `"content": ""` (empty) | Saved, blank card on frontend | ❌ Rejected: min(330) fails |
| `"sign": "taurus"` (lowercase) | Duplicate entry created | ❌ Rejected: enum fails |
| `"content": "..."` (800 chars) | Overflows frontend card | ❌ Rejected: max(460) fails |
| Missing `horoscopes` array | `JSON.parse` succeeds, crash later | ❌ Rejected: required field |

---

## 5. The Upsert Mutation (`convex/admin.ts`) — Smart Overwrite

```typescript
export const upsertHoroscopes = internalMutation({
    args: {
        data: v.object({
            sign: v.string(),
            horoscopes: v.array(v.object({
                date: v.string(),
                content: v.string(),
            })),
        }),
        zeitgeistId: v.id("zeitgeists"),
        jobId: v.id("generationJobs"),
    },
    handler: async (ctx, args) => {
        for (const entry of args.data.horoscopes) {
            const existing = await ctx.db
                .query("horoscopes")
                .withIndex("by_sign_and_date", q =>
                    q.eq("sign", args.data.sign).eq("targetDate", entry.date)
                )
                .first();

            if (existing) {
                // Skip if content is identical (avoid unnecessary writes)
                if (existing.content === entry.content) continue;
                
                // Overwrite — reset to draft if previously published
                await ctx.db.patch(existing._id, {
                    content: entry.content,
                    status: "draft", // Force review even if previously published
                    zeitgeistId: args.zeitgeistId,
                    generatedBy: args.jobId,
                });
            } else {
                await ctx.db.insert("horoscopes", {
                    sign: args.data.sign,
                    targetDate: entry.date,
                    content: entry.content,
                    status: "draft",
                    zeitgeistId: args.zeitgeistId,
                    generatedBy: args.jobId,
                });
            }
        }
    },
});
```

**Key behaviors:**
1. If content is **identical** → skip (no unnecessary write, no status reset).
2. If content is **different** → overwrite and **force status back to "draft"** so the admin must re-review.
3. Every horoscope links back to its `generationJob` for full audit traceability.

---

## 6. Admin UI Routes (`/src/app/(admin)/admin`)

### A. Layout (`/admin/layout.tsx`)
* Implement Shadcn `<SidebarProvider>` and `<AppSidebar>`.
* **Server-side role check:** On mount, fetch current user via `useQuery(api.users.current)`. If `role !== "admin"`, render `<redirect to="/dashboard">`. Never flash admin UI to non-admins.
* Navigation items: Dashboard, Context Editor, Zeitgeist Engine, Generation Desk, Review & Publish.

### B. Context Editor (`/admin/context/page.tsx`)
* Fetch `master_context` from `systemSettings` via `useQuery`.
* Render a large `<Textarea>` for the admin to directly edit the rules.
* **Live Token Counter:** Display a live estimate of the prompt's token count using `Math.ceil(text.length / 4)`. If the estimate exceeds **6,000 tokens**, show a warning badge: *"⚠️ Prompt is becoming dense. Consider compressing to avoid Lost-in-the-Middle degradation."*
* "Save Changes" button calls an admin-guarded mutation that updates the database row AND records `updatedAt` and `updatedBy`.

### C. Zeitgeist Engine (`/admin/zeitgeist/page.tsx`)
* **Toggle Switch:** "Manual Override" vs "AI Synthesis".
* **Manual Mode:** Shows a `<Textarea>` for the admin to directly write the emergency summary.
  * **Prompt Injection Defense:** The Zeitgeist text is placed in the **user message** (not the system message) when sent to the LLM. This reduces the attack surface for prompt injection. Additionally, strip suspicious patterns like "ignore previous instructions" before storage.
* **AI Mode:** Shows dynamic input fields for world events (archetypes).
* "Save Zeitgeist" commits the record to `zeitgeists` with `createdBy: adminUserId`.

### D. Generation Desk (`/admin/generator/page.tsx`)
* **Controls:** Zeitgeist Dropdown, Model Select Dropdown (Grok, Claude, Gemini, etc.), Date Range Picker, 12 Sign Checkboxes (with "Select All" toggle).
* **Date Handling:** The DatePicker transmits explicit ISO date strings (e.g., `"2026-03-13"`), never `new Date()`. This prevents timezone-induced date drift (admin in UTC+2 at 11 PM would otherwise generate for the wrong UTC date).
* **Concurrency Guard:** Before creating a new job, query for any existing `generationJobs` with `status: "running"` that overlap the selected dates. If found, show an error: *"A generation for these dates is already in progress."* and disable the Generate button.
* **UX/UI:** When "Generate" is clicked:
  1. Call `api.admin.startGeneration` (lightweight mutation).
  2. The mutation returns a `jobId`.
  3. Subscribe to `useQuery(api.admin.getJobProgress, { jobId })` for live reactivity.
  4. Display a Shadcn `<Progress>` bar showing `completed / total` with per-sign status indicators.
  5. If the admin closes the tab and returns, the job status persists in the DB and the progress bar resumes from where it left off.

### E. Review & Publish (`/admin/review/page.tsx`)
* Implement Shadcn `<DataTable>`.
* Columns: Status Badge, Date, Sign, Content (truncated), Character Count, Generation Job Link.
* **Validation UI:** The "Character Count" cell text turns red if `< 330` or `> 460`.
* **Coverage Matrix View:** A 12×7 grid (signs × dates) showing:
  * 🟢 Green = `published`
  * 🟡 Yellow = `draft` (ready for review)
  * 🔴 Red = missing or `failed`
  * **Publish Guard:** The "Publish All" action is disabled if any cell in the selected date range is red (missing/failed). The admin must regenerate failed signs first.
* Checkbox selection to bulk update `status` from "draft" to "published".

---

## 7. Public API — Frontend Reads (`convex/horoscopes.ts`)

The admin pipeline generates and stores data. The public frontend needs a clean, indexed query to read it.

```typescript
export const getPublished = query({
    args: {
        sign: v.string(),
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        const horoscope = await ctx.db
            .query("horoscopes")
            .withIndex("by_sign_and_date", q =>
                q.eq("sign", args.sign).eq("targetDate", args.date)
            )
            .first();

        // Only return published content — never expose drafts
        if (!horoscope || horoscope.status !== "published") return null;
        return horoscope;
    },
});

export const getWeekPublished = query({
    args: {
        sign: v.string(),
        dates: v.array(v.string()), // Array of "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        const results = [];
        for (const date of args.dates) {
            const h = await ctx.db
                .query("horoscopes")
                .withIndex("by_sign_and_date", q =>
                    q.eq("sign", args.sign).eq("targetDate", date)
                )
                .first();
            if (h && h.status === "published") results.push(h);
        }
        return results;
    },
});
```

**Fallback behavior:** If `getPublished` returns `null` for today's date, the frontend should display a graceful fallback message (e.g., "Today's cosmic download is being channeled. Check back soon.") — never a blank card or error state.

---

## 8. Underwater Stones (Invisible Risks & Mitigations)

### Risk 1: Serverless Function Timeouts (The 60-Second Trap)
* **The Problem:** If you select 7 days of horoscopes for 12 signs using a heavy model (like Claude 3.5 Sonnet or Llama 70b), the generation will take longer than 60 seconds. Vercel/Next.js edge functions or standard serverless routes will violently time out and kill the process.
* **The Mitigation:** Because we are using Convex, we bypass Next.js API timeout limits entirely. Convex actions can run for up to **10 minutes**. We orchestrate the OpenRouter calls *entirely* within Convex internal actions, keeping Next.js strictly as a UI layer. The fire-and-forget pattern (Section 4B) ensures the browser is never in the critical path.

### Risk 2: BYOK Rate Limiting (HTTP 429)
* **The Problem:** Firing concurrent requests to OpenRouter might hit your specific API key's concurrency limits (e.g., Anthropic strictly limits concurrent calls on lower tiers).
* **The Mitigation:** Process signs sequentially (one at a time) with a 2-second inter-sign delay. This guarantees 100% success rate at the cost of ~24 extra seconds for a 12-sign batch.

### Risk 3: Context Window Creep (Dilution of Prompt)
* **The Problem:** Over the months, you might keep adding new rules to the `master-astrology-context.md` file without deleting old ones. Eventually, the prompt gets so large that the LLM suffers from "Lost in the Middle" syndrome (ignoring your JSON formatting rules because they are buried).
* **The Mitigation:** In the `/admin/context/page.tsx` UI, add a live token-count estimator (using `Math.ceil(text.length / 4)`). If the context exceeds 6,000 tokens, display a warning badge: "Prompt is becoming too dense. Consider compressing."

### Risk 4: LLM Returns Valid JSON But Invalid Data (The LLM Lie)
* **The Problem:** `JSON.parse()` validates syntax, not semantics. The LLM can return `"date": "next Tuesday"` and it will silently save to the database, corrupting the index.
* **The Mitigation:** Full Zod v4 schema validation (Section 4F) runs INSIDE the Convex action BEFORE any database write. Rejects hallucinated dates, wrong sign casing, out-of-range content lengths, and structural anomalies.

### Risk 5: Browser Tab Closure During Generation
* **The Problem:** If the admin closes the browser during a 2-3 minute generation, the client-side chain that was supposed to save results dies.
* **The Mitigation:** The fire-and-forget architecture (Section 4B) eliminates this risk entirely. The browser is a progress viewer that can disconnect and reconnect at will. All execution is server-to-server (action → internal mutation).

### Risk 6: Infinite Retry / Budget Drain
* **The Problem:** Without explicit retry limits, a broken model endpoint can burn hundreds of API calls.
* **The Mitigation:** Hard constants: `MAX_RETRIES_PER_SIGN = 2`, `MAX_TOTAL_FAILURES = 6`. Upon hitting the failure cap, the entire job aborts and the admin is shown a clear error report.

### Risk 7: Concurrent Generation Race Condition
* **The Problem:** Two admins (or the same admin in two tabs) generating for the same dates simultaneously causes double API spend and unpredictable upsert order.
* **The Mitigation:** The `startGeneration` mutation checks for existing `generationJobs` with `status: "running"` for overlapping dates. If found, the request is rejected with a clear error message.

### Risk 8: Timezone-Induced Date Drift
* **The Problem:** Admin's browser timezone can cause `new Date()` to produce tomorrow's date in UTC.
* **The Mitigation:** The DatePicker transmits explicit ISO date strings. The Convex action never calls `new Date()` to infer dates.