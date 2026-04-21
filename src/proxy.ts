import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { format } from "date-fns";

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
    "/learn/(.*)",
    "/horoscopes",
    "/horoscopes/(.*)",
]);

const isHoroscopeSignWithoutDate = createRouteMatcher([
    "/horoscopes/aries",
    "/horoscopes/taurus",
    "/horoscopes/gemini",
    "/horoscopes/cancer",
    "/horoscopes/leo",
    "/horoscopes/virgo",
    "/horoscopes/libra",
    "/horoscopes/scorpio",
    "/horoscopes/sagittarius",
    "/horoscopes/capricorn",
    "/horoscopes/aquarius",
    "/horoscopes/pisces",
]);

const isAuthPage = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/forgot-password"
]);

const isAdminPage = createRouteMatcher(["/admin", "/admin/(.*)"]);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    const isAuthenticated = await convexAuth.isAuthenticated();

    if (!isPublicPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    if (isAuthenticated && isAuthPage(request)) {
        return nextjsMiddlewareRedirect(request, "/onboarding");
    }

    if (isAdminPage(request) && !isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/sign-in");
    }

    const path = request.nextUrl.pathname;
    if (isHoroscopeSignWithoutDate(request)) {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        return nextjsMiddlewareRedirect(request, `${path}/${todayStr}`);
    }
});

export const config = {
    // Matcher ignoring static files and Next.js internals
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
