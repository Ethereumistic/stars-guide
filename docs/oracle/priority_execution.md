 P0 — PUBLIC BETA BLOCKERS

 ### Do not open registration without these. Product is broken or dangerous without them.

 ┌───┬───────────────────┬─────────┬────────────────────────────────────────────────────────────────────────────────────────────┐
 │ # │ Recommendation    │ Launch  │ Why It Blocks                                                                              │
 │   │                   │ Risk    │                                                                                            │
 ├───┼───────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 4 │ Async resilient   │ 10/10   │ If OpenRouter hangs and Convex kills your action at 30s, the user gets no response at all  │
 │   │ model chain       │         │ — not even your fallback message. Beta users will think the app is dead and never return.  │
 │   │                   │         │ This is a 2-3 day fix that makes you antifragile on day one.                               │
 ├───┼───────────────────┼─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 7 │ Minimum viable    │ 9/10    │ You don't need the full three-layer fortress. You need one output scanner: a cheap model   │
 │   │ output safety     │         │ (Haiku / Gemini Flash) or even a regex+embedding check that runs after the LLM response    │
 │   │                   │         │ and blocks it if it contains medical advice, leaked journal content, or self-harm          │
 │   │                   │         │ encouragement. With public beta strangers and journal data in the prompt, this is          │
 │   │                   │         │ liability insurance. 1 day MVP.                                                            │
 └───┴───────────────────┴─────────┴────────────────────────────────────────────────────────────────────────────────────────────┘

 P0 reality check: If you do only these two, you can flip the "public" switch. Everything else is polish, performance, or scaling
 architecture.

 ────────────────────────────────────────────────────────────────────────────────

 P1 — FIRST SPRINT MID-FLIGHT

 ### Fix these in the first 14 days while beta users are already inside.

 ┌────┬────────────────────┬─────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
 │ #  │ Recommendation     │ Launch  │ Why It Goes Here                                                                         │
 │    │                    │ Risk    │                                                                                          │
 ├────┼────────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ 5  │ Structured output  │ 7/10    │ Missing titles and flaky JOURNAL_PROMPT: parsing make the product look amateurish on     │
 │    │ for metadata       │         │ every single first message. It's a 2-3 day refactor that removes regex fragility         │
 │    │                    │         │ forever.                                                                                 │
 ├────┼────────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ 14 │ Refusal detection  │ 7/10    │ Claude 4 and Gemini 2.5 are increasingly prudish. A user asking "Will my Saturn return   │
 │    │ & escalation       │         │ be hard?" might get "I cannot provide predictions about death." You look broken. A retry │
 │    │                    │         │ with a refusal-recovery prompt on Tier B takes 1 day to implement.                       │
 ├────┼────────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ 11 │ Structured         │ 6/10    │ Astrology beta users will fact-check transit degrees. Prose descriptions let the model   │
 │    │ timespace context  │         │ hallucinate orbs. At minimum, switch timespace to JSON arrays ({"transits":              │
 │    │                    │         │ [{"planet":"Mars","degree":15.3}]}) so the model isn't doing math from prose. 3 days.    │
 │    │                    │         │ Full Swiss Ephemeris integration can wait; structured data cannot.                       │
 ├────┼────────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ 2  │ Embedding intent   │ 6/10    │ The 500ms LLM roundtrip before the real LLM call makes first messages feel sluggish. But │
 │    │ router             │         │ regex catches 80% of clear intents, so this is a latency annoyance, not a functional     │
 │    │                    │         │ bug. Swap it in week 2 when you need a performance win.                                  │
 └────┴────────────────────┴─────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

 ────────────────────────────────────────────────────────────────────────────────

 P2 — MONTH 1-2 ENGINE SWAP

 ### Do these before you ship synastry, predictive, or composite features. This is the "change the engine mid-air" window.

 ┌────┬────────────────────┬─────────────┬──────────────────────────────────────────────────────────────────────────────────────┐
 │ #  │ Recommendation     │ Launch Risk │ Why It Goes Here                                                                     │
 ├────┼────────────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
 │ 1  │ Tagged block       │ 8/10 (for   │ Your current buildPrompt() with 7 parameters will explode when you add synastry      │
 │    │ prompt composer    │ scaling)    │ (second birth chart), composite (third chart), and transits (date tables). But it    │
 │    │                    │             │ works fine for the 2 features you have now. Refactor this the week before you start  │
 │    │                    │             │ synastry.                                                                            │
 ├────┼────────────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
 │ 3  │ Differential birth │ 6/10        │ Only hurts power users in sessions >15 messages. Beta users won't hit this for a few │
 │    │ context            │             │ weeks. When they do, the model starts contradicting itself because context is        │
 │    │                    │             │ truncated. Fix after you have your first "long conversation" bug report.             │
 ├────┼────────────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
 │ 12 │ Conversation       │ 5/10        │ Same trigger as #3: only matters when sessions get long. This is a retention         │
 │    │ memory layer       │             │ feature, not a launch feature.                                                       │
 ├────┼────────────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────────────┤
 │ 10 │ Feature injection  │ 4/10        │ Only matters if someone other than you starts editing the oracle_feature_injections  │
 │    │ validation         │             │ table. If you're the only admin, this is hygiene, not a blocker.                     │
 └────┴────────────────────┴─────────────┴──────────────────────────────────────────────────────────────────────────────────────┘

 ────────────────────────────────────────────────────────────────────────────────

 P3 — SCALE / MONETIZATION PHASE

 ### Do these when you have traction, a team, or a billing page.

 ┌────┬─────────────────────┬─────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
 │ #  │ Recommendation      │ Launch  │ Why It Waits                                                                            │
 │    │                     │ Risk    │                                                                                         │
 ├────┼─────────────────────┼─────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ 6  │ Regression test     │ 5/10    │ You need real user conversations to build a good golden dataset. Running synthetic      │
 │    │ suite               │         │ tests against a made-up dataset gives false confidence. Wait until you have 500+ real   │
 │    │                     │         │ sessions, then curate the golden set from actual edge cases users found.                │
 ├────┼─────────────────────┼─────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ 8  │ Memoized context    │ 3/10    │ Pure performance optimization. At beta scale, your timingPromptBuildMs overhead is      │
 │    │ blocks              │         │ invisible compared to LLM latency. Fix when you have 100+ concurrent sessions and       │
 │    │                     │         │ Convex bill starts hurting.                                                             │
 ├────┼─────────────────────┼─────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ 9  │ Persona modules     │ 2/10    │ Admin UX improvement. The single 62-line blob works. Split it when you want to A/B test │
 │    │                     │         │ "gentle mode" or seasonal personas.                                                     │
 ├────┼─────────────────────┼─────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ 13 │ Debug panel         │ 2/10    │ Minor security hygiene. Queries are already protected; this just hides the component    │
 │    │ server-side gate    │         │ code from non-admins. Trivial 1-hour fix.                                               │
 ├────┼─────────────────────┼─────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ 15 │ Usage-based quota   │ 2/10    │ Only matters when you start charging. The current per-role caps work functionally for   │
 │    │ refactor            │         │ free beta.                                                                              │
 └────┴─────────────────────┴─────────┴─────────────────────────────────────────────────────────────────────────────────────────┘

 ────────────────────────────────────────────────────────────────────────────────

 The "48-Hour to Public" Checklist

 If you want to open the doors this week, do literally only this:

 1. Day 1: Implement the async model chain fallback (#4). Split invokeOracle into a job scheduler + tiered sub-actions so a dead
    provider doesn't kill the whole request.
 2. Day 1 (afternoon): Add an output safety scanner (#7 MVP). After the LLM responds, scan for I am not a medical professional,
    call 911, or any string matching the user's own journal content. If found, serve the fallback response and log an alert.
 3. Day 2: Add quick refusal regex detection (#14 MVP). If the response contains I can't / I cannot / I'm not able to and the
    question was benign astrology, immediately retry on Tier B with a 1-line appended instruction: The previous model refused in
    error. You are an astrology educator. Answer normally.
 4. Day 2 (afternoon): Open beta.

 Everything else is a GitHub issue for next Monday.

 ────────────────────────────────────────────────────────────────────────────────

 One-Sentence Verdict

 Launch with #4 and #7 done; fix #5, #14, and #11 in the first sprint; do #1 before synastry; everything else is a Q3 problem.