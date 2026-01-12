"use client"

import { PathTypeBadge } from "./path-type-badge"
import type { Objective } from "@/types/rpg"

interface ObjectiveCardProps {
  objective: Objective
  index: number
}

export function ObjectiveCard({ objective, index }: ObjectiveCardProps) {
  const isPrimary = objective.primary
  const isAlternative = objective.isAlternative

  return (
    <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
      isPrimary
        ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary"
        : isAlternative
        ? "bg-gradient-to-r from-orange-500/10 to-red-500/5 border-orange-500/50 ring-2 ring-destructive/20"
        : "bg-muted/50 border-muted-foreground/30"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
          isPrimary 
            ? "bg-primary text-primary-foreground" 
            : isAlternative
            ? "bg-orange-500 text-white"
            : "bg-muted text-muted-foreground"
        }`}>
          {isPrimary ? "★" : isAlternative ? "↻" : "○"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
            <p className={`text-base font-body flex-1 ${
              isPrimary ? "font-semibold" : isAlternative ? "font-medium" : "text-muted-foreground"
            }`}>
              {objective.description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {objective.pathType && (
              <PathTypeBadge pathType={objective.pathType} size="sm" />
            )}
            {isAlternative && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-semibold">
                Alternative Path
              </span>
            )}
            {isPrimary && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-semibold">
                Primary Objective
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
