"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent className="grid place-items-center gap-3 py-16 text-center">
        <h2 className="text-lg font-medium">Something went wrong</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          We couldn&apos;t load this page. The database may be temporarily unavailable.
        </p>
        <Button variant="outline" onClick={() => retry()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
