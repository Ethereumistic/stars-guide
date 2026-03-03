# Stars.Guide: Master Context Compilation Plan

## 1. The IDE AI Agent Workflow
This document outlines the workflow for compiling our scattered knowledge base into a single, high-signal master prompt. 
**The Tool:** Gemini 3.1 Pro (via IDE integration).
**The Goal:** Gemini will ingest 6 distinct context files and output a single, hyper-optimized file named `master-astrology-context.md`.

## 2. The Input Files (The Raw Data)
The IDE Agent will be fed the following files:
1. `signs.md` (Raw elemental and modality data)
2. `planets.md` (Raw psychological functions)
3. `houses.md` (Raw life arenas)
4. `style-guide-and-tone.md` (The old, descriptive archetype data)
5. `vibe-tone.md` (The new, prescriptive DOs/DONTs for generation)
6. `daily-horoscope-system.md` (The system architecture and constraints)

## 3. The Output Target: `master-astrology-context.md`
The IDE Agent must output a single, highly structured **Markdown** file. 
*Why Markdown?* LLMs (like our Grok generation engine) read Markdown natively and token-efficiently. It is lighter than JSON for system prompting and allows for clear hierarchical rules.

## 4. Data Compression Directives (Signal vs. Noise)
When compiling the master file, the IDE Agent MUST follow these filtering rules:
* **SCRAP (Noise):** Delete all historical trivia (e.g., Mesopotamian origins). Delete all astronomical mechanics (e.g., eclipses, Earth's wobble). Delete all mentions of external brands like the CHANI app.
* **KEEP (Signal):** Retain only clinical, psychological definitions. Keep Planetary drives (e.g., Mars is action and confrontation), House arenas (e.g., 2nd House is assets and livelihood), and Sign modalities (e.g., Fixed signs sustain and keep everything going).

## 5. Enforcing the Abstraction Constraint
The IDE Agent must explicitly write the **Geopolitical Abstraction Constraint** into the final `master-astrology-context.md` file, instructing Grok that local events must be translated into global archetypes (e.g., localized war becomes "global power shifts").