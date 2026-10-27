import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <CardContent className="grid place-items-center gap-3 py-16 text-center">
        <h2 className="text-lg font-medium">Release not found</h2>
        <p className="text-muted-foreground text-sm">It may have been mistyped, or it doesn&apos;t exist.</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to releases
        </Link>
      </CardContent>
    </Card>
  );
}
