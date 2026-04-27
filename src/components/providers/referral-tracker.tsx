"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

function getReferrerFromCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)starsguide_referrer=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function clearReferrerCookie() {
    document.cookie = "starsguide_referrer=; path=/; max-age=0; SameSite=Lax";
}

export function ReferralTracker() {
    const { isAuthenticated } = useConvexAuth();
    const recordReferral = useMutation(api.referrals.recordReferral);

    useEffect(() => {
        if (isAuthenticated) {
            const referrer = localStorage.getItem("starsguide_referrer") || getReferrerFromCookie();
            if (referrer) {
                recordReferral({ referrerUsername: referrer })
                    .then((result) => {
                        console.log("Referral result:", result);
                        localStorage.removeItem("starsguide_referrer");
                        clearReferrerCookie();
                    })
                    .catch((err) => {
                        console.error("Failed to record referral:", err);
                        localStorage.removeItem("starsguide_referrer");
                        clearReferrerCookie();
                    });
            }
        }
    }, [isAuthenticated, recordReferral]);

    return null;
}
