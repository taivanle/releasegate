import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FlaskConical, Layers, Plus } from "lucide-react";
import { formatDate, readinessStyles, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listReleases, type ReleaseSummary } from "@/lib/releases";

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="grid gap-2">
          <h1 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Releases</h1>
          <p className="text-ink-soft max-w-xl">
            Every AI release, its evaluation results and its approval decision in one place.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden /> New release
        </Link>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  await connection();
  const releases = await listReleases();

  if (releases.length === 0) {
    return (
      <section className="bg-card border-border grid place-items-center gap-4 rounded-2xl border px-6 py-16 text-center">
        <span className="border-line-strong text-primary grid size-12 place-items-center rounded-full border">
          <FlaskConical className="size-5" aria-hidden />
        </span>
        <div className="grid gap-2">
          <h2 className="text-xl font-medium tracking-[-0.02em]">No releases yet</h2>
          <p className="text-ink-soft max-w-sm text-sm">
            Create a release, submit its evaluation results and ReleaseGate will check them against policy v1.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants()}>
          <Plus aria-hidden /> Create your first release
        </Link>
      </section>
    );
  }

  const count = (r: ReleaseSummary["readiness"]) => releases.filter((x) => x.readiness === r).length;
  const stats = [
    { label: "Total releases", value: releases.length, icon: Layers, tone: "text-muted-foreground" },
    { label: "Ready for approval", value: count("ready"), icon: readinessStyles.ready.icon, tone: "text-warning" },
    { label: "Blocked", value: count("blocked"), icon: readinessStyles.blocked.icon, tone: "text-danger" },
    { label: "Approved", value: count("approved"), icon: readinessStyles.approved.icon, tone: "text-success" },
  ];

  return (
    <>
      <dl className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card grid gap-3 p-4 sm:p-5">
            <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <s.icon className={cn("size-3.5 shrink-0", s.tone)} aria-hidden />
              {s.label}
            </dt>
            <dd className="text-3xl font-medium tracking-[-0.02em] tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="All releases" className="bg-card border-border hidden overflow-hidden rounded-2xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Release</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Risk tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.map((r) => (
              <TableRow key={r.id} className="hover:bg-raised/70 relative">
                <TableCell className="pl-5">
                  <Link
                    href={`/releases/${r.id}`}
                    className="font-medium after:absolute after:inset-0 hover:underline hover:underline-offset-4"
                  >
                    {r.modelName}
                  </Link>{" "}
                  <span className="text-faint font-mono text-xs">v{r.version}</span>
                </TableCell>
                <TableCell className="text-ink-soft">{r.owner}</TableCell>
                <TableCell className="text-ink-soft capitalize">{r.riskTier}</TableCell>
                <TableCell>
                  <StatusBadge readiness={r.readiness} />
                </TableCell>
                <TableCell className="text-faint pr-5 text-right text-xs tabular-nums">
                  {formatDate(r.decidedAt ?? r.lastEvaluatedAt ?? r.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <ul aria-label="All releases" className="grid gap-3 md:hidden">
        {releases.map((r) => (
          <li key={r.id}>
            <Link
              href={`/releases/${r.id}`}
              className="bg-card border-border hover:border-line-strong grid gap-3 rounded-2xl border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.modelName}</p>
                  <p className="text-faint font-mono text-xs">v{r.version}</p>
                </div>
                <StatusBadge readiness={r.readiness} />
              </div>
              <p className="text-muted-foreground text-xs">
                {r.owner} · <span className="capitalize">{r.riskTier}</span> risk ·{" "}
                <span className="tabular-nums">{formatDate(r.decidedAt ?? r.lastEvaluatedAt ?? r.createdAt)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading releases">
      <Skeleton className="h-48 rounded-2xl sm:h-52 lg:h-28" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
