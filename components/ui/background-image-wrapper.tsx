import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface BackgroundImageWrapperProps {
  children: ReactNode
  imagePath?: string
  overlay?: boolean
  overlayIntensity?: "light" | "medium" | "dark"
  className?: string
  imageClassName?: string
}

/**
 * Background Image Wrapper Component
 * 
 * Provides a reusable wrapper for applying background images with optional overlays
 * to ensure text readability. Supports full-page backgrounds, card backgrounds,
 * and header section backgrounds.
 * 
 * Usage:
 * - Full page: <BackgroundImageWrapper imagePath="/bg.jpg"><PageContent /></BackgroundImageWrapper>
 * - Card background: <BackgroundImageWrapper imagePath="/pattern.png" overlay="medium"><Card /></BackgroundImageWrapper>
 */
export function BackgroundImageWrapper({
  children,
  imagePath,
  overlay = true,
  overlayIntensity = "medium",
  className,
  imageClassName,
}: BackgroundImageWrapperProps) {
  // If no image path provided, just render children with optional styling
  if (!imagePath) {
    return <div className={className}>{children}</div>
  }

  const overlayStyles = {
    light: "bg-black/20",
    medium: "bg-black/40",
    dark: "bg-black/60",
  }

  return (
    <div className={cn("relative isolate w-full h-full", className)}>
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <div
          aria-hidden="true"
          className={cn("absolute inset-0 bg-cover bg-center", imageClassName)}
          style={{ backgroundImage: `url(${imagePath})` }}
        />
        {/* Overlay for text readability */}
        {overlay && (
          <div
            className={cn(
              "absolute inset-0",
              overlayStyles[overlayIntensity]
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}