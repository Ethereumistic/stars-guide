export const ORACLE_STREAM_PROTOCOL_VERSION = "oracle-stream-v2" as const;

export const ORACLE_TURN_STATUSES = [
  "queued",
  "planning",
  "connecting",
  "generating",
  "validating",
  "repairing",
  "retrying",
  "cancel_requested",
  "complete",
  "incomplete",
  "failed",
  "cancelled",
] as const;

export type OracleTurnStatus = (typeof ORACLE_TURN_STATUSES)[number];

export const ORACLE_TERMINAL_TURN_STATUSES = [
  "complete",
  "incomplete",
  "failed",
  "cancelled",
] as const satisfies readonly OracleTurnStatus[];

export type OracleTerminalTurnStatus =
  (typeof ORACLE_TERMINAL_TURN_STATUSES)[number];

export type OraclePublicationMode =
  | "guarded_batches"
  | "validated_sections"
  | "buffered";

export type OracleTurnSectionStatus =
  | "pending"
  | "receiving"
  | "validating"
  | "published"
  | "repairing"
  | "failed";

export type GatewayErrorCode =
  | "cancelled"
  | "connect_timeout"
  | "idle_timeout"
  | "overall_timeout"
  | "http_4xx"
  | "http_429"
  | "http_5xx"
  | "auth"
  | "malformed_stream"
  | "provider_error_frame"
  | "empty_response"
  | "partial_stream";

export type GatewayStreamEvent =
  | {
      type: "attempt_started";
      providerId: string;
      model: string;
      tier: string;
      startedAt: number;
    }
  | { type: "text_delta"; text: string; receivedAt: number }
  | { type: "reasoning_delta"; charCount: number }
  | {
      type: "usage";
      promptTokens?: number;
      completionTokens?: number;
    }
  | { type: "done" }
  | {
      type: "error";
      code: GatewayErrorCode;
      partial: boolean;
      retryable: boolean;
    };

export type StreamWireProtocol = "sse" | "ndjson";

export type StreamFrameErrorCategory =
  | "invalid_json"
  | "invalid_retry"
  | "event_too_large"
  | "buffer_too_large"
  | "unsupported_payload";

export interface StreamDecoderDiagnostics {
  malformedFrameCount: number;
  droppedFrameCount: number;
  reasoningCharCount: number;
  errorCategories: StreamFrameErrorCategory[];
}

export interface OracleSectionSpec {
  key: string;
  ordinal: number;
  title: string;
  requiredEntities: string[];
  allowedEvidenceKeys: string[];
}

export interface OracleSectionPlan {
  version: "oracle-section-plan-v2";
  sections: OracleSectionSpec[];
}

export interface ParsedOracleSection {
  key: string;
  evidenceKeys: string[];
  content: string;
}

