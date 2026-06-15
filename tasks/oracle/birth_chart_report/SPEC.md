# Birth Chart Report & Refactored Birth Chart Feature — Implementation Spec

## 1. Goal

Replace the current template-driven `birth_chart` Oracle feature with a durable, deeply personalized **Birth Chart Report**.

Key outcomes:
1. Every user receives **one** comprehensive Birth Chart Report generated once when user accesses the /oracle route / first Oracle AI visit.
2. The report is stored as structured Markdown-like text in the users table as birthChartReport or smth like that.
3. The report is used as canonical birth-chart context in all later Oracle conversations that need the birth chart report.
4. The existing `birth_chart` Oracle feature is re-imagined as a **mentor/teacher mode/big sister/brother** that always answers from the report, with room for deeper exploration and no predefined templated structure, every personal questions needs personal answer.
5. A short profiling questionnaire unlocks the personalization and is treated as a core product asset.

---

## 2. High-Level User Flow

```
1. User registers
2. User provides birth data (date, time, location)
3. astronomy-engine calculates chart → saved to users.birthData
4. User navigates to /oracle for the first time
5. Oracle sends a hardcoded welcome + explanation message
6. User answers 3 profiling questions (all optional)
7. System queues Birth Chart Report generation
8. Report is generated via LLM pipeline and saved to users.birthChartReport
9. User sees the completed report (read-only, downloadable/printable)
10. Later Oracle chats automatically include the report as context
11. The "birth_chart" feature becomes a mentor that teaches from the report
```

---

## 3. Data Model Changes

### 3.1 `users` table

Add a new optional object field:

```typescript
birthChartReport: v.optional(
  v.object({
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    markdown: v.optional(v.string()), // the report itself
    profilingAnswers: v.optional(
      v.object({
        centralQuestion: v.optional(v.string()),
        publicPersona: v.optional(v.string()),
        innerExperience: v.optional(v.string()),
        pronouns: v.optional(v.string()),
      })
    ),
    generatedAt: v.optional(v.number()), // timestamp ms
    errorMessage: v.optional(v.string()),
    version: v.optional(v.number()), // report schema version
  })
),
```

**Notes:**
- `birthChartReport` is a new top-level field on `users`, separate from `birthData`.
- The report is **not** a chat message. It is a user asset.
- `version` lets us regenerate reports later when the generation prompt improves.

### 3.2 New table: `birth_chart_report_jobs`

Used for the async generation queue. Convex actions can enqueue, workers process.

```typescript
birth_chart_report_jobs: defineTable({
  userId: v.id("users"),
  status: v.union(
    v.literal("queued"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  priority: v.number(), // default 1, higher = sooner
  attempts: v.number(),
  maxAttempts: v.number(),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_status", ["status"]);
```

---

## 4. Profiling Questions (The "Joker")

These are asked after the user first enters `/oracle` and before report generation. All questions are optional.

### Question 1 — Central intention
**"If this report could answer one real question for you, what would it be?"**
- Type: open text
- Max length: 200 chars
- Maps to: report focus, emphasis weighting

### Question 2 — Outer vs. inner self
**"How do people tend to describe you at first?"**
- Type: open text
- Max length: 140 chars

**"And how do you actually feel inside?"**
- Type: open text
- Max length: 140 chars
- Maps to: Sun-Moon-Ascendant synthesis

### Question 3 — Pronouns / language
**"What pronouns should we use when writing about you in your report?"**
- Type: single-select or custom text
- Options: "they/them", "she/her", "he/him", "Custom"
- Maps to: grammatical agreement in report

---

## 5. Birth Chart Report Format

The report is a single Markdown string. It is generated once and reused.

### 5.1 Report structure (dynamic outline)

The LLM decides which sections to include and how much weight each deserves, but must choose from this catalog:

```markdown
# Birth Chart Report for {preferredName}

## Core Identity
(synthesis of Sun, Moon, Ascendant, chart ruler)

## Emotional Life
(Moon, 4th house, water emphasis, inner experience)

## Mind & Communication
(Mercury, 3rd/9th houses, learning style)

## Relationships & Values
(Venus, Mars, 5th/7th/8th houses)

## Career & Public Direction
(Sun, MC, 10th house, Saturn)

## Key Tensions & Growth Edges
(hard aspects, contradictions, life themes)

## Key Gifts & Natural Strengths
(trines, sextiles, dignities, elemental balance)

## Central Story of This Chart
(one-paragraph synthesis that ties everything together)
```

### 5.2 Rules for the generation prompt

- The LLM must not simply repeat the user's profiling answers.
- The LLM must connect every claim to a concrete chart placement or aspect.
- The LLM must name at least one tension and one gift directly.
- The LLM must use the user's pronouns if provided.
- The LLM must use the central question as a lens, not as content to parrot.
- The report must be written in second person ("you"), warm but not sycophantic.
- No medical, financial, or deterministic predictions.

### 5.3 Example snippet

```markdown
## Core Identity

You carry the outward mark of {ascendant sign} — people tend to read you as 
{ascendant qualities}. Yet your Sun in {sun sign} and Moon in {moon sign} give 
you a more complex inner weather than first impressions suggest.

{...}
```

---

## 6. Generation Pipeline

### 6.1 Trigger points

Report generation should be queued when **both** are true:
- `user.birthData` exists and is valid
- `user.birthChartReport` is missing or status is not `pending`/`generating`/`completed`

The safest trigger is:
1. After the user submits profiling questions in `/oracle/new`.
2. As a fallback: when any code path calls `ensureBirthChartReport(ctx, userId)`.

### 6.2 Queue implementation

Use a Convex action to enqueue, and a Convex mutation + cron/scheduled job pattern to process.

```typescript
// convex/birthChartReport/queue.ts

export const enqueueReportGeneration = action({
  args: { userId: v.id("users"), priority: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Prevent duplicate pending jobs
    const existing = await ctx.runQuery(
      internal.birthChartReport.queue.getPendingJobForUser,
      { userId: args.userId }
    );
    if (existing) return { jobId: existing._id };

    return await ctx.runMutation(
      internal.birthChartReport.queue.createJob,
      {
        userId: args.userId,
        status: "queued",
        priority: args.priority ?? 1,
        attempts: 0,
        maxAttempts: 3,
      }
    );
  },
});
```

### 6.3 Worker processing

Use a Convex scheduled function or cron to pick up queued jobs.

```typescript
// convex/birthChartReport/worker.ts

export const processNextJobs = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = await ctx.runQuery(
      internal.birthChartReport.queue.getJobsByStatus,
      { status: "queued", limit: args.limit ?? 5 }
    );

    for (const job of jobs) {
      await ctx.runMutation(
        internal.birthChartReport.queue.markJobProcessing,
        { jobId: job._id }
      );

      try {
        await generateAndSaveReport(ctx, job.userId);
        await ctx.runMutation(
          internal.birthChartReport.queue.markJobCompleted,
          { jobId: job._id }
        );
      } catch (err) {
        await ctx.runMutation(
          internal.birthChartReport.queue.markJobFailed,
          {
            jobId: job._id,
            error: err instanceof Error ? err.message : "Unknown error",
          }
        );
      }
    }
  },
});
```

### 6.4 Report generation function

```typescript
// convex/birthChartReport/generate.ts

export const generateAndSaveReport = async (
  ctx: ActionCtx,
  userId: Id<"users">
) => {
  const user = await ctx.runQuery(internal.users.getUserById, { userId });
  if (!user?.birthData) throw new Error("Missing birth data");

  const chartContext = buildUniversalBirthContext(user.birthData);
  const profiling = user.birthChartReport?.profilingAnswers;

  const systemPrompt = buildReportSystemPrompt({
    pronouns: profiling?.pronouns,
    centralQuestion: profiling?.centralQuestion,
    publicPersona: profiling?.publicPersona,
    innerExperience: profiling?.innerExperience,
  });

  const userPrompt = buildReportUserPrompt({
    chartContext,
    profiling,
  });

  const response = await callOracleModel({
    systemPrompt,
    userPrompt,
    maxTokens: 2500, // generous for a one-time report
    temperature: 0.85,
  });

  const reportMarkdown = sanitizeReport(response.content);

  await ctx.runMutation(internal.users.setBirthChartReport, {
    userId,
    report: {
      status: "completed",
      markdown: reportMarkdown,
      generatedAt: Date.now(),
      version: 1,
    },
  });
};
```

---

## 7. Oracle Onboarding UI Flow

### 7.1 Route: `/oracle/new`

When the user lands on `/oracle/new`:

1. Query `checkQuota` and `kill_switch` as usual.
2. Query current user.
3. If `user.birthChartReport` is missing:
   - Show the Oracle welcome message:
     > "Before we proceed, I need to do a deep analysis of your birth chart and write a report you can keep. This takes a moment. Are you ready?"
   - Show a primary CTA: **"Start My Birth Chart Report"**
4. On click:
   - Show the profiling questions (all optional, skip allowed).
   - On submit: save answers, enqueue report generation, show loading state.
5. Poll for report completion:
   - Query `getBirthChartReportStatus` every 3–5 seconds.
   - On completion: show report preview + CTA to chat.
   - On failure: show retry / support message.

### 7.2 Loading state

```
[ Oracle illustration / animation ]

Crafting your Birth Chart Report...

This usually takes 10–30 seconds.
We are synthesizing your placements, aspects, houses, and what makes your chart unique.
```

### 7.3 Report preview screen

After generation:
- Render the Markdown report in a read-only, nicely styled container.
- Buttons:
  - **"Continue to Oracle"** — navigates to `/oracle/chat/[sessionId]`
  - **"Download / Print"** — opens a printable HTML page or triggers PDF generation
  - **"Regenerate"** — only visible if report is older than N days or failed

---

## 8. Refactored `birth_chart` Oracle Feature

### 8.1 New role: mentor/teacher mode

The existing `birth_chart` feature remains selectable in the Oracle input menu, but its behavior changes:

- It **always includes the stored Birth Chart Report** in the system prompt.
- It treats the user as someone who wants to go deeper into their own chart.
- It answers from the report first, then expands beyond it when asked.

### 8.2 New default prompt

```
Dive deeper into my birth chart report. Teach me something I haven't noticed yet.
```

### 8.3 New instruction block (replaces old core/full templates)

```
[BIRTH CHART MENTOR MODE]
You are a wise, grounded astrology mentor. The user has a completed Birth Chart Report 
(see [BIRTH CHART REPORT] context). Your job is to teach from that report, answer 
questions, and help the user understand their own patterns more deeply.

Rules:
- Always ground your answer in the Birth Chart Report first.
- When expanding beyond the report, use the raw chart data if needed.
- Never contradict the report without acknowledging it.
- Ask clarifying questions if the user is vague.
- Keep the tone warm, precise, and empowering.
[END BIRTH CHART MENTOR MODE]
```

### 8.4 Data flow change

Current flow:
```
user asks birth_chart question
  → inject raw [BIRTH CHART DATA]
  → LLM interprets everything on the fly
```

New flow:
```
user asks birth_chart question
  → inject [BIRTH CHART REPORT] (pre-interpreted)
  → optionally inject raw [BIRTH CHART DATA] as reference
  → LLM answers from the report + raw data
```

### 8.5 Depth selector removal

Remove the `core` / `full` depth selector for the `birth_chart` feature. The report is always full depth. The mentor mode handles focus organically.

If you want to keep a depth concept, rename it to:
- **Focus on report only**
- **Report + deeper synthesis**

---

## 9. Prompt Architecture Changes

### 9.1 New context block: `[BIRTH CHART REPORT]`

Replace the current `chart_a_data` user block with a conditional block:

```typescript
// In birth chart / synastry / any feature needing birth context
if (user.birthChartReport?.status === "completed") {
  // Use the report as primary context
  userBlocks.push({
    label: "birth_chart_report",
    content: wrapInTags(
      "BIRTH CHART REPORT",
      user.birthChartReport.markdown
    ),
  });

  // Optionally include raw data as secondary reference
  userBlocks.push({
    label: "birth_chart_data_reference",
    content: wrapInTags(
      "BIRTH CHART RAW DATA — REFERENCE ONLY",
      buildUniversalBirthContext(user.birthData)
    ),
  });
} else if (user.birthData) {
  // Fallback: raw data only
  userBlocks.push({
    label: "chart_a_data",
    content: buildUniversalBirthContext(user.birthData),
  });
}
```

### 9.2 Priority order (system prompt)

```
Priority 100: Safety rules
Priority 95:  Birth chart mentor instructions (if feature active)
Priority 90:  Soul document
Priority 50:  Timespace context
Priority 40:  Journal context (if consent)
```

User message blocks:
```
[BIRTH CHART REPORT]
[BIRTH CHART RAW DATA — REFERENCE ONLY]
[THEIR CHART DATA] (synastry)
[USER QUESTION]
```

---

## 10. Printable / Downloadable Report

### 10.1 Approach: Printable HTML page

The fastest path to "download/print" is a dedicated route:

```
/oracle/birth-chart-report
```

- Server/Client component loads the user's `birthChartReport.markdown`.
- Renders Markdown to HTML with a clean, print-friendly stylesheet.
- Includes decorative elements: zodiac wheel SVG, sign glyphs, planet icons.
- User can **Print to PDF** via browser, or we generate a PDF on demand.

### 10.2 PDF generation options

| Option | Pros | Cons |
|--------|------|------|
| Browser print-to-PDF | Simple, no backend | Less polished |
| Puppeteer/Playwright via Convex action | Full layout control | Heavier, harder in Convex |
| Cloudflare Worker + @cloudflare/puppeteer | Good fit for CF deploy | Extra service |

**Recommendation:** Ship browser print-to-PDF first. Add server-side PDF later if needed.

### 10.3 Report page component outline

```tsx
// src/app/oracle/birth-chart-report/page.tsx

export default function BirthChartReportPage() {
  const user = useQuery(api.users.getCurrentUser);
  const report = user?.birthChartReport;

  if (!report || report.status !== "completed") {
    return <ReportPendingState />;
  }

  return (
    <div className="birth-chart-report-page">
      <ReportHeader user={user} />
      <ReportToolbar onPrint={() => window.print()} />
      <ReportBody markdown={report.markdown} chart={user.birthData} />
    </div>
  );
}
```

---

## 11. Implementation Plan

### Phase 1: Schema & storage
- [ ] Add `birthChartReport` field to `users` table.
- [ ] Create `birth_chart_report_jobs` table.
- [ ] Add helper queries/mutations: `getBirthChartReport`, `setBirthChartReport`, `setProfilingAnswers`.

### Phase 2: Report generation backend
- [ ] Implement `enqueueReportGeneration` action.
- [ ] Implement `processNextJobs` worker.
- [ ] Write `buildReportSystemPrompt` and `buildReportUserPrompt`.
- [ ] Implement `generateAndSaveReport`.
- [ ] Add cron to process queued jobs every minute.

### Phase 3: Profiling UI
- [ ] Build profiling question component in `/oracle/new`.
- [ ] Implement loading/polling state.
- [ ] Implement report preview screen.

### Phase 4: Printable report page
- [ ] Create `/oracle/birth-chart-report` route.
- [ ] Style for print-friendly output.
- [ ] Add download/print button.

### Phase 5: Refactor Oracle birth chart feature
- [ ] Remove `core`/`full` depth selector from `birth_chart` feature.
- [ ] Update `birth_chart` pipeline instructions to mentor mode.
- [ ] Update prompt assembly to inject `[BIRTH CHART REPORT]` block.
- [ ] Keep raw chart data as optional reference block.

### Phase 6: Migration & cleanup
- [ ] Backfill reports for existing users (optional, can be lazy on first Oracle visit).
- [ ] Remove old hardcoded core/full instruction templates if no longer used.
- [ ] Update documentation.

---

## 12. File Structure

```
convex/
  birthChartReport/
    queue.ts          # enqueue, job CRUD
    worker.ts         # processNextJobs
    generate.ts       # generateAndSaveReport, prompts
    prompts.ts        # buildReportSystemPrompt, buildReportUserPrompt
  users.ts            # add setBirthChartReport, setProfilingAnswers
  schema.ts           # add birthChartReport field

src/
  app/
    oracle/
      birth-chart-report/
        page.tsx      # printable report page
      new/
        _components/
          BirthChartOnboarding.tsx
          ProfilingQuestions.tsx
          ReportPreview.tsx
          ReportPending.tsx
  components/
    oracle/
      BirthChartReportRenderer.tsx
      ReportPrintStyles.tsx
  lib/
    oracle/
      birthChartReport.ts  # client-side helpers
```

---

## 13. Acceptance Criteria

- [ ] A new user with birth data who visits `/oracle` sees the onboarding welcome and profiling questions.
- [ ] Submitting profiling questions enqueues report generation and shows a loading state.
- [ ] On completion, the user sees their Birth Chart Report.
- [ ] The report is saved to `users.birthChartReport.markdown`.
- [ ] Subsequent Oracle sessions automatically include the report as context.
- [ ] The `birth_chart` feature uses mentor-mode instructions and references the report.
- [ ] The report page is printable and styled.
- [ ] Users can skip any or all profiling questions.
- [ ] Report generation is idempotent: re-triggering does not create duplicate jobs.
- [ ] Raw birth chart data is still available as reference context when needed.
- [ ] The old `core`/`full` depth selector is removed from the `birth_chart` feature UI.

---

## 14. Open Questions for Implementation Agent

1. Do we want to allow manual report regeneration from the report page?
2. Should the report be generated immediately after onboarding, or only on first Oracle visit?
3. Do we want to email/notify the user when the report is ready?
4. Should existing users with birth data be prompted to generate a report retroactively?
5. What is the exact PDF generation strategy for v1?

---

## 15. Summary

This spec turns the birth chart from a repeatedly re-asked chat feature into a durable, personalized asset. The key shifts are:

1. **One report, generated once**, using a richer prompt and profiling context.
2. **Report becomes context** for all later Oracle conversations.
3. **Birth chart feature becomes a mentor** that teaches from the report.
4. **User gets a printable artifact** they can keep and share.
5. **Profiling questions are minimal, optional, and high-leverage.**

The result should feel less like a chatbot with a template and more like a personal astrological profile that the user actually owns.
