/**
 * API Route for Updating and Deleting Generated Content
 * 
 * PATCH: Updates content fields (favorite, tags, notes)
 * DELETE: Removes content by ID with authentication
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

const MAX_CONTENT_KEY_CHANGES = 6

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

function normalizeTags(tags: string[]): string[] {
  return [...tags]
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .sort()
}

function areStringArraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  const normalizedA = normalizeTags(a)
  const normalizedB = normalizeTags(b)
  if (normalizedA.length !== normalizedB.length) return false
  return normalizedA.every((tag, index) => tag === normalizedB[index])
}

function getTopLevelChanges(
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
  const changes: string[] = []
  keys.forEach((key) => {
    if (!deepEqual(previous[key], next[key])) {
      changes.push(key)
    }
  })
  return changes.sort()
}

export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { is_favorite, tags, notes, content_data, change_summary } = body as {
      is_favorite?: boolean
      tags?: string[]
      notes?: string
      content_data?: Record<string, unknown>
      change_summary?: string
    }

    // Build update object (only include provided fields)
    const updates: {
      is_favorite?: boolean
      tags?: string[]
      notes?: string
      content_data?: Record<string, unknown>
    } = {}

    if (typeof is_favorite === 'boolean') {
      updates.is_favorite = is_favorite
    }
    if (Array.isArray(tags)) {
      updates.tags = tags
    }
    if (typeof notes === 'string') {
      updates.notes = notes
    }
    if (content_data != null && typeof content_data === 'object' && !Array.isArray(content_data)) {
      updates.content_data = content_data
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
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

    const { data: existingContent, error: existingError } = await supabase
      .from('generated_content')
      .select('id, content_data, is_favorite, tags, notes')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existingContent) {
      if (existingError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('Supabase fetch error:', existingError)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch content',
          message: existingError?.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const hasFavoriteUpdate = Object.prototype.hasOwnProperty.call(updates, 'is_favorite')
    const hasTagsUpdate = Object.prototype.hasOwnProperty.call(updates, 'tags')
    const hasNotesUpdate = Object.prototype.hasOwnProperty.call(updates, 'notes')
    const hasContentDataUpdate = Object.prototype.hasOwnProperty.call(updates, 'content_data')

    const favoriteChanged = hasFavoriteUpdate && existingContent.is_favorite !== updates.is_favorite
    const existingTags = Array.isArray(existingContent.tags) ? existingContent.tags : []
    const tagsChanged = hasTagsUpdate && !areStringArraysEqual(existingTags, updates.tags ?? [])
    const notesChanged = hasNotesUpdate && existingContent.notes !== updates.notes
    const contentDataChanged =
      hasContentDataUpdate &&
      !deepEqual(existingContent.content_data, updates.content_data)

    const contentKeyChanges =
      contentDataChanged && isPlainObject(existingContent.content_data) && isPlainObject(updates.content_data)
        ? getTopLevelChanges(existingContent.content_data, updates.content_data)
        : []

    const summaryParts: string[] = []
    if (contentDataChanged) {
      if (contentKeyChanges.length > 0) {
        const previewKeys = contentKeyChanges.slice(0, MAX_CONTENT_KEY_CHANGES).join(', ')
        const suffix = contentKeyChanges.length > MAX_CONTENT_KEY_CHANGES ? ', ...' : ''
        summaryParts.push(`content (${previewKeys}${suffix})`)
      } else {
        summaryParts.push('content')
      }
    }
    if (notesChanged) summaryParts.push('notes')
    if (tagsChanged) summaryParts.push('tags')
    if (favoriteChanged) summaryParts.push('favorite')

    const requestedSummary = typeof change_summary === 'string' ? change_summary.trim() : ''
    const autoSummary = summaryParts.length > 0 ? `Updated ${summaryParts.join(', ')}` : 'Content updated'
    const resolvedChangeSummary = requestedSummary || autoSummary

    // Update content (RLS ensures user can only update their own content)
    let { data, error } = await supabase
      .from('generated_content')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Extra safety check
      .select()
      .single()

    // If error is due to missing columns (migration not run), return error with helpful message
    if (error && (error.code === 'PGRST204' || error.code === '42703')) {
      // Check which column is missing
      const missingColumn = error.message.includes('is_favorite') ? 'is_favorite' :
                           error.message.includes('notes') ? 'notes' :
                           error.message.includes('tags') ? 'tags' : 'unknown'
      
      return new Response(
        JSON.stringify({
          error: 'Database migration required',
          message: `The ${missingColumn} column does not exist. Please run the database migration first.`,
          migrationRequired: true,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (error) {
      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to update content',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const shouldCreateVersion = contentDataChanged
    if (shouldCreateVersion && data?.content_data) {
      const { data: versionRows, error: versionQueryError } = await supabase
        .from('content_versions')
        .select('version_number')
        .eq('content_id', id)
        .order('version_number', { ascending: false })
        .limit(1)

      if (versionQueryError) {
        console.error('Supabase version query error:', versionQueryError)
      } else {
        const lastVersion = versionRows?.[0]?.version_number
        const nextVersion = typeof lastVersion === 'number' ? lastVersion + 1 : 1

        const { error: versionInsertError } = await supabase
          .from('content_versions')
          .insert({
            content_id: id,
            user_id: user.id,
            version_number: nextVersion,
            content_data: data.content_data,
            change_summary: resolvedChangeSummary,
            changed_by: user.id,
          })

        if (versionInsertError) {
          console.error('Supabase version insert error:', versionInsertError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: 'Content updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Update content error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update content',
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

    // Delete content (RLS ensures user can only delete their own content)
    const { error } = await supabase
      .from('generated_content')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Extra safety check

    if (error) {
      console.error('Supabase delete error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to delete content',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content deleted successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Delete content error:', error)
    
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
        error: 'Failed to delete content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
