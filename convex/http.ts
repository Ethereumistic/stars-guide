import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { unsubscribeHandler } from "./email/unsubscribeHttp";

const http = httpRouter();

auth.addHttpRoutes(http);

// ─── One-Click Unsubscribe (CAN-SPAM / RFC 8058) ──────────────────────────
// GET  /unsubscribe?token=... → redirects to Next.js page
// POST /unsubscribe?token=... → one-click list-unsubscribe for email clients
http.route({
    path: "/unsubscribe",
    method: "GET",
    handler: unsubscribeHandler,
});
http.route({
    path: "/unsubscribe",
    method: "POST",
    handler: unsubscribeHandler,
});
http.route({
    path: "/unsubscribe",
    method: "OPTIONS",
    handler: unsubscribeHandler,
});

export default http;