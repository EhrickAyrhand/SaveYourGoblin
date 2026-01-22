"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { isRecoverySessionActive, isResetPasswordRoute } from "@/lib/recovery-session"
import type { User } from "@/types/auth"
import type { ContentType, Character, Environment, Mission, GeneratedContent } from "@/types/rpg"
import type { LibraryContentItem } from "@/components/rpg/library-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { NavigationDropdown } from "@/components/ui/navigation-dropdown"

type SessionNote = {
  id: string
  title: string
  content: string
  session_date: string
  campaign_id: string | null
  linked_content_ids: string[]
  created_at: string
  updated_at: string
}

type CampaignSummary = {
  id: string
  name: string
  description?: string | null
}

const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  character: "C",
  environment: "E",
  mission: "M",
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

function summarizeText(value: string, maxLength = 140) {
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (!trimmed) return ""
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 3)}...`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "\"":
        return "&quot;"
      case "'":
        return "&#39;"
      default:
        return char
    }
  })
}

function renderMarkdownInline(text: string) {
  const segments = text.split("`")
  return segments
    .map((segment, index) => {
      if (index % 2 === 1) {
        return `<code>${segment}</code>`
      }
      let output = segment
      output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>")
      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
        const trimmed = url.trim()
        const lower = trimmed.toLowerCase()
        if (
          !trimmed ||
          (!lower.startsWith("http://") &&
            !lower.startsWith("https://") &&
            !lower.startsWith("mailto:"))
        ) {
          return label
        }
        return `<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${label}</a>`
      })
      return output
    })
    .join("")
}

function renderMarkdownToHtml(markdown: string) {
  const escaped = escapeHtml(markdown)
  const blocks = escaped.split(/```/g)
  return blocks
    .map((block, index) => {
      if (index % 2 === 1) {
        return `<pre><code>${block}</code></pre>`
      }

      const lines = block.split("\n")
      let html = ""
      let inList = false

      const closeList = () => {
        if (inList) {
          html += "</ul>"
          inList = false
        }
      }

      for (const line of lines) {
        const trimmed = line.trim()
        if (/^[-*]\s+/.test(trimmed)) {
          if (!inList) {
            html += "<ul>"
            inList = true
          }
          const itemText = trimmed.replace(/^[-*]\s+/, "")
          html += `<li>${renderMarkdownInline(itemText)}</li>`
          continue
        }

        closeList()

        if (/^#{1,6}\s+/.test(trimmed)) {
          const level = Math.min(trimmed.match(/^#{1,6}/)?.[0].length || 1, 6)
          const headingText = trimmed.replace(/^#{1,6}\s+/, "")
          html += `<h${level}>${renderMarkdownInline(headingText)}</h${level}>`
          continue
        }

        if (/^>\s+/.test(trimmed)) {
          const quoteText = trimmed.replace(/^>\s+/, "")
          html += `<blockquote>${renderMarkdownInline(quoteText)}</blockquote>`
          continue
        }

        if (!trimmed) {
          html += "<br />"
          continue
        }

        html += `<p>${renderMarkdownInline(line)}</p>`
      }

      closeList()
      return html
    })
    .join("")
}

const defaultSessionDate = () => new Date().toISOString().split("T")[0]

export default function SessionNotesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notes, setNotes] = useState<SessionNote[]>([])
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [contentItems, setContentItems] = useState<LibraryContentItem[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingNotes, setIsFetchingNotes] = useState(false)
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(false)
  const [isFetchingContent, setIsFetchingContent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [contentFilter, setContentFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [draftSessionDate, setDraftSessionDate] = useState(defaultSessionDate())
  const [draftCampaignId, setDraftCampaignId] = useState<string | null>(null)
  const [draftLinkedContentIds, setDraftLinkedContentIds] = useState<string[]>([])
  const [isPreview, setIsPreview] = useState(false)
  const [contentSearch, setContentSearch] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeNoteIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId
  }, [activeNoteId])

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

  const formatDate = useCallback(
    (value: string) => {
      if (!value) return ""
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
    },
    [locale]
  )

  const formatDateTime = useCallback(
    (value: string) => {
      if (!value) return ""
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    },
    [locale]
  )

  const resetDraft = useCallback(() => {
    setActiveNoteId(null)
    setDraftTitle("")
    setDraftContent("")
    setDraftSessionDate(defaultSessionDate())
    setDraftCampaignId(null)
    setDraftLinkedContentIds([])
    setIsPreview(false)
  }, [])

  const selectNote = useCallback((note: SessionNote) => {
    setActiveNoteId(note.id)
    setDraftTitle(note.title || "")
    setDraftContent(note.content || "")
    setDraftSessionDate(note.session_date || defaultSessionDate())
    setDraftCampaignId(note.campaign_id ?? null)
    setDraftLinkedContentIds(note.linked_content_ids ?? [])
    setIsPreview(false)
  }, [])

  const sortNotes = useCallback((items: SessionNote[]) => {
    return [...items].sort((a, b) => {
      const dateDiff = b.session_date.localeCompare(a.session_date)
      if (dateDiff !== 0) return dateDiff
      return b.updated_at.localeCompare(a.updated_at)
    })
  }, [])

  const fetchNotes = useCallback(async () => {
    if (!user) return
    setIsFetchingNotes(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch("/api/sessions", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const list = sortNotes(result.data || [])
      setNotes(list)

      if (!activeNoteIdRef.current && list.length > 0) {
        selectNote(list[0])
      }

      if (list.length === 0) {
        resetDraft()
      }
    } catch (err) {
      console.error("Fetch session notes error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsFetchingNotes(false)
    }
  }, [user, getAccessToken, t, resetDraft, selectNote, sortNotes])

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
      setCampaigns(result.data || [])
    } catch (err) {
      console.error("Fetch campaigns error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsFetchingCampaigns(false)
    }
  }, [user, getAccessToken, t])

  const fetchContent = useCallback(async () => {
    if (!user) return
    setIsFetchingContent(true)
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
      setContentItems(result.data || [])
    } catch (err) {
      console.error("Fetch content error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsFetchingContent(false)
    }
  }, [user, getAccessToken, t])

  useEffect(() => {
    if (user) {
      fetchNotes()
      fetchCampaigns()
      fetchContent()
    }
  }, [user, fetchNotes, fetchCampaigns, fetchContent])

  const campaignById = useMemo(() => {
    return campaigns.reduce<Record<string, CampaignSummary>>((acc, campaign) => {
      acc[campaign.id] = campaign
      return acc
    }, {})
  }, [campaigns])

  const contentById = useMemo(() => {
    return contentItems.reduce<Record<string, LibraryContentItem>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }, [contentItems])

  const filteredNotes = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase()
    return sortNotes(
      notes.filter((note) => {
        if (campaignFilter !== "all" && note.campaign_id !== campaignFilter) {
          return false
        }
        if (contentFilter !== "all" && !note.linked_content_ids?.includes(contentFilter)) {
          return false
        }
        if (dateFrom && note.session_date < dateFrom) {
          return false
        }
        if (dateTo && note.session_date > dateTo) {
          return false
        }
        if (searchLower) {
          const haystack = `${note.title} ${note.content}`.toLowerCase()
          if (!haystack.includes(searchLower)) return false
        }
        return true
      })
    )
  }, [notes, searchQuery, campaignFilter, contentFilter, dateFrom, dateTo, sortNotes])

  const groupedNotes = useMemo(() => {
    const groups: { date: string; items: SessionNote[] }[] = []
    let currentDate = ""
    for (const note of filteredNotes) {
      const date = note.session_date || note.created_at.split("T")[0]
      if (date !== currentDate) {
        groups.push({ date, items: [note] })
        currentDate = date
      } else {
        groups[groups.length - 1].items.push(note)
      }
    }
    return groups
  }, [filteredNotes])

  const filteredContent = useMemo(() => {
    const searchLower = contentSearch.trim().toLowerCase()
    if (!searchLower) return contentItems
    return contentItems.filter((item) => {
      const name = getContentName({ type: item.type, content_data: item.content_data })
      const haystack = `${name} ${item.scenario_input}`.toLowerCase()
      return haystack.includes(searchLower)
    })
  }, [contentItems, contentSearch])

  const previewHtml = useMemo(() => renderMarkdownToHtml(draftContent), [draftContent])

  const insertWrappedText = useCallback(
    (prefix: string, suffix = prefix) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = draftContent
      const selection = current.slice(start, end) || t("sessionNotes.editorPlaceholder")
      const next = `${current.slice(0, start)}${prefix}${selection}${suffix}${current.slice(end)}`
      setDraftContent(next)

      requestAnimationFrame(() => {
        const cursorStart = start + prefix.length
        const cursorEnd = cursorStart + selection.length
        textarea.focus()
        textarea.setSelectionRange(cursorStart, cursorEnd)
      })
    },
    [draftContent, t]
  )

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = draftContent
      const selection = current.slice(start, end) || t("sessionNotes.editorPlaceholder")
      const lines = selection.split("\n").map((line) => `${prefix}${line}`)
      const nextSelection = lines.join("\n")
      const next = `${current.slice(0, start)}${nextSelection}${current.slice(end)}`
      setDraftContent(next)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start, start + nextSelection.length)
      })
    },
    [draftContent, t]
  )

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const current = draftContent
    const selection = current.slice(start, end) || t("sessionNotes.editorPlaceholder")
    const next = `${current.slice(0, start)}[${selection}](https://)${current.slice(end)}`
    setDraftContent(next)

    requestAnimationFrame(() => {
      const urlStart = start + selection.length + 3
      textarea.focus()
      textarea.setSelectionRange(urlStart, urlStart + "https://".length)
    })
  }, [draftContent, t])

  const toggleLinkedContent = useCallback((contentId: string) => {
    setDraftLinkedContentIds((prev) => {
      if (prev.includes(contentId)) {
        return prev.filter((id) => id !== contentId)
      }
      return [...prev, contentId]
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!draftTitle.trim()) {
      setError(t("sessionNotes.titleRequired"))
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const payload = {
        title: draftTitle.trim(),
        content: draftContent,
        session_date: draftSessionDate,
        campaign_id: draftCampaignId,
        linked_content_ids: draftLinkedContentIds,
      }

      const response = await fetch(activeNoteId ? `/api/sessions/${activeNoteId}` : "/api/sessions", {
        method: activeNoteId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      const result = await response.json()
      const saved = result.data as SessionNote
      setNotes((prev) => sortNotes([...prev.filter((note) => note.id !== saved.id), saved]))
      selectNote(saved)
    } catch (err) {
      console.error("Save session note error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsSaving(false)
    }
  }, [
    draftTitle,
    draftContent,
    draftSessionDate,
    draftCampaignId,
    draftLinkedContentIds,
    activeNoteId,
    getAccessToken,
    t,
    sortNotes,
    selectNote,
  ])

  const handleDelete = useCallback(async () => {
    if (!activeNoteId) return
    if (!confirm(t("sessionNotes.confirmDelete"))) return

    setIsDeleting(true)
    setError(null)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error(t("errors.unauthorized"))
      }

      const response = await fetch(`/api/sessions/${activeNoteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t("errors.generic") }))
        throw new Error(errorData.error || t("errors.generic"))
      }

      setNotes((prev) => prev.filter((note) => note.id !== activeNoteId))
      resetDraft()
    } catch (err) {
      console.error("Delete session note error:", err)
      setError(err instanceof Error ? err.message : t("errors.generic"))
    } finally {
      setIsDeleting(false)
    }
  }, [activeNoteId, getAccessToken, resetDraft, t])

  const handleSignOut = useCallback(async () => {
    const result = await signOut()
    if (!result.error) {
      router.push("/login")
    }
  }, [router])

  const selectedLinkedContent = useMemo(() => {
    return draftLinkedContentIds
      .map((id) => contentById[id])
      .filter((item): item is LibraryContentItem => Boolean(item))
  }, [draftLinkedContentIds, contentById])

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

  return (
    <div className="min-h-screen bg-background/50 backdrop-blur-sm p-4">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/20" />
          <div className="relative flex items-center justify-between p-6 md:p-8">
            <div className="flex-1">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                {t("sessionNotes.title")}
              </h1>
              <p className="mt-3 text-base md:text-lg text-muted-foreground font-body pl-1">
                {t("sessionNotes.subtitle")}
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
                onClick={fetchNotes}
                disabled={isFetchingNotes}
              >
                {t("sessionNotes.refresh")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <CardTitle className="font-display text-xl font-bold text-primary">
                  {t("sessionNotes.filtersTitle")}
                </CardTitle>
                <CardDescription className="font-body text-sm text-muted-foreground">
                  {t("sessionNotes.filtersDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("sessionNotes.searchLabel")}</Label>
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("sessionNotes.searchPlaceholder")}
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("sessionNotes.campaignFilterLabel")}</Label>
                  <select
                    value={campaignFilter}
                    onChange={(event) => setCampaignFilter(event.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">{t("sessionNotes.campaignFilterAll")}</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  {isFetchingCampaigns && (
                    <p className="text-xs text-muted-foreground font-body">
                      {t("sessionNotes.loadingCampaigns")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("sessionNotes.contentFilterLabel")}</Label>
                  <select
                    value={contentFilter}
                    onChange={(event) => setContentFilter(event.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">{t("sessionNotes.contentFilterAll")}</option>
                    {contentItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getContentName({ type: item.type, content_data: item.content_data })}
                      </option>
                    ))}
                  </select>
                  {isFetchingContent && (
                    <p className="text-xs text-muted-foreground font-body">
                      {t("sessionNotes.loadingContent")}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <Label className="font-body text-sm">{t("sessionNotes.dateRangeLabel")}</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-body">{t("sessionNotes.dateFrom")}</span>
                      <DateInput
                        value={dateFrom}
                        onChange={setDateFrom}
                        locale={locale}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-body">{t("sessionNotes.dateTo")}</span>
                      <DateInput
                        value={dateTo}
                        onChange={setDateTo}
                        locale={locale}
                        className="font-body"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-body w-full"
                  onClick={() => {
                    setSearchQuery("")
                    setCampaignFilter("all")
                    setContentFilter("all")
                    setDateFrom("")
                    setDateTo("")
                  }}
                >
                  {t("sessionNotes.clearFilters")}
                </Button>
              </CardContent>
            </Card>

            <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
              <CardHeader className="border-b border-primary/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-xl font-bold text-primary">
                      {t("sessionNotes.listTitle")}
                    </CardTitle>
                    <CardDescription className="font-body text-sm text-muted-foreground">
                      {t("sessionNotes.listDescription")}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-body"
                    onClick={resetDraft}
                  >
                    {t("sessionNotes.newNote")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {isFetchingNotes ? (
                  <p className="text-sm text-muted-foreground font-body">
                    {t("sessionNotes.loadingNotes")}
                  </p>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground font-body">
                      {notes.length === 0
                        ? t("sessionNotes.emptyDescription")
                        : t("sessionNotes.noMatches")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedNotes.map((group) => (
                      <div key={group.date} className="space-y-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-body">
                          {formatDate(group.date)}
                        </div>
                        <div className="space-y-3 border-l border-primary/20 pl-4">
                          {group.items.map((note) => {
                            const isActive = note.id === activeNoteId
                            const campaign = note.campaign_id ? campaignById[note.campaign_id] : null
                            const linkedCount = note.linked_content_ids?.length || 0
                            return (
                              <button
                                key={note.id}
                                type="button"
                                onClick={() => selectNote(note)}
                                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                                  isActive
                                    ? "border-primary/60 bg-primary/10"
                                    : "border-primary/10 bg-background/70 hover:border-primary/30 hover:bg-primary/5"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-body font-semibold text-foreground">
                                      {note.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-body mt-1">
                                      {summarizeText(note.content) || t("sessionNotes.emptyNote")}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-body whitespace-nowrap">
                                    {t("sessionNotes.lastUpdated", { date: formatDateTime(note.updated_at) })}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-body text-muted-foreground">
                                  {campaign && (
                                    <span className="rounded-full bg-primary/10 px-2 py-1">
                                      {campaign.name}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-primary/10 px-2 py-1">
                                    {t("sessionNotes.linkedCount", { count: linkedCount })}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
            <CardHeader className="border-b border-primary/10">
              <CardTitle className="font-display text-2xl font-bold text-primary">
                {t("sessionNotes.editorTitle")}
              </CardTitle>
              <CardDescription className="font-body text-sm text-muted-foreground">
                {t("sessionNotes.editorDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("sessionNotes.titleLabel")}</Label>
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder={t("sessionNotes.titlePlaceholder")}
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm">{t("sessionNotes.dateLabel")}</Label>
                  <DateInput
                    value={draftSessionDate}
                    onChange={setDraftSessionDate}
                    locale={locale}
                    className="font-body"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-body text-sm">{t("sessionNotes.campaignLabel")}</Label>
                <select
                  value={draftCampaignId ?? "none"}
                  onChange={(event) =>
                    setDraftCampaignId(event.target.value === "none" ? null : event.target.value)
                  }
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="none">{t("sessionNotes.campaignNone")}</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="font-body text-sm">{t("sessionNotes.linkedContentLabel")}</Label>
                  <p className="text-xs text-muted-foreground font-body">
                    {t("sessionNotes.linkedContentDescription")}
                  </p>
                </div>
                <Input
                  value={contentSearch}
                  onChange={(event) => setContentSearch(event.target.value)}
                  placeholder={t("sessionNotes.contentSearchPlaceholder")}
                  className="font-body"
                />
                <div className="max-h-52 overflow-auto rounded-lg border border-primary/10 bg-background/60">
                  {contentItems.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground font-body">
                      {t("sessionNotes.noContentAvailable")}
                    </div>
                  ) : (
                    <div className="divide-y divide-primary/10">
                      {filteredContent.map((item) => {
                        const name = getContentName({ type: item.type, content_data: item.content_data })
                        const checked = draftLinkedContentIds.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 px-4 py-3 text-sm font-body cursor-pointer hover:bg-primary/5"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleLinkedContent(item.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold">
                                  {CONTENT_TYPE_ICONS[item.type]}
                                </span>
                                <span className="font-medium text-foreground truncate">{name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {item.scenario_input}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                {selectedLinkedContent.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLinkedContent.map((item) => {
                      const name = getContentName({ type: item.type, content_data: item.content_data })
                      return (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-body"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => toggleLinkedContent(item.id)}
                            className="text-muted-foreground hover:text-foreground font-bold"
                            aria-label={t("sessionNotes.removeLink")}
                          >
                            x
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-body text-sm">{t("sessionNotes.contentLabel")}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isPreview ? "outline" : "default"}
                      size="sm"
                      className="font-body"
                      onClick={() => setIsPreview(false)}
                    >
                      {t("sessionNotes.editorTabEdit")}
                    </Button>
                    <Button
                      variant={isPreview ? "default" : "outline"}
                      size="sm"
                      className="font-body"
                      onClick={() => setIsPreview(true)}
                    >
                      {t("sessionNotes.editorTabPreview")}
                    </Button>
                  </div>
                </div>

                {!isPreview && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={() => insertWrappedText("**")}
                      >
                        B
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={() => insertWrappedText("*")}
                      >
                        I
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={() => insertLinePrefix("# ")}
                      >
                        H1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={() => insertLinePrefix("- ")}
                      >
                        List
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={() => insertWrappedText("`")}
                      >
                        Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body"
                        onClick={insertLink}
                      >
                        Link
                      </Button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder={t("sessionNotes.contentPlaceholder")}
                      className="min-h-[220px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-body shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground font-body">
                      {t("sessionNotes.markdownHelp")}
                    </p>
                  </>
                )}

                {isPreview && (
                  <div className="min-h-[220px] rounded-md border border-primary/10 bg-background/70 p-4 text-sm font-body text-foreground">
                    {draftContent.trim() ? (
                      <div
                        className="space-y-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_code]:rounded [&_code]:bg-muted/40 [&_code]:px-1 [&_pre]:rounded [&_pre]:bg-muted/40 [&_pre]:p-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground font-body">
                        {t("sessionNotes.previewEmpty")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="font-body"
                >
                  {isSaving ? t("sessionNotes.savingNote") : t("sessionNotes.saveNote")}
                </Button>
                {activeNoteId && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="font-body"
                  >
                    {isDeleting ? t("sessionNotes.deletingNote") : t("sessionNotes.deleteNote")}
                  </Button>
                )}
                {activeNoteId && (
                  <Button
                    variant="outline"
                    onClick={resetDraft}
                    className="font-body"
                  >
                    {t("sessionNotes.newNote")}
                  </Button>
                )}
              </div>

              {activeNoteId && (
                <div className="text-xs text-muted-foreground font-body">
                  {t("sessionNotes.createdOn", { date: formatDateTime(
                    notes.find((note) => note.id === activeNoteId)?.created_at || ""
                  ) })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
