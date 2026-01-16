/**
 * API Route for Generating Content Variations
 * 
 * POST: Generates a variation of an existing content item
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'
import { generateContentVariation } from '@/lib/ai'
import type { ContentType } from '@/types/rpg'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    // Parse request body
    const body = await request.json()
    const { originalContentId, contentType, variationPrompt } = body as {
      originalContentId: string
      contentType: ContentType
      variationPrompt?: string
    }

    if (!originalContentId || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: originalContentId or contentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid contentType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create authenticated Supabase client
    const authHeader = request.headers.get('authorization')
    let supabase = await createServerClient()
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
    }

    // Fetch the original content
    const { data: originalContent, error: fetchError } = await supabase
      .from('generated_content')
      .select('content_data, scenario_input')
      .eq('id', originalContentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalContent) {
      return new Response(
        JSON.stringify({ error: 'Original content not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate the variation
    const variationContent = await generateContentVariation(
      originalContent.content_data,
      contentType,
      originalContent.scenario_input,
      variationPrompt
    )

    // Save the variation to database
    const { data: savedContent, error: saveError } = await supabase
      .from('generated_content')
      .insert({
        user_id: user.id,
        type: contentType,
        scenario_input: `${originalContent.scenario_input} (Variation)`,
        content_data: variationContent,
      })
      .select()
      .single()

    if (saveError || !savedContent) {
      console.error('Save variation error:', saveError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save variation',
          message: saveError?.message || 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        data: {
          id: savedContent.id,
          type: savedContent.type,
          scenario_input: savedContent.scenario_input,
          content_data: savedContent.content_data,
          created_at: savedContent.created_at,
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Variation generation error:', error)
    
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
        error: 'Failed to generate variation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
