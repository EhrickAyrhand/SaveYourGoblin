"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import type { DragEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { isRecoverySessionActive, isResetPasswordRoute } from "@/lib/recovery-session"
import type { User } from "@/types/auth"
import type { ContentType, Character, Environment, Mission, GeneratedContent } from "@/types/rpg"
import type { LibraryContentItem } from "@/components/rpg/library-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NavigationDropdown } from "@/components/ui/navigation-dropdown"

type Campaign = {
  id: string
  user_id?: string
  name: string
  description: string
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type CampaignContentItem = {
  contentId: string
  sequence: number
  notes: string
  content: {
    id: string
    type: ContentType
    scenario_input: string
    content_data: GeneratedContent
    created_at: string
  } | null
}

const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  character: "🎭",
  environment: "🗺️",
  mission: "⚔️",
}

function getContentName(item: { type: ContentType; content_data: GeneratedContent } | null): string {
  if (!item) return "Unknown"
  if (item.type === "character") {
    return (item.content_data as Character)?.name || "Unknown"
  }
  if (item.type === "environment") {
    return (item.content_data as Environment)?.name || "Unknown"
  }
  return (item.content_data as Mission)?.title || "Unknown"
}

function formatSettingsText(settings: Record<string, unknown> | null | undefined): string {
  try {
    return JSON.stringify(settings ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

export default function CampaignsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignContent, setCampaignContent] = useState<CampaignContentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [campaignDescription, setCampaignDescription] = useState("")
  const [settingsText, setSettingsText] = useState("{}")
  const [initialCampaignName, setInitialCampaignName] = useState("")
  const [initialCampaignDescription, setInitialCampaignDescription] = useState("")
  const [initialSettingsText, setInitialSettingsText] = useState("{}")
  const [isSavingCampaign, setIsSavingCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState("")
  const [newCampaignDescription, setNewCampaignDescription] = useState("")
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null)
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null)
  const [removingContentId, setRemovingContentId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [isAddContentOpen, setIsAddContentOpen] = useState(false)
  const [libraryContent, setLibraryContent] = useState<LibraryContentItem[]>([])
  const [librarySearch, setLibrarySearch] = useState("")
  const [libraryType, setLibraryType] = useState<ContentType | "all">("all")
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [addingContentId, setAddingContentId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isRecoverySessionActive() && !isResetPasswordRoute(window.location.pathname)) {
      router.push("/reset-password")
      return
    }

    async function checkUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        if (!currentUser.emailVerified) {
          router.push(`/verify-email?email=${encodeURIComponent(currentUser.email)}`)
          return
        }

        setUser(currentUser)
      } catch (err) {
        setError(t("errors.generic"))
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router, t])

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }, [])

  const fetchCampaigns = useCallback(async () => {
    if (!user) return
    setIsFetchingCampaigns(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch("/api/campaigns", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const list = result.data || []
      setCampaigns(list)

      if (list.length === 0) {
        setSelectedCampaignId(null)
        setSelectedCampaign(null)
        setCampaignContent([])
        return
      }

      setSelectedCampaignId((prev) => {
        if (prev && list.some((item: Campaign) => item.id === prev)) {
          return prev
        }
        return list[0].id
      })
    } catch (err) {
      console.error("Fetch campaigns error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsFetchingCampaigns(false)
    }
  }, [user, getAccessToken, t])

  const fetchCampaignDetails = useCallback(async (campaignId: string) => {
    if (!campaignId) return
    setIsFetchingDetails(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const campaign = result.data as Campaign & { content?: CampaignContentItem[] }
      setSelectedCampaign(campaign)
      const content = campaign.content || []
      setCampaignContent(content)

      const nextSettingsText = formatSettingsText(campaign.settings)
      setCampaignName(campaign.name || "")
      setCampaignDescription(campaign.description || "")
      setSettingsText(nextSettingsText)
      setInitialCampaignName(campaign.name || "")
      setInitialCampaignDescription(campaign.description || "")
      setInitialSettingsText(nextSettingsText)

      const notesMap: Record<string, string> = {}
      for (const item of content) {
        notesMap[item.contentId] = item.notes || ""
      }
      setNotesDrafts(notesMap)
    } catch (err) {
      console.error("Fetch campaign details error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
      setSelectedCampaign(null)
      setCampaignContent([])
    } finally {
      setIsFetchingDetails(false)
    }
  }, [getAccessToken, t])

  const fetchLibraryContent = useCallback(async () => {
    setIsLoadingLibrary(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch("/api/content?limit=200", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      setLibraryContent(result.data || [])
    } catch (err) {
      console.error("Fetch library content error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsLoadingLibrary(false)
    }
  }, [getAccessToken, t])

  useEffect(() => {
    if (user) {
      fetchCampaigns()
    }
  }, [user, fetchCampaigns])

  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignDetails(selectedCampaignId)
    }
  }, [selectedCampaignId, fetchCampaignDetails])

  useEffect(() => {
    if (isAddContentOpen && libraryContent.length === 0) {
      fetchLibraryContent()
    }
  }, [isAddContentOpen, libraryContent.length, fetchLibraryContent])

  useEffect(() => {
    if (isAddContentOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isAddContentOpen])

  const formatDate = useCallback((value: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
  }, [locale])

  const hasCampaignChanges = useMemo(() => {
    if (!selectedCampaign) return false
    return (
      campaignName.trim() !== initialCampaignName.trim() ||
      campaignDescription !== initialCampaignDescription ||
      settingsText.trim() !== initialSettingsText.trim()
    )
  }, [
    selectedCampaign,
    campaignName,
    campaignDescription,
    settingsText,
    initialCampaignName,
    initialCampaignDescription,
    initialSettingsText,
  ])

  const filteredLibraryContent = useMemo(() => {
    const existingIds = new Set(campaignContent.map((item) => item.contentId))
    const search = librarySearch.trim().toLowerCase()

    return libraryContent.filter((item) => {
      if (existingIds.has(item.id)) return false
      if (libraryType !== "all" && item.type !== libraryType) return false
      if (!search) return true
      const name = getContentName({ type: item.type, content_data: item.content_data })
      const haystack = `${name} ${item.scenario_input}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [campaignContent, libraryContent, librarySearch, libraryType])

  async function handleCreateCampaign() {
    const trimmedName = newCampaignName.trim()
    if (!trimmedName) {
      setError(t("campaigns.nameRequired"))
      return
    }

    setIsCreatingCampaign(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          description: newCampaignDescription || "",
          settings: {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const created = result.data as Campaign
      setCampaigns((prev) => [created, ...prev])
      setNewCampaignName("")
      setNewCampaignDescription("")
      setSelectedCampaignId(created.id)
    } catch (err) {
      console.error("Create campaign error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsCreatingCampaign(false)
    }
  }

  async function handleDeleteCampaign(campaignId: string) {
    if (!confirm(t("campaigns.confirmDelete"))) return
    setDeletingCampaignId(campaignId)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      setCampaigns((prev) => prev.filter((item) => item.id !== campaignId))
      if (selectedCampaignId === campaignId) {
        const remaining = campaigns.filter((item) => item.id !== campaignId)
        setSelectedCampaignId(remaining[0]?.id ?? null)
        setSelectedCampaign(null)
        setCampaignContent([])
      }
    } catch (err) {
      console.error("Delete campaign error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setDeletingCampaignId(null)
    }
  }

  async function handleSaveCampaign() {
    if (!selectedCampaignId || !selectedCampaign) return
    if (!hasCampaignChanges) return

    const updates: {
      name?: string
      description?: string
      settings?: Record<string, unknown>
    } = {}

    if (campaignName.trim() !== initialCampaignName.trim()) {
      updates.name = campaignName.trim()
    }
    if (campaignDescription !== initialCampaignDescription) {
      updates.description = campaignDescription
    }

    if (settingsText.trim() !== initialSettingsText.trim()) {
      try {
        const parsed = settingsText.trim() ? JSON.parse(settingsText) : {}
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setError(t("campaigns.settingsInvalid"))
          return
        }
        updates.settings = parsed
      } catch {
        setError(t("campaigns.settingsInvalid"))
        return
      }
    }

    if (Object.keys(updates).length === 0) return

    setIsSavingCampaign(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${selectedCampaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const updated = result.data as Campaign
      const nextSettingsText = formatSettingsText(updated.settings)

      setSelectedCampaign(updated)
      setCampaigns((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setCampaignName(updated.name || "")
      setCampaignDescription(updated.description || "")
      setSettingsText(nextSettingsText)
      setInitialCampaignName(updated.name || "")
      setInitialCampaignDescription(updated.description || "")
      setInitialSettingsText(nextSettingsText)
    } catch (err) {
      console.error("Update campaign error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsSavingCampaign(false)
    }
  }

  async function handleAddContent(contentId: string) {
    if (!selectedCampaignId) return
    setAddingContentId(contentId)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${selectedCampaignId}/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ contentId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      await fetchCampaignDetails(selectedCampaignId)
    } catch (err) {
      console.error("Add campaign content error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setAddingContentId(null)
    }
  }

  async function handleRemoveContent(contentId: string) {
    if (!selectedCampaignId) return
    if (!confirm(t("campaigns.confirmRemoveContent"))) return
    setRemovingContentId(contentId)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${selectedCampaignId}/content`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ contentId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      setCampaignContent((prev) => prev.filter((item) => item.contentId !== contentId))
      setNotesDrafts((prev) => {
        const next = { ...prev }
        delete next[contentId]
        return next
      })
    } catch (err) {
      console.error("Remove campaign content error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setRemovingContentId(null)
    }
  }

  async function handleSaveNotes(contentId: string) {
    if (!selectedCampaignId) return
    const item = campaignContent.find((entry) => entry.contentId === contentId)
    if (!item) return

    const nextNotes = notesDrafts[contentId] ?? ""
    if (nextNotes === item.notes) return

    setSavingNotesId(contentId)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/campaigns/${selectedCampaignId}/content`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contentId,
          notes: nextNotes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      setCampaignContent((prev) =>
        prev.map((entry) =>
          entry.contentId === contentId ? { ...entry, notes: nextNotes } : entry
        )
      )
    } catch (err) {
      console.error("Save notes error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setSavingNotesId(null)
    }
  }

  async function persistOrder(items: CampaignContentItem[]) {
    if (!selectedCampaignId) return
    setIsReordering(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const updates = items.map((item, index) =>
        fetch(`/api/campaigns/${selectedCampaignId}/content`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            contentId: item.contentId,
            sequence: index,
          }),
        })
      )

      const results = await Promise.all(updates)
      const failure = results.find((result) => !result.ok)
      if (failure) {
        const errorData = await failure.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }
    } catch (err) {
      console.error("Reorder campaign content error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsReordering(false)
    }
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", String(index))
    setDraggedIndex(index)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  async function handleDrop(index: number) {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...campaignContent]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, moved)
    const withSequence = reordered.map((item, idx) => ({
      ...item,
      sequence: idx,
    }))
    setCampaignContent(withSequence)
    setDraggedIndex(null)
    setDragOverIndex(null)
    await persistOrder(withSequence)
  }

  async function handleSignOut() {
    const result = await signOut()
    if (!result.error) {
      router.push("/login")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-body">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const addContentModal = isAddContentOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setIsAddContentOpen(false)}
      />
      <div className="relative z-10 w-full max-w-4xl">
        <Card className="parchment ornate-border border-2 border-primary/30 shadow-xl">
          <CardHeader className="border-b border-primary/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                  <span className="text-2xl">📚</span>
                  {t("campaigns.addContentTitle")}
                </CardTitle>
                <CardDescription className="font-body text-sm text-muted-foreground">
                  {t("campaigns.addContentDescription")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="font-body"
                onClick={() => setIsAddContentOpen(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder={t("campaigns.searchPlaceholder")}
                className="font-body flex-1 min-w-[220px]"
              />
              <select
                value={libraryType}
                onChange={(event) => setLibraryType(event.target.value as ContentType | "all")}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">{t("campaigns.allTypes")}</option>
                <option value="character">{t("generator.contentType.character")}</option>
                <option value="environment">{t("generator.contentType.environment")}</option>
                <option value="mission">{t("generator.contentType.mission")}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="font-body"
                onClick={fetchLibraryContent}
                disabled={isLoadingLibrary}
              >
                {isLoadingLibrary ? t("common.loading") : t("campaigns.refreshLibrary")}
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-auto pr-2 space-y-3">
              {isLoadingLibrary ? (
                <p className="text-sm text-muted-foreground font-body">
                  {t("campaigns.loadingLibrary")}
                </p>
              ) : filteredLibraryContent.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground font-body py-8">
                  {t("campaigns.noContentFound")}
                </div>
              ) : (
                filteredLibraryContent.map((item) => {
                  const name = getContentName({ type: item.type, content_data: item.content_data })
                  const typeLabel =
                    item.type === "character"
                      ? t("generator.contentType.character")
                      : item.type === "environment"
                        ? t("generator.contentType.environment")
                        : t("generator.contentType.mission")

                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/10 bg-background/80 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CONTENT_TYPE_ICONS[item.type]}</span>
                          <span className="font-body font-semibold text-foreground">{name}</span>
                          <span className="text-xs text-muted-foreground">{typeLabel}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-1">
                          {item.scenario_input}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="font-body"
                        onClick={() => handleAddContent(item.id)}
                        disabled={addingContentId === item.id}
                      >
                        {addingContentId === item.id ? t("common.saving") : t("campaigns.addContent")}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ) : null

  const addContentPortal =
    addContentModal && typeof document !== "undefined"
      ? createPortal(addContentModal, document.body)
      : addContentModal

  return (
    <div className="min-h-screen bg-background/50 backdrop-blur-sm p-4">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/20"></div>
          <div className="relative flex items-center justify-between p-6 md:p-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl md:text-6xl">🗺️</span>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                  {t("campaigns.title")}
                </h1>
              </div>
              <p className="mt-3 text-base md:text-lg text-muted-foreground font-body pl-1">
                {t("campaigns.subtitle")}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <NavigationDropdown onSignOut={handleSignOut} />
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
            <AlertDescription className="font-body">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-4 mt-2 font-body"
                onClick={fetchCampaigns}
                disabled={isFetchingCampaigns}
              >
                {t("campaigns.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <CardTitle className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                  <span className="text-2xl">📓</span>
                  {t("campaigns.listTitle")}
                </CardTitle>
                <CardDescription className="font-body text-sm text-muted-foreground">
                  {campaigns.length === 0
                    ? t("campaigns.noCampaignsDescription")
                    : t("campaigns.listDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {isFetchingCampaigns ? (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("campaigns.loadingCampaigns")}
                  </p>
                ) : campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("campaigns.noCampaigns")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => {
                      const isSelected = campaign.id === selectedCampaignId
                      return (
                        <div
                          key={campaign.id}
                          className={`rounded-lg border-2 p-3 transition-all ${
                            isSelected
                              ? "border-primary/60 bg-primary/10"
                              : "border-primary/10 hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignId(campaign.id)}
                            className="w-full text-left"
                          >
                            <div className="font-body text-sm font-semibold text-foreground">
                              {campaign.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {campaign.description || t("campaigns.noDescription")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              {t("campaigns.updatedAt", { date: formatDate(campaign.updated_at) })}
                            </div>
                          </button>
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body"
                              onClick={() => setSelectedCampaignId(campaign.id)}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="font-body"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              disabled={deletingCampaignId === campaign.id}
                            >
                              {deletingCampaignId === campaign.id ? t("common.loading") : t("common.delete")}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <CardTitle className="font-display text-xl font-bold text-primary flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  {t("campaigns.createTitle")}
                </CardTitle>
                <CardDescription className="font-body text-sm text-muted-foreground">
                  {t("campaigns.createDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("campaigns.nameLabel")}</Label>
                  <Input
                    value={newCampaignName}
                    onChange={(event) => setNewCampaignName(event.target.value)}
                    placeholder={t("campaigns.namePlaceholder")}
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("campaigns.descriptionLabel")}</Label>
                  <textarea
                    value={newCampaignDescription}
                    onChange={(event) => setNewCampaignDescription(event.target.value)}
                    placeholder={t("campaigns.descriptionPlaceholder")}
                    className="min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={isCreatingCampaign || !newCampaignName.trim()}
                  className="w-full font-body"
                >
                  {isCreatingCampaign ? t("common.saving") : t("campaigns.createButton")}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <CardTitle className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                  <span className="text-2xl">🧭</span>
                  {t("campaigns.detailsTitle")}
                </CardTitle>
                <CardDescription className="font-body text-sm text-muted-foreground">
                  {t("campaigns.detailsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {isFetchingDetails ? (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("campaigns.loadingDetails")}
                  </p>
                ) : selectedCampaign ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-body text-sm">{t("campaigns.nameLabel")}</Label>
                        <Input
                          value={campaignName}
                          onChange={(event) => setCampaignName(event.target.value)}
                          className="font-body"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-body text-sm">{t("campaigns.updatedLabel")}</Label>
                        <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-body text-muted-foreground">
                          {formatDate(selectedCampaign.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-body text-sm">{t("campaigns.descriptionLabel")}</Label>
                      <textarea
                        value={campaignDescription}
                        onChange={(event) => setCampaignDescription(event.target.value)}
                        placeholder={t("campaigns.descriptionPlaceholder")}
                        className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-body text-sm">{t("campaigns.settingsLabel")}</Label>
                      <textarea
                        value={settingsText}
                        onChange={(event) => setSettingsText(event.target.value)}
                        className="min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground font-body">
                        {t("campaigns.settingsHelper")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-body">
                        {t("campaigns.contentCount", { count: campaignContent.length })}
                      </p>
                      <Button
                        onClick={handleSaveCampaign}
                        disabled={!hasCampaignChanges || isSavingCampaign}
                        className="font-body"
                      >
                        {isSavingCampaign ? t("common.saving") : t("common.save")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("campaigns.selectCampaign")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                      <span className="text-2xl">🧩</span>
                      {t("campaigns.contentTitle")}
                    </CardTitle>
                    <CardDescription className="font-body text-sm text-muted-foreground">
                      {t("campaigns.contentDescription")}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    className="font-body"
                    onClick={() => setIsAddContentOpen(true)}
                    disabled={!selectedCampaign}
                  >
                    ➕ {t("campaigns.addContent")}
                  </Button>
                </div>
                {isReordering && (
                  <p className="text-xs text-muted-foreground font-body mt-2">
                    {t("campaigns.reordering")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {selectedCampaign ? (
                  campaignContent.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <div className="text-5xl">📚</div>
                      <p className="text-sm text-muted-foreground font-body">
                        {t("campaigns.emptyContent")}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {t("campaigns.emptyContentDescription")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaignContent.map((item, index) => {
                        const content = item.content
                        const contentName = content ? getContentName(content) : t("campaigns.unknownContent")
                        const typeLabel = content
                          ? content.type === "character"
                            ? t("generator.contentType.character")
                            : content.type === "environment"
                              ? t("generator.contentType.environment")
                              : t("generator.contentType.mission")
                          : t("campaigns.unknownContent")

                        return (
                          <div
                            key={item.contentId}
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragOver={(event) => handleDragOver(event, index)}
                            onDragEnd={() => {
                              setDraggedIndex(null)
                              setDragOverIndex(null)
                            }}
                            onDrop={() => handleDrop(index)}
                            className={`rounded-xl border-2 p-4 shadow-sm transition-colors ${
                              dragOverIndex === index
                                ? "border-primary/60 bg-primary/10"
                                : "border-primary/10 bg-background/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl cursor-grab">☰</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">
                                      {content ? CONTENT_TYPE_ICONS[content.type] : "📄"}
                                    </span>
                                    <span className="font-body font-semibold text-foreground">
                                      {contentName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      #{index + 1}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-body mt-1">
                                    {typeLabel}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="font-body"
                                onClick={() => handleRemoveContent(item.contentId)}
                                disabled={removingContentId === item.contentId}
                              >
                                {removingContentId === item.contentId
                                  ? t("common.loading")
                                  : t("campaigns.removeContent")}
                              </Button>
                            </div>

                            <div className="mt-4 space-y-2">
                              <Label className="font-body text-sm">{t("campaigns.notesLabel")}</Label>
                              <textarea
                                value={notesDrafts[item.contentId] ?? ""}
                                onChange={(event) =>
                                  setNotesDrafts((prev) => ({
                                    ...prev,
                                    [item.contentId]: event.target.value,
                                  }))
                                }
                                placeholder={t("campaigns.notesPlaceholder")}
                                className="min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="font-body"
                                  onClick={() => handleSaveNotes(item.contentId)}
                                  disabled={savingNotesId === item.contentId}
                                >
                                  {savingNotesId === item.contentId
                                    ? t("common.saving")
                                    : t("campaigns.saveNotes")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("campaigns.selectCampaign")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {addContentPortal}
    </div>
  )
}
