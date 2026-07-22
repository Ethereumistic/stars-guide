import type { OracleConversationSection, OracleConversationTurn } from "../_types";

export function getOracleTurnStatusCopy(
  turn: OracleConversationTurn,
  sections: OracleConversationSection[],
): string {
  const currentSection = sections.find((section) => section.key === turn.currentSectionKey);
  switch (turn.status) {
    case "queued": return "Preparing your reading…";
    case "planning": return "Understanding your question…";
    case "connecting": return "Connecting to Oracle…";
    case "generating": return currentSection ? `Writing your ${currentSection.title} section…` : "Writing your reading…";
    case "validating": return "Checking the response…";
    case "repairing": return "Refining the response…";
    case "retrying": return "The connection flickered—reconnecting…";
    case "cancel_requested": return "Stopping…";
    case "incomplete": return "The response was interrupted.";
    case "failed": return "Oracle couldn’t complete this response.";
    case "cancelled": return "Response stopped.";
    case "complete": return "Reading complete.";
  }
}
