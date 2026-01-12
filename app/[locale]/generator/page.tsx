"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
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
import { AnimatedBanner } from "@/components/ui/animated-banner"
import { NavigationDropdown } from "@/components/ui/navigation-dropdown"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { ContentType, GeneratedContent, Character, Environment, Mission } from "@/types/rpg"

interface GeneratorState {
  generatedContent: GeneratedContent | null
  scenario: string
  contentType: ContentType
  timestamp: number
}

export default function GeneratorPage() {
  const t = useTranslations()
  const locale = useLocale()
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
  const [showGenerationBanner, setShowGenerationBanner] = useState(false)
  const [showSaveBanner, setShowSaveBanner] = useState(false)
  const generatedContentRef = useRef<HTMLDivElement>(null)
  const hasRestoredState = useRef(false)
  const previousUserRef = useRef<User | null>(null)

  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        setUser(currentUser)
        previousUserRef.current = currentUser
      } catch (err) {
        setError("Failed to load user data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  // Restore state from localStorage on mount
  useEffect(() => {
    if (!user || hasRestoredState.current) return

    try {
      const savedState = localStorage.getItem(`generator_state_${user.id}`)
      if (savedState) {
        const parsed: GeneratorState = JSON.parse(savedState)
        setScenario(parsed.scenario || "")
        setContentType(parsed.contentType || "character")
        if (parsed.generatedContent) {
          setGeneratedContent(parsed.generatedContent)
        }
        hasRestoredState.current = true
      }
    } catch (err) {
      console.error("Failed to restore generator state:", err)
      hasRestoredState.current = true
    }
  }, [user])

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!user || !hasRestoredState.current) return

    try {
      const stateToSave: GeneratorState = {
        generatedContent,
        scenario,
        contentType,
        timestamp: Date.now(),
      }
      localStorage.setItem(`generator_state_${user.id}`, JSON.stringify(stateToSave))
    } catch (err) {
      console.error("Failed to save generator state:", err)
    }
  }, [generatedContent, scenario, contentType, user])

  // Reset state when user changes
  useEffect(() => {
    if (previousUserRef.current && user && previousUserRef.current.id !== user.id) {
      hasRestoredState.current = false
      setGeneratedContent(null)
      setScenario("")
      setContentType("character")
    }
    previousUserRef.current = user
  }, [user])

  // Clear generated content and scenario when content type changes (only after initial restore)
  useEffect(() => {
    if (!hasRestoredState.current) return

    setGeneratedContent(null)
    setGenerationSuccess(false)
    setSaveSuccess(false)
    setSaveError(null)
    setShowGenerationBanner(false)
    setShowSaveBanner(false)
    setScenario("")
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
        
        try {
          const content = JSON.parse(buffer)
          parsedContent = content.content
          setGeneratedContent(parsedContent)
          buffer = ""
          break
        } catch {
          // JSON is incomplete, continue reading
        }
      }

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

      setGenerationSuccess(true)
      setShowGenerationBanner(true)
      
      setTimeout(() => {
        generatedContentRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveContent() {
    if (!generatedContent || !user) return

    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
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
          contentData: generatedContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        const errorMessage = errorData.error || errorData.message || t('generator.saveError')
        setSaveError(errorMessage)
        console.error("Save error:", errorMessage)
        return
      }

      setSaveSuccess(true)
      setShowSaveBanner(true)
      setTimeout(() => {
        setShowSaveBanner(false)
        setSaveSuccess(false)
      }, 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('generator.saveError')
      setSaveError(errorMessage)
      console.error("Save failed:", err)
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
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-2 pt-4">
        {showSaveBanner && (
          <AnimatedBanner
            title={t('generator.saveSuccess')}
            message={t('success.saved')}
            variant="success"
            onDismiss={() => {
              setShowSaveBanner(false)
              setSaveSuccess(false)
            }}
          />
        )}
        {showGenerationBanner && !showSaveBanner && (
          <AnimatedBanner
            title={t('generator.generationSuccessTitle')}
            message={t('generator.generationSuccessMessage', { contentType: t(`generator.contentType.${contentType}`) })}
            variant="success"
            onDismiss={() => {
              setShowGenerationBanner(false)
              setGenerationSuccess(false)
            }}
          />
        )}
      </div>
      
      <div className="mx-auto max-w-5xl space-y-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-5xl font-bold mb-3 whitespace-nowrap">{t('generator.title')}</h1>
            <p className="mt-2 text-base text-muted-foreground font-body">
              {t('generator.description')}
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
              {error.includes("Failed") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 mt-2 font-body"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {t('generator.retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="parchment ornate-border">
          <CardHeader>
            <CardTitle className="font-display text-3xl mb-2">{t('generator.cardTitle')}</CardTitle>
            <CardDescription className="font-body text-base">
              {t('generator.cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4">
              <Label className="font-body text-lg font-semibold">{t('generator.contentTypeLabel')}</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    value: "character" as ContentType,
                    icon: "🎭",
                    label: t('generator.contentType.character'),
                    desc: t('generator.contentTypeDesc.character'),
                    color: "from-purple-500/20 to-blue-500/20",
                    borderColor: "border-purple-500/50",
                  },
                  {
                    value: "environment" as ContentType,
                    icon: "🗺️",
                    label: t('generator.contentType.environment'),
                    desc: t('generator.contentTypeDesc.environment'),
                    color: "from-green-500/20 to-emerald-500/20",
                    borderColor: "border-green-500/50",
                  },
                  {
                    value: "mission" as ContentType,
                    icon: "⚔️",
                    label: t('generator.contentType.mission'),
                    desc: t('generator.contentTypeDesc.mission'),
                    color: "from-red-500/20 to-orange-500/20",
                    borderColor: "border-red-500/50",
                  },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setContentType(type.value)}
                    disabled={isGenerating}
                    className={`relative rounded-xl border-2 p-6 text-left transition-all transform ${
                      contentType === type.value
                        ? `${type.borderColor} bg-gradient-to-br ${type.color} shadow-lg scale-105`
                        : "border-border hover:border-primary/50 hover:shadow-md"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-102"}`}
                  >
                    <div className="text-5xl mb-3">{type.icon}</div>
                    <div className="font-display text-xl font-semibold mb-2">
                      {type.label}
                    </div>
                    <div className="text-sm text-muted-foreground font-body">
                      {type.desc}
                    </div>
                    {contentType === type.value && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="scenario" className="font-body text-lg font-semibold">
                  {t('generator.scenarioLabel')}
                </Label>
                <span className="text-xs text-muted-foreground font-body">
                  {scenario.length} characters
                </span>
              </div>
              <div className="relative">
                <textarea
                  id="scenario"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder={
                    contentType === "character"
                      ? t('generator.placeholderCharacter')
                      : contentType === "environment"
                      ? t('generator.placeholderEnvironment')
                      : t('generator.placeholderMission')
                  }
                  rows={8}
                  disabled={isGenerating}
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-body resize-none transition-all focus-visible:border-primary"
                />
                {scenario.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <div className={`w-2 h-2 rounded-full ${
                      scenario.length < 50 ? 'bg-green-500' : 
                      scenario.length < 200 ? 'bg-yellow-500' : 'bg-primary'
                    } animate-pulse`} />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-body">
                {t('generator.scenarioHelper')}
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !scenario.trim()}
                size="lg"
                className="min-w-[200px] font-display text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="mr-2 text-xl animate-spin">⚡</span>
                    {t('generator.generating')}
                  </>
                ) : (
                  <>
                    <span className="mr-2 text-xl">✨</span>
                    {t('generator.generateButton')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl mb-2">💡 {t('generator.tipsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base font-body p-6">
              <p>• {t('generator.tips.tip1')}</p>
              <p>• {t('generator.tips.tip2')}</p>
              <p>• {t('generator.tips.tip3')}</p>
              <p>• {t('generator.tips.tip4')}</p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl mb-2">📝 {t('generator.examplesTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base font-body p-6">
              {contentType === "character" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("In this tavern there's a Bard and he will talk with the heroes about an ancient flute")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "A mysterious Bard in a tavern talking about an ancient flute"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("An elderly Human wizard who runs a magic shop. They're friendly but forgetful, and they have information about a lost spellbook")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "An elderly wizard shopkeeper with information about a lost spellbook"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("A suspicious Tiefling rogue in the shadows of the marketplace, watching the party with keen interest")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "A suspicious Tiefling rogue watching from the shadows"
                  </button>
                </>
              )}
              {contentType === "environment" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("A dark, abandoned wizard's tower filled with magical traps and ancient artifacts")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "A dark wizard's tower with traps and artifacts"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("A bustling marketplace in the city center. Merchants call out their wares, and the smell of spices fills the air")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "A bustling marketplace with merchants and spices"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("An ancient forest clearing with glowing mushrooms and a mysterious stone circle")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "An ancient forest clearing with glowing mushrooms"
                  </button>
                </>
              )}
              {contentType === "mission" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("The heroes must retrieve a stolen magical artifact from a thieves' guild hideout")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "Retrieve a stolen artifact from thieves' guild"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("Investigate strange disappearances in a small village. The locals suspect a werewolf is responsible")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "Investigate disappearances in a village - werewolf suspected"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario("Escort a merchant caravan through dangerous mountain passes while protecting valuable cargo")
                    }}
                    className="text-left text-primary hover:underline w-full text-base transition-colors"
                    disabled={isGenerating}
                  >
                    "Escort a merchant caravan through dangerous mountains"
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {isGenerating && !generatedContent && (
          <Card className="parchment ornate-border animate-in fade-in border-2 border-primary/30">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="relative inline-block">
                  <div className="text-6xl animate-bounce">⚡</div>
                  <div className="absolute inset-0 text-6xl animate-ping opacity-20">⚡</div>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold mb-2">{t('generator.generating')}</p>
                  <p className="font-body text-base text-muted-foreground">
                    The AI is crafting your {t(`generator.contentType.${contentType}`)} based on your scenario
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-4">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {generatedContent && (
          <div ref={generatedContentRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-8">
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={handleSaveContent}
                disabled={isSaving || !generatedContent}
                size="lg"
                className="font-display text-lg min-w-[180px]"
              >
                {isSaving ? (
                  <>
                    <span className="mr-2">💾</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    {t('common.save')}
                  </>
                )}
              </Button>
              {saveError && (
                <Alert variant="destructive" className="flex-1 animate-in fade-in slide-in-from-top-2">
                  <AlertDescription className="font-body">
                    <strong>{t('generator.saveFailed')}</strong> {saveError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

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
