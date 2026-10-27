import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, CircleSlash, FilePlus2, FlaskConical, XCircle } from "lucide-react";
import { DecisionForm } from "@/components/decision-form";
import { EvaluationForm } from "@/components/evaluation-form";
import { formatDate, StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { canApprove, POLICY_VERSION } from "@/lib/policy";
import { getRelease, type AuditEvent, type Evaluation } from "@/lib/releases";

export default function ReleasePage({ params }: PageProps<"/releases/[id]">) {
  return (
    <div className="grid gap-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden /> All releases
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ReleaseDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ReleaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const data = await getRelease(id);
  if (!data) notFound();
  const { release, latest, events, readiness } = data;

  const approval = canApprove({
    status: release.status,
    latestEvaluation: latest ? { id: latest.id, metrics: latest } : null,
    reviewedEvaluationId: latest?.id ?? "",
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-all">{release.modelName}</h1>
            <span className="text-muted-foreground font-mono text-sm">v{release.version}</span>
            <StatusBadge readiness={readiness} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Owner {release.owner} · <span className="capitalize">{release.riskTier}</span> risk · Created{" "}
            {formatDate(release.createdAt)}
          </p>
          <p className="mt-2 max-w-2xl text-sm">{release.useCase}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Release readiness</CardTitle>
              <CardDescription>
                Policy {POLICY_VERSION}: four mandatory checks, evaluated against the latest results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latest ? <Checks evaluation={latest} pending={release.status === "pending"} /> : <NoEvaluation />}
            </CardContent>
          </Card>

          {release.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>{latest ? "Submit new results" : "Submit evaluation results"}</CardTitle>
                <CardDescription>
                  Results are append-only. Re-submitting adds a new evaluation and the latest one is used for approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvaluationForm releaseId={release.id} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
              {release.status === "pending" && (
                <CardDescription>Approval unlocks only when every mandatory check passes.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {release.status === "pending" ? (
                <DecisionForm
                  releaseId={release.id}
                  evaluationId={latest?.id ?? null}
                  approveBlockedReason={approval.ok ? null : approval.reason}
                />
              ) : (
                <div className="grid gap-1 text-sm">
                  <p>
                    <span className="font-medium capitalize">{release.status}</span> by {release.decidedBy}
                  </p>
                  {release.decidedAt && <p className="text-muted-foreground text-xs">{formatDate(release.decidedAt)}</p>}
                  {release.decisionNote && <p className="mt-2 border-l-2 pl-3">{release.decisionNote}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
              <CardDescription>Append-only record of every action on this release.</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function NoEvaluation() {
  return (
    <div className="text-muted-foreground grid place-items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm">
      <FlaskConical className="size-6" aria-hidden />
      <p>No evaluation results yet. Submit results below to check this release against the policy.</p>
    </div>
  );
}

function Checks({ evaluation, pending }: { evaluation: Evaluation; pending: boolean }) {
  const blockers = evaluation.checks.filter((c) => c.blocker);
  return (
    <div className="grid gap-4">
      {blockers.length > 0 ? (
        <div role="alert" className="rounded-lg border border-red-600/20 bg-red-600/5 p-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {blockers.length} {blockers.length === 1 ? "blocker" : "blockers"} must be resolved before approval
          </p>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm">
            {blockers.map((c) => (
              <li key={c.id}>{c.blocker}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          All mandatory checks pass.{pending && " This release can be approved."}
        </p>
      )}
      <ul className="divide-y rounded-lg border">
        {evaluation.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            {c.passed ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Passed" />
            ) : (
              <XCircle className="size-4 shrink-0 text-red-600" aria-label="Failed" />
            )}
            <span className="flex-1">{c.label}</span>
            <span className="font-mono tabular-nums">{c.actual}</span>
            <span className="text-muted-foreground w-20 text-right font-mono text-xs">{c.threshold}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Latest results submitted by {evaluation.submittedBy} on {formatDate(evaluation.createdAt)}.
      </p>
    </div>
  );
}

const eventMeta = {
  release_created: { icon: FilePlus2, title: "Release created" },
  evaluation_submitted: { icon: FlaskConical, title: "Evaluation submitted" },
  release_approved: { icon: CheckCircle2, title: "Release approved" },
  release_rejected: { icon: CircleSlash, title: "Release rejected" },
} satisfies Record<AuditEvent["action"], { icon: unknown; title: string }>;

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="grid gap-4">
      {events.map((e) => {
        const { icon: Icon, title } = eventMeta[e.action];
        const d = e.details as { passed?: boolean; failedChecks?: string[]; note?: string | null };
        return (
          <li key={e.id} className="flex gap-3 text-sm">
            <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>
                <span className="font-medium">{title}</span> by {e.actor}
              </p>
              {e.action === "evaluation_submitted" && (
                <p className={d.passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                  {d.passed ? "All checks passed" : `Failed: ${d.failedChecks?.join(", ")}`}
                </p>
              )}
              {d.note && <p className="text-muted-foreground wrap-break-word">“{d.note}”</p>}
              <p className="text-muted-foreground text-xs">{formatDate(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading release">
      <Skeleton className="h-16 w-2/3 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
