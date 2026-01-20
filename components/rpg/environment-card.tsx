"use client"

import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Environment } from "@/types/rpg"
import { MoodBadge } from "./mood-badge"
import { LightingIndicator } from "./lighting-indicator"

interface EnvironmentCardProps {
  environment: Environment
  isLoading?: boolean
  onRegenerateSection?: (sectionId: string, index?: number) => void
  regeneratingSection?: string | null
  regenerateLabel?: (sectionId: string, index?: number) => string
}

export function EnvironmentCard({ environment, isLoading = false, onRegenerateSection, regeneratingSection, regenerateLabel }: EnvironmentCardProps) {
  const t = useTranslations()
  
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

  // Get mood theme for header gradient
  const getMoodTheme = (moodText: string): string => {
    const lower = moodText.toLowerCase()
    if (lower.includes('tense') || lower.includes('dangerous') || lower.includes('hostile')) {
      return 'from-red-500/10 to-orange-500/5 border-red-500/30'
    }
    if (lower.includes('peaceful') || lower.includes('calm') || lower.includes('serene')) {
      return 'from-green-500/10 to-blue-500/5 border-green-500/30'
    }
    if (lower.includes('mysterious') || lower.includes('eerie') || lower.includes('ominous')) {
      return 'from-purple-500/10 to-indigo-500/5 border-purple-500/30'
    }
    return 'from-slate-500/10 to-blue-500/5 border-primary/30'
  }

  const headerTheme = getMoodTheme(environment.mood)

  return (
    <Card className="parchment ornate-border border-2 border-primary/20">
      <CardHeader className={`px-6 pt-6 pb-4 border-b-2 bg-gradient-to-r ${headerTheme}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <CardTitle className="font-display text-4xl mb-3 flex items-center gap-3">
              <span className="text-3xl">🗺️</span>
              {environment.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <MoodBadge mood={environment.mood} size="md" />
              <LightingIndicator lighting={environment.lighting} size="md" />
            </div>
          </div>
          {/* Location Icon Placeholder */}
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl flex-shrink-0">
            🏛️
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Description */}
        <div className="border-2 border-teal-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center text-xl flex-shrink-0">
                📖
              </div>
              <div className="text-left">
                <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                  {t('rpg.environment.description')}
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {t('rpg.environment.locationDetails')}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-teal-500/20">
              <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {environment.description}
              </p>
            </div>
          </div>
        </div>

        {/* Ambient Sounds */}
        <div className="border-2 border-blue-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center text-xl flex-shrink-0">
                🎵
              </div>
              <div className="text-left">
                <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                  {t('rpg.environment.ambientAtmosphere')}
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {t('rpg.environment.soundsAndAtmosphere')}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-blue-500/20">
              <p className="font-body text-sm text-foreground italic leading-relaxed">
                {environment.ambient}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        {environment.features && environment.features.length > 0 && (
          <div className="border-2 border-amber-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    ✨
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.environment.notableFeatures')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.environment.featureCount', { count: environment.features.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onRegenerateSection && (
                    <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('features')} disabled={!!regeneratingSection} className="shrink-0 no-print" title={regenerateLabel?.('features')}>
                      {regeneratingSection === 'features' ? '⏳' : '↻'}
                    </Button>
                  )}
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded text-xs font-bold">
                    {environment.features.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {environment.features.map((feature, idx) => {
                  // Determine feature icon based on content
                  const getFeatureIcon = (text: string): string => {
                    const lower = text.toLowerCase()
                    if (lower.includes('trap') || lower.includes('danger') || lower.includes('hazard')) return '⚠️'
                    if (lower.includes('door') || lower.includes('entrance') || lower.includes('exit')) return '🚪'
                    if (lower.includes('chest') || lower.includes('treasure') || lower.includes('loot')) return '💎'
                    if (lower.includes('book') || lower.includes('scroll') || lower.includes('document')) return '📜'
                    if (lower.includes('altar') || lower.includes('shrine') || lower.includes('temple')) return '⛩️'
                    if (lower.includes('fire') || lower.includes('torch') || lower.includes('candle')) return '🔥'
                    return '📍'
                  }
                  
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-amber-500/20 hover:border-amber-500/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg flex-shrink-0">
                          {getFeatureIcon(feature)}
                        </div>
                        <p className="text-sm font-body text-foreground leading-relaxed flex-1">{feature}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Current Conflict */}
        {environment.currentConflict && (
          <div className="border-2 border-red-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    ⚔️
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.environment.currentConflict')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.environment.activeIssues')}
                    </p>
                  </div>
                </div>
                {onRegenerateSection && (
                  <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('currentConflict')} disabled={!!regeneratingSection} className="shrink-0 no-print" title={regenerateLabel?.('currentConflict')}>
                    {regeneratingSection === 'currentConflict' ? '⏳' : '↻'}
                  </Button>
                )}
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-red-500/40 ring-2 ring-red-500/20">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <p className="font-body text-sm text-foreground leading-relaxed flex-1">
                    {environment.currentConflict}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NPCs */}
        {environment.npcs && environment.npcs.length > 0 && (
          <div className="border-2 border-violet-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 border-2 border-violet-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    👥
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.environment.presentNPCs')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.environment.npcCount', { count: environment.npcs.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onRegenerateSection && (
                    <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('npcs')} disabled={!!regeneratingSection} className="shrink-0 no-print" title={regenerateLabel?.('npcs')}>
                      {regeneratingSection === 'npcs' ? '⏳' : '↻'}
                    </Button>
                  )}
                  <span className="px-2 py-1 bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 rounded text-xs font-bold">
                    {environment.npcs.length}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {environment.npcs.map((npc, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-violet-500/20 hover:border-violet-500/40 text-primary font-semibold text-sm transition-all hover:shadow-md flex items-center gap-2"
                  >
                    <span className="text-base">👤</span>
                    <span className="flex-1 min-w-0">{npc}</span>
                    {onRegenerateSection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerateSection('npcs', idx)}
                        disabled={!!regeneratingSection}
                        className="shrink-0 no-print h-7 w-7 p-0"
                        title={regenerateLabel?.('npcs', idx)}
                      >
                        {regeneratingSection === `npcs@${idx}` ? '⏳' : '↻'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Adventure Hooks */}
        {environment.adventureHooks && environment.adventureHooks.length > 0 && (
          <div className="border-2 border-emerald-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🎣
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.environment.adventureHooks')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.environment.hookCount', { count: environment.adventureHooks.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onRegenerateSection && (
                    <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('adventureHooks')} disabled={!!regeneratingSection} className="shrink-0 no-print" title={regenerateLabel?.('adventureHooks')}>
                      {regeneratingSection === 'adventureHooks' ? '⏳' : '↻'}
                    </Button>
                  )}
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold">
                    {environment.adventureHooks.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {environment.adventureHooks.map((hook, idx) => {
                  // Determine hook type icon
                  const getHookIcon = (text: string): string => {
                    const lower = text.toLowerCase()
                    if (lower.includes('fight') || lower.includes('combat') || lower.includes('battle')) return '⚔️'
                    if (lower.includes('explore') || lower.includes('investigate') || lower.includes('search')) return '🔍'
                    if (lower.includes('talk') || lower.includes('negotiate') || lower.includes('persuade')) return '💬'
                    return '⚡'
                  }
                  
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg flex-shrink-0">
                          {getHookIcon(hook)}
                        </div>
                        <p className="text-sm font-body text-foreground leading-relaxed flex-1">{hook}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

