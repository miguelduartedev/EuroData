import { MousePointerClickIcon, ScaleIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MapGuidance() {
  return (
    <Card className="flex-row flex-wrap items-center gap-3 rounded-lg border border-border p-4 shadow-none ring-0">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <MousePointerClickIcon aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1 basis-44">
        <h2 className="text-sm font-semibold">Click a region to see details</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Explore the map to view regional data. Select regions to compare their trends side by side.</p>
      </div>
      <Button disabled variant="secondary" className="h-9 text-xs">
        <ScaleIcon aria-hidden="true" /> Compare regions
      </Button>
    </Card>
  );
}
