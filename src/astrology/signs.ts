export interface SignData {
    id: string;
    name: string;
    archetypeName: string;
    coreStrategy: string;
    cognitiveInsight: string;
    elementalTruth: string;
    strengths: string[];
    weaknesses: string[];
    compositionalAdverbialPhrase: string; // The "How"
}

export const compositionalSigns: SignData[] = [
    {
        id: "aries",
        name: "Aries",
        archetypeName: "The Trailblazer",
        coreStrategy: "Rapid decision-making, taking the first step before others are ready, and embracing conflict as a catalyst for change.",
        cognitiveInsight: "Psychologically driven by dopamine rewards tied to novelty and overcoming resistance, exhibiting a high bias for action and a low tolerance for inefficiency.",
        elementalTruth: "You are the spark that starts the blaze. Your fire is raw, unfiltered initiation. You don't sustain—you activate.",
        strengths: ["Activation and mobilization of energy", "Overcoming systemic inertia", "Decisive forward momentum"],
        weaknesses: ["Impulsivity", "Start-up energy burnout", "Lack of sustained follow-through"],
        compositionalAdverbialPhrase: "with aggressive autonomy and decisive speed"
    },
    {
        id: "taurus",
        name: "Taurus",
        archetypeName: "The Builder",
        coreStrategy: "Methodical progress, risk aversion, and utilizing the five senses to verify reality.",
        cognitiveInsight: "You value empirical evidence over theory. If you can’t touch it, see it, or quantify it, you are skeptical. Your \"stubbornness\" is actually high cognitive persistence—once you verify a fact or method is sound, you stick to it to maximize efficiency.",
        elementalTruth: "You are the bedrock. Your earth doesn't shift—it anchors. You build structures meant to last, accumulating value through patience and consistency.",
        strengths: ["Sustainment and endurance", "Methodical execution", "Sensory awareness and appreciation"],
        weaknesses: ["Inertia and resistance to change", "Over-attachment to comfort", "Slowness to adapt to novelty"],
        compositionalAdverbialPhrase: "through methodical stabilization and risk-averse endurance"
    },
    {
        id: "gemini",
        name: "Gemini",
        archetypeName: "The Connector",
        coreStrategy: "Adaptability, humor, and collecting data points from diverse sources.",
        cognitiveInsight: "You possess high \"Cognitive Flexibility.\" Your brain craves new neural pathways, which manifests as a need for variety. You aren't \"two-faced\"; you are context-dependent, rapidly adjusting your behavior to optimize social friction.",
        elementalTruth: "You are the wind. Your air doesn't concentrate—it circulates. You gather information from one place and carry it to another, naturally connecting disparate ideas and people.",
        strengths: ["Translation of complex ideas", "Rapid context switching", "Social adaptability"],
        weaknesses: ["Analysis paralysis", "Scattered focus", "Lack of sustained depth"],
        compositionalAdverbialPhrase: "with rapid adaptability and continuous data collection"
    },
    {
        id: "cancer",
        name: "Cancer",
        archetypeName: "The Protector",
        coreStrategy: "Establishing deep roots, reading emotional undercurrents, and defensive withdrawal when threatened.",
        cognitiveInsight: "You are hyper-attentive to non-verbal cues and micro-expressions. Your \"moodiness\" is a reaction to environmental stimuli that others miss. You value tribal cohesion and security.",
        elementalTruth: "You are the wave. Your water doesn't just feel—it moves. You respond to emotional currents and create environments where others feel safe enough to be vulnerable.",
        strengths: ["High emotional intelligence", "Creation of psychological safety", "Visceral understanding of unstated needs"],
        weaknesses: ["Over-identification with others' emotions", "Defensive withdrawal under stress", "Difficulty letting go"],
        compositionalAdverbialPhrase: "through intuitive care and emotional self-protection"
    },
    {
        id: "leo",
        name: "Leo",
        archetypeName: "The Protagonist",
        coreStrategy: "Radiating confidence (even when faked), generosity, and assuming the lead role in one's own life.",
        cognitiveInsight: "You have a high drive for \"Social Dominance\" in the benevolent sense—you want to lead and inspire. You understand the psychology of presentation: perception is reality.",
        elementalTruth: "You are the eternal flame. Your fire doesn't ignite—it radiates. You turn raw energy into a steady source that others rely upon.",
        strengths: ["Magnetic social presence", "Creative self-expression", "Inspiring morale in groups"],
        weaknesses: ["Reliance on external validation", "Fear of mediocrity", "Resistance to sharing the spotlight"],
        compositionalAdverbialPhrase: "with radiant self-assurance and dramatic visibility"
    },
    {
        id: "virgo",
        name: "Virgo",
        archetypeName: "The Optimizer",
        coreStrategy: "Critical analysis, discernment, and focusing on the details others overlook.",
        cognitiveInsight: "You are a systems thinker. You don't \"nag\"; you troubleshoot. Your brain is wired for pattern recognition regarding efficiency. If something is broken, your cognitive itch demands you fix it.",
        elementalTruth: "You are the cultivated garden. Your earth doesn't just exist—it optimizes. You turn raw material into something functional and efficient.",
        strengths: ["Instant flaw recognition", "Methodical refinement", "Dedication to functional perfection"],
        weaknesses: ["Analysis paralysis", "Imposter syndrome", "Harsh self-criticism"],
        compositionalAdverbialPhrase: "through systematic analysis and relentless refinement"
    },
    {
        id: "libra",
        name: "Libra",
        archetypeName: "The Harmonizer",
        coreStrategy: "Negotiation, charm, and seeing the validity in opposing viewpoints.",
        cognitiveInsight: "You possess high \"Social Intelligence.\" You are a dialectical thinker—you naturally see the thesis and antithesis of every argument. You prioritize group cohesion over individual ego.",
        elementalTruth: "You are the atmosphere. Your air doesn't scatter—it balances. You instinctively sense when things are off-kilter and work to restore harmony.",
        strengths: ["Calibration of social dynamics", "Objective fairness", "Mastery of diplomacy"],
        weaknesses: ["Indecision from over-weighing options", "Suppression of authentic anger", "Conflict avoidance"],
        compositionalAdverbialPhrase: "by calibrating relational mechanics and seeking equilibrium"
    },
    {
        id: "scorpio",
        name: "Scorpio",
        archetypeName: "The Alchemist",
        coreStrategy: "Strategic silence, deep observation, and testing the loyalty of others.",
        cognitiveInsight: "You have an \"Investigative\" personality type. You are not satisfied with surface-level data; you look for root causes and hidden motives, refusing to engage in cognitive dissonance.",
        elementalTruth: "You are the abyss. Your water doesn't flow—it transforms. You dive beneath literal surface explanations to understand the true nature of things.",
        strengths: ["Psychological resilience", "Unflinching focus", "Mastery over crisis and transformation"],
        weaknesses: ["Tendency towards paranoia", "Vindictiveness when betrayed", "Holding onto psychological debts"],
        compositionalAdverbialPhrase: "with piercing intensity and transformative depths"
    },
    {
        id: "sagittarius",
        name: "Sagittarius",
        archetypeName: "The Explorer",
        coreStrategy: "Humor, risk-taking, and constantly zooming out to see the \"Big Picture.\"",
        cognitiveInsight: "You score high in \"Openness to Experience.\" You have a biological drive for novelty. You are an information-forager who learns best through immersion and trial-and-error.",
        elementalTruth: "You are the spreading flame. Your fire doesn't stay put—it explores. You carry energy across boundaries and into unfamiliar territory.",
        strengths: ["Visionary perspective", "High adaptability to the unknown", "Philosophical optimism"],
        weaknesses: ["Tactless bluntness", "Fear of confinement or commitment", "Overlooking immediate details"],
        compositionalAdverbialPhrase: "with boundless exploration and philosophical expansion"
    },
    {
        id: "capricorn",
        name: "Capricorn",
        archetypeName: "The Strategist",
        coreStrategy: "Delayed gratification, pragmatic planning, and emotional regulation.",
        cognitiveInsight: "You are \"Goal-Oriented\" and \"Conscientious.\" You view life as a resource management game, preferring to invest emotional energy where it yields a tangible return.",
        elementalTruth: "You are the mountain. Your earth doesn't settle—it ascends. You measure life in milestones, not moments, building toward something greater with each step.",
        strengths: ["Execution of long-term goals", "Unwavering discipline", "Mastery of structural integrity"],
        weaknesses: ["Ruthlessness with self limits", "Equating worth with productivity", "Emotional rigidity"],
        compositionalAdverbialPhrase: "through disciplined ambition and structural mastery"
    },
    {
        id: "aquarius",
        name: "Aquarius",
        archetypeName: "The Innovator",
        coreStrategy: "Detachment (viewing life objectively), radical honesty, and networking.",
        cognitiveInsight: "You are a non-conformist by nature. You have a low need for social approval and a high need for intellectual autonomy, able to analyze systems without bias.",
        elementalTruth: "You are the frequency. Your air doesn't adapt—it broadcasts. You transmit ideas that challenge the status quo, often ahead of when others are ready to receive them.",
        strengths: ["Divergent thinking", "Objective systems analysis", "Forward-thinking innovation"],
        weaknesses: ["Intellectual arrogance (God-complex)", "Disconnect from one-on-one intimacy", "Rebelliousness for its own sake"],
        compositionalAdverbialPhrase: "using detached objectivity and disruptive insight"
    },
    {
        id: "pisces",
        name: "Pisces",
        archetypeName: "The Dreamer",
        coreStrategy: "Intuition, creativity, and adaptability (flowing like water).",
        cognitiveInsight: "You possess \"High Sensory Processing Sensitivity.\" Your brain absorbs more environmental data than the average person, processing through pattern recognition and feeling rather than linear logic.",
        elementalTruth: "You are the ocean. Your water doesn't contain—it merges. You experience life through fluid boundaries, absorbing the emotions and energies around you.",
        strengths: ["Holistic synthesis", "Limitless empathy", "Adaptable intuitive logic"],
        weaknesses: ["Escapism", "Lack of energetic boundaries", "Vulnerability to being consumed by others"],
        compositionalAdverbialPhrase: "with empathetic dissolution of boundaries and intuitive synthesis"
    }
];
