"use client"

import { useEffect } from "react"
import { setRecoverySessionActive } from "@/lib/recovery-session"
import { supabase } from "@/lib/supabase"

/**
 * RecoverySessionGuard Component
 * 
 * This component runs on EVERY page load and immediately checks for recovery tokens
 * in the URL hash. It sets the recovery session flag BEFORE any protected pages
 * can check for it, preventing unauthorized access.
 * 
 * This must run synchronously/early to catch recovery sessions before users
 * can navigate to protected routes.
 */
export function RecoverySessionGuard() {
  useEffect(() => {
    // Run immediately - no dependencies, executes on mount
    if (typeof window === 'undefined') return

    // Check URL hash for recovery token IMMEDIATELY
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      // If we have a recovery token in the hash, set the flag IMMEDIATELY
      if (accessToken && type === 'recovery') {
        setRecoverySessionActive()
      }
    }

    // Also check if Supabase has already processed the session
    // This catches cases where the hash was processed before this component mounted
    // OR where the hash was removed but the session still exists
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const hasRecoveryFlag = typeof window !== 'undefined' && localStorage.getItem('recovery_session_active') === 'true'

      // CRITICAL: If we have a session AND (hash contains recovery token OR flag is already set), it's a recovery session
      // This must be set even if hash is gone (user closed tab) - the session persists but flag must too
      if (session && !error) {
        if (hash?.includes('type=recovery') || hasRecoveryFlag) {
          // Set/keep the flag - this is a recovery session
          setRecoverySessionActive()
        }
      }
    })

    // Also listen for auth state changes to catch recovery sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentHash = window.location.hash
      const hasRecoveryFlag = typeof window !== 'undefined' && localStorage.getItem('recovery_session_active') === 'true'

      // If PASSWORD_RECOVERY event, session exists with recovery hash, OR flag already exists, set flag
      // The flag might persist even after hash is removed, so we check for it too
      if (event === 'PASSWORD_RECOVERY' || (session && currentHash?.includes('type=recovery')) || hasRecoveryFlag) {
        setRecoverySessionActive()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty deps - run once on mount

  return null // This component doesn't render anything
}
