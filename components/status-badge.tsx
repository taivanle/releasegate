import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Readiness } from "@/lib/policy";

const styles: Record<Readiness, { label: string; className: string }> = {
  not_evaluated: { label: "Not evaluated", className: "border-border bg-muted text-muted-foreground" },
  blocked: { label: "Blocked", className: "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-400" },
  ready: { label: "Ready", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  approved: { label: "Approved", className: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300" },
};

export function StatusBadge({ readiness, className }: { readiness: Readiness; className?: string }) {
  const s = styles[readiness];
  return (
    <Badge variant="outline" className={cn(s.className, className)}>
      {s.label}
    </Badge>
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}
