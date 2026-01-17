/**
 * API Route for AI Content Generation
 * 
 * Uses Vercel AI SDK with OpenAI GPT-4o-mini for real-time streaming
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail } from '@/lib/supabase-server'
import { generateRPGContent } from '@/lib/ai'
import type { ContentType, AdvancedInput, AdvancedGenerationParams } from '@/types/rpg'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    // Parse request body
    const body = await request.json()
    const { scenario, contentType, advancedInput, generationParams } = body as {
      scenario: string
      contentType: ContentType
      advancedInput?: AdvancedInput
      generationParams?: AdvancedGenerationParams
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/generate/route.ts:18',message:'Request body received',data:{scenario:scenario?.substring(0,100),contentType,advancedInput,generationParams},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!scenario || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing scenario or contentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid contentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/generate/route.ts:41',message:'Calling generateRPGContent',data:{scenarioLength:scenario.length,contentType,hasAdvancedInput:!!advancedInput,advancedInputKeys:advancedInput?Object.keys(advancedInput):[],generationParams},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Generate content using OpenAI (or fallback to mock if no API key)
    const content = await generateRPGContent(scenario, contentType, advancedInput, generationParams)

    // #region agent log
    const contentForLog = content as any
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/generate/route.ts:44',message:'Content generated',data:{contentType,generatedLevel:contentForLog?.level,generatedClass:contentForLog?.class,generatedRace:contentForLog?.race,hasSpells:!!contentForLog?.spells?.length,spellCount:contentForLog?.spells?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const responseData = {
          type: contentType,
          content,
          scenario,
        }
        
        const contentStr = JSON.stringify(responseData)
        
        // Send in chunks for streaming effect
        const chunkSize = 100
        for (let i = 0; i < contentStr.length; i += chunkSize) {
          const chunk = contentStr.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(chunk))
          // Small delay for streaming effect
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
        
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    
    // Handle authentication and verification errors
    if (error.status === 401 || error.status === 403) {
      return new Response(
        JSON.stringify({
          error: error.message || 'Unauthorized',
        }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

