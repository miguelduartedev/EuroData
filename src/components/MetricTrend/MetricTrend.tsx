import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MetricTrend() {
  return (
    <Card className="gap-0 shadow-none" aria-labelledby="trend-heading">
      <CardHeader className="p-6">
        <CardTitle
          id="trend-heading"
          className="text-[clamp(1.45rem,2.4vw,2rem)] tracking-[-0.035em]"
        >
          Historical trend
        </CardTitle>
        <CardDescription className="mt-2.5 leading-6">
          Select a metric to view its historical trend for the selected regions.
        </CardDescription>
      </CardHeader>
      {/* TODO: Add metric selection and a historical data representation. */}
    </Card>
  )
}
