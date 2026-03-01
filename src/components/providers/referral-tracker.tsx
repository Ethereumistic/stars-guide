"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ReferralTracker() {
    const { isAuthenticated } = useConvexAuth();
    const recordReferral = useMutation(api.referrals.recordReferral);

    useEffect(() => {
        if (isAuthenticated) {
            const referrer = localStorage.getItem("starsguide_referrer");
            if (referrer) {
                // Try to record the referral
                recordReferral({ referrerUsername: referrer })
                    .then((result) => {
                        console.log("Referral result:", result);
                        // Always clear to prevent retry spam
                        localStorage.removeItem("starsguide_referrer");
                    })
                    .catch((err) => {
                        console.error("Failed to record referral:", err);
                        localStorage.removeItem("starsguide_referrer");
                    });
            }
        }
    }, [isAuthenticated, recordReferral]);

    return null;
}
