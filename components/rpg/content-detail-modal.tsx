"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { LibraryContentItem } from "./library-card"
import type { Character, Environment, Mission } from "@/types/rpg"

interface ContentDetailModalProps {
  item: LibraryContentItem
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
}

export function ContentDetailModal({
  item,
  isOpen,
  onClose,
  onDelete,
}: ContentDetailModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  async function handleDelete() {
    if (confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      await onDelete(item.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Content Details</h2>
            <p className="font-body text-sm text-muted-foreground">
              Created {formatDate(item.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete} className="font-body">
              🗑️ Delete
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="font-body">
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Scenario */}
          <Card className="parchment">
            <CardHeader>
              <CardTitle className="font-display text-lg">Original Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-sm text-muted-foreground whitespace-pre-wrap">
                {item.scenario_input}
              </p>
            </CardContent>
          </Card>

          {/* Generated Content */}
          <div>
            {item.type === "character" && (
              <CharacterCard character={item.content_data as Character} />
            )}
            {item.type === "environment" && (
              <EnvironmentCard environment={item.content_data as Environment} />
            )}
            {item.type === "mission" && (
              <MissionCard mission={item.content_data as Mission} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="font-body">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}


