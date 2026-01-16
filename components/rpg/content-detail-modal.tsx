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
import type { Character, Environment, Mission, ContentType } from "@/types/rpg"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { useLocale } from 'next-intl'

interface ContentDetailModalProps {
  item: LibraryContentItem
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate?: (updatedItem: LibraryContentItem) => void
  onGenerateVariation?: (item: LibraryContentItem) => void
}

export function ContentDetailModal({
  item,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  onGenerateVariation,
}: ContentDetailModalProps) {
  const t = useTranslations()
  const [notes, setNotes] = useState(item.notes || "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [tagsError, setTagsError] = useState<string | null>(null)
  const [newTagInput, setNewTagInput] = useState("")
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false)
  const [linkedContent, setLinkedContent] = useState<{
    outgoing: Array<{ id: string; contentId: string; linkType: string; content: any }>
    incoming: Array<{ id: string; contentId: string; linkType: string; content: any }>
  }>({ outgoing: [], incoming: [] })
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkedItemPopup, setLinkedItemPopup] = useState<LibraryContentItem | null>(null)

  // Update notes and tags when item ID changes (user opens a different item)
  // This prevents overwriting local changes while saving
  useEffect(() => {
    setNotes(item.notes || "")
    setTags(item.tags || [])
  }, [item.id])

  // Load linked content when item changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content-detail-modal.tsx:58',message:'useEffect triggered for linked content',data:{isOpen,itemId:item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (isOpen && item.id) {
      // Clear linked content immediately when item changes to prevent stale data during render
      setLinkedContent({ outgoing: [], incoming: [] })
      loadLinkedContent(item.id)
    }
  }, [isOpen, item.id])

  async function loadLinkedContent(contentId: string) {
    setIsLoadingLinks(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content-detail-modal.tsx:67',message:'loadLinkedContent called',data:{contentId,currentItemId:item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const response = await fetch(`/api/content/${contentId}/links`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'content-detail-modal.tsx:81',message:'Linked content loaded',data:{requestedContentId:contentId,currentItemId:item.id,outgoingCount:result.data?.outgoing?.length || 0,incomingCount:result.data?.incoming?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setLinkedContent(result.data || { outgoing: [], incoming: [] })
      }
    } catch (err) {
      console.error("Failed to load linked content:", err)
    } finally {
      setIsLoadingLinks(false)
    }
  }

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

  async function handleGenerateVariation() {
    if (!onGenerateVariation) return
    setIsGeneratingVariation(true)
    try {
      await onGenerateVariation(item)
      // Don't close modal - let the parent handle opening the new variation
    } catch (err) {
      console.error("Variation generation error:", err)
    } finally {
      setIsGeneratingVariation(false)
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
            {onGenerateVariation && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateVariation}
                disabled={isGeneratingVariation}
                className="font-body no-print"
                title={t('library.generateVariation')}
              >
                {isGeneratingVariation ? "⏳" : "🔄"} {t('library.generateVariation')}
              </Button>
            )}
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

          {/* Linked Content Section */}
          <Card className="parchment">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg">{t('library.linkedContent')}</CardTitle>
                  <CardDescription className="font-body text-sm">
                    {t('library.linkedContentDescription')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLinkModal(true)}
                  className="font-body"
                >
                  ➕ {t('library.addLink')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLinks ? (
                <p className="text-sm text-muted-foreground font-body">{t('library.loading')}</p>
              ) : (
                <div className="space-y-4">
                  {/* Outgoing Links */}
                  {linkedContent.outgoing.length > 0 && (
                    <div>
                      <h4 className="font-body text-sm font-semibold mb-2">{t('library.linksTo')}</h4>
                      <div className="space-y-2">
                        {linkedContent.outgoing.map((link) => {
                          const linkedItem = link.content
                          if (!linkedItem) return null
                          
                          const getLinkedName = () => {
                            if (linkedItem.type === "character") {
                              return (linkedItem.content_data as Character).name
                            } else if (linkedItem.type === "environment") {
                              return (linkedItem.content_data as Environment).name
                            } else {
                              return (linkedItem.content_data as Mission).title
                            }
                          }

                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-lg">
                                  {linkedItem.type === "character" ? "🎭" : linkedItem.type === "environment" ? "🗺️" : "⚔️"}
                                </span>
                                <div className="flex-1">
                                  <div className="font-body font-semibold">{getLinkedName()}</div>
                                  <div className="text-xs text-muted-foreground font-body">
                                    {linkedItem.type} • {t(`library.linkType.${link.linkType}`)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const linkedContentItem: LibraryContentItem = {
                                      id: linkedItem.id,
                                      type: linkedItem.type,
                                      scenario_input: linkedItem.scenario_input,
                                      content_data: linkedItem.content_data,
                                      created_at: linkedItem.created_at,
                                      is_favorite: linkedItem.is_favorite,
                                      tags: linkedItem.tags,
                                      notes: linkedItem.notes,
                                    }
                                    setLinkedItemPopup(linkedContentItem)
                                  }}
                                  className="font-body text-xs"
                                >
                                  👁️ {t('library.openView')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession()
                                      const accessToken = session?.access_token
                                      if (!accessToken) return

                                      const response = await fetch(`/api/content/${item.id}/links?linkId=${link.id}`, {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${accessToken}`,
                                        },
                                      })

                                      if (response.ok) {
                                        await loadLinkedContent(item.id)
                                      }
                                    } catch (err) {
                                      console.error("Failed to delete link:", err)
                                    }
                                  }}
                                  className="font-body text-xs text-destructive hover:text-destructive"
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Incoming Links */}
                  {linkedContent.incoming.length > 0 && (
                    <div>
                      <h4 className="font-body text-sm font-semibold mb-2">{t('library.linkedFrom')}</h4>
                      <div className="space-y-2">
                        {linkedContent.incoming.map((link) => {
                          const linkedItem = link.content
                          if (!linkedItem) return null
                          
                          const getLinkedName = () => {
                            if (linkedItem.type === "character") {
                              return (linkedItem.content_data as Character).name
                            } else if (linkedItem.type === "environment") {
                              return (linkedItem.content_data as Environment).name
                            } else {
                              return (linkedItem.content_data as Mission).title
                            }
                          }

                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-lg">
                                  {linkedItem.type === "character" ? "🎭" : linkedItem.type === "environment" ? "🗺️" : "⚔️"}
                                </span>
                                <div className="flex-1">
                                  <div className="font-body font-semibold">{getLinkedName()}</div>
                                  <div className="text-xs text-muted-foreground font-body">
                                    {linkedItem.type} • {t(`library.linkType.${link.linkType}`)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const linkedContentItem: LibraryContentItem = {
                                      id: linkedItem.id,
                                      type: linkedItem.type,
                                      scenario_input: linkedItem.scenario_input,
                                      content_data: linkedItem.content_data,
                                      created_at: linkedItem.created_at,
                                      is_favorite: linkedItem.is_favorite,
                                      tags: linkedItem.tags,
                                      notes: linkedItem.notes,
                                    }
                                    setLinkedItemPopup(linkedContentItem)
                                  }}
                                  className="font-body text-xs"
                                >
                                  👁️ {t('library.openView')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession()
                                      const accessToken = session?.access_token
                                      if (!accessToken) return

                                      const response = await fetch(`/api/content/${item.id}/links?linkId=${link.id}`, {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${accessToken}`,
                                        },
                                      })

                                      if (response.ok) {
                                        await loadLinkedContent(item.id)
                                      }
                                    } catch (err) {
                                      console.error("Failed to delete link:", err)
                                    }
                                  }}
                                  className="font-body text-xs text-destructive hover:text-destructive"
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {linkedContent.outgoing.length === 0 && linkedContent.incoming.length === 0 && (
                    <p className="text-sm text-muted-foreground font-body text-center py-4">
                      {t('library.noLinkedContent')}
                    </p>
                  )}
                </div>
              )}
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

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal
          currentItem={item}
          onClose={() => setShowLinkModal(false)}
          onLinkCreated={async () => {
            await loadLinkedContent(item.id)
            setShowLinkModal(false)
          }}
        />
      )}

      {/* Linked Item Popup */}
      {linkedItemPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLinkedItemPopup(null)
            }
          }}
        >
          <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
            {/* Header with close button */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {linkedItemPopup.type === "character" 
                    ? (linkedItemPopup.content_data as Character).name
                    : linkedItemPopup.type === "environment"
                    ? (linkedItemPopup.content_data as Environment).name
                    : (linkedItemPopup.content_data as Mission).title}
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {linkedItemPopup.type} • Created {new Date(linkedItemPopup.created_at).toLocaleDateString("en-US")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLinkedItemPopup(null)}
                className="font-body text-lg"
              >
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="w-full">
                {linkedItemPopup.type === "character" && (
                  <CharacterCard character={linkedItemPopup.content_data as Character} />
                )}
                {linkedItemPopup.type === "environment" && (
                  <EnvironmentCard environment={linkedItemPopup.content_data as Environment} />
                )}
                {linkedItemPopup.type === "mission" && (
                  <MissionCard mission={linkedItemPopup.content_data as Mission} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Link Modal Component
interface LinkModalProps {
  currentItem: LibraryContentItem
  onClose: () => void
  onLinkCreated: () => void
}

function LinkModal({ currentItem, onClose, onLinkCreated }: LinkModalProps) {
  const t = useTranslations()
  const [availableContent, setAvailableContent] = useState<LibraryContentItem[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [selectedContentId, setSelectedContentId] = useState<string>("")
  const [linkType, setLinkType] = useState<'related' | 'part_of' | 'uses' | 'located_in' | 'involves'>('related')
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAvailableContent()
  }, [])

  async function loadAvailableContent() {
    setIsLoadingContent(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      const response = await fetch("/api/content?limit=1000", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        // Filter out the current item
        const filtered = (result.data || []).filter((item: LibraryContentItem) => item.id !== currentItem.id)
        setAvailableContent(filtered)
      }
    } catch (err) {
      console.error("Failed to load content:", err)
    } finally {
      setIsLoadingContent(false)
    }
  }

  async function handleCreateLink() {
    if (!selectedContentId) {
      setError(t('library.selectContentToLink'))
      return
    }

    setIsCreatingLink(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/content/${currentItem.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          targetContentId: selectedContentId,
          linkType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create link")
      }

      onLinkCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link")
    } finally {
      setIsCreatingLink(false)
    }
  }

  const getContentName = (item: LibraryContentItem): string => {
    if (item.type === "character") {
      return (item.content_data as Character).name
    } else if (item.type === "environment") {
      return (item.content_data as Environment).name
    } else {
      return (item.content_data as Mission).title
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-2xl parchment ornate-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-xl">{t('library.addLink')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="font-body">
              ✕
            </Button>
          </div>
          <CardDescription className="font-body text-sm">
            {t('library.addLinkDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="font-body text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Link Type Selection */}
          <div>
            <Label className="font-body text-sm mb-2 block">{t('library.linkType.label')}</Label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="related">{t('library.linkType.related')}</option>
              <option value="part_of">{t('library.linkType.part_of')}</option>
              <option value="uses">{t('library.linkType.uses')}</option>
              <option value="located_in">{t('library.linkType.located_in')}</option>
              <option value="involves">{t('library.linkType.involves')}</option>
            </select>
          </div>

          {/* Content Selection */}
          <div>
            <Label className="font-body text-sm mb-2 block">{t('library.selectContent')}</Label>
            {isLoadingContent ? (
              <p className="text-sm text-muted-foreground font-body">{t('library.loading')}</p>
            ) : availableContent.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">{t('library.noContentToLink')}</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                {availableContent.map((contentItem) => (
                  <button
                    key={contentItem.id}
                    type="button"
                    onClick={() => setSelectedContentId(contentItem.id)}
                    className={`w-full text-left p-3 border-b border-border last:border-b-0 hover:bg-primary/10 transition-colors ${
                      selectedContentId === contentItem.id ? 'bg-primary/20 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {contentItem.type === "character" ? "🎭" : contentItem.type === "environment" ? "🗺️" : "⚔️"}
                      </span>
                      <div className="flex-1">
                        <div className="font-body font-semibold">{getContentName(contentItem)}</div>
                        <div className="text-xs text-muted-foreground font-body">{contentItem.type}</div>
                      </div>
                      {selectedContentId === contentItem.id && (
                        <span className="text-primary">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="font-body">
              {t('library.cancel')}
            </Button>
            <Button
              variant="default"
              onClick={handleCreateLink}
              disabled={!selectedContentId || isCreatingLink}
              className="font-body"
            >
              {isCreatingLink ? t('library.creating') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


