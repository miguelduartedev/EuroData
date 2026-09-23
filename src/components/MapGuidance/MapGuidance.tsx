import { ChevronRightIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const MAP_EXPLORATION_HINT_DISMISSAL_KEY =
  "eurodata.mapExplorationHintDismissed"

function hintWasDismissed(): boolean {
  if (typeof window === "undefined") return false

  try {
    return (
      window.localStorage.getItem(MAP_EXPLORATION_HINT_DISMISSAL_KEY) === "true"
    )
  } catch {
    return false
  }
}

export function MapGuidance() {
  const [isVisible, setIsVisible] = useState(() => !hintWasDismissed())

  const dismiss = () => {
    try {
      window.localStorage.setItem(MAP_EXPLORATION_HINT_DISMISSAL_KEY, "true")
    } catch {
      // Keep the dismissal for the open page when browser storage is unavailable.
    }
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Card className="relative gap-0 rounded-lg border border-border p-3.5 shadow-none ring-0">
      <div className="flex items-center gap-2 pr-7">
        <h2 className="text-sm font-semibold">Explore the map</h2>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss tip"
        onClick={dismiss}
        className="absolute right-2 top-2 cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </Button>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-2">
        <GuidanceStep
          number="1"
          title="Select a region"
          description="View its value, ranking and history."
        />
        <ChevronRightIcon
          aria-hidden="true"
          className="hidden size-4 text-muted-foreground/70 sm:block"
          strokeWidth={1.5}
        />
        <GuidanceStep
          number="2"
          title="Select another region"
          description="Compare both regions side by side."
        />
      </div>
    </Card>
  )
}

function GuidanceStep({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-4">{title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
