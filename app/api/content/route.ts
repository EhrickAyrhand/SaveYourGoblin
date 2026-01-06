/**
 * API Route for Saving Generated Content
 * 
 * Saves generated content to Supabase with validation
 */

import { NextRequest } from 'next/server'
import { getServerUser, createServerClient } from '@/lib/supabase-server'
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
    const { type, scenario, contentData } = body as {
      type: ContentType
      scenario: string
      contentData: GeneratedContent
    }

    // Validation
    if (!type || !scenario || !contentData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, scenario, or contentData' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate content structure based on type
    if (type === 'character' && !('name' in contentData && 'race' in contentData && 'class' in contentData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid character data structure' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'environment' && !('name' in contentData && 'description' in contentData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid environment data structure' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'mission' && !('title' in contentData && 'description' in contentData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mission data structure' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Save to Supabase
    // Create a client with the user's access token for proper RLS
    const authHeader = request.headers.get('authorization')
    let supabase = await createServerClient()
    
    // If we have an access token, use it to create an authenticated client
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

    const { data, error } = await supabase
      .from('generated_content')
      .insert({
        user_id: user.id,
        type,
        scenario_input: scenario,
        content_data: contentData,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to save content',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: data.id,
        message: 'Content saved successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Save content error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to save content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

