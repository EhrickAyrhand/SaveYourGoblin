/**
 * API Route for Deleting Generated Content
 * 
 * DELETE: Removes content by ID with authentication
 */

import { NextRequest } from 'next/server'
import { getServerUser, createServerClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getServerUser(request)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

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
  } catch (error) {
    console.error('Delete content error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to delete content',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

