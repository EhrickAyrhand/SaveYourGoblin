"use client"

import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { LibraryContentItem } from "./library-card"
import type { Character, Environment, Mission } from "@/types/rpg"
import { supabase } from "@/lib/supabase"

interface ContentDetailModalProps {
  item: LibraryContentItem
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate?: (updatedItem: LibraryContentItem) => void
}

export function ContentDetailModal({
  item,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
}: ContentDetailModalProps) {
  const t = useTranslations()
  const [notes, setNotes] = useState(item.notes || "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [tagsError, setTagsError] = useState<string | null>(null)
  const [newTagInput, setNewTagInput] = useState("")

  // Update notes and tags when item ID changes (user opens a different item)
  // This prevents overwriting local changes while saving
  useEffect(() => {
    setNotes(item.notes || "")
    setTags(item.tags || [])
  }, [item.id])

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

  async function handleSaveNotes() {
    try {
      setIsSavingNotes(true)
      setNotesError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/content/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          notes: notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        // If migration is required, show helpful message
        if (errorData.migrationRequired) {
          throw new Error(errorData.message || "Database migration required. Please run the migration to use notes.")
        }
        throw new Error(errorData.error || errorData.message || "Failed to save notes")
      }

      const result = await response.json()
      if (onUpdate && result.data) {
        onUpdate({ ...item, notes: notes })
      }
    } catch (err) {
      console.error("Save notes error:", err)
      setNotesError(err instanceof Error ? err.message : "Failed to save notes")
    } finally {
      setIsSavingNotes(false)
    }
  }

  async function handleSaveTags() {
    try {
      setIsSavingTags(true)
      setTagsError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/content/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tags: tags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        if (errorData.migrationRequired) {
          throw new Error(errorData.message || "Database migration required. Please run the migration to use tags.")
        }
        throw new Error(errorData.error || errorData.message || "Failed to save tags")
      }

      const result = await response.json()
      if (onUpdate && result.data) {
        onUpdate({ ...item, tags: tags, notes: item.notes })
      }
    } catch (err) {
      console.error("Save tags error:", err)
      setTagsError(err instanceof Error ? err.message : "Failed to save tags")
    } finally {
      setIsSavingTags(false)
    }
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault()
      const tag = newTagInput.trim().toLowerCase()
      if (!tags.includes(tag)) {
        const newTags = [...tags, tag]
        setTags(newTags)
        setNewTagInput("")
        // Auto-save tags
        setTimeout(() => handleSaveTags(), 100)
      } else {
        setNewTagInput("")
      }
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setTags(newTags)
    // Auto-save tags
    setTimeout(() => handleSaveTags(), 100)
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => alert('This feature is not done yet')} 
              className="font-body no-print"
              title={t('library.exportPDF')}
            >
              📄 {t('library.exportPDF')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => alert('This feature is not done yet')} 
              className="font-body no-print"
              title={t('library.exportJSON')}
            >
              📋 {t('library.exportJSON')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.print()} 
              className="font-body print-visible"
            >
              🖨️ {t('library.print')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="font-body no-print">
              🗑️ {t('common.delete')}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="font-body no-print">
              ✕ {t('common.close')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Scenario */}
          <Card className="parchment">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('library.originalScenario')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-sm text-muted-foreground whitespace-pre-wrap">
                {item.scenario_input}
              </p>
            </CardContent>
          </Card>

          {/* Tags Section */}
          <Card className="parchment">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('library.tags')}</CardTitle>
              <CardDescription className="font-body text-sm">
                {t('library.tagsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tags" className="font-body text-sm mb-2 block">
                  {t('library.addTag')}
                </Label>
                <input
                  id="tags"
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={t('library.tagPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-body"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive transition-colors"
                          title={t('library.removeTag')}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-body mt-2">{t('library.noTags')}</p>
                )}
              </div>
              {tagsError && (
                <Alert variant="destructive">
                  <AlertDescription className="font-body text-sm">{tagsError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="parchment">
            <CardHeader>
              <CardTitle className="font-display text-lg">{t('library.notes')}</CardTitle>
              <CardDescription className="font-body text-sm">
                {t('library.notesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes" className="font-body text-sm mb-2 block">
                  {t('library.addNote')}
                </Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('library.notesPlaceholder')}
                  className="w-full min-h-[120px] px-3 py-2 rounded-lg border-2 border-border bg-background text-foreground font-body text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={5}
                />
              </div>
              {notesError && (
                <Alert variant="destructive">
                  <AlertDescription className="font-body text-sm">{notesError}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotes(item.notes || "")}
                  disabled={isSavingNotes}
                  className="font-body"
                >
                  {t('library.cancel')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (item.notes || "")}
                  className="font-body"
                >
                  {isSavingNotes ? t('library.saving') : t('common.save')}
                </Button>
              </div>
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
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  )
}


