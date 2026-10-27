"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { approveRelease, createRelease, rejectRelease, submitEvaluation } from "@/lib/releases";
import { approveSchema, createReleaseSchema, evaluationSchema, rejectSchema } from "@/lib/schemas";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const UNEXPECTED = "Something went wrong while saving. Please try again.";

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

export async function createReleaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = createReleaseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  let result;
  try {
    result = await createRelease(parsed.data);
  } catch (e) {
    console.error("createRelease failed", e);
    return { error: UNEXPECTED, values };
  }
  if (!result.ok) return { error: result.error, values };
  redirect(`/releases/${result.data}`);
}

export async function submitEvaluationAction(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = evaluationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    const result = await submitEvaluation(releaseId, parsed.data);
    if (!result.ok) return { error: result.error, values };
  } catch (e) {
    console.error("submitEvaluation failed", e);
    return { error: UNEXPECTED, values };
  }
  refresh();
  return { success: "Evaluation recorded and checked against policy v1." };
}

export async function decideAction(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const decision = values.decision;

  try {
    if (decision === "approve") {
      const parsed = approveSchema.safeParse(values);
      if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
      const result = await approveRelease(releaseId, parsed.data);
      if (!result.ok) return { error: result.error, values };
    } else if (decision === "reject") {
      const parsed = rejectSchema.safeParse(values);
      if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
      const result = await rejectRelease(releaseId, parsed.data);
      if (!result.ok) return { error: result.error, values };
    } else {
      return { error: "Unknown decision.", values };
    }
  } catch (e) {
    console.error("decision failed", e);
    return { error: UNEXPECTED, values };
  }
  refresh();
  return { success: decision === "approve" ? "Release approved." : "Release rejected." };
}
