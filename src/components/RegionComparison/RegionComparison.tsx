import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function RegionComparison() {
  return (
    <Card className="gap-0  shadow-none" aria-labelledby="comparison-heading">
      <CardHeader className="p-6">
        <CardTitle
          id="comparison-heading"
          role="heading"
          aria-level={2}
          className="text-[clamp(1.45rem,2.4vw,2rem)] tracking-[-0.035em]"
        >
          Key metrics
        </CardTitle>
        <CardDescription className="mt-2.5 leading-6">
          Key metrics comparison will appear here.
        </CardDescription>
      </CardHeader>
      {/* TODO: Render Eurostat metrics and derived comparisons. */}
    </Card>
  )
}
