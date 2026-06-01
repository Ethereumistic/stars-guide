# Energy Signature — Derivation Logic

Source: `convex/lib/astrology/contextBuilder.ts`

The energy signature is a **rule-based composite string** (no LLM involved)
that summarizes the day's overall energetic quality. It is composed of
multiple tokens joined by commas.

## Derivation Algorithm

`deriveEnergySignature(positions, moonPhaseName, aspects)` builds tokens from
5 independent axes:

### Axis 1 — Elemental Base

The element with the most planets becomes the first token.

Element mapping per sign:
- Fire: Aries, Leo, Sagittarius
- Earth: Taurus, Virgo, Capricorn
- Air: Gemini, Libra, Aquarius
- Water: Cancer, Scorpio, Pisces

Count all planets (including Sun and Moon) in each element. The element with
the highest count wins. Ties are broken by which element's planet appears
first in the `planetPositions` array. If no planets exist, defaults to
"earth". In practice, because the Sun is always first and is frequently in
Fire or Water, ties rarely result in a predictable default.

**Output:** `"fire"` | `"earth"` | `"air"` | `"water"`

### Axis 2 — Moon Phase Direction

Classifies the moon phase into inward vs outward energy:

| Phase Includes | Token |
|----------------|-------|
| "new" or "waning" | `"inward"` |
| "full" or "waxing" | `"outward"` |

**Output:** `"inward"` | `"outward"`

### Axis 3 — Retrograde Depth

Counts planets currently retrograde:

| Retrograde Count | Token |
|------------------|-------|
| ≥ 2 | `"internal"` |
| 1 | `"reflective"` |
| 0 | (no token added) |

Additionally, if 2+ retrogrades and Mercury is among them → `"revisiting"`
If 2+ retrogrades and Mars is among them → `"delayed_action"`
If 2+ retrogrades and Pluto is among them → `deep_transformation`

**Output:** `"internal"` or `"reflective"` (optional), plus `"revisiting"` / `"delayed_action"`

### Axis 4 — Aspect Tone

Compares hard aspects (squares + oppositions) vs soft aspects (trines + sextiles):

| Condition | Token |
|-----------|-------|
| hardCount > softCount | `"intense"` |
| softCount > hardCount | `"harmonious"` |
| equal | `"balanced"` |

**Output:** `"intense"` | `"harmonious"` | `"balanced"`

### Axis 5 — Stellium Modifier

If any sign has 3+ planets (stellium), adds `"concentrated"`.

**Output:** `"concentrated"` (or nothing)

## Example Signatures

| Day | Signature |
|-----|-----------|
| Many fire planets, New Moon, 3 retrogrades including Mercury, more hard aspects, stellium in Leo | `"fire, inward, internal, revisiting, intense, concentrated"` |
| Earth dominant, Full Moon, 1 retrograde, more soft aspects, no stellium | `"earth, outward, reflective, harmonious"` |
| Air + water tied, Waxing Crescent, 0 retrogrades, balanced aspects, no stellium | Tie result depends on iteration order (see Axis 1 rule) |

## How the Signature Is Used

1. **Written to `daily_astrology_context.energySignature`** — persisted in DB
2. **Injected into prompt Section A** — appears as `ENERGY SIGNATURE: fire, inward, intense`
   next to the astronomical context
3. The LLM is instructed to use this as background tone guidance but never
   repeat it verbatim in output
4. **Displayed in admin Context Viewer** — the "Energy Signature" card shows
   the full token string

## Dominant Themes

Alongside the energy signature, `buildContext()` derives `dominantThemes` — an
array of keyword strings drawn from a planet-theme catalog:

```typescript
const PLANET_THEMES = {
    Sun:     ["identity", "vitality", "purpose"],
    Moon:    ["emotion", "instinct", "inner_life"],
    Mercury: ["communication", "thought", "short_travel"],
    Venus:   ["relationship", "value", "beauty"],
    Mars:    ["action", "desire", "assertion"],
    Jupiter: ["expansion", "belief", "growth"],
    Saturn:  ["structure", "discipline", "boundary"],
    Uranus:  ["breakthrough", "originality", "disruption"],
    Neptune: ["transcendence", "intuition", "dissolution"],
    Pluto:   ["transformation", "power", "rebirth"],
};
```

Every planet in the sky contributes its themes to the set. The result is a
union (deduplicated) of all theme keywords. Example output:
`["identity", "vitality", "purpose", "communication", "thought", "action", "expansion", "structure"]`

## Aspect Summary

`summariseAspects()` counts aspect types and produces pattern descriptors:

| Pattern | Condition | Token |
|---------|-----------|-------|
| Focal point | ≥ 2 conjunctions | `"focal_point"` |
| Dynamic tension | ≥ 3 hard aspects (squares + oppositions) | `"dynamic_tension"` |
| Harmonic flow | ≥ 2 trines | `"harmonic_flow"` |
| Opportunistic | ≥ 2 sextiles | `"opportunistic"` |
| Polarity axis | ≥ 2 oppositions | `"polarity_axis"` |

Multiple tokens can be emitted. Example: `["focal_point", "dynamic_tension", "polarity_axis"]`

### Unused: ASPECT_THEME_MODIFIERS

`contextBuilder.ts` defines an `ASPECT_THEME_MODIFIERS` map that can push
additional theme tokens based on active aspect types (e.g., "fusion",
"intensity" for conjunctions). This modifier is **currently not used** in
`buildContext()` — it exists as a future expansion point. The energy
signature and aspect summary are derived purely from the 5 axes documented
above.