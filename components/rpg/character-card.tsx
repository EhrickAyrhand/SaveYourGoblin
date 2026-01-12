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

// Standard D&D 5e skills list
const DND_SKILLS = [
  { name: 'Acrobatics', ability: 'DEX' },
  { name: 'Animal Handling', ability: 'WIS' },
  { name: 'Arcana', ability: 'INT' },
  { name: 'Athletics', ability: 'STR' },
  { name: 'Deception', ability: 'CHA' },
  { name: 'History', ability: 'INT' },
  { name: 'Insight', ability: 'WIS' },
  { name: 'Intimidation', ability: 'CHA' },
  { name: 'Investigation', ability: 'INT' },
  { name: 'Medicine', ability: 'WIS' },
  { name: 'Nature', ability: 'INT' },
  { name: 'Perception', ability: 'WIS' },
  { name: 'Performance', ability: 'CHA' },
  { name: 'Persuasion', ability: 'CHA' },
  { name: 'Religion', ability: 'INT' },
  { name: 'Sleight of Hand', ability: 'DEX' },
  { name: 'Stealth', ability: 'DEX' },
  { name: 'Survival', ability: 'WIS' },
] as const

export function CharacterCard({ character, isLoading = false }: CharacterCardProps) {
  const [expandedSections, setExpandedSections] = useState<{
    spells: boolean
    traits: boolean
    racialTraits: boolean
    history: boolean
    personality: boolean
  }>({
    spells: false,
    traits: false,
    racialTraits: false,
    history: false,
    personality: false,
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

  // Get ability modifier for a skill
  const getAbilityModifier = (ability: string): number => {
    switch (ability) {
      case 'STR': return getModifier(character.attributes.strength)
      case 'DEX': return getModifier(character.attributes.dexterity)
      case 'CON': return getModifier(character.attributes.constitution)
      case 'INT': return getModifier(character.attributes.intelligence)
      case 'WIS': return getModifier(character.attributes.wisdom)
      case 'CHA': return getModifier(character.attributes.charisma)
      default: return 0
    }
  }

  // Get skill modifier (ability + proficiency + expertise)
  const getSkillModifier = (skillName: string, ability: string): number => {
    const skill = character.skills?.find(s => s.name === skillName)
    const baseMod = getAbilityModifier(ability)
    const proficiencyBonus = Math.floor((character.level + 7) / 4) // Standard D&D proficiency bonus
    const isExpertise = character.expertise?.includes(skillName)
    const isProficient = skill?.proficiency || false
    
    if (isExpertise) return baseMod + (proficiencyBonus * 2)
    if (isProficient) return baseMod + proficiencyBonus
    return baseMod
  }

  // Calculate proficiency bonus
  const proficiencyBonus = Math.floor((character.level + 7) / 4)

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
      {/* Character Header */}
      <CardHeader className="border-b border-border/50 pb-4 px-6 pt-6">
        <CardTitle className="font-display text-4xl mb-3">{character.name}</CardTitle>
        <div className="flex flex-wrap gap-3 text-base font-body text-muted-foreground">
          <span className="font-semibold text-foreground">{character.race}</span>
          <span>•</span>
          <span className="font-semibold text-foreground">{character.class}</span>
          <span>•</span>
          <span>Level {character.level}</span>
          <span>•</span>
          <span>{character.background}</span>
          {character.voiceDescription && (
            <>
              <span>•</span>
              <span className="italic">{character.voiceDescription}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Top Section: Ability Scores and Combat Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ability Scores - Left Column */}
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-semibold border-b border-primary/30 pb-3">
              Ability Scores
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {/* STR */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">STR</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.strength}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.strength))}
                </div>
              </div>

              {/* DEX */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">DEX</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.dexterity}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.dexterity))}
                </div>
              </div>

              {/* CON */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">CON</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.constitution}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.constitution))}
                </div>
              </div>

              {/* INT */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">INT</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.intelligence}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.intelligence))}
                </div>
              </div>

              {/* WIS */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">WIS</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.wisdom}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.wisdom))}
                </div>
              </div>

              {/* CHA */}
              <div className="border-2 border-primary/50 rounded-lg p-3 text-center bg-background/50">
                <div className="text-sm font-body text-muted-foreground mb-1.5 font-semibold">CHA</div>
                <div className="text-3xl font-display font-bold mb-1">{character.attributes.charisma}</div>
                <div className="text-sm font-body font-semibold">
                  {formatModifier(getModifier(character.attributes.charisma))}
                </div>
              </div>
            </div>

            {/* Proficiency Bonus */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="text-sm font-body text-muted-foreground mb-2 font-semibold">PROFICIENCY BONUS</div>
              <div className="text-3xl font-display font-bold text-center">
                {formatModifier(proficiencyBonus)}
              </div>
            </div>
          </div>

          {/* Middle Column: Skills */}
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-semibold border-b border-primary/30 pb-3">
              Skills
            </h3>
            <div className="space-y-2 text-base font-body max-h-[600px] overflow-y-auto pr-2 scrollbar-styled">
              {DND_SKILLS.map((skill) => {
                const skillData = character.skills?.find(s => s.name === skill.name)
                const isExpertise = character.expertise?.includes(skill.name)
                const isProficient = skillData?.proficiency || false
                const modifier = getSkillModifier(skill.name, skill.ability)
                
                // Determine proficiency status label
                let proficiencyLabel = null
                if (isExpertise) {
                  proficiencyLabel = (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-semibold">
                      EXPERTISE
                    </span>
                  )
                } else if (isProficient) {
                  proficiencyLabel = (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                      PROFICIENT
                    </span>
                  )
                }
                
                return (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between py-2 border-b border-border/30"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(isProficient || isExpertise) && (
                        <span className="text-primary font-bold text-lg flex-shrink-0">✓</span>
                      )}
                      <span className={isProficient || isExpertise ? "font-semibold text-base" : "text-base"}>
                        {skill.name}
                      </span>
                      <span className="text-sm text-muted-foreground">({skill.ability})</span>
                      {proficiencyLabel}
                    </div>
                    <span className={`flex-shrink-0 ml-2 ${isProficient || isExpertise ? "text-primary font-semibold text-base" : "text-muted-foreground text-base"}`}>
                      {formatModifier(modifier)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Additional Info */}
          <div className="space-y-3">
            {/* Expertise */}
            {character.expertise && character.expertise.length > 0 && (
              <div>
                <h3 className="font-display text-2xl font-semibold border-b border-primary/30 pb-3 mb-3">
                  Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {character.expertise.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-primary/20 text-primary rounded-md font-body text-sm font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Racial Traits */}
            {character.racialTraits && character.racialTraits.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection("racialTraits")}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <h3 className="font-display text-2xl font-semibold border-b border-primary/30 pb-3">
                    Racial Traits ({character.racialTraits.length})
                  </h3>
                  <span className="text-muted-foreground font-body text-lg">
                    {expandedSections.racialTraits ? "▼" : "▶"}
                  </span>
                </button>
                {expandedSections.racialTraits && (
                  <ul className="list-disc list-inside space-y-2 pl-2 text-base font-body text-muted-foreground">
                    {character.racialTraits.map((trait, idx) => (
                      <li key={idx}>{trait}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Traits */}
            {character.traits && character.traits.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection("traits")}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <h3 className="font-display text-2xl font-semibold border-b border-primary/30 pb-3">
                    Traits ({character.traits.length})
                  </h3>
                  <span className="text-muted-foreground font-body text-lg">
                    {expandedSections.traits ? "▼" : "▶"}
                  </span>
                </button>
                {expandedSections.traits && (
                  <ul className="list-disc list-inside space-y-2 pl-2 text-base font-body text-muted-foreground">
                    {character.traits.map((trait, idx) => (
                      <li key={idx}>{trait}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spells Section */}
        {character.spells && character.spells.length > 0 && (
          <div className="border-t border-border pt-6">
            <button
              onClick={() => toggleSection("spells")}
              className="flex items-center justify-between w-full mb-4"
            >
              <h3 className="font-display text-2xl font-semibold">
                Spells ({character.spells.length})
              </h3>
              <span className="text-muted-foreground font-body text-lg">
                {expandedSections.spells ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.spells && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {character.spells.map((spell, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg p-4 bg-background/50"
                  >
                    <div className="font-display font-semibold text-lg mb-2">
                      {spell.name}
                      <span className="text-muted-foreground text-base font-body ml-2">
                        (Level {spell.level})
                      </span>
                    </div>
                    <div className="text-base font-body text-muted-foreground leading-relaxed">
                      {spell.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Background Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
          {/* History */}
          <div>
            <button
              onClick={() => toggleSection("history")}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="font-display text-2xl font-semibold">History</h3>
              <span className="text-muted-foreground font-body text-lg">
                {expandedSections.history ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.history && (
              <p className="font-body text-base text-muted-foreground leading-relaxed">
                {character.history}
              </p>
            )}
          </div>

          {/* Personality */}
          <div>
            <button
              onClick={() => toggleSection("personality")}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="font-display text-2xl font-semibold">Personality</h3>
              <span className="text-muted-foreground font-body text-lg">
                {expandedSections.personality ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.personality && (
              <p className="font-body text-base text-muted-foreground leading-relaxed">
                {character.personality}
              </p>
            )}
          </div>
        </div>

        {/* Voice Description */}
        {character.voiceDescription && (
          <div className="border-t border-border pt-4">
            <h3 className="font-display text-2xl font-semibold mb-2">Voice</h3>
            <p className="font-body text-base text-muted-foreground italic">
              {character.voiceDescription}
            </p>
          </div>
        )}

        {/* Associated Mission */}
        {character.associatedMission && (
          <div className="border-t border-border pt-4">
            <p className="font-body text-base">
              <span className="font-semibold">Related Mission:</span>{" "}
              <span className="text-primary font-semibold">{character.associatedMission}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

