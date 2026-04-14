"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Option 2: Static Canvas + CSS Twinkle Overlay
//
// Stars are drawn ONCE onto a canvas (no animation loop).
// Twinkle is handled by a small set of CSS-animated <div> dots overlaid.
// Shooting stars use requestAnimationFrame with direct canvas drawing
// (no React state) — only 1 shooting star active at a time, drawn directly.
// ---------------------------------------------------------------------------

/* ---------- Shared types (identical to original components) ---------- */

interface ShootingStarsProps {
    minSpeed?: number;
    maxSpeed?: number;
    minDelay?: number;
    maxDelay?: number;
    starColor?: string;
    trailColor?: string;
    starWidth?: number;
    starHeight?: number;
    className?: string;
}

interface StarBackgroundProps {
    starDensity?: number;
    allStarsTwinkle?: boolean;
    twinkleProbability?: number;
    minTwinkleSpeed?: number;
    maxTwinkleSpeed?: number;
    className?: string;
}

/* ---------- Helpers ---------- */

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

interface StarData {
    x: number;
    y: number;
    radius: number;
    opacity: number;
}

function generateStars(width: number, height: number, density: number): StarData[] {
    const count = Math.floor(width * height * density);
    return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.5,
    }));
}

// Inject twinkle keyframes once
let twinkleStylesInjected = false;
const TWINKLE_STYLE_ID = "stars-canvas-twinkle-styles";

function injectTwinkleStyles() {
    if (typeof document === "undefined") return;
    if (twinkleStylesInjected) return;
    if (document.getElementById(TWINKLE_STYLE_ID)) {
        twinkleStylesInjected = true;
        return;
    }
    const sheet = document.createElement("style");
    sheet.id = TWINKLE_STYLE_ID;
    sheet.textContent = `
@keyframes twinkle-canvas {
    0%   { opacity: 0.2; transform: scale(0.6); }
    100% { opacity: 1;   transform: scale(1.3); }
}
`;
    document.head.appendChild(sheet);
    twinkleStylesInjected = true;
}

/* =================================================================== */
/*  StarsBackground (Static Canvas + CSS Twinkle)                      */
/* =================================================================== */

export const StarsBackground: React.FC<StarBackgroundProps> = ({
    starDensity = 0.00015,
    allStarsTwinkle = true,
    twinkleProbability = 0.7,
    minTwinkleSpeed = 0.5,
    maxTwinkleSpeed = 1,
    className,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const twinklersRef = useRef<HTMLDivElement[]>([]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        // Set canvas size (this clears it)
        canvas.width = width;
        canvas.height = height;

        // Draw all stars once — no animation loop
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const stars = generateStars(width, height, starDensity);
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
        }

        // --- CSS Twinkle Overlay ---
        // Remove old twinklers
        twinklersRef.current.forEach((el) => el.remove());
        twinklersRef.current = [];

        injectTwinkleStyles();

        const totalStars = Math.floor(width * height * starDensity);
        const twinkleCount = allStarsTwinkle
            ? Math.min(Math.floor(totalStars * 0.12), 50)
            : Math.min(Math.floor(totalStars * twinkleProbability * 0.12), 50);

        for (let i = 0; i < twinkleCount; i++) {
            const dot = document.createElement("div");
            const size = rand(1.5, 3);
            dot.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: white;
                left: ${Math.random() * width}px;
                top: ${Math.random() * height}px;
                opacity: 0.5;
                pointer-events: none;
                will-change: opacity, transform;
                animation: twinkle-canvas ${rand(minTwinkleSpeed, maxTwinkleSpeed).toFixed(2)}s ease-in-out ${rand(0, 3).toFixed(2)}s infinite alternate;
            `;
            container.appendChild(dot);
            twinklersRef.current.push(dot);
        }
    }, [starDensity, allStarsTwinkle, twinkleProbability, minTwinkleSpeed, maxTwinkleSpeed]);

    useEffect(() => {
        draw();

        // Debounced resize
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(draw, 200);
        });
        if (containerRef.current) ro.observe(containerRef.current);

        return () => {
            clearTimeout(timer);
            ro.disconnect();
            twinklersRef.current.forEach((el) => el.remove());
            twinklersRef.current = [];
        };
    }, [draw]);

    return (
        <div
            ref={containerRef}
            className={cn("w-full h-full absolute inset-0 overflow-hidden", className)}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />
        </div>
    );
};

/* =================================================================== */
/*  ShootingStars (Canvas, no React state)                             */
/* =================================================================== */

interface ShootingStar {
    x: number;
    y: number;
    angle: number;
    speed: number;
    distance: number;
    maxDistance: number;
}

export const ShootingStars: React.FC<ShootingStarsProps> = ({
    minSpeed = 10,
    maxSpeed = 30,
    minDelay = 1200,
    maxDelay = 4200,
    starColor = "#9E00FF",
    trailColor = "#2EB9DF",
    starWidth = 10,
    starHeight = 1,
    className,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starRef = useRef<ShootingStar | null>(null);
    const rafRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Parse hex colors to RGB once
    const starRGB = useRef({ r: 0, g: 0, b: 0 });
    const trailRGB = useRef({ r: 0, g: 0, b: 0 });

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
            : { r: 255, g: 255, b: 255 };
    };

    // Update RGB refs when colors change
    useEffect(() => {
        starRGB.current = hexToRgb(starColor);
        trailRGB.current = hexToRgb(trailColor);
    }, [starColor, trailColor]);

    const spawnStar = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const vw = canvas.width || window.innerWidth;
        const vh = canvas.height || window.innerHeight;

        // Pick a random edge and angle
        const edge = Math.floor(Math.random() * 4);
        let x: number, y: number, angle: number;
        switch (edge) {
            case 0: x = rand(0, vw); y = -5; angle = rand(20, 70); break;
            case 1: x = vw + 5; y = rand(0, vh); angle = rand(110, 160); break;
            case 2: x = rand(0, vw); y = vh + 5; angle = rand(200, 250); break;
            default: x = -5; y = rand(0, vh); angle = rand(290, 340); break;
        }

        const speed = rand(minSpeed, maxSpeed);
        starRef.current = {
            x,
            y,
            angle,
            speed,
            distance: 0,
            maxDistance: rand(200, 600),
        };
    }, [minSpeed, maxSpeed]);

    // Canvas resize handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        };

        resize();
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(resize, 200);
        });
        ro.observe(canvas.parentElement!);

        return () => {
            clearTimeout(timer);
            ro.disconnect();
        };
    }, []);

    // Animation loop — draws directly to canvas, no React state
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const animate = () => {
            const star = starRef.current;

            if (star) {
                // Move star
                const rad = (star.angle * Math.PI) / 180;
                star.x += star.speed * Math.cos(rad);
                star.y += star.speed * Math.sin(rad);
                star.distance += star.speed;

                // Clear only the trail area (optimization: don't clear entire canvas)
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw the shooting star as a gradient line
                const progress = star.distance / star.maxDistance;
                const tailLength = 40 + progress * 80;
                const headX = star.x;
                const headY = star.y;
                const tailX = headX - tailLength * Math.cos(rad);
                const tailY = headY - tailLength * Math.sin(rad);

                const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
                const { r: tr, g: tg, b: tb } = trailRGB.current;
                const { r: sr, g: sg, b: sb } = starRGB.current;
                gradient.addColorStop(0, `rgba(${tr},${tg},${tb},0)`);
                gradient.addColorStop(0.6, `rgba(${tr},${tg},${tb},0.6)`);
                gradient.addColorStop(1, `rgba(${sr},${sg},${sb},1)`);

                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(headX, headY);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = starHeight + progress * 0.5;
                ctx.lineCap = "round";
                ctx.stroke();

                // Bright head dot
                ctx.beginPath();
                ctx.arc(headX, headY, starHeight + 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${sr},${sg},${sb},${1 - progress * 0.3})`;
                ctx.fill();

                // Check if star has left viewport or traveled max distance
                if (
                    star.x < -50 || star.x > canvas.width + 50 ||
                    star.y < -50 || star.y > canvas.height + 50 ||
                    star.distance > star.maxDistance
                ) {
                    starRef.current = null;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
        };
    }, [starHeight]);

    // Spawn timer — fires a new star at random intervals
    useEffect(() => {
        const scheduleNext = () => {
            const delay = rand(minDelay, maxDelay);
            timerRef.current = setTimeout(() => {
                spawnStar();
                scheduleNext();
            }, delay);
        };

        // Launch first star quickly
        const initialDelay = rand(100, 500);
        timerRef.current = setTimeout(() => {
            spawnStar();
            scheduleNext();
        }, initialDelay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [spawnStar, minDelay, maxDelay]);

    return (
        <canvas
            ref={canvasRef}
            className={cn("w-full h-full absolute inset-0", className)}
        />
    );
};
