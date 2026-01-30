import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    isAuthenticatedNextjs,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/sign-in", "/sign-up", "/forgot-password", "/"]);

export default convexAuthNextjsMiddleware(async (request) => {
    if (!isPublicPage(request) && !(await isAuthenticatedNextjs())) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }
});

export const config = {
    // The following matcher runs middleware on all routes
    // except static assets.
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
