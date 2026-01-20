"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DND_REFERENCE } from "@/lib/dnd-reference"
import type { ContentType } from "@/types/rpg"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AdvancedField = "class" | "race" | "background"

interface ExampleListSidebarProps {
  contentType: ContentType
  onInsertToScenario: (text: string) => void
  onInsertToAdvanced: (field: AdvancedField, value: string) => void
}

function ItemMenu({
  name,
  advancedField,
  advancedFieldLabel,
  onInsertToScenario,
  onInsertToAdvanced,
  onClose,
  className,
}: {
  name: string
  advancedField: AdvancedField | null
  advancedFieldLabel: string | null
  onInsertToScenario: (t: string) => void
  onInsertToAdvanced: (f: AdvancedField, v: string) => void
  onClose: () => void
  className?: string
}) {
  const t = useTranslations("generator")
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-background p-1 shadow-lg",
          className
        )}
      >
        <button
          type="button"
          onClick={() => {
            onInsertToScenario(name)
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          {t("exampleListAddToScenario")}
        </button>
        {advancedField && advancedFieldLabel && (
          <button
            type="button"
            onClick={() => {
              onInsertToAdvanced(advancedField, name)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            {advancedFieldLabel}
          </button>
        )}
      </div>
    </>
  )
}

export function ExampleListSidebar({
  contentType,
  onInsertToScenario,
  onInsertToAdvanced,
}: ExampleListSidebarProps) {
  const t = useTranslations("generator")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const isCharacter = contentType === "character"

  return (
    <Card className="sticky top-24 h-fit max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col border-2 border-primary/20">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="font-display text-lg">{t("exampleList")}</CardTitle>
        <p className="text-xs text-muted-foreground font-body">{t("exampleListDescription")}</p>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4">
        {/* Classes */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("exampleListClasses")}
          </h4>
          <ul className="space-y-0.5">
            {DND_REFERENCE.classes.map((name) => {
              const id = `class-${name}`
              return (
                <li key={id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm font-body hover:bg-primary/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>{name}</span>
                    <span className="text-muted-foreground">⋯</span>
                  </button>
                  {openMenuId === id && (
                    <ItemMenu
                      name={name}
                      advancedField={isCharacter ? "class" : null}
                      advancedFieldLabel={isCharacter ? t("exampleListUseInClass") : null}
                      onInsertToScenario={onInsertToScenario}
                      onInsertToAdvanced={onInsertToAdvanced}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Races */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("exampleListRaces")}
          </h4>
          <ul className="space-y-0.5">
            {DND_REFERENCE.races.map((name) => {
              const id = `race-${name}`
              return (
                <li key={id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm font-body hover:bg-primary/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>{name}</span>
                    <span className="text-muted-foreground">⋯</span>
                  </button>
                  {openMenuId === id && (
                    <ItemMenu
                      name={name}
                      advancedField={isCharacter ? "race" : null}
                      advancedFieldLabel={isCharacter ? t("exampleListUseInRace") : null}
                      onInsertToScenario={onInsertToScenario}
                      onInsertToAdvanced={onInsertToAdvanced}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Backgrounds */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("exampleListBackgrounds")}
          </h4>
          <ul className="space-y-0.5">
            {DND_REFERENCE.backgrounds.map((name) => {
              const id = `bg-${name}`
              return (
                <li key={id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm font-body hover:bg-primary/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>{name}</span>
                    <span className="text-muted-foreground">⋯</span>
                  </button>
                  {openMenuId === id && (
                    <ItemMenu
                      name={name}
                      advancedField={isCharacter ? "background" : null}
                      advancedFieldLabel={isCharacter ? t("exampleListUseInBackground") : null}
                      onInsertToScenario={onInsertToScenario}
                      onInsertToAdvanced={onInsertToAdvanced}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Spells */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("exampleListSpells")}
          </h4>
          <div className="space-y-3">
            {DND_REFERENCE.spellsByLevel.map(({ level, levelLabel, spells }) => (
              <div key={level}>
                <div className="text-[11px] font-medium text-muted-foreground/90 mb-1">
                  {level === 0 ? t("exampleListSpellCantrip") : levelLabel}
                </div>
                <ul className="space-y-0.5">
                  {spells.map((name) => {
                    const id = `spell-${level}-${name}`
                    return (
                      <li key={id} className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                          className="w-full rounded px-2 py-1.5 text-left text-sm font-body hover:bg-primary/10 transition-colors flex items-center justify-between gap-2"
                        >
                          <span>{name}</span>
                          <span className="text-muted-foreground">⋯</span>
                        </button>
                        {openMenuId === id && (
                          <ItemMenu
                            name={name}
                            advancedField={null}
                            advancedFieldLabel={null}
                            onInsertToScenario={onInsertToScenario}
                            onInsertToAdvanced={onInsertToAdvanced}
                            onClose={() => setOpenMenuId(null)}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}