"use client";

import { useActionState } from "react";
import { createReleaseAction, type FormState } from "@/app/releases/actions";
import { Field, FormMessage, selectClassName } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RISK_TIERS } from "@/lib/policy";

export function ReleaseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createReleaseAction, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="modelName" label="Model name" errors={err.modelName}>
          <Input id="modelName" name="modelName" defaultValue={v.modelName} placeholder="support-assistant" aria-invalid={!!err.modelName} required />
        </Field>
        <Field id="version" label="Version" errors={err.version}>
          <Input id="version" name="version" defaultValue={v.version} placeholder="2.4.0" aria-invalid={!!err.version} required />
        </Field>
        <Field id="owner" label="Owner" errors={err.owner}>
          <Input id="owner" name="owner" defaultValue={v.owner} placeholder="Jane Doe" aria-invalid={!!err.owner} required />
        </Field>
        <Field id="riskTier" label="Risk tier" errors={err.riskTier} hint="Recorded as metadata. Policy v1 applies the same thresholds to every tier.">
          <select id="riskTier" name="riskTier" defaultValue={v.riskTier ?? ""} className={selectClassName} aria-invalid={!!err.riskTier} required>
            <option value="" disabled>
              Select a risk tier
            </option>
            {RISK_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier[0].toUpperCase() + tier.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="useCase" label="Use case" errors={err.useCase}>
        <Textarea id="useCase" name="useCase" defaultValue={v.useCase} placeholder="Drafts first replies to tier-1 support tickets" aria-invalid={!!err.useCase} required />
      </Field>
      <FormMessage error={state.error} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create release"}
        </Button>
      </div>
    </form>
  );
}
