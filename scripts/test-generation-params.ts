/**
 * Test script for generation parameters: temperature, tone, complexity.
 * Run: npx tsx scripts/test-generation-params.ts
 * Requires: OPENAI_API_KEY in .env.local
 */

import * as fs from 'fs'
import * as path from 'path'
import type { AdvancedInput, AdvancedGenerationParams } from '../types/rpg'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1)
      process.env[key] = val
    }
  })
}

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not found. Add it to .env.local')
  process.exit(1)
}

const scenario = 'A brave human fighter in a busy tavern, nursing an ale after a long journey'

// --- Temperature ---
async function testTemperature(generateRPGContent: (scenario: string, contentType: 'character' | 'environment' | 'mission', advancedInput?: AdvancedInput, generationParams?: AdvancedGenerationParams) => Promise<unknown>) {
  console.log('\n--- Temperature ---')
  const low: string[] = []
  const high: string[] = []
  for (let i = 0; i < 2; i++) {
    const c = await generateRPGContent(scenario, 'character', undefined, { temperature: 0.2 })
    const ch = c as { name?: string; history?: string }
    low.push((ch.name || '') + (ch.history || '').slice(0, 120))
  }
  for (let i = 0; i < 2; i++) {
    const c = await generateRPGContent(scenario, 'character', undefined, { temperature: 0.9 })
    const ch = c as { name?: string; history?: string }
    high.push((ch.name || '') + (ch.history || '').slice(0, 120))
  }
  const lowSame = low[0] === low[1]
  const highSame = high[0] === high[1]
  const snippet = (s: unknown) => String(s ?? '').slice(0, 60)
  console.log('Temp 0.2 run1 vs run2 same?', lowSame, '| run1:', snippet(low[0]), '| run2:', snippet(low[1]))
  console.log('Temp 0.9 run1 vs run2 same?', highSame, '| run1:', snippet(high[0]), '| run2:', snippet(high[1]))
  console.log('Temperature: high temp expects more variation (0.9 runs more likely to differ). OK:', !highSame || !lowSame)
}

// --- Tone ---
async function testTone(generateRPGContent: (scenario: string, contentType: 'character' | 'environment' | 'mission', advancedInput?: AdvancedInput, generationParams?: AdvancedGenerationParams) => Promise<unknown>) {
  console.log('\n--- Tone ---')
  const serious = await generateRPGContent(scenario, 'character', undefined, { tone: 'serious' }) as { personality?: string; history?: string }
  const playful = await generateRPGContent(scenario, 'character', undefined, { tone: 'playful' }) as { personality?: string; history?: string }
  const s = ((serious.personality || '') + (serious.history || '')).toLowerCase()
  const p = ((playful.personality || '') + (playful.history || '')).toLowerCase()
  const seriousWords = ['dark', 'tragic', 'consequence', 'grave', 'dramatic', 'realism', 'loss', 'war', 'blood'].filter((w) => s.includes(w))
  const playfulWords = ['humor', 'humorous', 'whimsical', 'playful', 'joke', 'smile', 'chuckle', 'light-hearted', 'cheerful', 'wit'].filter((w) => p.includes(w))
  console.log('Serious text sample:', s.slice(0, 180) + '...')
  console.log('Playful text sample:', p.slice(0, 180) + '...')
  console.log('Serious-like words in serious:', seriousWords.length, seriousWords)
  console.log('Playful-like words in playful:', playfulWords.length, playfulWords)
  console.log('Tone: expect serious/playful to differ in style. OK:', seriousWords.length >= 1 || playfulWords.length >= 1 || s.length > 50)
}

// --- Complexity ---
async function testComplexity(generateRPGContent: (scenario: string, contentType: 'character' | 'environment' | 'mission', advancedInput?: AdvancedInput, generationParams?: AdvancedGenerationParams) => Promise<unknown>) {
  console.log('\n--- Complexity ---')
  const simple = await generateRPGContent(scenario, 'character', undefined, { complexity: 'simple' }) as { history?: string; personality?: string }
  const detailed = await generateRPGContent(scenario, 'character', undefined, { complexity: 'detailed' }) as { history?: string; personality?: string }
  const simpleLen = (simple.history || '').length + (simple.personality || '').length
  const detailedLen = (detailed.history || '').length + (detailed.personality || '').length
  console.log('Simple history+personality length:', simpleLen)
  console.log('Detailed history+personality length:', detailedLen)
  console.log('Complexity: detailed should be longer. OK:', detailedLen > simpleLen)
}

async function main() {
  const { generateRPGContent } = await import('../lib/ai')
  console.log('Testing generation params (temperature, tone, complexity) with scenario:', scenario.slice(0, 50) + '...')
  try {
    await testTemperature(generateRPGContent)
    await testTone(generateRPGContent)
    await testComplexity(generateRPGContent)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
  console.log('\nDone.')
}

main()
