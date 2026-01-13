"use client"

import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Mission } from "@/types/rpg"
import { DifficultyMeter } from "./difficulty-meter"
import { ObjectiveCard } from "./objective-card"
import { RewardCard } from "./reward-card"

interface MissionCardProps {
  mission: Mission
  isLoading?: boolean
}

export function MissionCard({ mission, isLoading = false }: MissionCardProps) {
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

  // Get difficulty theme for header
  const getDifficultyTheme = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'from-green-500/10 to-emerald-500/5 border-green-500/30'
      case 'medium': return 'from-yellow-500/10 to-orange-500/5 border-yellow-500/30'
      case 'hard': return 'from-orange-500/10 to-red-500/5 border-orange-500/30'
      case 'deadly': return 'from-red-500/10 to-red-600/5 border-red-500/30'
      default: return 'from-primary/10 to-primary/5 border-primary/30'
    }
  }

  const headerTheme = getDifficultyTheme(mission.difficulty)

  return (
    <Card className="parchment ornate-border border-2 border-primary/20">
      <CardHeader className={`px-6 pt-6 pb-4 border-b-2 bg-gradient-to-r ${headerTheme}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <CardTitle className="font-display text-4xl mb-3 flex items-center gap-3">
              <span className="text-3xl">⚔️</span>
              {mission.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <DifficultyMeter difficulty={mission.difficulty} size="md" />
              {mission.recommendedLevel && (
                <div className="px-3 py-1.5 rounded-lg border-2 border-primary/50 bg-primary/20 text-primary font-semibold text-sm">
                  📊 {mission.recommendedLevel}
                </div>
              )}
            </div>
          </div>
          {/* Mission Icon Placeholder */}
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl flex-shrink-0">
            🎯
          </div>
        </div>
        <CardDescription className="font-body text-base leading-relaxed p-3 rounded-lg bg-background/50 border border-border/50">
          {mission.context}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Description */}
        <div className="border-2 border-slate-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/20 border-2 border-slate-500/30 flex items-center justify-center text-xl flex-shrink-0">
                📋
              </div>
              <div className="text-left">
                <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                  {t('rpg.mission.missionBrief')}
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {t('rpg.mission.missionDetails')}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-slate-500/20">
              <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {mission.description}
              </p>
            </div>
          </div>
        </div>

        {/* Objectives */}
        {mission.objectives && mission.objectives.length > 0 && (
          <div className="border-2 border-orange-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 border-2 border-orange-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🎯
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.objectives')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.mission.objectiveCount', { count: mission.objectives.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded text-xs font-bold">
                  {mission.objectives.length}
                </span>
              </div>
              {mission.objectives.some(obj => obj.isAlternative) && (
                <div className="mb-4 p-3 rounded-lg bg-orange-500/20 border-2 border-orange-500/40">
                  <p className="font-body text-xs text-foreground flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    {t('rpg.mission.alternativePaths')}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {mission.objectives.map((objective, idx) => (
                  <ObjectiveCard key={idx} objective={objective} index={idx} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Powerful Items */}
        {mission.powerfulItems && mission.powerfulItems.length > 0 && (
          <div className="border-2 border-yellow-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    💎
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.powerfulItems')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.mission.itemCount', { count: mission.powerfulItems.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded text-xs font-bold">
                  {mission.powerfulItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {mission.powerfulItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-yellow-500/40 ring-2 ring-yellow-500/20 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center text-xl flex-shrink-0">
                        ⚡
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2 text-base">{item.name}</div>
                        <div className="text-sm text-muted-foreground font-body">{item.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Possible Outcomes */}
        {mission.possibleOutcomes && mission.possibleOutcomes.length > 0 && (
          <div className="border-2 border-teal-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🌳
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.possibleOutcomes')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.mission.outcomeCount', { count: mission.possibleOutcomes.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 rounded text-xs font-bold">
                  {mission.possibleOutcomes.length}
                </span>
              </div>
              <div className="space-y-3">
                {mission.possibleOutcomes.map((outcome, idx) => {
                  // Determine outcome type for color coding
                  const getOutcomeTheme = (text: string): { bg: string; border: string; icon: string } => {
                    const lower = text.toLowerCase()
                    if (lower.includes('success') || lower.includes('positive') || lower.includes('good')) {
                      return { bg: 'from-green-500/10 to-green-500/5', border: 'border-green-500/30', icon: '✅' }
                    }
                    if (lower.includes('fail') || lower.includes('negative') || lower.includes('bad') || lower.includes('consequence')) {
                      return { bg: 'from-red-500/10 to-red-500/5', border: 'border-red-500/30', icon: '❌' }
                    }
                    return { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/30', icon: '➡️' }
                  }
                  
                  const theme = getOutcomeTheme(outcome)
                  
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg bg-gradient-to-r ${theme.bg} border-2 ${theme.border} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-background/50 border border-current/30 flex items-center justify-center text-lg flex-shrink-0">
                          {theme.icon}
                        </div>
                        <p className="text-sm font-body text-foreground leading-relaxed flex-1">{outcome}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Base Rewards */}
        {mission.rewards && (
        <div className="border-2 border-green-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center text-xl flex-shrink-0">
                💰
              </div>
              <div className="text-left">
                <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                  {t('rpg.mission.baseRewards')}
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {t('rpg.mission.missionCompletionRewards')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {mission.rewards.xp !== undefined && (
                <RewardCard type="xp" value={mission.rewards.xp} />
              )}
              {mission.rewards.gold !== undefined && (
                <RewardCard type="gold" value={mission.rewards.gold} />
              )}
              {mission.rewards.items && mission.rewards.items.length > 0 && (
                <RewardCard type="items" value={mission.rewards.items.length} />
              )}
            </div>
            {mission.rewards.items && mission.rewards.items.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-green-500/20">
                <p className="font-body text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">{t('rpg.mission.itemList')}</p>
                <div className="flex flex-wrap gap-2">
                  {mission.rewards.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-2 border-primary/40 font-semibold text-xs hover:border-primary/60 transition-all"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Choice-Based Rewards */}
        {mission.choiceBasedRewards && mission.choiceBasedRewards.length > 0 && (
          <div className="border-2 border-rose-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🎁
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.choiceBasedRewards')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.mission.pathCount', { count: mission.choiceBasedRewards.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded text-xs font-bold">
                  {mission.choiceBasedRewards.length}
                </span>
              </div>
              <div className="space-y-4">
                {mission.choiceBasedRewards.map((choiceReward, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-rose-500/20 hover:border-rose-500/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-lg flex-shrink-0">
                        🔀
                      </div>
                      <div className="font-semibold text-rose-600 dark:text-rose-400 text-sm">{choiceReward.condition}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {choiceReward.rewards.xp !== undefined && (
                        <RewardCard type="xp" value={choiceReward.rewards.xp} />
                      )}
                      {choiceReward.rewards.gold !== undefined && (
                        <RewardCard type="gold" value={choiceReward.rewards.gold} />
                      )}
                      {choiceReward.rewards.items && choiceReward.rewards.items.length > 0 && (
                        <RewardCard type="items" value={choiceReward.rewards.items.length} />
                      )}
                    </div>
                    {choiceReward.rewards.items && choiceReward.rewards.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {choiceReward.rewards.items.map((item, itemIdx) => (
                          <span
                            key={itemIdx}
                            className="px-2 py-1 rounded-lg bg-primary/20 text-primary border border-primary/40 font-semibold text-xs"
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
          </div>
        )}

        {/* Related NPCs */}
        {mission.relatedNPCs && mission.relatedNPCs.length > 0 && (
          <div className="border-2 border-violet-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 border-2 border-violet-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    👥
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.relatedNPCs')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.environment.npcCount', { count: mission.relatedNPCs.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 rounded text-xs font-bold">
                  {mission.relatedNPCs.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {mission.relatedNPCs.map((npc, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-violet-500/20 hover:border-violet-500/40 font-medium text-sm transition-all hover:shadow-md flex items-center gap-2"
                  >
                    <span className="text-base">👤</span>
                    <span>{npc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Related Locations */}
        {mission.relatedLocations && mission.relatedLocations.length > 0 && (
          <div className="border-2 border-sky-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/20 border-2 border-sky-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🗺️
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      {t('rpg.mission.relatedLocations')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {t('rpg.mission.locationCount', { count: mission.relatedLocations.length })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded text-xs font-bold">
                  {mission.relatedLocations.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {mission.relatedLocations.map((location, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-sky-500/20 hover:border-sky-500/40 font-medium text-sm transition-all hover:shadow-md flex items-center gap-2"
                  >
                    <span className="text-base">📍</span>
                    <span>{location}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

