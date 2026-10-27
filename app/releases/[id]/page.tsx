import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, Ban, CircleCheck, FilePlus2, FlaskConical, Hourglass, OctagonX, XCircle } from "lucide-react";
import { DecisionForm } from "@/components/decision-form";
import { EvaluationForm } from "@/components/evaluation-form";
import { formatDate, StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { canApprove, POLICY_VERSION, type ReleaseStatus } from "@/lib/policy";
import { getRelease, type AuditEvent, type Evaluation, type Release } from "@/lib/releases";
import { cn } from "@/lib/utils";

export default function ReleasePage({ params }: PageProps<"/releases/[id]">) {
  return (
    <div className="grid gap-8">
      <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded-full text-sm transition-colors">
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
      <header className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-medium tracking-[-0.03em] wrap-anywhere sm:text-4xl">{release.modelName}</h1>
          <span className="border-line-strong text-ink-soft rounded-full border px-2.5 py-0.5 font-mono text-xs">
            v{release.version}
          </span>
          <StatusBadge readiness={readiness} />
        </div>
        <p className="text-ink-soft max-w-2xl">{release.useCase}</p>
        <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <Meta label="Owner">{release.owner}</Meta>
          <Meta label="Risk tier">
            <span className="capitalize">{release.riskTier}</span>
          </Meta>
          <Meta label="Created">
            <time dateTime={release.createdAt.toISOString()} className="tabular-nums">
              {formatDate(release.createdAt)}
            </time>
          </Meta>
        </dl>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Release readiness</h2>
              </CardTitle>
              <CardDescription>
                Policy {POLICY_VERSION}: four mandatory checks, evaluated against the latest results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latest ? <Checks evaluation={latest} status={release.status} /> : <NoEvaluation />}
            </CardContent>
          </Card>

          {release.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>{latest ? "Submit new results" : "Submit evaluation results"}</h2>
                </CardTitle>
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
              <CardTitle>
                <h2>Decision</h2>
              </CardTitle>
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
                <DecisionSummary release={release} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Audit trail</h2>
              </CardTitle>
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

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-faint text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NoEvaluation() {
  return (
    <div className="border-line-strong text-muted-foreground grid place-items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center text-sm">
      <FlaskConical className="text-primary size-6" aria-hidden />
      <p className="max-w-sm">No evaluation results yet. Submit results below to check this release against the policy.</p>
    </div>
  );
}

const verdictTone = {
  pending: { icon: Hourglass, className: "border-warning-line bg-warning-surface", iconClassName: "text-warning" },
  approved: { icon: CircleCheck, className: "border-success-line bg-success-surface", iconClassName: "text-success" },
  rejected: { icon: CircleCheck, className: "border-border bg-raised", iconClassName: "text-muted-foreground" },
} satisfies Record<ReleaseStatus, { icon: typeof CircleCheck; className: string; iconClassName: string }>;

function Checks({ evaluation, status }: { evaluation: Evaluation; status: ReleaseStatus }) {
  const blockers = evaluation.checks.filter((c) => c.blocker);
  const tone = verdictTone[status];
  return (
    <div className="grid gap-5">
      {blockers.length > 0 ? (
        <div role="alert" className="border-danger-line bg-danger-surface grid gap-3 rounded-xl border p-4">
          <p className="text-danger flex items-start gap-2 font-medium">
            <OctagonX className="mt-0.5 size-4 shrink-0" aria-hidden />
            {blockers.length} {blockers.length === 1 ? "blocker" : "blockers"} must be resolved before approval
          </p>
          <ul className="grid list-disc gap-1.5 pl-6 text-sm leading-relaxed marker:text-danger">
            {blockers.map((c) => (
              <li key={c.id}>{c.blocker}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={cn("flex items-start gap-2 rounded-xl border p-4 font-medium", tone.className)}>
          <tone.icon className={cn("mt-0.5 size-4 shrink-0", tone.iconClassName)} aria-hidden />
          All mandatory checks pass.{status === "pending" && " This release can be approved."}
        </p>
      )}
      <ul className="border-border divide-border divide-y rounded-xl border">
        {evaluation.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            {c.passed ? (
              <CircleCheck className="text-success size-4 shrink-0" role="img" aria-label="Passed" />
            ) : (
              <XCircle className="text-danger size-4 shrink-0" role="img" aria-label="Failed" />
            )}
            <span className="flex-1">{c.label}</span>
            <span className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-6">
              <span className={cn("font-mono tabular-nums", !c.passed && "text-danger")}>{c.actual}</span>
              <span className="text-faint font-mono text-xs tabular-nums sm:w-24 sm:text-right">{c.threshold}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-faint text-xs">
        Latest results submitted by {evaluation.submittedBy} on{" "}
        <time dateTime={evaluation.createdAt.toISOString()} className="tabular-nums">
          {formatDate(evaluation.createdAt)}
        </time>
        .
      </p>
    </div>
  );
}

function DecisionSummary({ release }: { release: Release }) {
  const approved = release.status === "approved";
  const Icon = approved ? CircleCheck : Ban;
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border p-4 text-sm",
        approved ? "border-success-line bg-success-surface" : "border-danger-line bg-danger-surface",
      )}
    >
      <p className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", approved ? "text-success" : "text-danger")} aria-hidden />
        <span>
          <span className={cn("font-medium capitalize", approved ? "text-success" : "text-danger")}>{release.status}</span> by{" "}
          {release.decidedBy}
        </span>
      </p>
      {release.decidedAt && (
        <time dateTime={release.decidedAt.toISOString()} className="text-muted-foreground text-xs tabular-nums">
          {formatDate(release.decidedAt)}
        </time>
      )}
      {release.decisionNote && <p className="text-ink-soft">“{release.decisionNote}”</p>}
    </div>
  );
}

const eventMeta = {
  release_created: { icon: FilePlus2, title: "Release created" },
  evaluation_submitted: { icon: FlaskConical, title: "Evaluation submitted" },
  release_approved: { icon: CircleCheck, title: "Release approved" },
  release_rejected: { icon: Ban, title: "Release rejected" },
} satisfies Record<AuditEvent["action"], { icon: unknown; title: string }>;

function eventTone(e: AuditEvent, passed: boolean | undefined) {
  if (e.action === "release_approved") return "text-success";
  if (e.action === "release_rejected") return "text-danger";
  if (e.action === "evaluation_submitted") return passed ? "text-success" : "text-danger";
  return "text-muted-foreground";
}

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="grid gap-5">
      {events.map((e, i) => {
        const { icon: Icon, title } = eventMeta[e.action];
        const d = e.details as { passed?: boolean; failedChecks?: string[]; note?: string | null };
        return (
          <li key={e.id} className="relative grid grid-cols-[1.75rem_1fr] gap-3 text-sm">
            {i < events.length - 1 && (
              <span aria-hidden className="bg-border absolute top-8 -bottom-5 left-3.5 w-px -translate-x-1/2" />
            )}
            <span className="bg-raised ring-border grid size-7 place-items-center rounded-full ring-1">
              <Icon className={cn("size-3.5", eventTone(e, d.passed))} aria-hidden />
            </span>
            <div className="grid min-w-0 gap-0.5 pt-1">
              <p className="leading-snug">
                <span className="font-medium">{title}</span> <span className="text-ink-soft">by {e.actor}</span>
              </p>
              {e.action === "evaluation_submitted" && (
                <p className={d.passed ? "text-success" : "text-danger"}>
                  {d.passed ? "All checks passed" : `Failed: ${d.failedChecks?.join(", ")}`}
                </p>
              )}
              {d.note && <p className="text-ink-soft wrap-break-word">“{d.note}”</p>}
              <time dateTime={e.createdAt.toISOString()} className="text-faint text-xs tabular-nums">
                {formatDate(e.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading release">
      <div className="grid gap-4">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-5 w-1/2 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
