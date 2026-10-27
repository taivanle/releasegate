import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReleaseForm } from "@/components/release-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewReleasePage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded-full text-sm transition-colors">
        <ArrowLeft className="size-4" aria-hidden /> All releases
      </Link>
      <Card>
        <CardHeader className="border-border border-b">
          <CardTitle>
            <h1 className="text-2xl font-medium tracking-[-0.025em]">New release</h1>
          </CardTitle>
          <CardDescription className="text-ink-soft">
            Register a model release. You will submit evaluation results on the next screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReleaseForm />
        </CardContent>
      </Card>
    </div>
  );
}
