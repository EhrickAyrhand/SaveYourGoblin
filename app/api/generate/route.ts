/**
 * API Route for AI Content Generation
 * 
 * Phase 1: Mock streaming with simulated delays
 * Phase 2: Replace with real streamText() from Vercel AI SDK
 */

import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { generateRPGContent } from '@/lib/ai'
import type { ContentType, GeneratedContent } from '@/types/rpg'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getServerUser(request)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { scenario, contentType } = body as {
      scenario: string
      contentType: ContentType
    }

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

    // Phase 1: Mock streaming implementation
    // Create a readable stream that simulates streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        // Generate content (this will be replaced with real AI in Phase 2)
        const content = await generateRPGContent(scenario, contentType)
        
        // Simulate streaming by sending chunks
        const contentStr = JSON.stringify({
          type: contentType,
          content,
          scenario,
        })
        
        // Split content into chunks for realistic streaming effect
        const chunkSize = 50
        for (let i = 0; i < contentStr.length; i += chunkSize) {
          const chunk = contentStr.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(chunk))
          // Small delay to simulate network streaming
          await new Promise((resolve) => setTimeout(resolve, 50))
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

    // Phase 2: Real OpenAI streaming (commented for future implementation)
    /*
    import { openai } from '@ai-sdk/openai'
    import { streamText } from 'ai'
    import { StreamingTextResponse } from 'ai'

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      prompt: `Generate a D&D 5e ${contentType} based on this scenario: ${scenario}`,
    })

    return new StreamingTextResponse(result.toDataStreamResponse())
    */
  } catch (error) {
    console.error('Generation error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

