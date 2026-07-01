import { useId } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GiStarSwirl } from "react-icons/gi";

interface LogoProps {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "auto";
    width?: number;
    height?: number;
    variant?: "logo" | "logomark" | "logotype";
    layout?: "vertical" | "horizontal_right" | "horizontal_left";
    textClassName?: string;
    /** Switch between the image logo and the GiStarSwirl icon */
    icon?: boolean;
}

const sizes = {
    xs: { width: 56, height: 32 },
    sm: { width: 68, height: 44 },
    md: { width: 112, height: 63 },
    lg: { width: 168, height: 95 },
    xl: { width: 224, height: 126 },
    auto: { width: 0, height: 0 },
};

const iconSizes = {
    xs: "text-[1.95rem]",
    sm: "text-[2.45rem]",
    md: "text-[3.9rem]",
    lg: "text-[5.85rem]",
    xl: "text-[7.8rem]",
    auto: "text-[3.9rem]",
};

const glowConfigs = {
    xs: { blur: "blur-[1.5px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 1.5px var(--galactic))" },
    sm: { blur: "blur-[2px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 2px var(--galactic))" },
    md: { blur: "blur-[3px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 3.5px var(--galactic))" },
    lg: { blur: "blur-[4px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 5px var(--galactic))" },
    xl: { blur: "blur-[6px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 7px var(--galactic))" },
    auto: { blur: "blur-[6px]", shadow: "drop-shadow(0 0 0.5px var(--primary)) drop-shadow(0 0 7px var(--galactic))" },
};

export function Logo({
    className,
    size = "md",
    width,
    height,
    variant = "logo",
    layout = "horizontal_right",
    textClassName,
    icon = true,
}: LogoProps) {
    const id = useId();
    const logoGradientId = `stars-guide-logo-gradient-${id.replace(/:/g, "")}`;
    const dimensions = size === "auto" ? { width, height } : sizes[size];
    const glow = glowConfigs[size];

    const logomark = icon ? (
        <span className="relative inline-grid shrink-0 place-items-center">
            <svg
                aria-hidden="true"
                focusable="false"
                className="absolute size-0 overflow-hidden"
            >
                <defs>
                    <linearGradient
                        id={logoGradientId}
                        x1="12%"
                        y1="8%"
                        x2="88%"
                        y2="92%"
                    >
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="62%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--galactic)" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Soft galactic aura behind the exact same icon shape */}
            <GiStarSwirl
                aria-hidden="true"
                className={cn(
                    "col-start-1 row-start-1 shrink-0 opacity-15 transition-all duration-300",
                    glow.blur,
                    iconSizes[size],
                )}
                style={{ color: "var(--galactic)" }}
            />

            {/* The actual GiStarSwirl mark, filled with the brand gradient */}
            <GiStarSwirl
                className={cn(
                    "relative z-10 col-start-1 row-start-1 shrink-0 transition-all duration-300",
                    iconSizes[size],
                )}
                style={{
                    fill: `url(#${logoGradientId})`,
                    filter: glow.shadow,
                }}
            />
        </span>
    ) : (
        <Image
            src="https://cdn.jsdelivr.net/gh/Ethereumistic/stars-guide-assets/logo/500x500.webp"
            alt="stars.guide Logo"
            width={dimensions.width || width}
            height={dimensions.height || height}
            className=" transition-all duration-300 object-contain "
            priority
        />
    );

    const logotype = (
        <span
            className={cn(
                " tracking-tighter transition-all duration-300 whitespace-nowrap text-secondary-foreground",
                size === "xs" && "text-xl",
                size === "sm" && "text-2xl",
                size === "md" && "text-3xl",
                size === "lg" && "text-4xl",
                size === "xl" && "text-5xl",
                layout === "vertical" && "text-center leading-none",
                textClassName
            )}
            style={
                layout === "vertical"
                    ? {
                        // Mathematical magic to make font-size relative to container width
                        // "stars.guide" is ~11 characters.
                        // This calculation ensures the text is always exactly as wide as the image.
                        fontSize: `calc(${(dimensions.width || width)}px * 0.20)`,
                        width: dimensions.width || width,
                    }
                    : {}
            }
        >
            <span className="dark:text-secondary-foreground text-foreground font-bold">stars</span>.guide
        </span>
    );

    if (variant === "logomark") {
        return <div className={cn("relative flex items-center justify-center", className)}>{logomark}</div>;
    }

    if (variant === "logotype") {
        return <div className={cn("relative flex items-center justify-center", className)}>{logotype}</div>;
    }

    return (
        <div
            className={cn(
                "relative flex items-center gap-2",
                layout === "vertical" && "flex-col gap-1",
                layout === "horizontal_left" && "flex-row-reverse",
                className
            )}
        >
            {logomark}
            {logotype}
        </div>
    );
}
