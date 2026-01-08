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
    attributes: boolean
    spells: boolean
    skills: boolean
    traits: boolean
  }>({
    attributes: false,
    spells: false,
    skills: false,
    traits: false,
  })

  // Calculate ability modifiers (D&D 5e: (score - 10) / 2, rounded down)
  const getModifier = (score: number): number => {
    return Math.floor((score - 10) / 2)
  }

  const formatModifier = (modifier: number): string => {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
  }

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
        {/* Attributes */}
        {character.attributes && (
          <div>
            <button
              onClick={() => toggleSection("attributes")}
              className="flex items-center justify-between w-full mb-2"
            >
              <h3 className="font-display text-lg font-semibold">
                Ability Scores
              </h3>
              <span className="text-muted-foreground font-body">
                {expandedSections.attributes ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.attributes && (
              <div className="grid grid-cols-3 gap-3 pl-4 border-l-2 border-primary/30">
                <div className="font-body text-sm">
                  <span className="font-semibold">STR:</span> {character.attributes.strength} ({formatModifier(getModifier(character.attributes.strength))})
                </div>
                <div className="font-body text-sm">
                  <span className="font-semibold">DEX:</span> {character.attributes.dexterity} ({formatModifier(getModifier(character.attributes.dexterity))})
                </div>
                <div className="font-body text-sm">
                  <span className="font-semibold">CON:</span> {character.attributes.constitution} ({formatModifier(getModifier(character.attributes.constitution))})
                </div>
                <div className="font-body text-sm">
                  <span className="font-semibold">INT:</span> {character.attributes.intelligence} ({formatModifier(getModifier(character.attributes.intelligence))})
                </div>
                <div className="font-body text-sm">
                  <span className="font-semibold">WIS:</span> {character.attributes.wisdom} ({formatModifier(getModifier(character.attributes.wisdom))})
                </div>
                <div className="font-body text-sm">
                  <span className="font-semibold">CHA:</span> {character.attributes.charisma} ({formatModifier(getModifier(character.attributes.charisma))})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expertise */}
        {character.expertise && character.expertise.length > 0 && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-2">Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {character.expertise.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary/20 text-primary rounded-md font-body text-sm font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Voice Description */}
        {character.voiceDescription && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-2">Voice</h3>
            <p className="font-body text-sm text-muted-foreground italic">
              {character.voiceDescription}
            </p>
          </div>
        )}

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
                {character.skills.map((skill, idx) => {
                  const isExpertise = character.expertise && character.expertise.includes(skill.name)
                  return (
                    <div key={idx} className="font-body text-sm">
                      <span className="font-semibold">{skill.name}:</span>{" "}
                      <span className={skill.proficiency ? "text-primary" : "text-muted-foreground"}>
                        {skill.modifier >= 0 ? "+" : ""}{skill.modifier}
                        {isExpertise && " (Expertise)"}
                        {skill.proficiency && !isExpertise && " (Proficient)"}
                      </span>
                    </div>
                  )
                })}
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

