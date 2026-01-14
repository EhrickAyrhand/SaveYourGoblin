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
}

export function LibraryCard({ item, onView, onDelete, onDuplicate, onToggleFavorite }: LibraryCardProps) {
  const t = useTranslations()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const truncateScenario = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
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

  const hasTags = item.tags && item.tags.length > 0
  const hasNotes = item.notes && item.notes.trim().length > 0

  return (
    <Card
      className="parchment ornate-border hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer group relative overflow-hidden h-full flex flex-col"
      onClick={() => onView(item)}
    >
      {/* Favorite indicator bar */}
      {isFavorite && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              <span className="text-4xl">{getTypeIcon()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="font-display text-2xl font-bold mb-1.5 truncate group-hover:text-primary transition-colors">
                {getContentName()}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <CardDescription className="font-body text-xs font-medium">
                  {getTypeLabel()}
                </CardDescription>
                <span className="text-muted-foreground">•</span>
                <CardDescription className="font-body text-xs">
                  {formatDate(item.created_at)}
                </CardDescription>
                {hasNotes && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      📝 {t('library.notes')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!showConfirm && (
            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteClick}
                  disabled={isTogglingFavorite || isDeleting || isDuplicating}
                  title={isFavorite ? t('library.unfavorite') : t('library.favorite')}
                  className={`h-8 w-8 p-0 ${isFavorite ? 'opacity-100' : ''}`}
                >
                  <span className={`text-lg transition-transform hover:scale-110 ${isFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    {isTogglingFavorite ? "⏳" : isFavorite ? "⭐" : "☆"}
                  </span>
                </Button>
              )}
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDuplicateClick}
                  disabled={isDuplicating || isDeleting || isTogglingFavorite}
                  title={t('library.duplicate')}
                  className="h-8 w-8 p-0"
                >
                  <span className="text-lg text-muted-foreground transition-transform hover:scale-110 hover:text-foreground">
                    {isDuplicating ? "⏳" : "📋"}
                  </span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting || isDuplicating || isTogglingFavorite}
                title={t('common.delete')}
                className="h-8 w-8 p-0"
              >
                <span className="text-lg text-muted-foreground transition-transform hover:scale-110 hover:text-destructive">
                  🗑️
                </span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
        {/* Tags */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags!.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
            {item.tags!.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                +{item.tags!.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Scenario preview */}
        <p className="font-body text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {truncateScenario(item.scenario_input, 120)}
        </p>

        {/* Delete confirmation */}
        {showConfirm && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-body text-sm"
            >
              {isDeleting ? t('library.deleting') : t('library.confirm')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="font-body text-sm"
            >
              {t('library.cancel')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


