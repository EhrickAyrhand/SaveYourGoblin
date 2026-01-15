/**
 * D&D 5e RPG Content Type Definitions
 */

export type ContentType = 'character' | 'environment' | 'mission'

export interface Spell {
  name: string
  level: number
  description: string
}

export interface ClassFeature {
  name: string // Feature name (e.g., "Rage", "Sneak Attack")
  description: string // Brief description of what the feature does
  level: number // Level at which this feature is obtained (1-20)
}

export interface Skill {
  name: string
  proficiency: boolean
  modifier: number
}

export interface Attributes {
  strength: number // STR value (1-20)
  dexterity: number // DEX value (1-20)
  constitution: number // CON value (1-20)
  intelligence: number // INT value (1-20)
  wisdom: number // WIS value (1-20)
  charisma: number // CHA value (1-20)
}

export interface Character {
  name: string
  race: string
  class: string
  level: number
  background: string
  history: string
  personality: string
  attributes: Attributes
  expertise: string[] // Array of skill names with expertise
  spells: Spell[]
  skills: Skill[]
  traits: string[]
  racialTraits?: string[] // Array of racial traits (e.g., Darkvision, Hellish Resistance, Infernal Legacy)
  classFeatures?: ClassFeature[] // Array of class features with name, description, and level obtained
  voiceDescription: string // Voice description (e.g., "Hoarse voice", "Sweet voice", "Angry voice")
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
  currentConflict?: string // What is currently wrong or unstable in this location
  adventureHooks?: string[] // 2-3 concrete hooks that can immediately involve the players
}

export interface Objective {
  description: string
  primary: boolean
  isAlternative?: boolean // Marks if this objective is an alternative path (mutually exclusive with others)
  pathType?: 'combat' | 'social' | 'stealth' | 'mixed' // Type of approach this objective represents
}

export interface Reward {
  xp?: number
  gold?: number
  items: string[]
}

export interface PowerfulItem {
  name: string
  status: string // e.g., "Dormant Artifact", "DM-controlled", "Narrative-only"
}

export interface ChoiceBasedReward {
  condition: string // e.g., "If negotiated", "If combat", "If artifact kept"
  rewards: Reward
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
  recommendedLevel?: string // Recommended party level range (e.g., "Level 4-6", "Level 8-10")
  powerfulItems?: PowerfulItem[] // Powerful items/artifacts with clarification
  possibleOutcomes?: string[] // 3-4 possible outcomes based on player choices
  choiceBasedRewards?: ChoiceBasedReward[] // Optional rewards tied to specific choices/paths
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

/**
 * Advanced structured input for character generation
 */
export interface AdvancedCharacterInput {
  level?: number // Character level (1-20)
  class?: string // D&D 5e class (e.g., "Bard", "Wizard", "Fighter")
  race?: string // D&D 5e race (e.g., "Human", "Elf", "Tiefling")
  background?: string // Character background (e.g., "Entertainer", "Sage", "Noble")
}

/**
 * Advanced structured input for environment generation
 */
export interface AdvancedEnvironmentInput {
  mood?: string // Desired mood (e.g., "dark", "mysterious", "cheerful", "tense")
  lighting?: string // Desired lighting (e.g., "bright", "dim", "dark", "candlelight")
  npcCount?: number // Number of NPCs to include
}

/**
 * Advanced structured input for mission generation
 */
export interface AdvancedMissionInput {
  difficulty?: 'easy' | 'medium' | 'hard' | 'deadly' // Mission difficulty level
  objectiveCount?: number // Number of objectives to generate
  rewardTypes?: ('xp' | 'gold' | 'items')[] // Types of rewards to include
}

/**
 * Union type for all advanced inputs
 */
export type AdvancedInput = AdvancedCharacterInput | AdvancedEnvironmentInput | AdvancedMissionInput

/**
 * Custom generation parameters
 */
export interface AdvancedGenerationParams {
  temperature?: number // AI temperature (0.1-1.5), default 0.8
  tone?: 'serious' | 'balanced' | 'playful' // Narrative tone
  complexity?: 'simple' | 'standard' | 'detailed' // Level of detail in generation
}






