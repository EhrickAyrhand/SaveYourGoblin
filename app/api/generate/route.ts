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
  let advancedInput: AdvancedInput | undefined
  let generationParams: AdvancedGenerationParams | undefined
  let contentType: ContentType | undefined
  let scenario: string | undefined
  let campaignContext: string | undefined

  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    // Parse request body
    const body = await request.json()
    const parsed = body as {
      scenario: string
      contentType: ContentType
      advancedInput?: AdvancedInput
      generationParams?: AdvancedGenerationParams
      campaignContext?: string
    }
    scenario = parsed.scenario
    contentType = parsed.contentType
    advancedInput = parsed.advancedInput
    generationParams = parsed.generationParams
    campaignContext = typeof parsed.campaignContext === 'string' ? parsed.campaignContext : undefined

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

    // Generate content using OpenAI (requires OPENAI_API_KEY to be configured)
    const content = await generateRPGContent(scenario, contentType, advancedInput, generationParams, campaignContext)
    
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

