"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { CharacterCard } from "@/components/rpg/character-card"
import { EnvironmentCard } from "@/components/rpg/environment-card"
import { MissionCard } from "@/components/rpg/mission-card"
import type { LibraryContentItem } from "./library-card"
import type { Character, Environment, Mission } from "@/types/rpg"
import { formatDateWithLocale } from "@/lib/date"

interface ContentComparisonModalProps {
  items: [LibraryContentItem, LibraryContentItem]
  isOpen: boolean
  onClose: () => void
}

export function ContentComparisonModal({ items, isOpen, onClose }: ContentComparisonModalProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [item1, item2] = items

  const modalRef = useRef<HTMLDivElement | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const savedScrollYRef = useRef(0)

  // ✅ Scroll lock robusto + restaura EXATAMENTE a posição do usuário
  useLayoutEffect(() => {
    if (!isOpen) return

    // salva o scroll real da página ANTES de travar
    savedScrollYRef.current = window.scrollY

    const body = document.body
    const html = document.documentElement

    const prevBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    const prevHtmlOverflow = html.style.overflow

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${savedScrollYRef.current}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"

    return () => {
      // desfaz lock
      html.style.overflow = prevHtmlOverflow
      body.style.position = prevBodyStyle.position
      body.style.top = prevBodyStyle.top
      body.style.left = prevBodyStyle.left
      body.style.right = prevBodyStyle.right
      body.style.width = prevBodyStyle.width
      body.style.overflow = prevBodyStyle.overflow

      // restaura scroll da página (isso corrige o "vai pro meio")
      window.scrollTo(0, savedScrollYRef.current)
    }
  }, [isOpen])

  // ✅ Sempre abre no topo do conteúdo do modal (sem mexer no scroll da página)
  useLayoutEffect(() => {
    if (!isOpen) return
    modalRef.current?.focus()
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0
  }, [isOpen, item1.id, item2.id])

  // ESC fecha
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatDate = (dateString: string): string =>
    formatDateWithLocale(dateString, locale, { year: "numeric", month: "short", day: "numeric" })

  const getContentName = (item: LibraryContentItem): string => {
    if (item.type === "character") return (item.content_data as Character).name
    if (item.type === "environment") return (item.content_data as Environment).name
    return (item.content_data as Mission).title
  }

  return (
    <>
      {/* overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" />

      {/* modal centralizado */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="
    fixed left-1/2 top-4 md:top-6 z-[9999]
    w-[min(1100px,calc(100vw-2rem))]
    h-[min(86dvh,calc(100dvh-2rem))]
    -translate-x-1/2
    bg-background rounded-2xl shadow-2xl
    flex flex-col min-h-0 overflow-hidden outline-none
  "
      >

        {/* header */}
        <div className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 flex items-center justify-between shadow-md">
          <div>
            <h2 className="font-display text-xl font-bold">{t("comparison.title")}</h2>
            <p className="font-body text-sm text-muted-foreground">
              {t("comparison.comparing")} {item1.type}s
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="font-body">
            ✕ {t("comparison.close")}
          </Button>
        </div>

        {/* conteúdo com scroll único */}
        <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left */}
            <div className="bg-background md:border-r border-border">
              <div className="p-4">
                <div className="mb-4 pb-4 border-b border-border">
                  <h3 className="font-display text-xl font-bold mb-1">
                    {t("comparison.item1")}: {getContentName(item1)}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground">{formatDate(item1.created_at)}</p>
                </div>

                {item1.type === "character" && <CharacterCard character={item1.content_data as Character} />}
                {item1.type === "environment" && <EnvironmentCard environment={item1.content_data as Environment} />}
                {item1.type === "mission" && <MissionCard mission={item1.content_data as Mission} />}
              </div>
            </div>

            {/* Right */}
            <div className="bg-background">
              <div className="p-4">
                <div className="mb-4 pb-4 border-b border-border">
                  <h3 className="font-display text-xl font-bold mb-1">
                    {t("comparison.item2")}: {getContentName(item2)}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground">{formatDate(item2.created_at)}</p>
                </div>

                {item2.type === "character" && <CharacterCard character={item2.content_data as Character} />}
                {item2.type === "environment" && <EnvironmentCard environment={item2.content_data as Environment} />}
                {item2.type === "mission" && <MissionCard mission={item2.content_data as Mission} />}
              </div>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </>
  )
}
