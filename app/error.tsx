"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="bg-card border-border grid place-items-center gap-4 rounded-2xl border px-6 py-16 text-center">
      <span className="border-danger-line bg-danger-surface text-danger grid size-12 place-items-center rounded-full border">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <div className="grid gap-2">
        <h2 className="text-xl font-medium tracking-[-0.02em]">Something went wrong</h2>
        <p className="text-ink-soft max-w-sm text-sm">
          We couldn&apos;t load this page. The database may be temporarily unavailable.
        </p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        <RotateCw aria-hidden /> Try again
      </Button>
    </section>
  );
}
