import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { formatDate, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReleases, type ReleaseSummary } from "@/lib/releases";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
          <p className="text-muted-foreground text-sm">
            Every AI release, its evaluation results and its approval decision in one place.
          </p>
        </div>
        <Link href="/releases/new" className={buttonVariants()}>
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
      <Card>
        <CardContent className="grid place-items-center gap-3 py-16 text-center">
          <h2 className="text-lg font-medium">No releases yet</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            Create a release, submit its evaluation results and ReleaseGate will check them against policy v1.
          </p>
          <Link href="/releases/new" className={buttonVariants()}>
            <Plus aria-hidden /> Create your first release
          </Link>
        </CardContent>
      </Card>
    );
  }

  const count = (r: ReleaseSummary["readiness"]) => releases.filter((x) => x.readiness === r).length;
  const stats = [
    { label: "Total releases", value: releases.length },
    { label: "Ready for approval", value: count("ready") },
    { label: "Blocked", value: count("blocked") },
    { label: "Approved", value: count("approved") },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent>
              <p className="text-muted-foreground text-xs font-medium">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Release</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Risk tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.map((r) => (
              <TableRow key={r.id} className="relative">
                <TableCell className="pl-4">
                  <Link href={`/releases/${r.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                    {r.modelName}
                  </Link>{" "}
                  <span className="text-muted-foreground font-mono text-xs">v{r.version}</span>
                </TableCell>
                <TableCell>{r.owner}</TableCell>
                <TableCell className="capitalize">{r.riskTier}</TableCell>
                <TableCell>
                  <StatusBadge readiness={r.readiness} />
                </TableCell>
                <TableCell className="text-muted-foreground pr-4 text-right text-xs">
                  {formatDate(r.decidedAt ?? r.lastEvaluatedAt ?? r.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ul className="grid gap-3 md:hidden">
        {releases.map((r) => (
          <li key={r.id}>
            <Link href={`/releases/${r.id}`} className="bg-card ring-foreground/10 block rounded-xl p-4 ring-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.modelName}</p>
                  <p className="text-muted-foreground font-mono text-xs">v{r.version}</p>
                </div>
                <StatusBadge readiness={r.readiness} />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {r.owner} · <span className="capitalize">{r.riskTier}</span> risk
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
    <div className="grid gap-6" aria-busy="true" aria-label="Loading releases">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
