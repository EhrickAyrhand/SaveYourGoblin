/**
 * AI Content Generation Library
 * 
 * Uses Vercel AI SDK with OpenAI GPT-4o-mini for real AI generation
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type {
  Character,
  Environment,
  Mission,
  GeneratedContent,
  ContentType,
} from '@/types/rpg'

// Zod schemas for structured output
const spellSchema = z.object({
  name: z.string().describe('The name of the spell'),
  level: z.number().int().min(0).max(9).describe('The spell level (0-9)'),
  description: z.string().describe('A brief description of what the spell does'),
})

const skillSchema = z.object({
  name: z.string().describe('The skill name (e.g., Persuasion, Stealth)'),
  proficiency: z.boolean().describe('Whether the character is proficient in this skill'),
  modifier: z.number().int().describe('The skill modifier (typically -5 to +10)'),
})

const attributesSchema = z.object({
  strength: z.number().int().min(1).max(30).describe('Strength attribute value (1-30, typically 8-15 for starting characters)'),
  dexterity: z.number().int().min(1).max(30).describe('Dexterity attribute value (1-30, typically 8-15 for starting characters)'),
  constitution: z.number().int().min(1).max(30).describe('Constitution attribute value (1-30, typically 8-15 for starting characters)'),
  intelligence: z.number().int().min(1).max(30).describe('Intelligence attribute value (1-30, typically 8-15 for starting characters)'),
  wisdom: z.number().int().min(1).max(30).describe('Wisdom attribute value (1-30, typically 8-15 for starting characters)'),
  charisma: z.number().int().min(1).max(30).describe('Charisma attribute value (1-30, typically 8-15 for starting characters)'),
})

const characterSchema = z.object({
  name: z.string().describe('The character\'s full name'),
  race: z.string().describe('D&D 5e race (e.g., Human, Elf, Dwarf, Tiefling)'),
  class: z.string().describe('D&D 5e class (e.g., Bard, Wizard, Fighter, Rogue)'),
  level: z.number().int().min(1).max(20).describe('Character level (1-20)'),
  background: z.string().describe('Character background (e.g., Entertainer, Sage, Noble)'),
  history: z.string().describe('A detailed backstory and history of the character'),
  personality: z.string().describe('A description of the character\'s personality traits and demeanor'),
  attributes: attributesSchema.describe('D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA)'),
  expertise: z.array(z.string()).describe('Array of skill names that the character has expertise in (double proficiency bonus). Typically 2-4 skills for classes like Rogue or Bard.'),
  spells: z.array(spellSchema).describe('Array of spells the character knows'),
  skills: z.array(skillSchema).describe('Array of skills with proficiency and modifiers'),
  traits: z.array(z.string()).describe('Character traits, quirks, or notable features'),
  racialTraits: z.array(z.string()).optional().describe('Array of racial traits and features (e.g., "Darkvision 60ft", "Hellish Resistance", "Infernal Legacy", "Fey Ancestry", "Dwarven Resilience"). Include all standard D&D 5e racial features for the character\'s race.'),
  voiceDescription: z.string().describe('Voice description (e.g., "Hoarse voice", "Sweet voice", "Angry voice", "Deep voice", "Melodic voice", "Raspy voice") - NOT dialogue lines, just the voice quality/characteristics'),
  associatedMission: z.string().optional().describe('Optional: Name of a related mission or quest'),
})

const environmentSchema = z.object({
  name: z.string().describe('The name of the location'),
  description: z.string().describe('A detailed description of the environment'),
  ambient: z.string().describe('Ambient sounds and atmosphere description'),
  mood: z.string().describe('The overall mood of the location'),
  lighting: z.string().describe('Description of the lighting conditions'),
  features: z.array(z.string()).describe('Notable features, objects, or architectural elements'),
  npcs: z.array(z.string()).describe('List of NPCs or characters present in this location'),
})

const objectiveSchema = z.object({
  description: z.string().describe('The objective description'),
  primary: z.boolean().describe('Whether this is a primary (required) or optional objective'),
})

const rewardSchema = z.object({
  xp: z.number().int().min(0).optional().describe('Experience points reward'),
  gold: z.number().int().min(0).optional().describe('Gold pieces reward'),
  items: z.array(z.string()).describe('List of item rewards'),
})

const missionSchema = z.object({
  title: z.string().describe('The mission/quest title'),
  description: z.string().describe('A detailed description of the mission'),
  context: z.string().describe('The background context and setup for this mission'),
  objectives: z.array(objectiveSchema).describe('List of mission objectives (primary and optional)'),
  rewards: rewardSchema.describe('Rewards for completing the mission'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).describe('Mission difficulty level'),
  relatedNPCs: z.array(z.string()).describe('NPCs involved in or related to this mission'),
  relatedLocations: z.array(z.string()).describe('Locations relevant to this mission'),
})

/**
 * Validate and correct skill modifiers based on proficiency flags
 * Ensures skill modifiers match: ability modifier + proficiency bonus (if proficient) + proficiency bonus (if expertise)
 */
function validateCharacterSkills(character: Character): Character {
  const proficiencyBonus = Math.floor((character.level + 7) / 4)
  
  // Helper to calculate ability modifier
  const getAbilityModifier = (score: number): number => {
    return Math.floor((score - 10) / 2)
  }
  
  // Helper to get ability modifier for a skill
  const getSkillAbilityModifier = (ability: string): number => {
    switch (ability) {
      case 'STR': return getAbilityModifier(character.attributes.strength)
      case 'DEX': return getAbilityModifier(character.attributes.dexterity)
      case 'CON': return getAbilityModifier(character.attributes.constitution)
      case 'INT': return getAbilityModifier(character.attributes.intelligence)
      case 'WIS': return getAbilityModifier(character.attributes.wisdom)
      case 'CHA': return getAbilityModifier(character.attributes.charisma)
      default: return 0
    }
  }
  
  // Map of skills to their abilities (standard D&D 5e)
  const skillToAbility: Record<string, string> = {
    'Acrobatics': 'DEX',
    'Animal Handling': 'WIS',
    'Arcana': 'INT',
    'Athletics': 'STR',
    'Deception': 'CHA',
    'History': 'INT',
    'Insight': 'WIS',
    'Intimidation': 'CHA',
    'Investigation': 'INT',
    'Medicine': 'WIS',
    'Nature': 'INT',
    'Perception': 'WIS',
    'Performance': 'CHA',
    'Persuasion': 'CHA',
    'Religion': 'INT',
    'Sleight of Hand': 'DEX',
    'Stealth': 'DEX',
    'Survival': 'WIS',
  }
  
  // Validate and correct skill modifiers
  const validatedSkills = character.skills.map(skill => {
    const ability = skillToAbility[skill.name] || 'STR'
    const baseMod = getSkillAbilityModifier(ability)
    const isExpertise = character.expertise?.includes(skill.name) || false
    const isProficient = skill.proficiency
    
    // Calculate expected modifier
    let expectedModifier = baseMod
    if (isExpertise) {
      expectedModifier = baseMod + (proficiencyBonus * 2)
    } else if (isProficient) {
      expectedModifier = baseMod + proficiencyBonus
    }
    
    // Return skill with corrected modifier if needed
    return {
      ...skill,
      modifier: expectedModifier,
    }
  })
  
  return {
    ...character,
    skills: validatedSkills,
  }
}

/**
 * Generate RPG content using OpenAI GPT-4o-mini
 */
export async function generateRPGContent(
  scenario: string,
  contentType: ContentType
): Promise<GeneratedContent> {
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    // Fallback to mock if no API key (for local development)
    console.warn('OPENAI_API_KEY not found, using mock data')
    return generateMockContent(scenario, contentType)
  }

  try {
    let schema: z.ZodType<any>
    let systemPrompt: string
    let userPrompt: string

    switch (contentType) {
      case 'character':
        schema = characterSchema
        systemPrompt = `You are an expert D&D 5e game master and character creator. Create detailed, immersive characters that feel authentic to the D&D 5e universe. Characters should have rich backstories, distinct personalities, and appropriate abilities for their level and class. Include spells appropriate to the character's class and level. IMPORTANT: Ensure all skill proficiency flags are correctly set based on class, background, and race. Include all standard racial traits for the character's race.`
        userPrompt = `Create a D&D 5e character based on this scenario: "${scenario}"

Generate a complete character with:
- A fitting name, race, class, and background
- Level between 1-10 (choose appropriately based on the scenario)
- D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA) - values typically 8-15 for starting characters, with one or two higher stats (15-17) based on class
- A compelling backstory that connects to the scenario
- Distinct personality traits
- Expertise in 2-4 skills (if the class grants expertise, like Rogue or Bard)
- Appropriate spells for their class and level
- ALL skills with accurate proficiency flags - mark proficiency: true for skills granted by class, background, or race. The modifier field should match: ability modifier + proficiency bonus (if proficient) or ability modifier + 2×proficiency bonus (if expertise)
- Racial traits: Include ALL standard D&D 5e racial features for the character's race (e.g., Tiefling: Darkvision, Hellish Resistance, Infernal Legacy; Elf: Darkvision, Fey Ancestry, Keen Senses; Dwarf: Darkvision, Dwarven Resilience, Stonecunning)
- Character traits and quirks
- Voice description (e.g., "Hoarse voice", "Sweet voice", "Angry voice", "Deep voice", "Melodic voice", "Raspy voice") - NOT dialogue phrases, just the voice quality
- Optional associated mission if relevant

CRITICAL: Ensure skill modifiers are calculated correctly. For each skill, proficiency: true means the modifier should be (ability modifier + proficiency bonus). For expertise, it should be (ability modifier + 2×proficiency bonus). Make the character feel alive and ready to use in a campaign.`
        break

      case 'environment':
        schema = environmentSchema
        systemPrompt = `You are an expert D&D 5e game master and world builder. Create immersive, atmospheric locations that bring the game world to life. Environments should have rich sensory details, mood, and interactive elements that engage players.`
        userPrompt = `Create a D&D 5e environment/location based on this scenario: "${scenario}"

Generate a complete location with:
- A memorable name
- Detailed description that sets the scene
- Ambient sounds and atmosphere
- Clear mood and emotional tone
- Lighting conditions
- Notable features players can interact with
- NPCs present in the location

Make the environment feel immersive and ready for players to explore.`
        break

      case 'mission':
        schema = missionSchema
        systemPrompt = `You are an expert D&D 5e game master and quest designer. Create engaging missions and quests that provide clear objectives, appropriate challenges, and meaningful rewards. Missions should fit naturally into a campaign and offer both primary and optional objectives.`
        userPrompt = `Create a D&D 5e mission/quest based on this scenario: "${scenario}"

Generate a complete mission with:
- An engaging title
- Detailed mission description
- Background context and setup
- 2-4 objectives (mix of primary required and optional objectives)
- Appropriate rewards (XP, gold, items) based on difficulty
- Difficulty level (easy, medium, hard, or deadly)
- Related NPCs involved
- Related locations where the mission takes place

Make the mission feel exciting and ready to run in a campaign.`
        break

      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }

    const result = await (generateObject as any)({
      model: openai('gpt-4o-mini'),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8, // Creative but consistent
    })
    
    let object = result.object

    // Validate and correct skill modifiers for characters
    if (contentType === 'character' && 'skills' in object && 'level' in object && 'attributes' in object) {
      object = validateCharacterSkills(object as Character)
    }

    return object as GeneratedContent
  } catch (error) {
    console.error('OpenAI generation error:', error)
    // Fallback to mock on error
    console.warn('Falling back to mock data due to error')
    return generateMockContent(scenario, contentType)
  }
}

// Fallback mock functions (kept for development/testing)
function generateMockContent(scenario: string, contentType: ContentType): GeneratedContent {
  switch (contentType) {
    case 'character':
      return generateMockCharacter(scenario)
    case 'environment':
      return generateMockEnvironment(scenario)
    case 'mission':
      return generateMockMission(scenario)
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

function generateMockCharacter(scenario: string): Character {
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Elf']
  const classes = ['Bard', 'Wizard', 'Fighter', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Sorcerer']
  const backgrounds = ['Entertainer', 'Sage', 'Noble', 'Criminal', 'Acolyte', 'Folk Hero', 'Hermit', 'Soldier']
  const voiceDescriptions = ['Hoarse voice', 'Sweet voice', 'Angry voice', 'Deep voice', 'Melodic voice', 'Raspy voice', 'Gentle voice', 'Commanding voice', 'Whispery voice', 'Boisterous voice']
  
  const race = races[Math.floor(Math.random() * races.length)]
  const charClass = classes[Math.floor(Math.random() * classes.length)]
  const background = backgrounds[Math.floor(Math.random() * backgrounds.length)]
  const level = Math.floor(Math.random() * 10) + 1

  const nameMatch = scenario.match(/\b([A-Z][a-z]+)\b/)
  const name = nameMatch ? nameMatch[1] : `${race} ${charClass}`

  // Generate ability scores (standard array or point buy equivalent)
  // One primary stat higher (15-17), secondary (13-15), others (10-12)
  const primaryStat = 15 + Math.floor(Math.random() * 3) // 15-17
  const secondaryStat = 13 + Math.floor(Math.random() * 3) // 13-15
  const otherStats = Array(4).fill(0).map(() => 10 + Math.floor(Math.random() * 3)) // 10-12
  
  // Assign stats based on class
  let attributes
  if (charClass === 'Wizard' || charClass === 'Sorcerer') {
    attributes = {
      strength: otherStats[0],
      dexterity: secondaryStat,
      constitution: otherStats[1],
      intelligence: primaryStat,
      wisdom: otherStats[2],
      charisma: otherStats[3],
    }
  } else if (charClass === 'Bard' || charClass === 'Paladin' || charClass === 'Sorcerer') {
    attributes = {
      strength: otherStats[0],
      dexterity: secondaryStat,
      constitution: otherStats[1],
      intelligence: otherStats[2],
      wisdom: otherStats[3],
      charisma: primaryStat,
    }
  } else if (charClass === 'Rogue' || charClass === 'Ranger') {
    attributes = {
      strength: otherStats[0],
      dexterity: primaryStat,
      constitution: secondaryStat,
      intelligence: otherStats[1],
      wisdom: otherStats[2],
      charisma: otherStats[3],
    }
  } else {
    // Fighter, Paladin, etc.
    attributes = {
      strength: primaryStat,
      dexterity: otherStats[0],
      constitution: secondaryStat,
      intelligence: otherStats[1],
      wisdom: otherStats[2],
      charisma: otherStats[3],
    }
  }

  // Expertise for classes that get it (Rogue, Bard)
  const expertise = (charClass === 'Rogue' || charClass === 'Bard')
    ? ['Stealth', 'Persuasion'].slice(0, 2)
    : []

  // Calculate proficiency bonus for mock character
  const mockProficiencyBonus = Math.floor((level + 7) / 4)
  const getMockModifier = (score: number): number => Math.floor((score - 10) / 2)
  
  // Get racial traits based on race
  const getRacialTraits = (raceName: string): string[] => {
    const raceLower = raceName.toLowerCase()
    if (raceLower.includes('tiefling')) {
      return ['Darkvision 60ft', 'Hellish Resistance', 'Infernal Legacy']
    } else if (raceLower.includes('elf')) {
      return ['Darkvision 60ft', 'Fey Ancestry', 'Keen Senses', 'Trance']
    } else if (raceLower.includes('dwarf')) {
      return ['Darkvision 60ft', 'Dwarven Resilience', 'Stonecunning']
    } else if (raceLower.includes('halfling')) {
      return ['Brave', 'Halfling Luck', 'Nimble']
    } else if (raceLower.includes('dragonborn')) {
      return ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance']
    } else if (raceLower.includes('gnome')) {
      return ['Darkvision 60ft', 'Gnome Cunning']
    } else if (raceLower.includes('half-elf')) {
      return ['Darkvision 60ft', 'Fey Ancestry', 'Skill Versatility']
    } else {
      // Human - no standard racial traits in base 5e
      return []
    }
  }
  
  const racialTraits = getRacialTraits(race)
  
  // Calculate skill modifiers correctly
  const chaMod = getMockModifier(attributes.charisma)
  const intMod = getMockModifier(attributes.intelligence)
  
  return {
    name,
    race,
    class: charClass,
    level,
    background,
    history: `Born in a ${scenario.toLowerCase().includes('tavern') ? 'tavern' : 'distant land'}, ${name} has always been drawn to ${charClass.toLowerCase()} magic. Their past is shrouded in mystery, but their connection to ${scenario} is undeniable.`,
    personality: `A ${charClass.toLowerCase()} with a ${background.toLowerCase()} background, ${name} is known for their quick wit and ${scenario.toLowerCase().includes('ancient') ? 'deep knowledge of ancient lore' : 'charming demeanor'}.`,
    attributes,
    expertise,
    spells: [
      { name: 'Magic Missile', level: 1, description: 'A dart of force strikes the target' },
      { name: 'Charm Person', level: 1, description: 'Attempt to charm a humanoid' },
      { name: 'Detect Magic', level: 1, description: 'Sense the presence of magic' },
    ].slice(0, Math.min(3, level)),
    skills: [
      { name: 'Persuasion', proficiency: true, modifier: chaMod + mockProficiencyBonus },
      { name: 'Performance', proficiency: true, modifier: chaMod + mockProficiencyBonus },
      { name: 'Investigation', proficiency: false, modifier: intMod },
      { name: 'History', proficiency: true, modifier: intMod + mockProficiencyBonus },
    ],
    traits: [
      'Quick to make friends',
      'Loves telling stories',
      'Always carries a musical instrument',
    ],
    racialTraits: racialTraits.length > 0 ? racialTraits : undefined,
    voiceDescription: voiceDescriptions[Math.floor(Math.random() * voiceDescriptions.length)],
    associatedMission: scenario.toLowerCase().includes('flute') ? 'The Lost Melody' : undefined,
  }
}

function generateMockEnvironment(scenario: string): Environment {
  const isDark = scenario.toLowerCase().includes('dark') || scenario.toLowerCase().includes('abandoned')
  const isTavern = scenario.toLowerCase().includes('tavern')
  const isTower = scenario.toLowerCase().includes('tower')

  let name = 'Mysterious Location'
  if (isTavern) name = 'The Rusty Tankard'
  if (isTower) name = 'The Abandoned Tower'
  if (scenario.toLowerCase().includes('wizard')) name = "Wizard's Sanctum"

  return {
    name,
    description: scenario || `A ${isDark ? 'dark and foreboding' : 'welcoming'} place that holds many secrets. The air is thick with ${isDark ? 'mystery and danger' : 'warmth and camaraderie'}.`,
    ambient: isDark 
      ? 'Echoing footsteps, distant whispers, the creaking of old wood'
      : 'Lively chatter, clinking mugs, crackling fire, bardic music',
    mood: isDark ? 'Tense and mysterious' : 'Warm and inviting',
    lighting: isDark ? 'Dim torchlight casting long shadows' : 'Warm firelight illuminating the space',
    features: isTavern
      ? ['Large fireplace', 'Bar counter with stools', 'Stage for performers', 'Private booths']
      : isTower
      ? ['Spiral staircase', 'Ancient library', 'Magical traps', 'Observation deck']
      : ['Mysterious artifacts', 'Hidden passages', 'Magical auras'],
    npcs: scenario.toLowerCase().includes('bard')
      ? ['The Mysterious Bard', 'Tavern Keeper', 'Local Patrons']
      : ['Guardian Spirit', 'Ancient Wizard', 'Curious Apprentice'],
  }
}

function generateMockMission(scenario: string): Mission {
  const hasArtifact = scenario.toLowerCase().includes('artifact') || scenario.toLowerCase().includes('flute')
  const hasThieves = scenario.toLowerCase().includes('thief') || scenario.toLowerCase().includes('stolen')
  const hasGuild = scenario.toLowerCase().includes('guild')

  const title = hasArtifact
    ? 'The Lost Artifact'
    : hasThieves
    ? 'Thieves\' Guild Infiltration'
    : 'A Mysterious Quest'

  const difficulty: 'easy' | 'medium' | 'hard' | 'deadly' = 
    hasGuild ? 'hard' : hasArtifact ? 'medium' : 'easy'

  return {
    title,
    description: scenario || 'A quest that will test the heroes\' resolve and skills.',
    context: hasArtifact
      ? 'An ancient artifact of great power has been stolen, and the heroes must retrieve it before it falls into the wrong hands.'
      : hasThieves
      ? 'The local thieves\' guild has been causing trouble, and someone needs to put a stop to their activities.'
      : 'A mysterious figure has approached the heroes with an offer they cannot refuse.',
    objectives: [
      { description: hasArtifact ? 'Retrieve the stolen artifact' : hasThieves ? 'Infiltrate the thieves\' guild hideout' : 'Complete the primary objective', primary: true },
      { description: 'Avoid detection', primary: false },
      { description: 'Rescue any hostages', primary: false },
    ],
    rewards: {
      xp: difficulty === 'easy' ? 200 : difficulty === 'medium' ? 500 : difficulty === 'hard' ? 1000 : 2000,
      gold: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 250 : difficulty === 'hard' ? 500 : 1000,
      items: hasArtifact 
        ? ['Ancient Artifact', 'Magical Scroll', 'Potion of Healing']
        : ['Thieves\' Tools', 'Lockpicks', 'Smoke Bomb'],
    },
    difficulty,
    relatedNPCs: hasGuild
      ? ['Guild Master', 'Thief Leader', 'Innocent Bystander']
      : ['Quest Giver', 'Ancient Guardian', 'Mysterious Benefactor'],
    relatedLocations: hasGuild
      ? ['Thieves\' Guild Hideout', 'City Streets', 'Underground Tunnels']
      : ['Ancient Ruins', 'Mysterious Tower', 'Hidden Temple'],
  }
}
