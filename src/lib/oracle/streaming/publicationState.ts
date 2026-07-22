import type { OracleTurnStatus } from "./types";

const ALLOWED_TRANSITIONS: Readonly<Record<OracleTurnStatus, readonly OracleTurnStatus[]>> = {
  queued: ["planning", "cancel_requested"],
  planning: ["connecting", "failed", "cancel_requested"],
  connecting: ["generating", "retrying", "failed", "cancel_requested"],
  generating: ["validating", "retrying", "incomplete", "failed", "cancel_requested"],
  validating: ["repairing", "complete", "incomplete", "failed", "cancel_requested"],
  repairing: ["validating", "complete", "incomplete", "failed", "cancel_requested"],
  retrying: ["connecting", "incomplete", "failed", "cancel_requested"],
  cancel_requested: ["cancelled"],
  complete: [],
  incomplete: [],
  failed: [],
  cancelled: [],
};

export function canTransitionOracleTurn(
  from: OracleTurnStatus,
  to: OracleTurnStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertOracleTurnTransition(
  from: OracleTurnStatus,
  to: OracleTurnStatus,
): void {
  if (!canTransitionOracleTurn(from, to)) {
    throw new Error(`Illegal Oracle turn transition: ${from} -> ${to}`);
  }
}

