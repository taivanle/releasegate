// Data-layer tests against a real, disposable Postgres. Skipped unless TEST_DATABASE_URL
// points at a local database whose name contains "test", because the schema is recreated.
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { approveRelease, createRelease, rejectRelease, submitEvaluation } from "./releases";

const url = process.env.TEST_DATABASE_URL;
const target = url ? new URL(url) : null;
const isDisposable =
  !!target && ["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname.includes("test");

const passing = { qualityPassRate: 97, criticalSafetyFailures: 0, p95LatencyMs: 1200, avgCostUsd: 0.02, submittedBy: "QA" };
const failing = { ...passing, criticalSafetyFailures: 1 };

describe.skipIf(!isDisposable)("releases data layer (local Postgres)", () => {
  let admin: postgres.Sql;
  let n = 0;

  async function newRelease() {
    const result = await createRelease({
      modelName: `model-${++n}`,
      version: "1.0.0",
      owner: "Owner",
      useCase: "Test",
      riskTier: "medium",
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async function evaluate(releaseId: string, metrics: typeof passing) {
    const result = await submitEvaluation(releaseId, metrics);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  const actions = (releaseId: string) =>
    admin<{ action: string }[]>`select action from audit_events where release_id = ${releaseId} order by id`.then(
      (rows) => rows.map((r) => r.action),
    );

  beforeAll(async () => {
    admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe("drop schema if exists public cascade; create schema public;");
    await admin.unsafe(readFileSync("supabase/migrations/20261027170000_init.sql", "utf8"));
    process.env.DATABASE_URL = url;
  });

  afterAll(async () => {
    await db().end();
    await admin.end();
  });

  it("approves only the latest passing evaluation, writing the decision and audit event together", async () => {
    const id = await newRelease();
    const first = await evaluate(id, failing);

    expect(await approveRelease(id, { evaluationId: first, actor: "Lead" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("Mandatory checks"),
    });

    const second = await evaluate(id, passing);
    expect(await approveRelease(id, { evaluationId: first, actor: "Lead" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("Newer evaluation"),
    });

    expect(await approveRelease(id, { evaluationId: second, actor: "Lead", note: "LGTM" })).toEqual({ ok: true, data: undefined });

    const [release] = await admin`select status, decided_by, approved_evaluation_id from releases where id = ${id}`;
    expect(release).toMatchObject({ status: "approved", decided_by: "Lead", approved_evaluation_id: second });
    // Refused attempts leave no trace; the approval and its audit event landed together.
    expect(await actions(id)).toEqual(["release_created", "evaluation_submitted", "evaluation_submitted", "release_approved"]);
  });

  it("closes the release to further evaluations and decisions once decided", async () => {
    const id = await newRelease();
    const evaluation = await evaluate(id, passing);
    await approveRelease(id, { evaluationId: evaluation, actor: "Lead" });

    expect((await approveRelease(id, { evaluationId: evaluation, actor: "Lead" })).ok).toBe(false);
    expect((await rejectRelease(id, { actor: "Lead", note: "Too late" })).ok).toBe(false);
    expect(await submitEvaluation(id, passing)).toMatchObject({ ok: false, error: expect.stringContaining("closed") });
  });

  it("records exactly one decision when two approvals race", async () => {
    const id = await newRelease();
    const evaluation = await evaluate(id, passing);
    let race!: Promise<Awaited<ReturnType<typeof approveRelease>>[]>;
    // Hold the row lock so both approvals are in flight before either can proceed.
    await admin.begin(async (tx) => {
      await tx`select id from releases where id = ${id} for update`;
      race = Promise.all([
        approveRelease(id, { evaluationId: evaluation, actor: "A" }),
        approveRelease(id, { evaluationId: evaluation, actor: "B" }),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    const results = await race;

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await actions(id)).filter((a) => a === "release_approved")).toHaveLength(1);
  });

  it("keeps evaluations and audit events append-only", async () => {
    const id = await newRelease();
    const evaluation = await evaluate(id, passing);

    await expect(admin`update evaluations set passed = false where id = ${evaluation}`).rejects.toThrow("append-only");
    await expect(admin`delete from evaluations where id = ${evaluation}`).rejects.toThrow("append-only");
    await expect(admin`update audit_events set actor = 'x' where release_id = ${id}`).rejects.toThrow("append-only");
    await expect(admin`delete from audit_events where release_id = ${id}`).rejects.toThrow("append-only");
  });

  it("rejects duplicate releases and unknown or malformed release ids", async () => {
    await createRelease({ modelName: "dup", version: "1", owner: "O", useCase: "U", riskTier: "low" });
    expect(await createRelease({ modelName: "dup", version: "1", owner: "O", useCase: "U", riskTier: "low" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("already exists"),
    });

    for (const bad of ["not-a-uuid", crypto.randomUUID()]) {
      expect(await submitEvaluation(bad, passing)).toEqual({ ok: false, error: "Release not found." });
      expect(await rejectRelease(bad, { actor: "Lead", note: "x" })).toEqual({ ok: false, error: "Release not found." });
    }
  });
});
