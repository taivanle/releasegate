"use client";

import { useActionState } from "react";
import { createReleaseAction, type FormState } from "@/app/releases/actions";
import { Field, FormMessage, selectClassName } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RISK_TIERS } from "@/lib/policy";

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    // first-of-type, not first: React inserts hidden action inputs ahead of the fieldsets.
    <fieldset className="border-border border-t pt-6 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="float-left mb-4 w-full text-sm font-semibold">{legend}</legend>
      <div className="clear-left grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ReleaseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createReleaseAction, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6" noValidate>
      <Group legend="Model">
        <Field id="modelName" label="Model name" errors={err.modelName}>
          <Input id="modelName" name="modelName" defaultValue={v.modelName} placeholder="support-assistant" aria-invalid={!!err.modelName} required />
        </Field>
        <Field id="version" label="Version" errors={err.version}>
          <Input id="version" name="version" defaultValue={v.version} placeholder="2.4.0" aria-invalid={!!err.version} required />
        </Field>
      </Group>
      <Group legend="Ownership and risk">
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
      </Group>
      <Group legend="Purpose">
        <div className="sm:col-span-2">
          <Field id="useCase" label="Use case" errors={err.useCase}>
            <Textarea id="useCase" name="useCase" defaultValue={v.useCase} placeholder="Drafts first replies to tier-1 support tickets" aria-invalid={!!err.useCase} required />
          </Field>
        </div>
      </Group>
      <FormMessage error={state.error} />
      <div className="border-border border-t pt-6">
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
          {pending ? "Creating…" : "Create release"}
        </Button>
      </div>
    </form>
  );
}
