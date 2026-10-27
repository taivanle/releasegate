# ReleaseGate

Release readiness and approval for AI models. Teams record a model release, submit its evaluation
results, and ReleaseGate checks them against a fixed release policy. A release can be approved only
when every mandatory check passes, and every action lands in an append-only audit trail.

**Live:** https://releasegate-tau.vercel.app

## User journey

1. Create a release: model name, version, owner, use case and risk tier.
2. Submit evaluation results: quality pass rate, critical safety failures, p95 latency, average cost per run.
3. The results are evaluated against policy v1. Readiness, failed checks and actionable blockers are shown.
4. Approve (only when all checks pass) or reject (with a reason). Decisions are final.
5. Every step is recorded in the release's audit trail.

## Release policy v1

All four checks are mandatory and apply to every risk tier. A value exactly at the threshold passes.

| Check | Threshold |
| --- | --- |
| Quality pass rate | ≥ 95% |
| Critical safety failures | = 0 |
| p95 latency | ≤ 3000 ms |
| Average cost per run | ≤ $0.05 |

Risk tier is stored as release metadata only. Per-tier thresholds were deliberately left out of the
MVP; the policy lives in one pure module (`lib/policy.ts`) so adding them is a local change.

## Architecture

```
Browser -> Server Components (reads) --+
        -> Server Actions (writes) ----+-> lib/releases.ts -> postgres.js -> Supabase Postgres
                                       +-> lib/policy.ts (pure, unit-tested)
```

- **Next.js 16 App Router**, TypeScript, Tailwind v4, shadcn/ui. No API routes; mutations are Server Actions.
- **`lib/policy.ts`**: thresholds, `evaluatePolicy`, `getReadiness`, `canApprove`, `canReject`. No I/O.
- **`lib/schemas.ts`**: zod validation, run on the server for every action. Empty numeric fields are
  rejected rather than coerced to 0.
- **`lib/releases.ts`**: SQL via `postgres` over Supabase's transaction pooler. Server-only.
- **Approval is transactional**: the release row is locked (`SELECT ... FOR UPDATE`), the latest stored
  evaluation is re-evaluated server-side, and the approver must have been looking at that same
  evaluation. A failing or stale evaluation cannot be approved, even if the UI is bypassed.

## Data model

See `supabase/migrations/20261027170000_init.sql`.

- `releases`: metadata, `status` (`pending` / `approved` / `rejected`) and the decision. Check
  constraints require an approver and an evaluation reference on approval. `(model_name, version)` is unique.
- `evaluations`: append-only metrics plus a snapshot of the policy outcome (`policy_version`, `passed`,
  `checks`). Re-submitting adds a row; the latest row counts.
- `audit_events`: append-only log of `release_created`, `evaluation_submitted`, `release_approved` and
  `release_rejected`.

Readiness (`not_evaluated` / `blocked` / `ready` / `approved` / `rejected`) is derived, not stored.
Triggers block `UPDATE` and `DELETE` on evaluations and audit events. RLS is enabled with no policies,
so Supabase's public Data API cannot read or write the tables; the app connects server-side only.

## Running locally

```bash
cp .env.example .env.local   # set DATABASE_URL (Supabase transaction pooler, port 6543)
npm install
supabase link --project-ref <ref> && supabase db push   # apply the migration
npm run dev
```

```bash
npm test           # policy, approval and validation unit tests (Vitest)
npm run typecheck
npm run lint
npm run build
```

## MVP limitations

- **No authentication.** Names on actions are self-declared and anyone with the URL can create,
  evaluate, approve or reject. Real use needs auth and approver roles.
- Fixed policy thresholds; no per-tier or per-team configuration.
- Results are entered by hand; no CI, webhook or API ingestion.
- No editing or deleting of releases or evaluations, by design.
- Unknown release IDs render the not-found page with HTTP 200, because the lookup streams inside a
  Suspense boundary.
- Supabase free-tier projects pause after a period of inactivity.
