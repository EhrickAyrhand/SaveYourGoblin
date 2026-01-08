/**
 * API Route for AI Content Generation
 * 
 * Uses Vercel AI SDK with OpenAI GPT-4o-mini for real-time streaming
 */

import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { generateRPGContent } from '@/lib/ai'
import type { ContentType } from '@/types/rpg'

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

    // Generate content using OpenAI (or fallback to mock if no API key)
    const content = await generateRPGContent(scenario, contentType)
    
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

