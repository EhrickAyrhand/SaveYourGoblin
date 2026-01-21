/**
 * API Route for Campaigns
 *
 * GET: Fetches user's campaigns
 * POST: Creates a new campaign
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireVerifiedEmail(request)

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

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, settings, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch campaigns',
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
    console.error('Fetch campaigns error:', error)

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
        error: 'Failed to fetch campaigns',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireVerifiedEmail(request)

    const body = await request.json()
    const { name, description, settings } = body as {
      name?: string
      description?: string
      settings?: Record<string, unknown>
    }

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: name',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (
      settings !== undefined &&
      (typeof settings !== 'object' || settings === null || Array.isArray(settings))
    ) {
      return new Response(
        JSON.stringify({
          error: 'Invalid settings format',
          message: 'Settings must be a JSON object.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

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

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: trimmedName,
        description: typeof description === 'string' ? description : '',
        settings: settings ?? {},
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to create campaign',
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
    console.error('Create campaign error:', error)

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
        error: 'Failed to create campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
