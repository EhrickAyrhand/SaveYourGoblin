/**
 * Recovery Session Management
 * 
 * When a user clicks a password reset link, Supabase creates a session.
 * We need to track this as a "recovery session" and prevent access to
 * protected routes until the password is changed.
 * 
 * Uses localStorage (not sessionStorage) so the flag persists across tabs/windows.
 * This prevents users from bypassing protection by closing and reopening tabs.
 * 
 * IMPORTANT: We only block PROTECTED routes (library, profile, generator).
 * We allow access to reset-password page and home page for better UX.
 */

const RECOVERY_SESSION_KEY = 'recovery_session_active'

/**
 * Mark that a recovery session is active
 * This should be called when a recovery token is detected
 */
export function setRecoverySessionActive(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RECOVERY_SESSION_KEY, 'true')
  }
}

/**
 * Check if a recovery session is currently active
 */
export function isRecoverySessionActive(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(RECOVERY_SESSION_KEY) === 'true'
}

/**
 * Clear the recovery session flag
 * This should be called after:
 * - Password is successfully changed
 * - User logs in normally (not from recovery)
 * - User signs out
 */
export function clearRecoverySession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RECOVERY_SESSION_KEY)
  }
}

/**
 * Check if the current route is a protected route that should be blocked during recovery
 */
export function isProtectedRoute(pathname: string): boolean {
  // Protected routes that require password change during recovery
  const protectedRoutes = ['/library', '/profile', '/generator']
  return protectedRoutes.some(route => pathname.includes(route))
}

/**
 * Check if the current route is the reset-password page (should be allowed during recovery)
 */
export function isResetPasswordRoute(pathname: string): boolean {
  return pathname.includes('/reset-password')
}
