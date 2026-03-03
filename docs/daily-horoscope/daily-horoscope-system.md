# Stars.Guide: Dynamic Mundane Horoscope Engine Architecture

## 1. The Core Objective
To generate psychologically profound, geopolitically aware daily horoscopes at scale. This system maps real-world macro events to the specific psychological wiring of the 12 zodiac signs, providing actionable, zero-fluff guidance.

## 2. The Engine: OpenRouter BYOK Integration
The automated generation pipeline runs via **OpenRouter** using a Bring-Your-Own-Key (BYOK) setup. 
* **Why OpenRouter?** It decouples our backend from a single provider. We can dynamically select the best LLM for the job (e.g., `x-ai/grok-4.1-fast`, `google/gemini-2.5-flash-lite`, `arcee-ai/trinity-large-preview:free`) directly from our admin dashboard.
* **Cost-Efficiency:** We control API costs by selecting cheaper, fast-reasoning models for daily generation while retaining the ability to use heavier models for complex Zeitgeist synthesis.

## 3. The Dynamic Injection Architecture
The system abandons the rigid "12-call weekly loop" in favor of a granular, on-demand generation engine.
Each API payload dynamically injects:
1. **The System Prompt:** The live, editable `master-astrology-context.md` fetched from our database.
2. **The Target Profile:** The specific sign requested (e.g., Taurus).
3. **The Target Dates:** Variables defining exactly which days to generate for (e.g., 1 day, 3 days, or 7 days).
4. **The Task:** "Map the current Zeitgeist (World Vibe) to this sign's psychology for the requested dates."

## 4. The Zeitgeist Core (Manual vs. AI)
The "World Vibe" is the foundational context for any generation. The system supports two modes:
* **AI Synthesis Mode:** The Admin inputs 3-7 primary archetypal events. The AI synthesizes these into a cohesive psychological baseline.
* **Manual Override Mode:** The Admin types the Zeitgeist manually (e.g., "Aliens have invaded Earth. Massive ships in the sky."). This allows for immediate, zero-latency response to unprecedented global shocks.

## 5. Variable Narrative Arc & Upserting
Because generation can span from 1 to 7 days, the AI must adapt its narrative pacing:
* **Multi-Day Generation (e.g., 7 days):** The AI follows the Arc: Impact -> Processing -> Pivot -> Integration.
* **Single-Day Generation (e.g., Emergency Override):** The AI focuses immediately on the Impact and the actionable Pivot for that specific crisis.
* **The Upsert Rule:** If a horoscope is generated for a date and sign that already exists in the database, it **overwrites** the old entry. This allows us to replace deprecated "peaceful" horoscopes with emergency "crisis" horoscopes seamlessly.

## 6. STRICT CONSTRAINT: Geopolitical Abstraction
**Never output country-specific or localized news.** Astrology deals in universal archetypes. 
* *Rule:* The LLM must abstract literal events into their psychological equivalents.
* *Example:* "US job market crashes" MUST translate to "systemic economic uncertainty".
* *Example:* "Iran strikes infrastructure" MUST translate to "sudden geopolitical disruption".