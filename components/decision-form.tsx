"use client";

import { useActionState } from "react";
import { decideAction, type FormState } from "@/app/releases/actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DecisionForm({
  releaseId,
  evaluationId,
  approveBlockedReason,
}: {
  releaseId: string;
  evaluationId: string | null;
  approveBlockedReason: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    decideAction.bind(null, releaseId),
    {},
  );
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4" noValidate>
      {evaluationId && <input type="hidden" name="evaluationId" value={evaluationId} />}
      <Field id="actor" label="Your name" errors={err.actor}>
        <Input id="actor" name="actor" defaultValue={v.actor} placeholder="Approver name" aria-invalid={!!err.actor} required />
      </Field>
      <Field id="note" label="Note" errors={err.note} hint="Optional for approval, required to reject.">
        <Textarea id="note" name="note" defaultValue={v.note} rows={2} aria-invalid={!!err.note} />
      </Field>
      {(err.evaluationId || approveBlockedReason) && (
        <p className="text-muted-foreground text-xs">{err.evaluationId?.[0] ?? approveBlockedReason}</p>
      )}
      <FormMessage error={state.error} success={state.success} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" disabled={pending || !!approveBlockedReason}>
          Approve release
        </Button>
        <Button type="submit" name="decision" value="reject" variant="destructive" disabled={pending}>
          Reject
        </Button>
      </div>
    </form>
  );
}
