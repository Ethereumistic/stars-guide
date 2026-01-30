import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// 1. Define public routes explicitly
const isPublicPage = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/"
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    // 2. Check if the user is authenticated using the injected client
    const isAuthenticated = await convexAuth.isAuthenticated();

    // 3. Redirect unauthenticated users trying to access protected pages
    if (!isPublicPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    // 4. (Optional) Redirect authenticated users away from auth pages
    if (isPublicPage(request) && isAuthenticated && request.nextUrl.pathname !== "/") {
        // e.g. redirect to dashboard if they are already logged in
        // return nextjsMiddlewareRedirect(request, "/dashboard");
    }
});

export const config = {
    // Matcher ignoring static files and Next.js internals
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};