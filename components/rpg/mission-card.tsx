"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Mission } from "@/types/rpg"

interface MissionCardProps {
  mission: Mission
  isLoading?: boolean
}

const difficultyColors = {
  easy: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  hard: "text-orange-600 dark:text-orange-400",
  deadly: "text-red-600 dark:text-red-400",
}

const difficultyBadges = {
  easy: "🟢 Easy",
  medium: "🟡 Medium",
  hard: "🟠 Hard",
  deadly: "🔴 Deadly",
}

export function MissionCard({ mission, isLoading = false }: MissionCardProps) {
  if (isLoading) {
    return (
      <Card className="parchment ornate-border animate-pulse">
        <CardHeader>
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="parchment ornate-border">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="font-display text-3xl">{mission.title}</CardTitle>
          <span className={`font-display text-sm font-semibold ${difficultyColors[mission.difficulty]}`}>
            {difficultyBadges[mission.difficulty]}
          </span>
        </div>
        <CardDescription className="font-body text-base">
          {mission.context}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-display text-lg font-semibold mb-2">Mission Brief</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {mission.description}
          </p>
        </div>

        {/* Objectives */}
        {mission.objectives && mission.objectives.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Objectives</h3>
            <div className="space-y-2">
              {mission.objectives.map((objective, idx) => (
                <div
                  key={idx}
                  className={`font-body text-sm p-3 rounded-md border-l-4 ${
                    objective.primary
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50 border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary mt-0.5">
                      {objective.primary ? "★" : "○"}
                    </span>
                    <span className={objective.primary ? "" : "text-muted-foreground"}>
                      {objective.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards */}
        {mission.rewards && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-3">Rewards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {mission.rewards.xp !== undefined && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-xs text-muted-foreground mb-1">Experience</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {mission.rewards.xp.toLocaleString()} XP
                </p>
              </div>
            )}
            {mission.rewards.gold !== undefined && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-xs text-muted-foreground mb-1">Gold</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {mission.rewards.gold.toLocaleString()} gp
                </p>
              </div>
            )}
            {mission.rewards.items && mission.rewards.items.length > 0 && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-xs text-muted-foreground mb-1">Items</p>
                <p className="font-display text-lg font-semibold text-primary">
                  {mission.rewards.items.length} item{mission.rewards.items.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          {mission.rewards.items && mission.rewards.items.length > 0 && (
            <div className="mt-2">
              <p className="font-body text-xs text-muted-foreground mb-2">Item List:</p>
              <div className="flex flex-wrap gap-2">
                {mission.rewards.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="font-body text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Related NPCs */}
        {mission.relatedNPCs && mission.relatedNPCs.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Related NPCs</h3>
            <div className="flex flex-wrap gap-2">
              {mission.relatedNPCs.map((npc, idx) => (
                <div
                  key={idx}
                  className="font-body text-sm px-3 py-1.5 rounded-full bg-muted/50 border border-border"
                >
                  {npc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Locations */}
        {mission.relatedLocations && mission.relatedLocations.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Related Locations</h3>
            <div className="flex flex-wrap gap-2">
              {mission.relatedLocations.map((location, idx) => (
                <div
                  key={idx}
                  className="font-body text-sm px-3 py-1.5 rounded-full bg-muted/50 border border-border"
                >
                  🗺️ {location}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

