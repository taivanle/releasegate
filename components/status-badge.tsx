import { Ban, CircleCheck, CircleDashed, Hourglass, OctagonX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Readiness } from "@/lib/policy";

// Colour is always paired with an icon and a label.
export const readinessStyles: Record<Readiness, { label: string; icon: typeof Ban; className: string }> = {
  not_evaluated: { label: "Not evaluated", icon: CircleDashed, className: "border-line-strong bg-transparent text-muted-foreground" },
  blocked: { label: "Blocked", icon: OctagonX, className: "border-danger-line bg-danger-surface text-danger" },
  ready: { label: "Ready", icon: Hourglass, className: "border-warning-line bg-warning-surface text-warning" },
  approved: { label: "Approved", icon: CircleCheck, className: "border-success-line bg-success-surface text-success" },
  rejected: { label: "Rejected", icon: Ban, className: "border-danger-line bg-danger-surface text-danger" },
};

export function StatusBadge({ readiness, className }: { readiness: Readiness; className?: string }) {
  const { label, icon: Icon, className: tone } = readinessStyles[readiness];
  return (
    <Badge variant="outline" className={cn("h-6 gap-1.5 px-2.5", tone, className)}>
      <Icon aria-hidden />
      {label}
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
