/**
 * D&D 5e RPG Content Type Definitions
 */

export type ContentType = 'character' | 'environment' | 'mission'

export interface Spell {
  name: string
  level: number
  description: string
}

export interface Skill {
  name: string
  proficiency: boolean
  modifier: number
}

export interface Character {
  name: string
  race: string
  class: string
  level: number
  background: string
  history: string
  personality: string
  spells: Spell[]
  skills: Skill[]
  traits: string[]
  voiceLines: string[]
  associatedMission?: string
}

export interface Environment {
  name: string
  description: string
  ambient: string // sounds/atmosphere description
  mood: string
  lighting: string
  features: string[]
  npcs: string[] // array of NPC names/references
}

export interface Objective {
  description: string
  primary: boolean
}

export interface Reward {
  xp?: number
  gold?: number
  items: string[]
}

export interface Mission {
  title: string
  description: string
  context: string
  objectives: Objective[]
  rewards: Reward
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly'
  relatedNPCs: string[]
  relatedLocations: string[]
}

export type GeneratedContent = Character | Environment | Mission

export interface GenerationRequest {
  scenario: string
  contentType: ContentType
}

export interface GenerationResponse {
  type: ContentType
  content: GeneratedContent
  scenario: string
}






