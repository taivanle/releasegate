import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReleaseForm } from "@/components/release-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewReleasePage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden /> All releases
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-lg">New release</h1>
          </CardTitle>
          <CardDescription>
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
