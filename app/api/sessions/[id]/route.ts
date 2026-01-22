/**
 * API Route for Individual Session Note Operations
 *
 * GET: Fetches a session note
 * PATCH: Updates a session note
 * DELETE: Deletes a session note
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

const normalizeSessionDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString().split('T')[0]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing session note ID' }),
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
      .from('session_notes')
      .select(
        'id, campaign_id, title, content, session_date, linked_content_ids, created_at, updated_at'
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Session note not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch session note',
          message: error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch session note error:', error)

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
        error: 'Failed to fetch session note',
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
        JSON.stringify({ error: 'Missing session note ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const {
      title,
      content,
      sessionDate,
      session_date,
      campaignId,
      campaign_id,
      linkedContentIds,
      linked_content_ids,
    } = body as {
      title?: string
      content?: string
      sessionDate?: string
      session_date?: string
      campaignId?: string | null
      campaign_id?: string | null
      linkedContentIds?: string[] | null
      linked_content_ids?: string[] | null
    }

    const updates: {
      title?: string
      content?: string
      session_date?: string
      campaign_id?: string | null
      linked_content_ids?: string[]
    } = {}

    if (title !== undefined) {
      if (typeof title !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid title format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        return new Response(
          JSON.stringify({ error: 'Title cannot be empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.title = trimmedTitle
    }

    if (content !== undefined) {
      if (typeof content !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid content format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.content = content
    }

    const resolvedSessionDate = sessionDate ?? session_date
    if (resolvedSessionDate !== undefined) {
      if (typeof resolvedSessionDate !== 'string' || !resolvedSessionDate.trim()) {
        return new Response(
          JSON.stringify({ error: 'Invalid session_date format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const normalizedSessionDate = normalizeSessionDate(resolvedSessionDate.trim())
      if (!normalizedSessionDate) {
        return new Response(
          JSON.stringify({ error: 'Invalid session_date value' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.session_date = normalizedSessionDate
    }

    const hasCampaignId =
      Object.prototype.hasOwnProperty.call(body, 'campaignId') ||
      Object.prototype.hasOwnProperty.call(body, 'campaign_id')
    const resolvedCampaignId = campaignId ?? campaign_id

    if (hasCampaignId) {
      if (resolvedCampaignId === null) {
        updates.campaign_id = null
      } else if (typeof resolvedCampaignId !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid campaign_id format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        const trimmedCampaignId = resolvedCampaignId.trim()
        updates.campaign_id = trimmedCampaignId ? trimmedCampaignId : null
      }
    }

    const hasLinkedContentIds =
      Object.prototype.hasOwnProperty.call(body, 'linkedContentIds') ||
      Object.prototype.hasOwnProperty.call(body, 'linked_content_ids')
    const resolvedLinkedContentIds = linkedContentIds ?? linked_content_ids

    if (hasLinkedContentIds) {
      if (resolvedLinkedContentIds === null) {
        updates.linked_content_ids = []
      } else if (!Array.isArray(resolvedLinkedContentIds)) {
        return new Response(
          JSON.stringify({ error: 'Invalid linked_content_ids format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        const invalidItem = resolvedLinkedContentIds.find(
          (item) => typeof item !== 'string' || !item.trim()
        )
        if (invalidItem) {
          return new Response(
            JSON.stringify({
              error: 'linked_content_ids must be an array of non-empty strings',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        updates.linked_content_ids = resolvedLinkedContentIds.map((id) => id.trim())
      }
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
      .from('session_notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(
        'id, campaign_id, title, content, session_date, linked_content_ids, created_at, updated_at'
      )
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Session note not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to update session note',
          message: error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Update session note error:', error)

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
        error: 'Failed to update session note',
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
        JSON.stringify({ error: 'Missing session note ID' }),
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
      .from('session_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Session note not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase delete error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to delete session note',
          message: error?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Delete session note error:', error)

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
        error: 'Failed to delete session note',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
