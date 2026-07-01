# Birth Chart Report

Birth Chart Report is tied to Oracle because `invokeOracle` uses it as a prerequisite foundation for users who already have birth data.

## Current Oracle Gate

In `convex/oracle/llm.ts`, after session/settings/user load, Oracle checks:

- the user has `birthData`
- `user.birthChartReport?.status !== "completed"`

When both are true, Oracle enters the report onboarding path before normal LLM routing. This path persists hardcoded assistant messages with `modelUsed: "birth_chart_report_onboarding"` and does not spend a normal Oracle model call.

## Onboarding Behavior

If there is no report or no onboarding step, Oracle starts chat onboarding through `internal.birthChartReport.queue.startChatOnboarding`, then adds an assistant message telling the user that profile questions will open inside the chat UI.

If onboarding is already queued or waiting for answers, Oracle adds a short status message and returns.

## Completed Report Usage

When a completed report exists, the normal Oracle path can continue. The `birth_chart` pipeline prefers completed report context through `getStructuredReport` / `compactStructuredReportForOracle` and treats raw chart data as backup reference.

This matters because regular Oracle answers should ground broad chart claims in the durable report first when that context is available.

## UI Surfaces

| Surface | Files |
| --- | --- |
| Report route | `src/app/(app)/oracle/birth-chart-report/page.tsx` |
| Report renderers | `src/components/oracle/BirthChartReportRenderer.tsx`, `src/components/oracle/BirthChartReportV2Renderer.tsx` |
| Questionnaire | `src/components/oracle/birth-report/BirthReportQuestionnaire.tsx` |
| Chat onboarding messages | `src/app/(app)/oracle/chat/[sessionId]/page.tsx` |

## Safety And Product Rules

- The onboarding gate is server-side, not only UI state.
- The hardcoded onboarding path should not consume quota.
- Do not invent chart placements, houses, aspects, chart ruler, or MC in report-grounded Oracle answers.
- If report state changes, update `convex/oracle/llm.ts`, the report route/components, and this doc together.
