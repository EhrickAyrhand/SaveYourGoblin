"use client"

import { useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"

/**
 * ThemeLoader component that loads and applies the user's saved theme preference
 * on mount. This should be placed in the root layout to ensure theme is applied
 * across all pages before rendering.
 */
export function ThemeLoader() {
  useEffect(() => {
    async function loadTheme() {
      try {
        // Get current user to access their theme preference
        const user = await getCurrentUser()
        
        if (!user) {
          // No user, use default dark theme
          return
        }

        const profileKey = `profile_${user.id}`
        const themeKey = `theme_${user.id}`
        const savedProfile = localStorage.getItem(profileKey)
        const savedTheme = localStorage.getItem(themeKey)

        const html = document.documentElement

        // Default to dark if no user or no preference found
        let themeToUse: "dark" | "parchment" | "royal" = "dark"

        if (savedProfile) {
          try {
            const loadedProfile = JSON.parse(savedProfile)
            const validThemes: ("dark" | "parchment" | "royal")[] = ["dark", "parchment", "royal"]
            const profileTheme = loadedProfile.preferredTheme

            if (profileTheme && validThemes.includes(profileTheme as any)) {
              themeToUse = profileTheme as "dark" | "parchment" | "royal"
            }
          } catch (err) {
            // Failed to parse profile, continue with default
          }
        } else if (savedTheme) {
          const validThemes: ("dark" | "parchment" | "royal")[] = ["dark", "parchment", "royal"]
          if (validThemes.includes(savedTheme as any)) {
            themeToUse = savedTheme as "dark" | "parchment" | "royal"
          }
        }
        
        // If no user, default to dark (don't apply any theme preference)
        if (!user) {
          themeToUse = "dark"
        }

        // Remove all theme classes first
        html.classList.remove("light", "theme-royal", "dark")

        // Apply the selected theme
        if (themeToUse === "parchment") {
          html.classList.add("light")
        } else if (themeToUse === "royal") {
          html.classList.add("theme-royal", "dark")
        } else {
          // Dark theme (default)
          html.classList.add("dark")
        }
      } catch (err) {
        console.error("Failed to load theme preference", err)
      }
    }

    loadTheme()
  }, [])

  return null // This component doesn't render anything
}

