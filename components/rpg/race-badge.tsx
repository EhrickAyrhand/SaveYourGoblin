"use client"

interface RaceBadgeProps {
  race: string
  size?: "sm" | "md" | "lg"
}

export function RaceBadge({ race, size = "md" }: RaceBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <div className={`inline-flex items-center rounded-lg border border-border bg-muted/50 ${sizeClasses[size]} font-semibold`}>
      {race}
    </div>
  )
}
