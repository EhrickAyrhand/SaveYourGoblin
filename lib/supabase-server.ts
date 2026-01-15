/**
 * Server-side Supabase client for API routes
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.'
  )
}

/**
 * Create a server-side Supabase client
 * Use this in API routes to access authenticated user data
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  
  // Supabase stores session in cookies with format: sb-<project-ref>-auth-token
  // We'll create a client and let it read from cookies automatically
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          // Try to get from cookies - Supabase uses specific cookie names
          const cookieName = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`
          return cookieStore.get(cookieName)?.value || null
        },
        setItem: () => {}, // No-op for server
        removeItem: () => {}, // No-op for server
      },
    },
  })

  return supabase
}

/**
 * Get the current user from the request
 * Extracts user from Authorization header or session cookies
 * Returns user with email_confirmed_at field
 */
export async function getServerUser(request?: NextRequest) {
  // First try: Get from Authorization header if provided
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token)
        if (user && !error) return user
      } catch (err) {
        // Token might be invalid, continue to other methods
        console.error('Error getting user from token:', err)
      }
    }
  }

  // Second try: Get from session cookies
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      return session.user
    }
  } catch (err) {
    // Session might not be available, continue
    console.error('Error getting session from cookies:', err)
  }

  // Third try: Get user directly (may work if session is set)
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (user && !error) return user
  } catch (err) {
    // No user available
    console.error('Error getting user:', err)
  }

  return null
}

/**
 * Require a verified email for protected routes
 * Returns user if verified, throws error if not verified or not authenticated
 */
export async function requireVerifiedEmail(request?: NextRequest) {
  const user = await getServerUser(request)
  
  if (!user) {
    const error = new Error('Authentication required') as any
    error.status = 401
    throw error
  }

  if (!user.email_confirmed_at) {
    const error = new Error('Email verification required') as any
    error.status = 403
    error.message = 'Please verify your email address before accessing this resource.'
    throw error
  }

  return user
}

