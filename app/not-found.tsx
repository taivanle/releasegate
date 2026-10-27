import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="bg-card border-border grid place-items-center gap-4 rounded-2xl border px-6 py-16 text-center">
      <span className="border-line-strong text-muted-foreground grid size-12 place-items-center rounded-full border">
        <SearchX className="size-5" aria-hidden />
      </span>
      <div className="grid gap-2">
        <h2 className="text-xl font-medium tracking-[-0.02em]">Release not found</h2>
        <p className="text-ink-soft text-sm">It may have been mistyped, or it doesn&apos;t exist.</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft aria-hidden /> Back to releases
      </Link>
    </section>
  );
}
