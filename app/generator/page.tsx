"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { User } from "@/types/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { ContentType, GeneratedContent, Character, Environment, Mission } from "@/types/rpg"

export default function GeneratorPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scenario, setScenario] = useState("")
  const [contentType, setContentType] = useState<ContentType>("character")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generationSuccess, setGenerationSuccess] = useState(false)

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

  // Clear generated content when content type changes
  useEffect(() => {
    setGeneratedContent(null)
    setGenerationSuccess(false)
    setSaveSuccess(false)
    setSaveError(null)
  }, [contentType])

  async function handleGenerate() {
    if (!scenario.trim()) {
      setError("Please describe what you want to generate")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)
    setSaveSuccess(false)

    try {
      // Get the access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated. Please sign in again.")
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scenario: scenario.trim(),
          contentType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to generate content")
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let parsedContent: GeneratedContent | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Try to parse complete JSON from buffer
        // For mock streaming, the entire JSON comes in chunks
        try {
          const content = JSON.parse(buffer)
          parsedContent = content.content
          setGeneratedContent(parsedContent)
          buffer = "" // Clear buffer after successful parse
          break // Exit loop once we have the content
        } catch {
          // JSON is incomplete, continue reading
        }
      }

      // Final parse attempt for any remaining data
      if (!parsedContent && buffer.trim()) {
        try {
          const content = JSON.parse(buffer)
          parsedContent = content.content
          setGeneratedContent(parsedContent)
        } catch (err) {
          console.error("Failed to parse final content:", err)
          throw new Error("Failed to parse generated content")
        }
      }

      if (!parsedContent) {
        throw new Error("No content was generated")
      }

      // Show success notification
      setGenerationSuccess(true)
      setTimeout(() => setGenerationSuccess(false), 5000)

      // Auto-save after successful generation
      await handleAutoSave(parsedContent)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleAutoSave(contentToSave?: GeneratedContent) {
    const content = contentToSave || generatedContent
    if (!content || !user) return

    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      // Get the access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setSaveError("Not authenticated. Please sign in again to save content.")
        return
      }

      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: contentType,
          scenario: scenario.trim(),
          contentData: content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        const errorMessage = errorData.error || errorData.message || "Failed to save content"
        setSaveError(errorMessage)
        console.error("Save error:", errorMessage)
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save content"
      setSaveError(errorMessage)
      console.error("Auto-save failed:", err)
    } finally {
      setIsSaving(false)
    }
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
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold">RPG Content Generator</h1>
            <p className="mt-2 text-muted-foreground font-body">
              Describe what you need, and AI will create it for your campaign
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="font-body">
              <Link href="/library">📚 Library</Link>
            </Button>
            <Button asChild variant="outline" className="font-body">
              <Link href="/profile">Profile</Link>
            </Button>
            <Button asChild variant="outline" className="font-body">
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="font-body">
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
            <AlertDescription className="font-body">
              {error}
              {error.includes("Failed") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 mt-2 font-body"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Generator Form */}
        <Card className="parchment ornate-border">
          <CardHeader>
            <CardTitle className="font-display text-2xl">What do you need?</CardTitle>
            <CardDescription className="font-body">
              Describe the situation or what you want to create. For example: "In this tavern there's a Bard who talks about an ancient flute"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Type Selection */}
            <div className="space-y-3">
              <Label className="font-body text-base font-semibold">Content Type</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "character" as ContentType,
                    label: "🎭 Character/NPC",
                    desc: "Generate a character with background, skills, and personality",
                  },
                  {
                    value: "environment" as ContentType,
                    label: "🗺️ Environment",
                    desc: "Create a location with atmosphere and details",
                  },
                  {
                    value: "mission" as ContentType,
                    label: "⚔️ Mission/Quest",
                    desc: "Design a quest with objectives and rewards",
                  },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setContentType(type.value)}
                    disabled={isGenerating}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      contentType === type.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="font-display text-lg font-semibold mb-1">
                      {type.label}
                    </div>
                    <div className="text-sm text-muted-foreground font-body">
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Input */}
            <div className="space-y-3">
              <Label htmlFor="scenario" className="font-body text-base font-semibold">
                Describe Your Scenario
              </Label>
              <textarea
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder='Example: "In this tavern there is a Bard and he will talk with the heroes about an ancient flute"'
                rows={8}
                disabled={isGenerating}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-body resize-none"
              />
              <p className="text-xs text-muted-foreground font-body">
                Be as detailed or as simple as you want. The AI will expand on your description.
              </p>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end gap-4">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !scenario.trim()}
                size="lg"
                className="min-w-[160px] font-display text-lg"
              >
                {isGenerating ? (
                  <>
                    <span className="mr-2">⚡</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Example Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-xl">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-body">
              <p>• Be specific about the setting and context</p>
              <p>• Mention important details (race, class, mood, etc.)</p>
              <p>• Include any special requirements or constraints</p>
              <p>• The more context you provide, the better the results</p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-xl">📝 Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-body">
              <button
                type="button"
                onClick={() => {
                  setContentType("character")
                  setScenario("In this tavern there's a Bard and he will talk with the heroes about an ancient flute")
                }}
                className="text-left text-primary hover:underline w-full"
                disabled={isGenerating}
              >
                "A mysterious Bard in a tavern talking about an ancient flute"
              </button>
              <button
                type="button"
                onClick={() => {
                  setContentType("environment")
                  setScenario("A dark, abandoned wizard's tower filled with magical traps and ancient artifacts")
                }}
                className="text-left text-primary hover:underline w-full"
                disabled={isGenerating}
              >
                "A dark wizard's tower with traps and artifacts"
              </button>
              <button
                type="button"
                onClick={() => {
                  setContentType("mission")
                  setScenario("The heroes must retrieve a stolen magical artifact from a thieves' guild hideout")
                }}
                className="text-left text-primary hover:underline w-full"
                disabled={isGenerating}
              >
                "Retrieve a stolen artifact from thieves' guild"
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Content Display */}
        {isGenerating && !generatedContent && (
          <Card className="parchment ornate-border animate-in fade-in">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-4xl animate-bounce">⚡</div>
                <p className="font-display text-xl">Generating your content...</p>
                <p className="font-body text-sm text-muted-foreground">
                  The AI is crafting your {contentType} based on your scenario
                </p>
                <div className="flex justify-center gap-1 pt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Success Notification */}
        {generationSuccess && (
          <Alert className="bg-green-500/10 border-green-500 animate-in fade-in slide-in-from-top-2 shadow-lg">
            <AlertDescription className="font-body flex items-center gap-2 text-green-600 dark:text-green-400">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-display font-semibold text-lg">Content Generated Successfully!</p>
                <p className="text-sm">Your {contentType} has been created and is displayed below.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {generatedContent && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {saveSuccess && (
              <Alert className="bg-primary/10 border-primary animate-in fade-in slide-in-from-top-2">
                <AlertDescription className="font-body flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span>Content saved successfully to your library!</span>
                </AlertDescription>
              </Alert>
            )}
            {saveError && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertDescription className="font-body">
                  <strong>Save failed:</strong> {saveError}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 mt-2 font-body"
                    onClick={() => handleAutoSave()}
                    disabled={isSaving}
                  >
                    Retry Save
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {isSaving && (
              <Alert className="animate-pulse">
                <AlertDescription className="font-body">
                  Saving content...
                </AlertDescription>
              </Alert>
            )}
            {contentType === "character" && "name" in generatedContent && "race" in generatedContent && (
              <CharacterCard character={generatedContent as Character} />
            )}
            {contentType === "environment" && "name" in generatedContent && "description" in generatedContent && !("race" in generatedContent) && !("title" in generatedContent) && (
              <EnvironmentCard environment={generatedContent as Environment} />
            )}
            {contentType === "mission" && "title" in generatedContent && "description" in generatedContent && (
              <MissionCard mission={generatedContent as Mission} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

