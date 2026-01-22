/**
 * API Route for Content Version Detail
 *
 * GET: Fetch a specific version for a content item
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const user = await requireVerifiedEmail(request)
    const { id, versionId } = await params

    if (!id || !versionId) {
      return new Response(
        JSON.stringify({ error: 'Missing content ID or version ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createAuthenticatedClient(request)

    const { data, error } = await supabase
      .from('content_versions')
      .select('id, content_id, version_number, content_data, change_summary, changed_by, created_at')
      .eq('id', versionId)
      .eq('content_id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Version not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase version fetch error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch version',
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
    console.error('Fetch version error:', error)

    if (error.status === 401 || error.status === 403) {
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch version',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
