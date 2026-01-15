/**
 * API Route for Content Templates
 * 
 * GET: Fetches user's templates with optional filtering
 * POST: Creates a new template
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'
import type { ContentType } from '@/types/rpg'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ContentType | null

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
      .from('content_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Apply type filter
    if (type && ['character', 'environment', 'mission'].includes(type)) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch templates',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data: data || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch templates error:', error)
    
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
        error: 'Failed to fetch templates',
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
    const { name, description, type, scenario } = body as {
      name: string
      description?: string
      type: ContentType
      scenario: string
    }

    // Validation
    if (!name || !type || !scenario) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: name, type, or scenario',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['character', 'environment', 'mission'].includes(type)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid content type',
        }),
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

    // Insert template
    const { data, error } = await supabase
      .from('content_templates')
      .insert({
        user_id: user.id,
        name,
        description: description || '',
        type,
        scenario,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to create template',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Create template error:', error)
    
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
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
