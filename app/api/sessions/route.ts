/**
 * API Route for Session Notes
 *
 * GET: Fetches user's session notes
 * POST: Creates a new session note
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireVerifiedEmail(request)
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId') || searchParams.get('campaign_id')

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

    let query = supabase
      .from('session_notes')
      .select(
        'id, campaign_id, title, content, session_date, linked_content_ids, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .order('updated_at', { ascending: false })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch session notes',
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
    console.error('Fetch session notes error:', error)

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
        error: 'Failed to fetch session notes',
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
      linkedContentIds?: string[]
      linked_content_ids?: string[]
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : ''
    if (!trimmedTitle) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: title',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (content !== undefined && typeof content !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Invalid content format',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const resolvedSessionDate = sessionDate ?? session_date
    let normalizedSessionDate: string | null = null

    if (resolvedSessionDate !== undefined) {
      if (typeof resolvedSessionDate !== 'string' || !resolvedSessionDate.trim()) {
        return new Response(
          JSON.stringify({
            error: 'Invalid session_date format',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      normalizedSessionDate = normalizeSessionDate(resolvedSessionDate.trim())
      if (!normalizedSessionDate) {
        return new Response(
          JSON.stringify({
            error: 'Invalid session_date value',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const resolvedCampaignId = campaignId ?? campaign_id
    let normalizedCampaignId: string | null | undefined

    if (resolvedCampaignId !== undefined) {
      if (resolvedCampaignId === null) {
        normalizedCampaignId = null
      } else if (typeof resolvedCampaignId !== 'string') {
        return new Response(
          JSON.stringify({
            error: 'Invalid campaign_id format',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        const trimmedCampaignId = resolvedCampaignId.trim()
        normalizedCampaignId = trimmedCampaignId ? trimmedCampaignId : null
      }
    }

    const resolvedLinkedContentIds = linkedContentIds ?? linked_content_ids
    let normalizedLinkedContentIds: string[] | undefined

    if (resolvedLinkedContentIds !== undefined) {
      if (!Array.isArray(resolvedLinkedContentIds)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid linked_content_ids format',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

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

      normalizedLinkedContentIds = resolvedLinkedContentIds.map((id) => id.trim())
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

    const insertData: {
      user_id: string
      title: string
      content: string
      session_date?: string
      campaign_id?: string | null
      linked_content_ids?: string[]
    } = {
      user_id: user.id,
      title: trimmedTitle,
      content: typeof content === 'string' ? content : '',
    }

    if (normalizedSessionDate) {
      insertData.session_date = normalizedSessionDate
    }

    if (normalizedCampaignId !== undefined) {
      insertData.campaign_id = normalizedCampaignId
    }

    if (normalizedLinkedContentIds) {
      insertData.linked_content_ids = normalizedLinkedContentIds
    }

    const { data, error } = await supabase
      .from('session_notes')
      .insert(insertData)
      .select(
        'id, campaign_id, title, content, session_date, linked_content_ids, created_at, updated_at'
      )
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to create session note',
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
    console.error('Create session note error:', error)

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
        error: 'Failed to create session note',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
