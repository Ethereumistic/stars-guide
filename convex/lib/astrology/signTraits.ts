/**
 * signTraits.ts — Hardcoded per-sign character sketches for prompt section B.
 *
 * These are 2-3 sentence archetypes used as part of the horoscope generation
 * prompt. They describe the core energy of each zodiac sign — the lens through
 * which the reader is invited to see their day.
 *
 * Each entry is plain text, no markdown, 2-3 sentences, one paragraph.
 * Keep language universal: no astrological jargon overload.
 */

export type SignTraitEntry = {
    /** Canonical zodiac sign name. */
    sign: string;
    /** 2-3 sentence character sketch. */
    traitBlurb: string;
};

const SIGN_TRAITS: SignTraitEntry[] = [
    {
        sign: "Aries",
        traitBlurb:
            "Aries energy is the spark that catches before anyone else sees the flame. There is a rawness here, an impatience with hesitation — you feel things before you understand them, and that instinct is your compass today. Restlessness lives in the bones of this sign, but so does a fierce willingness to move first.",
    },
    {
        sign: "Taurus",
        traitBlurb:
            "Taurus sees the world through what can be held, built, or trusted. There is a slow intelligence in the body's knowing — comfort and beauty are not luxuries but language. Today that steadiness may quietly resist pressure to rush; patience is not delay, it is the shape of care.",
    },
    {
        sign: "Gemini",
        traitBlurb:
            "Gemini moves through the world in motion — ideas sparking off other ideas, meaning made in the connection between things. There is a bright surface restlessness here, but underneath runs a genuine hunger to understand. Today the mind wants conversation, and something overheard may land with unexpected weight.",
    },
    {
        sign: "Cancer",
        traitBlurb:
            "Cancer moves through the world by feel — atmospheres land before words do, and the body's memory holds what the mind has moved on from. There is deep sensitivity in the bones of this sign, a loyalty to things the rational mind would call irrational. Today the heart knows things the head is still catching up to.",
    },
    {
        sign: "Leo",
        traitBlurb:
            "Leo carries a particular kind of warmth that wants to be seen — not vanity, but the need for genuine recognition, the difference between performing and simply radiating. Underneath the brightness is an ache for meaningful witness. Today that pull toward authenticity is the thread worth following.",
    },
    {
        sign: "Virgo",
        traitBlurb:
            "Virgo sees the gap between what is and what it should be — the world is always slightly off-pattern, slightly needing correction. There is real usefulness in this eye, but also a trap: the compulsive refinement of things that are already enough. Today the signal worth watching is the difference between care and criticism.",
    },
    {
        sign: "Libra",
        traitBlurb:
            "Libra reads the room before speaking — the shape of the space, who stands where, what is balanced and what has tipped. There is a diplomatic intelligence here, a talent for seeing both sides, but also a reluctance to commit to a side at all. Today the invitation is to let preference be formed before it's weighed against everyone else's.",
    },
    {
        sign: "Scorpio",
        traitBlurb:
            "Scorpio moves through the world in depths — what is hidden, what is really underneath, what people mean when they say something other than what they said. There is a probing intensity here that most signs find uncomfortable to witness. Today that investigative instinct is sharpest when pointed inward rather than outward.",
    },
    {
        sign: "Sagittarius",
        traitBlurb:
            "Sagittarius moves toward what lies beyond the horizon — meaning, experience, the next idea that makes all previous ideas feel small. There is an expansive restlessness here, a belief that the truth is always a little further out. Today that hunger for meaning is best directed toward the questions that don't resolve quickly.",
    },
    {
        sign: "Capricorn",
        traitBlurb:
            "Capricorn measures the world by what lasts — status, structure, the climb, the summit, and the question of whether it was worth it. There is real ambition here, a willingness to do difficult things for difficult things' sake. Today the inner critic that holds the standard is worth listening to, but also worth asking whether the standard is the right one.",
    },
    {
        sign: "Aquarius",
        traitBlurb:
            "Aquarius stands apart from the crowd — not always by choice but by perception, seeing patterns others swim through without noticing. There is an original intelligence here that resists belonging as a value in itself. Today that slightly outside view is a strength, especially when it notices something the group has normalised.",
    },
    {
        sign: "Pisces",
        traitBlurb:
            "Pisces moves through the world in permeability — boundaries are suggestions, other people's moods are atmosphere, and the difference between self and other blurs without warning. There is real mysticism here, a connection to things that don't have names. Today sensitivity is an instrument, but only if the instrument is calibrated with care.",
    },
];

/**
 * getSignTrait — Returns the trait blurb for a canonical sign name.
 * Case-sensitive lookup; returns a generic fallback for unknown signs.
 */
export function getSignTrait(sign: string): string {
    return (
        SIGN_TRAITS.find((t) => t.sign === sign)?.traitBlurb ??
        `The ${sign} nature carries a particular energy that is best understood by paying attention to what feels most characteristic right now.`
    );
}

/**
 * getAllSignTraits — Returns the full list of sign entries.
 */
export function getAllSignTraits(): SignTraitEntry[] {
    return SIGN_TRAITS;
}