import {
    TbZodiacAries,
    TbZodiacTaurus,
    TbZodiacGemini,
    TbZodiacCancer,
    TbZodiacLeo,
    TbZodiacVirgo,
    TbZodiacLibra,
    TbZodiacScorpio,
    TbZodiacSagittarius,
    TbZodiacCapricorn,
    TbZodiacAquarius,
    TbZodiacPisces
} from "react-icons/tb";
import { GiWaterfall, GiTornado, GiFlame, GiStonePile } from "react-icons/gi";
import { IconType } from "react-icons";

export type ElementType = "Fire" | "Earth" | "Air" | "Water";

export const CONSTELLATION_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/signs/constellations/"
export const ELEMENT_FRAME_URL = "https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/elements/v3/"

export interface ZodiacSign {
    id: string;
    name: string;
    element: ElementType;
    icon: IconType;
    elementIcon: IconType;
    traits: string;
    dates: string;
    constellation: string;
    frame: string;
}

export const ELEMENTS: Record<ElementType, { name: string; icon: IconType; }> = {
    Fire: { name: "Fire", icon: GiFlame },
    Earth: { name: "Earth", icon: GiStonePile },
    Air: { name: "Air", icon: GiTornado },
    Water: { name: "Water", icon: GiWaterfall },
};

export const ELEMENT_STYLES: Record<ElementType, {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
    gradient: string;
}> = {
    Fire: {
        primary: "var(--fire-primary)",
        secondary: "var(--fire-secondary)",
        glow: "var(--fire-glow)",
        border: "var(--fire-border)",
        gradient: "var(--fire-gradient)"
    },
    Earth: {
        primary: "var(--earth-primary)",
        secondary: "var(--earth-secondary)",
        glow: "var(--earth-glow)",
        border: "var(--earth-border)",
        gradient: "var(--earth-gradient)"
    },
    Air: {
        primary: "var(--air-primary)",
        secondary: "var(--air-secondary)",
        glow: "var(--air-glow)",
        border: "var(--air-border)",
        gradient: "var(--air-gradient)"
    },
    Water: {
        primary: "var(--water-primary)",
        secondary: "var(--water-secondary)",
        glow: "var(--water-glow)",
        border: "var(--water-border)",
        gradient: "var(--water-gradient)"
    }
};

export const SIGN_EXTENDED_DATA: Record<string, {
    modality: "Cardinal" | "Fixed" | "Mutable";
    ruler: string;
    rulerSymbol: string;
    house: string;
    polarity: "Masculine" | "Feminine";
    stone: string;
    essenceFull: string;
    archetype: string;
    motto: string;
    coreDesire: string;
    goal: string;
    greatestFear: string;
    strategy: string;
    weakness: string;
    talent: string;
    insight: string;
    elementalTitle: string;
    elementalInsight: string;
    elementalPath: string;
}> = {
    aries: {
        modality: "Cardinal",
        ruler: "Mars",
        rulerSymbol: "♂",
        house: "1st House",
        polarity: "Masculine",
        stone: "Diamond",
        essenceFull: "The pioneer of the zodiac, Aries is a force of nature. As the first sign, they possess an inherent need to lead, to initiate, and to conquer. Their energy is raw, unfiltered, and deeply connected to the spark of existence itself.",
        archetype: "The Trailblazer",
        motto: "I am, therefore I do.",
        coreDesire: "Autonomy and forward momentum.",
        goal: "To initiate action and prove existence through impact.",
        greatestFear: "Stagnation, being controlled, or fading into the background.",
        strategy: "Rapid decision-making, taking the first step before others are ready, and embracing conflict as a catalyst for change.",
        weakness: "Impulsivity and \"Start-up energy\" burnout (starting many fires but finishing none).",
        talent: "Activation. The ability to mobilize energy out of nothing.",
        insight: "You likely possess a high \"bias for action.\" Psychologically, you are driven by dopamine rewards tied to novelty and overcoming resistance. You aren't necessarily \"aggressive\"; you just have a low tolerance for inefficiency and hesitation.",
        elementalTitle: "Ignition",
        elementalInsight: "You are the spark that starts the blaze. Your fire is raw, unfiltered initiation. You don't sustain—you activate. You're the one who sees the need for change and moves before others finish deliberating. You break inertia and force evolution through decisive action.",
        elementalPath: "Learn that not every beginning requires burning down what came before."
    },
    taurus: {
        modality: "Fixed",
        ruler: "Venus",
        rulerSymbol: "♀",
        house: "2nd House",
        polarity: "Feminine",
        stone: "Emerald",
        essenceFull: "Taurus represents the physical world in its most beautiful and stable form. They are the builders and the keepers of comfort, find joy in the senses, and possess an unwavering loyalty that grounds everyone around them.",
        archetype: "The Builder",
        motto: "Quality over quantity, always.",
        coreDesire: "Stability and sensory satisfaction.",
        goal: "To build sustainable systems and accumulate resources (emotional or material) that last.",
        greatestFear: "Scarcity, sudden instability, or being rushed into poor quality.",
        strategy: "Methodical progress, risk aversion, and utilizing the five senses to verify reality.",
        weakness: "Inertia. The resistance to change can look like stubbornness, but is actually a preservation instinct.",
        talent: "Sustainment. The ability to maintain effort long after others have quit.",
        insight: "You value empirical evidence over theory. If you can’t touch it, see it, or quantify it, you are skeptical. Your \"stubbornness\" is actually high cognitive persistence—once you verify a fact or method is sound, you stick to it to maximize efficiency.",
        elementalTitle: "Foundation",
        elementalInsight: "You are the bedrock. Your earth doesn't shift—it anchors. You build structures meant to last, accumulating value through patience and consistency. When others chase what's urgent, you invest in what endures. Your stability becomes the ground others stand on.",
        elementalPath: "Learn that the ground sometimes needs to shift for new growth to emerge."
    },
    gemini: {
        modality: "Mutable",
        ruler: "Mercury",
        rulerSymbol: "☿",
        house: "3rd House",
        polarity: "Masculine",
        stone: "Agate",
        essenceFull: "Gemini is the breath of curiosity that connects ideas. Always seeking, always learning, they embody the dual nature of the mind. They are the messengers of the zodiac, weaving together disparate threads of information into a cohesive whole.",
        archetype: "The Connector",
        motto: "Everything is interesting if you look close enough.",
        coreDesire: "Intellectual variety and social connection.",
        goal: "To gather information and bridge gaps between different people and ideas.",
        greatestFear: "Boredom, mental confinement, or being \"out of the loop.\"",
        strategy: "Adaptability, humor, and collecting data points from diverse sources.",
        weakness: "Analysis paralysis or scattered focus (The \"Jack of all trades\" syndrome).",
        talent: "Translation. The ability to explain complex ideas simply and adapt your personality to fit the room.",
        insight: "You possess high \"Cognitive Flexibility.\" Your brain craves new neural pathways, which manifests as a need for variety. You aren't \"two-faced\"; you are context-dependent, rapidly adjusting your behavior to optimize social friction.",
        elementalTitle: "Distribution",
        elementalInsight: "You are the wind. Your air doesn't concentrate—it circulates. You gather information from one place and carry it to another, naturally connecting disparate ideas and people. You're fluent in multiple contexts and can translate between them with ease.",
        elementalPath: "Learn that connection without depth becomes mere distraction."
    },
    cancer: {
        modality: "Cardinal",
        ruler: "Moon",
        rulerSymbol: "☾",
        house: "4th House",
        polarity: "Feminine",
        stone: "Pearl",
        essenceFull: "Cancer is the emotional foundation of the zodiac. Deeply intuitive and fiercely protective, they navigate life through the tides of feeling. To a Cancer, home is not a place, but a state of emotional safety and belonging.",
        archetype: "The Protector",
        motto: "To care is to be strong.",
        coreDesire: "Emotional safety and belonging.",
        goal: "To create a sanctuary (home/community) where defenses can be lowered.",
        greatestFear: "Vulnerability without reciprocity; being left exposed.",
        strategy: "establishing deep roots, reading emotional undercurrents, and defensive withdrawal (the shell) when threatened.",
        weakness: "Over-identification with the emotions of others (empathetic distress).",
        talent: "Emotional Intelligence. A visceral understanding of human needs before they are spoken.",
        insight: "You are hyper-attentive to non-verbal cues and micro-expressions. Your \"moodiness\" is a reaction to environmental stimuli that others miss. You value tribal cohesion and security, acting as the \"social glue\" in groups.",
        elementalTitle: "Tide",
        elementalInsight: "You are the wave. Your water doesn't just feel—it moves. You respond to emotional currents and create environments where others feel safe enough to be vulnerable. You understand that belonging is built through consistent care and attention.",
        elementalPath: "Learn that you cannot carry everyone's emotional weight—some people must learn to swim on their own."
    },
    leo: {
        modality: "Fixed",
        ruler: "Sun",
        rulerSymbol: "☉",
        house: "5th House",
        polarity: "Masculine",
        stone: "Ruby",
        essenceFull: "Leo is the heart of the zodiac, radiating warmth, creativity, and authority. They are natural leaders who lead with love and a dramatic flair. Their presence is a reminder of the power of individual expression and the courage to be seen.",
        archetype: "The Protagonist",
        motto: "Shine, so others have permission to do the same.",
        coreDesire: "Self-expression and validation.",
        goal: "To leave a unique, visible mark on the world (legacy).",
        greatestFear: "Being ignored, mediocrity, or public humiliation.",
        strategy: "Radiating confidence (even when faked), generosity, and assuming the lead role in one's own life.",
        weakness: "Reliance on external validation to regulate self-esteem.",
        talent: "Magnetism. The ability to influence the mood of a room simply by entering it.",
        insight: "You have a high drive for \"Social Dominance\" in the benevolent sense—you want to lead and inspire. You understand the psychology of presentation: perception is reality. You aren't just \"vain\"; you are curating your avatar for maximum impact.",
        elementalTitle: "Sustained Burn",
        elementalInsight: "You are the eternal flame. Your fire doesn't ignite—it radiates. You turn raw energy into a steady source that others rely upon. You don't just create—you maintain presence and consistency over time. Your warmth draws people in and holds their attention.",
        elementalPath: "Learn that true brilliance doesn't need constant validation—it simply exists."
    },
    virgo: {
        modality: "Mutable",
        ruler: "Mercury",
        rulerSymbol: "☿",
        house: "6th House",
        polarity: "Feminine",
        stone: "Sapphire",
        essenceFull: "Virgo seeks perfection through service and analysis. Meticulous and thoughtful, they find the hidden patterns in chaos. They represent the Earth in its most refined state, where every detail serves a higher purpose of healing and organization.",
        archetype: "The Optimizer",
        motto: "There is a better way to do this.",
        coreDesire: "Competence, order, and utility.",
        goal: "To refine systems, heal chaos, and achieve functional perfection.",
        greatestFear: "Uselessness, chaos, or being criticized for errors.",
        strategy: "Critical analysis, discernment, and focusing on the details others overlook.",
        weakness: "Analysis paralysis and turning the critical lens inward (imposter syndrome).",
        talent: "Diagnosis. Seeing the flaw in the pattern instantly.",
        insight: "You are a systems thinker. You don't \"nag\"; you troubleshoot. Your brain is wired for pattern recognition regarding efficiency. If something is broken, your cognitive itch demands you fix it. You are the ultimate realist.",
        elementalTitle: "Refinement",
        elementalInsight: "You are the cultivated garden. Your earth doesn't just exist—it optimizes. You turn raw material into something functional and efficient. You see the gap between 'how it is' and 'how it could be better,' and you can't rest until you close it.",
        elementalPath: "Learn that imperfection is sometimes the most honest form of beauty."
    },
    libra: {
        modality: "Cardinal",
        ruler: "Venus",
        rulerSymbol: "♀",
        house: "7th House",
        polarity: "Masculine",
        stone: "Opal",
        essenceFull: "Libra is the pursuit of harmony through relationship. They are the architects of balance, seeking beauty and justice in all things. Through the mirror of the 'other', Libra learns the grace of compromise and the art of peace.",
        archetype: "The Harmonizer",
        motto: "Balance is not a destination, it's a practice.",
        coreDesire: "Harmony, beauty, and objective fairness.",
        goal: "To align their environment and relationships into a state of equilibrium.",
        greatestFear: "Conflict, isolation, or making the \"wrong\" permanent decision.",
        strategy: "Negotiation, charm, and seeing the validity in opposing viewpoints.",
        weakness: "Indecision (seeking the \"perfect\" choice) and suppressing anger to keep the peace.",
        talent: "Calibration. The ability to assess social dynamics and adjust to restore flow.",
        insight: "You possess high \"Social Intelligence.\" You are a dialectical thinker—you naturally see the thesis and antithesis of every argument. You aren't \"fake\"; you are diplomatic, prioritizing group cohesion over individual ego.",
        elementalTitle: "Equilibrium",
        elementalInsight: "You are the atmosphere. Your air doesn't scatter—it balances. You instinctively sense when things are off-kilter and work to restore harmony. You see validity in opposing viewpoints and can hold space for contradiction.",
        elementalPath: "Learn that perfect balance is impossible—sometimes choosing a side is the most honest thing you can do."
    },
    scorpio: {
        modality: "Fixed",
        ruler: "Pluto & Mars",
        rulerSymbol: "♇ ♂",
        house: "8th House",
        polarity: "Feminine",
        stone: "Topaz",
        essenceFull: "Scorpio is the sign of transformation, depth, and intensity. They are the detectives of the soul, unafraid of the shadows and the mysteries of life. Their power lies in their ability to endure, to regenerate, and to speak the unspoken truth.",
        archetype: "The Alchemist",
        motto: "I survive, I transform, I rise.",
        coreDesire: "Intensity and uncovering the truth beneath the surface.",
        goal: "To master the self and understand the taboo/hidden mechanics of life.",
        greatestFear: "Betrayal and powerlessness.",
        strategy: "Strategic silence, deep observation, and testing the loyalty of others.",
        weakness: "Paranoia and the tendency to \"burn it all down\" when hurt.",
        talent: "Resilience. The psychological capacity to endure high-pressure situations and emerge stronger.",
        insight: "You have a \"Investigative\" personality type. You are not satisfied with surface-level data; you look for root causes and hidden motives. Your intensity is simply a high level of focus and a refusal to engage in cognitive dissonance (lying to yourself).",
        elementalTitle: "Depths",
        elementalInsight: "You are the abyss. Your water doesn't flow—it transforms. You don't accept surface explanations; you dive beneath to understand the true nature of things. You're drawn to what others avoid and possess the strength to face uncomfortable truths.",
        elementalPath: "Learn that not every mystery needs solving—some things can remain unknown."
    },
    sagittarius: {
        modality: "Mutable",
        ruler: "Jupiter",
        rulerSymbol: "♃",
        house: "9th House",
        polarity: "Masculine",
        stone: "Turquoise",
        essenceFull: "Sagittarius is the eternal seeker of truth and wisdom. With their eyes on the horizon, they embody the spirit of adventure and the joy of philosophy. They are the fire that lights the way to higher understanding and boundless freedom.",
        archetype: "The Explorer",
        motto: "Don't fence me in.",
        coreDesire: "Expansion (mental or physical) and freedom.",
        goal: "To find meaning and truth through experience.",
        greatestFear: "Confinement, boredom, and having to follow arbitrary rules.",
        strategy: "Humor, risk-taking, and constantly zooming out to see the \"Big Picture.\"",
        weakness: "Tactlessness (blunt truth) and commitment issues (fear of missing out on the next horizon).",
        talent: "Vision. The ability to see potential outcomes and optimistic futures that others can't.",
        insight: "You score high in \"Openness to Experience\" (Big 5 Trait). You have a biological drive for novelty. You aren't \"flaky\"; you are an information-forager who learns best through immersion and trial-and-error rather than rote memorization.",
        elementalTitle: "Wildfire",
        elementalInsight: "You are the spreading flame. Your fire doesn't stay put—it explores. You carry energy across boundaries and into unfamiliar territory. You're driven by the question 'what else is possible?' and refuse to accept limitations as final.",
        elementalPath: "Learn that depth sometimes matters more than distance traveled."
    },
    capricorn: {
        modality: "Cardinal",
        ruler: "Saturn",
        rulerSymbol: "♄",
        house: "10th House",
        polarity: "Feminine",
        stone: "Garnet",
        essenceFull: "Capricorn is the climber of the zodiac, representing discipline, ambition, and the wisdom of time. They understand that true greatness is built stone by stone. They are the masters of the material realm, turning vision into lasting legacy.",
        archetype: "The Strategist",
        motto: "Discipline is freedom.",
        coreDesire: "Achievement and autonomy through mastery.",
        goal: "To build a legacy of tangible value and structural integrity.",
        greatestFear: "Failure, public embarrassment, and dependency on others.",
        strategy: "Delayed gratification, pragmatic planning, and emotional regulation.",
        weakness: "Ruthlessness with self (and others) and equating self-worth with productivity.",
        talent: "Execution. The ability to turn abstract goals into concrete reality.",
        insight: "You are \"Goal-Oriented\" and \"Conscientious.\" You view life as a resource management game. You aren't \"cold\"; you are efficient with your emotional energy, preferring to invest it where it yields a return (ROI).",
        elementalTitle: "Summit",
        elementalInsight: "You are the mountain. Your earth doesn't settle—it ascends. You measure life in milestones, not moments, building toward something greater with each step. Delayed gratification is your natural state; you understand that worthwhile things take time.",
        elementalPath: "Learn that achievement means nothing if the climb leaves you isolated."
    },
    aquarius: {
        modality: "Fixed",
        ruler: "Uranus & Saturn",
        rulerSymbol: "⛢ ♄",
        house: "11th House",
        polarity: "Masculine",
        stone: "Amethyst",
        essenceFull: "Aquarius is the visionary of the zodiac, focused on the future and the collective good. They are the rebels with a cause, challenging traditions to make way for innovation and humanitarian ideals. They dance to the beat of an cosmic drum.",
        archetype: "The Innovator",
        motto: "Break the rules to build a better game.",
        coreDesire: "Freedom of thought and progress for the collective.",
        goal: "To disrupt outdated systems and implement future-proof solutions.",
        greatestFear: "Conformity, losing individuality, and emotional suffocation.",
        strategy: "Detachment (viewing life objectively), radical honesty, and networking.",
        weakness: "God-complex (intellectual arrogance) and difficulty with one-on-one intimacy.",
        talent: "Divergent Thinking. The ability to connect unrelated concepts to solve problems.",
        insight: "You are a non-conformist by nature. Psychologically, you have a low need for social approval and a high need for intellectual autonomy. You aren't \"aloof\"; you are objective, able to separate facts from feelings to analyze systems without bias.",
        elementalTitle: "Transmission",
        elementalInsight: "You are the frequency. Your air doesn't adapt—it broadcasts. You transmit ideas that challenge the status quo, often ahead of when others are ready to receive them. You value truth over comfort and principle over popularity.",
        elementalPath: "Learn that vision without compassion becomes cold ideology."
    },
    pisces: {
        modality: "Mutable",
        ruler: "Neptune & Jupiter",
        rulerSymbol: "♆ ♃",
        house: "12th House",
        polarity: "Feminine",
        stone: "Aquamarine",
        essenceFull: "Pisces is the ocean of the zodiac, where all boundaries dissolve into spiritual oneness. Deeply empathetic and highly imaginative, they exist between worlds. They are the dreamers who remind us that we are all part of a larger, mystical whole.",
        archetype: "The Dreamer",
        motto: "Reality is just one layer of existence.",
        coreDesire: "Transcendent connection and unity.",
        goal: "To dissolve boundaries and alleviate suffering through understanding.",
        greatestFear: "Being consumed by the harshness of reality or total isolation.",
        strategy: "Intuition, creativity, and adaptability (flowing like water).",
        weakness: "Escapism (avoiding hard truths) and lack of boundaries.",
        talent: "Synthesis. The ability to merge logic, emotion, and intuition into a holistic understanding.",
        insight: "You possess \"High Sensory Processing Sensitivity.\" Your brain absorbs more environmental data than the average person, leading to high empathy and creativity. You aren't \"delusional\"; you are an abstract thinker who processes information through pattern recognition and feeling rather than linear logic.",
        elementalTitle: "Dissolution",
        elementalInsight: "You are the ocean. Your water doesn't contain—it merges. You experience life through fluid boundaries, absorbing the emotions and energies around you. You understand connection at a level that transcends logic, sensing what cannot be spoken.",
        elementalPath: "Learn that you need boundaries, or you'll lose yourself entirely in others' stories."
    }
};

export const ELEMENT_CONTENT: Record<ElementType, { desc: string; keywords: string[] }> = {
    Fire: {
        desc: "Fire represents the vital impulse of energy and the spark of creation. It is the drive that moves all life toward growth, action, and the warmth of existence.",
        keywords: ["Vitality", "Intuition", "Action", "Inspiration"]
    },
    Earth: {
        desc: "Earth is the grounding foundation of reality and the manifest world. It represents the stability, endurance, and physical forms that allow life to take root and flourish.",
        keywords: ["Stability", "Manifestation", "Reliability", "Senses"]
    },
    Air: {
        desc: "Air is the breath of life and the bridge of communication. It represents the space where movement happens, the exchange of ideas, and the intellectual clarity that connects all things.",
        keywords: ["Intellect", "Connection", "Objectivity", "Flow"]
    },
    Water: {
        desc: "Water is the fluid depths of emotion and the intuitive flow of life. It represents the memory of existence, the nurturing tides of the soul, and the deep interconnectedness of all living beings.",
        keywords: ["Depth", "Intuition", "Healing", "Enigma"]
    }
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
    {
        id: "aries",
        name: "Aries",
        element: "Fire",
        icon: TbZodiacAries,
        elementIcon: GiFlame,
        traits: "Energetic, adventurous, and enthusiastic.",
        dates: "Mar 21 - Apr 19",
        constellation: CONSTELLATION_URL + "aries.svg",
        frame: ELEMENT_FRAME_URL + "fire.png",
    },
    {
        id: "taurus",
        name: "Taurus",
        element: "Earth",
        icon: TbZodiacTaurus,
        elementIcon: GiStonePile,
        traits: "Patient, reliable, and warmhearted.",
        dates: "Apr 20 - May 20",
        constellation: CONSTELLATION_URL + "taurus.svg",
        frame: ELEMENT_FRAME_URL + "earth.png",
    },
    {
        id: "gemini",
        name: "Gemini",
        element: "Air",
        icon: TbZodiacGemini,
        elementIcon: GiTornado,
        traits: "Adaptable, versatile, and intellectual.",
        dates: "May 21 - Jun 20",
        constellation: CONSTELLATION_URL + "gemini.svg",
        frame: ELEMENT_FRAME_URL + "air.png",
    },
    {
        id: "cancer",
        name: "Cancer",
        element: "Water",
        icon: TbZodiacCancer,
        elementIcon: GiWaterfall,
        traits: "Emotional, loving, and intuitive.",
        dates: "Jun 21 - Jul 22",
        constellation: CONSTELLATION_URL + "cancer.svg",
        frame: ELEMENT_FRAME_URL + "water.png",
    },
    {
        id: "leo",
        name: "Leo",
        element: "Fire",
        icon: TbZodiacLeo,
        elementIcon: GiFlame,
        traits: "Generous, warmhearted, and creative.",
        dates: "Jul 23 - Aug 22",
        constellation: CONSTELLATION_URL + "leo.svg",
        frame: ELEMENT_FRAME_URL + "fire.png",
    },
    {
        id: "virgo",
        name: "Virgo",
        element: "Earth",
        icon: TbZodiacVirgo,
        elementIcon: GiStonePile,
        traits: "Modest, shy, and meticulous.",
        dates: "Aug 23 - Sep 22",
        constellation: CONSTELLATION_URL + "virgo.svg",
        frame: ELEMENT_FRAME_URL + "earth.png",
    },
    {
        id: "libra",
        name: "Libra",
        element: "Air",
        icon: TbZodiacLibra,
        elementIcon: GiTornado,
        traits: "Diplomatic, urbane, and romantic.",
        dates: "Sep 23 - Oct 22",
        constellation: CONSTELLATION_URL + "libra.svg",
        frame: ELEMENT_FRAME_URL + "air.png",
    },
    {
        id: "scorpio",
        name: "Scorpio",
        element: "Water",
        icon: TbZodiacScorpio,
        elementIcon: GiWaterfall,
        traits: "Determined, forceful, and emotional.",
        dates: "Oct 23 - Nov 21",
        constellation: CONSTELLATION_URL + "scorpio.svg",
        frame: ELEMENT_FRAME_URL + "water.png",
    },
    {
        id: "sagittarius",
        name: "Sagittarius",
        element: "Fire",
        icon: TbZodiacSagittarius,
        elementIcon: GiFlame,
        traits: "Optimistic, freedom-loving, and honest.",
        dates: "Nov 22 - Dec 21",
        constellation: CONSTELLATION_URL + "sagittarius.svg",
        frame: ELEMENT_FRAME_URL + "fire.png",
    },
    {
        id: "capricorn",
        name: "Capricorn",
        element: "Earth",
        icon: TbZodiacCapricorn,
        elementIcon: GiStonePile,
        traits: "Practical, prudent, and ambitious.",
        dates: "Dec 22 - Jan 19",
        constellation: CONSTELLATION_URL + "capricorn.svg",
        frame: ELEMENT_FRAME_URL + "earth.png",
    },
    {
        id: "aquarius",
        name: "Aquarius",
        element: "Air",
        icon: TbZodiacAquarius,
        elementIcon: GiTornado,
        traits: "Friendly, humanitarian, and honest.",
        dates: "Jan 20 - Feb 18",
        constellation: CONSTELLATION_URL + "aquarius.svg",
        frame: ELEMENT_FRAME_URL + "air.png",
    },
    {
        id: "pisces",
        name: "Pisces",
        element: "Water",
        icon: TbZodiacPisces,
        elementIcon: GiWaterfall,
        traits: "Imaginative, sensitive, and compassionate.",
        dates: "Feb 19 - Mar 20",
        constellation: CONSTELLATION_URL + "pisces.svg",
        frame: ELEMENT_FRAME_URL + "water.png",
    },
];

/**
 * Get zodiac sign by date using fixed date boundaries.
 * 
 * @deprecated Use `calculateSunSign` from `@/lib/astrology` instead.
 * This function uses approximate date boundaries which can be off by a day
 * near cusp dates. The astronomy-engine version calculates precise ecliptic
 * longitude for accurate results.
 */
export const getZodiacSignByDate = (month: number, day: number): ZodiacSign => {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS[0];
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[1];
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS[2];
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[3];
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[4];
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[5];
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS[6];
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS[7];
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS[8];
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS[9];
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS[10];
    return ZODIAC_SIGNS[11]; // Pisces
};

/**
 * Estimates the rising sign based on sun sign, time of day, and personality traits.
 * This is an "astrological detective" method for when birth time is unknown.
 */
export const estimateRisingSign = (
    sunSignId: string,
    timeOfDay: "morning" | "afternoon" | "evening" | "night" | "unknown" | null,
    answers: Record<string, string>
): ZodiacSign => {
    const sunIndex = ZODIAC_SIGNS.findIndex(s => s.id === sunSignId);
    if (sunIndex === -1) return ZODIAC_SIGNS[0];

    // 1. Scoring each sign based on detective answers
    const scores: Record<string, number> = {};
    ZODIAC_SIGNS.forEach(s => scores[s.id] = 0);

    Object.values(answers).forEach(val => {
        if (scores[val] !== undefined) {
            scores[val] += 5; // Direct match weight
        }
    });

    // 2. Define probable offsets from sun sign based on time of day
    // Each 2 hours roughly = 1 sign (30 degrees).
    // Sunrise (6am) = Sun sign is ASC.
    let possibleOffsets: number[] = [];
    switch (timeOfDay) {
        case "morning": // 6am - 12pm
            possibleOffsets = [0, 1, 2];
            break;
        case "afternoon": // 12pm - 6pm
            possibleOffsets = [3, 4, 5];
            break;
        case "evening": // 6pm - 12am
            possibleOffsets = [6, 7, 8];
            break;
        case "night": // 12am - 6am
            possibleOffsets = [9, 10, 11];
            break;
        default:
            possibleOffsets = Array.from({ length: 12 }, (_, i) => i);
    }

    // 3. Find the best match within the time constraint
    // We give a small bonus for being in the "likely" window, 
    // then pick the one with the highest trait score.
    const candidates = possibleOffsets.map(offset => {
        const index = (sunIndex + offset) % 12;
        const sign = ZODIAC_SIGNS[index];
        return {
            sign,
            score: (scores[sign.id] || 0) + 1 // Add 1 as a baseline for being in the right time window
        };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0].sign;
};

/**
 * Get a zodiac sign by its name (case-insensitive)
 */
export const getZodiacSignByName = (name: string): ZodiacSign | undefined => {
    return ZODIAC_SIGNS.find(s => s.name.toLowerCase() === name.toLowerCase());
};

/**
 * Get the Tailwind class name for an element's color
 * @param element - The element type
 * @param prefix - The Tailwind prefix (e.g., 'bg', 'text', 'border')
 * @returns The Tailwind class name
 */
export const getElementClass = (element: ElementType, prefix: 'bg' | 'text' | 'border' = 'text'): string => {
    return `${prefix}-${element.toLowerCase()}`;
};

/**
 * Get the element name as a CSS variable name (lowercase)
 * For use in CSS like: var(--fire-primary), var(--water-primary), etc.
 * OLD (Deprecated): var(--fire), var(--water), etc.
 * @param element - The element type
 * @returns The lowercase element name
 */
export const getElementVar = (element: ElementType): string => {
    return element.toLowerCase();
};


