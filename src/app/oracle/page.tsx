import { redirect } from "next/navigation";

/**
 * /oracle — Server component that immediately redirects to /oracle/new.
 * This is the entry point; actual UI lives in /oracle/new and /oracle/chat/[sessionId].
 */
export default function OracleRedirect() {
    redirect("/oracle/new");
}
