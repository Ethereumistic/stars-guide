import { GiPolarStar, GiBeveledStar, GiCursedStar, GiStarSwirl } from "react-icons/gi";

export interface PricingFeature {
    text: string;
    included: boolean;
}

export interface PricingPlan {
    name: string;
    icon: string;
    iconComponent: React.ElementType;
    price: {
        monthly: string;
        yearly: string;
        yearlyMonthly: string;
    };
    setup: {
        monthly: string;
        yearly: string;
    };
    description: string;
    role: "user" | "popular" | "premium";
    features: PricingFeature[];
    cta: string;
    href: string;
    ui: {
        glowColor: string;
        borderColor: string;
        diagonalGlareColor: string;
        titleColorClass: string;
        iconGlowColor: string;
        buttonGlowColor: string;
        iconColor: string;
        iconAnimate: string;
        starColor: string;
        trailColor: string;
    };
}

export const IconMap: Record<string, React.ElementType> = {
    GiPolarStar,
    GiBeveledStar,
    GiCursedStar,
    GiStarSwirl,
};

export const plans: PricingPlan[] = [
    {
        name: "Free",
        icon: "GiPolarStar",
        iconComponent: GiPolarStar,
        price: { monthly: "€0", yearly: "€0", yearlyMonthly: "€0" },
        setup: { monthly: "Always free", yearly: "Always free" },
        description: "Your daily connection to the cosmos.",
        role: "user",
        features: [
            { text: "Daily Horoscope & 1 Birth Chart", included: true },
            { text: "Accurate Astronomical Charting", included: true },
            { text: "5 Oracle Questions", included: true },
            { text: "Synastry", included: false },
            { text: "Journal Memory", included: false },
            { text: "Generative Astral Cards", included: false },
        ],
        cta: "Begin Your Journey",
        href: "/onboarding",
        ui: {
            glowColor: "rgba(71, 85, 105, 0.2)",
            borderColor: "border-white/20",
            diagonalGlareColor: "rgba(255,255,255,0.06)",
            titleColorClass: "text-white",
            iconGlowColor: "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
            buttonGlowColor: "hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]",
            iconColor: "text-white",
            iconAnimate: "group-hover:scale-110",
            starColor: "#ffffff",
            trailColor: "#ffffff",
        },
    },
    {
        name: "Cosmic Flow",
        icon: "GiBeveledStar",
        iconComponent: GiBeveledStar,
        price: { monthly: "€9", yearly: "€60", yearlyMonthly: "€5" },
        setup: { monthly: "Billed monthly", yearly: "Billed yearly" },
        description: "Align your daily routine with the stars.",
        role: "popular",
        features: [
            { text: "Everything in Free", included: true },
            { text: "Journal Memory", included: true },
            { text: "3 Birth Charts & 2 Synastry", included: true },
            { text: "5 Oracle Questions per day", included: true },
            { text: "Tomorrow & Yesterday Horoscopes", included: true },
            { text: "Generative Astral Cards", included: false },
            { text: "Deep Synastry", included: false },
        ],
        cta: "Enter the Flow",
        href: "/checkout/flow",
        ui: {
            glowColor: "rgba(212, 175, 55, 0.4)",
            borderColor: "border-primary/60",
            diagonalGlareColor: "rgba(212, 175, 55, 0.08)",
            titleColorClass: "text-primary drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]",
            iconGlowColor: "drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]",
            buttonGlowColor: "hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]",
            iconColor: "text-primary",
            iconAnimate: "group-hover:rotate-45 group-hover:scale-115 transition-all duration-1500",
            starColor: "#d4af37",
            trailColor: "#8b7355",
        },
    },
    {
        name: "Oracle",
        icon: "GiCursedStar",
        iconComponent: GiCursedStar,
        price: { monthly: "€27", yearly: "€180", yearlyMonthly: "€15" },
        setup: { monthly: "Billed monthly", yearly: "Billed yearly" },
        description: "The ultimate spiritual operating system.",
        role: "premium",
        features: [
            { text: "Everything in Cosmic Flow", included: true },
            { text: "Infinite Birth Charts & Synastry", included: true },
            { text: "10 Oracle Questions per day", included: true },
            { text: "Journal Memory", included: true },
            { text: "Generative Astral Cards", included: true },
            { text: "Deep Synastry (Relationship) Analysis", included: true },
        ],
        cta: "Master Your Chart",
        href: "/checkout/architect",
        ui: {
            glowColor: "rgba(138, 43, 226, 0.4)",
            borderColor: "border-galactic/60",
            diagonalGlareColor: "rgba(138, 43, 226, 0.08)",
            titleColorClass: "text-galactic drop-shadow-[0_0_15px_rgba(157,78,221,0.3)]",
            iconGlowColor: "drop-shadow-[0_0_15px_rgba(157,78,221,0.6)]",
            buttonGlowColor: "hover:drop-shadow-[0_0_15px_rgba(138,43,226,0.6)]",
            iconColor: "text-galactic",
            iconAnimate: "group-hover:rotate-[720deg] group-hover:scale-120 transition-all duration-[2000ms]",
            starColor: "#9d4edd",
            trailColor: "#9d4edd",
        },
    },
];

export function getPlanByRole(role: "user" | "popular" | "premium"): PricingPlan | undefined {
    return plans.find(plan => plan.role === role);
}
