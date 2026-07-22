import { parseJournalPromptFromResponse, parseTitleFromResponse } from "../../../../lib/oracle/promptBuilder";
import { scanResponse } from "../responseSafety";
import {
  validateCanonicalNatalClaims,
  validateOracleResponse,
} from "../responseValidator";
import type {
  OracleEvidenceBundle,
  OracleRequestPlan,
  OracleResponseViolation,
} from "../capabilities";
import { OracleSectionStreamParser } from "./sectionParser";
import { normalizeNatalEntity } from "./sectionPlan";
import { SemanticBatchAccumulator } from "./semanticBatcher";
import { SingleFlightSnapshotPublisher } from "./singleFlightPublisher";
import type {
  GatewayStreamEvent,
  OraclePublicationMode,
  OracleSectionPlan,
  OracleSectionSpec,
  ParsedOracleSection,
} from "./types";

const HIDDEN_DIRECTIVE_LINE = /^\s*(?:TITLE|JOURNAL_PROMPT):.*(?:\r?\n|$)/gim;

export type PublisherSectionState =
  | "validating"
  | "published"
  | "repairing"
  | "failed";

export type PublisherSnapshot = {
  content: string;
  final: boolean;
  approvedAt: number;
};

export type PublisherDependencies = {
  persistSnapshot: (snapshot: PublisherSnapshot & { sequence: number }) => Promise<void>;
  persistSection?: (args: {
    section: ParsedOracleSection;
    spec: OracleSectionSpec;
    status: PublisherSectionState;
    violationCodes?: string[];
    approvedAt?: number;
  }) => Promise<void>;
  repairSection?: (args: {
    section: ParsedOracleSection;
    spec: OracleSectionSpec;
    violations: OracleResponseViolation[];
  }) => Promise<ParsedOracleSection | null>;
  resumeMissingSections?: (args: {
    missingKeys: string[];
    plan: OracleSectionPlan;
  }) => Promise<ParsedOracleSection[]>;
};

export type OracleStreamPublisherOptions = {
  mode: OraclePublicationMode;
  requestPlan: OracleRequestPlan;
  evidence?: OracleEvidenceBundle;
  sectionPlan?: OracleSectionPlan;
  journalContext?: string | null;
  progressivePublication?: boolean;
  maxTurnRepairs?: number;
  initialPublishedSections?: ParsedOracleSection[];
  initialSequence?: number;
  initialPersistedChars?: number;
  dependencies: PublisherDependencies;
};

export type OraclePublisherFinalResult = {
  content: string;
  complete: boolean;
  partial: boolean;
  protocolFallback: boolean;
  publishedSectionKeys: string[];
  failedSectionKeys: string[];
  violations: OracleResponseViolation[];
  writeCount: number;
  maxQueuedChars: number;
  title: string | null;
  journalPrompt: string | null;
};

export class OraclePublicationError extends Error {
  constructor(
    readonly code: "output_safety_blocked" | "response_contract_failed" | "persistence_failed",
    readonly violations: OracleResponseViolation[] = [],
  ) {
    super(code.replaceAll("_", " "));
    this.name = "OraclePublicationError";
  }
}

function stripHiddenDirectives(content: string): string {
  return content.replace(HIDDEN_DIRECTIVE_LINE, "");
}

function finalVisibleContent(content: string): string {
  const titleResult = parseTitleFromResponse(content);
  const promptResult = parseJournalPromptFromResponse(titleResult.contentWithoutTitle);
  return stripHiddenDirectives(promptResult.contentWithoutPrompt).trim();
}

function containsRequiredEntity(content: string, entity: string): boolean {
  const normalized = normalizeNatalEntity(entity);
  const aliases: Record<string, RegExp> = {
    ascendant: /\b(?:ascendant|rising(?:\s+sign)?)\b/i,
    north_node: /\bnorth\s+node\b/i,
    south_node: /\bsouth\s+node\b/i,
    part_of_fortune: /\b(?:part\s+of\s+fortune|fortune\s+point)\b/i,
  };
  return (aliases[normalized] ?? new RegExp(`\\b${normalized.replaceAll("_", "\\s+")}\\b`, "i"))
    .test(content);
}

function errorViolations(violations: OracleResponseViolation[]): OracleResponseViolation[] {
  return violations.filter((violation) => violation.severity === "error");
}

export class OracleStreamPublisher {
  private readonly options: OracleStreamPublisherOptions;
  private readonly batcher = new SemanticBatchAccumulator();
  private readonly writer: SingleFlightSnapshotPublisher<PublisherSnapshot>;
  private sectionParser: OracleSectionStreamParser | undefined;
  private approvedOrdinary = "";
  private readonly publishedSections = new Map<string, ParsedOracleSection>();
  private readonly failedSections = new Set<string>();
  private readonly mutableViolations: OracleResponseViolation[] = [];
  private processing: Promise<void> = Promise.resolve();
  private fatalError: OraclePublicationError | undefined;
  private repairCount = 0;
  private resumeCount = 0;
  private protocolFallback = false;
  private attemptCount = 0;
  private directiveProbe = "";
  private capturedTitle: string | null = null;
  private capturedJournalPrompt: string | null = null;
  private firstApprovedAt: number | undefined;

  constructor(options: OracleStreamPublisherOptions) {
    this.options = options;
    if (options.mode === "validated_sections" && !options.sectionPlan) {
      throw new Error("validated_sections requires a deterministic section plan");
    }
    if (options.sectionPlan) {
      this.sectionParser = new OracleSectionStreamParser({ plan: options.sectionPlan });
    }
    for (const section of options.initialPublishedSections ?? []) {
      this.publishedSections.set(section.key, section);
    }
    this.writer = new SingleFlightSnapshotPublisher({
      persist: options.dependencies.persistSnapshot,
      initialSequence: options.initialSequence,
      initialPersistedChars: options.initialPersistedChars,
    });
  }

  get hasApprovedContent(): boolean {
    return this.approvedOrdinary.length > 0 || this.publishedSections.size > 0;
  }

  get canFallbackBeforePublication(): boolean {
    return !this.hasApprovedContent && !this.fatalError;
  }

  handleEvent(event: GatewayStreamEvent): void {
    if (this.fatalError) return;
    if (event.type === "attempt_started") {
      this.attemptCount += 1;
      if (this.attemptCount > 1 && !this.hasApprovedContent) this.resetUnpublishedAttempt();
      return;
    }
    if (event.type !== "text_delta") return;
    this.captureHiddenDirectives(event.text);
    if (this.options.mode === "validated_sections") {
      const events = this.sectionParser?.push(event.text) ?? [];
      for (const parserEvent of events) {
        if (parserEvent.type === "violation") {
          this.mutableViolations.push({
            code: `section_protocol_${parserEvent.code}`,
            message: `Section protocol violation: ${parserEvent.code}.`,
            severity: "error",
          });
        } else {
          this.queueSection(parserEvent.section);
        }
      }
      return;
    }
    for (const batch of this.batcher.push(event.text)) this.approveOrdinaryBatch(batch);
  }

  async finalize(partial = false, allowRecovery = true): Promise<OraclePublisherFinalResult> {
    if (this.options.mode === "validated_sections") {
      for (const event of this.sectionParser?.finish() ?? []) {
        if (event.type === "section") this.queueSection(event.section);
        else {
          this.mutableViolations.push({
            code: `section_protocol_${event.code}`,
            message: `Section protocol violation: ${event.code}.`,
            severity: "error",
          });
        }
      }
    } else {
      for (const batch of this.batcher.finish()) this.approveOrdinaryBatch(batch);
    }

    await this.processing;
    if (this.fatalError) {
      await this.writer.flushFinal();
      throw this.fatalError;
    }

    if (this.options.mode === "validated_sections") {
      await this.finishValidatedSections(allowRecovery);
    }
    if (this.fatalError) {
      await this.writer.flushFinal();
      throw this.fatalError;
    }

    const content = finalVisibleContent(this.assembledContent());
    const safety = scanResponse(content, this.options.journalContext);
    if (!safety.safe) {
      throw new OraclePublicationError("output_safety_blocked");
    }
    const finalViolations = errorViolations(
      validateOracleResponse(content, this.options.requestPlan, this.options.evidence),
    );
    this.mutableViolations.push(...finalViolations);

    const requiredKeys = this.options.sectionPlan?.sections.map((section) => section.key) ?? [];
    const missingKeys = requiredKeys.filter((key) => !this.publishedSections.has(key));
    const complete = !partial && missingKeys.length === 0 && finalViolations.length === 0;
    if (!complete && !partial && this.options.mode !== "validated_sections") {
      throw new OraclePublicationError("response_contract_failed", finalViolations);
    }

    try {
      await this.writer.flushFinal({
        content,
        final: true,
        approvedAt: this.firstApprovedAt ?? Date.now(),
      });
    } catch {
      throw new OraclePublicationError("persistence_failed");
    }
    return {
      content,
      complete,
      partial: partial || !complete,
      protocolFallback: this.protocolFallback,
      publishedSectionKeys: this.orderedPublishedSections().map((section) => section.key),
      failedSectionKeys: [...new Set([...this.failedSections, ...missingKeys])],
      violations: this.mutableViolations,
      writeCount: this.writer.writeCount,
      maxQueuedChars: this.writer.maxQueuedChars,
      title: this.capturedTitle,
      journalPrompt: this.capturedJournalPrompt,
    };
  }

  private captureHiddenDirectives(delta: string): void {
    this.directiveProbe = `${this.directiveProbe}${delta}`.slice(-2_048);
    const title = this.directiveProbe.match(/^\s*TITLE:\s*(.+?)\s*$/im)?.[1]?.trim();
    const journalPrompt = this.directiveProbe.match(/^\s*JOURNAL_PROMPT:\s*(.+?)\s*$/im)?.[1]?.trim();
    if (title) this.capturedTitle = title.replace(/^["']|["']$/g, "").slice(0, 60);
    if (journalPrompt) {
      this.capturedJournalPrompt = journalPrompt.replace(/^["']|["']$/g, "").slice(0, 200);
    }
  }

  private resetUnpublishedAttempt(): void {
    this.batcher.reset();
    if (this.options.sectionPlan) {
      this.sectionParser = new OracleSectionStreamParser({ plan: this.options.sectionPlan });
    }
  }

  private approveOrdinaryBatch(rawBatch: string): void {
    const batch = stripHiddenDirectives(rawBatch);
    if (!batch) return;
    const candidate = this.approvedOrdinary + batch;
    const safety = scanResponse(candidate, this.options.journalContext);
    if (!safety.safe) {
      this.fatalError = new OraclePublicationError("output_safety_blocked");
      return;
    }
    const incrementalPlan: OracleRequestPlan = {
      ...this.options.requestPlan,
      responseContract: {
        ...this.options.requestPlan.responseContract,
        mustCompareAllOptions: false,
        mustRecommend: false,
        practicalSafety: false,
        requiresFullNatalCoverage: false,
        requiredNatalEntities: [],
      },
    };
    const contradictions = errorViolations(
      validateOracleResponse(candidate, incrementalPlan, this.options.evidence),
    );
    if (contradictions.length > 0) {
      this.mutableViolations.push(...contradictions);
      this.fatalError = new OraclePublicationError("response_contract_failed", contradictions);
      return;
    }
    this.approvedOrdinary = candidate;
    const approvedAt = this.recordApproval();
    if (this.options.progressivePublication !== false && this.options.mode !== "buffered") {
      this.writer.enqueue({ content: candidate, final: false, approvedAt });
    }
  }

  private queueSection(section: ParsedOracleSection): void {
    this.processing = this.processing.then(() => this.processSection(section));
  }

  private async processSection(section: ParsedOracleSection, isRepair = false): Promise<void> {
    const spec = this.options.sectionPlan?.sections.find((candidate) => candidate.key === section.key);
    if (!spec || this.publishedSections.has(section.key)) return;
    await this.options.dependencies.persistSection?.({ section, spec, status: "validating" });
    const violations = this.validateSection(section, spec);
    if (violations.length > 0) {
      this.mutableViolations.push(...violations);
      const canRepair = !isRepair
        && Boolean(this.options.dependencies.repairSection)
        && this.repairCount < (this.options.maxTurnRepairs ?? 3);
      if (canRepair) {
        this.repairCount += 1;
        await this.options.dependencies.persistSection?.({
          section,
          spec,
          status: "repairing",
          violationCodes: violations.map((violation) => violation.code),
        });
        const repaired = await this.options.dependencies.repairSection?.({
          section,
          spec,
          violations,
        });
        if (repaired) {
          await this.processSection(repaired, true);
          return;
        }
      }
      this.failedSections.add(section.key);
      await this.options.dependencies.persistSection?.({
        section: { ...section, content: "" },
        spec,
        status: "failed",
        violationCodes: violations.map((violation) => violation.code),
      });
      return;
    }

    const visibleSection = { ...section, content: finalVisibleContent(section.content) };
    const approvedAt = this.recordApproval();
    await this.options.dependencies.persistSection?.({
      section: visibleSection,
      spec,
      status: "published",
      approvedAt,
    });
    this.publishedSections.set(section.key, visibleSection);
    if (this.options.progressivePublication !== false) {
      this.writer.enqueue({ content: this.assembledContent(), final: false, approvedAt });
    }
  }

  private validateSection(
    section: ParsedOracleSection,
    spec: OracleSectionSpec,
  ): OracleResponseViolation[] {
    const violations: OracleResponseViolation[] = [];
    const allowed = new Set(spec.allowedEvidenceKeys);
    for (const evidenceKey of section.evidenceKeys) {
      if (!allowed.has(evidenceKey)) {
        violations.push({
          code: "section_evidence_not_allowed",
          message: `Section ${section.key} declared evidence outside its server plan.`,
          severity: "error",
        });
      }
    }
    for (const entity of spec.requiredEntities) {
      if (!containsRequiredEntity(section.content, entity)) {
        violations.push({
          code: "section_required_entity_missing",
          message: `Section ${section.key} does not name ${entity}.`,
          severity: "error",
        });
      }
    }
    violations.push(...validateCanonicalNatalClaims(section.content, this.options.evidence));
    const sectionRequestPlan: OracleRequestPlan = {
      ...this.options.requestPlan,
      responseContract: {
        ...this.options.requestPlan.responseContract,
        mustCompareAllOptions: false,
        mustRecommend: false,
        practicalSafety: false,
        requiresFullNatalCoverage: false,
        requiredNatalEntities: spec.requiredEntities,
      },
    };
    violations.push(...errorViolations(
      validateOracleResponse(section.content, sectionRequestPlan, this.options.evidence),
    ));
    const cumulative = [
      ...this.orderedPublishedSections().map((published) => published.content),
      section.content,
    ].join("\n\n");
    if (!scanResponse(cumulative, this.options.journalContext).safe) {
      violations.push({
        code: "section_output_safety_blocked",
        message: "Section failed the hardcoded output safety scanner.",
        severity: "error",
      });
    }
    return errorViolations(violations);
  }

  private async finishValidatedSections(allowRecovery: boolean): Promise<void> {
    const sectionPlan = this.options.sectionPlan;
    if (!sectionPlan) return;

    if (this.publishedSections.size === 0) {
      const fallback = finalVisibleContent(this.sectionParser?.fallbackContent ?? "");
      if (fallback) {
        this.protocolFallback = true;
        const safety = scanResponse(fallback, this.options.journalContext);
        const violations = errorViolations(
          validateOracleResponse(fallback, this.options.requestPlan, this.options.evidence),
        );
        violations.push(...errorViolations(
          validateCanonicalNatalClaims(fallback, this.options.evidence),
        ));
        if (!safety.safe) throw new OraclePublicationError("output_safety_blocked");
        if (violations.length > 0) {
          this.mutableViolations.push(...violations);
          throw new OraclePublicationError("response_contract_failed", violations);
        }
        this.approvedOrdinary = fallback;
        return;
      }
    }

    let missing = sectionPlan.sections
      .map((section) => section.key)
      .filter((key) => !this.publishedSections.has(key));
    if (
      allowRecovery
      && missing.length > 0
      && this.options.dependencies.resumeMissingSections
      && this.resumeCount < 1
    ) {
      this.resumeCount += 1;
      const resumed = await this.options.dependencies.resumeMissingSections({
        missingKeys: missing,
        plan: sectionPlan,
      });
      for (const section of resumed) await this.processSection(section);
      missing = sectionPlan.sections
        .map((section) => section.key)
        .filter((key) => !this.publishedSections.has(key));
    }
    for (const key of missing) this.failedSections.add(key);
  }

  private orderedPublishedSections(): ParsedOracleSection[] {
    const order = new Map(
      this.options.sectionPlan?.sections.map((section) => [section.key, section.ordinal]) ?? [],
    );
    return [...this.publishedSections.values()].sort(
      (left, right) => (order.get(left.key) ?? 0) - (order.get(right.key) ?? 0),
    );
  }

  private assembledContent(): string {
    if (this.options.mode !== "validated_sections" || this.publishedSections.size === 0) {
      return this.approvedOrdinary;
    }
    return this.orderedPublishedSections().map((section) => section.content).join("\n\n");
  }

  private recordApproval(): number {
    const now = Date.now();
    this.firstApprovedAt ??= now;
    return this.firstApprovedAt;
  }
}
