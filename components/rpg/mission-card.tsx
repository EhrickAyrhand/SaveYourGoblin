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
      <CardHeader className="px-6 pt-6">
        <div className="flex items-start justify-between mb-3">
          <CardTitle className="font-display text-4xl">{mission.title}</CardTitle>
          <span className={`font-display text-base font-semibold ${difficultyColors[mission.difficulty]}`}>
            {difficultyBadges[mission.difficulty]}
          </span>
        </div>
        <CardDescription className="font-body text-base leading-relaxed">
          {mission.context}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-display text-2xl font-semibold mb-3">Mission Brief</h3>
          <p className="font-body text-base text-muted-foreground leading-relaxed">
            {mission.description}
          </p>
        </div>

        {/* Objectives */}
        {mission.objectives && mission.objectives.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Objectives</h3>
            <div className="space-y-3">
              {mission.objectives.map((objective, idx) => (
                <div
                  key={idx}
                  className={`font-body text-base p-4 rounded-md border-l-4 ${
                    objective.primary
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50 border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-primary text-lg mt-0.5">
                      {objective.primary ? "★" : "○"}
                    </span>
                    <span className={objective.primary ? "font-medium" : "text-muted-foreground"}>
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
          <h3 className="font-display text-2xl font-semibold mb-4">Rewards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {mission.rewards.xp !== undefined && (
              <div className="p-4 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-sm text-muted-foreground mb-2">Experience</p>
                <p className="font-display text-2xl font-semibold text-primary">
                  {mission.rewards.xp.toLocaleString()} XP
                </p>
              </div>
            )}
            {mission.rewards.gold !== undefined && (
              <div className="p-4 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-sm text-muted-foreground mb-2">Gold</p>
                <p className="font-display text-2xl font-semibold text-primary">
                  {mission.rewards.gold.toLocaleString()} gp
                </p>
              </div>
            )}
            {mission.rewards.items && mission.rewards.items.length > 0 && (
              <div className="p-4 rounded-md bg-muted/50 border border-border">
                <p className="font-body text-sm text-muted-foreground mb-2">Items</p>
                <p className="font-display text-2xl font-semibold text-primary">
                  {mission.rewards.items.length} item{mission.rewards.items.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          {mission.rewards.items && mission.rewards.items.length > 0 && (
            <div className="mt-3">
              <p className="font-body text-sm text-muted-foreground mb-3">Item List:</p>
              <div className="flex flex-wrap gap-3">
                {mission.rewards.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="font-body text-base px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
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
            <h3 className="font-display text-2xl font-semibold mb-4">Related NPCs</h3>
            <div className="flex flex-wrap gap-3">
              {mission.relatedNPCs.map((npc, idx) => (
                <div
                  key={idx}
                  className="font-body text-base px-4 py-2 rounded-full bg-muted/50 border border-border font-medium"
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
            <h3 className="font-display text-2xl font-semibold mb-4">Related Locations</h3>
            <div className="flex flex-wrap gap-3">
              {mission.relatedLocations.map((location, idx) => (
                <div
                  key={idx}
                  className="font-body text-base px-4 py-2 rounded-full bg-muted/50 border border-border font-medium"
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

