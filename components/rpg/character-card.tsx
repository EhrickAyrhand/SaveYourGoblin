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
import { StatBar } from "./stat-bar"
import { SkillBar } from "./skill-bar"
import { ClassBadge } from "./class-badge"
import { RaceBadge } from "./race-badge"

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
    classFeatures: boolean
    history: boolean
    personality: boolean
  }>({
    spells: false,
    traits: false,
    racialTraits: false,
    classFeatures: false,
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

  // Get class color theme classes
  const getClassTheme = (className: string): { border: string; bg: string } => {
    const classLower = className.toLowerCase()
    if (classLower.includes('barbarian')) return { border: 'border-red-500/30', bg: 'bg-gradient-to-r from-red-500/5 to-transparent' }
    if (classLower.includes('bard')) return { border: 'border-purple-500/30', bg: 'bg-gradient-to-r from-purple-500/5 to-transparent' }
    if (classLower.includes('cleric')) return { border: 'border-blue-500/30', bg: 'bg-gradient-to-r from-blue-500/5 to-transparent' }
    if (classLower.includes('druid')) return { border: 'border-green-500/30', bg: 'bg-gradient-to-r from-green-500/5 to-transparent' }
    if (classLower.includes('fighter')) return { border: 'border-orange-500/30', bg: 'bg-gradient-to-r from-orange-500/5 to-transparent' }
    if (classLower.includes('monk')) return { border: 'border-yellow-500/30', bg: 'bg-gradient-to-r from-yellow-500/5 to-transparent' }
    if (classLower.includes('paladin')) return { border: 'border-pink-500/30', bg: 'bg-gradient-to-r from-pink-500/5 to-transparent' }
    if (classLower.includes('ranger')) return { border: 'border-emerald-500/30', bg: 'bg-gradient-to-r from-emerald-500/5 to-transparent' }
    if (classLower.includes('rogue')) return { border: 'border-slate-500/30', bg: 'bg-gradient-to-r from-slate-500/5 to-transparent' }
    if (classLower.includes('sorcerer')) return { border: 'border-indigo-500/30', bg: 'bg-gradient-to-r from-indigo-500/5 to-transparent' }
    if (classLower.includes('warlock')) return { border: 'border-violet-500/30', bg: 'bg-gradient-to-r from-violet-500/5 to-transparent' }
    if (classLower.includes('wizard')) return { border: 'border-cyan-500/30', bg: 'bg-gradient-to-r from-cyan-500/5 to-transparent' }
    return { border: 'border-primary/30', bg: 'bg-gradient-to-r from-primary/5 to-transparent' }
  }

  const classTheme = getClassTheme(character.class)

  return (
    <Card className="parchment ornate-border border-2 border-primary/20">
      {/* Character Header */}
      <CardHeader className={`border-b-2 ${classTheme.border} pb-4 px-6 pt-6 ${classTheme.bg}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <CardTitle className="font-display text-4xl mb-3">{character.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <RaceBadge race={character.race} size="md" />
              <ClassBadge className={character.class} level={character.level} size="md" />
              <span className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 font-semibold">
                {character.background}
              </span>
              {character.voiceDescription && (
                <span className="px-3 py-1.5 text-sm rounded-lg border border-border/50 bg-background/50 italic text-muted-foreground">
                  {character.voiceDescription}
                </span>
              )}
            </div>
          </div>
          {/* Character Portrait Placeholder */}
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl flex-shrink-0">
            {character.class.charAt(0)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Top Section: Ability Scores and Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Ability Scores - Left Column */}
          <div className="border-2 border-rose-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent h-fit">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    📊
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      Ability Scores
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Core attributes
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded text-xs font-bold">
                  6
                </span>
              </div>
            <div className="space-y-3">
              <StatBar 
                label="STR" 
                value={character.attributes.strength} 
                modifier={getModifier(character.attributes.strength)}
                color="red"
              />
              <StatBar 
                label="DEX" 
                value={character.attributes.dexterity} 
                modifier={getModifier(character.attributes.dexterity)}
                color="green"
              />
              <StatBar 
                label="CON" 
                value={character.attributes.constitution} 
                modifier={getModifier(character.attributes.constitution)}
                color="orange"
              />
              <StatBar 
                label="INT" 
                value={character.attributes.intelligence} 
                modifier={getModifier(character.attributes.intelligence)}
                color="blue"
              />
              <StatBar 
                label="WIS" 
                value={character.attributes.wisdom} 
                modifier={getModifier(character.attributes.wisdom)}
                color="purple"
              />
              <StatBar 
                label="CHA" 
                value={character.attributes.charisma} 
                modifier={getModifier(character.attributes.charisma)}
                color="yellow"
              />
            </div>

              {/* Proficiency Bonus */}
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-rose-500/20">
                <div className="text-xs font-body text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Proficiency Bonus</div>
                <div className="text-4xl font-display font-bold text-center text-primary">
                  {formatModifier(proficiencyBonus)}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Skills */}
          <div className="border-2 border-cyan-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent h-fit">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    ⚡
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      Skills
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      {DND_SKILLS.length} skills
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold">
                  {DND_SKILLS.length}
                </span>
              </div>
              <div className="space-y-3 text-base font-body">
              {DND_SKILLS.map((skill) => {
                const skillData = character.skills?.find(s => s.name === skill.name)
                const isExpertise = character.expertise?.includes(skill.name)
                const isProficient = skillData?.proficiency || false
                const modifier = getSkillModifier(skill.name, skill.ability)
                
                return (
                  <SkillBar
                    key={skill.name}
                    name={skill.name}
                    ability={skill.ability}
                    modifier={modifier}
                    isProficient={isProficient}
                    isExpertise={isExpertise}
                  />
                )
              })}
              </div>
            </div>
          </div>

          {/* Right Column: Additional Info */}
          <div className="space-y-3 h-fit">
            {/* Expertise */}
            {character.expertise && character.expertise.length > 0 && (
              <div className="border-2 border-blue-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center text-xl flex-shrink-0">
                        ⭐
                      </div>
                      <div className="text-left">
                        <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                          Expertise
                        </h3>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">
                          {character.expertise.length} {character.expertise.length === 1 ? 'skill' : 'skills'} with expertise
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded text-xs font-bold">
                      {character.expertise.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {character.expertise.map((skillName, idx) => {
                      const skill = DND_SKILLS.find(s => s.name === skillName)
                      const ability = skill?.ability || 'N/A'
                      const abilityColors: Record<string, string> = {
                        'STR': 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-600 dark:text-red-400',
                        'DEX': 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-600 dark:text-green-400',
                        'CON': 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400',
                        'INT': 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-600 dark:text-blue-400',
                        'WIS': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-600 dark:text-purple-400',
                        'CHA': 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
                      }
                      const colorClass = abilityColors[ability] || 'from-primary/20 to-primary/5 border-primary/30 text-primary'
                      
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg bg-gradient-to-r ${colorClass} border-2 hover:scale-[1.02] transition-all flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-background/50 border-2 border-current/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {ability}
                            </div>
                            <span className="font-body font-semibold text-sm">{skillName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold opacity-75">
                            <span>⭐</span>
                            <span>Expertise</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Racial Traits */}
            {character.racialTraits && character.racialTraits.length > 0 && (
              <div className="border-2 border-purple-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
                <button
                  onClick={() => toggleSection("racialTraits")}
                  className="w-full p-4 hover:bg-purple-500/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center text-xl flex-shrink-0">
                      🧬
                    </div>
                    <div className="text-left">
                      <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                        Racial Traits
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {character.racialTraits.length} {character.racialTraits.length === 1 ? 'trait' : 'traits'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded text-xs font-bold">
                      {character.racialTraits.length}
                    </span>
                    <span className="text-muted-foreground font-body text-lg transition-transform">
                      {expandedSections.racialTraits ? "▼" : "▶"}
                    </span>
                  </div>
                </button>
                {expandedSections.racialTraits && (
                  <div className="p-4 pt-0 space-y-3">
                    {character.racialTraits.map((trait, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-purple-500/20 hover:border-purple-500/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">{idx + 1}</span>
                          </div>
                          <p className="text-sm font-body text-foreground leading-relaxed flex-1">{trait}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Class Features */}
            {character.classFeatures && character.classFeatures.length > 0 && (
              <div className="border-2 border-primary/30 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                <button
                  onClick={() => toggleSection("classFeatures")}
                  className="w-full p-4 hover:bg-primary/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl flex-shrink-0">
                      🎯
                    </div>
                    <div className="text-left">
                      <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                        Class Features
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {character.classFeatures.length} {character.classFeatures.length === 1 ? 'feature' : 'features'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold">
                      {character.classFeatures.length}
                    </span>
                    <span className="text-muted-foreground font-body text-lg transition-transform">
                      {expandedSections.classFeatures ? "▼" : "▶"}
                    </span>
                  </div>
                </button>
                {expandedSections.classFeatures && (
                  <div className="p-4 pt-0">
                    {(() => {
                      // Group features by level
                      const featuresByLevel = character.classFeatures.reduce((acc, feature) => {
                        const level = feature.level || 1
                        if (!acc[level]) acc[level] = []
                        acc[level].push(feature)
                        return acc
                      }, {} as Record<number, typeof character.classFeatures>)

                      const levels = Object.keys(featuresByLevel).map(Number).sort((a, b) => a - b)

                      return (
                        <div className="space-y-4">
                          {levels.map((level) => (
                            <div key={level} className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold">
                                  Level {level}
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent"></div>
                              </div>
                              {featuresByLevel[level]?.map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 rounded-lg bg-gradient-to-br from-background/80 to-background/50 border-2 border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all group"
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="px-3 py-1.5 bg-gradient-to-br from-primary/30 to-primary/20 text-primary border-2 border-primary/40 rounded-lg text-xs font-bold flex-shrink-0 shadow-sm">
                                      Lv.{feature.level}
                                    </div>
                                    <h4 className="font-display font-semibold text-base text-foreground group-hover:text-primary transition-colors flex-1">
                                      {feature.name}
                                    </h4>
                                  </div>
                                  <p className="text-sm font-body text-muted-foreground leading-relaxed pl-12">
                                    {feature.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Traits */}
            {character.traits && character.traits.length > 0 && (
              <div className="border-2 border-emerald-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
                <button
                  onClick={() => toggleSection("traits")}
                  className="w-full p-4 hover:bg-emerald-500/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                      💫
                    </div>
                    <div className="text-left">
                      <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                        Traits
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {character.traits.length} {character.traits.length === 1 ? 'trait' : 'traits'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold">
                      {character.traits.length}
                    </span>
                    <span className="text-muted-foreground font-body text-lg transition-transform">
                      {expandedSections.traits ? "▼" : "▶"}
                    </span>
                  </div>
                </button>
                {expandedSections.traits && (
                  <div className="p-4 pt-0 space-y-3">
                    {character.traits.map((trait, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{idx + 1}</span>
                          </div>
                          <p className="text-sm font-body text-foreground leading-relaxed flex-1">{trait}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spells Section */}
        {character.spells && character.spells.length > 0 && (
          <div className="border-2 border-indigo-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent">
            <button
              onClick={() => toggleSection("spells")}
              className="w-full p-4 hover:bg-indigo-500/10 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-xl flex-shrink-0">
                  ✨
                </div>
                <div className="text-left">
                  <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                    Spells
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {character.spells.length} {character.spells.length === 1 ? 'spell' : 'spells'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded text-xs font-bold">
                  {character.spells.length}
                </span>
                <span className="text-muted-foreground font-body text-lg transition-transform">
                  {expandedSections.spells ? "▼" : "▶"}
                </span>
              </div>
            </button>
            {expandedSections.spells && (
              <div className="p-4 pt-0">
                {(() => {
                  // Group spells by level
                  const spellsByLevel = character.spells.reduce((acc, spell) => {
                    const level = spell.level || 0
                    if (!acc[level]) acc[level] = []
                    acc[level].push(spell)
                    return acc
                  }, {} as Record<number, typeof character.spells>)

                  const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)
                  const spellLevelColors = [
                    'from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-600 dark:text-slate-400',
                    'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-600 dark:text-blue-400',
                    'from-green-500/20 to-green-500/5 border-green-500/30 text-green-600 dark:text-green-400',
                    'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
                    'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400',
                    'from-red-500/20 to-red-500/5 border-red-500/30 text-red-600 dark:text-red-400',
                    'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-600 dark:text-purple-400',
                    'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-600 dark:text-pink-400',
                    'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
                    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
                  ]

                  return (
                    <div className="space-y-4">
                      {levels.map((level) => (
                        <div key={level} className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                            <span className={`px-3 py-1 bg-gradient-to-r ${spellLevelColors[level] || spellLevelColors[0]} border-2 rounded-full text-xs font-bold`}>
                              Level {level === 0 ? 'Cantrip' : level}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/30 via-transparent to-transparent"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {spellsByLevel[level]?.map((spell, idx) => {
                              const levelColor = spellLevelColors[spell.level] || spellLevelColors[0]
                              const [bgFrom, bgTo, border, textColor] = levelColor.split(' ')
                              
                              return (
                                <div
                                  key={idx}
                                  className={`p-4 rounded-lg bg-gradient-to-br from-background/80 to-background/50 border-2 ${border} hover:shadow-lg transition-all group`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-display font-semibold text-base text-foreground group-hover:text-primary transition-colors flex-1">
                                      {spell.name}
                                    </h4>
                                    <div className={`px-2 py-1 rounded-lg border-2 ${border} bg-gradient-to-br ${bgFrom} ${bgTo} ${textColor} text-xs font-bold flex-shrink-0 shadow-sm`}>
                                      Lv.{spell.level}
                                    </div>
                                  </div>
                                  <p className="text-sm font-body text-muted-foreground leading-relaxed">
                                    {spell.description}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Background Information */}
        <div className="space-y-4">
          {/* History */}
          <div className="border-2 border-amber-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <button
              onClick={() => toggleSection("history")}
              className="w-full p-4 hover:bg-amber-500/10 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0">
                  📜
                </div>
                <div className="text-left">
                  <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                    History
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    Character backstory
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground font-body text-lg transition-transform">
                {expandedSections.history ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.history && (
              <div className="p-4 pt-0">
                <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-amber-500/20">
                  <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {character.history}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Personality */}
          <div className="border-2 border-pink-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent">
            <button
              onClick={() => toggleSection("personality")}
              className="w-full p-4 hover:bg-pink-500/10 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 border-2 border-pink-500/30 flex items-center justify-center text-xl flex-shrink-0">
                  🎭
                </div>
                <div className="text-left">
                  <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                    Personality
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    Character demeanor
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground font-body text-lg transition-transform">
                {expandedSections.personality ? "▼" : "▶"}
              </span>
            </button>
            {expandedSections.personality && (
              <div className="p-4 pt-0">
                <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-pink-500/20">
                  <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {character.personality}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Voice Description */}
          {character.voiceDescription && (
            <div className="border-2 border-cyan-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🎤
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                      Voice
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Voice characteristics
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-cyan-500/20">
                  <p className="font-body text-sm text-foreground leading-relaxed italic">
                    {character.voiceDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Associated Mission */}
        {character.associatedMission && (
          <div className="border-2 border-primary/30 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl flex-shrink-0">
                  🎯
                </div>
                <div className="text-left">
                  <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                    Related Mission
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    Associated quest
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-background/80 to-background/50 border-2 border-primary/20">
                <p className="font-body text-sm text-foreground leading-relaxed">
                  <span className="text-primary font-semibold">{character.associatedMission}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

