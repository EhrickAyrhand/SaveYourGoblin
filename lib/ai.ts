/**
 * AI Content Generation Library
 * 
 * Phase 1: Mock implementation with realistic data
 * Phase 2: Replace with Vercel AI SDK generateObject()/streamObject() using GPT-4o-mini
 */

import type {
  Character,
  Environment,
  Mission,
  GeneratedContent,
  ContentType,
} from '@/types/rpg'

/**
 * Generate RPG content based on scenario and content type
 * 
 * Phase 1: Returns mock data with realistic structure
 * Phase 2: Will use Vercel AI SDK with OpenAI GPT-4o-mini
 */
export async function generateRPGContent(
  scenario: string,
  contentType: ContentType
): Promise<GeneratedContent> {
  // Phase 1: Mock implementation
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Generate mock content based on type
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

  // Phase 2: Real OpenAI integration (commented for future implementation)
  /*
  import { openai } from '@ai-sdk/openai'
  import { generateObject } from 'ai'
  import { z } from 'zod'
  import { zodToJsonSchema } from 'zod-to-json-schema'

  const characterSchema = z.object({
    name: z.string(),
    race: z.string(),
    class: z.string(),
    level: z.number(),
    background: z.string(),
    history: z.string(),
    personality: z.string(),
    spells: z.array(z.object({
      name: z.string(),
      level: z.number(),
      description: z.string(),
    })),
    skills: z.array(z.object({
      name: z.string(),
      proficiency: z.boolean(),
      modifier: z.number(),
    })),
    traits: z.array(z.string()),
    voiceLines: z.array(z.string()),
    associatedMission: z.string().optional(),
  })

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: characterSchema,
    prompt: `Generate a D&D 5e character based on this scenario: ${scenario}`,
  })

  return object
  */
}

function generateMockCharacter(scenario: string): Character {
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Elf']
  const classes = ['Bard', 'Wizard', 'Fighter', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Sorcerer']
  const backgrounds = ['Entertainer', 'Sage', 'Noble', 'Criminal', 'Acolyte', 'Folk Hero', 'Hermit', 'Soldier']
  
  const race = races[Math.floor(Math.random() * races.length)]
  const charClass = classes[Math.floor(Math.random() * classes.length)]
  const background = backgrounds[Math.floor(Math.random() * backgrounds.length)]
  const level = Math.floor(Math.random() * 10) + 1

  // Extract name from scenario if possible, otherwise generate
  const nameMatch = scenario.match(/\b([A-Z][a-z]+)\b/)
  const name = nameMatch ? nameMatch[1] : `${race} ${charClass}`

  return {
    name,
    race,
    class: charClass,
    level,
    background,
    history: `Born in a ${scenario.toLowerCase().includes('tavern') ? 'tavern' : 'distant land'}, ${name} has always been drawn to ${charClass.toLowerCase()} magic. Their past is shrouded in mystery, but their connection to ${scenario} is undeniable.`,
    personality: `A ${charClass.toLowerCase()} with a ${background.toLowerCase()} background, ${name} is known for their quick wit and ${scenario.toLowerCase().includes('ancient') ? 'deep knowledge of ancient lore' : 'charming demeanor'}.`,
    spells: [
      { name: 'Magic Missile', level: 1, description: 'A dart of force strikes the target' },
      { name: 'Charm Person', level: 1, description: 'Attempt to charm a humanoid' },
      { name: 'Detect Magic', level: 1, description: 'Sense the presence of magic' },
    ].slice(0, Math.min(3, level)),
    skills: [
      { name: 'Persuasion', proficiency: true, modifier: 3 },
      { name: 'Performance', proficiency: true, modifier: 2 },
      { name: 'Investigation', proficiency: false, modifier: 1 },
      { name: 'History', proficiency: true, modifier: 2 },
    ],
    traits: [
      'Quick to make friends',
      'Loves telling stories',
      'Always carries a musical instrument',
    ],
    voiceLines: [
      `"Ah, ${scenario.toLowerCase().includes('ancient') ? 'ancient mysteries' : 'travelers'}! Come, sit and hear a tale..."`,
      '"The stories I could tell you would make your head spin!"',
      '"Every adventure begins with a single step, and every story with a single word."',
    ],
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





