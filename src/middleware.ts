import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// 1. Define public routes that do not need auth session
const isPublicPage = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/pricing",
    "/onboarding",
    "/birth-chart",
    "/",
    "/terms",
    "/privacy",
    "/invite/(.*)",
    "/learn",
    "/learn/(.*)"
]);

// 2. Define auth pages where authenticated users should be redirected from
const isAuthPage = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/forgot-password"
]);

// 3. Define admin pages (Layer 1: UI Gate — NOT a security boundary)
const isAdminPage = createRouteMatcher(["/admin", "/admin/(.*)"]);

// Use 'middleware' export for Edge Runtime compatibility with Cloudflare Workers
export const middleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    // 4. Check if the user is authenticated using the injected client
    const isAuthenticated = await convexAuth.isAuthenticated();

    // 5. Redirect unauthenticated users trying to access protected pages (like /account, /dashboard)
    if (!isPublicPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    // 6. Redirect authenticated users away from auth pages to /onboarding
    // (onboarding page auto-redirects to /dashboard if birthData is already set)
    if (isAuthenticated && isAuthPage(request)) {
        return nextjsMiddlewareRedirect(request, "/onboarding");
    }

    // 7. Admin route protection (Layer 1: Fast UI gate)
    // The real admin enforcement happens in Layer 2 (Convex requireAdmin guard).
    // This middleware simply ensures unauthenticated users can't even see the admin UI.
    // Authenticated non-admins will be caught by the admin layout's server-side check.
    if (isAdminPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }
});

export const config = {
    // Matcher ignoring static files and Next.js internals
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
