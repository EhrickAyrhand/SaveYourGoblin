"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, Link } from '@/i18n/routing'
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { isRecoverySessionActive, isResetPasswordRoute } from "@/lib/recovery-session"
import type { User } from "@/types/auth"
import type { ContentType, Character, Environment, Mission } from "@/types/rpg"
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
import { NavigationDropdown } from "@/components/ui/navigation-dropdown"
import { LibraryCard } from "@/components/rpg/library-card"
import { ContentDetailModal } from "@/components/rpg/content-detail-modal"
import { ContentComparisonModal } from "@/components/rpg/content-comparison-modal"

export default function LibraryPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<LibraryContentItem[]>([])
  const [allContent, setAllContent] = useState<LibraryContentItem[]>([]) // All content for counts
  const [filteredContent, setFilteredContent] = useState<LibraryContentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical">("newest")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LibraryContentItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [itemsToCompare, setItemsToCompare] = useState<[LibraryContentItem, LibraryContentItem] | null>(null)
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)

  useEffect(() => {
    // SECURITY: Check recovery session SYNCHRONOUSLY before any async operations
    // Only block if this is a protected route (not reset-password page)
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
        
        // Check email verification - redirect unverified users to verify-email
        if (!currentUser.emailVerified) {
          router.push(`/verify-email?email=${encodeURIComponent(currentUser.email)}`)
          return
        }
        
        setUser(currentUser)
      } catch (err) {
        setError("Failed to load user data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (user) {
      fetchContent()
      fetchAllContent() // Fetch all content for counts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedType, debouncedSearch, showFavoritesOnly])

  // Get all unique tags from all content
  const allTags = Array.from(
    new Set(
      allContent
        .flatMap(item => item.tags || [])
        .filter(tag => tag && tag.trim().length > 0)
    )
  ).sort()

  // Helper function to get content name for sorting
  function getContentName(item: LibraryContentItem): string {
    if (item.type === "character") {
      return (item.content_data as Character).name
    } else if (item.type === "environment") {
      return (item.content_data as Environment).name
    } else {
      return (item.content_data as Mission).title
    }
  }

  // Sort and filter content client-side for better UX
  // Also enhance search to include tags (since SQL can't search TEXT[] arrays easily)
  useEffect(() => {
    let processed = [...content]

    // Enhanced search: also search in content_data (JSONB) and tags client-side
    // SQL already searched scenario_input and notes, so items in processed matched those
    // Now we also check if content_data or tags match the search query
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase()
      // Fetch all content to search in content_data and tags (since SQL can't do it efficiently)
      // For now, we'll search in the already-fetched items that matched scenario/notes
      // In the future, we could fetch all items and filter entirely client-side for better results
      const allItemsForSearch = allContent.length > 0 ? allContent : processed
      const contentDataMatches = allItemsForSearch.filter(item => {
        const contentDataStr = JSON.stringify(item.content_data).toLowerCase()
        return contentDataStr.includes(searchLower)
      })
      const tagMatches = allItemsForSearch.filter(item => {
        return item.tags && Array.isArray(item.tags) && 
          item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      })
      const additionalMatches = [...contentDataMatches, ...tagMatches]
        .filter(item => !processed.some(p => p.id === item.id))
      processed = [...processed, ...additionalMatches]
    }

    // Tag filtering is now done in API, so this is just for display
    // Client-side tag filter removed since API handles it

    // Apply sorting
    processed.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === "alphabetical") {
        const nameA = getContentName(a).toLowerCase()
        const nameB = getContentName(b).toLowerCase()
        return nameA.localeCompare(nameB)
      }
      return 0
    })

    setFilteredContent(processed)
  }, [content, sortBy, debouncedSearch, allContent])

  // Reset tag filter when type changes
  useEffect(() => {
    setSelectedTags([])
  }, [selectedType])

  async function fetchAllContent() {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      // Fetch all content without filters for counts
      const response = await fetch(`/api/content`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setAllContent(result.data || [])
      }
    } catch (err) {
      // Silently fail - counts will just be based on filtered content
      console.error("Failed to fetch all content for counts:", err)
    }
  }

  async function fetchContent() {
    if (!user) return

    setIsFetching(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated. Please sign in again.")
      }

      const params = new URLSearchParams()
      if (selectedType !== "all") {
        params.append("type", selectedType)
      }
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim())
      }
      if (showFavoritesOnly) {
        params.append("favorite", "true")
      }
      if (selectedTags.length > 0) {
        params.append("tags", selectedTags.join(","))
      }
      if (dateFrom) {
        params.append("dateFrom", dateFrom)
      }
      if (dateTo) {
        params.append("dateTo", dateTo)
      }

      const response = await fetch(`/api/content?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to fetch content")
      }

      const result = await response.json()
      setContent(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content")
      console.error(err)
    } finally {
      setIsFetching(false)
    }
  }

  async function handleDuplicate(item: LibraryContentItem) {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      // Create a copy of the content with a new scenario (add "Copy" suffix)
      const duplicatedScenario = `${item.scenario_input} (Copy)`
      
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: item.type,
          scenario: duplicatedScenario,
          contentData: item.content_data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to duplicate content")
      }

      // Refresh content list and all content for counts
      await fetchContent()
      await fetchAllContent()
    } catch (err) {
      console.error("Duplicate error:", err)
      setError(err instanceof Error ? err.message : "Failed to duplicate content")
    }
  }

  async function handleGenerateVariation(item: LibraryContentItem) {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch("/api/generate/variation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          originalContentId: item.id,
          contentType: item.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to generate variation")
      }

      const result = await response.json()
      
      // Refresh content list and all content for counts
      await fetchContent()
      await fetchAllContent()
      
      // Optionally open the new variation in detail modal
      if (result.data) {
        setSelectedItem(result.data)
        setIsModalOpen(true)
      }
    } catch (err) {
      console.error("Variation generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate variation")
    }
  }

  async function handleDelete(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/content/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to delete content")
      }

      // Remove from local state
      setContent((prev) => prev.filter((item) => item.id !== id))
      setAllContent((prev) => prev.filter((item) => item.id !== id))

      // Close modal if deleting the selected item
      if (selectedItem?.id === id) {
        setIsModalOpen(false)
        setSelectedItem(null)
      }
    } catch (err) {
      console.error("Delete error:", err)
      setError(err instanceof Error ? err.message : "Failed to delete content")
    }
  }

  async function handleToggleFavorite(id: string, isFavorite: boolean) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          is_favorite: isFavorite,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        // If migration is required, show helpful message
        if (errorData.migrationRequired) {
          throw new Error(errorData.message || "Database migration required. Please run the migration to use favorites.")
        }
        throw new Error(errorData.error || errorData.message || "Failed to update favorite status")
      }

      // Update local state
      setContent((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_favorite: isFavorite } : item
        )
      )
      setAllContent((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_favorite: isFavorite } : item
        )
      )
    } catch (err) {
      console.error("Toggle favorite error:", err)
      setError(err instanceof Error ? err.message : "Failed to update favorite status")
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function handleSelectAll() {
    setSelectedIds(new Set(filteredContent.map(item => item.id)))
  }

  function handleDeselectAll() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)? This action cannot be undone.`)) {
      return
    }

    setIsBulkDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      // Delete all selected items
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/content/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      )

      await Promise.all(deletePromises)
      
      // Refresh content and clear selection
      await fetchContent()
      await fetchAllContent()
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Bulk delete error:", err)
      setError(err instanceof Error ? err.message : "Failed to delete items")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  async function handleBulkToggleFavorite(isFavorite: boolean) {
    if (selectedIds.size === 0) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      // Update all selected items
      const updatePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/content/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            is_favorite: isFavorite,
          }),
        })
      )

      await Promise.all(updatePromises)
      
      // Refresh content and clear selection
      await fetchContent()
      await fetchAllContent()
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Bulk favorite error:", err)
      setError(err instanceof Error ? err.message : "Failed to update favorites")
    }
  }

  function handleCompare() {
    const selected = filteredContent.filter(item => selectedIds.has(item.id))
    if (selected.length !== 2) {
      setError(t('comparison.selectTwoItems'))
      return
    }
    if (selected[0].type !== selected[1].type) {
      setError(t('comparison.sameTypeRequired'))
      return
    }
    setItemsToCompare([selected[0], selected[1]] as [LibraryContentItem, LibraryContentItem])
    setIsComparisonOpen(true)
  }

  // Calculate counts for filter buttons from allContent (unfiltered)
  const counts = {
    total: allContent.length,
    characters: allContent.filter(item => item.type === "character").length,
    environments: allContent.filter(item => item.type === "environment").length,
    missions: allContent.filter(item => item.type === "mission").length,
    favorites: allContent.filter(item => item.is_favorite).length,
  }

  function handleView(item: LibraryContentItem) {
    setSelectedItem(item)
    setIsModalOpen(true)
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
          <p className="text-muted-foreground font-body">{t('library.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header with decorative border */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/20"></div>
          <div className="relative flex items-center justify-between p-6 md:p-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl md:text-6xl">📚</span>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                  {t('library.title')}
                </h1>
              </div>
              <p className="mt-3 text-base md:text-lg text-muted-foreground font-body pl-1">
                {t('library.subtitle')}
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
                onClick={fetchContent}
                disabled={isFetching}
              >
                {t('library.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card className="parchment ornate-border border-2 border-primary/20 shadow-lg">
          <CardHeader className="pb-4 border-b border-primary/10">
            <CardTitle className="font-display text-2xl font-bold text-primary flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              {t('library.filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="space-y-8">
              {/* Type Filters */}
              <div>
                <h3 className="font-body text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                  {t('library.filterByType')}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: "all" as const, label: t('library.all'), icon: "📚", count: counts.total, color: "from-blue-500/20 to-purple-500/20 border-blue-500/50" },
                    { value: "character" as const, label: t('generator.contentType.character'), icon: "🎭", count: counts.characters, color: "from-purple-500/20 to-pink-500/20 border-purple-500/50" },
                    { value: "environment" as const, label: t('generator.contentType.environment'), icon: "🗺️", count: counts.environments, color: "from-green-500/20 to-emerald-500/20 border-green-500/50" },
                    { value: "mission" as const, label: t('generator.contentType.mission'), icon: "⚔️", count: counts.missions, color: "from-red-500/20 to-orange-500/20 border-red-500/50" },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedType(filter.value)}
                      disabled={isFetching}
                      className={`relative rounded-xl border-2 px-6 py-3 text-base font-body transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 ${
                        selectedType === filter.value
                          ? `bg-gradient-to-br ${filter.color} border-primary text-primary shadow-lg scale-105`
                          : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                      } ${isFetching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="mr-2 text-xl">{filter.icon}</span>
                      {filter.label} <span className="ml-2 text-sm font-bold">({filter.count})</span>
                      {selectedType === filter.value && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                  {/* Favorites Filter */}
                  <button
                    type="button"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    disabled={isFetching}
                    className={`relative rounded-xl border-2 px-6 py-3 text-base font-body transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 ${
                      showFavoritesOnly
                        ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/50 text-primary shadow-lg scale-105"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                    } ${isFetching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="mr-2 text-xl">{showFavoritesOnly ? "⭐" : "☆"}</span>
                    {t('library.favorites')} <span className="ml-2 text-sm font-bold">({counts.favorites})</span>
                    {showFavoritesOnly && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              {/* Search and Sort */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-body text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                    {t('library.searchAndSort')}
                  </h3>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔎</div>
                    <input
                      type="text"
                      placeholder={t('library.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isFetching}
                      className="w-full rounded-xl border-2 border-primary/20 bg-background pl-14 pr-12 py-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed font-body shadow-sm hover:shadow-md transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Sort and Tag Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Sort Options */}
                  <div className="flex items-center gap-3 bg-primary/5 rounded-lg px-4 py-2 border border-primary/10">
                    <span className="text-sm font-semibold text-muted-foreground font-body">{t('library.sortBy')}:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "alphabetical")}
                      className="rounded-lg border-2 border-primary/20 bg-background px-4 py-2 text-sm font-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                    >
                      <option value="newest">{t('library.sortNewest')}</option>
                      <option value="oldest">{t('library.sortOldest')}</option>
                      <option value="alphabetical">{t('library.sortAlphabetical')}</option>
                    </select>
                  </div>

                  {/* Tag Filter - Multi-select */}
                  {allTags.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap bg-primary/5 rounded-lg px-4 py-2 border border-primary/10">
                      <span className="text-sm font-semibold text-muted-foreground font-body">{t('library.filterByTag')}:</span>
                      <div className="flex flex-wrap gap-2 items-center">
                        {selectedTags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 border border-primary/50 rounded-lg text-sm font-body font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                              className="text-muted-foreground hover:text-foreground font-bold text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                              title={t('library.removeTag')}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <select
                          value=""
                          onChange={(e) => {
                            const newTag = e.target.value
                            if (newTag && !selectedTags.includes(newTag)) {
                              setSelectedTags(prev => [...prev, newTag])
                            }
                            e.target.value = "" // Reset select
                          }}
                          className="rounded-lg border-2 border-primary/20 bg-background px-3 py-1 text-sm font-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                        >
                          <option value="">+ {t('library.addTagFilter')}</option>
                          {allTags.filter(tag => !selectedTags.includes(tag)).map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </div>
                      {selectedTags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTags([])}
                          className="text-sm text-muted-foreground hover:text-foreground font-body font-semibold px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                          title={t('library.clearAllTags')}
                        >
                          {t('library.clearAll')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Advanced Search Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className="font-body"
                  >
                    {showAdvancedSearch ? "▼" : "▶"} {t('library.advancedSearch')}
                  </Button>
                </div>

                {/* Advanced Search Panel */}
                {showAdvancedSearch && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
                    <h3 className="font-body text-sm font-semibold text-muted-foreground">{t('library.dateRange')}</h3>
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-body text-muted-foreground">{t('library.dateFrom')}:</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="rounded-lg border-2 border-primary/20 bg-background px-3 py-2 text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                        />
                        {dateFrom && (
                          <button
                            type="button"
                            onClick={() => setDateFrom("")}
                            className="text-muted-foreground hover:text-foreground font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-body text-muted-foreground">{t('library.dateTo')}:</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="rounded-lg border-2 border-primary/20 bg-background px-3 py-2 text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                        />
                        {dateTo && (
                          <button
                            type="button"
                            onClick={() => setDateTo("")}
                            className="text-muted-foreground hover:text-foreground font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {(dateFrom || dateTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDateFrom("")
                            setDateTo("")
                          }}
                          className="font-body text-xs"
                        >
                          {t('library.clearDates')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 rounded-xl border-2 border-primary/30 shadow-lg">
                  <div className="font-body text-base font-semibold text-primary flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    {selectedIds.size} {t('library.selected')}
                  </div>
                  <div className="flex gap-3">
                    {selectedIds.size === 2 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleCompare}
                        className="font-body shadow-md"
                      >
                        ⚖️ {t('library.compare')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkToggleFavorite.bind(null, true)}
                      disabled={isBulkDeleting}
                      className="font-body border-primary/30 hover:bg-yellow-500/10 hover:border-yellow-500/50"
                    >
                      ⭐ {t('library.bulkFavorite')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkToggleFavorite.bind(null, false)}
                      disabled={isBulkDeleting}
                      className="font-body border-primary/30 hover:bg-muted"
                    >
                      ☆ {t('library.bulkUnfavorite')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="font-body shadow-md"
                    >
                      {isBulkDeleting ? "⏳" : "🗑️"} {isBulkDeleting ? t('library.bulkDeleting') : t('library.bulkDelete')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Results Count and Select All */}
              {!isFetching && (
                <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                  <p className="text-base text-foreground font-body font-semibold flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span className="text-primary">{filteredContent.length}</span> {filteredContent.length === 1 ? t('library.item') : t('library.items')} {t('library.found')}
                    {selectedType !== "all" && <span className="text-muted-foreground">({selectedType}s)</span>}
                  </p>
                  {filteredContent.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="font-body border-primary/30 hover:bg-primary/10"
                      >
                        ✓ {t('library.selectAll')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="font-body border-primary/30 hover:bg-primary/10"
                      >
                        ✕ {t('library.deselectAll')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        {isFetching ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="parchment ornate-border animate-pulse border-2 border-primary/10">
                <CardHeader>
                  <div className="h-7 w-40 bg-muted/50 rounded mb-3" />
                  <div className="h-4 w-28 bg-muted/50 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted/50 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-muted/50 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <Card className="parchment ornate-border border-2 border-primary/20 shadow-xl">
            <CardContent className="p-12 md:p-16 text-center">
              <div className="space-y-8">
                <div className="text-8xl md:text-9xl animate-bounce">📚</div>
                <div>
                  <h3 className="font-display text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
                    {t('library.empty')}
                  </h3>
                  <p className="font-body text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                    {content.length === 0
                      ? t('library.emptyDescription')
                      : t('library.tryAdjustingFilters')}
                  </p>
                  {content.length === 0 && (
                    <Button asChild size="lg" className="font-body text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      <Link href="/generator">
                        <span className="mr-2 text-xl">✨</span>
                        {t('library.generateFirstContent')}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {filteredContent.map((item) => (
              <div key={item.id} className="relative group flex flex-col">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="absolute top-3 right-3 z-30 w-4 h-4 cursor-pointer bg-background/95 backdrop-blur-sm border-2 border-primary/60 rounded checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md transition-all hover:border-primary hover:scale-110 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                />
                <LibraryCard
                  item={item}
                  onView={handleView}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={handleToggleFavorite}
                  onGenerateVariation={handleGenerateVariation}
                />
              </div>
            ))}
          </div>
        )}

        {/* Content Detail Modal */}
        {selectedItem && (
          <ContentDetailModal
            item={selectedItem}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedItem(null)
            }}
            onDelete={handleDelete}
            onUpdate={(updatedItem) => {
              setContent((prev) =>
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              )
              setSelectedItem(updatedItem)
            }}
            onGenerateVariation={handleGenerateVariation}
          />
        )}

        {/* Content Comparison Modal */}
        {itemsToCompare && (
          <ContentComparisonModal
            items={itemsToCompare}
            isOpen={isComparisonOpen}
            onClose={() => {
              setIsComparisonOpen(false)
              setItemsToCompare(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
