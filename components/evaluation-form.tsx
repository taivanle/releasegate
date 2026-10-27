"use client";

import { useActionState } from "react";
import { submitEvaluationAction, type FormState } from "@/app/releases/actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { THRESHOLDS } from "@/lib/policy";

export function EvaluationForm({ releaseId }: { releaseId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitEvaluationAction.bind(null, releaseId),
    {},
  );
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="qualityPassRate" label="Quality pass rate (%)" errors={err.qualityPassRate} hint={`Required: ≥ ${THRESHOLDS.minQualityPassRate}%`}>
          <Input id="qualityPassRate" name="qualityPassRate" type="number" inputMode="decimal" step="0.01" min={0} max={100} defaultValue={v.qualityPassRate} aria-invalid={!!err.qualityPassRate} required />
        </Field>
        <Field id="criticalSafetyFailures" label="Critical safety failures" errors={err.criticalSafetyFailures} hint="Required: 0">
          <Input id="criticalSafetyFailures" name="criticalSafetyFailures" type="number" inputMode="numeric" step="1" min={0} defaultValue={v.criticalSafetyFailures} aria-invalid={!!err.criticalSafetyFailures} required />
        </Field>
        <Field id="p95LatencyMs" label="p95 latency (ms)" errors={err.p95LatencyMs} hint={`Required: ≤ ${THRESHOLDS.maxP95LatencyMs} ms`}>
          <Input id="p95LatencyMs" name="p95LatencyMs" type="number" inputMode="numeric" step="1" min={0} defaultValue={v.p95LatencyMs} aria-invalid={!!err.p95LatencyMs} required />
        </Field>
        <Field id="avgCostUsd" label="Average cost per run (USD)" errors={err.avgCostUsd} hint={`Required: ≤ $${THRESHOLDS.maxAvgCostUsd}`}>
          <Input id="avgCostUsd" name="avgCostUsd" type="number" inputMode="decimal" step="0.0001" min={0} defaultValue={v.avgCostUsd} aria-invalid={!!err.avgCostUsd} required />
        </Field>
      </div>
      <Field id="submittedBy" label="Submitted by" errors={err.submittedBy}>
        <Input id="submittedBy" name="submittedBy" defaultValue={v.submittedBy} placeholder="Your name" aria-invalid={!!err.submittedBy} required />
      </Field>
      <FormMessage error={state.error} success={state.success} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Evaluating…" : "Evaluate against policy"}
        </Button>
      </div>
    </form>
  );
}
