"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUserStore } from "@/store/use-user-store";

export function UserSync() {
    const user = useQuery(api.users.current);
    const setUser = useUserStore((state) => state.setUser);

    useEffect(() => {
        // user is undefined while loading, null if unauthenticated, or the Doc<"users">
        if (user !== undefined) {
            setUser(user);
        }
    }, [user, setUser]);

    return null;
}
