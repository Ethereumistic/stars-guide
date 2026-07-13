"use client";

import * as React from "react";

export interface OracleQuotaSnapshot {
  allowed: boolean;
  reason?: string;
  burstRemaining: number;
  burstTotal: number;
  burstResetsAt?: number;
  weeklyRemaining: number;
  weeklyTotal: number;
  weeklyResetsAt?: number;
  burstWindowMs?: number;
  weeklyWindowMs?: number;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function remainingPercent(remaining: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return clamp((Math.max(0, remaining) / total) * 100);
}

function formatWindowLabel(windowMs: number | undefined, fallback: string) {
  if (!windowMs) return fallback;
  const hours = windowMs / 3_600_000;
  if (Number.isInteger(hours) && hours < 24) return `${hours} hour usage limit`;
  const days = windowMs / 86_400_000;
  if (Number.isInteger(days)) return days === 7 ? "Weekly usage limit" : `${days} day usage limit`;
  return fallback;
}

function formatReset(resetAt: number | undefined, weekly: boolean) {
  if (!resetAt) return "Starts after your next reading";
  const date = new Date(resetAt);
  if (weekly) {
    return `Resets ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return `Resets ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function LimitRow({
  label,
  remaining,
  total,
  resetsAt,
  weekly = false,
}: {
  label: string;
  remaining: number;
  total: number;
  resetsAt?: number;
  weekly?: boolean;
}) {
  const percentLeft = remainingPercent(remaining, total);
  const roundedPercent = Math.round(percentLeft);

  return (
    <div className="grid min-h-24 grid-cols-1 items-center gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(190px,1.15fr)] sm:px-6">
      <div className="min-w-0">
        <h3 className="font-sans text-sm font-semibold text-white/90 sm:text-base">{label}</h3>
        <p className="mt-1 text-sm text-white/50">{formatReset(resetsAt, weekly)}</p>
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={`${label} remaining`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedPercent}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-primary via-primary to-galactic transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${percentLeft}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-right text-sm tabular-nums text-white/55 sm:text-base">
          {roundedPercent}% left
        </span>
      </div>
    </div>
  );
}

export function OracleQuotaMeter({ quota, className = "" }: { quota: OracleQuotaSnapshot; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015] ${className}`}
      aria-label="Oracle usage limits"
    >
      <LimitRow
        label={formatWindowLabel(quota.burstWindowMs, "Short-term usage limit")}
        remaining={quota.burstRemaining}
        total={quota.burstTotal}
        resetsAt={quota.burstResetsAt}
      />
      <div className="h-px bg-white/[0.08]" />
      <LimitRow
        label={formatWindowLabel(quota.weeklyWindowMs, "Weekly usage limit")}
        remaining={quota.weeklyRemaining}
        total={quota.weeklyTotal}
        resetsAt={quota.weeklyResetsAt}
        weekly
      />
    </section>
  );
}
