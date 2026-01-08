"use client"

import { useState } from "react"
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
}

interface LibraryCardProps {
  item: LibraryContentItem
  onView: (item: LibraryContentItem) => void
  onDelete: (id: string) => void
}

export function LibraryCard({ item, onView, onDelete }: LibraryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
        return "Character"
      case "environment":
        return "Environment"
      case "mission":
        return "Mission"
      default:
        return "Content"
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

  return (
    <Card
      className="parchment ornate-border hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onView(item)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getTypeIcon()}</span>
            <div className="flex-1 min-w-0">
              <CardTitle className="font-display text-lg mb-1 truncate">
                {getContentName()}
              </CardTitle>
              <CardDescription className="font-body text-xs">
                {getTypeLabel()} • {formatDate(item.created_at)}
              </CardDescription>
            </div>
          </div>
          {!showConfirm && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              🗑️
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="font-body text-sm text-muted-foreground line-clamp-2">
          {truncateScenario(item.scenario_input)}
        </p>
        {showConfirm && (
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-body text-xs"
            >
              {isDeleting ? "Deleting..." : "Confirm"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="font-body text-xs"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


