"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, Link } from '@/i18n/routing'
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<LibraryContentItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
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

    // Apply tag filter
    if (selectedTag) {
      processed = processed.filter(item => 
        item.tags && item.tags.includes(selectedTag)
      )
    }

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
  }, [content, sortBy, selectedTag, debouncedSearch])

  // Reset tag filter when type changes
  useEffect(() => {
    setSelectedTag(null)
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
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-5xl font-bold mb-3">{t('library.title')}</h1>
            <p className="mt-2 text-base text-muted-foreground font-body">
              {t('library.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <NavigationDropdown onSignOut={handleSignOut} />
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
        <Card className="parchment ornate-border">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Type Filters */}
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "all" as const, label: t('library.all'), icon: "📚", count: counts.total },
                  { value: "character" as const, label: t('generator.contentType.character'), icon: "🎭", count: counts.characters },
                  { value: "environment" as const, label: t('generator.contentType.environment'), icon: "🗺️", count: counts.environments },
                  { value: "mission" as const, label: t('generator.contentType.mission'), icon: "⚔️", count: counts.missions },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedType(filter.value)}
                    disabled={isFetching}
                    className={`rounded-lg border-2 px-5 py-2.5 text-base font-body transition-all font-medium ${
                      selectedType === filter.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    } ${isFetching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="mr-2 text-lg">{filter.icon}</span>
                    {filter.label} ({filter.count})
                  </button>
                ))}
                {/* Favorites Filter */}
                <button
                  type="button"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  disabled={isFetching}
                  className={`rounded-lg border-2 px-5 py-2.5 text-base font-body transition-all font-medium ${
                    showFavoritesOnly
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  } ${isFetching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="mr-2 text-lg">{showFavoritesOnly ? "⭐" : "☆"}</span>
                  {t('library.favorites')} ({counts.favorites})
                </button>
              </div>

              {/* Search and Sort */}
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('library.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isFetching}
                    className="w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-body"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort and Tag Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Sort Options */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-body">{t('library.sortBy')}:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "alphabetical")}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="newest">{t('library.sortNewest')}</option>
                      <option value="oldest">{t('library.sortOldest')}</option>
                      <option value="alphabetical">{t('library.sortAlphabetical')}</option>
                    </select>
                  </div>

                  {/* Tag Filter */}
                  {allTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground font-body">{t('library.filterByTag')}:</span>
                      <select
                        value={selectedTag || ""}
                        onChange={(e) => setSelectedTag(e.target.value || null)}
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">{t('library.allTags')}</option>
                        {allTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                      {selectedTag && (
                        <button
                          type="button"
                          onClick={() => setSelectedTag(null)}
                          className="text-sm text-muted-foreground hover:text-foreground font-body"
                          title={t('library.clearTagFilter')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary">
                  <div className="font-body text-sm">
                    {selectedIds.size} {t('library.selected')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkToggleFavorite.bind(null, true)}
                      disabled={isBulkDeleting}
                      className="font-body"
                    >
                      {t('library.bulkFavorite')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkToggleFavorite.bind(null, false)}
                      disabled={isBulkDeleting}
                      className="font-body"
                    >
                      {t('library.bulkUnfavorite')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="font-body"
                    >
                      {isBulkDeleting ? t('library.bulkDeleting') : t('library.bulkDelete')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Results Count and Select All */}
              {!isFetching && (
                <div className="flex items-center justify-between">
                  <p className="text-base text-muted-foreground font-body font-medium">
                    {filteredContent.length} {filteredContent.length === 1 ? t('library.item') : t('library.items')} found
                    {selectedType !== "all" && ` (${selectedType}s)`}
                  </p>
                  {filteredContent.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="font-body"
                      >
                        {t('library.selectAll')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="font-body"
                      >
                        {t('library.deselectAll')}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="parchment ornate-border animate-pulse">
                <CardHeader>
                  <div className="h-6 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted rounded mb-2" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <Card className="parchment ornate-border">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="text-7xl">📚</div>
                <div>
                  <h3 className="font-display text-3xl font-semibold mb-3">{t('library.empty')}</h3>
                  <p className="font-body text-base text-muted-foreground mb-6">
                    {content.length === 0
                      ? t('library.emptyDescription')
                      : t('library.tryAdjustingFilters')}
                  </p>
                  {content.length === 0 && (
                    <Button asChild size="lg" className="font-body text-lg px-6 py-6">
                      <Link href="/generator">{t('library.generateFirstContent')}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {filteredContent.map((item) => (
              <div key={item.id} className="relative group/checkbox flex flex-col">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="absolute top-3 left-3 z-10 w-5 h-5 cursor-pointer bg-background/90 backdrop-blur-sm border-2 border-primary/50 rounded checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm transition-all hover:border-primary hover:scale-110"
                  onClick={(e) => e.stopPropagation()}
                />
                <LibraryCard
                  item={item}
                  onView={handleView}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={handleToggleFavorite}
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
          />
        )}
      </div>
    </div>
  )
}
