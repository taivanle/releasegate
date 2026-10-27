import "server-only";
import type postgres from "postgres";
import { db } from "./db";
import {
  canApprove,
  canReject,
  canSubmitEvaluation,
  evaluatePolicy,
  getReadiness,
  POLICY_VERSION,
  type CheckResult,
  type Metrics,
  type Readiness,
  type ReleaseStatus,
  type RiskTier,
} from "./policy";
import type { ApproveInput, CreateReleaseInput, EvaluationInput, RejectInput } from "./schemas";

export type Release = {
  id: string;
  modelName: string;
  version: string;
  owner: string;
  useCase: string;
  riskTier: RiskTier;
  status: ReleaseStatus;
  decidedBy: string | null;
  decisionNote: string | null;
  decidedAt: Date | null;
  approvedEvaluationId: string | null;
  createdAt: Date;
};

export type Evaluation = Metrics & {
  id: string;
  submittedBy: string;
  policyVersion: string;
  passed: boolean;
  checks: CheckResult[];
  createdAt: Date;
};

export type AuditEvent = {
  id: string;
  action: "release_created" | "evaluation_submitted" | "release_approved" | "release_rejected";
  actor: string;
  details: Record<string, unknown>;
  createdAt: Date;
};

export type ReleaseSummary = Release & { readiness: Readiness; lastEvaluatedAt: Date | null };

export type MutationResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// Thrown inside a transaction to roll it back with a user-facing message.
class RuleViolation extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const evaluationColumns = (sql: postgres.Sql | postgres.TransactionSql) => sql`
  id, quality_pass_rate::float8, critical_safety_failures, p95_latency_ms, avg_cost_usd::float8,
  submitted_by, policy_version, passed, checks, created_at
`;

export async function listReleases(): Promise<ReleaseSummary[]> {
  const sql = db();
  const rows = await sql<(Release & { latestPassed: boolean | null; lastEvaluatedAt: Date | null })[]>`
    select r.*, e.passed as latest_passed, e.created_at as last_evaluated_at
    from releases r
    left join lateral (
      select passed, created_at from evaluations
      where release_id = r.id
      order by created_at desc, id desc
      limit 1
    ) e on true
    order by r.created_at desc
    limit 200
  `;
  return rows.map(({ latestPassed, ...r }) => ({
    ...r,
    readiness: getReadiness(r.status, latestPassed),
  }));
}

export async function getRelease(id: string) {
  if (!UUID.test(id)) return null;
  const sql = db();
  const [release] = await sql<Release[]>`select * from releases where id = ${id}`;
  if (!release) return null;
  const [evaluations, events] = await Promise.all([
    sql<Evaluation[]>`
      select ${evaluationColumns(sql)} from evaluations
      where release_id = ${id}
      order by created_at desc, id desc
    `,
    sql<AuditEvent[]>`
      select id::text, action, actor, details, created_at from audit_events
      where release_id = ${id}
      order by id desc
    `,
  ]);
  const latest = evaluations[0] ?? null;
  return {
    release,
    evaluations,
    events,
    latest,
    readiness: getReadiness(release.status, latest ? latest.passed : null),
  };
}

export async function createRelease(input: CreateReleaseInput): Promise<MutationResult<string>> {
  try {
    const id = await db().begin(async (sql) => {
      const [row] = await sql<{ id: string }[]>`
        insert into releases (model_name, version, owner, use_case, risk_tier)
        values (${input.modelName}, ${input.version}, ${input.owner}, ${input.useCase}, ${input.riskTier})
        returning id
      `;
      await sql`
        insert into audit_events (release_id, action, actor, details)
        values (${row.id}, 'release_created', ${input.owner}, ${sql.json({ riskTier: input.riskTier })})
      `;
      return row.id;
    });
    return { ok: true, data: id };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, error: `${input.modelName} ${input.version} already exists.` };
    }
    throw e;
  }
}

// Locks the release row so evaluation submits and decisions on one release are serialized.
async function lockRelease(sql: postgres.TransactionSql, id: string) {
  const [release] = await sql<Pick<Release, "id" | "status">[]>`
    select id, status from releases where id = ${id} for update
  `;
  if (!release) throw new RuleViolation("Release not found.");
  return release;
}

async function runRule<T>(fn: () => Promise<T>): Promise<MutationResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof RuleViolation) return { ok: false, error: e.message };
    throw e;
  }
}

export function submitEvaluation(releaseId: string, input: EvaluationInput) {
  return runRule(() =>
    db().begin(async (sql) => {
      const release = await lockRelease(sql, releaseId);
      const allowed = canSubmitEvaluation(release.status);
      if (!allowed.ok) throw new RuleViolation(allowed.reason);

      const { submittedBy, ...metrics } = input;
      const result = evaluatePolicy(metrics);
      const [row] = await sql<{ id: string }[]>`
        insert into evaluations (
          release_id, quality_pass_rate, critical_safety_failures, p95_latency_ms, avg_cost_usd,
          submitted_by, policy_version, passed, checks
        ) values (
          ${releaseId}, ${metrics.qualityPassRate}, ${metrics.criticalSafetyFailures},
          ${metrics.p95LatencyMs}, ${metrics.avgCostUsd}, ${submittedBy}, ${POLICY_VERSION},
          ${result.passed}, ${sql.json(result.checks)}
        )
        returning id
      `;
      await sql`
        insert into audit_events (release_id, action, actor, details)
        values (${releaseId}, 'evaluation_submitted', ${submittedBy}, ${sql.json({
          evaluationId: row.id,
          passed: result.passed,
          failedChecks: result.checks.filter((c) => !c.passed).map((c) => c.label),
          metrics,
        })})
      `;
      return row.id;
    }),
  );
}

export function approveRelease(releaseId: string, input: ApproveInput) {
  return runRule(() =>
    db().begin(async (sql) => {
      const release = await lockRelease(sql, releaseId);
      const [latest] = await sql<Evaluation[]>`
        select ${evaluationColumns(sql)} from evaluations
        where release_id = ${releaseId}
        order by created_at desc, id desc
        limit 1
      `;
      // Re-evaluate from stored metrics; never trust readiness sent by the client.
      const decision = canApprove({
        status: release.status,
        latestEvaluation: latest ? { id: latest.id, metrics: latest } : null,
        reviewedEvaluationId: input.evaluationId,
      });
      if (!decision.ok) throw new RuleViolation(decision.reason);

      await sql`
        update releases
        set status = 'approved', decided_by = ${input.actor}, decision_note = ${input.note || null},
            decided_at = now(), approved_evaluation_id = ${latest.id}
        where id = ${releaseId}
      `;
      await sql`
        insert into audit_events (release_id, action, actor, details)
        values (${releaseId}, 'release_approved', ${input.actor}, ${sql.json({
          evaluationId: latest.id,
          policyVersion: POLICY_VERSION,
          note: input.note || null,
        })})
      `;
    }),
  );
}

export function rejectRelease(releaseId: string, input: RejectInput) {
  return runRule(() =>
    db().begin(async (sql) => {
      const release = await lockRelease(sql, releaseId);
      const decision = canReject(release.status);
      if (!decision.ok) throw new RuleViolation(decision.reason);

      await sql`
        update releases
        set status = 'rejected', decided_by = ${input.actor}, decision_note = ${input.note}, decided_at = now()
        where id = ${releaseId}
      `;
      await sql`
        insert into audit_events (release_id, action, actor, details)
        values (${releaseId}, 'release_rejected', ${input.actor}, ${sql.json({ note: input.note })})
      `;
    }),
  );
}
