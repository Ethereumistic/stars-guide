import { describe, expect, it } from "vitest";
import { getOracleTurnStatusCopy } from "./oracle-turn-status-copy";
import type { OracleConversationSection, OracleConversationTurn } from "../_types";

function turn(status: OracleConversationTurn["status"], currentSectionKey?: string): OracleConversationTurn {
  return {
    _id: "turn" as OracleConversationTurn["_id"],
    userMessageId: "user" as OracleConversationTurn["userMessageId"],
    assistantMessageId: "assistant" as OracleConversationTurn["assistantMessageId"],
    status,
    active: !["complete", "incomplete", "failed", "cancelled"].includes(status),
    publicationMode: "validated_sections",
    protocolVersion: "oracle-stream-v2",
    currentSectionKey,
    lastSequence: 0,
    publishedChars: 0,
    partial: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("Oracle turn stage copy", () => {
  it("maps persisted lifecycle stages to honest accessible copy", () => {
    expect(getOracleTurnStatusCopy(turn("queued"), [])).toBe("Preparing your reading…");
    expect(getOracleTurnStatusCopy(turn("planning"), [])).toBe("Understanding your question…");
    expect(getOracleTurnStatusCopy(turn("validating"), [])).toBe("Checking the response…");
    expect(getOracleTurnStatusCopy(turn("repairing"), [])).toBe("Refining the response…");
    expect(getOracleTurnStatusCopy(turn("retrying"), [])).toBe("The connection flickered—reconnecting…");
    expect(getOracleTurnStatusCopy(turn("cancel_requested"), [])).toBe("Stopping…");
    expect(getOracleTurnStatusCopy(turn("incomplete"), [])).toBe("The response was interrupted.");
  });

  it("names the persisted natal section while it is being written", () => {
    const section = {
      _id: "section" as OracleConversationSection["_id"],
      turnId: "turn" as OracleConversationSection["turnId"],
      key: "moon",
      ordinal: 1,
      title: "Moon",
      status: "receiving",
      updatedAt: 1,
    } satisfies OracleConversationSection;
    expect(getOracleTurnStatusCopy(turn("generating", "moon"), [section])).toBe("Writing your Moon section…");
  });
});
