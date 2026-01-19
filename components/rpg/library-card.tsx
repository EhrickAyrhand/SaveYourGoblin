"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ContentType, GeneratedContent, Character, Environment, Mission } from "@/types/rpg"
import { highlightText } from "@/lib/highlight-text"
import { RaceBadge } from "./race-badge"
import { ClassBadge } from "./class-badge"
import { LightingIndicator } from "./lighting-indicator"
import { DifficultyMeter } from "./difficulty-meter"

export interface LibraryContentItem {
  id: string
  type: ContentType
  scenario_input: string
  content_data: GeneratedContent
  created_at: string
  is_favorite?: boolean
  tags?: string[]
  notes?: string
}

interface LibraryCardProps {
  item: LibraryContentItem
  onView: (item: LibraryContentItem) => void
  onDelete: (id: string) => void
  onDuplicate?: (item: LibraryContentItem) => void
  onToggleFavorite?: (id: string, isFavorite: boolean) => void
  onGenerateVariation?: (item: LibraryContentItem) => void
}

export function LibraryCard({ item, onView, onDelete, onDuplicate, onToggleFavorite, onGenerateVariation, searchHighlight }: LibraryCardProps) {
  const t = useTranslations()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const isFavorite = item.is_favorite || false

  const getContentName = (): string => {
    if (item.type === "character") {
      return (item.content_data as Character).name
    } else if (item.type === "environment") {
      return (item.content_data as Environment).name
    } else {
      return (item.content_data as Mission).title
    }
  }

  const getTypeIcon = (): string => {
    switch (item.type) {
      case "character":
        return "🎭"
      case "environment":
        return "🗺️"
      case "mission":
        return "⚔️"
      default:
        return "📄"
    }
  }

  const getTypeLabel = (): string => {
    switch (item.type) {
      case "character":
        return t('generator.contentType.character')
      case "environment":
        return t('generator.contentType.environment')
      case "mission":
        return t('generator.contentType.mission')
      default:
        return t('library.content')
    }
  }

  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }

  const renderCharacterDescription = () => {
    const character = item.content_data as Character
    const shortDesc = character.personality 
      ? truncateText(character.personality, 80)
      : character.history 
      ? truncateText(character.history, 80)
      : null
    
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Badges on one line */}
        <div className="flex items-center justify-center gap-1.5 flex-nowrap max-w-full overflow-hidden h-6 mb-2">
          <RaceBadge race={character.race} size="sm" />
          <ClassBadge className={character.class} level={character.level} size="sm" />
        </div>
        {/* Description below */}
        {shortDesc && (
          <p className="text-xs text-muted-foreground/80 text-center leading-relaxed line-clamp-2 max-w-full min-h-[40px]">
            {searchHighlight ? highlightText(shortDesc, searchHighlight) : shortDesc}
          </p>
        )}
      </div>
    )
  }

  const getLightingTheme = (lighting: string) => {
    const lower = lighting.toLowerCase()
    if (lower.includes('bright') || lower.includes('well-lit') || lower.includes('sunlight') || lower.includes('daylight')) {
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/50', icon: '☀️', level: 100, barColor: 'bg-yellow-500' }
    }
    if (lower.includes('dim') || lower.includes('shadow') || lower.includes('twilight') || lower.includes('dusk')) {
      return { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/50', icon: '🌅', level: 50, barColor: 'bg-orange-500' }
    }
    if (lower.includes('dark') || lower.includes('pitch') || lower.includes('black') || lower.includes('no light')) {
      return { bg: 'bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/50', icon: '🌑', level: 0, barColor: 'bg-slate-500' }
    }
    if (lower.includes('candle') || lower.includes('torch') || lower.includes('firelight')) {
      return { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/50', icon: '🕯️', level: 30, barColor: 'bg-red-500' }
    }
    if (lower.includes('magical') || lower.includes('glow') || lower.includes('enchant')) {
      return { bg: 'bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/50', icon: '✨', level: 60, barColor: 'bg-purple-500' }
    }
    return { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/50', icon: '💡', level: 70, barColor: 'bg-blue-500' }
  }

  const getDifficultyTheme = (difficulty: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      easy: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/50', icon: '🟢' },
      medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/50', icon: '🟡' },
      hard: { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/50', icon: '🟠' },
      deadly: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/50', icon: '🔴' },
    }
    return configs[difficulty] || configs.medium
  }

  const renderEnvironmentDescription = () => {
    const environment = item.content_data as Environment
    const npcCount = environment.npcs?.length || 0
    const shortDesc = environment.description 
      ? truncateText(environment.description, 80)
      : null
    const lightingTheme = environment.lighting ? getLightingTheme(environment.lighting) : null
    
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Badges on one line - compact */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full h-6 mb-2">
          {environment.lighting && lightingTheme && (
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${lightingTheme.border} ${lightingTheme.bg} ${lightingTheme.text} font-semibold whitespace-nowrap`}>
              <span className="text-xs">{lightingTheme.icon}</span>
              <div className="flex items-center">
                <div className="w-8 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${lightingTheme.barColor} rounded-full transition-all`}
                    style={{ width: `${lightingTheme.level}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="inline-flex items-center px-2 py-0.5 text-xs rounded-lg border border-border bg-muted/50 font-semibold whitespace-nowrap flex-shrink-0">
            {npcCount > 0 ? `${npcCount} NPC${npcCount > 1 ? 's' : ''}` : "No NPCs"}
          </div>
        </div>
        {/* Description below */}
        {shortDesc && (
          <p className="text-xs text-muted-foreground/80 text-center leading-relaxed line-clamp-2 max-w-full min-h-[40px]">
            {searchHighlight ? highlightText(shortDesc, searchHighlight) : shortDesc}
          </p>
        )}
      </div>
    )
  }

  const renderMissionDescription = () => {
    const mission = item.content_data as Mission
    const objectiveCount = mission.objectives?.length || 0
    const shortDesc = mission.description 
      ? truncateText(mission.description, 80)
      : null
    const difficultyTheme = mission.difficulty ? getDifficultyTheme(mission.difficulty) : null
    
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Badges on one line - compact */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full h-6 mb-2">
          {mission.difficulty && difficultyTheme && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-lg border ${difficultyTheme.border} ${difficultyTheme.bg} ${difficultyTheme.text} font-semibold whitespace-nowrap`}>
              <span className="text-xs">{difficultyTheme.icon}</span>
              <span>{difficultyTheme.icon === '🟢' ? 'Easy' : difficultyTheme.icon === '🟡' ? 'Medium' : difficultyTheme.icon === '🟠' ? 'Hard' : 'Deadly'}</span>
            </div>
          )}
          {objectiveCount > 0 && (
            <div className="inline-flex items-center px-2 py-0.5 text-xs rounded-lg border-2 border-orange-500/50 bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap flex-shrink-0">
              🎯 {objectiveCount} Objective{objectiveCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        {/* Description below */}
        {shortDesc && (
          <p className="text-xs text-muted-foreground/80 text-center leading-relaxed line-clamp-2 max-w-full min-h-[40px]">
            {searchHighlight ? highlightText(shortDesc, searchHighlight) : shortDesc}
          </p>
        )}
      </div>
    )
  }


  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    await onDelete(item.id)
    setIsDeleting(false)
    setShowConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(false)
  }

  const handleDuplicateClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDuplicate) return
    setIsDuplicating(true)
    await onDuplicate(item)
    setIsDuplicating(false)
  }

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onToggleFavorite) return
    setIsTogglingFavorite(true)
    await onToggleFavorite(item.id, !isFavorite)
    setIsTogglingFavorite(false)
  }

  const handleGenerateVariationClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onGenerateVariation) return
    setIsGeneratingVariation(true)
    await onGenerateVariation(item)
    setIsGeneratingVariation(false)
  }

  return (
    <Card
      className="parchment ornate-border border-2 border-primary/30 hover:border-primary/60 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden h-full flex flex-col bg-gradient-to-br from-card via-card to-primary/10 backdrop-blur-sm"
      onClick={() => onView(item)}
    >
      {/* Favorite indicator - top left corner */}
      {isFavorite && (
        <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full p-1.5 shadow-lg">
          <span className="text-sm">⭐</span>
        </div>
      )}

      {/* Checkbox - top right, visible on hover */}
      <input
        type="checkbox"
        className="absolute top-3 right-3 z-20 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer accent-primary"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col">
        {/* Icon */}
        <div className="flex-shrink-0 relative mb-4 text-center">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-125"></div>
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-3 border-2 border-primary/30 group-hover:border-primary/50 transition-all duration-300">
              <span className="text-4xl md:text-5xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 block">
                {getTypeIcon()}
              </span>
            </div>
          </div>
        </div>

        {/* Name */}
        <CardTitle className="font-display text-xl md:text-2xl font-bold mb-4 text-center group-hover:text-primary transition-colors duration-300 break-words">
          {searchHighlight ? highlightText(getContentName(), searchHighlight) : getContentName()}
        </CardTitle>

        {/* Spacer to push descriptions down */}
        <div className="flex-1 min-h-[40px]"></div>

        {/* Short Description - Badges on one line, description below */}
        <div className="w-full px-2 mt-auto">
          {item.type === "character" && renderCharacterDescription()}
          {item.type === "environment" && renderEnvironmentDescription()}
          {item.type === "mission" && renderMissionDescription()}
        </div>

        {/* Action Buttons - visible on hover */}
        {!showConfirm && (
          <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                disabled={isTogglingFavorite || isDeleting || isDuplicating || isGeneratingVariation}
                title={isFavorite ? t('library.unfavorite') : t('library.favorite')}
                className={`h-8 w-8 p-0 rounded-lg border border-primary/30 hover:border-primary/50 transition-all ${isFavorite ? 'opacity-100 border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-amber-500/10' : 'hover:bg-primary/10'}`}
              >
                <span className={`text-base ${isFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  {isTogglingFavorite ? "⏳" : isFavorite ? "⭐" : "☆"}
                </span>
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicateClick}
                disabled={isDuplicating || isDeleting || isTogglingFavorite || isGeneratingVariation}
                title={t('library.duplicate')}
                className="h-8 w-8 p-0 rounded-lg border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <span className="text-base text-muted-foreground hover:text-primary">
                  {isDuplicating ? "⏳" : "📋"}
                </span>
              </Button>
            )}
            {onGenerateVariation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateVariationClick}
                disabled={isGeneratingVariation || isDeleting || isDuplicating || isTogglingFavorite}
                title={t('library.generateVariation')}
                className="h-8 w-8 p-0 rounded-lg border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <span className="text-base text-muted-foreground hover:text-primary">
                  {isGeneratingVariation ? "⏳" : "🔄"}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting || isDuplicating || isTogglingFavorite || isGeneratingVariation}
              title={t('common.delete')}
              className="h-8 w-8 p-0 rounded-lg border border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10 transition-all"
            >
              <span className="text-base text-muted-foreground hover:text-destructive">
                🗑️
              </span>
            </Button>
          </div>
        )}

        {/* Delete confirmation */}
        {showConfirm && (
          <div className="mt-4 pt-4 border-t-2 border-destructive/30 bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 rounded-xl p-4 flex gap-3 shadow-lg">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-body text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              {isDeleting ? "⏳" : "✓"} {isDeleting ? t('library.deleting') : t('library.confirm')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="font-body text-sm font-bold border-primary/40 hover:bg-primary/10 hover:border-primary/60 shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              ✕ {t('library.cancel')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}


