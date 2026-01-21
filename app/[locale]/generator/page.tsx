"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { getCurrentUser, signOut } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { isRecoverySessionActive, isResetPasswordRoute } from "@/lib/recovery-session"
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
import { Input } from "@/components/ui/input"
import { AdvancedFormField } from "@/components/generator/advanced-form-field"
import { ExampleListSidebar } from "@/components/generator/example-list-sidebar"
import {
  advancedCharacterInputSchema,
  advancedEnvironmentInputSchema,
  advancedMissionInputSchema,
} from "@/lib/schemas/advanced-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedBanner } from "@/components/ui/animated-banner"
import { NavigationDropdown } from "@/components/ui/navigation-dropdown"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { ContentType, GeneratedContent, Character, Environment, Mission, AdvancedCharacterInput, AdvancedEnvironmentInput, AdvancedMissionInput, AdvancedGenerationParams } from "@/types/rpg"

interface GeneratorState {
  generatedContent: GeneratedContent | null
  scenario: string
  contentType: ContentType
  timestamp: number
}

interface GeneratorPreferences {
  advancedMode?: boolean
  advancedCharacterInput?: AdvancedCharacterInput
  advancedEnvironmentInput?: AdvancedEnvironmentInput
  advancedMissionInput?: AdvancedMissionInput
  generationParams?: AdvancedGenerationParams
}

type CampaignSummary = {
  id: string
  name: string
  description?: string | null
  settings?: Record<string, unknown> | null
  contentIds?: string[]
  contentCount?: number
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

type CampaignDetails = CampaignSummary & {
  content?: CampaignContentItem[]
}

const DEFAULT_GENERATION_PARAMS: Required<AdvancedGenerationParams> = {
  temperature: 0.8,
  tone: "balanced",
  complexity: "standard",
}

const normalizeGenerationParams = (
  input?: Partial<AdvancedGenerationParams> | null
): AdvancedGenerationParams => {
  const temperatureRaw =
    typeof input?.temperature === "number" && Number.isFinite(input.temperature)
      ? input.temperature
      : DEFAULT_GENERATION_PARAMS.temperature
  const temperature = Math.min(1.5, Math.max(0.1, temperatureRaw))
  const tone =
    input?.tone === "serious" || input?.tone === "playful" || input?.tone === "balanced"
      ? input.tone
      : DEFAULT_GENERATION_PARAMS.tone
  const complexity =
    input?.complexity === "simple" || input?.complexity === "standard" || input?.complexity === "detailed"
      ? input.complexity
      : DEFAULT_GENERATION_PARAMS.complexity

  return {
    temperature,
    tone,
    complexity,
  }
}

const normalizeAdvancedCharacterInput = (input: unknown): AdvancedCharacterInput => {
  const result = advancedCharacterInputSchema.safeParse(input ?? {})
  return result.success ? result.data : {}
}

const normalizeAdvancedEnvironmentInput = (input: unknown): AdvancedEnvironmentInput => {
  const result = advancedEnvironmentInputSchema.safeParse(input ?? {})
  return result.success ? result.data : {}
}

const normalizeAdvancedMissionInput = (input: unknown): AdvancedMissionInput => {
  const result = advancedMissionInputSchema.safeParse(input ?? {})
  return result.success ? result.data : {}
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
  const [scenarioUsedForGeneration, setScenarioUsedForGeneration] = useState<string>("") // Store scenario used for generation
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generationSuccess, setGenerationSuccess] = useState(false)
  const [showGenerationBanner, setShowGenerationBanner] = useState(false)
  const [showSaveBanner, setShowSaveBanner] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [advancedCharacterInput, setAdvancedCharacterInput] = useState<AdvancedCharacterInput>({})
  const [advancedEnvironmentInput, setAdvancedEnvironmentInput] = useState<AdvancedEnvironmentInput>({})
  const [advancedMissionInput, setAdvancedMissionInput] = useState<AdvancedMissionInput>({})
  const [generationParams, setGenerationParams] = useState<AdvancedGenerationParams>(() => ({
    ...DEFAULT_GENERATION_PARAMS,
  }))
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<CampaignDetails | null>(null)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [isLoadingCampaignDetails, setIsLoadingCampaignDetails] = useState(false)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [advancedFieldErrors, setAdvancedFieldErrors] = useState<Record<string, string>>({})
  const [hasRestoredPreferences, setHasRestoredPreferences] = useState(false)
  const generatedContentRef = useRef<HTMLDivElement>(null)
  const hasRestoredState = useRef(false)
  const previousUserRef = useRef<User | null>(null)

  const getCampaignContentName = (item: CampaignContentItem): string => {
    if (!item.content) return t("campaigns.unknownContent")
    if (item.content.type === "character") {
      return (item.content.content_data as Character).name
    }
    if (item.content.type === "environment") {
      return (item.content.content_data as Environment).name
    }
    return (item.content.content_data as Mission).title
  }

  const campaignContext = useMemo(() => {
    if (!selectedCampaignDetails) return ""
    const lines: string[] = []
    lines.push(`Campaign: ${selectedCampaignDetails.name}`)
    if (selectedCampaignDetails.description) {
      lines.push(`Description: ${selectedCampaignDetails.description}`)
    }
    if (selectedCampaignDetails.settings && Object.keys(selectedCampaignDetails.settings).length > 0) {
      const rawSettings = JSON.stringify(selectedCampaignDetails.settings)
      const settingsText = rawSettings.length > 500 ? `${rawSettings.slice(0, 500)}...` : rawSettings
      lines.push(`Settings: ${settingsText}`)
    }
    if (selectedCampaignDetails.content && selectedCampaignDetails.content.length > 0) {
      const contentSummary = selectedCampaignDetails.content
        .slice(0, 5)
        .map((entry) => {
          if (!entry.content) return "Unknown"
          const name = getCampaignContentName(entry)
          return `${entry.content.type}: ${name}`
        })
        .join("; ")
      const extra = selectedCampaignDetails.content.length > 5
        ? ` (and ${selectedCampaignDetails.content.length - 5} more)`
        : ""
      lines.push(`Linked content: ${contentSummary}${extra}`)
    }
    return lines.join("\n")
  }, [selectedCampaignDetails, t])

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

  // Restore advanced preferences from localStorage on mount
  useEffect(() => {
    if (!user || hasRestoredPreferences) return

    try {
      const savedPreferences = localStorage.getItem(`generator_preferences_${user.id}`)
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences) as GeneratorPreferences | null

        if (parsed && typeof parsed === "object") {
          setAdvancedMode(typeof parsed.advancedMode === "boolean" ? parsed.advancedMode : false)
          setAdvancedCharacterInput(normalizeAdvancedCharacterInput(parsed.advancedCharacterInput))
          setAdvancedEnvironmentInput(normalizeAdvancedEnvironmentInput(parsed.advancedEnvironmentInput))
          setAdvancedMissionInput(normalizeAdvancedMissionInput(parsed.advancedMissionInput))
          setGenerationParams(normalizeGenerationParams(parsed.generationParams))
        }
      }
    } catch (err) {
      console.error("Failed to restore generator preferences:", err)
    } finally {
      setHasRestoredPreferences(true)
    }
  }, [user, hasRestoredPreferences])

  // Save advanced preferences to localStorage whenever they change
  useEffect(() => {
    if (!user || !hasRestoredPreferences) return
    if (previousUserRef.current && previousUserRef.current.id !== user.id) return

    try {
      const preferences: GeneratorPreferences = {
        advancedMode,
        advancedCharacterInput,
        advancedEnvironmentInput,
        advancedMissionInput,
        generationParams: normalizeGenerationParams(generationParams),
      }
      localStorage.setItem(`generator_preferences_${user.id}`, JSON.stringify(preferences))
    } catch (err) {
      console.error("Failed to save generator preferences:", err)
    }
  }, [
    advancedMode,
    advancedCharacterInput,
    advancedEnvironmentInput,
    advancedMissionInput,
    generationParams,
    user,
    hasRestoredPreferences,
  ])

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
      setAdvancedMode(false)
      setAdvancedCharacterInput({})
      setAdvancedEnvironmentInput({})
      setAdvancedMissionInput({})
      setGenerationParams({ ...DEFAULT_GENERATION_PARAMS })
      setAdvancedFieldErrors({})
      setHasRestoredPreferences(false)
      setCampaigns([])
      setSelectedCampaignId("")
      setSelectedCampaignDetails(null)
      setCampaignError(null)
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
    setScenarioUsedForGeneration("") // Clear stored scenario too
    setAdvancedFieldErrors({})
  }, [contentType])

  // Load templates when user or contentType changes
  useEffect(() => {
    if (!user) return
    loadTemplates()
  }, [user, contentType])

  useEffect(() => {
    if (!user) return
    loadCampaigns()
  }, [user])

  useEffect(() => {
    if (!selectedCampaignId) {
      setSelectedCampaignDetails(null)
      return
    }
    loadCampaignDetails(selectedCampaignId)
  }, [selectedCampaignId])

  async function loadTemplates() {
    if (!user) return

    setIsLoadingTemplates(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      const response = await fetch(`/api/templates?type=${contentType}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setTemplates(result.data || [])
      }
    } catch (err) {
      console.error("Failed to load templates:", err)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  async function loadCampaigns() {
    if (!user) return
    setIsLoadingCampaigns(true)
    setCampaignError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
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
      const list = (result.data || []) as CampaignSummary[]
      setCampaigns(list)
      setSelectedCampaignId((prev) => {
        if (!prev) return ""
        return list.some((campaign) => campaign.id === prev) ? prev : ""
      })
    } catch (err) {
      console.error("Failed to load campaigns:", err)
      setCampaignError(err instanceof Error ? err.message : "Failed to load campaigns")
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  async function loadCampaignDetails(campaignId: string) {
    if (!user) return
    setIsLoadingCampaignDetails(true)
    setCampaignError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to load campaign details")
      }

      const result = await response.json()
      setSelectedCampaignDetails(result.data || null)
    } catch (err) {
      console.error("Failed to load campaign details:", err)
      setCampaignError(err instanceof Error ? err.message : "Failed to load campaign details")
    } finally {
      setIsLoadingCampaignDetails(false)
    }
  }

  async function handleSaveTemplate() {
    if (!user || !scenario.trim() || !templateName.trim()) return

    setIsSavingTemplate(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setError("Not authenticated")
        return
      }

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || '',
          type: contentType,
          scenario: scenario.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to save template")
      }

      setShowTemplateModal(false)
      setTemplateName("")
      setTemplateDescription("")
      await loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setIsSavingTemplate(false)
    }
  }

  async function handleLoadTemplate(template: any) {
    setScenario(template.scenario)
    setShowTemplateModal(false)
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        return
      }

      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        await loadTemplates()
      }
    } catch (err) {
      console.error("Failed to delete template:", err)
    }
  }

  async function handleRegenerateSection(section: string) {
    if (!generatedContent || !scenarioUsedForGeneration) {
      setError("No content to regenerate")
      return
    }

    setRegeneratingSection(section)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Not authenticated")
      }

      const response = await fetch("/api/generate/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scenario: scenarioUsedForGeneration,
          contentType,
          section,
          currentContent: generatedContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to regenerate section")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let regeneratedData: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line)
              if (parsed.section === section && parsed.data) {
                regeneratedData = parsed.data
              }
            } catch {
              // JSON is incomplete, continue reading
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer)
          if (parsed.section === section && parsed.data) {
            regeneratedData = parsed.data
          }
        } catch (err) {
          console.error("Failed to parse final regeneration data:", err)
        }
      }

      if (!regeneratedData) {
        throw new Error("No regenerated data received")
      }

      // Update only the specific section in the generated content
      setGeneratedContent({
        ...generatedContent,
        [section]: regeneratedData,
      })

      setGenerationSuccess(true)
      setShowGenerationBanner(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate section")
      console.error("Regeneration error:", err)
    } finally {
      setRegeneratingSection(null)
    }
  }

  async function handleGenerate() {
    if (!scenario.trim()) {
      setError("Please describe what you want to generate")
      return
    }

    // Store the scenario that will be used for generation
    const scenarioToUse = scenario.trim()
    setScenarioUsedForGeneration(scenarioToUse)

    // Validate advanced inputs when in advanced mode
    if (advancedMode) {
      const schema =
        contentType === "character"
          ? advancedCharacterInputSchema
          : contentType === "environment"
            ? advancedEnvironmentInputSchema
            : advancedMissionInputSchema
      const input =
        contentType === "character"
          ? advancedCharacterInput
          : contentType === "environment"
            ? advancedEnvironmentInput
            : advancedMissionInput
      const result = schema.safeParse(input)
      if (!result.success) {
        const byPath = result.error.issues.reduce(
          (acc, i) => {
            acc[String(i.path[0])] = i.message
            return acc
          },
          {} as Record<string, string>
        )
        setAdvancedFieldErrors(byPath)
        setError(t("generator.advancedValidationError"))
        return
      }
      setAdvancedFieldErrors({})
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)
    setSaveSuccess(false)
    setSaveError(null)

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
          ...(campaignContext ? { campaignContext } : {}),
          ...(advancedMode && {
            advancedInput: contentType === 'character'
              ? advancedCharacterInput
              : contentType === 'environment'
                ? advancedEnvironmentInput
                : advancedMissionInput,
            generationParams,
          }),
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

    // Use the stored scenario from generation, or fallback to current scenario
    const scenarioToSave = scenarioUsedForGeneration || scenario.trim()

    // Validate that we have all required data
    if (!scenarioToSave) {
      setSaveError(t('errors.missingFields'))
      return
    }

    if (!contentType || !generatedContent) {
      setSaveError(t('errors.missingFields'))
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setSaveError(t('generator.notAuthenticatedSave'))
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
          scenario: scenarioToSave,
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

  const handleInsertToScenario = (text: string) => {
    setScenario((prev) => (prev || "").trim() + (prev ? " " : "") + text)
  }
  const handleInsertToAdvanced = (field: "class" | "race" | "background", value: string) => {
    if (contentType === "character") setAdvancedCharacterInput((prev) => ({ ...prev, [field]: value }))
  }
  const handleResetAdvancedDefaults = () => {
    setAdvancedCharacterInput({})
    setAdvancedEnvironmentInput({})
    setAdvancedMissionInput({})
    setGenerationParams({ ...DEFAULT_GENERATION_PARAMS })
    setAdvancedFieldErrors({})
  }

  return (
    <div className="min-h-screen bg-background/50 backdrop-blur-sm p-4">
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

      <div className={`mx-auto space-y-6 pt-4 ${advancedMode ? "max-w-6xl" : "max-w-5xl"}`}>
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

        {(() => {
          const main = () => (
            <>
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
                          className={`relative rounded-xl border-2 p-6 text-left transition-all transform ${contentType === type.value
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
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowExamples((prev) => !prev)}
                          className={`font-body transition-all ${showExamples
                              ? 'bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90'
                              : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                          📖 {t('generator.exampleList')}
                          {showExamples && ' ✓'}

                        </Button>


                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdvancedMode(!advancedMode)
                            setAdvancedFieldErrors({})
                          }}
                          className={`font-body transition-all ${advancedMode
                              ? 'bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90'
                              : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                          ⚙️ {t('generator.advancedMode')}
                          {advancedMode && ' ✓'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTemplateModal(true)}
                          className="font-body"
                        >
                          📋 {t('generator.templates')}
                        </Button>
                        {scenario.trim() && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTemplateName("")
                              setTemplateDescription("")
                              setShowTemplateModal(true)
                            }}
                            className="font-body"
                          >
                            💾 {t('generator.saveTemplate')}
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground font-body">
                          {scenario.length} characters
                        </span>
                      </div>
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
                          <div className={`w-2 h-2 rounded-full ${scenario.length < 50 ? 'bg-green-500' :
                              scenario.length < 200 ? 'bg-yellow-500' : 'bg-primary'
                            } animate-pulse`} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-body">
                      {t('generator.scenarioHelper')}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="font-body text-lg font-semibold">
                        {t('generator.campaignContextLabel')}
                      </Label>
                      {isLoadingCampaigns && (
                        <span className="text-xs text-muted-foreground font-body">
                          {t('generator.loadingCampaigns')}
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedCampaignId}
                      onChange={(event) => setSelectedCampaignId(event.target.value)}
                      disabled={isLoadingCampaigns || campaigns.length === 0}
                      className="w-full rounded-lg border-2 border-primary/20 bg-background px-4 py-3 text-base font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm disabled:opacity-50"
                    >
                      <option value="">
                        {campaigns.length === 0
                          ? t('campaigns.noCampaigns')
                          : t('generator.campaignContextNone')}
                      </option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted-foreground font-body">
                      {t('generator.campaignContextHelp')}
                    </p>
                    {campaignError && (
                      <Alert variant="destructive">
                        <AlertDescription className="font-body">{campaignError}</AlertDescription>
                      </Alert>
                    )}
                    {selectedCampaignId && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                        {isLoadingCampaignDetails ? (
                          <p className="text-sm text-muted-foreground font-body">
                            {t('generator.loadingCampaignDetails')}
                          </p>
                        ) : selectedCampaignDetails ? (
                          <>
                            <div className="font-body font-semibold text-foreground">
                              {selectedCampaignDetails.name}
                            </div>
                            {selectedCampaignDetails.description && (
                              <p className="text-sm text-muted-foreground font-body">
                                {selectedCampaignDetails.description}
                              </p>
                            )}
                            {selectedCampaignDetails.content && selectedCampaignDetails.content.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground font-body mb-1">
                                  {t('generator.campaignContentSummary', { count: selectedCampaignDetails.content.length })}
                                </p>
                                <ul className="text-xs text-muted-foreground font-body space-y-1 list-disc list-inside">
                                  {selectedCampaignDetails.content.slice(0, 5).map((entry) => (
                                    <li key={entry.contentId}>
                                      {entry.content ? `${entry.content.type}: ${getCampaignContentName(entry)}` : t('campaigns.unknownContent')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground font-body">
                            {t('generator.campaignContextUnavailable')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Advanced Mode Fields */}
                  {advancedMode && (
                    <div className="space-y-6 pt-4 border-t border-primary/20">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">⚙️</span>
                            <h3 className="font-display text-xl font-semibold">{t('generator.advancedModeDescription')}</h3>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetAdvancedDefaults}
                            className="font-body"
                          >
                            {t('generator.resetDefaults')}
                          </Button>
                        </div>

                        {/* Character Advanced Fields */}
                        {contentType === 'character' && (
                          <div className="space-y-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border-2 border-purple-500/30">
                            <h4 className="font-display text-lg font-semibold mb-3">{t('generator.advancedFields.character.title')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <AdvancedFormField
                                htmlFor="char-level"
                                label={t('generator.advancedFields.character.level')}
                                help={t('generator.advancedFields.character.levelHelp')}
                                error={advancedFieldErrors['level']}
                              >
                                <Input
                                  id="char-level"
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={advancedCharacterInput.level || ''}
                                  onChange={(e) => setAdvancedCharacterInput({
                                    ...advancedCharacterInput,
                                    level: e.target.value ? parseInt(e.target.value) : undefined
                                  })}
                                  placeholder="1-20"
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="char-class"
                                label={t('generator.advancedFields.character.class')}
                                help={t('generator.advancedFields.character.classHelp')}
                                error={advancedFieldErrors['class']}
                              >
                                <Input
                                  id="char-class"
                                  type="text"
                                  value={advancedCharacterInput.class || ''}
                                  onChange={(e) => setAdvancedCharacterInput({
                                    ...advancedCharacterInput,
                                    class: e.target.value || undefined
                                  })}
                                  placeholder={t('generator.advancedFields.character.classPlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="char-race"
                                label={t('generator.advancedFields.character.race')}
                                help={t('generator.advancedFields.character.raceHelp')}
                                error={advancedFieldErrors['race']}
                              >
                                <Input
                                  id="char-race"
                                  type="text"
                                  value={advancedCharacterInput.race || ''}
                                  onChange={(e) => setAdvancedCharacterInput({
                                    ...advancedCharacterInput,
                                    race: e.target.value || undefined
                                  })}
                                  placeholder={t('generator.advancedFields.character.racePlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="char-background"
                                label={t('generator.advancedFields.character.background')}
                                help={t('generator.advancedFields.character.backgroundHelp')}
                                error={advancedFieldErrors['background']}
                              >
                                <Input
                                  id="char-background"
                                  type="text"
                                  value={advancedCharacterInput.background || ''}
                                  onChange={(e) => setAdvancedCharacterInput({
                                    ...advancedCharacterInput,
                                    background: e.target.value || undefined
                                  })}
                                  placeholder={t('generator.advancedFields.character.backgroundPlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                            </div>
                          </div>
                        )}

                        {/* Environment Advanced Fields */}
                        {contentType === 'environment' && (
                          <div className="space-y-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30">
                            <h4 className="font-display text-lg font-semibold mb-3">{t('generator.advancedFields.environment.title')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <AdvancedFormField
                                htmlFor="env-mood"
                                label={t('generator.advancedFields.environment.mood')}
                                help={t('generator.advancedFields.environment.moodHelp')}
                                error={advancedFieldErrors['mood']}
                              >
                                <Input
                                  id="env-mood"
                                  type="text"
                                  value={advancedEnvironmentInput.mood || ''}
                                  onChange={(e) => setAdvancedEnvironmentInput({
                                    ...advancedEnvironmentInput,
                                    mood: e.target.value || undefined
                                  })}
                                  placeholder={t('generator.advancedFields.environment.moodPlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="env-lighting"
                                label={t('generator.advancedFields.environment.lighting')}
                                help={t('generator.advancedFields.environment.lightingHelp')}
                                error={advancedFieldErrors['lighting']}
                              >
                                <Input
                                  id="env-lighting"
                                  type="text"
                                  value={advancedEnvironmentInput.lighting || ''}
                                  onChange={(e) => setAdvancedEnvironmentInput({
                                    ...advancedEnvironmentInput,
                                    lighting: e.target.value || undefined
                                  })}
                                  placeholder={t('generator.advancedFields.environment.lightingPlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="env-npc-count"
                                label={t('generator.advancedFields.environment.npcCount')}
                                help={t('generator.advancedFields.environment.npcCountHelp')}
                                error={advancedFieldErrors['npcCount']}
                              >
                                <Input
                                  id="env-npc-count"
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={advancedEnvironmentInput.npcCount ?? ''}
                                  onChange={(e) => setAdvancedEnvironmentInput({
                                    ...advancedEnvironmentInput,
                                    npcCount: e.target.value ? parseInt(e.target.value) : undefined
                                  })}
                                  placeholder={t('generator.advancedFields.environment.npcCountPlaceholder')}
                                  className="font-body"
                                />
                              </AdvancedFormField>
                            </div>
                          </div>
                        )}

                        {/* Mission Advanced Fields */}
                        {contentType === 'mission' && (
                          <div className="space-y-4 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border-2 border-red-500/30">
                            <h4 className="font-display text-lg font-semibold mb-3">{t('generator.advancedFields.mission.title')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <AdvancedFormField
                                htmlFor="mission-difficulty"
                                label={t('generator.advancedFields.mission.difficulty')}
                                help={t('generator.advancedFields.mission.difficultyHelp')}
                                error={advancedFieldErrors['difficulty']}
                              >
                                <select
                                  id="mission-difficulty"
                                  value={advancedMissionInput.difficulty || ''}
                                  onChange={(e) => setAdvancedMissionInput({
                                    ...advancedMissionInput,
                                    difficulty: e.target.value ? e.target.value as 'easy' | 'medium' | 'hard' | 'deadly' : undefined
                                  })}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-primary/20 bg-background font-body"
                                >
                                  <option value="">{t('generator.advancedFields.mission.difficultyHelp')}</option>
                                  <option value="easy">{t('generator.advancedFields.mission.difficultyEasy')}</option>
                                  <option value="medium">{t('generator.advancedFields.mission.difficultyMedium')}</option>
                                  <option value="hard">{t('generator.advancedFields.mission.difficultyHard')}</option>
                                  <option value="deadly">{t('generator.advancedFields.mission.difficultyDeadly')}</option>
                                </select>
                              </AdvancedFormField>
                              <AdvancedFormField
                                htmlFor="mission-objectives"
                                label={t('generator.advancedFields.mission.objectiveCount')}
                                help={t('generator.advancedFields.mission.objectiveCountHelp')}
                                error={advancedFieldErrors['objectiveCount']}
                              >
                                <Input
                                  id="mission-objectives"
                                  type="number"
                                  min="2"
                                  max="5"
                                  value={advancedMissionInput.objectiveCount || ''}
                                  onChange={(e) => setAdvancedMissionInput({
                                    ...advancedMissionInput,
                                    objectiveCount: e.target.value ? parseInt(e.target.value) : undefined
                                  })}
                                  placeholder="2-5"
                                  className="font-body"
                                />
                              </AdvancedFormField>
                              <AdvancedFormField
                                label={t('generator.advancedFields.mission.rewardTypes')}
                                help={t('generator.advancedFields.mission.rewardTypesHelp')}
                                error={advancedFieldErrors['rewardTypes']}
                                wrapperClassName="md:col-span-2"
                              >
                                <div className="flex flex-wrap gap-3">
                                  {(['xp', 'gold', 'items'] as const).map((type) => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={advancedMissionInput.rewardTypes?.includes(type) || false}
                                        onChange={(e) => {
                                          const current = advancedMissionInput.rewardTypes || []
                                          setAdvancedMissionInput({
                                            ...advancedMissionInput,
                                            rewardTypes: e.target.checked
                                              ? [...current, type]
                                              : current.filter((x) => x !== type)
                                          })
                                        }}
                                        className="rounded"
                                      />
                                      <span className="text-sm font-body">
                                        {type === 'xp' && t('generator.advancedFields.mission.rewardXP')}
                                        {type === 'gold' && t('generator.advancedFields.mission.rewardGold')}
                                        {type === 'items' && t('generator.advancedFields.mission.rewardItems')}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </AdvancedFormField>
                            </div>
                          </div>
                        )}

                        {/* Generation Parameters (temperature, tone, complexity) */}
                        <div className="space-y-4 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl border-2 border-amber-500/30">
                          <h4 className="font-display text-lg font-semibold mb-3">{t('generator.advancedFields.generation.title')}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="gen-temperature" className="font-body text-sm font-semibold">
                                {t('generator.advancedFields.generation.temperature')}
                              </Label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{t('generator.advancedFields.generation.temperatureLow')}</span>
                                <input
                                  id="gen-temperature"
                                  type="range"
                                  min="0.1"
                                  max="1.5"
                                  step="0.1"
                                  value={generationParams.temperature ?? 0.8}
                                  onChange={(e) => setGenerationParams({
                                    ...generationParams,
                                    temperature: parseFloat(e.target.value),
                                  })}
                                  className="flex-1 h-2 min-w-[120px] cursor-pointer accent-primary [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-lg [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:bg-muted [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                                />
                                <span className="text-xs text-muted-foreground">{t('generator.advancedFields.generation.temperatureHigh')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground font-body">
                                {(generationParams.temperature ?? 0.8).toFixed(1)} — {t('generator.advancedFields.generation.temperatureHelp')}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gen-tone" className="font-body text-sm font-semibold">
                                {t('generator.advancedFields.generation.tone')}
                              </Label>
                              <select
                                id="gen-tone"
                                value={generationParams.tone || 'balanced'}
                                onChange={(e) => setGenerationParams({
                                  ...generationParams,
                                  tone: e.target.value as 'serious' | 'balanced' | 'playful',
                                })}
                                className="w-full px-3 py-2 rounded-lg border-2 border-primary/20 bg-background font-body"
                              >
                                <option value="serious">{t('generator.advancedFields.generation.toneSerious')}</option>
                                <option value="balanced">{t('generator.advancedFields.generation.toneBalanced')}</option>
                                <option value="playful">{t('generator.advancedFields.generation.tonePlayful')}</option>
                              </select>
                              <p className="text-xs text-muted-foreground font-body">
                                {t('generator.advancedFields.generation.toneHelp')}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gen-complexity" className="font-body text-sm font-semibold">
                                {t('generator.advancedFields.generation.complexity')}
                              </Label>
                              <select
                                id="gen-complexity"
                                value={generationParams.complexity || 'standard'}
                                onChange={(e) => setGenerationParams({
                                  ...generationParams,
                                  complexity: e.target.value as 'simple' | 'standard' | 'detailed',
                                })}
                                className="w-full px-3 py-2 rounded-lg border-2 border-primary/20 bg-background font-body"
                              >
                                <option value="simple">{t('generator.advancedFields.generation.complexitySimple')}</option>
                                <option value="standard">{t('generator.advancedFields.generation.complexityStandard')}</option>
                                <option value="detailed">{t('generator.advancedFields.generation.complexityDetailed')}</option>
                              </select>
                              <p className="text-xs text-muted-foreground font-body">
                                {t('generator.advancedFields.generation.complexityHelp')}
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

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
                            setScenario(t('generator.examples.character.example1.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.character.example1.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.character.example2.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.character.example2.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.character.example3.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.character.example3.text')}"
                        </button>
                      </>
                    )}
                    {contentType === "environment" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.environment.example1.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.environment.example1.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.environment.example2.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.environment.example2.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.environment.example3.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.environment.example3.text')}"
                        </button>
                      </>
                    )}
                    {contentType === "mission" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.mission.example1.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.mission.example1.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.mission.example2.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.mission.example2.text')}"
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(t('generator.examples.mission.example3.scenario'))
                          }}
                          className="text-left text-primary hover:underline w-full text-base transition-colors"
                          disabled={isGenerating}
                        >
                          "{t('generator.examples.mission.example3.text')}"
                        </button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          );
          return showExamples ? (
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div className="lg:col-span-2 xl:col-span-2 space-y-6">{main()}</div>
              <ExampleListSidebar
                contentType={contentType}
                onInsertToScenario={handleInsertToScenario}
                onInsertToAdvanced={handleInsertToAdvanced}
              />
            </div>
          ) : (
            <div className="space-y-6">{main()}</div>
          );
        })()}


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
                    {t('generator.craftingMessage', { contentType: t(`generator.contentType.${contentType}`) })}
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
                    {t('generator.saving')}
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
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("spells")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "spells" ? "⏳" : "🔄"} {t('generator.regenerateSpells')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("traits")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "traits" ? "⏳" : "🔄"} {t('generator.regenerateTraits')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("classFeatures")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "classFeatures" ? "⏳" : "🔄"} {t('generator.regenerateClassFeatures')}
                  </Button>
                </div>
                <CharacterCard character={generatedContent as Character} isLoading={regeneratingSection !== null} />
              </>
            )}
            {contentType === "environment" && "name" in generatedContent && "description" in generatedContent && !("race" in generatedContent) && !("title" in generatedContent) && (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("npcs")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "npcs" ? "⏳" : "🔄"} {t('generator.regenerateNPCs')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("features")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "features" ? "⏳" : "🔄"} {t('generator.regenerateFeatures')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("adventureHooks")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "adventureHooks" ? "⏳" : "🔄"} {t('generator.regenerateHooks')}
                  </Button>
                </div>
                <EnvironmentCard environment={generatedContent as Environment} isLoading={regeneratingSection !== null} />
              </>
            )}
            {contentType === "mission" && "title" in generatedContent && "description" in generatedContent && (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("objectives")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "objectives" ? "⏳" : "🔄"} {t('generator.regenerateObjectives')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("rewards")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "rewards" ? "⏳" : "🔄"} {t('generator.regenerateRewards')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateSection("relatedNPCs")}
                    disabled={!!regeneratingSection}
                    className="font-body"
                  >
                    {regeneratingSection === "relatedNPCs" ? "⏳" : "🔄"} {t('generator.regenerateNPCs')}
                  </Button>
                </div>
                <MissionCard mission={generatedContent as Mission} isLoading={regeneratingSection !== null} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTemplateModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 parchment ornate-border">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">{t('generator.templates')}</h2>
              <Button variant="outline" size="sm" onClick={() => setShowTemplateModal(false)} className="font-body">
                ✕ {t('common.close')}
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {!templateName && (
                <div className="space-y-3">
                  <h3 className="font-body text-lg font-semibold">{t('generator.loadTemplate')}</h3>
                  {isLoadingTemplates ? (
                    <p className="text-muted-foreground font-body">{t('common.loading')}</p>
                  ) : templates.length === 0 ? (
                    <p className="text-muted-foreground font-body">{t('generator.noTemplates')}</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 cursor-pointer" onClick={() => handleLoadTemplate(template)}>
                            <div className="font-body font-semibold">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground font-body">{template.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground font-body mt-1 truncate">{template.scenario}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="font-body ml-2"
                          >
                            🗑️
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {scenario.trim() && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="default"
                        onClick={() => {
                          setTemplateName(scenario.substring(0, 50))
                          setTemplateDescription("")
                        }}
                        className="font-body w-full"
                      >
                        💾 {t('generator.saveCurrentAsTemplate')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {templateName && (
                <div className="space-y-4">
                  <h3 className="font-body text-lg font-semibold">{t('generator.saveTemplate')}</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="template-name" className="font-body">{t('generator.templateName')}</Label>
                      <Input
                        id="template-name"
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder={t('generator.templateNamePlaceholder')}
                        className="font-body mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description" className="font-body">{t('generator.templateDescription')}</Label>
                      <textarea
                        id="template-description"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder={t('generator.templateDescriptionPlaceholder')}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body mt-1 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTemplateName("")
                        setTemplateDescription("")
                      }}
                      className="font-body"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim() || isSavingTemplate}
                      className="font-body"
                    >
                      {isSavingTemplate ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}