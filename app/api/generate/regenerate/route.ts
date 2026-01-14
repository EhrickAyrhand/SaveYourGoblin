/**
 * API Route for Regenerating Specific Sections of Generated Content
 * 
 * POST: Regenerates a specific section while keeping the rest of the content intact
 */

import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { generateRPGContentSection } from '@/lib/ai'
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
    const { 
      scenario, 
      contentType, 
      section, 
      currentContent 
    } = body as {
      scenario: string
      contentType: ContentType
      section: string
      currentContent: any
    }

    if (!scenario || !contentType || !section || !currentContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: scenario, contentType, section, or currentContent' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid contentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate the specific section
    const regeneratedSection = await generateRPGContentSection(
      scenario,
      contentType,
      section,
      currentContent
    )

    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          const chunk = encoder.encode(
            JSON.stringify({
              section,
              data: regeneratedSection,
            }) + '\n'
          )
          controller.enqueue(chunk)
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Regenerate section error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to regenerate section',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
