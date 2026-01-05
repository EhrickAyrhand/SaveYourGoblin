"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getCurrentUser, signOut } from "@/lib/auth"
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

type ContentType = "character" | "environment" | "mission"

export default function GeneratorPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scenario, setScenario] = useState("")
  const [contentType, setContentType] = useState<ContentType>("character")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleGenerate() {
    if (!scenario.trim()) {
      setError("Please describe what you want to generate")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // TODO: Connect to AI API
      // For now, just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      // This will be replaced with actual AI API call
      console.log("Generating:", { scenario, contentType })
      
      // Show success message (will be replaced with actual content display)
      alert("AI generation will be implemented soon! This is just a preview.")
      
    } catch (err) {
      setError("Failed to generate content. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
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
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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

        {/* Placeholder for Generated Content */}
        {/* This will be replaced with actual content display components later */}
      </div>
    </div>
  )
}

