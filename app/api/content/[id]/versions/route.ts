/**
 * API Route for Content Versions
 *
 * GET: Lists versions for a content item
 * POST: Restores content to a version (creates a new version entry)
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

async function createAuthenticatedClient(request: NextRequest) {
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

  return supabase
}

async function getNextVersionNumber(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  contentId: string
) {
  const { data, error } = await supabase
    .from('content_versions')
    .select('version_number')
    .eq('content_id', contentId)
    .order('version_number', { ascending: false })
    .limit(1)

  if (error) {
    return { error }
  }

  const lastVersion = data?.[0]?.version_number
  const nextVersion = typeof lastVersion === 'number' ? lastVersion + 1 : 1
  return { nextVersion }
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
        JSON.stringify({ error: 'Missing content ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createAuthenticatedClient(request)

    const { data, error } = await supabase
      .from('content_versions')
      .select('id, version_number, change_summary, changed_by, created_at')
      .eq('content_id', id)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Supabase versions query error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch content versions',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data: data ?? [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fetch content versions error:', error)

    if (error.status === 401 || error.status === 403) {
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch content versions',
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
    const user = await requireVerifiedEmail(request)
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing content ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { versionId, change_summary } = body as {
      versionId?: string
      change_summary?: string
    }

    if (!versionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: versionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createAuthenticatedClient(request)

    const { data: versionData, error: versionError } = await supabase
      .from('content_versions')
      .select('id, version_number, content_data')
      .eq('id', versionId)
      .eq('content_id', id)
      .eq('user_id', user.id)
      .single()

    if (versionError || !versionData) {
      if (versionError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Version not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase version lookup error:', versionError)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch version',
          message: versionError?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: updatedContent, error: updateError } = await supabase
      .from('generated_content')
      .update({ content_data: versionData.content_data })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !updatedContent) {
      if (updateError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase restore error:', updateError)
      return new Response(
        JSON.stringify({
          error: 'Failed to restore content',
          message: updateError?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { nextVersion, error: nextVersionError } = await getNextVersionNumber(supabase, id)
    if (nextVersionError || typeof nextVersion !== 'number') {
      console.error('Supabase version query error:', nextVersionError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create version after restore',
          message: nextVersionError?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const resolvedSummary =
      typeof change_summary === 'string' && change_summary.trim().length > 0
        ? change_summary.trim()
        : `Restored to version ${versionData.version_number}`

    const { data: newVersion, error: versionInsertError } = await supabase
      .from('content_versions')
      .insert({
        content_id: id,
        user_id: user.id,
        version_number: nextVersion,
        content_data: updatedContent.content_data,
        change_summary: resolvedSummary,
        changed_by: user.id,
      })
      .select('id, version_number, change_summary, changed_by, created_at')
      .single()

    if (versionInsertError) {
      console.error('Supabase version insert error:', versionInsertError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create version after restore',
          message: versionInsertError.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        data: {
          content: updatedContent,
          restoredFrom: {
            id: versionData.id,
            version_number: versionData.version_number,
          },
          newVersion,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Restore content error:', error)

    if (error.status === 401 || error.status === 403) {
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to restore content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
