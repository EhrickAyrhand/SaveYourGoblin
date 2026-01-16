"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<"dark" | "parchment" | "royal">("dark")

  useEffect(() => {
    // Load saved theme preference
    const html = document.documentElement
    let savedTheme: "dark" | "parchment" | "royal" = "dark"
    
    // Check localStorage for theme preference (check all user IDs or use a global key)
    const themeKeys = Object.keys(localStorage).filter(key => key.startsWith("theme_") || key.startsWith("profile_"))
    if (themeKeys.length > 0) {
      // Get the most recent theme preference
      for (const key of themeKeys) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            if (key.startsWith("profile_")) {
              const profile = JSON.parse(value)
              if (profile.preferredTheme && ["dark", "parchment", "royal"].includes(profile.preferredTheme)) {
                savedTheme = profile.preferredTheme
                break
              }
            } else {
              if (["dark", "parchment", "royal"].includes(value)) {
                savedTheme = value as "dark" | "parchment" | "royal"
                break
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    } else {
      // Check current HTML classes
      if (html.classList.contains("light")) {
        savedTheme = "parchment"
      } else if (html.classList.contains("theme-royal")) {
        savedTheme = "royal"
      }
    }
    
    setCurrentTheme(savedTheme)
  }, [])

  const changeTheme = (theme: "dark" | "parchment" | "royal") => {
    const html = document.documentElement
    
    // Remove all theme classes
    html.classList.remove("light", "theme-royal", "dark")
    
    // Apply selected theme
    if (theme === "parchment") {
      html.classList.add("light")
    } else if (theme === "royal") {
      html.classList.add("theme-royal", "dark")
    } else {
      html.classList.add("dark")
    }
    
    setCurrentTheme(theme)
    
    // Save to localStorage (try to save to all profile keys, or use a global key)
    try {
      const profileKeys = Object.keys(localStorage).filter(key => key.startsWith("profile_"))
      if (profileKeys.length > 0) {
        // Update all profile keys (in case user switches accounts)
        profileKeys.forEach(key => {
          try {
            const profile = JSON.parse(localStorage.getItem(key) || "{}")
            profile.preferredTheme = theme
            localStorage.setItem(key, JSON.stringify(profile))
          } catch (e) {
            // Ignore errors
          }
        })
      }
      // Also save as global theme preference
      localStorage.setItem("global_theme", theme)
    } catch (err) {
      console.error("Failed to save theme preference", err)
    }
  }

  const themes = [
    { value: "dark" as const, label: "🌙 Dark", desc: "Default" },
    { value: "parchment" as const, label: "📜 Parchment", desc: "Light" },
    { value: "royal" as const, label: "👑 Royal", desc: "Elegant" },
  ]

  const [isComparisonOpen, setIsComparisonOpen] = useState(false)

  useEffect(() => {
    // Check if comparison modal is open
    const checkComparison = () => {
      setIsComparisonOpen(document.body.hasAttribute('data-comparison-open'))
    }
    
    // Check on mount
    checkComparison()
    
    // Watch for changes
    const observer = new MutationObserver(checkComparison)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-comparison-open']
    })
    
    return () => observer.disconnect()
  }, [])

  // Hide when comparison modal is open
  if (isComparisonOpen) {
    return null
  }

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="relative">
        {/* Gear Icon Button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
          aria-label="Theme Settings"
        >
          <Settings className="h-6 w-6" />
        </Button>

        {/* Theme Options Card - Below the button, fixed position */}
        {isOpen && (
          <>
            {/* Backdrop to close on click outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 z-50" style={{ maxWidth: 'calc(100vw - 3rem)' }}>
              <Card className="w-64 parchment ornate-border shadow-lg animate-in fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">Theme Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => {
                        changeTheme(theme.value)
                        setIsOpen(false)
                      }}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                        currentTheme === theme.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-display text-sm font-semibold">{theme.label}</div>
                      <div className="text-xs text-muted-foreground font-body mt-1">
                        {theme.desc}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
