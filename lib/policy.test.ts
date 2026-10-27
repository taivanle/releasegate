import { describe, expect, it } from "vitest";
import {
  canApprove,
  canReject,
  canSubmitEvaluation,
  evaluatePolicy,
  getReadiness,
  type Metrics,
} from "./policy";
import { approveSchema, evaluationSchema, rejectSchema } from "./schemas";

const passing: Metrics = {
  qualityPassRate: 97,
  criticalSafetyFailures: 0,
  p95LatencyMs: 1200,
  avgCostUsd: 0.02,
};

const failedIds = (m: Metrics) =>
  evaluatePolicy(m)
    .checks.filter((c) => !c.passed)
    .map((c) => c.id);

describe("evaluatePolicy", () => {
  it("passes when every mandatory check passes", () => {
    const result = evaluatePolicy(passing);
    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every((c) => c.blocker === null)).toBe(true);
  });

  it("treats values exactly at the threshold as passing", () => {
    const atLimit = { qualityPassRate: 95, criticalSafetyFailures: 0, p95LatencyMs: 3000, avgCostUsd: 0.05 };
    expect(evaluatePolicy(atLimit).passed).toBe(true);
  });

  it("blocks quality below 95%", () => {
    expect(failedIds({ ...passing, qualityPassRate: 94.99 })).toEqual(["quality"]);
  });

  it("blocks any critical safety failure", () => {
    expect(failedIds({ ...passing, criticalSafetyFailures: 1 })).toEqual(["safety"]);
  });

  it("blocks p95 latency above 3000 ms", () => {
    expect(failedIds({ ...passing, p95LatencyMs: 3001 })).toEqual(["latency"]);
  });

  it("blocks average cost above $0.05", () => {
    expect(failedIds({ ...passing, avgCostUsd: 0.0501 })).toEqual(["cost"]);
  });

  it("reports every failing check with an actionable blocker", () => {
    const result = evaluatePolicy({
      qualityPassRate: 91.5,
      criticalSafetyFailures: 2,
      p95LatencyMs: 3450,
      avgCostUsd: 0.08,
    });
    expect(result.passed).toBe(false);
    const blockers = Object.fromEntries(result.checks.map((c) => [c.id, c.blocker]));
    expect(blockers.quality).toContain("3.5 pts below the 95% minimum");
    expect(blockers.safety).toContain("2 critical safety failures");
    expect(blockers.latency).toContain("450 ms over the 3000 ms limit");
    expect(blockers.cost).toContain("$0.03 over the $0.05 limit");
  });
});

describe("getReadiness", () => {
  it("derives readiness from status and the latest evaluation", () => {
    expect(getReadiness("pending", null)).toBe("not_evaluated");
    expect(getReadiness("pending", false)).toBe("blocked");
    expect(getReadiness("pending", true)).toBe("ready");
    expect(getReadiness("approved", true)).toBe("approved");
    expect(getReadiness("rejected", false)).toBe("rejected");
  });
});

describe("canApprove", () => {
  const latest = { id: "eval-2", metrics: passing };

  it("allows approving the latest passing evaluation of a pending release", () => {
    expect(canApprove({ status: "pending", latestEvaluation: latest, reviewedEvaluationId: "eval-2" })).toEqual({ ok: true });
  });

  it("refuses when no evaluation exists", () => {
    const r = canApprove({ status: "pending", latestEvaluation: null, reviewedEvaluationId: "eval-1" });
    expect(r.ok).toBe(false);
  });

  it("refuses when the latest evaluation fails a mandatory check", () => {
    const failing = { id: "eval-2", metrics: { ...passing, criticalSafetyFailures: 1 } };
    const r = canApprove({ status: "pending", latestEvaluation: failing, reviewedEvaluationId: "eval-2" });
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Mandatory checks") });
  });

  it("refuses a stale view where a newer evaluation exists", () => {
    const r = canApprove({ status: "pending", latestEvaluation: latest, reviewedEvaluationId: "eval-1" });
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Newer evaluation") });
  });

  it("refuses a release that is already decided", () => {
    for (const status of ["approved", "rejected"] as const) {
      expect(canApprove({ status, latestEvaluation: latest, reviewedEvaluationId: "eval-2" }).ok).toBe(false);
    }
  });
});

describe("canSubmitEvaluation and canReject", () => {
  it("only allow changes while the release is pending", () => {
    expect(canSubmitEvaluation("pending").ok).toBe(true);
    expect(canSubmitEvaluation("approved").ok).toBe(false);
    expect(canReject("pending").ok).toBe(true);
    expect(canReject("rejected").ok).toBe(false);
  });
});

describe("evaluationSchema", () => {
  const form = {
    qualityPassRate: "96.5",
    criticalSafetyFailures: "0",
    p95LatencyMs: "1800",
    avgCostUsd: "0.03",
    submittedBy: "Ada",
  };

  it("parses numeric form strings", () => {
    expect(evaluationSchema.parse(form)).toEqual({
      qualityPassRate: 96.5,
      criticalSafetyFailures: 0,
      p95LatencyMs: 1800,
      avgCostUsd: 0.03,
      submittedBy: "Ada",
    });
  });

  it("rejects empty fields instead of coercing them to 0", () => {
    expect(evaluationSchema.safeParse({ ...form, criticalSafetyFailures: "" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...form, qualityPassRate: "  " }).success).toBe(false);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(evaluationSchema.safeParse({ ...form, qualityPassRate: "100.1" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...form, criticalSafetyFailures: "-1" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...form, criticalSafetyFailures: "0.5" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...form, p95LatencyMs: "abc" }).success).toBe(false);
    expect(evaluationSchema.safeParse({ ...form, avgCostUsd: "-0.01" }).success).toBe(false);
  });
});

describe("decision schemas", () => {
  it("requires a valid evaluation id and approver name to approve", () => {
    expect(approveSchema.safeParse({ evaluationId: "not-a-uuid", actor: "Ada" }).success).toBe(false);
    expect(approveSchema.safeParse({ evaluationId: crypto.randomUUID(), actor: " " }).success).toBe(false);
    expect(approveSchema.safeParse({ evaluationId: crypto.randomUUID(), actor: "Ada" }).success).toBe(true);
  });

  it("requires a reason to reject", () => {
    expect(rejectSchema.safeParse({ actor: "Ada", note: "" }).success).toBe(false);
    expect(rejectSchema.safeParse({ actor: "Ada", note: "Fails red-team review" }).success).toBe(true);
  });
});
