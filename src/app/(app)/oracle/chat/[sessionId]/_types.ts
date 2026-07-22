import type { Id } from "@/../convex/_generated/dataModel";
import type { ReasoningEffort } from "@/lib/ai/inference-preferences";
import type {
  OraclePublicationMode,
  OracleTurnSectionStatus,
  OracleTurnStatus,
} from "@/lib/oracle/streaming/types";

export type OracleConversationMessage = {
  _id: Id<"oracle_messages">;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  turnId?: Id<"oracle_turns">;
  streamProtocolVersion?: string;
  rating?: "positive" | "negative";
  outcome?: "resonant" | "not_relevant" | "not_yet_known";
  watchReviewAt?: number;
  [key: string]: unknown;
};

export type OracleConversationTurn = {
  _id: Id<"oracle_turns">;
  userMessageId: Id<"oracle_messages">;
  assistantMessageId: Id<"oracle_messages">;
  retryOfTurnId?: Id<"oracle_turns">;
  status: OracleTurnStatus;
  active: boolean;
  publicationMode: OraclePublicationMode;
  protocolVersion: "oracle-stream-v2";
  currentSectionKey?: string;
  requiredSectionKeys?: string[];
  publishedSectionKeys?: string[];
  resumeSectionKeys?: string[];
  lastSequence: number;
  publishedChars: number;
  partial: boolean;
  firstClientVisibleAt?: number;
  safeErrorCode?: string;
  safeErrorMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  failedAt?: number;
  cancelledAt?: number;
};

export type OracleConversationSection = {
  _id: Id<"oracle_turn_sections">;
  turnId: Id<"oracle_turns">;
  key: string;
  ordinal: number;
  title: string;
  status: OracleTurnSectionStatus;
  content?: string;
  publishedAt?: number;
  updatedAt: number;
};

export type OracleConversationView = {
  featureKey?: string;
  modelOptionKey?: string;
  reasoningEffort?: ReasoningEffort;
  status: "active" | "completed";
  messages: OracleConversationMessage[];
  turns: OracleConversationTurn[];
  sections: OracleConversationSection[];
  activeTurn: OracleConversationTurn | null;
  [key: string]: unknown;
};

export const TERMINAL_TURN_STATUSES = new Set<OracleTurnStatus>([
  "complete",
  "incomplete",
  "failed",
  "cancelled",
]);

export function isTerminalTurn(turn?: OracleConversationTurn | null): boolean {
  return Boolean(turn && TERMINAL_TURN_STATUSES.has(turn.status));
}
