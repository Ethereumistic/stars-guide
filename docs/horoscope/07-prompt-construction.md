# Prompt Construction — v2.0 Template

Source: `convex/horoscopes/prompt.ts`

The prompt is the bridge between raw astronomical data and the LLM's output.
It has 3 sections: **Section A** (astronomical context), **Section B**
(sign-specific framing), and **Section C** (output schema + rules).

## Prompt Sections

### Section A — Astronomical Context

This section provides the LLM with all the astronomical data it needs. It is
marked **CONTEXT ONLY** — the LLM is explicitly forbidden from repeating any
astrological terminology in its output.

Structure:
```
SECTION A — ASTRONOMICAL CONTEXT for 2025-07-14
═══════════════════════════════════════════════════════
⚠️  This entire section is CONTEXT ONLY. Do NOT repeat any planet names,
aspect names, astrological terms, or jargon in your output.

MOON
  Phase: Waxing Gibbous 🌔 (68% illuminated)
  Moon void-of-course in Libra — decisions may not stick.
  Moon shifts Libra → Scorpio

PLANET POSITIONS
  Sun in Cancer at 22.3°
  Moon in Libra at 14.7°
  Mercury in Leo at 5.2° [RETROGRADE — energy turns inward]
  ...

ACTIVE ASPECTS
  Mercury opposition Saturn — orb 2.1° (challenging) [TIGHT ORB — especially influential]
  Venus trine Jupiter — orb 1.5° (harmonious)
  ...

RETROGRADE CONTEXT
  Currently retrograde: Mercury, Saturn
  Recently turned direct: Venus

    RETROGRADE CYCLE POSITIONS (translate into felt experience):
      Mercury: deepening phase — 35% through retrograde (8d elapsed, 15d remaining of 24d window)
      Saturn: entering phase — 12% through retrograde (5d elapsed, 35d remaining of 42d window)
      Venus: aftermath — turned direct 3d ago (shadow period may linger)

    (Clear planets are omitted from cycle positions since they have no retrograde story to tell.)

DOMINANT THEMES
  Themes: identity, vitality, communication, thought, action, expansion, structure
  Dominant element: fire
  Stellium in Leo (3+ planets concentrated)
  Aspect patterns: focal_point, dynamic_tension

ENERGY SIGNATURE: fire, outward, reflective, intense, concentrated
```

Key formatting rules:
- Retrograde planets get a `[RETROGRADE — energy turns inward]` flag
- Tight-orb aspects (< 3°) get `[TIGHT ORB — especially influential]`
- Each aspect shows influence: (challenging) / (harmonious) / (dynamic)
- VoC moon and next ingress are shown if applicable

### Section B — Sign-Specific Framing

Two components:

1. **Sign Trait Blurb** — 2-3 sentence character sketch from `signTraits.ts`.
   Example for Cancer: *"Cancer moves through the world by feel — atmospheres
   land before words do, and the body's memory holds what the mind has moved
   on from."*

2. **Hook Angle** — Each sign has a distinct **psychological angle type**
   that its daily hook must follow. This ensures the 12 signs never share
   the same opening style on any given day.

| Sign | Hook Angle | Description |
|------|------------|-------------|
| Aries | `confrontation_and_courage` | Challenge they've been avoiding |
| Taurus | `comfort_zone_disruption` | What comfort is costing them |
| Gemini | `information_and_perspective` | Shift in understanding |
| Cancer | `emotional_stakes_and_protection` | What they're really feeling |
| Leo | `recognition_and_expression` | Stop performing, start being real |
| Virgo | `precision_and_letting_go` | The detail that actually matters |
| Libra | `decision_and_balance` | Decision they keep circling |
| Scorpio | `revelation_and_truth` | Something they sense but haven't named |
| Sagittarius | `expansion_and_horizon` | Unexpected opening |
| Capricorn | `structure_and_redefinition` | Redefinition of success |
| Aquarius | `pattern_disruption_and_truth` | Seeing what others don't |
| Pisces | `boundary_and_truth` | Feeling what isn't theirs to carry |

Each angle includes 3 example hooks. The LLM is told: "vary daily — never
reuse verbatim."

### Section C — Output Schema + Rules

Specifies the exact JSON output structure with character limits, plus two
critical rule sets:

**Jargon Blacklist** — These terms must NEVER appear in output:
- Planet names, aspect names, house numbers
- "Retrograde", "ingress", "stellium", "orb", "transit", "natal", "chart"
- Elements used as astrology terms (fire/earth/air/water)
- Phrases like "the stars align", "cosmic energy", "the universe wants"

**Translation Examples:**
- "Mercury retrograde" → "conversations and plans may need revisiting"
- "Venus trine Jupiter" → "relationships carry unexpected warmth today"
- "Mars square Pluto" → "there's a pressure building — handle it deliberately"
- "Full Moon" → "things that have been building are ready to surface"

**Tone Rules:**
1. Write like a psychologically literate friend — direct, warm, specific
2. Be PRECISE — not "something may shift" but "the conversation you've been avoiding needs to happen"
3. The reader should feel: "Wait, how does this know that about me?"
4. Vary sentence structure — never start more than one sentence the same way
5. Hook must be immediately rational — no mysticism required

## System Prompt

```
[v2.0] You are a horoscope writer for a mainstream digital publication
read by millions. Your #1 priority is making readers feel seen — like
the horoscope was written specifically for them.
```

The system prompt establishes the writer persona and the core translation
principle: read astronomy like a weather report, write like a friend who
understands the sky.