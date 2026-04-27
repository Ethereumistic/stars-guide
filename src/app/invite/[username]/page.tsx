"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SignUpForm } from "@/app/(auth)/sign-up/sign-up-form";

function setReferrerCookie(username: string) {
    document.cookie = `starsguide_referrer=${username}; path=/; max-age=${604800}; SameSite=Lax`;
}

export default function InvitePage() {
    const params = useParams();
    const username = params.username as string;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (username) {
            localStorage.setItem("starsguide_referrer", username);
            setReferrerCookie(username);
            setMounted(true);
        }
    }, [username]);

    if (!mounted) return null;

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative z-10 w-full max-w-[400px]">
                <SignUpForm
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
        </div>
    );
}
