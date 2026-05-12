"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { SignUpForm } from "@/app/(auth)/sign-up/sign-up-form";
import { PlanetShowcase } from "@/components/auth/planet-showcase";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import { planetUIConfig } from "@/config/planet-ui";
import { useUserStore } from "@/store/use-user-store";
import { InviteCard } from "./_components/invite-card";

function setReferrerCookie(username: string) {
    document.cookie = `starsguide_referrer=${username}; path=/; max-age=${604800}; SameSite=Lax`;
}

const PLANET_IDS = [
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
];

const fallbackColors: Record<string, string> = {
    sun: "#D4AF37",
    moon: "#C0C0C0",
    mercury: "#A0A0A0",
    venus: "#CD7F32",
    mars: "#B22222",
    jupiter: "#DAA520",
    saturn: "#C0B283",
    uranus: "#5F9EA0",
    neptune: "#4682B4",
    pluto: "#8B7355",
};

export default function InvitePage() {
    const params = useParams();
    const username = params.username as string;
    const [mounted, setMounted] = useState(false);
    const { user, isLoading, isAuthenticated } = useUserStore();

    const planetId = useMemo(() => PLANET_IDS[Math.floor(Math.random() * PLANET_IDS.length)], []);
    const ui = planetUIConfig[planetId];
    const [themeColor, setThemeColor] = useState(fallbackColors[planetId] || "#D4AF37");
    const imageScale = ui?.imageScale ?? 1;

    useEffect(() => {
        if (ui?.themeColor?.startsWith("var(")) {
            const varName = ui.themeColor.slice(4, -1);
            const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (resolved) setThemeColor(resolved);
        } else if (ui?.themeColor) {
            setThemeColor(ui.themeColor);
        }
    }, [ui?.themeColor]);

    useEffect(() => {
        if (username) {
            localStorage.setItem("starsguide_referrer", username);
            setReferrerCookie(username);
            setMounted(true);
        }
    }, [username]);

    // Determine if this is the invite owner viewing their own card
    const isOwnInvite = !isLoading && isAuthenticated() && user?.username === username;

    // Authenticated but viewing someone else's invite — redirect to own invite page
    const isDifferentUserInvite = !isLoading && isAuthenticated() && user?.username && user.username !== username;

    // Build invite URL
    const inviteUrl = typeof window !== "undefined"
        ? `${window.location.origin}/invite/${username}`
        : `/invite/${username}`;

    if (!mounted) return null;

    // ===== OWN INVITE CARD VIEW =====
    if (isOwnInvite && user) {
        return <InviteCard user={user} inviteUrl={inviteUrl} />;
    }

    // ===== AUTHENTICATED DIFFERENT USER — REDIRECT TO OWN INVITE =====
    if (isDifferentUserInvite && user.username) {
        if (typeof window !== "undefined") {
            window.location.href = `/invite/${user.username}`;
        }
        return null;
    }

    // ===== DEFAULT: SIGN-UP INVITE VIEW (unauthenticated) =====
    return (
        <div className="w-full max-w-[880px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
            >
                <Card className="border-primary/10 bg-background/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden relative">
                    {/* Mobile planet inside the card */}
                    <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-background/70" />
                        <div
                            className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-30"
                            style={{
                                background: `radial-gradient(circle, ${themeColor}40 0%, transparent 70%)`,
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -55%)",
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                            transition={{
                                opacity: { duration: 1.2, delay: 0.3 },
                                scale: { duration: 1.2, delay: 0.3 },
                                y: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                            }}
                            className="absolute"
                            style={{
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -55%)",
                                width: "75%",
                                maxWidth: "320px",
                            }}
                        >
                            {ui?.imageUrl && (
                                <img
                                    src={ui.imageUrl}
                                    alt=""
                                    className="w-full h-auto object-contain opacity-50"
                                    style={{
                                        transform: `scale(${imageScale})`,
                                        filter: `drop-shadow(0 0 30px ${themeColor}30)`,
                                    }}
                                    draggable={false}
                                />
                            )}
                        </motion.div>
                    </div>

                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 lg:grid-cols-7">
                            {/* Form */}
                            <div className="p-6 lg:p-8 col-span-3 relative z-10">
                                <SignUpForm
                                    bare
                                    title={
                                        <span className="flex items-center justify-center gap-3">
                                            Cosmic Invitation
                                        </span>
                                    }
                                    subtitle={
                                        <span className="leading-relaxed">
                                            <strong className="text-primary not-italic text-base">@{username}</strong> has invited you to navigate your fate and map your celestial journey.
                                        </span>
                                    }
                                />
                            </div>

                            {/* Planet Showcase (desktop only) */}
                            <div className="hidden lg:block col-span-4">
                                <PlanetShowcase />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}