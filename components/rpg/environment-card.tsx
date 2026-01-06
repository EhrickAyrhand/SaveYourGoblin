"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Environment } from "@/types/rpg"

interface EnvironmentCardProps {
  environment: Environment
  isLoading?: boolean
}

export function EnvironmentCard({ environment, isLoading = false }: EnvironmentCardProps) {
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
        <CardTitle className="font-display text-3xl mb-2">{environment.name}</CardTitle>
        <CardDescription className="font-body text-base">
          {environment.mood} • {environment.lighting}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-display text-lg font-semibold mb-2">Description</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {environment.description}
          </p>
        </div>

        {/* Ambient Sounds */}
        <div>
          <h3 className="font-display text-lg font-semibold mb-2">Ambient Atmosphere</h3>
          <p className="font-body text-sm text-muted-foreground italic leading-relaxed">
            {environment.ambient}
          </p>
        </div>

        {/* Features */}
        {environment.features && environment.features.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Notable Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {environment.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="font-body text-sm p-3 rounded-md bg-muted/50 border border-border"
                >
                  <span className="text-primary font-semibold">•</span> {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NPCs */}
        {environment.npcs && environment.npcs.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Present NPCs</h3>
            <div className="flex flex-wrap gap-2">
              {environment.npcs.map((npc, idx) => (
                <div
                  key={idx}
                  className="font-body text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {npc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood & Lighting Summary */}
        <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Mood</p>
            <p className="font-display text-sm font-semibold">{environment.mood}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground mb-1">Lighting</p>
            <p className="font-display text-sm font-semibold">{environment.lighting}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

