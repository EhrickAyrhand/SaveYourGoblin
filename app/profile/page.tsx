"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface ProfileSettings {
  displayName: string
  bio: string
  favoriteRPG: string
  preferredTheme: "parchment" | "dark" | "royal"
  avatarStyle: "warrior" | "wizard" | "rogue" | "bard" | "cleric"
}

const avatarEmojis: Record<ProfileSettings["avatarStyle"], string> = {
  warrior: "⚔️",
  wizard: "🔮",
  rogue: "🗡️",
  bard: "🎵",
  cleric: "✨",
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Initialize profile state - always start with dark (will be updated from localStorage if needed)
  const [profile, setProfile] = useState<ProfileSettings>({
    displayName: "",
    bio: "",
    favoriteRPG: "D&D 5e",
    preferredTheme: "dark", // Always default to dark - will be updated from localStorage
    avatarStyle: "bard",
  })

  // Ensure dark mode is active on mount (before any localStorage checks)
  // This prevents flash of wrong theme
  useEffect(() => {
    const html = document.documentElement
    // Ensure dark is set initially (layout should have it, but ensure it's there)
    if (!html.classList.contains("dark") && !html.classList.contains("light")) {
      html.classList.add("dark")
    }
  }, [])
  
  // Apply theme changes whenever theme preference changes (only after user is loaded to avoid race conditions)
  useEffect(() => {
    // Don't apply theme until user is loaded AND we have a preference
    // This prevents applying initial "dark" state before localStorage is checked
    if (!user || !profile.preferredTheme) {
      return
    }
    
    const html = document.documentElement
    
    // Remove all theme classes first
    html.classList.remove("light", "theme-royal")
    
    // Apply selected theme - RESPECT USER CHOICE
    if (profile.preferredTheme === "parchment") {
      html.classList.add("light")
      html.classList.remove("dark")
    } else if (profile.preferredTheme === "royal") {
      html.classList.add("theme-royal")
      html.classList.add("dark")
    } else {
      // Dark theme (default)
      html.classList.add("dark")
      html.classList.remove("light")
    }
    
    // Store theme preference - Save full profile to keep everything in sync
    // This ensures theme changes persist even without clicking "Save Profile"
    try {
      const profileKey = `profile_${user.id}`
      const existingProfile = localStorage.getItem(profileKey)
      if (existingProfile) {
        const profileData = JSON.parse(existingProfile)
        profileData.preferredTheme = profile.preferredTheme
        localStorage.setItem(profileKey, JSON.stringify(profileData))
      } else {
        // If no profile exists yet, save just the theme for now
        localStorage.setItem(`theme_${user.id}`, profile.preferredTheme)
      }
    } catch (err) {
      console.error("Failed to save theme preference", err)
    }
  }, [profile.preferredTheme, user])

  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        setUser(currentUser)
        
        // Load saved profile data - RESPECT USER PREFERENCE
        // Check if there's a saved profile for this user
        const profileKey = `profile_${currentUser.id}`
        const themeKey = `theme_${currentUser.id}`
        const savedProfile = localStorage.getItem(profileKey)
        const savedTheme = localStorage.getItem(themeKey)
        
        if (savedProfile) {
          try {
            const loadedProfile = JSON.parse(savedProfile)
            
            // RESPECT user's saved theme preference (including parchment)
            // Priority: 1) profile theme, 2) separate theme key (for backwards compatibility), 3) default to dark
            // Validate theme value - only accept valid themes
            const validThemes: ("dark" | "parchment" | "royal")[] = ["dark", "parchment", "royal"]
            let themeToUse: "dark" | "parchment" | "royal" = "dark"
            
            const profileTheme = loadedProfile.preferredTheme
            const isProfileThemeValid = profileTheme && validThemes.includes(profileTheme as any)
            const isSavedThemeValid = savedTheme && validThemes.includes(savedTheme as any)
            
            if (isProfileThemeValid) {
              themeToUse = profileTheme as "dark" | "parchment" | "royal"
            } else if (isSavedThemeValid) {
              themeToUse = savedTheme as "dark" | "parchment" | "royal"
              loadedProfile.preferredTheme = themeToUse
            } else {
              // Invalid or missing theme - default to dark and fix the profile
              themeToUse = "dark"
              loadedProfile.preferredTheme = "dark"
            }
            
            // Apply theme immediately (before setProfile triggers the effect)
            const html = document.documentElement
            html.classList.remove("light", "theme-royal")
            if (themeToUse === "parchment") {
              html.classList.add("light")
              html.classList.remove("dark")
            } else if (themeToUse === "royal") {
              html.classList.add("theme-royal", "dark")
            } else {
              html.classList.add("dark")
              html.classList.remove("light")
            }
            
            const profileToSet = {
              ...loadedProfile,
              preferredTheme: themeToUse,
              displayName: loadedProfile.displayName || currentUser.email?.split("@")[0] || "",
              avatarStyle: loadedProfile.avatarStyle || "bard",
            }
            setProfile(profileToSet)
            
          } catch (err) {
            // Failed to parse, use defaults with dark mode
            setProfile({
              displayName: currentUser.email?.split("@")[0] || "",
              bio: "",
              favoriteRPG: "D&D 5e",
              preferredTheme: "dark",
              avatarStyle: "bard",
            })
          }
        } else {
          // No saved profile, use defaults with dark mode
          // Apply dark theme immediately to ensure it's set
          const html = document.documentElement
          html.classList.remove("light", "theme-royal")
          html.classList.add("dark")
          
          setProfile({
            displayName: currentUser.email?.split("@")[0] || "",
            bio: "",
            favoriteRPG: "D&D 5e",
            preferredTheme: "dark",
            avatarStyle: "bard",
          })
        }
      } catch (err) {
        setError("Failed to load user data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  async function handleSignOut() {
    const result = await signOut()
    if (!result.error) {
      router.push("/login")
    }
  }

  async function handleSaveProfile() {
    if (!user) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    setError(null)

    try {
      // Save to localStorage for now (can be moved to Supabase later)
      // Note: If parchment theme is saved, it will be ignored on next load (defaults to dark)
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile))
      
      // TODO: Save to Supabase profile table
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError("Failed to save profile")
      console.error(err)
    } finally {
      setIsSaving(false)
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

  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md parchment">
          <CardHeader>
            <CardTitle className="font-display">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary bg-card text-4xl parchment">
              {avatarEmojis[profile.avatarStyle]}
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold">
                {profile.displayName || "Your Profile"}
              </h1>
              <p className="mt-2 text-muted-foreground font-body">
                Customize your RPG Master's Assistant profile
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="font-body">
              <Link href="/generator">Generator</Link>
            </Button>
            <Button asChild variant="outline" className="font-body">
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="font-body">
              Sign Out
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <Alert className="border-green-500 bg-green-500/10">
            <AlertDescription className="text-green-700 dark:text-green-400">
              Profile saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Customization */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Basic Information</CardTitle>
              <CardDescription className="font-body">
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="font-body"
                />
                <p className="text-xs text-muted-foreground font-body">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-body">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={profile.displayName}
                  onChange={(e) =>
                    setProfile({ ...profile, displayName: e.target.value })
                  }
                  placeholder="Enter your display name"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="favoriteRPG" className="font-body">Favorite RPG System</Label>
                <Input
                  id="favoriteRPG"
                  type="text"
                  value={profile.favoriteRPG}
                  onChange={(e) =>
                    setProfile({ ...profile, favoriteRPG: e.target.value })
                  }
                  placeholder="D&D 5e"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="font-body">Bio</Label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-body"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance & Style */}
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Appearance & Style</CardTitle>
              <CardDescription className="font-body">
                Customize your profile appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-3">
                <Label className="font-body">Preferred Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "dark", label: "🌙 Dark", desc: "Default" },
                    { value: "parchment", label: "📜 Parchment", desc: "Light" },
                    { value: "royal", label: "👑 Royal", desc: "Elegant" },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          preferredTheme: theme.value as ProfileSettings["preferredTheme"],
                        })
                        // Theme effect will automatically save to localStorage
                      }}
                      className={`rounded-lg border-2 p-3 text-center transition-all ${
                        profile.preferredTheme === theme.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{theme.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground font-body">
                        {theme.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Style */}
              <div className="space-y-3">
                <Label className="font-body">Avatar Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "warrior", label: "⚔️ Warrior", emoji: "⚔️" },
                    { value: "wizard", label: "🔮 Wizard", emoji: "🔮" },
                    { value: "rogue", label: "🗡️ Rogue", emoji: "🗡️" },
                    { value: "bard", label: "🎵 Bard", emoji: "🎵" },
                    { value: "cleric", label: "✨ Cleric", emoji: "✨" },
                  ].map((avatar) => (
                    <button
                      key={avatar.value}
                      type="button"
                      onClick={() => {
                        const newProfile = {
                          ...profile,
                          avatarStyle: avatar.value as ProfileSettings["avatarStyle"],
                        }
                        setProfile(newProfile)
                        // Save avatar immediately to localStorage (not waiting for Save Profile button)
                        if (user) {
                          try {
                            const profileKey = `profile_${user.id}`
                            const existingProfile = localStorage.getItem(profileKey)
                            if (existingProfile) {
                              const profileData = JSON.parse(existingProfile)
                              profileData.avatarStyle = newProfile.avatarStyle
                              localStorage.setItem(profileKey, JSON.stringify(profileData))
                            } else {
                              localStorage.setItem(profileKey, JSON.stringify(newProfile))
                            }
                          } catch (err) {
                            // Silent fail - avatar will be saved on next profile save
                          }
                        }
                      }}
                      className={`rounded-lg border-2 p-3 text-center transition-all ${
                        profile.avatarStyle === avatar.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl">{avatar.emoji}</div>
                      <div className="mt-1 font-body text-xs font-medium">
                        {avatar.label.split(" ")[1]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card className="parchment ornate-border">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground font-body">Email Verified</p>
                <p className="font-medium font-body">
                  {user.emailVerified ? (
                    <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">⚠ Not Verified</span>
                  )}
                </p>
              </div>
              {user.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground font-body">Account Created</p>
                  <p className="font-medium font-body">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {!user.emailVerified && (
              <Alert>
                <AlertDescription className="font-body">
                  Your email address is not verified. Please check your email and
                  click the verification link to verify your account.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="min-w-[120px] font-display"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  )
}

