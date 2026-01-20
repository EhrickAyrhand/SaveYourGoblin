/**
 * AI Content Generation Library
 * 
 * Uses Vercel AI SDK with OpenAI GPT-4o-mini for real AI generation
 */

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import type {
  Character,
  Environment,
  Mission,
  GeneratedContent,
  ContentType,
  AdvancedInput,
  AdvancedGenerationParams,
  AdvancedCharacterInput,
  AdvancedEnvironmentInput,
  AdvancedMissionInput,
} from '@/types/rpg'

// Dynamic import for franc to handle cases where it might not be installed
let francModule: { franc: (text: string) => string } | null = null

async function loadFranc() {
  if (francModule) return francModule
  try {
    const module = await import('franc')
    // franc exports a named export 'franc'
    if (module && typeof module.franc === 'function') {
      francModule = { franc: module.franc }
      return francModule
    }
    return null
  } catch (error) {
    console.warn('franc package not available, language detection will use fallback:', error)
    return null
  }
}

// Zod schemas for structured output
const spellSchema = z.object({
  name: z.string().describe('The name of the spell'),
  level: z.number().int().min(0).max(9).describe('The spell level (0-9)'),
  description: z.string().describe('A brief description of what the spell does'),
})

const classFeatureSchema = z.object({
  name: z.string().describe('The name of the class feature (e.g., "Rage", "Sneak Attack", "Bardic Inspiration")'),
  description: z.string().describe('A brief description of what the feature does'),
  level: z.number().int().min(1).max(20).describe('The level at which this feature is obtained (1-20)').optional().default(1),
})

const skillSchema = z.object({
  name: z.string().describe('The skill name (e.g., Persuasion, Stealth)'),
  proficiency: z.boolean().describe('Whether the character is proficient in this skill'),
  modifier: z.number().describe('The skill modifier (ability modifier + proficiency bonus if proficient, or ability modifier + 2×proficiency bonus if expertise)'),
})

const characterSchema = z.object({
  name: z.string().describe('The character\'s name'),
  race: z.string().describe('The character\'s race (e.g., Human, Elf, Dwarf)'),
  class: z.string().describe('The character\'s class (e.g., Fighter, Wizard, Rogue)'),
  level: z.number().int().min(1).max(20).describe('The character\'s level (1-20)'),
  background: z.string().describe('The character\'s background (e.g., Noble, Sage, Criminal)'),
  history: z.string().describe('The character\'s backstory and history'),
  personality: z.string().describe('The character\'s personality traits and quirks'),
  attributes: z.object({
    strength: z.number().int().min(1).max(20).describe('STR value (1-20)'),
    dexterity: z.number().int().min(1).max(20).describe('DEX value (1-20)'),
    constitution: z.number().int().min(1).max(20).describe('CON value (1-20)'),
    intelligence: z.number().int().min(1).max(20).describe('INT value (1-20)'),
    wisdom: z.number().int().min(1).max(20).describe('WIS value (1-20)'),
    charisma: z.number().int().min(1).max(20).describe('CHA value (1-20)'),
  }),
  expertise: z.array(z.string()).describe('Array of skill names with expertise (e.g., ["Stealth", "Persuasion"])'),
  spells: z.array(spellSchema).describe('Array of spells the character knows (empty for non-spellcasting classes)'),
  skills: z.array(skillSchema).describe('Array of skills with proficiency flags and modifiers'),
  traits: z.array(z.string()).describe('Array of personality traits and quirks'),
  racialTraits: z.array(z.string()).optional().describe('Array of racial traits for the character\'s race (standard D&D 5e racial features)'),
  classFeatures: z.array(classFeatureSchema).optional().describe('Array of class features for the character\'s class and level (ALL mandatory features)'),
  voiceDescription: z.string().describe('Description of the character\'s voice (e.g., "Hoarse voice", "Sweet voice", "Commanding voice")'),
  associatedMission: z.string().optional().describe('Optional associated mission or quest'),
})

const environmentSchema = z.object({
  name: z.string().describe('The name of the location'),
  description: z.string().describe('A detailed description of the environment'),
  ambient: z.string().describe('Ambient sounds and atmosphere description'),
  mood: z.string().describe('The overall mood of the location'),
  lighting: z.string().describe('Description of the lighting conditions'),
  features: z.array(z.string()).describe('Notable features, objects, or architectural elements'),
  npcs: z.array(z.string()).describe('List of NPCs present, each with name and short role description (e.g., "Guard Captain - Oversees the gate security")'),
  currentConflict: z.string().optional().describe('What is currently wrong or unstable in this location'),
  adventureHooks: z.array(z.string()).optional().describe('2-3 concrete hooks that can immediately involve the players'),
})

const objectiveSchema = z.object({
  description: z.string().describe('The objective description'),
  primary: z.boolean().describe('Whether this is a primary (required) or optional objective'),
  isAlternative: z.boolean().optional().describe('Whether this objective is an alternative path (mutually exclusive with other alternative objectives)'),
  pathType: z.enum(['combat', 'social', 'stealth', 'mixed']).optional().describe('Type of approach this objective represents: combat (direct confrontation), social (negotiation/diplomacy), stealth (infiltration/avoidance), or mixed (combination)'),
})

const rewardSchema = z.object({
  xp: z.number().int().min(0).optional().describe('Experience points reward'),
  gold: z.number().int().min(0).optional().describe('Gold pieces reward'),
  items: z.array(z.string()).optional().default([]).describe('List of item rewards'),
})

const powerfulItemSchema = z.object({
  name: z.string().describe('The name of the powerful item or artifact'),
  status: z.string().describe('Clarification of the item\'s status/control (e.g., "Dormant Artifact (awakens later)", "DM-controlled Artifact (unstable)", "Narrative Artifact (limited mechanical use)", "Legendary Item (standard rules apply)")'),
})

const choiceBasedRewardSchema = z.object({
  condition: z.string().describe('The condition or path that triggers these rewards (e.g., "If negotiated", "If combat", "If artifact kept")'),
  rewards: rewardSchema.optional().default({}).describe('Rewards for this specific condition/path'),
})

const missionSchema = z.object({
  title: z.string().describe('The mission/quest title'),
  description: z.string().describe('A detailed description of the mission'),
  context: z.string().describe('The background context and setup for this mission'),
  objectives: z.array(objectiveSchema).describe('List of mission objectives (primary and optional). Mark objectives as alternative paths (isAlternative: true) when they represent mutually exclusive approaches (e.g., negotiate vs. combat).'),
  rewards: rewardSchema.describe('Rewards for completing the mission'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).optional().describe('Mission difficulty level'),
  relatedNPCs: z.array(z.string()).describe('NPCs involved in or related to this mission'),
  relatedLocations: z.array(z.string()).describe('Locations relevant to this mission'),
  recommendedLevel: z.string().optional().describe('Recommended party level range based on difficulty and stakes (e.g., "Level 4-6", "Level 8-10"). Easy: 1-3, Medium: 4-6, Hard: 7-10, Deadly: 11+. World-altering stakes should match higher tier levels.'),
  powerfulItems: z.array(powerfulItemSchema).optional().describe('Powerful items or artifacts in the mission. Include clear status/control mechanism to help DMs manage game balance (e.g., dormant, DM-controlled, narrative-only).'),
  possibleOutcomes: z.array(z.string()).optional().describe('3-4 possible outcomes based on different player choices, showing concrete consequences (e.g., "If Lirael succeeds → magic becomes unstable", "If artifact is destroyed → imbalance spreads").'),
  choiceBasedRewards: z.array(choiceBasedRewardSchema).optional().describe('Optional rewards tied to specific choices or paths (e.g., "If negotiated: alliance + favor", "If combat: reputation + fear").'),
})

/**
 * Detect language from text input and return language name for AI prompts
 * Uses simple heuristics if franc is not available
 */
function detectLanguageSync(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'English'
  }

  // Enhanced heuristic-based detection as fallback
  const textLower = text.toLowerCase()
  const words = textLower.split(/\s+/).filter(w => w.length > 0)
  const textLength = textLower.length
  
  // Portuguese indicators - more comprehensive
  const ptIndicators = ['é', 'ã', 'õ', 'ç', 'á', 'ê', 'ô', 'ú', 'í', 'ó', 'à', 'è', 'ì', 'ò', 'ù']
  const ptCommonWords = ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'suas', 'numa', 'pelos', 'pelas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe', 'deles', 'essas', 'esses']
  const ptCharacteristicWords = ['bardo', 'taverna', 'mago', 'torre', 'artefato', 'guilda', 'ladrão', 'missão', 'personagem', 'ambiente', 'herói', 'vilão', 'espada', 'magia', 'feitiço', 'dragão', 'elfo', 'anão']
  
  // Spanish indicators - more comprehensive
  const esIndicators = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡']
  const esCommonWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo', 'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese', 'la', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy', 'sin', 'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo', 'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero', 'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella', 'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'cosa', 'tanto', 'hombre', 'parecer', 'nuestro', 'tan', 'donde', 'ahora', 'parte', 'después', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar', 'dejar', 'nada', 'cada', 'seguir', 'menos', 'nuevo', 'encontrar', 'algo', 'solo']
  const esCharacteristicWords = ['bardo', 'taberna', 'mago', 'torre', 'artefacto', 'gremio', 'ladrón', 'misión', 'personaje', 'entorno', 'héroe', 'villano', 'espada', 'magia', 'hechizo', 'dragón', 'elfo', 'enano']
  
  // Count Portuguese indicators
  let ptScore = 0
  // Character-based scoring (weighted more heavily)
  for (const char of textLower) {
    if (ptIndicators.includes(char)) ptScore += 3
  }
  // Common word scoring
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '')
    if (ptCommonWords.includes(cleanWord)) ptScore += 2
    if (ptCharacteristicWords.includes(cleanWord)) ptScore += 5
  }
  
  // Count Spanish indicators
  let esScore = 0
  // Character-based scoring (weighted more heavily)
  for (const char of textLower) {
    if (esIndicators.includes(char)) esScore += 3
  }
  // Common word scoring
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '')
    if (esCommonWords.includes(cleanWord)) esScore += 2
    if (esCharacteristicWords.includes(cleanWord)) esScore += 5
  }
  
  // Normalize scores by text length for better accuracy
  const ptNormalized = ptScore / Math.max(textLength / 50, 1)
  const esNormalized = esScore / Math.max(textLength / 50, 1)
  
  // Return detected language based on scores with higher threshold
  if (ptNormalized > esNormalized && ptNormalized > 1.5) {
    console.log('[Language Detection] Heuristic detected Portuguese (pt:', ptNormalized.toFixed(2), 'es:', esNormalized.toFixed(2), ')')
    return 'Portuguese'
  }
  if (esNormalized > ptNormalized && esNormalized > 1.5) {
    console.log('[Language Detection] Heuristic detected Spanish (pt:', ptNormalized.toFixed(2), 'es:', esNormalized.toFixed(2), ')')
    return 'Spanish'
  }
  
  // Default to English
  console.log('[Language Detection] Heuristic defaulting to English (pt:', ptNormalized.toFixed(2), 'es:', esNormalized.toFixed(2), ')')
  return 'English'
}

/**
 * Detect language from text input using franc if available, otherwise use heuristics
 */
async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    console.log('[Language Detection] Empty text, defaulting to English')
    return 'English'
  }

  // Minimum text length for reliable detection
  const trimmedText = text.trim()
  if (trimmedText.length < 10) {
    console.log('[Language Detection] Text too short, using heuristics:', trimmedText.substring(0, 30))
    return detectLanguageSync(text)
  }

  let detectedCode: string | null = null
  let detectionMethod = 'heuristic'

  try {
    const francModule = await loadFranc()
    if (francModule && francModule.franc) {
      // Use franc for detection
      detectedCode = francModule.franc(trimmedText)
      detectionMethod = 'franc'
      console.log('[Language Detection] franc detected:', detectedCode, 'from text:', trimmedText.substring(0, 50))
      
      // Map language codes to language names
      // franc returns ISO 639-3 codes
      if (detectedCode === 'por' || detectedCode === 'pt') {
        console.log('[Language Detection] Detected Portuguese via franc')
        return 'Portuguese'
      }
      if (detectedCode === 'spa' || detectedCode === 'es') {
        console.log('[Language Detection] Detected Spanish via franc')
        return 'Spanish'
      }
      if (detectedCode === 'eng' || detectedCode === 'en') {
        console.log('[Language Detection] Detected English via franc')
        return 'English'
      }
      
      // For uncertain detection, fall back to heuristics
      if (detectedCode === 'und' || !detectedCode) {
        console.log('[Language Detection] franc returned uncertain, using heuristics')
        return detectLanguageSync(text)
      }
      
      // If franc detected something else, still try heuristics for our target languages
      console.log('[Language Detection] franc detected unknown language:', detectedCode, ', trying heuristics')
    }
  } catch (error) {
    console.warn('[Language Detection] Error using franc, using fallback:', error)
  }
  
  // Fallback to heuristic detection
  const heuristicResult = detectLanguageSync(text)
  console.log('[Language Detection] Using', detectionMethod, 'method, result:', heuristicResult)
  return heuristicResult
}

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
  
  // Update skill modifiers
  const updatedSkills = character.skills.map(skill => {
    const ability = skillToAbility[skill.name] || 'STR'
    const abilityModifier = getSkillAbilityModifier(ability)
    const hasExpertise = character.expertise.includes(skill.name)
    const correctModifier = abilityModifier + (skill.proficiency ? proficiencyBonus : 0) + (hasExpertise ? proficiencyBonus : 0)
    
    return {
      ...skill,
      modifier: correctModifier,
    }
  })
  
  return {
    ...character,
    skills: updatedSkills,
  }
}

/**
 * Generate RPG content using AI
 */
export async function generateRPGContent(
  scenario: string,
  contentType: ContentType,
  advancedInput?: AdvancedInput,
  generationParams?: AdvancedGenerationParams
): Promise<GeneratedContent> {
  // Require OpenAI API key - no fallback to mock
  const rawKey = process.env.OPENAI_API_KEY?.trim()
  if (!rawKey || rawKey.length === 0) {
    throw new Error('OPENAI_API_KEY is required but not configured. Add it to .env.local (local) or Vercel env (production).')
  }
  // Valid OpenAI keys start with sk- or sk-proj-
  if (!rawKey.startsWith('sk-') && !rawKey.startsWith('sk-proj-')) {
    throw new Error(
      'OPENAI_API_KEY must start with sk- or sk-proj-. The value in .env.local looks wrong. ' +
      'Get a key from https://platform.openai.com/api-keys and set: OPENAI_API_KEY=sk-your-key (no quotes, no extra spaces).'
    )
  }
  const openai = createOpenAI({ apiKey: rawKey })

  try {
    // Detect language from scenario text AND advanced inputs
    // Combine scenario with any text from advanced inputs for better detection
    let textForDetection = scenario
    if (advancedInput && contentType === 'character') {
      const charInput = advancedInput as AdvancedCharacterInput
      if (charInput.class) textForDetection += ' ' + charInput.class
      if (charInput.race) textForDetection += ' ' + charInput.race
      if (charInput.background) textForDetection += ' ' + charInput.background
    }
    
    let detectedLanguage = await detectLanguage(textForDetection)
    console.log('[AI Generation] Detected language:', detectedLanguage, 'for scenario:', scenario.substring(0, 100))
    
    // Validate detected language
    const validLanguages = ['English', 'Portuguese', 'Spanish']
    if (!detectedLanguage || !validLanguages.includes(detectedLanguage)) {
      console.warn('[AI Generation] Invalid detected language:', detectedLanguage, ', defaulting to English')
      detectedLanguage = 'English'
    }
    
    console.log('[AI Generation] Final language for generation:', detectedLanguage)
    
    let schema: z.ZodType<any>
    let systemPrompt: string
    let userPrompt: string

    // Helper function to normalize class names (map common variations to D&D 5e standard names)
    const normalizeClassName = (className?: string): string | undefined => {
      if (!className) return undefined
      const normalized = className.trim()
      const classMap: Record<string, string> = {
        'warrior': 'Fighter',
        'guerreiro': 'Fighter',
        'fighter': 'Fighter',
        'barbarian': 'Barbarian',
        'bárbaro': 'Barbarian',
        'rogue': 'Rogue',
        'ladino': 'Rogue',
        'bard': 'Bard',
        'bardo': 'Bard',
        'wizard': 'Wizard',
        'mago': 'Wizard',
        'cleric': 'Cleric',
        'clérigo': 'Cleric',
        'ranger': 'Ranger',
        'patrulheiro': 'Ranger',
        'paladin': 'Paladin',
        'paladino': 'Paladin',
        'monk': 'Monk',
        'monge': 'Monk',
        'sorcerer': 'Sorcerer',
        'feiticeiro': 'Sorcerer',
        'warlock': 'Warlock',
        'bruxo': 'Warlock',
        'druid': 'Druid',
        'druida': 'Druid',
      }
      return classMap[normalized.toLowerCase()] || normalized
    }

    // Helper function to normalize background names
    const normalizeBackgroundName = (background?: string): string | undefined => {
      if (!background) return undefined
      const normalized = background.trim()
      const backgroundMap: Record<string, string> = {
        'artist': 'Entertainer',
        'artista': 'Entertainer',
        'entertainer': 'Entertainer',
        'noble': 'Noble',
        'nobre': 'Noble',
        'sage': 'Sage',
        'sábio': 'Sage',
        'acolyte': 'Acolyte',
        'acólito': 'Acolyte',
        'criminal': 'Criminal',
        'criminoso': 'Criminal',
      }
      return backgroundMap[normalized.toLowerCase()] || normalized
    }

    // Helper function to build constraints from advanced inputs
    const buildAdvancedConstraints = (contentType: ContentType, input?: AdvancedInput): string => {
      if (!input) return ''
      
      const constraints: string[] = []
      
      if (contentType === 'character' && 'level' in input) {
        const charInput = input as AdvancedCharacterInput
        // Normalize class and background names
        const normalizedClass = normalizeClassName(charInput.class)
        const normalizedBackground = normalizeBackgroundName(charInput.background)
        
        if (charInput.level) {
          constraints.push(`CRITICAL: The character MUST be exactly level ${charInput.level}. Do NOT change this level.`)
        }
        if (normalizedClass) {
          constraints.push(`CRITICAL: The character MUST be a ${normalizedClass}. Do NOT use any other class. The "class" field in the JSON response must be exactly "${normalizedClass}".`)
        }
        if (charInput.race) {
          constraints.push(`CRITICAL: The character MUST be a ${charInput.race}. Do NOT use any other race. The "race" field in the JSON response must be exactly "${charInput.race}".`)
        }
        if (normalizedBackground) {
          constraints.push(`CRITICAL: The character MUST have the ${normalizedBackground} background. Do NOT use any other background. The "background" field in the JSON response must be exactly "${normalizedBackground}".`)
        }
      } else if (contentType === 'environment' && 'mood' in input) {
        const envInput = input as AdvancedEnvironmentInput
        if (envInput.mood) constraints.push(`The environment MUST have a ${envInput.mood} mood`)
        if (envInput.lighting) constraints.push(`The environment MUST have ${envInput.lighting} lighting`)
        if (envInput.npcCount !== undefined) constraints.push(`The environment MUST include exactly ${envInput.npcCount} NPC${envInput.npcCount !== 1 ? 's' : ''}`)
      } else if (contentType === 'mission' && 'difficulty' in input) {
        const missionInput = input as AdvancedMissionInput
        if (missionInput.difficulty) constraints.push(`The mission MUST be ${missionInput.difficulty} difficulty`)
        if (missionInput.objectiveCount) constraints.push(`The mission MUST have exactly ${missionInput.objectiveCount} objective${missionInput.objectiveCount !== 1 ? 's' : ''}`)
        if (missionInput.rewardTypes && missionInput.rewardTypes.length > 0) {
          constraints.push(`The mission rewards MUST include: ${missionInput.rewardTypes.join(', ')}`)
        }
      }
      
      if (constraints.length === 0) return ''
      return `\n\n═══════════════════════════════════════════════════════\nCRITICAL USER REQUIREMENTS (MUST BE FOLLOWED EXACTLY):\n═══════════════════════════════════════════════════════\n${constraints.map(c => `• ${c}`).join('\n')}\n═══════════════════════════════════════════════════════\n\nThese requirements are ABSOLUTELY MANDATORY. The JSON output MUST match these specifications exactly. Do not deviate from these requirements.`
    }

    // Helper function to adjust tone in prompts
    const getToneInstruction = (tone?: string): string => {
      if (!tone) return ''
      switch (tone) {
        case 'serious':
          return ' Maintain a serious, dramatic tone throughout. Focus on realism and consequences.'
        case 'playful':
          return ' Maintain a light, playful tone throughout. Include humor and whimsical elements where appropriate.'
        case 'balanced':
        default:
          return ' Maintain a balanced tone that can include both serious and light moments as appropriate.'
      }
    }

    // Helper function to adjust complexity in prompts
    const getComplexityInstruction = (complexity?: string): string => {
      if (!complexity) return ''
      switch (complexity) {
        case 'simple':
          return ' Keep descriptions concise and straightforward. Focus on essential details only.'
        case 'detailed':
          return ' Provide extensive, rich details. Include sensory descriptions, deeper motivations, and elaborate world-building elements.'
        case 'standard':
        default:
          return ''
      }
    }

    // Get generation parameters with defaults
    const temperature = generationParams?.temperature ?? 0.8
    const toneInstruction = getToneInstruction(generationParams?.tone)
    const complexityInstruction = getComplexityInstruction(generationParams?.complexity)
    const complexity = generationParams?.complexity || 'standard' // Store for later checks
    const tone = generationParams?.tone || 'balanced' // Store for later checks
    const advancedConstraints = buildAdvancedConstraints(contentType, advancedInput)

    switch (contentType) {
      case 'character':
        schema = characterSchema
        const charInput = advancedInput as AdvancedCharacterInput | undefined
        // Normalize class and background for consistent matching
        const normalizedClass = normalizeClassName(charInput?.class)
        const normalizedBackground = normalizeBackgroundName(charInput?.background)
        const charLevel = charInput?.level ? ` Level ${charInput.level}` : ''
        const charClass = normalizedClass ? ` ${normalizedClass}` : ''
        const charRace = charInput?.race ? ` ${charInput.race}` : ''
        
        systemPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario is written in ${detectedLanguage}. You MUST generate ALL content in ${detectedLanguage}. This includes ALL text, descriptions, names, titles, dialogue, and every single word of output. Every field must be in ${detectedLanguage}. 

Example: If the user writes in Portuguese like "um bardo na taverna", you MUST respond with Portuguese names like "João" or "Maria", Portuguese descriptions, and all text in Portuguese. If the user writes in Spanish like "un bardo en la taberna", respond with Spanish names like "Juan" or "María" and all text in Spanish.

You are an expert D&D 5e game master and character creator. Create detailed, immersive characters that feel authentic to the D&D 5e universe. Characters should have rich backstories, distinct personalities, and appropriate abilities for their level and class.${toneInstruction}${complexityInstruction} Include spells appropriate to the character's class and level. IMPORTANT: Ensure all skill proficiency flags are correctly set based on class, background, and race. Include all standard racial traits for the character's race. CRITICAL: Every character MUST include ALL mandatory class features for their class and level - this is non-negotiable. Non-spellcasting classes (Barbarian, Rogue, Fighter, Monk) must have their complete feature list.

OUTPUT FORMAT: You MUST output a single valid JSON object with ALL required fields. Output them in this order: name, race, class, level, background, attributes, expertise, skills, traits, voiceDescription, history, personality, spells. CRITICAL: history = 2-5 sentences only. personality = 2-4 sentences only. Do NOT write long paragraphs, random words, code, or multiple languages in any field. Each spell: { name (string), level (number 0-9), description (string) }. Each skill: { name (string), proficiency (boolean), modifier (number) }. Do not output anything outside the JSON.

FINAL REMINDER: The user wrote in ${detectedLanguage}. All output MUST be in ${detectedLanguage}. Every name, description, trait, and text field must be in ${detectedLanguage}.`
        // Build name instruction with emphasis on unique names
        const nameInstruction = `CRITICAL: Generate a UNIQUE, CREATIVE character name appropriate for ${detectedLanguage} culture. DO NOT use generic names like "${charInput?.race || 'Race'} ${normalizedClass || 'Class'}" or literal translations. Create an authentic, memorable name that fits the character's background and culture (e.g., ${detectedLanguage === 'Portuguese' ? 'João, Maria, Carlos, Elena, Rafael' : detectedLanguage === 'Spanish' ? 'Juan, María, Carlos, Elena, Rafael' : 'John, Mary, Charles, Elena, Robert'}). The name field must contain ONLY the character's name, not their race and class.`

        // Build spell instruction based on class
        const spellInstruction = normalizedClass === 'Wizard' 
          ? `- Spells: For Wizards, include ALL spells appropriate for level ${charInput?.level || 'the character'}. A ${charInput?.level || 'low-level'} Wizard should have 6-10 spells in their spellbook (mix of cantrips and leveled spells). Include essential spells like Magic Missile, Detect Magic, Mage Armor, and other spells fitting their level and specialization. The spells array must contain multiple spells, not just 3.`
          : normalizedClass && ['Sorcerer', 'Bard', 'Cleric', 'Paladin', 'Ranger', 'Warlock', 'Druid'].includes(normalizedClass)
          ? `- Spells: Include appropriate spells for a ${normalizedClass} of this level (typically 4-8 spells for lower levels, more for higher levels).`
          : `- Spells: Non-spellcasting classes must have an empty spells array [].`

        userPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario below is written in ${detectedLanguage}. You MUST respond entirely in ${detectedLanguage}. Every word, name, description, and text must be in ${detectedLanguage}.

Create a D&D 5e character based on this scenario: "${scenario}"${charLevel}${charClass}${charRace}${advancedConstraints}

IMPORTANT: The scenario above is written in ${detectedLanguage}. You MUST match this language exactly. All character names, descriptions, backstories, personality traits, and every single text field must be in ${detectedLanguage}. Use names appropriate for ${detectedLanguage} culture (e.g., ${detectedLanguage === 'Portuguese' ? 'João, Maria, Carlos' : detectedLanguage === 'Spanish' ? 'Juan, María, Carlos' : 'John, Mary, Charles'}).

${nameInstruction}

Generate a complete character with:
- Name: ${nameInstruction}${charInput?.level ? `\n- CRITICAL: MUST be exactly level ${charInput.level} (the "level" field in JSON must be ${charInput.level})` : '\n- Level between 1-10 (choose appropriately based on the scenario)'}${normalizedClass ? `\n- CRITICAL: MUST be a ${normalizedClass} (the "class" field in JSON must be exactly "${normalizedClass}")` : ''}${charInput?.race ? `\n- CRITICAL: MUST be a ${charInput.race} (the "race" field in JSON must be exactly "${charInput.race}")` : ''}${normalizedBackground ? `\n- CRITICAL: MUST have the ${normalizedBackground} background (the "background" field in JSON must be exactly "${normalizedBackground}")` : ''}
- D&D 5e ability scores (STR, DEX, CON, INT, WIS, CHA) - values typically 8-15 for starting characters, with one or two higher stats (15-17) based on class
- A compelling backstory that connects to the scenario${complexity === 'detailed' ? '. This backstory MUST be detailed and rich with descriptions. Write at least 2-3 paragraphs exploring the character\'s past, motivations, and connections.' : ' (written entirely in ' + detectedLanguage + ')'}${tone === 'serious' ? ' Maintain a serious, dramatic tone. Focus on realism, consequences, and meaningful experiences that shaped the character.' : ''} (ALL text in ${detectedLanguage})
- Distinct personality traits (described in ${detectedLanguage}, at least 3-4 traits that make the character unique)
- Expertise in 2-4 skills (if the class grants expertise, like Rogue or Bard)
${spellInstruction}
- ALL skills with accurate proficiency flags - mark proficiency: true for skills granted by class, background, or race. The modifier field should match: ability modifier + proficiency bonus (if proficient) or ability modifier + 2×proficiency bonus (if expertise)
- Racial traits: Include ALL standard D&D 5e racial features for the character's race (e.g., Tiefling: Darkvision, Hellish Resistance, Infernal Legacy; Elf: Darkvision, Fey Ancestry, Keen Senses; Dwarf: Darkvision, Dwarven Resilience, Stonecunning)
- Class Features: Include ALL mandatory class features for this class and level. This is REQUIRED for every character. Examples:
  * Barbarian (Level 3): Rage (Level 1), Unarmored Defense (Level 1), Reckless Attack (Level 2), Danger Sense (Level 2), Primal Path feature (Level 3)
  * Rogue (Level 3): Sneak Attack (Level 1), Thieves' Cant (Level 1), Expertise (Level 1), Cunning Action (Level 2), Roguish Archetype feature (Level 3)
  * Fighter (Level 3): Fighting Style (Level 1), Second Wind (Level 1), Action Surge (Level 2), Martial Archetype feature (Level 3)
  * Monk (Level 3): Unarmored Defense (Level 1), Martial Arts (Level 1), Ki (Level 2), Unarmored Movement (Level 2), Monastic Tradition feature (Level 3)
  * Spellcasting classes (Bard, Wizard, etc.) must also include their class features (e.g., Bardic Inspiration for Bard, Arcane Recovery for Wizard)
- Character traits and quirks
- Voice description (e.g., "Hoarse voice", "Sweet voice", "Angry voice", "Deep voice", "Melodic voice", "Raspy voice") - NOT dialogue phrases, just the voice quality
- Optional associated mission if relevant

CRITICAL: 
1. Ensure skill modifiers are calculated correctly. For each skill, proficiency: true means the modifier should be (ability modifier + proficiency bonus). For expertise, it should be (ability modifier + 2×proficiency bonus).
2. Class features are MANDATORY - every character must have their complete class feature list. Non-spellcasting classes cannot rely on spells alone.
3. Make the character feel alive and ready to use in a campaign.
4. FINAL REMINDER: EVERY SINGLE TEXT FIELD MUST BE IN ${detectedLanguage}. Names, descriptions, traits, backstory, personality - everything must be in ${detectedLanguage}.`
        break

      case 'environment':
        schema = environmentSchema
        const envInput = advancedInput as AdvancedEnvironmentInput | undefined
        const envMood = envInput?.mood ? ` with a ${envInput.mood} mood` : ''
        const envLighting = envInput?.lighting ? ` with ${envInput.lighting} lighting` : ''
        const envNPCs = envInput?.npcCount !== undefined ? ` with exactly ${envInput.npcCount} NPC${envInput.npcCount !== 1 ? 's' : ''}` : ''
        
        systemPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario is written in ${detectedLanguage}. You MUST generate ALL content in ${detectedLanguage}. This includes ALL text, descriptions, names, titles, dialogue, and every single word of output. Every field must be in ${detectedLanguage}.

Example: If the user writes in Portuguese like "uma torre de mago", you MUST respond with Portuguese location names like "Torre do Mago" and all descriptions in Portuguese. If the user writes in Spanish like "una torre del mago", respond with Spanish names like "Torre del Mago" and all text in Spanish.

You are an expert D&D 5e game master and world builder. Create immersive, atmospheric locations that bring the game world to life.${toneInstruction}${complexityInstruction} Environments should have rich sensory details, mood, and interactive elements that engage players.

FINAL REMINDER: The user wrote in ${detectedLanguage}. All output MUST be in ${detectedLanguage}. Every name, description, feature, and text field must be in ${detectedLanguage}.`
        userPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario below is written in ${detectedLanguage}. You MUST respond entirely in ${detectedLanguage}. Every word, name, description, and text must be in ${detectedLanguage}.

Create a D&D 5e environment/location based on this scenario: "${scenario}"${envMood}${envLighting}${envNPCs}${advancedConstraints}

IMPORTANT: The scenario above is written in ${detectedLanguage}. You MUST match this language exactly. All location names, descriptions, features, NPC names, and every single text field must be in ${detectedLanguage}. Use names appropriate for ${detectedLanguage} culture.

Generate a complete location with the following clearly separated sections (ALL in ${detectedLanguage}):
${envInput?.mood ? `- Mood: MUST be ${envInput.mood}` : '- Mood: The emotional tone players should feel upon entering, described in ${detectedLanguage} (keep this distinct from the description)'}
${envInput?.lighting ? `- Lighting: MUST be ${envInput.lighting}` : '- Lighting: Lighting conditions and visibility described in ${detectedLanguage} (do NOT repeat description text)'}
- Name: A memorable and unique location name (in ${detectedLanguage}, appropriate for ${detectedLanguage} culture)
- Description: A vivid visual description of the place in ${detectedLanguage} (do NOT describe mood or lighting here)
- Atmosphere: Ambient sounds, smells, and environmental details (described in ${detectedLanguage})
- Notable Features: Interactive elements players can investigate or use (described in ${detectedLanguage})
- NPCs: ${envInput?.npcCount !== undefined ? `Exactly ${envInput.npcCount} NPC${envInput.npcCount !== 1 ? 's' : ''}, each with a short role description in ${detectedLanguage}` : 'Key NPCs present, each with a short role description in ${detectedLanguage} (NPC names should be in ${detectedLanguage})'}${envInput?.npcCount === 0 ? ' (no NPCs should be included)' : ''}
- Current Conflict: What is currently wrong or unstable in this location (described in ${detectedLanguage})
- Adventure Hooks: 2-3 concrete hooks that can immediately involve the players (written in ${detectedLanguage})

Make the environment feel immersive, playable, and ready to use at the table.
Avoid repeating the same text across sections.

FINAL REMINDER: EVERY SINGLE TEXT FIELD MUST BE IN ${detectedLanguage}. Location name, all descriptions, NPC names, features, conflicts, hooks - everything must be in ${detectedLanguage}.`
        break

      case 'mission':
        schema = missionSchema
        const missionInput = advancedInput as AdvancedMissionInput | undefined
        const missionDifficulty = missionInput?.difficulty ? ` with ${missionInput.difficulty} difficulty` : ''
        const missionObjectives = missionInput?.objectiveCount ? ` with exactly ${missionInput.objectiveCount} objective${missionInput.objectiveCount !== 1 ? 's' : ''}` : ''
        const missionRewards = missionInput?.rewardTypes && missionInput.rewardTypes.length > 0 
          ? ` with rewards including: ${missionInput.rewardTypes.join(', ')}` 
          : ''
        
        systemPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario is written in ${detectedLanguage}. You MUST generate ALL content in ${detectedLanguage}. This includes ALL text, descriptions, names, titles, dialogue, and every single word of output. Every field must be in ${detectedLanguage}.

Example: If the user writes in Portuguese like "recuperar um artefato", you MUST respond with Portuguese mission titles like "A Recuperação do Artefato" and all descriptions in Portuguese. If the user writes in Spanish like "recuperar un artefacto", respond with Spanish titles like "La Recuperación del Artefacto" and all text in Spanish.

You are an expert D&D 5e game master and quest designer. Create engaging missions and quests that provide clear objectives, appropriate challenges, and meaningful rewards.${toneInstruction}${complexityInstruction} Missions should fit naturally into a campaign and offer both primary and optional objectives. CRITICAL: Ensure difficulty matches stakes (world-altering content requires higher tier levels). Clarify artifact power and control mechanisms. Mark alternative objective paths clearly. Define concrete consequences for player choices.

FINAL REMINDER: The user wrote in ${detectedLanguage}. All output MUST be in ${detectedLanguage}. Every title, description, objective, reward, and text field must be in ${detectedLanguage}.`
        userPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario below is written in ${detectedLanguage}. You MUST respond entirely in ${detectedLanguage}. Every word, name, description, and text must be in ${detectedLanguage}.

Create a D&D 5e mission/quest based on this scenario: "${scenario}"${missionDifficulty}${missionObjectives}${missionRewards}${advancedConstraints}

IMPORTANT: The scenario above is written in ${detectedLanguage}. You MUST match this language exactly. All mission titles, descriptions, objectives, rewards, NPC names, location names, and every single text field must be in ${detectedLanguage}. Use names appropriate for ${detectedLanguage} culture.

Generate a complete mission with the following (ALL in ${detectedLanguage}):
${missionInput?.difficulty ? `- Difficulty: MUST be ${missionInput.difficulty}` : '- Difficulty: Level (easy, medium, hard, or deadly) - must align with stakes and recommended level'}
- Title: An engaging mission title (in ${detectedLanguage})
- Description: Detailed mission description (written entirely in ${detectedLanguage})
- Context: Background context and setup (written in ${detectedLanguage})
- Recommended Level: Party level range based on difficulty and stakes (Easy: 1-3, Medium: 4-6, Hard: 7-10, Deadly: 11+). World-altering stakes (artifacts, prophecies, world balance) should match higher tier levels. Format the level text in ${detectedLanguage}.
- Objectives: ${missionInput?.objectiveCount ? `Exactly ${missionInput.objectiveCount} objective${missionInput.objectiveCount !== 1 ? 's' : ''}` : '2-4 objectives (mix of primary required and optional)'}, all described in ${detectedLanguage}. When objectives represent different approaches (e.g., negotiate vs. combat), mark them as alternative paths (isAlternative: true) and specify pathType (combat, social, stealth, or mixed).
- Powerful Items: If the mission involves artifacts or powerful items, include them with clear status descriptions in ${detectedLanguage} (e.g., "Dormant Artifact (awakens later)", "DM-controlled Artifact (unstable)", "Narrative Artifact (limited mechanical use)") to help DMs manage game balance. Item names should be in ${detectedLanguage}.
- Possible Outcomes: 3-4 possible outcomes showing concrete consequences of different player choices, all written in ${detectedLanguage} (e.g., "If negotiated → alliance formed, sorceress becomes ally", "If combat → reputation gained, but faction becomes hostile", "If artifact kept → future consequences arise").
- Rewards: Base rewards (${missionInput?.rewardTypes && missionInput.rewardTypes.length > 0 ? missionInput.rewardTypes.join(', ') : 'XP, gold, items'}) appropriate for difficulty level. Item names and descriptions must be in ${detectedLanguage}.
- Choice-Based Rewards: Optional rewards tied to specific paths/choices, all described in ${detectedLanguage} (e.g., "If negotiated: alliance + favor + knowledge", "If combat: reputation + fear + loot", "If artifact sealed: future quest hook").
- Related NPCs: NPCs involved in the mission (NPC names and descriptions in ${detectedLanguage})
- Related Locations: Locations relevant to the mission (location names in ${detectedLanguage})

Make the mission feel exciting, playable, and ready to run in a campaign. Ensure difficulty matches the scope of stakes.

FINAL REMINDER: EVERY SINGLE TEXT FIELD MUST BE IN ${detectedLanguage}. Mission title, all descriptions, objective texts, reward item names, NPC names, location names, outcomes - everything must be in ${detectedLanguage}.`
        break

      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }

    const finalTemperature = Math.max(0.1, Math.min(1.2, temperature)) // Cap at 1.2 to reduce runaway text in history/personality

    const result = await (generateObject as any)({
      model: openai('gpt-4o-mini'),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: finalTemperature,
      maxTokens: 16384, // Full character JSON needs room; default truncates before attributes/skills/spells/traits/voiceDescription
    })

    let object = result.object

    // Validate and correct skill modifiers for characters
    if (contentType === 'character' && 'skills' in object && 'level' in object && 'attributes' in object) {
      object = validateCharacterSkills(object as Character)
    }

    // Mission difficulty: prefer user's choice from advanced input, then model's, then default medium
    if (contentType === 'mission' && object) {
      const m = object as Mission
      const req = (advancedInput as AdvancedMissionInput)?.difficulty
      m.difficulty = (req === 'easy' || req === 'medium' || req === 'hard' || req === 'deadly' ? req : m.difficulty) || 'medium'
    }

    return object as GeneratedContent
  } catch (error) {
    // #region agent log
    const err = error as { name?: string; value?: unknown; cause?: { issues?: Array<{ path?: unknown; code?: string; expected?: string; received?: string }> } }
    const v = err?.value
    const isObj = v != null && typeof v === 'object'
    const valueKeys = isObj ? Object.keys(v as object) : null
    const valueStr = isObj ? JSON.stringify(v) : String(v)
    const valueStrLength = valueStr.length
    const valueStrEnd = valueStrLength > 400 ? valueStr.slice(-400) : valueStr
    const val = v as Record<string, unknown> | undefined
    const valueHistoryLen = val?.history != null ? String(val.history).length : null
    const valuePersonalityLen = val?.personality != null ? String(val.personality).length : null
    const issuesDetail = err?.cause?.issues?.slice(0, 14).map(i => ({ path: i.path, code: i.code, expected: i.expected, received: i.received })) ?? []
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:catch',message:'generateObject error',data:{name:err?.name,valueKeys,valueKeysCount:valueKeys?.length??0,valueStrLength,valueStrEnd,valueHistoryLen,valuePersonalityLen,issuePaths:err?.cause?.issues?.map(i=>i.path),issuesDetail},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
    // #endregion
    console.error('OpenAI generation error:', error)
    // Re-throw error - no fallback to mock
    throw error
  }
}

/**
 * Generate a variation of existing content
 * Creates a similar but different version of the original content
 */
export async function generateContentVariation(
  originalContent: GeneratedContent,
  contentType: ContentType,
  originalScenario: string,
  variationPrompt?: string
): Promise<GeneratedContent> {
  // Build a summary of the original content for context
  let originalSummary = ''
  
  if (contentType === 'character') {
    const char = originalContent as Character
    originalSummary = `${char.name}, a ${char.race} ${char.class} (Level ${char.level}). ${char.personality || char.history || ''}`
  } else if (contentType === 'environment') {
    const env = originalContent as Environment
    originalSummary = `${env.name}: ${env.description.substring(0, 200)}...`
  } else if (contentType === 'mission') {
    const mission = originalContent as Mission
    originalSummary = `${mission.title}: ${mission.description.substring(0, 200)}...`
  }

  // Build variation scenario prompt
  const variationInstructions = variationPrompt 
    ? ` Make the following specific changes: ${variationPrompt}`
    : ' Create a similar but distinctly different version with unique characteristics, different details, and fresh elements while maintaining the same general theme and type.'

  const variationScenario = `Based on this ${contentType}: "${originalSummary}"${variationInstructions} The original scenario was: "${originalScenario}". Generate a new variation that is similar in theme but different in specific details.`

  // Use existing generation function with variation scenario
  return await generateRPGContent(
    variationScenario,
    contentType,
    undefined, // No advanced input for variations
    { temperature: 0.9 } // Slightly higher temperature for more variation
  )
}

/**
 * Regenerate a specific section of generated content
 * Returns only the regenerated section data, not the full content.
 * For environment npcs, sectionIndex regenerates only the NPC at that 0-based index (returns a string).
 */
export async function generateRPGContentSection(
  scenario: string,
  contentType: ContentType,
  section: string,
  currentContent: any,
  sectionIndex?: number
): Promise<any> {
  // Detect language from scenario
  const detectedLanguage = await detectLanguage(scenario)
  const validLanguages = ['English', 'Portuguese', 'Spanish']
  const finalLanguage = validLanguages.includes(detectedLanguage) ? detectedLanguage : 'English'

  // Build section-specific prompts
  let systemPrompt: string
  let userPrompt: string
  let schema: z.ZodType<any>

  // Define sections that can be regenerated for each content type
  const characterSections: Record<string, { schema: z.ZodType<any>, description: string }> = {
    spells: {
      schema: z.array(z.object({
        name: z.string(),
        level: z.number(),
        description: z.string(),
      })),
      description: 'spells appropriate for the character\'s class and level',
    },
    skills: {
      schema: z.array(z.object({
        name: z.string(),
        proficiency: z.boolean(),
        modifier: z.number(),
      })),
      description: 'skills with correct proficiency flags and modifiers based on class, background, and race',
    },
    traits: {
      schema: z.array(z.string()),
      description: 'personality traits and quirks',
    },
    racialTraits: {
      schema: z.array(z.string()),
      description: 'racial traits for the character\'s race (standard D&D 5e racial features)',
    },
    classFeatures: {
      schema: z.array(z.object({
        name: z.string(),
        description: z.string(),
        level: z.number(),
      })),
      description: 'class features for the character\'s class and level (ALL mandatory features)',
    },
    background: {
      schema: z.string(),
      description: 'character background',
    },
    personality: {
      schema: z.string(),
      description: 'personality description',
    },
  }

  const environmentSections: Record<string, { schema: z.ZodType<any>, description: string }> = {
    npcs: {
      schema: z.array(z.string()),
      description: 'NPCs present in the environment',
    },
    features: {
      schema: z.array(z.string()),
      description: 'notable features and interactive elements',
    },
    adventureHooks: {
      schema: z.array(z.string()),
      description: 'adventure hooks that can involve players',
    },
    currentConflict: {
      schema: z.string(),
      description: 'current conflict or instability in the location',
    },
  }

  const missionSections: Record<string, { schema: z.ZodType<any>, description: string }> = {
    objectives: {
      schema: z.array(z.object({
        description: z.string(),
        primary: z.boolean(),
        isAlternative: z.boolean().optional(),
        pathType: z.enum(['combat', 'social', 'stealth', 'mixed']).optional(),
      })),
      description: 'mission objectives',
    },
    rewards: {
      schema: z.object({
        xp: z.number().int().min(0).optional(),
        gold: z.number().int().min(0).optional(),
        items: z.array(z.string()),
      }),
      description: 'mission rewards',
    },
    relatedNPCs: {
      schema: z.array(z.string()),
      description: 'NPCs related to the mission',
    },
    relatedLocations: {
      schema: z.array(z.string()),
      description: 'locations related to the mission',
    },
    powerfulItems: {
      schema: z.array(z.object({
        name: z.string(),
        status: z.string(),
      })),
      description: 'powerful items or artifacts in the mission',
    },
    possibleOutcomes: {
      schema: z.array(z.string()),
      description: 'possible outcomes based on player choices',
    },
    context: {
      schema: z.string(),
      description: 'background context and setup',
    },
  }

  let sectionConfig: { schema: z.ZodType<any>, description: string } | undefined

  if (contentType === 'character') {
    sectionConfig = characterSections[section]
  } else if (contentType === 'environment') {
    sectionConfig = environmentSections[section]
  } else if (contentType === 'mission') {
    sectionConfig = missionSections[section]
  }

  if (!sectionConfig) {
    throw new Error(`Unknown section: ${contentType}:${section}`)
  }

  systemPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario is written in ${finalLanguage}. You MUST generate ALL content in ${finalLanguage}. This includes ALL text, descriptions, names, and every single word of output.

You are an expert D&D 5e game master. Regenerate ONLY the specified section of content, maintaining consistency with the rest of the content provided.

FINAL REMINDER: All output MUST be in ${finalLanguage}.`

  // Single NPC at index: schema is string; prompt asks for one slot only
  if (contentType === 'environment' && section === 'npcs' && typeof sectionIndex === 'number') {
    const npcs = (currentContent?.npcs as string[] | undefined) || []
    schema = z.object({ value: z.string() })
    userPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario below is written in ${finalLanguage}. You MUST respond entirely in ${finalLanguage}.

Original Scenario: "${scenario}"

Current Content (for reference): ${JSON.stringify(currentContent, null, 2)}

Regenerate ONLY the NPC at index ${sectionIndex} (0-based) in the npcs list. Current npcs: ${JSON.stringify(npcs)}. Return a single string: the new NPC description for that slot. Match the tone and style of the others. Do NOT return an array or object, only one string.`
  } else {
    // generateObject requires root type: "object"; wrap array/string schemas in { value: T }
    schema = z.object({ value: sectionConfig.schema })
    userPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario below is written in ${finalLanguage}. You MUST respond entirely in ${finalLanguage}. Every word, name, description, and text must be in ${finalLanguage}.

Original Scenario: "${scenario}"

Current Content (for reference only - do NOT regenerate these):
${JSON.stringify(currentContent, null, 2)}

Generate NEW ${sectionConfig.description} (ALL in ${finalLanguage}).

Return ONLY the ${section} data in the required format. Do not include any other fields or explanations.`
  }

  // Require OpenAI API key and validate format
  const rawKeySection = process.env.OPENAI_API_KEY?.trim()
  if (!rawKeySection || rawKeySection.length === 0) {
    throw new Error('OPENAI_API_KEY is required but not configured. Add it to .env.local or Vercel env.')
  }
  if (!rawKeySection.startsWith('sk-') && !rawKeySection.startsWith('sk-proj-')) {
    throw new Error(
      'OPENAI_API_KEY must start with sk- or sk-proj-. Fix the value in .env.local. Get a key from https://platform.openai.com/api-keys'
    )
  }
  const openaiSection = createOpenAI({ apiKey: rawKeySection })

  try {
    const result = await (generateObject as any)({
      model: openaiSection('gpt-4o-mini'),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    })

    return result.object.value
  } catch (error) {
    console.error('Section regeneration error:', error)
    // Re-throw error - no fallback to mock
    throw error
  }
}