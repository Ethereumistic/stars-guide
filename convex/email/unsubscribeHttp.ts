/**
 * unsubscribeHttp.ts — HTTP endpoint for one-click List-Unsubscribe.
 *
 * CAN-SPAM and Gmail's RFC 8058 require a working one-click unsubscribe
 * endpoint that accepts POST with the unsubscribe token.
 *
 * This also serves the GET endpoint for browser-based unsubscribe links.
 *
 * Registered in convex/http.ts.
 */
import { httpAction } from "../_generated/server";
import { makeFunctionReference } from "convex/server";

const verifyAndUnsubscribeRef = makeFunctionReference<"action", { token: string }, any>(
    "email/unsubscribeActions:verifyAndUnsubscribe",
);

export const unsubscribeHandler = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    // ── CORS preflight ────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(),
        });
    }

    // ── GET: Browser redirect to unsubscribe page ────────────────────────
    if (request.method === "GET") {
        if (!token) {
            return new Response("Missing token parameter", { status: 400 });
        }
        // Redirect to the Next.js unsubscribe page with the token
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/unsubscribe?token=${encodeURIComponent(token)}`,
                ...corsHeaders(),
            },
        });
    }

    // ── POST: One-click List-Unsubscribe (RFC 8058) ──────────────────────
    if (request.method === "POST") {
        // The token might come from the URL param or from the form body
        const bodyToken = await extractFormToken(request);
        const finalToken = token || bodyToken;

        if (!finalToken) {
            return new Response("Missing token", { status: 400, headers: corsHeaders() });
        }

        try {
            const result: any = await ctx.runAction(verifyAndUnsubscribeRef, {
                token: finalToken!,
            });

            return new Response(
                JSON.stringify({ success: true, message: "Successfully unsubscribed" }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders(),
                    },
                },
            );
        } catch (err: any) {
            return new Response(
                JSON.stringify({ success: false, error: err.message ?? "Unsubscribe failed" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders(),
                    },
                },
            );
        }
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
});

function corsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, List-Unsubscribe",
    };
}

async function extractFormToken(request: Request): Promise<string | null> {
    try {
        const text = await request.text();
        if (!text) return null;
        // Could be URL-encoded or JSON
        if (text.startsWith("{")) {
            const json = JSON.parse(text);
            return json.token ?? null;
        }
        const params = new URLSearchParams(text);
        return params.get("token");
    } catch {
        return null;
    }
}
