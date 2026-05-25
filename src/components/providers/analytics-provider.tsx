"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { configureAnalytics } from "@/lib/analytics";

const VISITOR_ID_KEY = "sg_visitor_id";
const SESSION_ID_KEY = "sg_session_id";

function getOrCreateVisitorId(): string {
    if (typeof window === "undefined") return "";
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
        vid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
}

function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
        sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
}

function parseUtmParams(): {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
} {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        utmTerm: params.get("utm_term") ?? undefined,
        utmContent: params.get("utm_content") ?? undefined,
    };
}

function getReferringDomain(): string | undefined {
    if (typeof document === "undefined") return undefined;
    return document.referrer ? new URL(document.referrer).hostname : undefined;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useConvexAuth();
    const recordUtmEvent = useMutation(api.analytics.recordUtmEvent);
    const recordSessionStart = useMutation(api.analytics.recordSessionStart);
    const recordFeatureEvent = useMutation(api.analytics.recordFeatureEvent);
    const linkUtmToUser = useMutation(api.analytics.linkUtmToUser);

    const visitorIdRef = useRef<string>("");
    const sessionIdRef = useRef<string>("");
    const utmEventIdRef = useRef<string | null>(null);
    const hasLinkedUser = useRef(false);

    // ── Initialize on mount ────────────────────────────────────────────────
    useEffect(() => {
        const vid = getOrCreateVisitorId();
        const sid = getOrCreateSessionId();
        visitorIdRef.current = vid;
        sessionIdRef.current = sid;

        // Expose IDs for the lib/analytics module
        configureAnalytics(sid, vid);

        const utm = parseUtmParams();

        if (utm.utmSource || utm.utmMedium || utm.utmCampaign) {
            // Record UTM event (first-touch attribution)
            recordUtmEvent({
                visitorId: vid,
                ...utm,
                referringDomain: getReferringDomain(),
                landingPage: window.location.pathname,
            }).then((id) => {
                if (id) utmEventIdRef.current = id as string;
            }).catch(console.error);
        } else {
            // Record anonymous session_start for non-UTM traffic
            recordSessionStart({
                visitorId: vid,
                sessionId: sid,
                utmEventId: undefined,
            }).catch(console.error);
        }
    }, [recordUtmEvent, recordSessionStart]);

    // ── Heartbeat: record activity every 30s ───────────────────────────────
    useEffect(() => {
        const INTERVAL_MS = 30_000;
        const tick = () => {
            if (!sessionIdRef.current) return;
            recordFeatureEvent({
                eventName: "session_heartbeat",
                userId: undefined,
                sessionId: sessionIdRef.current,
                metadata: { elapsedMs: String(INTERVAL_MS) },
                utmEventId: (utmEventIdRef.current as any) ?? undefined,
                funnelStage: undefined,
            }).catch(() => {});
        };
        const id = setInterval(tick, INTERVAL_MS);
        return () => clearInterval(id);
    }, [recordFeatureEvent]);

    // ── On authentication: link UTM to userId ─────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        if (hasLinkedUser.current) return;
        hasLinkedUser.current = true;

        if (utmEventIdRef.current) {
            // Note: userId must be resolved server-side from visitorId.
            // Pass visitorId so the mutation can look it up from the existing session context.
            linkUtmToUser({
                visitorId: visitorIdRef.current,
                utmEventId: utmEventIdRef.current as any,
            }).catch(console.error);
        }
    }, [isAuthenticated, linkUtmToUser]);

    return <>{children}</>;
}
