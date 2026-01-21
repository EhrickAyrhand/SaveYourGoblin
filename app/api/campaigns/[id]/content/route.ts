/**
 * API Route for Campaign Content Management
 *
 * POST: Adds content to a campaign
 * PATCH: Updates content order/notes
 * DELETE: Removes content from a campaign
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id: campaignId } = await params

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { contentId, sequence, notes } = body as {
      contentId?: string
      sequence?: number
      notes?: string
    }

    if (!contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: contentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (notes !== undefined && typeof notes !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid notes format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (sequence !== undefined) {
      if (!Number.isInteger(sequence) || sequence < 0) {
        return new Response(
          JSON.stringify({ error: 'Sequence must be a non-negative integer' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
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

    const campaignCheck = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignCheck.error || !campaignCheck.data) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const contentCheck = await supabase
      .from('generated_content')
      .select('id')
      .eq('id', contentId)
      .eq('user_id', user.id)
      .single()

    if (contentCheck.error || !contentCheck.data) {
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let finalSequence = sequence ?? 0
    if (sequence === undefined) {
      const sequenceResult = await supabase
        .from('campaign_content')
        .select('sequence')
        .eq('campaign_id', campaignId)
        .order('sequence', { ascending: false })
        .limit(1)

      if (sequenceResult.error) {
        console.error('Supabase query error:', sequenceResult.error)
        return new Response(
          JSON.stringify({
            error: 'Failed to determine campaign order',
            message: sequenceResult.error.message,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const lastSequence = sequenceResult.data?.[0]?.sequence
      finalSequence = typeof lastSequence === 'number' ? lastSequence + 1 : 0
    }

    const { data, error } = await supabase
      .from('campaign_content')
      .insert({
        campaign_id: campaignId,
        content_id: contentId,
        sequence: finalSequence,
        notes: typeof notes === 'string' ? notes : '',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Content already added to campaign' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to add content to campaign',
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
    console.error('Add campaign content error:', error)

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
        error: 'Failed to add content to campaign',
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
    await requireVerifiedEmail(request)
    const { id: campaignId } = await params

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { contentId, sequence, notes } = body as {
      contentId?: string
      sequence?: number
      notes?: string
    }

    if (!contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: contentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const updates: {
      sequence?: number
      notes?: string
    } = {}

    if (sequence !== undefined) {
      if (!Number.isInteger(sequence) || sequence < 0) {
        return new Response(
          JSON.stringify({ error: 'Sequence must be a non-negative integer' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.sequence = sequence
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid notes format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updates.notes = notes
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
      .from('campaign_content')
      .update(updates)
      .eq('campaign_id', campaignId)
      .eq('content_id', contentId)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Campaign content not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to update campaign content',
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
    console.error('Update campaign content error:', error)

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
        error: 'Failed to update campaign content',
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
    await requireVerifiedEmail(request)
    const { id: campaignId } = await params

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { contentId } = body as { contentId?: string }

    if (!contentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: contentId' }),
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
      .from('campaign_content')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('content_id', contentId)
      .select('campaign_id, content_id')
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Campaign content not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase delete error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to remove content from campaign',
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
    console.error('Remove campaign content error:', error)

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
        error: 'Failed to remove content from campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
