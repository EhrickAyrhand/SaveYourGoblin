/**
 * API Route for Comparing Content Versions
 *
 * GET: Compare two versions for a content item
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

const MAX_DIFF_ENTRIES = 200

type DiffEntry = {
  path: string
  before: unknown
  after: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a == null || b == null) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) => deepEqual(a[key], b[key]))
  }

  return false
}

function collectDiffs(
  before: unknown,
  after: unknown,
  path: string,
  diffs: DiffEntry[]
): boolean {
  if (diffs.length >= MAX_DIFF_ENTRIES) return true
  if (deepEqual(before, after)) return false

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLength = Math.max(before.length, after.length)
    for (let index = 0; index < maxLength; index += 1) {
      if (collectDiffs(before[index], after[index], `${path}[${index}]`, diffs)) {
        return true
      }
    }
    return diffs.length >= MAX_DIFF_ENTRIES
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of keys) {
      if (collectDiffs(before[key], after[key], path ? `${path}.${key}` : key, diffs)) {
        return true
      }
    }
    return diffs.length >= MAX_DIFF_ENTRIES
  }

  diffs.push({
    path: path || '$',
    before,
    after,
  })
  return diffs.length >= MAX_DIFF_ENTRIES
}

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

    const { searchParams } = new URL(request.url)
    const baseVersionId = searchParams.get('baseVersionId') || ''
    const compareVersionId = searchParams.get('compareVersionId') || ''

    if (!baseVersionId || !compareVersionId) {
      return new Response(
        JSON.stringify({ error: 'Missing baseVersionId or compareVersionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (baseVersionId === compareVersionId) {
      return new Response(
        JSON.stringify({ error: 'Version IDs must be different' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createAuthenticatedClient(request)

    const { data: versions, error } = await supabase
      .from('content_versions')
      .select('id, version_number, content_data')
      .eq('content_id', id)
      .eq('user_id', user.id)
      .in('id', [baseVersionId, compareVersionId])

    if (error) {
      console.error('Supabase version compare error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch versions',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!versions || versions.length < 2) {
      return new Response(
        JSON.stringify({ error: 'One or both versions not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const baseVersion = versions.find((version) => version.id === baseVersionId)
    const compareVersion = versions.find((version) => version.id === compareVersionId)

    if (!baseVersion || !compareVersion) {
      return new Response(
        JSON.stringify({ error: 'One or both versions not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const diffs: DiffEntry[] = []
    const truncated = collectDiffs(baseVersion.content_data, compareVersion.content_data, '', diffs)

    return new Response(
      JSON.stringify({
        data: {
          baseVersionId,
          compareVersionId,
          baseVersionNumber: baseVersion.version_number,
          compareVersionNumber: compareVersion.version_number,
          differences: diffs,
          truncated,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Compare versions error:', error)

    if (error.status === 401 || error.status === 403) {
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to compare versions',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
