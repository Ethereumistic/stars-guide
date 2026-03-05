// ─────────────────────────────────────────────────────────────────────────────
// aspects.ts
// Complete astrological aspects data — factual, production-ready.
// Covers all 5 Ptolemaic major aspects + 8 widely-used minor/harmonic aspects.
// Orb values reflect the modern consensus (wider for luminaries, tighter for minors).
// ─────────────────────────────────────────────────────────────────────────────

export type AspectCategory = "major" | "minor" | "harmonic";
export type AspectNature = "hard" | "soft" | "neutral" | "variable";
export type HarmonicSeries = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12;

export interface OrbConfig {
    /** Standard orb (degrees) when neither planet is a luminary */
    standard: number;
    /** Widened orb when the Sun or Moon is one of the two planets */
    withLuminary: number;
    /** Tightest acceptable orb for the aspect to still be considered active */
    tight: number;
}

export interface AspectData {
    id: string;                         // Unique slug, e.g. "conjunction"
    name: string;                       // Display name, e.g. "Conjunction"
    alternateNames: string[];           // All recognised synonyms
    symbol: string;                     // Astrological glyph (Unicode where available)
    degrees: number;                    // Exact angular distance
    degreesExact: string;               // Human-readable, e.g. "0°" or "51°25'43\""
    fraction: string;                   // Circle fraction, e.g. "1/1" or "1/7"
    harmonicNumber: HarmonicSeries;     // The harmonic series this belongs to
    category: AspectCategory;
    nature: AspectNature;
    orb: OrbConfig;

    // Core interpretive data
    coreKeywords: string[];             // 4-6 single-word essence descriptors
    psychologicalFunction: string;      // What this aspect *does* in the psyche
    developmentalTheme: string;         // The growth arc or life challenge it presents
    expressionEasy: string;             // How it manifests when well-integrated
    expressionChallenged: string;       // How it manifests when suppressed or unresolved
    inNatalChart: string;               // What a natal occurrence indicates
    inTransit: string;                  // What it means as a transit or progression
    inSynastry: string;                 // What it means in relationship chart comparison

    // Structural / technical
    signsApart: number | null;          // How many whole signs separate the two planets (null if non-integer)
    compatibleElements: boolean;        // Do the two planets typically share compatible elements?
    sharedModality: boolean;            // Do the two planets typically share the same modality?
    aspectPatterns: string[];           // Larger configurations this aspect participates in

    // Historical / theoretical context
    tradition: string;                  // Which tradition introduced or formalized it
    ptolemaic: boolean;                 // Defined by Ptolemy (1st c. AD)?
    keplerIntroduced: boolean;          // Introduced/formalised by Kepler (Harmonice Mundi, 1619)?
}

export const compositionalAspects: AspectData[] = [

    // ─── MAJOR ASPECTS (Ptolemaic) ───────────────────────────────────────────

    {
        id: "conjunction",
        name: "Conjunction",
        alternateNames: ["Con", "Cnj"],
        symbol: "☌",
        degrees: 0,
        degreesExact: "0°",
        fraction: "1/1",
        harmonicNumber: 1,
        category: "major",
        nature: "variable",
        orb: { standard: 8, withLuminary: 10, tight: 3 },
        coreKeywords: ["Fusion", "Amplification", "Focus", "Intensity", "Unity"],
        psychologicalFunction: "The conjunction merges two planetary principles so completely that the native experiences them as a single, undivided drive. There is no internal separation between the two energies — they act simultaneously, making their combined influence both highly focused and difficult to perceive objectively. The conjunction is, in effect, a personal blind spot: the native is so identified with the merged energy that they rarely see it from the outside.",
        developmentalTheme: "Learning to see and consciously direct a fused energy. The task is not to separate the planets, but to become aware of the combined signature and wield it deliberately rather than unconsciously. The conjunction often represents the area of life where a person is most intensely themselves.",
        expressionEasy: "Laser-focused potency. The two planetary principles reinforce and supercharge each other, producing extraordinary capability in the domain they govern. The native acts with natural authority and conviction in this area.",
        expressionChallenged: "Compulsion, overwhelm, or narcissism in the matters ruled by the conjunct planets. Because the energies blend indiscriminately, a difficult conjunction (e.g. Mars-Saturn) can produce chronic self-sabotage or a permanent internal war between assertive and restrictive impulses.",
        inNatalChart: "Marks a dominant psychological complex. The conjunct planets become a core engine of the personality. Their combined sign and house placement is one of the most defining features of the chart.",
        inTransit: "A transiting conjunction acts as a trigger or ignition. It marks the beginning of a new cycle between the transiting and natal planet — the conjunction is the 'new moon' phase of any planetary cycle. Events tend to be initiating, sudden, or unusually concentrated.",
        inSynastry: "Creates powerful points of identification and intensity between two people. One person's planet landing on the other's often feels fated or magnetic. The nature of the planets involved determines whether the fusion is harmonious, challenging, or overwhelming.",
        signsApart: 0,
        compatibleElements: true,
        sharedModality: true,
        aspectPatterns: ["Stellium", "Grand Conjunction", "Cazimi"],
        tradition: "Ptolemaic / Babylonian",
        ptolemaic: true,
        keplerIntroduced: false,
    },

    {
        id: "sextile",
        name: "Sextile",
        alternateNames: ["Sxt", "Sex"],
        symbol: "⚹",
        degrees: 60,
        degreesExact: "60°",
        fraction: "1/6",
        harmonicNumber: 6,
        category: "major",
        nature: "soft",
        orb: { standard: 5, withLuminary: 6, tight: 1 },
        coreKeywords: ["Opportunity", "Cooperation", "Talent", "Flow", "Communication"],
        psychologicalFunction: "The sextile creates a productive, cooperative channel between two planetary principles. The two planets are in complementary but distinct elements (fire-air or earth-water), meaning they understand each other's language without being identical. This aspect reveals talent and opportunity — but unlike the trine, sextile energy does not activate itself passively. It requires conscious initiative to unlock its potential.",
        developmentalTheme: "Recognising and actively developing latent talents. The sextile represents skills that exist and can be cultivated, but will lie dormant without deliberate effort. It shows where consistent, conscious action yields disproportionate reward.",
        expressionEasy: "Elegant problem-solving, intellectual dexterity, and harmonious collaboration in the areas governed by the two planets. The native finds these domains enjoyable and productive when they engage with them actively.",
        expressionChallenged: "Complacency. Because sextile energy is pleasant but requires activation, it is commonly wasted — the native has the talent but never fully develops it. The opportunity window can close without being seized.",
        inNatalChart: "Indicates areas of natural aptitude and interpersonal ease. Multiple sextiles often create a sociable, adaptable personality with broad but not always deep capabilities.",
        inTransit: "Marks windows of opportunity that require initiative to realise. Transiting sextiles rarely deliver outcomes without corresponding effort, but effort during a sextile transit tends to be efficient and well-received.",
        inSynastry: "Indicates enjoyable, productive cooperation. Sextile connections in synastry suggest the two people bring out each other's talents and communicate well, though the relationship may lack the magnetic intensity of harder aspects.",
        signsApart: 2,
        compatibleElements: true,
        sharedModality: false,
        aspectPatterns: ["Grand Sextile", "Mystic Rectangle", "Yod (base)"],
        tradition: "Ptolemaic",
        ptolemaic: true,
        keplerIntroduced: false,
    },

    {
        id: "square",
        name: "Square",
        alternateNames: ["Sqr", "□"],
        symbol: "□",
        degrees: 90,
        degreesExact: "90°",
        fraction: "1/4",
        harmonicNumber: 4,
        category: "major",
        nature: "hard",
        orb: { standard: 8, withLuminary: 10, tight: 3 },
        coreKeywords: ["Tension", "Friction", "Growth", "Action", "Crisis"],
        psychologicalFunction: "The square places two planetary principles in direct, irreconcilable tension. The two planets occupy signs of the same modality (both cardinal, fixed, or mutable) but in incompatible elements, creating an internal conflict that demands resolution. This friction is the engine of personal development — the square is the aspect most responsible for building character, discipline, and resilience.",
        developmentalTheme: "Transforming internal conflict into capability. Squares represent the obstacles and blind spots that must be confronted and integrated rather than avoided. They push the native out of complacency and into action, often repeatedly, until mastery is achieved. The square is frequently where the most meaningful growth occurs.",
        expressionEasy: "High-energy initiative, tenacity, and the ability to thrive under pressure. A well-integrated square produces someone who knows how to mobilise energy against resistance and does not shy away from difficult work.",
        expressionChallenged: "Chronic frustration, compulsive behaviour, or a destructive cycle of attempts and failures in the area governed by the squared planets. The native feels perpetually blocked or at war with themselves. Self-sabotage is common before integration.",
        inNatalChart: "Marks core psychological complexes and areas of sustained challenge. The planets in square represent a lifelong tension that becomes a source of either dysfunction or exceptional achievement depending on the level of integration.",
        inTransit: "One of the most active and event-producing transits. Squares from outer planets to natal planets mark turning points, crises, and periods demanding decisive action. They rarely pass without external circumstances forcing a choice or change.",
        inSynastry: "Creates intense chemistry and friction simultaneously. Square contacts between charts can be magnetically attractive because of the tension they generate, but they also produce the most persistent conflicts and power struggles in relationships.",
        signsApart: 3,
        compatibleElements: false,
        sharedModality: true,
        aspectPatterns: ["T-Square", "Grand Cross", "Grand Square"],
        tradition: "Ptolemaic",
        ptolemaic: true,
        keplerIntroduced: false,
    },

    {
        id: "trine",
        name: "Trine",
        alternateNames: ["Tri", "△"],
        symbol: "△",
        degrees: 120,
        degreesExact: "120°",
        fraction: "1/3",
        harmonicNumber: 3,
        category: "major",
        nature: "soft",
        orb: { standard: 8, withLuminary: 10, tight: 3 },
        coreKeywords: ["Harmony", "Ease", "Talent", "Grace", "Flow"],
        psychologicalFunction: "The trine connects two planetary principles operating in the same element (both fire, earth, air, or water), producing a state of natural, frictionless flow. The two energies understand and reinforce each other without effort. The trine represents innate talent, gifts that feel so natural that the native often takes them for granted or fails to develop them consciously.",
        developmentalTheme: "Honouring and consciously developing natural gifts rather than assuming they will sustain themselves. The trine's challenge is the very ease it offers — because these energies function automatically, the native may never push them to their full potential. Too many trines in a chart can indicate someone who coasts on natural ability rather than building true mastery.",
        expressionEasy: "Effortless competence, natural grace, and a sense of flow in the areas governed by the trine planets. The native succeeds in these domains with minimal effort and often inspires others through their apparent ease.",
        expressionChallenged: "Complacency, untapped potential, and a surprising vulnerability to adversity in areas that have always come easily. Without challenge, trine gifts are rarely taken to their ceiling. The 'gifted child syndrome' — succeeding early but underperforming under real pressure later — is a common trine shadow.",
        inNatalChart: "Marks areas of natural talent, psychological ease, and inherited strengths. Often shows where the native finds joy and flow, and what domains will support rather than challenge them throughout life.",
        inTransit: "Periods of relative ease, support, and positive momentum. Transiting trines are opportunities to consolidate and build — but they tend not to force action, and can pass without being fully utilised. Best used to implement plans already in motion.",
        inSynastry: "Indicates natural harmony and ease between two people in the areas governed by the planets. Trine contacts produce comfortable, low-conflict dynamics where both parties bring out the best in each other intuitively.",
        signsApart: 4,
        compatibleElements: true,
        sharedModality: false,
        aspectPatterns: ["Grand Trine", "Kite", "Grand Sextile"],
        tradition: "Ptolemaic",
        ptolemaic: true,
        keplerIntroduced: false,
    },

    {
        id: "opposition",
        name: "Opposition",
        alternateNames: ["Opp", "☍"],
        symbol: "☍",
        degrees: 180,
        degreesExact: "180°",
        fraction: "1/2",
        harmonicNumber: 2,
        category: "major",
        nature: "hard",
        orb: { standard: 8, withLuminary: 10, tight: 3 },
        coreKeywords: ["Polarity", "Projection", "Awareness", "Relationship", "Balance"],
        psychologicalFunction: "The opposition places two planetary principles at maximum separation — directly across the zodiac wheel. Unlike the square's internal friction, the opposition is inherently relational: the tension is externalised, and the native tends to identify with one planet while projecting the other onto other people or circumstances. This makes the opposition the primary aspect of relational learning and psychological mirror work.",
        developmentalTheme: "Integrating polarised energies by owning both sides of the opposition rather than projecting one onto others. The arc of growth moves from unconscious projection → awareness of the polarity → genuine integration. Oppositions mark the beginning of self-knowledge through relationship — they show us what we cannot yet see in ourselves by placing it outside us.",
        expressionEasy: "Exceptional awareness and objectivity in the domain of the opposed planets. The well-integrated opposition produces someone capable of holding two opposing truths simultaneously, making them skilled mediators, strategists, and counsellors.",
        expressionChallenged: "Chronic projection, unresolvable conflict with others, and a feeling of being perpetually pulled between two irreconcilable demands. The native may attract people who embody the planet they are projecting, leading to repetitive relationship patterns until the projection is withdrawn.",
        inNatalChart: "Marks core relationship patterns and psychological projections. The planets in opposition show what the native will be most likely to project onto others and the primary tensions requiring integration in intimate relationships and partnerships.",
        inTransit: "Heightens awareness and relational friction. Transiting oppositions bring the themes of the natal planet into sharp focus through events and encounters with others. Full Moons are the most common example: the Sun-Moon opposition produces a peak of emotional and relational awareness every month.",
        inSynastry: "Opposition contacts between charts are among the most compelling and frequently found in significant partnerships. They create the 'mirror effect' where each person embodies something the other needs to integrate. Powerfully attractive, but prone to persistent conflict if projection is not resolved.",
        signsApart: 6,
        compatibleElements: true,
        sharedModality: true,
        aspectPatterns: ["T-Square", "Grand Cross", "Kite (opposition axis)", "Mystic Rectangle"],
        tradition: "Ptolemaic",
        ptolemaic: true,
        keplerIntroduced: false,
    },

    // ─── MINOR ASPECTS ───────────────────────────────────────────────────────

    {
        id: "semisextile",
        name: "Semi-Sextile",
        alternateNames: ["SSxt", "Duodecile"],
        symbol: "⊻",
        degrees: 30,
        degreesExact: "30°",
        fraction: "1/12",
        harmonicNumber: 12,
        category: "minor",
        nature: "neutral",
        orb: { standard: 2, withLuminary: 3, tight: 0.5 },
        coreKeywords: ["Adjustment", "Awkward", "Latent", "Subtle", "Adjacent"],
        psychologicalFunction: "The semi-sextile connects planets one sign apart — signs which are always adjacent but fundamentally different in element and quality. This creates a relationship that is close yet incongruous: the two energies are aware of each other but do not naturally communicate well. It is a minor, subtle aspect that can feel like a background hum of mild discomfort or adjustment.",
        developmentalTheme: "Managing the discomfort of two adjacent but incompatible energies. Because neighbouring signs are always in different elements and modalities, the semi-sextile rarely resolves into genuine harmony. The growth it offers is the capacity to tolerate ambiguity and make continual small adjustments.",
        expressionEasy: "Mild supplementary talent or an ability to bridge two otherwise unrelated areas of life. Can function as a low-level facilitator when part of a larger configuration.",
        expressionChallenged: "A persistent low-grade friction or unease between two areas of life that refuse to fully integrate. The native may feel a vague sense of incompatibility between the planetary principles involved.",
        inNatalChart: "A subtle background tension or mild awkwardness between the two planets. Rarely a defining feature of the chart but can add nuance when the planets are otherwise strongly placed.",
        inTransit: "Barely perceptible. Generally only considered when reinforced by simultaneous stronger transits involving the same planets.",
        inSynastry: "Very minor influence. May add a subtle note of dissonance or mild cross-stimulation in the areas governed by the planets.",
        signsApart: 1,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Yod (semi-sextile variant)", "Stellium-adjacent"],
        tradition: "Medieval / Ptolemaic-era extension",
        ptolemaic: false,
        keplerIntroduced: false,
    },

    {
        id: "semisquare",
        name: "Semi-Square",
        alternateNames: ["SSqr", "Octile", "Semi-Quartile"],
        symbol: "∠",
        degrees: 45,
        degreesExact: "45°",
        fraction: "1/8",
        harmonicNumber: 8,
        category: "minor",
        nature: "hard",
        orb: { standard: 2, withLuminary: 3, tight: 0.5 },
        coreKeywords: ["Irritation", "Inner Conflict", "Friction", "Restlessness", "Agitation"],
        psychologicalFunction: "The semi-square is a minor hard aspect (half of a square) that generates internal friction and low-level irritation rather than the full confrontational tension of a square. It is associated with psychological restlessness, a nagging sense that something needs to change, and internal conflict that bubbles beneath the surface rather than exploding into crisis.",
        developmentalTheme: "Managing background frustration and restlessness without allowing it to calcify into chronic dissatisfaction. The semi-square's challenge is its subtlety — because it rarely forces a crisis, it can persist unaddressed for years. It invites the native to tend to small internal misalignments before they compound.",
        expressionEasy: "Productive restlessness, a driven quality, and the ability to notice and act on subtle inefficiencies before they become major problems.",
        expressionChallenged: "Chronic low-grade frustration, passive-aggression, and a persistent undercurrent of dissatisfaction or agitation in the matters governed by the two planets. The native feels bothered but cannot easily articulate why.",
        inNatalChart: "A background source of tension and inner friction that may not be immediately apparent but exerts a consistent pressure on the matters governed by the planets involved.",
        inTransit: "Most noticeable when part of a larger pattern. A transiting semi-square to a natal planet can trigger minor conflicts, irritations, or disruptions, particularly when combined with a simultaneous square or opposition from another transiting planet.",
        inSynastry: "Adds a subtle note of friction or restlessness between two people. Not enough to define a relationship but may contribute to recurring minor irritants.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Semi-Square / Sesquiquadrate pair"],
        tradition: "Kepler / Extended Ptolemaic",
        ptolemaic: false,
        keplerIntroduced: true,
    },

    {
        id: "quintile",
        name: "Quintile",
        alternateNames: ["Q", "5th Harmonic"],
        symbol: "Q",
        degrees: 72,
        degreesExact: "72°",
        fraction: "1/5",
        harmonicNumber: 5,
        category: "minor",
        nature: "soft",
        orb: { standard: 2, withLuminary: 2.5, tight: 0.5 },
        coreKeywords: ["Creativity", "Talent", "Pattern", "Craft", "Genius"],
        psychologicalFunction: "The quintile belongs to the fifth harmonic series, derived by dividing the circle into five equal parts. It is associated with the geometric symbolism of the pentagram — the shape of Venus's orbital pattern as seen from Earth — linking this aspect to creative intelligence, aesthetic sensibility, and the impulse to impose structure on chaos. The quintile indicates a distinctive talent or creative capability that often manifests as a specific, recognisable skill or way of perceiving the world.",
        developmentalTheme: "Developing and refining a specific creative or intellectual gift into genuine mastery. The quintile points to where a person has a natural aesthetic eye or structural intelligence — not just talent, but a particular mode of seeing and making. The challenge is that quintile gifts can be highly individual and not immediately legible to others.",
        expressionEasy: "Exceptional craft, creative intelligence, and the ability to find elegant patterns and solutions. The native often has an unusual or distinctive aesthetic or intellectual signature in the area governed by the quintile planets.",
        expressionChallenged: "Perfectionism, an obsessive relationship with craft, or an inability to share or transmit the gift because it feels too personal or rarefied. The talent may be real but exist in a register that is difficult to communicate.",
        inNatalChart: "Indicates a specific creative, intellectual, or technical gift. Most effective when narrow in orb (under 2°). Particularly significant when both planets are strong by sign or house placement.",
        inTransit: "Rarely producing events on its own; more likely to illuminate or activate a natal quintile configuration. Marks periods of creative insight or productive refinement.",
        inSynastry: "A subtle indicator of creative compatibility or intellectual resonance. Quintile connections between charts can produce a strong sense of aesthetic kinship or mutual creative stimulation.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Grand Quintile (5 planets in quintile series)", "Biquintile pair"],
        tradition: "Kepler — Harmonice Mundi (1619)",
        ptolemaic: false,
        keplerIntroduced: true,
    },

    {
        id: "sesquiquadrate",
        name: "Sesquiquadrate",
        alternateNames: ["SesqSqr", "Sesquisquare", "Trioctile", "135°"],
        symbol: "⚼",
        degrees: 135,
        degreesExact: "135°",
        fraction: "3/8",
        harmonicNumber: 8,
        category: "minor",
        nature: "hard",
        orb: { standard: 2, withLuminary: 3, tight: 0.5 },
        coreKeywords: ["Agitation", "External Friction", "Karmic Tension", "Disruption", "Release"],
        psychologicalFunction: "The sesquiquadrate is the companion to the semi-square: both belong to the eighth harmonic series. Where the semi-square produces internal friction, the sesquiquadrate tends to manifest as external disruption — obstacles, interference, and irritants that originate outside the native. It carries a karmic quality in traditional interpretation, as if circumstances conspire to challenge the native in the area governed by the two planets.",
        developmentalTheme: "Learning to navigate persistent external disruptions without becoming reactive or defeated. The sesquiquadrate asks the native to respond to agitation from the outside world with composure and strategic adjustment rather than frustration or resistance.",
        expressionEasy: "Resilience and adaptability in the face of recurring external friction. The native who has integrated this aspect becomes genuinely skilled at operating under conditions of disruption.",
        expressionChallenged: "Recurring external conflicts, interference from others, or a pattern of being blocked in the matters governed by the planets. The native may feel victimised by circumstance or perpetually disrupted by factors outside their control.",
        inNatalChart: "A background source of external tension. Less defining than a square but more consistently present in the life as a subtle recurring friction in the areas it governs.",
        inTransit: "Can trigger external disruptions, minor conflicts, or irritating obstacles. Most significant when both the sesquiquadrate and a semi-square from the same transiting planet are in effect simultaneously — together they form a 'hammer' configuration.",
        inSynastry: "Contributes a note of recurring external friction between two people. Often produces petty irritants or misunderstandings that erode goodwill over time if not addressed.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Thor's Hammer / Fist of God (two sesquiquadrates to a base square)"],
        tradition: "Kepler / Extended Ptolemaic",
        ptolemaic: false,
        keplerIntroduced: true,
    },

    {
        id: "quincunx",
        name: "Quincunx",
        alternateNames: ["Inconjunct", "QCnx", "Quinduodecile"],
        symbol: "⚻",
        degrees: 150,
        degreesExact: "150°",
        fraction: "5/12",
        harmonicNumber: 12,
        category: "minor",
        nature: "hard",
        orb: { standard: 3, withLuminary: 5, tight: 1 },
        coreKeywords: ["Adjustment", "Misalignment", "Redirection", "Karmic", "Imbalance"],
        psychologicalFunction: "The quincunx (or inconjunct) connects two planets that share neither element, modality, nor polarity — they have nothing in common structurally. Unlike the opposition, which at least connects signs of matching modality and compatible elements, the quincunx creates a truly alien relationship: the two planets cannot find a shared framework. The result is a persistent need for adjustment and redirection — the energies do not resolve, they require continual management.",
        developmentalTheme: "Mastering the art of continual adjustment without resolution. The quincunx does not offer a permanent solution because the two planetary principles cannot truly integrate — they can only be balanced through ongoing, conscious effort. It often marks areas of life where the native feels perpetually 'off' in a way that is hard to diagnose or fix.",
        expressionEasy: "Flexibility, resourcefulness, and an unusual ability to function across incommensurable domains. The native who has learned to work with a quincunx develops a distinctive capacity for managing paradox and discontinuity.",
        expressionChallenged: "Chronic misalignment, a nagging sense of imbalance that cannot be resolved, and recurring health, work, or relationship issues that defy simple diagnosis. The inconjunct is associated with adjustment crises — circumstances that force the native to rethink a fundamental area of life repeatedly.",
        inNatalChart: "A persistent source of adjustment and redirection. Often associated with health issues, career pivots, or relationship patterns that require unusual levels of adaptive management. Highly significant when part of a Yod configuration.",
        inTransit: "Marks periods of necessary course-correction and enforced adjustment. Outer planet quincunxes to natal personal planets can accompany health crises, career disruptions, or relationship realignments that feel disorienting but ultimately redirecting.",
        inSynastry: "Creates a subtle but persistent sense of incompatibility or mutual adjustment between two people. Partners with significant quincunx contacts often feel they cannot quite align, leading to chronic compromise in the areas governed by the planets.",
        signsApart: 5,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Yod / Finger of God (two quincunxes to apex planet)", "Boomerang Yod"],
        tradition: "Ptolemaic-era extension / Kepler formalised",
        ptolemaic: false,
        keplerIntroduced: true,
    },

    {
        id: "biquintile",
        name: "Bi-Quintile",
        alternateNames: ["BQ", "5th Harmonic (2nd)"],
        symbol: "bQ",
        degrees: 144,
        degreesExact: "144°",
        fraction: "2/5",
        harmonicNumber: 5,
        category: "harmonic",
        nature: "soft",
        orb: { standard: 2, withLuminary: 2.5, tight: 0.5 },
        coreKeywords: ["Mastery", "Occult Talent", "Power", "Creative Authority", "Pattern Recognition"],
        psychologicalFunction: "The bi-quintile is the second aspect in the fifth harmonic series (144° = 2 × 72°). While the quintile points to creative talent in development, the bi-quintile is associated with a more mature, powerful expression of that same creative or structural intelligence. The five lines of the pentagram are each 144° arcs — the bi-quintile carries the full symbolism of the pentagram, associated with mastery, occult understanding, and the ability to work with subtle forces.",
        developmentalTheme: "Actualising and wielding creative or intellectual power at a high level. The bi-quintile indicates a capability that has moved beyond raw talent into genuine authority. The developmental task is to use this power ethically and in service of something larger than the ego.",
        expressionEasy: "Distinctive mastery, creative authority, and an unusual ability to work with complex systems, patterns, or forces. The native commands respect in their area of talent and may produce work of lasting value.",
        expressionChallenged: "Arrogance, an obsessive relationship with power or craft, or the misuse of genuine capability. The shadow of the bi-quintile is the belief that superior ability justifies bypassing ethical constraints.",
        inNatalChart: "Indicates a high-order creative or intellectual capability. Especially significant at very tight orbs (under 1°). Most potent when both planets are angular or otherwise prominent.",
        inTransit: "Rarely significant on its own; most notable when it activates a natal bi-quintile or quintile configuration.",
        inSynastry: "A powerful indicator of creative or intellectual partnership at a high level. Two people with strong bi-quintile connections between their charts may produce exceptional collaborative work together.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Grand Quintile", "Pentagram pattern"],
        tradition: "Kepler — Harmonice Mundi (1619)",
        ptolemaic: false,
        keplerIntroduced: true,
    },

    {
        id: "septile",
        name: "Septile",
        alternateNames: ["Sep", "7th Harmonic"],
        symbol: "S7",
        degrees: 51.43,
        degreesExact: "51°25'43\"",
        fraction: "1/7",
        harmonicNumber: 7,
        category: "harmonic",
        nature: "neutral",
        orb: { standard: 1.5, withLuminary: 2, tight: 0.5 },
        coreKeywords: ["Fate", "Mystical", "Spiritual", "Compulsion", "Hidden Flow"],
        psychologicalFunction: "The septile belongs to the seventh harmonic series — the first non-rational division of the circle, since 360/7 = 51.428...°. Seven is the number most consistently associated with spiritual, mystical, and non-material dimensions across cultural and esoteric traditions. The septile indicates a hidden or fated flow of energy between two planetary principles — a connection that operates beneath the conscious level and is experienced as compulsion, synchronicity, or spiritual inevitability.",
        developmentalTheme: "Becoming conscious of and aligning with fated or karmic forces operating through the planets involved. The septile is not easily mastered — it operates in a register beyond ordinary will. The developmental task is to become aware of the pull it creates and to work with it consciously rather than being blindly driven by it.",
        expressionEasy: "Heightened spiritual sensitivity, a capacity for mystical experience, and a compelling, charismatic quality in the matters governed by the planets. The native may have a sense of being guided or compelled toward a particular path.",
        expressionChallenged: "Compulsive behaviour, a feeling of being driven by forces beyond one's control, or difficulty distinguishing between spiritual calling and psychological compulsion. The septile can produce a peculiar, obsessive quality that puzzles others.",
        inNatalChart: "Indicates a fated or spiritually loaded connection between two planetary principles. Most significant at very tight orbs. Prominent septiles often appear in the charts of artists, mystics, and people whose lives have an unusually fated quality.",
        inTransit: "Very tight orbs required. When a transiting outer planet forms an exact septile to a sensitive natal point, it can coincide with spiritual experiences, compulsive turning points, or encounters with the numinous.",
        inSynastry: "Creates a sense of fated connection or compulsion between two people. Septile contacts in synastry often accompany the feeling of having known someone before, or of being inexplicably drawn to them.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Biseptile (102°52') and Triseptile (154°17') complete the septile series"],
        tradition: "Dane Rudhyar (1938) / Robert Blaschke / harmonic astrology",
        ptolemaic: false,
        keplerIntroduced: false,
    },

    {
        id: "novile",
        name: "Novile",
        alternateNames: ["Nov", "9th Harmonic"],
        symbol: "N9",
        degrees: 40,
        degreesExact: "40°",
        fraction: "1/9",
        harmonicNumber: 9,
        category: "harmonic",
        nature: "soft",
        orb: { standard: 1.5, withLuminary: 2, tight: 0.5 },
        coreKeywords: ["Completion", "Spiritual Harvest", "Blessing", "Integration", "Sacred"],
        psychologicalFunction: "The novile belongs to the ninth harmonic series (360/9 = 40°). Nine is the number of completion, gestation, and spiritual harvest across numerous traditions. The novile indicates a blessed, spiritually ripe connection between two planetary principles — a quality of grace, completion, or sacred potential. It is associated with the culmination of a longer cycle and the emergence of spiritual fruit.",
        developmentalTheme: "Receiving and transmitting spiritual grace through the planetary principles involved. The novile is a rare but significant indicator of genuine spiritual development and completion. Unlike the septile's compulsive quality, the novile has a quality of earned grace or blessing.",
        expressionEasy: "A sense of spiritual completion, blessing, or sacred purpose in the matters governed by the planets. The native may have a particular gift for transmitting healing, wisdom, or creative beauty in these areas.",
        expressionChallenged: "Over-spiritualising the matters governed by the planets, or a reluctance to engage with their practical dimensions because they feel too sacred to subject to ordinary life. Can produce a certain unworldliness.",
        inNatalChart: "A rare and subtle indicator of spiritual maturity or completion in the areas governed by the two planets. Most effective at very tight orbs (under 1°).",
        inTransit: "Only considered at very tight orbs. Can coincide with moments of grace, completion, or spiritual recognition.",
        inSynastry: "An uncommon but potent indicator of spiritual resonance or a sense of having come together for a sacred purpose.",
        signsApart: null,
        compatibleElements: false,
        sharedModality: false,
        aspectPatterns: ["Binovile (80°) and Trinovile (120° = Trine) complete the novile series"],
        tradition: "Harmonic astrology / John Addey",
        ptolemaic: false,
        keplerIntroduced: false,
    },
];

// ─── ASPECT PATTERN CONFIGURATIONS ──────────────────────────────────────────
// Larger multi-planet configurations built from the aspects above.

export interface AspectPatternData {
    id: string;
    name: string;
    alternateNames: string[];
    componentsDescription: string;          // Geometric construction in plain language
    planetCount: number;                    // How many planets are required
    aspectsInvolved: string[];              // Aspect IDs that form this pattern
    nature: AspectNature;
    symbol: string;                         // Shape descriptor
    psychologicalSignificance: string;
    shadow: string;
    rarity: "common" | "uncommon" | "rare" | "very rare";
}

export const aspectPatterns: AspectPatternData[] = [
    {
        id: "grand-trine",
        name: "Grand Trine",
        alternateNames: ["Grand Trigon"],
        componentsDescription: "Three planets each separated by approximately 120°, forming an equilateral triangle within a single element (all fire, all earth, all air, or all water).",
        planetCount: 3,
        aspectsInvolved: ["trine"],
        nature: "soft",
        symbol: "Equilateral triangle",
        psychologicalSignificance: "The Grand Trine creates a self-contained circuit of ease and flow across one element. It represents an exceptional reservoir of natural talent, psychological coherence, and elemental fluency in the area governed by the element. Natives with this pattern have an almost instinctive mastery of the element's domain.",
        shadow: "Self-sufficiency that resists growth. The closed circuit of the Grand Trine can become hermetic — because everything flows so easily, the native has little motivation to push beyond their natural gifts. It can produce a complacent genius who never reaches their potential without challenge.",
        rarity: "uncommon",
    },
    {
        id: "t-square",
        name: "T-Square",
        alternateNames: ["T-Cross"],
        componentsDescription: "Two planets in opposition, both squaring a third planet (the apex). Forms a T-shape or right triangle within the chart.",
        planetCount: 3,
        aspectsInvolved: ["opposition", "square"],
        nature: "hard",
        symbol: "T-shape / right triangle",
        psychologicalSignificance: "The T-Square is one of the most powerful and productive configurations in astrology. The apex planet receives the full tension of the opposition and must integrate both extremes. It represents a focused point of intensity — the area of life most demanding of growth, and often the area where the native eventually achieves their most significant accomplishments.",
        shadow: "The empty leg of the T-Square (directly opposite the apex) represents a blind spot or an area the native consistently neglects while pouring energy into the apex planet. Left unaddressed, this creates chronic imbalance.",
        rarity: "common",
    },
    {
        id: "grand-cross",
        name: "Grand Cross",
        alternateNames: ["Grand Square", "Cosmic Cross"],
        componentsDescription: "Four planets forming two oppositions that are square to each other. All four planets are in the same modality (cardinal, fixed, or mutable), equally spaced at 90° intervals.",
        planetCount: 4,
        aspectsInvolved: ["opposition", "square"],
        nature: "hard",
        symbol: "Cross / plus sign",
        psychologicalSignificance: "The Grand Cross is the most demanding of the major configurations. The native experiences intense, simultaneous tension from four directions, each pulling against the others. The demands on the native's capacity for integration are enormous — but so is the potential for mastery. Many individuals with Grand Crosses become exceptional leaders, creatives, or high-performers, precisely because the cross demands continual, high-level synthesis.",
        shadow: "Overwhelm, chronic stress, and a difficulty delegating any of the four quadrants to others. The native must manage all four simultaneously and can burn out if they resist rather than integrate.",
        rarity: "rare",
    },
    {
        id: "yod",
        name: "Yod",
        alternateNames: ["Finger of God", "Finger of Fate"],
        componentsDescription: "Two planets in sextile (60°), both forming quincunxes (150°) to a single apex planet. Forms a narrow isosceles triangle pointing to the apex.",
        planetCount: 3,
        aspectsInvolved: ["sextile", "quincunx"],
        nature: "hard",
        symbol: "Narrow isosceles triangle / pointing finger",
        psychologicalSignificance: "The Yod is the most explicitly karmic and fated of the major configurations. The apex planet is the 'point of destiny' — an area of life that demands continual adjustment, service, and eventual mastery in a way that feels non-negotiable. The sextile base provides a reservoir of talent that must be directed, repeatedly and without resolution, toward the apex. The Yod rarely allows the native to settle into comfort in the apex domain.",
        shadow: "Chronic restlessness, a sense of being driven toward a purpose one cannot fully understand or control, and periodic adjustment crises. The Yod demands acceptance of its terms — resistance produces significant psychological strain.",
        rarity: "uncommon",
    },
    {
        id: "kite",
        name: "Kite",
        alternateNames: [],
        componentsDescription: "A Grand Trine with one additional planet in opposition to one of the three trine planets, which is sextile to the other two. The opposition planet becomes the 'kite string' that activates the Grand Trine.",
        planetCount: 4,
        aspectsInvolved: ["trine", "sextile", "opposition"],
        nature: "soft",
        symbol: "Kite shape",
        psychologicalSignificance: "The Kite resolves the Grand Trine's primary weakness — its hermetic self-sufficiency. The opposition point (the kite string) provides challenge, focus, and external motivation that channels the Grand Trine's energy toward a specific goal. The native retains the Grand Trine's fluency but is pushed to use it actively rather than passively.",
        shadow: "The opposition point can become a source of tension or an external obstacle that the native projects against. If the kite's opposition planet is in a difficult sign or house, it may feel less like a gift and more like an intrusive demand.",
        rarity: "rare",
    },
    {
        id: "mystic-rectangle",
        name: "Mystic Rectangle",
        alternateNames: [],
        componentsDescription: "Four planets connected by two oppositions and two sextiles, forming a rectangle. The sextiles bridge the oppositions, creating a self-balancing framework.",
        planetCount: 4,
        aspectsInvolved: ["opposition", "sextile"],
        nature: "variable",
        symbol: "Rectangle",
        psychologicalSignificance: "The Mystic Rectangle combines the relational tension of oppositions with the cooperative flow of sextiles. The result is a configuration with remarkable internal balance — the tensions are real but the native has innate resources (the sextiles) to manage them. Associated with practical mysticism and the ability to translate spiritual insight into concrete action.",
        shadow: "The balance of the rectangle can produce a kind of stasis — because the tensions cancel each other out, the native may lack the urgency to push beyond the pattern. Growth requires deliberately activating the sextiles.",
        rarity: "rare",
    },
    {
        id: "stellium",
        name: "Stellium",
        alternateNames: ["Satellite", "Planetary cluster"],
        componentsDescription: "Three or more planets (excluding the Sun) in conjunction within the same zodiac sign or house, typically within a span of less than 10°.",
        planetCount: 3,
        aspectsInvolved: ["conjunction"],
        nature: "variable",
        symbol: "Cluster",
        psychologicalSignificance: "A stellium concentrates an enormous amount of psychological energy in a single sign, house, or area of life. The native tends to be intensely focused — sometimes compulsively so — on the themes of that sign and house. A stellium is a defining signature of the chart, often the area of the native's greatest interest, struggle, and eventual mastery.",
        shadow: "Imbalance. The concentration of energy in one area necessarily depletes others. The native may be highly developed in the stellium's domain while underdeveloped in the opposite area of the chart. The stellium can also produce a kind of mono-focus that limits perspective.",
        rarity: "common",
    },
];