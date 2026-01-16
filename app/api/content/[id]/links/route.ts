/**
 * API Route for Content Links
 * 
 * GET: Fetches all links for a content item (both incoming and outgoing)
 * POST: Creates a new link between two content items
 * DELETE: Removes a link (via query parameter)
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing content ID' }),
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

    // Fetch both outgoing links (where this content is the source) and incoming links (where this content is the target)
    const [outgoingLinksResult, incomingLinksResult] = await Promise.all([
      // Outgoing links: this content links to others
      supabase
        .from('content_links')
        .select('id, target_content_id, link_type, created_at')
        .eq('source_content_id', id)
        .eq('user_id', user.id),
      
      // Incoming links: other content links to this
      supabase
        .from('content_links')
        .select('id, source_content_id, link_type, created_at')
        .eq('target_content_id', id)
        .eq('user_id', user.id)
    ])

    const outgoingLinks = outgoingLinksResult
    const incomingLinks = incomingLinksResult

    // Fetch the actual content for outgoing links
    const outgoingContentIds = (outgoingLinks.data || []).map(link => link.target_content_id)
    const outgoingContent = outgoingContentIds.length > 0
      ? await supabase
          .from('generated_content')
          .select('id, type, scenario_input, content_data, created_at, is_favorite, tags, notes')
          .in('id', outgoingContentIds)
          .eq('user_id', user.id)
      : { data: [], error: null }

    // Fetch the actual content for incoming links
    const incomingContentIds = (incomingLinks.data || []).map(link => link.source_content_id)
    const incomingContent = incomingContentIds.length > 0
      ? await supabase
          .from('generated_content')
          .select('id, type, scenario_input, content_data, created_at, is_favorite, tags, notes')
          .in('id', incomingContentIds)
          .eq('user_id', user.id)
      : { data: [], error: null }

    if (outgoingLinks.error || incomingLinks.error || outgoingContent.error || incomingContent.error) {
      console.error('Supabase query error:', outgoingLinks.error || incomingLinks.error || outgoingContent.error || incomingContent.error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch content links',
          message: (outgoingLinks.error || incomingLinks.error || outgoingContent.error || incomingContent.error)?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a map of content by ID for quick lookup
    const outgoingContentMap = new Map((outgoingContent.data || []).map(item => [item.id, item]))
    const incomingContentMap = new Map((incomingContent.data || []).map(item => [item.id, item]))

    // Format the response
    const outgoing = (outgoingLinks.data || []).map(link => ({
      id: link.id,
      contentId: link.target_content_id,
      linkType: link.link_type,
      createdAt: link.created_at,
      content: outgoingContentMap.get(link.target_content_id) || null,
    }))

    const incoming = (incomingLinks.data || []).map(link => ({
      id: link.id,
      contentId: link.source_content_id,
      linkType: link.link_type,
      createdAt: link.created_at,
      content: incomingContentMap.get(link.source_content_id) || null,
    }))

    return new Response(
      JSON.stringify({
        data: {
          outgoing, // Links from this content to others
          incoming, // Links from others to this content
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch links error:', error)
    
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
        error: 'Failed to fetch content links',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    const { id: sourceContentId } = await params

    // Parse request body
    const body = await request.json()
    const { targetContentId, linkType } = body as {
      targetContentId: string
      linkType: 'related' | 'part_of' | 'uses' | 'located_in' | 'involves'
    }

    if (!targetContentId || !linkType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetContentId or linkType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (sourceContentId === targetContentId) {
      return new Response(
        JSON.stringify({ error: 'Cannot link content to itself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['related', 'part_of', 'uses', 'located_in', 'involves'].includes(linkType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid link type' }),
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

    // Verify both content items belong to the user
    const [sourceCheck, targetCheck] = await Promise.all([
      supabase
        .from('generated_content')
        .select('id')
        .eq('id', sourceContentId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('generated_content')
        .select('id')
        .eq('id', targetContentId)
        .eq('user_id', user.id)
        .single()
    ])

    if (sourceCheck.error || !sourceCheck.data || targetCheck.error || !targetCheck.data) {
      return new Response(
        JSON.stringify({ error: 'One or both content items not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Insert the link
    const { data, error } = await supabase
      .from('content_links')
      .insert({
        user_id: user.id,
        source_content_id: sourceContentId,
        target_content_id: targetContentId,
        link_type: linkType,
      })
      .select()
      .single()

    if (error) {
      // Check if it's a unique constraint violation (link already exists)
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Link already exists' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to create link',
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
    console.error('Create link error:', error)
    
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
        error: 'Failed to create link',
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
    // Authenticate user and require email verification
    const user = await requireVerifiedEmail(request)

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return new Response(
        JSON.stringify({ error: 'Missing linkId query parameter' }),
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

    // Delete the link
    const { error } = await supabase
      .from('content_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Supabase delete error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to delete link',
          message: error.message,
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
    console.error('Delete link error:', error)
    
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
        error: 'Failed to delete link',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
