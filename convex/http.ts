import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleResendWebhook } from "./email/webhooks";

const http = httpRouter();

auth.addHttpRoutes(http);
http.post("/email/webhooks/resend", handleResendWebhook);

export default http;
