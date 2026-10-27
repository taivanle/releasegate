import { CircleAlert, CircleCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

export function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-danger flex items-start gap-1.5 text-xs leading-snug">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {errors[0]}
        </p>
      ) : hint ? (
        <p className="text-faint text-xs leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="border-danger-line bg-danger-surface flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
        <CircleAlert className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="border-success-line bg-success-surface flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
        <CircleCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
        {success}
      </p>
    );
  }
  return null;
}

export const selectClassName =
  "border-input bg-field text-foreground focus-visible:border-primary focus-visible:ring-primary/25 aria-invalid:border-danger aria-invalid:ring-danger/20 h-10 w-full rounded-lg border px-3 text-base outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-3 aria-invalid:ring-3 md:text-sm";
