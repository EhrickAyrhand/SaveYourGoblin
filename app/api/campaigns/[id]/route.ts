/**
 * API Route for Individual Campaign Operations
 *
 * GET: Fetches campaign details with content
 * PATCH: Updates a campaign
 * DELETE: Deletes a campaign
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
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

    const campaignResult = await supabase
      .from('campaigns')
      .select('id, name, description, settings, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (campaignResult.error || !campaignResult.data) {
      if (campaignResult.error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Campaign not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase query error:', campaignResult.error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch campaign',
          message: campaignResult.error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const contentResult = await supabase
      .from('campaign_content')
      .select(
        'content_id, sequence, notes, generated_content (id, type, scenario_input, content_data, created_at)'
      )
      .eq('campaign_id', id)
      .order('sequence', { ascending: true })

    if (contentResult.error) {
      console.error('Supabase query error:', contentResult.error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch campaign content',
          message: contentResult.error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const content = (contentResult.data || []).map(item => ({
      contentId: item.content_id,
      sequence: item.sequence,
      notes: item.notes,
      content: item.generated_content ?? null,
    }))

    return new Response(
      JSON.stringify({
        data: {
          ...campaignResult.data,
          content,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch campaign error:', error)

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
        error: 'Failed to fetch campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { name, description, settings } = body as {
      name?: string
      description?: string
      settings?: Record<string, unknown>
    }

    const updates: {
      name?: string
      description?: string
      settings?: Record<string, unknown>
    } = {}

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : ''
      if (!trimmedName) {
        return new Response(
          JSON.stringify({ error: 'Campaign name cannot be empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.name = trimmedName
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid description format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.description = description
    }

    if (settings !== undefined) {
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        return new Response(
          JSON.stringify({ error: 'Invalid settings format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.settings = settings
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
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
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Campaign not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to update campaign',
          message: error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Update campaign error:', error)

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
        error: 'Failed to update campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
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
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Campaign not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase delete error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to delete campaign',
          message: error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Delete campaign error:', error)

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
        error: 'Failed to delete campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
