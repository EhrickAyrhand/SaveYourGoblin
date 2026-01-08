"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AnimatedBannerProps {
  title: string
  message?: string
  variant?: "success" | "error" | "info"
  duration?: number
  onDismiss?: () => void
  className?: string
}

export function AnimatedBanner({
  title,
  message,
  variant = "success",
  duration = 5000,
  onDismiss,
  className,
}: AnimatedBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setIsAnimating(true)
    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300) // Wait for exit animation
  }

  if (!isVisible) return null

  const variantStyles = {
    success: "bg-green-500/15 border-green-500/50 text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20",
    error: "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/20",
    info: "bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/20",
  }

  const icons = {
    success: <CheckCircle2 className="h-6 w-6" />,
    error: <AlertCircle className="h-6 w-6" />,
    info: <CheckCircle2 className="h-6 w-6" />,
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 mx-auto max-w-5xl px-4 pt-4",
        "animate-in slide-in-from-top-4 fade-in duration-500",
        !isAnimating && "animate-out slide-out-to-top fade-out duration-300",
        className
      )}
    >
      <div
        className={cn(
          "rounded-lg border-2 p-4 backdrop-blur-sm",
          "flex items-start gap-3",
          variantStyles[variant]
        )}
      >
        <div className="flex-shrink-0 mt-0.5 animate-in zoom-in duration-300 delay-100">
          {icons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-lg mb-1">{title}</p>
          {message && (
            <p className="font-body text-sm opacity-90">{message}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 rounded-md p-1 transition-colors",
            "hover:bg-black/10 dark:hover:bg-white/10",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            variant === "success" && "focus:ring-green-500/50",
            variant === "error" && "focus:ring-red-500/50",
            variant === "info" && "focus:ring-blue-500/50"
          )}
          aria-label="Dismiss notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
