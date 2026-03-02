"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUserStore } from "@/store/use-user-store";
import { useRouter, usePathname } from "next/navigation";

// Pages where we should NOT auto-redirect to onboarding
const ONBOARDING_EXEMPT_PATHS = [
    "/onboarding",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/terms",
    "/privacy",
    "/invite",
    "/pricing",
];

export function UserSync() {
    const user = useQuery(api.users.current);
    const setUser = useUserStore((state) => state.setUser);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // user is undefined while loading, null if unauthenticated, or the Doc<"users">
        if (user !== undefined) {
            setUser(user);
        }
    }, [user, setUser]);

    // Redirect authenticated users who need onboarding to /onboarding
    // This catches OAuth callbacks that land on "/" or any other page
    useEffect(() => {
        if (user === undefined || user === null) return; // Still loading or not authenticated

        const needsOnboarding = !user.birthData;
        const isExempt = ONBOARDING_EXEMPT_PATHS.some(
            (path) => pathname === path || pathname.startsWith(path + "/")
        );

        if (needsOnboarding && !isExempt) {
            router.replace("/onboarding");
        }
    }, [user, pathname, router]);

    return null;
}
