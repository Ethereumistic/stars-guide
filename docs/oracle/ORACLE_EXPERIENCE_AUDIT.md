# Oracle Experience Audit

This audit is written against the current implementation. It focuses on whether Oracle turns astronomical data into trustworthy, memorable, useful intelligence—not merely whether the chat works.

## Current System

The user creates a session in `/oracle/new`; `convex/oracle/llm.ts` classifies the question, activates one or more pipelines, gathers only the data those pipelines request, assembles prompt blocks, checks quota and safety, streams through the configured provider chain, scans the response, and persists the result.

The important product distinction is:

- The astrology calculator supplies canonical facts.
- Deterministic code should derive arithmetic facts such as aspects, orbs, and applying/separating motion.
- The language model should synthesize meaning, uncertainty, and action from those facts.

Whenever the language model is asked to perform the arithmetic itself, quality and trust fall sharply.

## Birth Chart

### What works

- `buildUniversalBirthContext` supplies placements, degrees, houses, aspects, dignities, chart ruler, clusters, and nodal axis.
- Claims are required to cite nearby evidence.
- Core and full depth change interpretation instructions without hiding canonical chart data.
- Missing data is explicitly marked instead of guessed.

### Implemented operating-manual behavior

- Birth-chart mentor mode requires every meaningful pattern to state the pattern, earliest activation cue, usable edge, and a decision rule or testable action.
- Newly generated report signatures have separately validated `recognitionCue`, `failureMode`, `decisionRule`, and `experiment` fields; older saved reports remain compatible.
- **Implemented:** Birth-chart pipelines always receive deterministic canonical chart context and may receive a bounded, query-aware subset of a current, fingerprint-matched structured report as a subordinate interpretation layer. Broad natal requests retain full canonical coverage; synastry does not inherit this report layer.
- **Implemented:** Explicit resonant/not-relevant feedback forms a bounded private memory of up to twelve recent evaluations. It is reversible, treated as untrusted interpretation context, and prohibited from becoming chart evidence or objective fact.

### Target experience

Every meaningful reading should answer four questions: what is the pattern, what activates it, what edge does it offer, and what should the user do differently when it appears?

## Birth Chart Report

### What works

- The report is structured JSON rendered deterministically.
- It has evidence references, dominant signatures, life areas, practices, reflection prompts, follow-ups, and a technical appendix.
- Profiling answers influence emphasis but are not treated as chart evidence.
- The completed report becomes the durable foundation for later Oracle conversations.

### Implemented production gate

Report generation now follows one bounded path: generate, validate structure, evaluate quality, repair once with exact defects, then persist only if it passes. The deterministic evaluator measures evidence coverage, cross-checks every structured EvidenceRef against the canonical stored chart, checks observable/testable practices, specific follow-ups, duplicate signatures, and prohibited generic language. A failed repair aborts persistence rather than accepting a polished but weak report.

### Target experience

The report should create a personal vocabulary the user remembers and reuses. Each signature needs a memorable name, exact evidence, lived pattern, recognition cue, upside, failure mode, decision rule, and one small experiment. Follow-ups should open a precise unexplored thread rather than ask for “more.”

## Cosmic Weather

### Previous behavior

`computeSnapshot` calculated geocentric planetary positions, retrogrades, Moon phase, and current sky-to-sky aspects at noon UTC. `buildTimespaceContext` injected that collective snapshot for temporal questions. The model could describe the atmosphere, but it could not reliably explain why today matters to this specific user.

### Implemented improvement

For birth-chart timing questions, timespace now calculates current transiting planets against canonical natal longitudes. It supplies:

- exact transit-to-natal aspects and orbs;
- applying, separating, or stationary/unclear motion based on a six-hour comparison sample;
- natal house context;
- relevance ranking weighted toward slower transits and personal natal points;
- a 14-day six-hour-sampled scan that identifies the nearest high-relevance aspect peaks as timing-window centers;
- a strict interpretation protocol: evidence, lived pattern, opportunity, watch-for, action, and calibrated confidence.

Collective “felt language” now includes productive use, likely friction, an observable signal, and a practical pivot instead of forbidding all advice.

### Implemented precision improvement

- Current readings calculate the sky at the exact request instant rather than noon UTC.
- Applying/separating compares against a six-hour sample rather than the following noon.
- The 14-day window finder samples every six hours and explicitly forbids minute-level claims.

Current personal transits also include deterministic whole-sign transit house placement and the natal houses traditionally ruled by the transiting planet as separate evidence.

### Target experience

A useful daily reading should show no more than three ranked signals:

1. **Strongest opportunity** — what is easier to access and the best use of it.
2. **Primary watch-for** — the likely failure mode and its earliest observable cue.
3. **Timing state** — building, peaking, integrating, or background.

Each signal should expose confidence and evidence. “Nothing major is exact today” is a valid, trustworthy result.

## Synastry

### Previous behavior

Both natal charts were provided, but the prompt asked the language model to identify cross-chart aspects and house overlays. Language models are unreliable at circular degree arithmetic, so a polished response could cite a nonexistent aspect.

### Implemented improvement

Synastry now calculates major cross-chart aspects in code from canonical longitudes, ranks tight personal-planet and angle contacts first, calculates bidirectional whole-sign house overlays when both charts support them, and tells the model not to invent additional evidence. The reading distinguishes chemistry, ease, durability, and growth; it also adds communication, boundary/repair, and supportive-contact practices.

### Implemented evidence refinement

- Aspect orbs now use a transparent body-class policy: major defaults for personal-to-personal contacts, capped orbs for Nodes/angles, mixed contacts, and outer-to-outer contacts.
- Nodes and angles receive explicit ranking weight, and contacts involving either traditional chart ruler receive an additional priority boost.
- Composite Sun, Moon, Venus, and Mars shortest-arc midpoints are calculated in code and labeled as relationship-field evidence rather than either person's natal placement.
- The shared response feedback control asks whether a relationship dynamic is resonant, not relevant, or not yet known and feeds only explicit resolved feedback into private memory.
- Declination is explicitly marked unavailable because canonical declinations are not stored; Oracle is prohibited from claiming parallels or contra-parallels.

## Experience and Retention

The former landing state asked users to invent a question in a blank box. The new “intel menu” exposes four concrete promises: today's edge, today's watch-for, what is building, and a hidden natal pattern.

Healthy retention should come from accumulated personal value, not compulsion. The strongest loop is:

`signal → action → real-life observation → user feedback → better next reading`

Recommended next product primitives:

- **Implemented:** Save an Oracle response as a seven-day watch item, stored on its source message and removable by the user.
- **Implemented:** Mark a reading as resonant, not relevant, or not yet known; the state is explicit, reversible, and never inferred.
- **Implemented:** After the review time passes, the saved response surfaces a lightweight review cue beside the outcome control.
- **Implemented:** Maintain a bounded private confirmed-memory context sourced only from explicit feedback, with the original message control serving as the reversible user control.
- **Implemented:** The “What changed?” entry point compares the prior Oracle visit's exact-instant personal transit evidence with the current evidence and permits only material changes; “nothing material changed” is valid.
- Never use artificial urgency, streak loss, fear, or certainty to drive return visits.

## Quality Gates

A fixed, versioned production evaluation suite now covers natal facts, transit facts, synastry arithmetic, forecasting calibration, observable advice, privacy, and crisis safety. The admin-only action `oracle/evaluation:runProductionEvaluation` executes every case independently against every configured `oracle_chat` provider/model tier, uses a zero-temperature bounded call, scores deterministic dimensions, and persists the latest complete run under `oracle_settings.evaluation_latest`.

Every response is scored for:

- factual evidence precision;
- invented placements/aspects/dates;
- specificity versus generic language;
- separation of evidence, interpretation, and action;
- confidence calibration;
- usefulness of the proposed action;
- contradiction with the durable report or earlier conversation;
- privacy and safety violations.

The release gate passes only when every case on every configured provider/model tier reaches the 85-point threshold and all required evidence is present. Provider failures score zero. Prompt quality on the strongest model therefore cannot mask a weak or unavailable fallback tier.
