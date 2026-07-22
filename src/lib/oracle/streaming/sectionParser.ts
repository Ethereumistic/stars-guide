import type {
  OracleSectionPlan,
  ParsedOracleSection,
} from "./types";

const HEADER_PREFIX = "<<<ORACLE_SECTION_V2 ";
const END_MARKER = "<<<END_ORACLE_SECTION_V2>>>";
const CONTROL_MARKER = /<<<(?:END_)?ORACLE_SECTION_V2(?:\s+[^>]*?)?>>>/g;

export type OracleSectionParserViolationCode =
  | "invalid_header"
  | "oversized_header"
  | "section_too_large"
  | "unknown_section"
  | "duplicate_section"
  | "out_of_order_section"
  | "nested_section"
  | "stray_end_marker"
  | "missing_end_marker";

export type OracleSectionParserEvent =
  | { type: "section"; section: ParsedOracleSection }
  | {
      type: "violation";
      code: OracleSectionParserViolationCode;
      sectionKey?: string;
    };

type ParserOptions = {
  plan: OracleSectionPlan;
  maxHeaderChars?: number;
  maxSectionChars?: number;
};

type ReceivingSection = {
  key: string;
  evidenceKeys: string[];
  content: string[];
  charCount: number;
};

function sanitizeControlMarkers(content: string): string {
  return content.replace(CONTROL_MARKER, "").replace(/\n{3,}/g, "\n\n").trim();
}

export class OracleSectionStreamParser {
  private readonly plan: OracleSectionPlan;
  private readonly maxHeaderChars: number;
  private readonly maxSectionChars: number;
  private readonly specByKey: Map<string, OracleSectionPlan["sections"][number]>;
  private readonly seen = new Set<string>();
  private lineBuffer = "";
  private fallbackLines: string[] = [];
  private receiving: ReceivingSection | null = null;
  private expectedIndex = 0;
  private fence: "```" | "~~~" | null = null;
  private suppressUntilEnd = false;
  private droppingOversizedLine = false;
  private finished = false;

  constructor(options: ParserOptions) {
    this.plan = options.plan;
    this.maxHeaderChars = options.maxHeaderChars ?? 2_048;
    this.maxSectionChars = options.maxSectionChars ?? 32_000;
    this.specByKey = new Map(options.plan.sections.map((section) => [section.key, section]));
  }

  push(chunk: string): OracleSectionParserEvent[] {
    if (this.finished) return [];
    this.lineBuffer += chunk;
    const events: OracleSectionParserEvent[] = [];
    if (this.droppingOversizedLine) {
      const newline = this.lineBuffer.indexOf("\n");
      if (newline < 0) {
        this.lineBuffer = "";
        return events;
      }
      this.lineBuffer = this.lineBuffer.slice(newline + 1);
      this.droppingOversizedLine = false;
    }
    let newline = this.lineBuffer.indexOf("\n");
    while (newline >= 0) {
      let line = this.lineBuffer.slice(0, newline);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.lineBuffer = this.lineBuffer.slice(newline + 1);
      events.push(...this.consumeLine(line));
      newline = this.lineBuffer.indexOf("\n");
    }
    if (
      this.lineBuffer.startsWith(HEADER_PREFIX)
      && this.lineBuffer.length > this.maxHeaderChars
    ) {
      events.push({ type: "violation", code: "oversized_header" });
      this.lineBuffer = "";
      this.droppingOversizedLine = true;
    } else if (
      this.receiving
      && this.receiving.charCount + this.lineBuffer.length > this.maxSectionChars
    ) {
      const sectionKey = this.receiving.key;
      events.push({ type: "violation", code: "section_too_large", sectionKey });
      this.receiving = null;
      this.lineBuffer = "";
      this.droppingOversizedLine = true;
      this.suppressUntilEnd = true;
    }
    return events;
  }

  finish(): OracleSectionParserEvent[] {
    if (this.finished) return [];
    this.finished = true;
    const events = this.lineBuffer.length > 0
      ? this.consumeLine(this.lineBuffer.replace(/\r$/, ""))
      : [];
    this.lineBuffer = "";
    if (this.receiving || this.suppressUntilEnd) {
      events.push({
        type: "violation",
        code: "missing_end_marker",
        sectionKey: this.receiving?.key,
      });
      this.receiving = null;
      this.suppressUntilEnd = false;
    }
    return events;
  }

  get fallbackContent(): string {
    return sanitizeControlMarkers(this.fallbackLines.join("\n"));
  }

  private consumeLine(line: string): OracleSectionParserEvent[] {
    const trimmed = line.trim();
    const fenceMarker = trimmed.startsWith("```")
      ? "```"
      : trimmed.startsWith("~~~")
        ? "~~~"
        : null;
    if (fenceMarker) {
      const events = this.appendContent(line);
      this.fence = this.fence === fenceMarker ? null : this.fence ?? fenceMarker;
      return events;
    }
    if (this.fence) {
      return this.appendContent(line);
    }

    if (this.suppressUntilEnd) {
      if (trimmed === END_MARKER) this.suppressUntilEnd = false;
      return [];
    }
    if (trimmed === END_MARKER) {
      if (!this.receiving) {
        return [{ type: "violation", code: "stray_end_marker" }];
      }
      const section = this.receiving;
      this.receiving = null;
      this.seen.add(section.key);
      this.expectedIndex += 1;
      return [{
        type: "section",
        section: {
          key: section.key,
          evidenceKeys: section.evidenceKeys,
          content: sanitizeControlMarkers(section.content.join("\n")),
        },
      }];
    }
    if (trimmed.startsWith(HEADER_PREFIX)) {
      const events: OracleSectionParserEvent[] = [];
      if (this.receiving) {
        events.push({
          type: "violation",
          code: "nested_section",
          sectionKey: this.receiving.key,
        });
        this.receiving = null;
      }
      events.push(...this.startSection(trimmed));
      return events;
    }

    return this.appendContent(line);
  }

  private appendContent(line: string): OracleSectionParserEvent[] {
    if (!this.receiving) {
      this.fallbackLines.push(line);
      return [];
    }
    this.receiving.charCount += line.length + 1;
    if (this.receiving.charCount > this.maxSectionChars) {
      const sectionKey = this.receiving.key;
      this.receiving = null;
      this.suppressUntilEnd = true;
      return [{ type: "violation", code: "section_too_large", sectionKey }];
    }
    this.receiving.content.push(line);
    return [];
  }

  private startSection(header: string): OracleSectionParserEvent[] {
    if (header.length > this.maxHeaderChars) {
      return [{ type: "violation", code: "oversized_header" }];
    }
    if (!header.endsWith(">>>")) {
      return [{ type: "violation", code: "invalid_header" }];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(header.slice(HEADER_PREFIX.length, -3));
    } catch {
      return [{ type: "violation", code: "invalid_header" }];
    }
    if (
      typeof parsed !== "object"
      || parsed === null
      || typeof (parsed as { key?: unknown }).key !== "string"
      || !Array.isArray((parsed as { evidenceKeys?: unknown }).evidenceKeys)
      || !(parsed as { evidenceKeys: unknown[] }).evidenceKeys.every(
        (key) => typeof key === "string",
      )
    ) {
      return [{ type: "violation", code: "invalid_header" }];
    }

    const key = (parsed as { key: string }).key;
    const evidenceKeys = (parsed as { evidenceKeys: string[] }).evidenceKeys;
    const spec = this.specByKey.get(key);
    if (!spec) {
      return [{ type: "violation", code: "unknown_section", sectionKey: key }];
    }
    if (this.seen.has(key)) {
      return [{ type: "violation", code: "duplicate_section", sectionKey: key }];
    }
    if (this.plan.sections[this.expectedIndex]?.key !== key) {
      return [{ type: "violation", code: "out_of_order_section", sectionKey: key }];
    }

    this.receiving = { key, evidenceKeys, content: [], charCount: 0 };
    return [];
  }
}
