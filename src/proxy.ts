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
    "/"
]);

// 2. Define auth pages where authenticated users should be redirected from
const isAuthPage = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/forgot-password"
]);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    // 3. Check if the user is authenticated using the injected client
    const isAuthenticated = await convexAuth.isAuthenticated();

    // 4. Redirect unauthenticated users trying to access protected pages (like /account, /dashboard)
    if (!isPublicPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    // 5. Redirect authenticated users away from auth pages to /dashboard
    if (isAuthenticated && isAuthPage(request)) {
        return nextjsMiddlewareRedirect(request, "/dashboard");
    }
});

export const config = {
    // Matcher ignoring static files and Next.js internals
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};