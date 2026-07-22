import { describe, expect, it } from "vitest";
import { OracleSectionStreamParser } from "./sectionParser";
import type { OracleSectionPlan } from "./types";

const plan: OracleSectionPlan = {
  version: "oracle-section-plan-v2",
  sections: [
    { key: "sun", ordinal: 0, title: "Your Sun", requiredEntities: ["sun"], allowedEvidenceKeys: ["placement:sun"] },
    { key: "moon", ordinal: 1, title: "Your Moon", requiredEntities: ["moon"], allowedEvidenceKeys: ["placement:moon"] },
  ],
};

const framed = [
  '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>',
  "## Your Sun",
  "Warm and bright.",
  "<<<END_ORACLE_SECTION_V2>>>",
  '<<<ORACLE_SECTION_V2 {"key":"moon","evidenceKeys":["placement:moon"]}>>>',
  "## Your Moon",
  "Quiet and reflective.",
  "<<<END_ORACLE_SECTION_V2>>>",
].join("\n");

function parseWithSplits(source: string, splits: number[]) {
  const parser = new OracleSectionStreamParser({ plan });
  const events = [];
  let start = 0;
  for (const end of [...splits, source.length]) {
    events.push(...parser.push(source.slice(start, end)));
    start = end;
  }
  events.push(...parser.finish());
  return { events, fallback: parser.fallbackContent };
}

describe("OracleSectionStreamParser", () => {
  it("parses markers split at every character boundary", () => {
    for (let split = 1; split < framed.length; split += 1) {
      const result = parseWithSplits(framed, [split]);
      const sections = result.events.filter((event) => event.type === "section");
      expect(sections, `split at ${split}`).toHaveLength(2);
      expect(sections[0]).toEqual(expect.objectContaining({
        section: expect.objectContaining({ key: "sun", content: expect.stringContaining("Warm and bright.") }),
      }));
      expect(JSON.stringify(result.events), `split at ${split}`).not.toContain("ORACLE_SECTION_V2");
    }
  });

  it("parses multiple complete sections from one delta", () => {
    const result = parseWithSplits(framed, []);
    expect(result.events.filter((event) => event.type === "section")).toHaveLength(2);
    expect(result.fallback).toBe("");
  });

  it("rejects unknown, duplicate, and out-of-order keys", () => {
    const unknown = parseWithSplits(
      '<<<ORACLE_SECTION_V2 {"key":"venus","evidenceKeys":[]}>>>\n',
      [],
    );
    expect(unknown.events).toContainEqual(expect.objectContaining({ code: "unknown_section" }));

    const outOfOrder = parseWithSplits(
      '<<<ORACLE_SECTION_V2 {"key":"moon","evidenceKeys":["placement:moon"]}>>>\n',
      [],
    );
    expect(outOfOrder.events).toContainEqual(expect.objectContaining({ code: "out_of_order_section" }));

    const duplicateSource = `${framed}\n<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":[]}>>>\n`;
    const duplicate = parseWithSplits(duplicateSource, []);
    expect(duplicate.events).toContainEqual(expect.objectContaining({ code: "duplicate_section" }));
  });

  it("reports missing end markers without publishing partial content", () => {
    const result = parseWithSplits(
      '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["placement:sun"]}>>>\npartial',
      [],
    );
    expect(result.events).toContainEqual(expect.objectContaining({ code: "missing_end_marker", sectionKey: "sun" }));
    expect(result.events.some((event) => event.type === "section")).toBe(false);
  });

  it("treats marker-like prose in code fences as fallback and strips controls", () => {
    const source = [
      "Plain markdown.",
      "```text",
      '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":[]}>>>',
      "example",
      "<<<END_ORACLE_SECTION_V2>>>",
      "```",
    ].join("\n");
    const result = parseWithSplits(source, []);
    expect(result.events.some((event) => event.type === "section")).toBe(false);
    expect(result.fallback).toContain("Plain markdown.");
    expect(result.fallback).toContain("example");
    expect(result.fallback).not.toContain("ORACLE_SECTION_V2");
  });

  it("rejects oversized headers and sections", () => {
    const headerParser = new OracleSectionStreamParser({ plan, maxHeaderChars: 30 });
    const headerEvents = [
      ...headerParser.push('<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":[]}>>>\n'),
      ...headerParser.finish(),
    ];
    expect(headerEvents).toContainEqual(expect.objectContaining({ code: "oversized_header" }));

    const unterminatedHeaderParser = new OracleSectionStreamParser({ plan, maxHeaderChars: 30 });
    const unterminatedHeaderEvents = unterminatedHeaderParser.push(
      '<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":["'.padEnd(200, "x"),
    );
    expect(unterminatedHeaderEvents).toContainEqual(expect.objectContaining({ code: "oversized_header" }));

    const sectionParser = new OracleSectionStreamParser({ plan, maxSectionChars: 4 });
    const sectionEvents = [
      ...sectionParser.push('<<<ORACLE_SECTION_V2 {"key":"sun","evidenceKeys":[]}>>>\ntoo long\n<<<END_ORACLE_SECTION_V2>>>\n'),
      ...sectionParser.finish(),
    ];
    expect(sectionEvents).toContainEqual(expect.objectContaining({ code: "section_too_large", sectionKey: "sun" }));
    expect(sectionEvents.some((event) => event.type === "section")).toBe(false);
  });
});
