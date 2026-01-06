"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Character } from "@/types/rpg"

interface CharacterCardProps {
  character: Character
  isLoading?: boolean
}

export function CharacterCard({ character, isLoading = false }: CharacterCardProps) {
  const [expandedSections, setExpandedSections] = useState<{
    spells: boolean
    skills: boolean
    traits: boolean
    voiceLines: boolean
  }>({
    spells: false,
    skills: false,
    traits: false,
    voiceLines: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (isLoading) {
    return (
      <Card className="parchment ornate-border animate-pulse">
        <CardHeader>
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="parchment ornate-border">
      <CardHeader>
        <CardTitle className="font-display text-3xl mb-2">{character.name}</CardTitle>
        <CardDescription className="font-body text-base">
          {character.race} {character.class} • Level {character.level} • {character.background}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* History */}
        <div>
          <h3 className="font-display text-lg font-semibold mb-2">History</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {character.history}
          </p>
        </div>

        {/* Personality */}
        <div>
          <h3 className="font-display text-lg font-semibold mb-2">Personality</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {character.personality}
          </p>
        </div>

        {/* Spells */}
        {character.spells && character.spells.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("spells")}
              className="flex items-center justify-between w-full mb-2"
            >
              <h3 className="font-display text-lg font-semibold">
                Spells ({character.spells.length})
              </h3>
              <span className="text-muted-foreground font-body">
                {expandedSections.spells ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.spells && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                {character.spells.map((spell, idx) => (
                  <div key={idx} className="font-body">
                    <div className="font-semibold text-sm">
                      {spell.name} <span className="text-muted-foreground">(Level {spell.level})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{spell.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {character.skills && character.skills.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("skills")}
              className="flex items-center justify-between w-full mb-2"
            >
              <h3 className="font-display text-lg font-semibold">
                Skills ({character.skills.length})
              </h3>
              <span className="text-muted-foreground font-body">
                {expandedSections.skills ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.skills && (
              <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-primary/30">
                {character.skills.map((skill, idx) => (
                  <div key={idx} className="font-body text-sm">
                    <span className="font-semibold">{skill.name}:</span>{" "}
                    <span className={skill.proficiency ? "text-primary" : "text-muted-foreground"}>
                      {skill.modifier >= 0 ? "+" : ""}{skill.modifier}
                      {skill.proficiency && " (Proficient)"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Traits */}
        {character.traits && character.traits.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("traits")}
              className="flex items-center justify-between w-full mb-2"
            >
              <h3 className="font-display text-lg font-semibold">
                Traits ({character.traits.length})
              </h3>
              <span className="text-muted-foreground font-body">
                {expandedSections.traits ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.traits && (
              <ul className="list-disc list-inside space-y-1 pl-4 border-l-2 border-primary/30">
                {character.traits.map((trait, idx) => (
                  <li key={idx} className="font-body text-sm text-muted-foreground">
                    {trait}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Voice Lines */}
        {character.voiceLines && character.voiceLines.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("voiceLines")}
              className="flex items-center justify-between w-full mb-2"
            >
              <h3 className="font-display text-lg font-semibold">
                Voice Lines ({character.voiceLines.length})
              </h3>
              <span className="text-muted-foreground font-body">
                {expandedSections.voiceLines ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.voiceLines && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                {character.voiceLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="font-body text-sm italic text-muted-foreground border-l-4 border-primary/50 pl-3 py-1"
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Associated Mission */}
        {character.associatedMission && (
          <div className="pt-4 border-t border-border">
            <p className="font-body text-sm">
              <span className="font-semibold">Related Mission:</span>{" "}
              <span className="text-primary">{character.associatedMission}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

