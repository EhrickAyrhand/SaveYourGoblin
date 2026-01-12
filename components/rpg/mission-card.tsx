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
          <div className="flex flex-col items-end gap-2">
            <span className={`font-display text-base font-semibold ${difficultyColors[mission.difficulty]}`}>
              {difficultyBadges[mission.difficulty]}
            </span>
            {mission.recommendedLevel && (
              <span className="font-body text-sm text-muted-foreground">
                Recommended: {mission.recommendedLevel}
              </span>
            )}
          </div>
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
            {mission.objectives.some(obj => obj.isAlternative) && (
              <p className="font-body text-sm text-muted-foreground mb-3 italic">
                Some objectives are alternative paths - choose one approach
              </p>
            )}
            <div className="space-y-3">
              {mission.objectives.map((objective, idx) => {
                const pathTypeLabels = {
                  combat: '⚔️ Combat',
                  social: '💬 Social',
                  stealth: '🥷 Stealth',
                  mixed: '🔄 Mixed',
                }
                return (
                  <div
                    key={idx}
                    className={`font-body text-base p-4 rounded-md border-l-4 ${
                      objective.primary
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 border-muted-foreground/30"
                    } ${objective.isAlternative ? "ring-2 ring-destructive/20" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-primary text-lg mt-0.5">
                        {objective.primary ? "★" : "○"}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={objective.primary ? "font-medium" : "text-muted-foreground"}>
                            {objective.description}
                          </span>
                          {objective.pathType && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-semibold">
                              {pathTypeLabels[objective.pathType]}
                            </span>
                          )}
                          {objective.isAlternative && (
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-semibold">
                              Alternative Path
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Powerful Items */}
        {mission.powerfulItems && mission.powerfulItems.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Powerful Items</h3>
            <div className="space-y-3">
              {mission.powerfulItems.map((item, idx) => (
                <div
                  key={idx}
                  className="font-body text-base p-4 rounded-md bg-warning/10 border border-warning/30"
                >
                  <div className="font-semibold text-warning mb-1">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Possible Outcomes */}
        {mission.possibleOutcomes && mission.possibleOutcomes.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Possible Outcomes</h3>
            <div className="space-y-2">
              {mission.possibleOutcomes.map((outcome, idx) => (
                <div
                  key={idx}
                  className="font-body text-base p-3 rounded-md bg-muted/50 border border-border"
                >
                  <span className="text-primary font-semibold text-lg">→</span> {outcome}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Base Rewards */}
        {mission.rewards && (
        <div>
          <h3 className="font-display text-2xl font-semibold mb-4">Base Rewards</h3>
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

        {/* Choice-Based Rewards */}
        {mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Choice-Based Rewards</h3>
            <div className="space-y-4">
              {mission.choiceBasedRewards.map((choiceReward, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-md bg-primary/5 border border-primary/20"
                >
                  <div className="font-semibold text-primary mb-3">{choiceReward.condition}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {choiceReward.rewards.xp !== undefined && (
                      <div className="p-3 rounded-md bg-background border border-border">
                        <p className="font-body text-xs text-muted-foreground mb-1">Experience</p>
                        <p className="font-display text-lg font-semibold text-primary">
                          {choiceReward.rewards.xp.toLocaleString()} XP
                        </p>
                      </div>
                    )}
                    {choiceReward.rewards.gold !== undefined && (
                      <div className="p-3 rounded-md bg-background border border-border">
                        <p className="font-body text-xs text-muted-foreground mb-1">Gold</p>
                        <p className="font-display text-lg font-semibold text-primary">
                          {choiceReward.rewards.gold.toLocaleString()} gp
                        </p>
                      </div>
                    )}
                    {choiceReward.rewards.items && choiceReward.rewards.items.length > 0 && (
                      <div className="p-3 rounded-md bg-background border border-border">
                        <p className="font-body text-xs text-muted-foreground mb-1">Items</p>
                        <p className="font-display text-lg font-semibold text-primary">
                          {choiceReward.rewards.items.length} item{choiceReward.rewards.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                  {choiceReward.rewards.items && choiceReward.rewards.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {choiceReward.rewards.items.map((item, itemIdx) => (
                        <span
                          key={itemIdx}
                          className="font-body text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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

