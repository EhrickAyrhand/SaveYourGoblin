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
  level: z.number().int().min(1).max(20).describe('The level at which this feature is obtained (1-20)'),
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
  classFeatures: z.array(classFeatureSchema).optional().describe('Array of ALL mandatory class features for this class and level. MUST include every class feature the character has access to at their level. Examples: Barbarian (Level 3) should include Rage, Unarmored Defense, Reckless Attack, Danger Sense, Primal Path feature. Rogue (Level 3) should include Sneak Attack, Thieves\' Cant, Cunning Action, Expertise, Roguish Archetype feature. Every class has mandatory features that must be included, even non-spellcasting classes.'),
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
  items: z.array(z.string()).describe('List of item rewards'),
})

const powerfulItemSchema = z.object({
  name: z.string().describe('The name of the powerful item or artifact'),
  status: z.string().describe('Clarification of the item\'s status/control (e.g., "Dormant Artifact (awakens later)", "DM-controlled Artifact (unstable)", "Narrative Artifact (limited mechanical use)", "Legendary Item (standard rules apply)")'),
})

const choiceBasedRewardSchema = z.object({
  condition: z.string().describe('The condition or path that triggers these rewards (e.g., "If negotiated", "If combat", "If artifact kept")'),
  rewards: rewardSchema.describe('Rewards for this specific condition/path'),
})

const missionSchema = z.object({
  title: z.string().describe('The mission/quest title'),
  description: z.string().describe('A detailed description of the mission'),
  context: z.string().describe('The background context and setup for this mission'),
  objectives: z.array(objectiveSchema).describe('List of mission objectives (primary and optional). Mark objectives as alternative paths (isAlternative: true) when they represent mutually exclusive approaches (e.g., negotiate vs. combat).'),
  rewards: rewardSchema.describe('Rewards for completing the mission'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).describe('Mission difficulty level'),
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
  contentType: ContentType,
  advancedInput?: AdvancedInput,
  generationParams?: AdvancedGenerationParams
): Promise<GeneratedContent> {
  // Check if OpenAI API key is configured
  const hasApiKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:354',message:'Checking OpenAI API key',data:{hasApiKey,apiKeyLength:process.env.OPENAI_API_KEY?.length||0,apiKeyPrefix:process.env.OPENAI_API_KEY?.substring(0,7)||'missing',willUseMock:!hasApiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
  // #endregion
  
  if (!hasApiKey) {
    // Fallback to mock if no API key (for local development)
    console.warn('OPENAI_API_KEY not found or empty, using mock data')
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:358',message:'Using mock data (API key missing)',data:{scenario:scenario.substring(0,100),contentType,hasAdvancedInput:!!advancedInput},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
    // #endregion
    return generateMockContent(scenario, contentType, advancedInput)
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:360',message:'generateRPGContent entry',data:{scenarioLength:scenario.length,contentType,hasAdvancedInput:!!advancedInput,advancedInput:advancedInput,generationParams},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:363',message:'Language detected',data:{detectedLanguage,scenarioPreview:scenario.substring(0,100),textForDetectionPreview:textForDetection.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:379',message:'Building advanced constraints',data:{contentType,hasInput:!!input,input:input,normalizedClass:contentType==='character'?normalizeClassName((input as any)?.class):undefined,normalizedBackground:contentType==='character'?normalizeBackgroundName((input as any)?.background):undefined,constraints,constraintsCount:constraints.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
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
- A compelling backstory that connects to the scenario${complexityInstruction.includes('extensive') ? '. This backstory MUST be detailed, extensive, and rich with sensory descriptions, deeper motivations, and elaborate world-building elements. Write at least 3-5 paragraphs of backstory that fully explores the character\'s past, relationships, motivations, and how they came to be who they are today.' : complexityInstruction.includes('detailed') ? '. This backstory MUST be detailed and rich with descriptions. Write at least 2-3 paragraphs exploring the character\'s past, motivations, and connections.' : ' (written entirely in ' + detectedLanguage + ')'}${toneInstruction.includes('serious') ? ' Maintain a serious, dramatic tone. Focus on realism, consequences, and meaningful experiences that shaped the character.' : ''} (ALL text in ${detectedLanguage})
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:571',message:'Before AI generation',data:{contentType,detectedLanguage,hasAdvancedConstraints:advancedConstraints.length>0,advancedConstraintsPreview:advancedConstraints.substring(0,200),userPromptPreview:userPrompt.substring(0,300),systemPromptPreview:systemPrompt.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    // #region agent log
    const finalTemperature = Math.max(0.1, Math.min(1.5, temperature))
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:665',message:'Calling generateObject with params',data:{contentType,detectedLanguage,temperature:finalTemperature,generationParams,userPromptLength:userPrompt.length,systemPromptLength:systemPrompt.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    const result = await (generateObject as any)({
      model: openai('gpt-4o-mini'),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: finalTemperature, // Clamp between 0.1 and 1.5
    })
    
    let object = result.object

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:679',message:'AI generation result received',data:{contentType,generatedLevel:object?.level,generatedClass:object?.class,generatedRace:object?.race,generatedBackground:object?.background,hasSpells:!!object?.spells?.length,spellNames:object?.spells?.map((s:any)=>s.name)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    // Validate and correct skill modifiers for characters
    if (contentType === 'character' && 'skills' in object && 'level' in object && 'attributes' in object) {
      object = validateCharacterSkills(object as Character)
    }

    return object as GeneratedContent
  } catch (error) {
    // #region agent log
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/ai.ts:690',message:'OpenAI generation error caught',data:{contentType,errorMessage,errorStack,hasAdvancedInput:!!advancedInput,generationParams,willFallbackToMock:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion

    console.error('OpenAI generation error:', error)
    // Fallback to mock on error
    console.warn('Falling back to mock data due to error')
    return generateMockContent(scenario, contentType, advancedInput)
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
 * Returns only the regenerated section data, not the full content
 */
export async function generateRPGContentSection(
  scenario: string,
  contentType: ContentType,
  section: string,
  currentContent: any
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
      description: 'backstory and background',
    },
    personality: {
      schema: z.string(),
      description: 'personality description',
    },
  }

  const environmentSections: Record<string, { schema: z.ZodType<any>, description: string }> = {
    npcs: {
      schema: z.array(z.string()),
      description: 'NPCs present, each with name and short role description',
    },
    features: {
      schema: z.array(z.string()),
      description: 'notable features, objects, or architectural elements',
    },
    adventureHooks: {
      schema: z.array(z.string()),
      description: '2-3 concrete adventure hooks that can immediately involve the players',
    },
    currentConflict: {
      schema: z.string(),
      description: 'what is currently wrong or unstable in this location',
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
      description: 'mission objectives (primary and optional)',
    },
    rewards: {
      schema: z.object({
        xp: z.number().int().min(0).optional(),
        gold: z.number().int().min(0).optional(),
        items: z.array(z.string()),
      }),
      description: 'rewards for completing the mission',
    },
    relatedNPCs: {
      schema: z.array(z.string()),
      description: 'NPCs involved in or related to this mission',
    },
    relatedLocations: {
      schema: z.array(z.string()),
      description: 'locations relevant to this mission',
    },
    powerfulItems: {
      schema: z.array(z.object({
        name: z.string(),
        status: z.string(),
      })).optional(),
      description: 'powerful items or artifacts in the mission',
    },
    possibleOutcomes: {
      schema: z.array(z.string()).optional(),
      description: '3-4 possible outcomes based on player choices',
    },
  }

  // Get section config
  let sectionConfig: { schema: z.ZodType<any>, description: string } | null = null
  switch (contentType) {
    case 'character':
      sectionConfig = characterSections[section]
      break
    case 'environment':
      sectionConfig = environmentSections[section]
      break
    case 'mission':
      sectionConfig = missionSections[section]
      break
  }

  if (!sectionConfig) {
    throw new Error(`Invalid section "${section}" for content type "${contentType}"`)
  }

  schema = sectionConfig.schema

  // Build prompts based on content type and section
  systemPrompt = `CRITICAL LANGUAGE REQUIREMENT: The user's scenario is written in ${finalLanguage}. You MUST generate ALL content in ${finalLanguage}.

You are regenerating only the "${section}" section of a ${contentType}. The rest of the content already exists and should not be changed. Generate ONLY the requested section data, maintaining consistency with the existing content.

FINAL REMINDER: All output MUST be in ${finalLanguage}.`

  // Create context about existing content
  const contextSummary = contentType === 'character'
    ? `Character: ${currentContent.name}, ${currentContent.race} ${currentContent.class} (Level ${currentContent.level})`
    : contentType === 'environment'
    ? `Environment: ${currentContent.name}`
    : `Mission: ${currentContent.title}`

  userPrompt = `CRITICAL LANGUAGE REQUIREMENT: Respond entirely in ${finalLanguage}.

Regenerate the "${section}" section for this ${contentType}:

Context: ${contextSummary}
Original Scenario: "${scenario}"

Current Content (for reference only - do NOT regenerate these):
${JSON.stringify(currentContent, null, 2)}

Generate NEW ${sectionConfig.description} (ALL in ${finalLanguage}).

Return ONLY the ${section} data in the required format. Do not include any other fields or explanations.`

  // Check if OpenAI API key is available
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.warn('OpenAI API key not found, using mock data for section regeneration')
    // Return mock section data
    return generateMockSection(contentType, section, currentContent)
  }

  try {
    const result = await (generateObject as any)({
      model: openai('gpt-4o-mini'),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    })

    return result.object
  } catch (error) {
    console.error('Section regeneration error:', error)
    // Fallback to mock
    return generateMockSection(contentType, section, currentContent)
  }
}

function generateMockSection(contentType: ContentType, section: string, currentContent: any): any {
  // Return mock section data based on section type
  switch (`${contentType}:${section}`) {
    case 'character:spells':
      return []
    case 'character:skills':
      return []
    case 'character:traits':
      return ['Mock trait 1', 'Mock trait 2']
    case 'character:racialTraits':
      return ['Mock racial trait']
    case 'character:classFeatures':
      return []
    case 'character:background':
      return 'Mock background'
    case 'character:personality':
      return 'Mock personality'
    case 'environment:npcs':
      return ['Mock NPC']
    case 'environment:features':
      return ['Mock feature']
    case 'environment:adventureHooks':
      return ['Mock hook']
    case 'environment:currentConflict':
      return 'Mock conflict'
    case 'mission:objectives':
      return []
    case 'mission:rewards':
      return { items: [] }
    case 'mission:relatedNPCs':
      return []
    case 'mission:relatedLocations':
      return []
    case 'mission:powerfulItems':
      return []
    case 'mission:possibleOutcomes':
      return []
    default:
      throw new Error(`Unknown section: ${contentType}:${section}`)
  }
}

// Fallback mock functions (kept for development/testing)
function generateMockContent(scenario: string, contentType: ContentType, advancedInput?: AdvancedInput): GeneratedContent {
  switch (contentType) {
    case 'character':
      return generateMockCharacter(scenario, advancedInput as AdvancedCharacterInput | undefined)
    case 'environment':
      return generateMockEnvironment(scenario, advancedInput as AdvancedEnvironmentInput | undefined)
    case 'mission':
      return generateMockMission(scenario, advancedInput as AdvancedMissionInput | undefined)
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

// Helper functions to normalize names for mock (same as in main function)
function normalizeClassNameForMock(className?: string): string {
  if (!className) return ''
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
  return classMap[className.trim().toLowerCase()] || className.trim()
}

function normalizeBackgroundNameForMock(background?: string): string {
  if (!background) return ''
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
  return backgroundMap[background.trim().toLowerCase()] || background.trim()
}

function generateMockCharacter(scenario: string, advancedInput?: AdvancedCharacterInput): Character {
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Elf']
  const classes = ['Bard', 'Wizard', 'Fighter', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Sorcerer']
  const backgrounds = ['Entertainer', 'Sage', 'Noble', 'Criminal', 'Acolyte', 'Folk Hero', 'Hermit', 'Soldier']
  const voiceDescriptions = ['Hoarse voice', 'Sweet voice', 'Angry voice', 'Deep voice', 'Melodic voice', 'Raspy voice', 'Gentle voice', 'Commanding voice', 'Whispery voice', 'Boisterous voice']
  
  // Use advanced input values if provided, otherwise use random
  const race = advancedInput?.race || races[Math.floor(Math.random() * races.length)]
  const charClassRaw = advancedInput?.class || classes[Math.floor(Math.random() * classes.length)]
  const charClass = normalizeClassNameForMock(charClassRaw)
  const backgroundRaw = advancedInput?.background || backgrounds[Math.floor(Math.random() * backgrounds.length)]
  const background = normalizeBackgroundNameForMock(backgroundRaw)
  const level = advancedInput?.level || Math.floor(Math.random() * 10) + 1

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

  // Get class features based on class and level
  const getClassFeatures = (className: string, charLevel: number): Array<{name: string, description: string, level: number}> => {
    const classLower = className.toLowerCase()
    const features: Array<{name: string, description: string, level: number}> = []

    if (classLower.includes('barbarian')) {
      features.push({ name: 'Rage', description: 'In battle, you can enter a berserker rage, gaining advantage on Strength checks and saving throws, bonus damage, and resistance to bludgeoning, piercing, and slashing damage.', level: 1 })
      features.push({ name: 'Unarmored Defense', description: 'While not wearing armor, your AC equals 10 + Dexterity modifier + Constitution modifier.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Reckless Attack', description: 'When you make your first attack on your turn, you can decide to attack recklessly, giving you advantage on melee weapon attack rolls but attacks against you have advantage until your next turn.', level: 2 })
        features.push({ name: 'Danger Sense', description: 'You gain advantage on Dexterity saving throws against effects you can see.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Primal Path', description: 'You choose a path that shapes the nature of your rage.', level: 3 })
      }
    } else if (classLower.includes('rogue')) {
      features.push({ name: 'Sneak Attack', description: 'Once per turn, you can deal extra damage to one creature you hit with an attack if you have advantage on the attack roll.', level: 1 })
      features.push({ name: 'Thieves\' Cant', description: 'You learn the secret language of thieves, allowing you to hide messages in seemingly normal conversation.', level: 1 })
      features.push({ name: 'Expertise', description: 'Your proficiency bonus is doubled for two skills of your choice.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Cunning Action', description: 'Your quick thinking and agility allow you to take a bonus action on each of your turns to Dash, Disengage, or Hide.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Roguish Archetype', description: 'You choose an archetype that reflects the nature of your training.', level: 3 })
      }
    } else if (classLower.includes('fighter')) {
      features.push({ name: 'Fighting Style', description: 'You adopt a particular style of fighting as your specialty.', level: 1 })
      features.push({ name: 'Second Wind', description: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Action Surge', description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Martial Archetype', description: 'You choose an archetype that embodies the martial traditions you follow.', level: 3 })
      }
    } else if (classLower.includes('monk')) {
      features.push({ name: 'Unarmored Defense', description: 'While you are not wearing any armor, your AC equals 10 + Dexterity modifier + Wisdom modifier.', level: 1 })
      features.push({ name: 'Martial Arts', description: 'Your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Ki', description: 'Your training allows you to harness the mystic energy of ki. You have a number of ki points equal to your monk level.', level: 2 })
        features.push({ name: 'Unarmored Movement', description: 'Your speed increases by 10 feet while you are not wearing armor or wielding a shield.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Monastic Tradition', description: 'You commit yourself to a monastic tradition that shapes your technique and philosophy.', level: 3 })
      }
    } else if (classLower.includes('bard')) {
      features.push({ name: 'Bardic Inspiration', description: 'You can inspire others through stirring words or music. A creature that has a Bardic Inspiration die can add it to one ability check, attack roll, or saving throw.', level: 1 })
      features.push({ name: 'Spellcasting', description: 'You have learned to cast spells through your study of magic and music.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Jack of All Trades', description: 'You can add half your proficiency bonus, rounded down, to any ability check you make that doesn\'t already include your proficiency bonus.', level: 2 })
        features.push({ name: 'Song of Rest', description: 'You can use soothing music or oration to help revitalize your wounded allies during a short rest.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Bard College', description: 'You delve into the advanced techniques of a bard college of your choice.', level: 3 })
        features.push({ name: 'Expertise', description: 'Your proficiency bonus is doubled for two skills of your choice.', level: 3 })
      }
    } else if (classLower.includes('wizard')) {
      features.push({ name: 'Spellcasting', description: 'As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power.', level: 1 })
      features.push({ name: 'Arcane Recovery', description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can recover expended spell slots.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Arcane Tradition', description: 'You choose an arcane tradition, shaping your practice of magic through one of eight schools.', level: 2 })
      }
    } else if (classLower.includes('cleric')) {
      features.push({ name: 'Spellcasting', description: 'As a conduit for divine power, you can cast cleric spells.', level: 1 })
      features.push({ name: 'Divine Domain', description: 'You choose a domain related to your deity, granting you domain spells and other features.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Channel Divinity', description: 'You gain the ability to channel divine energy directly from your deity, using that energy to fuel magical effects.', level: 2 })
      }
    } else if (classLower.includes('paladin')) {
      features.push({ name: 'Divine Sense', description: 'The presence of strong evil registers on your senses like a noxious odor, and powerful good rings like heavenly music in your ears.', level: 1 })
      features.push({ name: 'Lay on Hands', description: 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Fighting Style', description: 'You adopt a particular style of fighting as your specialty.', level: 2 })
        features.push({ name: 'Spellcasting', description: 'By 2nd level, you have learned to draw on divine magic through meditation and prayer to cast spells as a cleric does.', level: 2 })
        features.push({ name: 'Divine Smite', description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Sacred Oath', description: 'When you reach 3rd level, you swear the oath that binds you as a paladin forever.', level: 3 })
      }
    } else if (classLower.includes('ranger')) {
      features.push({ name: 'Favored Enemy', description: 'You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy.', level: 1 })
      features.push({ name: 'Natural Explorer', description: 'You are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Fighting Style', description: 'You adopt a particular style of fighting as your specialty.', level: 2 })
        features.push({ name: 'Spellcasting', description: 'By the time you reach 2nd level, you have learned to use the magical essence of nature to cast spells.', level: 2 })
      }
      if (charLevel >= 3) {
        features.push({ name: 'Ranger Archetype', description: 'You choose an archetype that you strive to emulate in your combat styles and techniques.', level: 3 })
      }
    } else if (classLower.includes('sorcerer')) {
      features.push({ name: 'Spellcasting', description: 'An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic.', level: 1 })
      features.push({ name: 'Sorcerous Origin', description: 'Your innate magic comes from a magical bloodline, a connection to a powerful magical source, or exposure to raw magic.', level: 1 })
      if (charLevel >= 2) {
        features.push({ name: 'Font of Magic', description: 'You tap into a deep wellspring of magic within yourself. This wellspring is represented by sorcery points.', level: 2 })
      }
    }

    return features
  }

  const classFeatures = getClassFeatures(charClass, level)

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
    // Only include spells for spellcasting classes
    spells: (charClass === 'Wizard' || charClass === 'Sorcerer' || charClass === 'Bard' || charClass === 'Cleric' || charClass === 'Paladin' || charClass === 'Ranger' || charClass === 'Warlock' || charClass === 'Druid')
      ? [
          { name: 'Magic Missile', level: 1, description: 'A dart of force strikes the target' },
          { name: 'Charm Person', level: 1, description: 'Attempt to charm a humanoid' },
          { name: 'Detect Magic', level: 1, description: 'Sense the presence of magic' },
        ].slice(0, Math.min(3, level))
      : [], // Non-spellcasting classes (Fighter, Barbarian, Rogue, Monk) get no spells
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
    classFeatures: classFeatures.length > 0 ? classFeatures : undefined,
    voiceDescription: voiceDescriptions[Math.floor(Math.random() * voiceDescriptions.length)],
    associatedMission: scenario.toLowerCase().includes('flute') ? 'The Lost Melody' : undefined,
  }
}

function generateMockEnvironment(scenario: string, advancedInput?: AdvancedEnvironmentInput): Environment {
  const isDark = scenario.toLowerCase().includes('dark') || scenario.toLowerCase().includes('abandoned')
  const isTavern = scenario.toLowerCase().includes('tavern')
  const isTower = scenario.toLowerCase().includes('tower')

  let name = 'Mysterious Location'
  if (isTavern) name = 'The Rusty Tankard'
  if (isTower) name = 'The Abandoned Tower'
  if (scenario.toLowerCase().includes('wizard')) name = "Wizard's Sanctum"

  const currentConflict = isTavern
    ? 'A heated argument between two merchants is escalating, and the tavern keeper is trying to calm them down before it turns violent.'
    : isTower
    ? 'Magical wards are failing, causing unpredictable magical effects throughout the tower.'
    : 'Strange occurrences have been reported, and the locals are growing increasingly fearful.'

  const adventureHooks = isTavern
    ? [
        'The merchants offer gold to anyone who can help resolve their dispute',
        'A mysterious figure in the corner watches the party with keen interest',
        'The tavern keeper mentions a missing shipment that needs investigating',
      ]
    : isTower
    ? [
        'A magical artifact at the top of the tower is causing the instability',
        'Ancient guardians have awakened and are hostile to all intruders',
        'A previous explorer left behind valuable notes about the tower\'s secrets',
      ]
    : [
        'Locals are offering a reward for anyone who can solve the mystery',
        'A witness claims to have seen something important but is too scared to talk',
        'The strange occurrences follow a pattern that suggests a hidden cause',
      ]

  return {
    name,
    description: scenario || `A ${isDark ? 'dark and foreboding' : 'welcoming'} place that holds many secrets.`,
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
      ? ['The Mysterious Bard - Performs nightly and knows many local secrets', 'Tavern Keeper - Owner who keeps a watchful eye on patrons', 'Local Patrons - Regulars who gossip about town happenings']
      : ['Guardian Spirit - Protects the location from intruders', 'Ancient Wizard - Former owner who left behind magical research', 'Curious Apprentice - Seeks knowledge about the location\'s history'],
    currentConflict,
    adventureHooks,
  }
}

function generateMockMission(scenario: string, advancedInput?: AdvancedMissionInput): Mission {
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

  // Map difficulty to recommended level
  const recommendedLevel = 
    difficulty === 'easy' ? 'Level 1-3'
    : difficulty === 'medium' ? 'Level 4-6'
    : difficulty === 'hard' ? 'Level 7-10'
    : 'Level 11+'

  // Generate objectives with path types and alternatives
  const objectives = hasArtifact
    ? [
        { description: 'Retrieve the stolen artifact', primary: true, pathType: 'mixed' as const },
        { description: 'Negotiate with the sorceress for the artifact', primary: false, isAlternative: true, pathType: 'social' as const },
        { description: 'Defeat the sorceress in combat', primary: false, isAlternative: true, pathType: 'combat' as const },
        { description: 'Rescue any hostages', primary: false },
      ]
    : hasThieves
    ? [
        { description: 'Infiltrate the thieves\' guild hideout', primary: true, pathType: 'stealth' as const },
        { description: 'Negotiate with the guild leader', primary: false, isAlternative: true, pathType: 'social' as const },
        { description: 'Assault the hideout directly', primary: false, isAlternative: true, pathType: 'combat' as const },
        { description: 'Rescue any hostages', primary: false },
      ]
    : [
        { description: 'Complete the primary objective', primary: true, pathType: 'mixed' as const },
        { description: 'Avoid detection', primary: false, pathType: 'stealth' as const },
        { description: 'Rescue any hostages', primary: false },
      ]

  // Generate powerful items if artifact is mentioned
  const powerfulItems = hasArtifact
    ? [{ name: 'The Heart of Balance', status: 'Dormant Artifact (awakens later, DM-controlled)' }]
    : undefined

  // Generate possible outcomes
  const possibleOutcomes = hasArtifact
    ? [
        'If artifact is retrieved and sealed → Balance is maintained, but factions seek it later',
        'If artifact is destroyed → Imbalance spreads, magical instability increases',
        'If artifact is kept by party → Future consequences arise, attracts powerful enemies',
        'If negotiation succeeds → Alliance formed, but artifact remains a threat',
      ]
    : hasThieves
    ? [
        'If guild is infiltrated successfully → Information gained, but guild becomes hostile',
        'If negotiation succeeds → Temporary alliance, but guild demands favors',
        'If combat is chosen → Guild is weakened, but other criminal groups take notice',
        'If hostages are rescued → Reputation gained, but guild seeks revenge',
      ]
    : [
        'If primary objective succeeds → Quest giver becomes ally',
        'If stealth approach is used → Information gained without confrontation',
        'If hostages are rescued → Additional rewards and reputation',
      ]

  // Generate choice-based rewards
  const choiceBasedRewards = hasArtifact
    ? [
        {
          condition: 'If negotiated with sorceress',
          rewards: {
            xp: 300,
            gold: 150,
            items: ['Alliance Favor', 'Ancient Knowledge Scroll'],
          },
        },
        {
          condition: 'If combat is chosen',
          rewards: {
            xp: 500,
            gold: 250,
            items: ['Sorceress\'s Staff', 'Combat Loot'],
          },
        },
      ]
    : hasThieves
    ? [
        {
          condition: 'If negotiation succeeds',
          rewards: {
            xp: 400,
            gold: 200,
            items: ['Guild Favor', 'Information Package'],
          },
        },
        {
          condition: 'If combat is chosen',
          rewards: {
            xp: 600,
            gold: 300,
            items: ['Guild Leader\'s Dagger', 'Stolen Goods'],
          },
        },
      ]
    : undefined

  return {
    title,
    description: scenario || 'A quest that will test the heroes\' resolve and skills.',
    context: hasArtifact
      ? 'An ancient artifact of great power has been stolen, and the heroes must retrieve it before it falls into the wrong hands.'
      : hasThieves
      ? 'The local thieves\' guild has been causing trouble, and someone needs to put a stop to their activities.'
      : 'A mysterious figure has approached the heroes with an offer they cannot refuse.',
    objectives,
    rewards: {
      xp: difficulty === 'easy' ? 200 : difficulty === 'medium' ? 500 : difficulty === 'hard' ? 1000 : 2000,
      gold: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 250 : difficulty === 'hard' ? 500 : 1000,
      items: hasArtifact
        ? ['Magical Scroll', 'Potion of Healing']
        : ['Thieves\' Tools', 'Lockpicks', 'Smoke Bomb'],
    },
    difficulty,
    recommendedLevel,
    powerfulItems,
    possibleOutcomes,
    choiceBasedRewards,
    relatedNPCs: hasGuild
      ? ['Guild Master', 'Thief Leader', 'Innocent Bystander']
      : ['Quest Giver', 'Ancient Guardian', 'Mysterious Benefactor'],
    relatedLocations: hasGuild
      ? ['Thieves\' Guild Hideout', 'City Streets', 'Underground Tunnels']
      : ['Ancient Ruins', 'Mysterious Tower', 'Hidden Temple'],
  }
}
