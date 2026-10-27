// Release policy v1: fixed, deterministic thresholds shared by every risk tier.
// Risk tier is recorded as metadata only; per-tier thresholds are a deliberate v2 item.

export const POLICY_VERSION = "v1";

export const RISK_TIERS = ["low", "medium", "high"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export type ReleaseStatus = "pending" | "approved" | "rejected";
export type Readiness = "not_evaluated" | "blocked" | "ready" | "approved" | "rejected";

export const THRESHOLDS = {
  minQualityPassRate: 95,
  maxCriticalSafetyFailures: 0,
  maxP95LatencyMs: 3000,
  maxAvgCostUsd: 0.05,
} as const;

export type Metrics = {
  qualityPassRate: number; // percent, 0-100
  criticalSafetyFailures: number;
  p95LatencyMs: number;
  avgCostUsd: number;
};

export type CheckId = "quality" | "safety" | "latency" | "cost";

export type CheckResult = {
  id: CheckId;
  label: string;
  passed: boolean;
  actual: string;
  threshold: string;
  blocker: string | null;
};

export type PolicyResult = { passed: boolean; checks: CheckResult[] };

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const usd = (n: number) => `$${n.toFixed(4).replace(/0{1,2}$/, "")}`;

export function evaluatePolicy(m: Metrics): PolicyResult {
  const t = THRESHOLDS;
  const all: CheckResult[] = [
    {
      id: "quality",
      label: "Quality pass rate",
      passed: m.qualityPassRate >= t.minQualityPassRate,
      actual: `${m.qualityPassRate}%`,
      threshold: `≥ ${t.minQualityPassRate}%`,
      blocker: `Quality pass rate is ${m.qualityPassRate}%, ${round(t.minQualityPassRate - m.qualityPassRate)} pts below the ${t.minQualityPassRate}% minimum. Fix the failing eval cases and re-run the suite.`,
    },
    {
      id: "safety",
      label: "Critical safety failures",
      passed: m.criticalSafetyFailures <= t.maxCriticalSafetyFailures,
      actual: String(m.criticalSafetyFailures),
      threshold: `= ${t.maxCriticalSafetyFailures}`,
      blocker: `${m.criticalSafetyFailures} critical safety ${m.criticalSafetyFailures === 1 ? "failure" : "failures"} found. Resolve every critical failure and re-run the safety suite.`,
    },
    {
      id: "latency",
      label: "p95 latency",
      passed: m.p95LatencyMs <= t.maxP95LatencyMs,
      actual: `${m.p95LatencyMs} ms`,
      threshold: `≤ ${t.maxP95LatencyMs} ms`,
      blocker: `p95 latency is ${m.p95LatencyMs} ms, ${m.p95LatencyMs - t.maxP95LatencyMs} ms over the ${t.maxP95LatencyMs} ms limit. Reduce latency before release.`,
    },
    {
      id: "cost",
      label: "Average cost per run",
      passed: m.avgCostUsd <= t.maxAvgCostUsd,
      actual: usd(m.avgCostUsd),
      threshold: `≤ ${usd(t.maxAvgCostUsd)}`,
      blocker: `Average cost is ${usd(m.avgCostUsd)} per run, ${usd(round(m.avgCostUsd - t.maxAvgCostUsd, 4))} over the ${usd(t.maxAvgCostUsd)} limit. Reduce cost per run before release.`,
    },
  ];
  const checks = all.map((c) => ({ ...c, blocker: c.passed ? null : c.blocker }));

  return { passed: checks.every((c) => c.passed), checks };
}

export function getReadiness(status: ReleaseStatus, latestPassed: boolean | null): Readiness {
  if (status !== "pending") return status;
  if (latestPassed === null) return "not_evaluated";
  return latestPassed ? "ready" : "blocked";
}

type Decision = { ok: true } | { ok: false; reason: string };

export function canSubmitEvaluation(status: ReleaseStatus): Decision {
  return status === "pending"
    ? { ok: true }
    : { ok: false, reason: `This release is already ${status}; evaluations are closed.` };
}

// Approval is re-checked server-side against the latest stored evaluation.
// `reviewedEvaluationId` is the evaluation the approver was looking at, so a stale view cannot approve.
export function canApprove(input: {
  status: ReleaseStatus;
  latestEvaluation: { id: string; metrics: Metrics } | null;
  reviewedEvaluationId: string;
}): Decision {
  if (input.status !== "pending") {
    return { ok: false, reason: `This release is already ${input.status}.` };
  }
  if (!input.latestEvaluation) {
    return { ok: false, reason: "No evaluation results have been submitted yet." };
  }
  if (input.latestEvaluation.id !== input.reviewedEvaluationId) {
    return {
      ok: false,
      reason: "Newer evaluation results were submitted. Review them before approving.",
    };
  }
  if (!evaluatePolicy(input.latestEvaluation.metrics).passed) {
    return { ok: false, reason: "Mandatory checks are failing. Resolve the blockers first." };
  }
  return { ok: true };
}

export function canReject(status: ReleaseStatus): Decision {
  return status === "pending"
    ? { ok: true }
    : { ok: false, reason: `This release is already ${status}.` };
}
