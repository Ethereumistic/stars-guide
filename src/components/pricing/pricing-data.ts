export interface PricingFeature {
    text: string;
    included: boolean;
}

export interface PricingPlan {
    name: string;
    icon: string;
    price: {
        monthly: string;
        yearly: string;
    };
    setup: {
        monthly: string;
        yearly: string;
    };
    description: string;
    tier: "base" | "popular" | "premium";
    features: PricingFeature[];
    cta: string;
    href: string;
}

export const plans: PricingPlan[] = [
    {
        name: "Free",
        icon: "GiPolarStar",
        price: { monthly: "€0", yearly: "€0" },
        setup: { monthly: "Always free", yearly: "Always free" },
        description: "Your daily connection to the cosmos.",
        tier: "base",
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: false },
            { text: "RAG-Powered Journal Memory", included: false },
            { text: "Generative Astral Cards", included: false },
            { text: "Deep Synastry (Relationship) Analysis", included: false },
        ],
        cta: "Begin Your Journey",
        href: "/onboarding",
    },
    {
        name: "Cosmic Flow",
        icon: "GiBeveledStar",
        price: { monthly: "€9", yearly: "€90" },
        setup: { monthly: "Billed monthly", yearly: "Billed yearly" },
        description: "Align your daily routine with the stars.",
        tier: "popular", // Use this to trigger the Gold/Brass visual logic
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: true },
            { text: "RAG-Powered Journal Memory", included: true },
            { text: "Generative Astral Cards", included: false },
            { text: "Deep Synastry (Relationship) Analysis", included: false },
        ],
        cta: "Enter the Flow",
        href: "/checkout/flow",
    },
    {
        name: "Astral Architect",
        icon: "GiCursedStar",
        price: { monthly: "€27", yearly: "€270" },
        setup: { monthly: "Billed monthly", yearly: "Billed yearly" },
        description: "The ultimate spiritual operating system.",
        tier: "premium", // Use this to trigger the Galactic visual logic
        features: [
            { text: "Daily Spark & 1 Transit Analysis", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "Real-time Oracle Queries", included: true },
            { text: "RAG-Powered Journal Memory", included: true },
            { text: "Generative Astral Cards", included: true },
            { text: "Deep Synastry (Relationship) Analysis", included: true },
        ],
        cta: "Master Your Chart",
        href: "/checkout/architect",
    },
];
