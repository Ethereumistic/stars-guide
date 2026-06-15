# Birth Chart Report Flow

_Last updated: 2026-06-15_

This document explains the current Birth Chart Report flow from entering Oracle to report generation and later reuse in chat.

## Purpose

The Birth Chart Report is a durable, generated Markdown report stored on the user document. Once completed, Oracle treats it as canonical birth-chart context instead of re-deriving everything from raw birth data on every chat.

The UX goal is: keep users inside the normal Oracle chat, introduce the report with a streamed-feeling assistant message, collect a few personalization answers inside the input area, generate the report asynchronously, then continue chat with the finished report available.

## Main data model

### `users.birthChartReport`

Defined in `convex/schema.ts`.

Important fields:

- `status`: `pending | generating | completed | failed`
- `markdown`: completed report Markdown
- `profilingAnswers`: structured personalization answers
  - `currentSeason?: string[]`
  - `reportFocus?: string[]`
  - `growthPattern?: string[]`
  - `tonePreference?: string`
  - `preferredName?: string`
  - `pronouns?: string`
  - `customContext?: string`
  - legacy v1 fields are still accepted
- `onboardingStep`: currently uses `questionnaire` or `queued` for the v2 flow
- `oracleSessionId`: the dedicated Oracle session associated with the Birth Chart Report
- `generatedAt`, `errorMessage`, `version`

### `birth_chart_report_jobs`

Async queue table. One active queued/processing job per user is enforced by `getActiveJobForUser` before creating jobs.

## Sidebar entry

The Past Whispers sidebar renders a pinned `Birth Chart Report` item in:

- `src/components/oracle/sidebar/past-whispers-section.tsx`

It uses:

- icon: `GiMazeCornea`
- icon class: `text-primary`
- title: `Birth Chart Report`

Behavior:

1. If `currentUser.birthChartReport.oracleSessionId` exists, clicking opens `/oracle/chat/{oracleSessionId}`.
2. If no session exists, clicking calls `api.oracle.sessions.createBirthChartReportSession`.
3. That mutation creates a normal Oracle session titled `Birth Chart Report`, inserts an initial user message `Birth Chart Report`, stores the session id on `users.birthChartReport.oracleSessionId`, then the client routes to `/oracle/chat/{sessionId}`.

This means the pinned item behaves like a normal chat session, not like a static report page link.

## New Oracle session / first user message flow

Normal sessions are created from `/oracle/new` via `api.oracle.sessions.createSession`.

When a user sends a message in `/oracle/chat/[sessionId]`, the page calls:

- `api.oracle.llm.invokeOracle`

File:

- `convex/oracle/llm.ts`

Early in `invokeOracle`, after loading the current user, there is a Birth Chart Report gate:

```ts
const missingBirthChartReport = Boolean(
  user?.birthData && user.birthChartReport?.status !== "completed",
);
```

If the user has birth data but no completed report, normal LLM routing is skipped.

### First missing-report response

If `users.birthChartReport` is missing or has no `onboardingStep`:

1. `internal.birthChartReport.queue.startChatOnboarding` is called with the current `sessionId`.
2. That mutation sets:
   - `status: "pending"`
   - `onboardingStep: "questionnaire"`
   - `oracleSessionId: sessionId` if none exists
3. `invokeOracle` adds one hardcoded assistant message with:
   - `modelUsed: "birth_chart_report_onboarding"`
   - `fallbackTierUsed: "D"`
4. The action returns without calling an LLM provider.

The hardcoded assistant copy explains that Oracle needs to create the Birth Chart Report before proceeding.

## Client-side fake streaming

Hardcoded onboarding messages are stored complete in Convex, but the chat UI animates fresh ones locally.

File:

- `src/app/(app)/oracle/chat/[sessionId]/page.tsx`

Relevant component:

- `FakeStreamingOnboardingMessage`

A message fake-streams when:

- `msg.modelUsed === "birth_chart_report_onboarding"`
- it is the latest assistant message
- it is fresh enough

The questionnaire is intentionally delayed while this reveal is happening. The page computes `onboardingWelcomeStillRevealing`, and only shows the questionnaire when the reveal window has passed.

## Questionnaire UI

Component:

- `src/components/oracle/birth-report/BirthReportQuestionnaire.tsx`

It appears above the normal Oracle input, as an expansion of the input area. It does not replace the chat page.

Features:

- one question at a time
- option badges
- custom answer input inside the module
- back / next / skip
- final review
- “Begin report” submit

Current question categories:

1. current life season
2. report focus
3. inner/growth pattern
4. guidance emphasis
5. preferred name
6. pronouns / wording preference
7. optional self-knowledge context

Important implementation detail: the normal Oracle input is disabled while the questionnaire is active, but the questionnaire itself must only receive the busy/quota disabled state, not the normal input disabled state. Otherwise badge selection and Begin Report become disabled.

## Submitting the questionnaire

On final submit, the chat page calls:

- `api.birthChartReport.queue.submitReportQuestionnaire`

with:

- `answers`
- current `sessionId`
- priority `2`

File:

- `convex/birthChartReport/queue.ts`

The action:

1. Authenticates the user.
2. Calls `saveCompletedQuestionnaire` internal mutation.
3. Enqueues generation idempotently via `enqueueReportGenerationForUser`.
4. Schedules the worker immediately with `ctx.scheduler.runAfter(0, internal.birthChartReport.worker.processNextJobs, { limit: 1 })`.

`saveCompletedQuestionnaire` stores all answers at once and sets:

- `status: "pending"`
- `onboardingStep: "queued"`
- `oracleSessionId: submitted sessionId` if provided

The chat page also inserts one normal user message:

```txt
I answered the Birth Chart Report questions. Please create my report.
```

It does not insert a user message per question.

## Queue and worker pipeline

Files:

- `convex/birthChartReport/queue.ts`
- `convex/birthChartReport/worker.ts`
- `convex/birthChartReport/generate.ts`
- `convex/birthChartReport/prompts.ts`

Pipeline:

1. Job is created in `birth_chart_report_jobs` with `status: "queued"`.
2. Worker `processNextJobs({ limit })` pulls queued jobs by status.
3. Worker marks job processing with `markJobProcessing`.
4. `markJobProcessing` also patches the user report status to `generating`.
5. Worker calls `generateAndSaveReport`.
6. `generateAndSaveReport` loads the user via internal query/mutation calls, builds prompts, selects an Oracle provider, calls the LLM endpoint, sanitizes Markdown, and saves it.
7. Completed report is stored at `users.birthChartReport.markdown` with `status: "completed"`, `generatedAt`, and `version`.
8. Worker marks the queue job completed.
9. If generation fails, `markJobFailed` retries until `maxAttempts`; terminal failure sets user report `status: "failed"` and `errorMessage`.

Important Convex rule: actions do not use `ctx.db` directly. Generation and worker actions use `ctx.runQuery` / `ctx.runMutation`.

## Report prompt

File:

- `convex/birthChartReport/prompts.ts`

Version:

- `BIRTH_CHART_REPORT_VERSION = 2`

The prompt asks for Markdown with sections such as:

- chart motto / invocation
- Chart at a Glance
- Core Pattern
- Inner Weather
- How You Move Through the World
- Mind, Voice & Learning Style
- Love, Desire & Attachment Patterns
- Work, Calling & Public Direction
- Gifts You Can Trust
- Growth Edges / Shadow Patterns
- Personal Motto
- Reflection Prompts
- Central Story of This Chart

Voice requirements:

- second person
- grounded, emotionally intelligent, warm, clear
- “wise older sister” energy
- not theatrical, not overly mystical, not purple prose
- every major claim must cite chart evidence

## Report renderer/page

Report page:

- `src/app/(app)/oracle/birth-chart-report/page.tsx`

Renderer:

- `src/components/oracle/BirthChartReportRenderer.tsx`

The page is now a scrollable transparent page inside the Oracle shell so the star background shows through. It does not start onboarding. It only displays a completed report or a not-ready state.

The Print / PDF button is below the report content. Back navigation lives in the Oracle top bar for this route.

## Completed report reuse in normal Oracle chat

Once `users.birthChartReport.status === "completed"` and `markdown` exists, `convex/oracle/llm.ts` injects the report into the Oracle pipeline context.

Files:

- `src/lib/oracle/pipelineTypes.ts`
- `src/lib/oracle/pipelines/birthChart.ts`
- `convex/oracle/llm.ts`

For the `birth_chart` pipeline, the completed report is inserted as:

```txt
[BIRTH CHART REPORT]
...
```

Raw birth data may still be included as reference, but the durable report is preferred as canonical context.

## Chat ready/generating states

In `/oracle/chat/[sessionId]`:

- If `status !== "completed"` and `onboardingStep === "queued"` or `status === "generating"`, a crafting state appears above the input.
- If `status === "completed"`, a ready card can appear above the input with:
  - Continue chatting
  - Open report

Important bug fix: `reportGenerating` must explicitly exclude `status === "completed"`, because old documents can keep `onboardingStep: "queued"` after completion. Otherwise the normal input stays disabled with “Your report is being crafted…” even though the report is complete.

The ready card is dismissible per session via “Continue chatting”; it should not block normal input.

## Common pitfalls

- Do not send questionnaire answers as separate normal chat messages.
- Do not show the questionnaire before the hardcoded welcome has finished fake-streaming.
- Do not make the pinned sidebar item route directly to `/oracle/birth-chart-report`; it should open/create the dedicated report chat session.
- Do not disable the questionnaire using the same boolean that disables the normal Oracle input.
- Do not treat `onboardingStep: "queued"` alone as generating if `status === "completed"`.
- Do not call external LLM providers from queries/mutations.
- Do not use `ctx.db` inside Convex actions.
