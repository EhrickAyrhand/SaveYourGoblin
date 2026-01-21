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
import type { Character, Environment, Mission, ContentType, GeneratedContent } from "@/types/rpg"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { useLocale } from 'next-intl'

/** Renders diff values as readable, formatted UI instead of raw JSON. */
function DiffValueBlock({ value, className = "" }: { value: unknown; className?: string }) {
  if (value === undefined || value === null) {
    return <p className={`text-sm text-muted-foreground italic ${className}`}>—</p>
  }
  if (typeof value === "string") {
    return <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${className}`}>{value}</p>
  }
  if (Array.isArray(value)) {
    const isStrings = value.length === 0 || value.every((x) => typeof x === "string")
    if (isStrings) {
      return (
        <ul className={`list-disc list-outside pl-5 space-y-1.5 text-sm text-foreground ${className}`}>
          {(value as string[]).map((item, i) => (
            <li key={i} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      )
    }
    // Array of objects (spells, skills, objectives, classFeatures, powerfulItems, etc.)
    return (
      <div className={`space-y-3 ${className}`}>
        {(value as Record<string, unknown>[]).map((item, i) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const o = item as Record<string, unknown>
            // Rewards-like { xp, gold, items }
            if ("items" in o && Array.isArray(o.items) && !("name" in o) && !("description" in o)) {
              return (
                <div key={i} className="text-sm space-y-1">
                  {"xp" in o && o.xp != null && <div><span className="text-muted-foreground">XP:</span> {String(o.xp)}</div>}
                  {"gold" in o && o.gold != null && <div><span className="text-muted-foreground">Gold:</span> {String(o.gold)}</div>}
                  {o.items.length > 0 && <div><span className="text-muted-foreground">Items:</span><ul className="list-disc list-inside pl-2">{o.items.map((x, j) => <li key={j}>{String(x)}</li>)}</ul></div>}
                </div>
              )
            }
            // name + description (spells, classFeatures, powerfulItems with name/status)
            const name = o.name != null ? String(o.name) : null
            const desc = o.description != null ? String(o.description) : null
            const level = o.level != null ? String(o.level) : null
            const status = o.status != null ? String(o.status) : null
            const primary = o.primary === true
            if (name || desc) {
              return (
                <div key={i} className="rounded-md border border-border bg-muted/30 dark:bg-muted/20 p-2.5 text-sm">
                  {name && <div className="font-medium text-foreground">{name}</div>}
                  {(level || status || primary) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {level && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs">Level {level}</span>}
                      {status && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">{status}</span>}
                      {primary && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">Primary</span>}
                    </div>
                  )}
                  {desc && <p className="mt-1 text-foreground/90 leading-relaxed">{desc}</p>}
                </div>
              )
            }
            // objectives: description + primary
            if ("description" in o && typeof o.description === "string") {
              const isPrimary = o.primary === true
              return (
                <div key={i} className="rounded-md border border-border bg-muted/30 dark:bg-muted/20 p-2.5 text-sm">
                  {isPrimary && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs mr-2">Primary</span>}
                  <p className="text-foreground leading-relaxed">{o.description}</p>
                </div>
              )
            }
            // skills: name, proficiency, modifier
            if ("name" in o && "proficiency" in o) {
              return (
                <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 dark:bg-muted/20 px-2.5 py-1.5 text-sm">
                  <span className="font-medium">{String(o.name)}</span>
                  <span className="text-muted-foreground text-xs">{o.proficiency ? "Proficient" : ""} {o.modifier != null ? `(${Number(o.modifier) >= 0 ? "+" : ""}${o.modifier})` : ""}</span>
                </div>
              )
            }
            // Fallback: compact key-value
            return (
              <div key={i} className="rounded-md border border-border bg-muted/30 dark:bg-muted/20 p-2.5 text-sm font-mono text-foreground/90">
                {JSON.stringify(o)}
              </div>
            )
          }
          return <div key={i} className="text-sm text-muted-foreground">{String(item)}</div>
        })}
      </div>
    )
  }
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>
    // rewards: { xp?, gold?, items }
    if ("items" in o && Array.isArray(o.items)) {
      return (
        <div className={`space-y-1.5 text-sm ${className}`}>
          {"xp" in o && o.xp != null && <div><span className="text-muted-foreground">XP:</span> {String(o.xp)}</div>}
          {"gold" in o && o.gold != null && <div><span className="text-muted-foreground">Gold:</span> {String(o.gold)}</div>}
          {o.items.length > 0 && <div><span className="text-muted-foreground">Items:</span><ul className="list-disc list-inside pl-2 mt-0.5">{o.items.map((x, j) => <li key={j}>{String(x)}</li>)}</ul></div>}
        </div>
      )
    }
    // generic object
    return (
      <div className={`space-y-1 text-sm ${className}`}>
        {Object.entries(o).map(([k, v]) => (
          <div key={k}><span className="text-muted-foreground">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
        ))}
      </div>
    )
  }
  return <p className={`text-sm text-foreground ${className}`}>{String(value)}</p>
}

/** Section ids and i18n keys for each content type. Must match lib/ai generateRPGContentSection. */
const REGENERABLE_SECTIONS: Record<ContentType, Array<{ id: string; labelKey: string }>> = {
  character: [
    { id: 'spells', labelKey: 'generator.regenerateSpells' },
    { id: 'skills', labelKey: 'generator.regenerateSkills' },
    { id: 'traits', labelKey: 'generator.regenerateTraits' },
    { id: 'racialTraits', labelKey: 'generator.regenerateRacialTraits' },
    { id: 'classFeatures', labelKey: 'generator.regenerateClassFeatures' },
    { id: 'background', labelKey: 'generator.regenerateBackground' },
    { id: 'personality', labelKey: 'generator.regeneratePersonality' },
  ],
  environment: [
    { id: 'npcs', labelKey: 'generator.regenerateNPCs' },
    { id: 'features', labelKey: 'generator.regenerateFeatures' },
    { id: 'adventureHooks', labelKey: 'generator.regenerateHooks' },
    { id: 'currentConflict', labelKey: 'generator.regenerateCurrentConflict' },
  ],
  mission: [
    { id: 'objectives', labelKey: 'generator.regenerateObjectives' },
    { id: 'rewards', labelKey: 'generator.regenerateRewards' },
    { id: 'relatedNPCs', labelKey: 'generator.regenerateRelatedNPCs' },
    { id: 'relatedLocations', labelKey: 'generator.regenerateRelatedLocations' },
    { id: 'powerfulItems', labelKey: 'generator.regeneratePowerfulItems' },
    { id: 'possibleOutcomes', labelKey: 'generator.regeneratePossibleOutcomes' },
    { id: 'context', labelKey: 'generator.regenerateContext' },
  ],
}

interface ContentDetailModalProps {
  item: LibraryContentItem
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate?: (updatedItem: LibraryContentItem) => void
  onGenerateVariation?: (item: LibraryContentItem) => void
  onCampaignsUpdated?: () => void
}

type CampaignSummary = {
  id: string
  name: string
  description?: string | null
  contentIds?: string[]
}

export function ContentDetailModal({
  item,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  onGenerateVariation,
  onCampaignsUpdated,
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
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false)
  const [addingCampaignId, setAddingCampaignId] = useState<string | null>(null)
  const [linkedContent, setLinkedContent] = useState<{
    outgoing: Array<{ id: string; contentId: string; linkType: string; content: any }>
    incoming: Array<{ id: string; contentId: string; linkType: string; content: any }>
  }>({ outgoing: [], incoming: [] })
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkedItemPopup, setLinkedItemPopup] = useState<LibraryContentItem | null>(null)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const [diffPreview, setDiffPreview] = useState<{
    sectionId: string
    sectionLabel: string
    oldValue: unknown
    newValue: unknown
    sectionIndex?: number
  } | null>(null)
  const [regenerateUndo, setRegenerateUndo] = useState<{ previousContentData: Record<string, unknown> } | null>(null)
  const [isSavingDiff, setIsSavingDiff] = useState(false)

  // Update notes and tags when item ID changes (user opens a different item)
  // This prevents overwriting local changes while saving
  useEffect(() => {
    setNotes(item.notes || "")
    setTags(item.tags || [])
    setRegenerateError(null)
    setDiffPreview(null)
    setRegenerateUndo(null)
    setIsSavingDiff(false)
    setCampaignsError(null)
    setAddingCampaignId(null)
    setIsCampaignModalOpen(false)
  }, [item.id])

  // Load linked content when item changes
  useEffect(() => {
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

      const response = await fetch(`/api/content/${contentId}/links`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setLinkedContent(result.data || { outgoing: [], incoming: [] })
      }
    } catch (err) {
      console.error("Failed to load linked content:", err)
    } finally {
      setIsLoadingLinks(false)
    }
  }

  async function loadCampaigns() {
    setIsLoadingCampaigns(true)
    setCampaignsError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch("/api/campaigns?includeContent=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to load campaigns")
      }

      const result = await response.json()
      setCampaigns(result.data || [])
    } catch (err) {
      console.error("Failed to load campaigns:", err)
      setCampaignsError(err instanceof Error ? err.message : "Failed to load campaigns")
    } finally {
      setIsLoadingCampaigns(false)
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
    if (isCampaignModalOpen) {
      loadCampaigns()
    }
  }, [isCampaignModalOpen])

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

  async function handleAddToCampaign(campaignId: string) {
    try {
      setAddingCampaignId(campaignId)
      setCampaignsError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/campaigns/${campaignId}/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contentId: item.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || errorData.message || "Failed to add to campaign")
      }

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                contentIds: campaign.contentIds ? [...campaign.contentIds, item.id] : [item.id],
              }
            : campaign
        )
      )
      onCampaignsUpdated?.()
    } catch (err) {
      console.error("Add to campaign error:", err)
      setCampaignsError(err instanceof Error ? err.message : "Failed to add to campaign")
    } finally {
      setAddingCampaignId(null)
    }
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

  /** Calls /api/generate/regenerate only; does not save. sectionIndex used for single-NPC npcs. */
  async function regenerateSectionOnly(
    sectionId: string,
    contentData: Record<string, unknown>,
    sectionIndex?: number
  ): Promise<{ section: string; data: unknown; index?: number }> {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) throw new Error("Not authenticated")
    const body: { scenario: string; contentType: string; section: string; currentContent: Record<string, unknown>; sectionIndex?: number } = {
      scenario: item.scenario_input,
      contentType: item.type,
      section: sectionId,
      currentContent: contentData,
    }
    if (typeof sectionIndex === 'number') body.sectionIndex = sectionIndex
    const res = await fetch("/api/generate/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(j.error || "Failed to regenerate")
    }
    const text = await res.text()
    const parsed = JSON.parse(text.trim()) as { section: string; data: unknown; index?: number }
    return { section: parsed.section, data: parsed.data, index: parsed.index }
  }

  async function saveContentData(contentData: Record<string, unknown>): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) throw new Error("Not authenticated")
    const patchRes = await fetch(`/api/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content_data: contentData }),
    })
    if (!patchRes.ok) {
      const j = await patchRes.json().catch(() => ({})) as { error?: string }
      throw new Error(j.error || "Failed to save")
    }
    if (onUpdate) onUpdate({ ...item, content_data: contentData as unknown as GeneratedContent })
  }

  async function regenerateAndSave(sectionId: string, contentData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { section, data } = await regenerateSectionOnly(sectionId, contentData)
    const newData = { ...contentData, [section]: data }
    await saveContentData(newData)
    return newData
  }

  async function handleRegenerateSection(sectionId: string, index?: number) {
    if (!confirm(t("library.regenerateConfirm"))) return
    setRegeneratingSection(index != null ? `npcs@${index}` : sectionId)
    setRegenerateError(null)
    setDiffPreview(null)
    try {
      const contentData = item.content_data as unknown as Record<string, unknown>
      const { section, data, index: resIndex } = await regenerateSectionOnly(sectionId, contentData, index)
      const sectionMeta = REGENERABLE_SECTIONS[item.type].find((s) => s.id === section)
      let sectionLabel = sectionMeta ? t(sectionMeta.labelKey) : section
      let oldValue: unknown = contentData[section]
      const sectionIndex: number | undefined = resIndex
      if (typeof resIndex === 'number') {
        const npcs = (contentData.npcs as string[] | undefined) || []
        oldValue = npcs[resIndex]
        sectionLabel = `${sectionLabel} #${resIndex + 1}`
      }
      setDiffPreview({
        sectionId: section,
        sectionLabel,
        oldValue,
        newValue: data,
        sectionIndex,
      })
    } catch (e) {
      setRegenerateError(e instanceof Error ? e.message : t("library.regenerateError"))
    } finally {
      setRegeneratingSection(null)
    }
  }

  async function handleDiffAccept() {
    if (!diffPreview || !onUpdate) return
    const contentData = item.content_data as unknown as Record<string, unknown>
    let merged: Record<string, unknown>
    if (typeof diffPreview.sectionIndex === 'number') {
      const npcs = ((contentData.npcs as string[]) || []).map((n, i) =>
        i === diffPreview.sectionIndex ? (diffPreview.newValue as string) : n
      )
      merged = { ...contentData, npcs }
    } else {
      merged = { ...contentData, [diffPreview.sectionId]: diffPreview.newValue }
    }
    setRegenerateUndo({ previousContentData: contentData })
    setRegenerateError(null)
    setIsSavingDiff(true)
    try {
      await saveContentData(merged)
      setDiffPreview(null)
    } catch (e) {
      setRegenerateUndo(null)
      setRegenerateError(e instanceof Error ? e.message : t("library.regenerateError"))
    } finally {
      setIsSavingDiff(false)
    }
  }

  function handleDiffReject() {
    setDiffPreview(null)
  }

  async function handleUndoRegenerate() {
    if (!regenerateUndo || !onUpdate) return
    try {
      await saveContentData(regenerateUndo.previousContentData)
      setRegenerateUndo(null)
      setRegenerateError(null)
    } catch (e) {
      setRegenerateError(e instanceof Error ? e.message : t("library.regenerateError"))
    }
  }

  async function handleRegenerateAll() {
    if (!confirm(t("library.regenerateAllConfirm"))) return
    const sections = REGENERABLE_SECTIONS[item.type]
    const beforeContent = item.content_data as unknown as Record<string, unknown>
    let merged: LibraryContentItem = { ...item, content_data: item.content_data }
    for (const { id } of sections) {
      setRegeneratingSection(id)
      setRegenerateError(null)
      try {
        const newData = await regenerateAndSave(id, merged.content_data as unknown as Record<string, unknown>)
        merged = { ...merged, content_data: newData as unknown as GeneratedContent }
        setRegenerateUndo({ previousContentData: beforeContent })
      } catch (e) {
        setRegenerateError(e instanceof Error ? e.message : t("library.regenerateError"))
        break
      } finally {
        setRegeneratingSection(null)
      }
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
      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
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
              onClick={() => setIsCampaignModalOpen(true)}
              className="font-body no-print"
            >
              🗺️ {t('library.addToCampaign')}
            </Button>
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
            {regenerateError && onUpdate && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription className="font-body text-sm">{regenerateError}</AlertDescription>
              </Alert>
            )}
            {regenerateUndo && onUpdate && (
              <Alert className="mb-4 bg-primary/10 border-primary/30">
                <AlertDescription className="font-body text-sm flex items-center justify-between gap-2 flex-wrap">
                  <span>{t("library.sectionUpdatedUndo")}</span>
                  <Button variant="outline" size="sm" onClick={handleUndoRegenerate} className="shrink-0">
                    {t("library.undoRegenerate")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {item.type === "character" && (
              <CharacterCard
                character={item.content_data as Character}
                onRegenerateSection={onUpdate ? handleRegenerateSection : undefined}
                regeneratingSection={onUpdate ? regeneratingSection : null}
                regenerateLabel={onUpdate ? (id: string) => { const s = REGENERABLE_SECTIONS.character.find((x) => x.id === id); return s ? t(s.labelKey) : "Regenerate"; } : undefined}
              />
            )}
            {item.type === "environment" && (
              <EnvironmentCard
                environment={item.content_data as Environment}
                onRegenerateSection={onUpdate ? handleRegenerateSection : undefined}
                regeneratingSection={onUpdate ? regeneratingSection : null}
                regenerateLabel={onUpdate ? (id, idx) => (typeof idx === 'number' ? t('library.regenerateThisNpc') : (() => { const s = REGENERABLE_SECTIONS.environment.find((x) => x.id === id); return s ? t(s.labelKey) : "Regenerate"; })()) : undefined}
              />
            )}
            {item.type === "mission" && (
              <MissionCard
                mission={item.content_data as Mission}
                onRegenerateSection={onUpdate ? handleRegenerateSection : undefined}
                regeneratingSection={onUpdate ? regeneratingSection : null}
                regenerateLabel={onUpdate ? (id: string) => { const s = REGENERABLE_SECTIONS.mission.find((x) => x.id === id); return s ? t(s.labelKey) : "Regenerate"; } : undefined}
              />
            )}
            {onUpdate && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleRegenerateAll} disabled={!!regeneratingSection} className="font-body text-muted-foreground no-print">
                  {regeneratingSection ? `⏳ ${t("library.regenerating")}` : `↻ ${t("library.regenerateAll")}`}
                </Button>
              </div>
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

      {/* Diff preview modal */}
      {diffPreview && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) handleDiffReject() }}
        >
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-background rounded-lg shadow-2xl border border-border">
            <div className="shrink-0 px-4 py-3 border-b border-border">
              <h3 className="font-display text-lg font-semibold">{t("library.diffPreviewTitle")}: {diffPreview.sectionLabel}</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("library.diffPrevious")}</div>
                <div className="max-h-72 overflow-auto bg-muted/50 dark:bg-muted/30 p-4 rounded-lg border border-border">
                  <DiffValueBlock value={diffPreview.oldValue} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("library.diffRegenerated")}</div>
                <div className="max-h-72 overflow-auto bg-primary/5 dark:bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <DiffValueBlock value={diffPreview.newValue} />
                </div>
              </div>
            </div>
            <div className="shrink-0 px-4 py-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={handleDiffReject} disabled={isSavingDiff}>{t("library.diffReject")}</Button>
              <Button onClick={handleDiffAccept} disabled={isSavingDiff}>{isSavingDiff ? t("library.saving") : t("library.diffAcceptAndSave")}</Button>
            </div>
          </div>
        </div>
      )}

      {isCampaignModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCampaignModalOpen(false)
            }
          }}
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">{t('library.addToCampaignTitle')}</h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {t('library.addToCampaignDescription')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCampaignModalOpen(false)}
                className="font-body text-lg"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {campaignsError && (
                <Alert variant="destructive">
                  <AlertDescription className="font-body">{campaignsError}</AlertDescription>
                </Alert>
              )}
              {isLoadingCampaigns ? (
                <p className="text-sm text-muted-foreground font-body">
                  {t('library.loadingCampaigns')}
                </p>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">
                  {t('library.noCampaigns')}
                </p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const alreadyAdded = campaign.contentIds?.includes(item.id) ?? false
                    return (
                      <div
                        key={campaign.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/10 bg-background/80 p-4"
                      >
                        <div>
                          <div className="font-body font-semibold text-foreground">
                            {campaign.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-body mt-1">
                            {campaign.description || t('campaigns.noDescription')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="font-body"
                          onClick={() => handleAddToCampaign(campaign.id)}
                          disabled={alreadyAdded || addingCampaignId === campaign.id}
                        >
                          {alreadyAdded
                            ? t('library.alreadyInCampaign')
                            : addingCampaignId === campaign.id
                              ? t('common.saving')
                              : t('library.addToCampaign')}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <div className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
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


