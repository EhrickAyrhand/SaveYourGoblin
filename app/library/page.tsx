"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { User } from "@/types/auth"
import type { ContentType } from "@/types/rpg"
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<LibraryContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<LibraryContentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LibraryContentItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedType, debouncedSearch])

  // Use content directly from API (server-side filtered)
  useEffect(() => {
    setFilteredContent(content)
  }, [content])

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
          <p className="text-muted-foreground font-body">Loading...</p>
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
            <h1 className="font-display text-5xl font-bold mb-3">Your Content Library</h1>
            <p className="mt-2 text-base text-muted-foreground font-body">
              Browse and manage all your generated RPG content
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
                Retry
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
                  { value: "all" as const, label: "All", icon: "📚" },
                  { value: "character" as const, label: "Characters", icon: "🎭" },
                  { value: "environment" as const, label: "Environments", icon: "🗺️" },
                  { value: "mission" as const, label: "Missions", icon: "⚔️" },
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
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by scenario or content name..."
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

              {/* Results Count */}
              {!isFetching && (
                <p className="text-base text-muted-foreground font-body font-medium">
                  {filteredContent.length} {filteredContent.length === 1 ? "item" : "items"} found
                  {selectedType !== "all" && ` (${selectedType}s)`}
                </p>
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
                  <h3 className="font-display text-3xl font-semibold mb-3">No Content Found</h3>
                  <p className="font-body text-base text-muted-foreground mb-6">
                    {content.length === 0
                      ? "You haven't generated any content yet. Start creating amazing RPG content!"
                      : "Try adjusting your filters or search query."}
                  </p>
                  {content.length === 0 && (
                    <Button asChild size="lg" className="font-body text-lg px-6 py-6">
                      <Link href="/generator">Generate Your First Content</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                onView={handleView}
                onDelete={handleDelete}
              />
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
          />
        )}
      </div>
    </div>
  )
}

