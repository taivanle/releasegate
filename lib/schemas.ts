import { z } from "zod";
import { RISK_TIERS } from "./policy";

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

// FormData values arrive as strings; an empty field must fail rather than coerce to 0.
const numeric = (schema: z.ZodNumber) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), schema);

export const createReleaseSchema = z.object({
  modelName: text("Model name", 100),
  version: text("Version", 50),
  owner: text("Owner", 100),
  useCase: text("Use case", 500),
  riskTier: z.enum(RISK_TIERS, { error: "Select a risk tier" }),
});

export const evaluationSchema = z.object({
  qualityPassRate: numeric(
    z
      .number({ error: "Enter a pass rate between 0 and 100" })
      .min(0, "Enter a pass rate between 0 and 100")
      .max(100, "Enter a pass rate between 0 and 100"),
  ),
  criticalSafetyFailures: numeric(
    z
      .number({ error: "Enter a whole number of failures" })
      .int("Enter a whole number of failures")
      .min(0, "Failures cannot be negative")
      .max(1_000_000, "Value is too large"),
  ),
  p95LatencyMs: numeric(
    z
      .number({ error: "Enter latency in whole milliseconds" })
      .int("Enter latency in whole milliseconds")
      .min(0, "Latency cannot be negative")
      .max(3_600_000, "Value is too large"),
  ),
  avgCostUsd: numeric(
    z
      .number({ error: "Enter a cost in USD" })
      .min(0, "Cost cannot be negative")
      .max(1000, "Value is too large"),
  ),
  submittedBy: text("Your name", 100),
});

export const approveSchema = z.object({
  evaluationId: z.uuid("Missing evaluation reference"),
  actor: text("Your name", 100),
  note: z.string().trim().max(500, "Note must be at most 500 characters").optional(),
});

export const rejectSchema = z.object({
  actor: text("Your name", 100),
  note: text("A rejection reason", 500),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type EvaluationInput = z.infer<typeof evaluationSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
