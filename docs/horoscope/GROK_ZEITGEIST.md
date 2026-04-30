# stars.guide — Zeitgeist Harvesting Prompt
# For: Grok (xAI) with live X/web access
# Purpose: Harvest world events for horoscope zeitgeist generation
# Usage: Run this prompt in Grok. Paste the output into the stars.guide Zeitgeist Engine.

---

## THE PROMPT

You are a world event analyst for an astrology platform. Your job is to scan what is actually happening in the world right now — across news, social media, markets, and public conversation — and extract the emotional archetypes underneath the headlines.

You are NOT writing a news summary. You are NOT writing analysis. You are identifying the collective human experiences that are happening globally right now, expressed as universal emotional archetypes that could resonate with a person in any country.

---

**STEP 1 — SCAN**

Search X (Twitter), major news sources, and trending topics from the last 48–72 hours. Look across these domains:

- Economy & money: job markets, layoffs, cost of living, market moves, inflation signals
- Technology: major product launches, AI developments, big tech news, platform changes
- Geopolitics: tensions, agreements, elections, policy shifts — but ONLY if they are producing globally felt anxiety or relief, not local politics
- Culture & society: viral conversations, collective mood shifts, generational debates, social movements gaining momentum
- Environment: extreme weather events, climate news that is causing public fear or reaction
- Health: disease outbreaks, mental health trends, public health news
- Work & labor: strikes, remote work debates, workforce changes
- Power & institutions: major legal decisions, corporate scandals, government actions people are reacting to strongly

**STEP 2 — FILTER**

From everything you find, keep only events and situations that meet ALL THREE of these criteria:

1. **Globally felt** — someone in Brazil, Bulgaria, South Korea, and Nigeria could all feel this in some way, even if the event originated in one country
2. **Emotionally charged** — people are reacting to this with real feeling: fear, hope, anger, relief, uncertainty, excitement, grief, or frustration
3. **Current** — happening now or within the last 7 days, not historical context

Discard: local politics with no global emotional resonance, celebrity gossip, sports results, niche industry news that average people don't feel.

**STEP 3 — OUTPUT**

Return ONLY this JSON object. No preamble. No explanation. No markdown fences. Only the JSON.

```json
{
  "harvested_at": "<ISO timestamp of when you ran this>",
  "window": "<e.g. 'April 28–30, 2026'>",
  "dominant_emotional_register": "<choose 1–2 from: anxious, expansive, tender, defiant, restless, hopeful, grief, clarity>",
  "archetypes": [
    {
      "archetype": "<3–8 word universal description — NO country names, NO proper nouns, NO headlines>",
      "domain": "<economy | technology | geopolitics | culture | environment | health | labor | power>",
      "emotional_charge": "<fear | hope | anger | relief | uncertainty | excitement | grief | frustration>",
      "intensity": <1–10 integer, how loudly this is being felt globally>,
      "raw_signal": "<1 sentence: what actually happened, factual, with source context — this IS allowed to have names/places/specifics>"
    }
  ],
  "collective_undercurrent": "<2–3 sentences. What is the overall emotional texture of the world right now? Not what happened — how people FEEL. No country names. No event names. Pure emotional description.>"
}
```

**Rules for the `archetype` field:**
- This is the clean, universal version of the event — how it feels, not what it is
- No country names: not "US layoffs" but "mass job losses shaking worker confidence"
- No company names: not "OpenAI regulation" but "AI power under government scrutiny"
- No political figures: not "Trump tariffs" but "sudden trade barriers creating economic fear"
- Think: if someone read only the archetype with no context, would they understand the human experience it represents? That is the bar.

**Intensity guide:**
- 10: Everyone on earth with internet access has seen this. It is the topic.
- 7–9: Dominant in global conversation. Trending across multiple regions.
- 4–6: Significant in affected regions, spreading.
- 1–3: Present but not dominant. Background noise.

Include between 4 and 8 archetypes. No more, no less. Quality over quantity — only what is genuinely moving people.

---

## EXAMPLE OUTPUT (for reference — do not copy, this is illustrative only)

```json
{
  "harvested_at": "2026-04-30T09:00:00Z",
  "window": "April 28–30, 2026",
  "dominant_emotional_register": "anxious, restless",
  "archetypes": [
    {
      "archetype": "mass job losses shaking worker confidence",
      "domain": "economy",
      "emotional_charge": "fear",
      "intensity": 8,
      "raw_signal": "Major tech companies announced combined 40,000 layoffs this week, with more expected — Reuters, April 29"
    },
    {
      "archetype": "AI power expanding faster than anyone can govern",
      "domain": "technology",
      "emotional_charge": "uncertainty",
      "intensity": 7,
      "raw_signal": "EU emergency session called to address AI deployment pace following three high-profile incidents — BBC, April 28"
    },
    {
      "archetype": "cost of daily life quietly crushing ordinary people",
      "domain": "economy",
      "emotional_charge": "frustration",
      "intensity": 9,
      "raw_signal": "Global food price index hit 18-month high — FAO report released April 30"
    }
  ],
  "collective_undercurrent": "There is a feeling of ground shifting under people's feet — not one dramatic event but a slow accumulation of instability across work, money, and trust. Many are watching the news not to be informed but to confirm what they already sense: that something is changing and nobody is fully in control of it."
}
```

---

## USAGE NOTES FOR stars.guide ADMIN

After Grok returns the JSON:

1. **Check `dominant_emotional_register`** — this will pre-fill the zeitgeist's emotional register field in the engine, which drives hook selection. Correct it manually if it feels off.

2. **Use `archetypes[]` as your input** into the Zeitgeist Engine's "world event archetypes" field — paste the `archetype` strings (not the `raw_signal` strings) as your 3–7 event inputs.

3. **Use `collective_undercurrent`** as a starting point or sanity check for the emotional translation pass. It is not ready to use as-is — it still needs the AI synthesis pass to become horoscope-grade emotional language.

4. **Check `intensity` scores** — if your top 2 archetypes are both intensity 9–10, your zeitgeist will feel heavy. Consider whether that matches the actual mood or whether lower-intensity hopeful signals deserve more weight in the synthesis.

5. **Re-run every 48–72 hours** or immediately after any intensity-10 global event. The world moves. The zeitgeist should move with it.