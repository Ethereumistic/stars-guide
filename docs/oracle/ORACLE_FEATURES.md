# Oracle Features

This file tracks current feature keys, pipeline behavior, and data gates. Code sources are `src/lib/oracle/features.ts`, `src/lib/oracle/pipelines/`, and `convex/oracle/llm.ts`.

## Feature Keys

| Feature key | Implemented | Requires birth data | Requires journal consent | Pipeline |
| --- | --- | --- | --- | --- |
| `attach_files` | no | no | no | none |
| `birth_chart` | yes | yes | optional journal context if consented | `birth_chart` |
| `synastry` | yes | yes | no | `synastry` |
| `sign_card_image` | no | yes | no | none |
| `binaural_beats` | yes | no | no | `binaural_beats` |
| `journal_recall` | yes | no | yes | `journal_recall` |

Unimplemented keys can appear in UI/menu definitions, but they should not be documented as active product paths until code supports them.

## Pipeline Matrix

| Pipeline | Birth data | Journal context | Timespace | Synastry payload | Model hint | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `generic_chat` | no | yes, if consented | yes | no | `fast` | Default fallback. Journal is additive, not directive. |
| `birth_chart` | yes | yes, if consented | yes | no | `smart` | Uses completed Birth Chart Report when present and raw chart as reference. |
| `journal_recall` | no | yes, expanded budget | yes | no | `smart` | Searches journal context for emotional and astrological patterns. |
| `synastry` | yes | no | yes | yes | `smart` | Uses user chart plus a second chart and relationship metadata. |
| `binaural_beats` | no | no | yes | no | `creative` | Produces deterministic beat parameters; browser Web Audio handles playback. |

`cosmic_weather` exists in the `PipelineKey` type but is not registered in the current pipeline registry.

## Birth Chart

Manual selection and chart-related intent route to `birth_chart`. The pipeline requests birth data and can use journal context when consent exists. It prefers a completed durable Birth Chart Report over raw placement dumps, then uses raw chart data only as supporting reference.

Legacy session feature keys `birth_chart_core` and `birth_chart_full` are migrated to `birth_chart` in `invokeOracle`, with depth preserved through `birthChartDepth`.

## Journal Recall

`journal_recall` requires journal context and uses an expanded budget. The server must enforce journal consent before context is gathered. It does not request birth data by default, but it can compose with other active pipelines if routing resolves multiple intents.

## Synastry

`synastry` needs the user's chart, a second chart, and relationship metadata. The payload includes `source`, optional `friendUserId`, `relationship`, optional `relationshipCategory`, and `chartBName`.

User-facing output should use names and relationship roles, not "Chart A" / "Chart B" language.

## Binaural Beats

The current app path is not a standalone Cloudflare Worker POST flow. Oracle creates or stores sessions/messages and generated beat params, while playback happens in the browser through Web Audio.

The pipeline produces structured beat parameters and uses `afterResponse` to return a `store_binaural_params` action. The UI also has metadata-only paths for saved/generated beat sessions.

## Adding A Feature

1. Add or update the feature definition in `src/lib/oracle/features.ts`.
2. Add a pipeline under `src/lib/oracle/pipelines/` if the feature needs prompt behavior.
3. Register the pipeline in `src/lib/oracle/pipelines/index.ts`.
4. Update intent routing if the feature can auto-activate.
5. Keep data requirements minimal and explicit.
6. Add UI only after server behavior and gating are clear.
