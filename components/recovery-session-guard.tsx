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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:20',message:'RecoverySessionGuard mounted',data:{url:window.location.href,hash:window.location.hash?.substring(0,50)||'(empty)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check URL hash for recovery token IMMEDIATELY
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:30',message:'Hash check in guard',data:{hasHash:!!hash,hasAccessToken:!!accessToken,type,isRecovery:type==='recovery'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // If we have a recovery token in the hash, set the flag IMMEDIATELY
      if (accessToken && type === 'recovery') {
        setRecoverySessionActive()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:36',message:'Recovery session flag set in guard',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }

    // Also check if Supabase has already processed the session
    // This catches cases where the hash was processed before this component mounted
    // OR where the hash was removed but the session still exists
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const hasRecoveryFlag = typeof window !== 'undefined' && localStorage.getItem('recovery_session_active') === 'true'
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:49',message:'Session check in guard',data:{hasSession:!!session,hasError:!!error,hasHash:!!hash,hashIncludesRecovery:hash?.includes('type=recovery'),recoveryFlagExists:hasRecoveryFlag,pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // CRITICAL: If we have a session AND (hash contains recovery token OR flag is already set), it's a recovery session
      // This must be set even if hash is gone (user closed tab) - the session persists but flag must too
      if (session && !error) {
        if (hash?.includes('type=recovery') || hasRecoveryFlag) {
          // Set/keep the flag - this is a recovery session
          setRecoverySessionActive()
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:58',message:'Recovery session flag set from session check',data:{hadHash:!!hash?.includes('type=recovery'),hadFlag:hasRecoveryFlag,sessionUser:session.user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
      }
    })

    // Also listen for auth state changes to catch recovery sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentHash = window.location.hash
      const hasRecoveryFlag = typeof window !== 'undefined' && localStorage.getItem('recovery_session_active') === 'true'
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:63',message:'Auth state change in guard',data:{event,hasSession:!!session,hasHash:!!currentHash,hashIncludesRecovery:currentHash?.includes('type=recovery'),hasRecoveryFlag},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // If PASSWORD_RECOVERY event, session exists with recovery hash, OR flag already exists, set flag
      // The flag might persist even after hash is removed, so we check for it too
      if (event === 'PASSWORD_RECOVERY' || (session && currentHash?.includes('type=recovery')) || hasRecoveryFlag) {
        setRecoverySessionActive()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/recovery-session-guard.tsx:70',message:'Recovery session flag set from auth state change',data:{event,hadHash:!!currentHash?.includes('type=recovery'),hadFlag:hasRecoveryFlag},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty deps - run once on mount

  return null // This component doesn't render anything
}
