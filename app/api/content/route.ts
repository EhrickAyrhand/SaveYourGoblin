/**
 * API Route for Saving and Fetching Generated Content
 * 
 * POST: Saves generated content to Supabase with validation
 * GET: Fetches user's saved content with filtering, search, and pagination
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'
import type { ContentType, GeneratedContent } from '@/types/rpg'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

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

    // Get additional filters
    const favorite = searchParams.get('favorite')
    
    // Try to select with new columns first, fallback to basic columns if migration hasn't run
    let query = supabase
      .from('generated_content')
      .select('id, type, scenario_input, content_data, created_at, is_favorite, tags, notes', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply favorite filter (only works after migration)
    if (favorite === 'true') {
      query = query.eq('is_favorite', true)
    }

    // Apply type filter
    if (type && ['character', 'environment', 'mission'].includes(type)) {
      query = query.eq('type', type)
    }

    // Apply search filter (search in scenario_input and notes only)
    // Note: content_data is JSONB and tags is TEXT[] - can't use ::text cast in PostgREST OR queries
    // content_data and tags will be searched client-side after fetching
    if (search.trim()) {
      const searchPattern = `%${search}%`
      // Only search in text columns (scenario_input and notes)
      // JSONB (content_data) and TEXT[] (tags) will be filtered client-side
      const orQueryString = `scenario_input.ilike.${searchPattern},notes.ilike.${searchPattern}`
      query = query.or(orQueryString)
    }

    let { data, error, count } = await query
    
    // If error is due to missing columns (migration not run), retry with basic columns only
    if (error && error.code === '42703') {
      
      // Retry with only basic columns (migration not run yet)
      let fallbackQuery = supabase
        .from('generated_content')
        .select('id, type, scenario_input, content_data, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply type filter
      if (type && ['character', 'environment', 'mission'].includes(type)) {
        fallbackQuery = fallbackQuery.eq('type', type)
      }

      // Apply search filter (basic search - only scenario_input since content_data is JSONB)
      if (search.trim()) {
        const searchPattern = `%${search}%`
        fallbackQuery = fallbackQuery.ilike('scenario_input', searchPattern)
      }

      // Note: favorite filter is skipped if columns don't exist
      
      const fallbackResult = await fallbackQuery
      // Map fallback data to include default values for missing columns
      data = fallbackResult.data?.map((item: any) => ({
        ...item,
        is_favorite: false,
        tags: [],
        notes: '',
      })) || null
      error = fallbackResult.error
      count = fallbackResult.count
    }

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

    // Data is already filtered by SQL query (including tags/notes if columns exist)
    const finalData = data || []

    return new Response(
      JSON.stringify({
        data: finalData,
        total: count || 0,
        limit,
        offset,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch content error:', error)
    
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
        error: 'Failed to fetch content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

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
        JSON.stringify({ 
          error: 'Missing required fields: type, scenario, or contentData',
          message: 'Please ensure all required fields are provided before saving.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(type)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid content type',
          message: 'Content type must be character, environment, or mission.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate content structure based on type
    if (type === 'character' && !('name' in contentData && 'race' in contentData && 'class' in contentData)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid character data structure',
          message: 'Character data must include name, race, and class.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'environment' && !('name' in contentData && 'description' in contentData)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid environment data structure',
          message: 'Environment data must include name and description.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'mission' && !('title' in contentData && 'description' in contentData)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid mission data structure',
          message: 'Mission data must include title and description.'
        }),
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

    // Get optional fields
    const { tags, notes, is_favorite } = body as {
      tags?: string[]
      notes?: string
      is_favorite?: boolean
    }
    
    // Build insert object - include new fields (will work after migration is run)
    const insertData: {
      user_id: string
      type: ContentType
      scenario_input: string
      content_data: GeneratedContent
      tags?: string[]
      notes?: string
      is_favorite?: boolean
    } = {
      user_id: user.id,
      type,
      scenario_input: scenario,
      content_data: contentData,
    }
    
    // Add optional fields (will work after migration)
    if (tags) insertData.tags = tags
    if (notes !== undefined) insertData.notes = notes
    if (is_favorite !== undefined) insertData.is_favorite = is_favorite
    
    const { data, error } = await supabase
      .from('generated_content')
      .insert(insertData)
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
  } catch (error: any) {
    console.error('Save content error:', error)
    
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
        error: 'Failed to save content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

