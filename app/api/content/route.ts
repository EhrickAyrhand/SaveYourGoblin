/**
 * API Route for Saving and Fetching Generated Content
 * 
 * POST: Saves generated content to Supabase with validation
 * GET: Fetches user's saved content with filtering, search, and pagination
 */

import { NextRequest } from 'next/server'
import { getServerUser, createServerClient } from '@/lib/supabase-server'
import type { ContentType, GeneratedContent } from '@/types/rpg'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getServerUser(request)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ContentType | null
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Build query
    let query = supabase
      .from('generated_content')
      .select('id, type, scenario_input, content_data, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply type filter
    if (type && ['character', 'environment', 'mission'].includes(type)) {
      query = query.eq('type', type)
    }

    // Apply search filter (search in scenario_input and content_data)
    if (search.trim()) {
      query = query.or(`scenario_input.ilike.%${search}%,content_data::text.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch content',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data: data || [],
        total: count || 0,
        limit,
        offset,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fetch content error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

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

