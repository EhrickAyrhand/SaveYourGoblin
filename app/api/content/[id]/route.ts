/**
 * API Route for Updating and Deleting Generated Content
 * 
 * PATCH: Updates content fields (favorite, tags, notes)
 * DELETE: Removes content by ID with authentication
 */

import { NextRequest } from 'next/server'
import { requireVerifiedEmail, createServerClient } from '@/lib/supabase-server'

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
    const { is_favorite, tags, notes } = body as {
      is_favorite?: boolean
      tags?: string[]
      notes?: string
    }

    // Build update object (only include provided fields)
    const updates: {
      is_favorite?: boolean
      tags?: string[]
      notes?: string
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/content/[id]/route.ts:85',message:'Before PATCH update',data:{id,updates:Object.keys(updates)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Update content (RLS ensures user can only update their own content)
    let { data, error } = await supabase
      .from('generated_content')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Extra safety check
      .select()
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/content/[id]/route.ts:95',message:'After PATCH update attempt',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // If error is due to missing columns (migration not run), return error with helpful message
    if (error && (error.code === 'PGRST204' || error.code === '42703')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/content/[id]/route.ts:99',message:'Column missing error in PATCH',data:{errorCode:error.code,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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
