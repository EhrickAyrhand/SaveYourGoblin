"use client"

import { useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { LibraryContentItem } from "./library-card"
import type { Character, Environment, Mission } from "@/types/rpg"

interface ContentComparisonModalProps {
  items: [LibraryContentItem, LibraryContentItem]
  isOpen: boolean
  onClose: () => void
}

export function ContentComparisonModal({
  items,
  isOpen,
  onClose,
}: ContentComparisonModalProps) {
  const t = useTranslations()
  const [item1, item2] = items

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      // Hide theme selector when comparison modal is open
      document.body.setAttribute('data-comparison-open', 'true')
    } else {
      document.body.style.overflow = "unset"
      document.body.removeAttribute('data-comparison-open')
    }

    return () => {
      document.body.style.overflow = "unset"
      document.body.removeAttribute('data-comparison-open')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getContentName = (item: LibraryContentItem): string => {
    if (item.type === "character") {
      return (item.content_data as Character).name
    } else if (item.type === "environment") {
      return (item.content_data as Environment).name
    } else {
      return (item.content_data as Mission).title
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background animate-in fade-in"
    >
      {/* Header - Full Width */}
      <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between shadow-md">
        <div>
          <h2 className="font-display text-2xl font-bold">{t('comparison.title')}</h2>
          <p className="font-body text-sm text-muted-foreground">
            {t('comparison.comparing')} {item1.type}s
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose} 
          className="font-body"
          title={t('comparison.close')}
        >
          ✕ {t('comparison.close')}
        </Button>
      </div>

      {/* Comparison Content - Full Screen Side by Side */}
      <div className="h-[calc(100vh-80px)] overflow-hidden">
        <div className="grid grid-cols-2 gap-0 h-full w-full">
          {/* Item 1 - Left Side */}
          <div className="h-full overflow-y-auto overflow-x-hidden border-r border-border bg-background">
            <div className="p-6">
              <div className="mb-4 pb-4 border-b border-border">
                <h3 className="font-display text-xl font-bold mb-1">
                  {t('comparison.item1')}: {getContentName(item1)}
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {formatDate(item1.created_at)}
                </p>
              </div>
              <div className="w-full">
                {item1.type === "character" && (
                  <CharacterCard character={item1.content_data as Character} />
                )}
                {item1.type === "environment" && (
                  <EnvironmentCard environment={item1.content_data as Environment} />
                )}
                {item1.type === "mission" && (
                  <MissionCard mission={item1.content_data as Mission} />
                )}
              </div>
            </div>
          </div>

          {/* Item 2 - Right Side */}
          <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
            <div className="p-6">
              <div className="mb-4 pb-4 border-b border-border">
                <h3 className="font-display text-xl font-bold mb-1">
                  {t('comparison.item2')}: {getContentName(item2)}
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {formatDate(item2.created_at)}
                </p>
              </div>
              <div className="w-full">
                {item2.type === "character" && (
                  <CharacterCard character={item2.content_data as Character} />
                )}
                {item2.type === "environment" && (
                  <EnvironmentCard environment={item2.content_data as Environment} />
                )}
                {item2.type === "mission" && (
                  <MissionCard mission={item2.content_data as Mission} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
