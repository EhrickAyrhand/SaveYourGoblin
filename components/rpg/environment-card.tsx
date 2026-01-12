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
      <CardHeader className="px-6 pt-6">
        <CardTitle className="font-display text-4xl mb-3">{environment.name}</CardTitle>
        <CardDescription className="font-body text-base">
          {environment.mood} • {environment.lighting}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-display text-2xl font-semibold mb-3">Description</h3>
          <p className="font-body text-base text-muted-foreground leading-relaxed">
            {environment.description}
          </p>
        </div>

        {/* Ambient Sounds */}
        <div>
          <h3 className="font-display text-2xl font-semibold mb-3">Ambient Atmosphere</h3>
          <p className="font-body text-base text-muted-foreground italic leading-relaxed">
            {environment.ambient}
          </p>
        </div>

        {/* Features */}
        {environment.features && environment.features.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Notable Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {environment.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="font-body text-base p-4 rounded-md bg-muted/50 border border-border"
                >
                  <span className="text-primary font-semibold text-lg">•</span> {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Conflict */}
        {environment.currentConflict && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-3">Current Conflict</h3>
            <p className="font-body text-base text-muted-foreground leading-relaxed p-4 rounded-md bg-destructive/10 border border-destructive/20">
              {environment.currentConflict}
            </p>
          </div>
        )}

        {/* NPCs */}
        {environment.npcs && environment.npcs.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Present NPCs</h3>
            <div className="flex flex-wrap gap-3">
              {environment.npcs.map((npc, idx) => (
                <div
                  key={idx}
                  className="font-body text-base px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
                >
                  {npc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adventure Hooks */}
        {environment.adventureHooks && environment.adventureHooks.length > 0 && (
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4">Adventure Hooks</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {environment.adventureHooks.map((hook, idx) => (
                <div
                  key={idx}
                  className="font-body text-base p-4 rounded-md bg-primary/10 border border-primary/30"
                >
                  <span className="text-primary font-semibold text-lg">⚡</span> {hook}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood & Lighting Summary */}
        <div className="pt-6 border-t border-border grid grid-cols-2 gap-6">
          <div>
            <p className="font-body text-sm text-muted-foreground mb-2">Mood</p>
            <p className="font-display text-lg font-semibold">{environment.mood}</p>
          </div>
          <div>
            <p className="font-body text-sm text-muted-foreground mb-2">Lighting</p>
            <p className="font-display text-lg font-semibold">{environment.lighting}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

