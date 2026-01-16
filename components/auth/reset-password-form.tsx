"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useSearchParams } from "next/navigation"
import { Link as I18nLink } from '@/i18n/routing'
import { updatePassword } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ResetPasswordFormValues = {
  password: string
  confirmPassword: string
}

export function ResetPasswordForm() {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)
  const [isRecoverySession, setIsRecoverySession] = useState(false)
  const searchParams = useSearchParams()

  const resetPasswordSchema = z
    .object({
      password: z
        .string()
        .min(6, t('auth.resetPassword.validation.passwordMin'))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t('auth.resetPassword.validation.passwordStrength')
        ),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.resetPassword.validation.passwordsDontMatch'),
      path: ["confirmPassword"],
    })

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // Check for Supabase password reset token in URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    console.log('[ResetPassword] Page loaded:', {
      fullUrl: window.location.href,
      pathname: window.location.pathname,
      hash: hash || '(empty)',
      hashLength: hash?.length || 0,
      search: window.location.search,
    })

    // Parse hash to extract parameters
    const hashParams = new URLSearchParams(hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    const hasRecoveryToken = hash && accessToken && type === 'recovery'
    
    console.log('[ResetPassword] Hash check:', {
      hash: hash || '(empty)',
      hashLength: hash?.length || 0,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length || 0,
      type,
      hasTypeRecovery: type === 'recovery',
      hasRecoveryToken,
      hashParamsKeys: Array.from(hashParams.keys()),
    })

    // Check for token in query params (legacy support)
    const tokenInQuery = searchParams.get("token")

    console.log('[ResetPassword] Token check:', {
      hasRecoveryToken,
      tokenInQuery: !!tokenInQuery,
    })

    // Immediately check if Supabase already processed the session (might happen before useEffect)
    // This is critical - Supabase might process the hash synchronously on page load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[ResetPassword] Initial session check (immediate):', {
        hasSession: !!session,
        hasError: !!error,
        errorMessage: error?.message,
        sessionUser: session?.user?.email,
        sessionAccessToken: session?.access_token ? `${session.access_token.substring(0, 20)}...` : '(none)',
      })
      if (session && !error) {
        console.log('[ResetPassword] ✓ Session already exists from hash processing, setting hasValidToken')
        setHasValidToken(true)
        // Check if this is a recovery session - if hash had recovery token, mark it
        if (hash && hash.includes('type=recovery')) {
          setIsRecoverySession(true)
          console.log('[ResetPassword] ⚠️ RECOVERY SESSION DETECTED - User must change password before accessing app')
        }
        // Don't return - continue to set up listeners for completeness
      } else {
        console.log('[ResetPassword] ✗ No session found yet, will wait for hash processing')
      }
    })

    // If hash exists with recovery token, wait for Supabase to process it
    // If hash is empty but we're on reset-password page, check for session (might already be processed)
    if (hasRecoveryToken) {
      console.log('[ResetPassword] Recovery token found in hash, setting up session detection...')
      let sessionDetected = false
      
      // Set up auth state listener as primary mechanism
      // This will fire when Supabase processes the hash and establishes the session
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[ResetPassword] Auth state change:', {
          event,
          hasSession: !!session,
          sessionDetected,
          sessionUser: session?.user?.email,
        })
        
        // Listen for when session is established (either SIGNED_IN or PASSWORD_RECOVERY events)
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session && !sessionDetected) {
          console.log('[ResetPassword] Session detected via listener, event:', event)
          sessionDetected = true
          setHasValidToken(true)
          // Mark as recovery session if event is PASSWORD_RECOVERY
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoverySession(true)
            console.log('[ResetPassword] ⚠️ RECOVERY SESSION DETECTED - User must change password before accessing app')
          }
          // Clear hash from URL for security
          window.history.replaceState(null, '', window.location.pathname)
        }
      })

      // Also use retry mechanism as fallback (in case auth state change doesn't fire)
      const checkSession = async (retries = 0): Promise<void> => {
        if (sessionDetected) return // Stop checking if already detected via listener
        
        console.log('[ResetPassword] Checking session, attempt:', retries)
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          console.log('[ResetPassword] getSession result:', {
            hasSession: !!session,
            hasError: !!error,
            errorMessage: error?.message,
            retries,
          })
          
          if (session && !error && !sessionDetected) {
            console.log('[ResetPassword] Session detected via retry mechanism')
            sessionDetected = true
            setHasValidToken(true)
            // Check if this is a recovery session by checking if we came from recovery flow
            // Recovery sessions are temporary and should only allow password updates
            if (hash && hash.includes('type=recovery')) {
              setIsRecoverySession(true)
              console.log('[ResetPassword] ⚠️ RECOVERY SESSION DETECTED - User must change password before accessing app')
            }
            window.history.replaceState(null, '', window.location.pathname)
          } else if (!sessionDetected && retries < 10) {
            // Retry up to 10 times with increasing delays (total ~5.5 seconds)
            const delay = Math.min(100 * (retries + 1), 1000)
            setTimeout(() => checkSession(retries + 1), delay)
          } else if (!sessionDetected && retries >= 10) {
            // No session found after all retries
            console.error('[ResetPassword] No session found after all retries')
            setError(t('auth.resetPassword.noToken'))
          }
        } catch (err) {
          console.error('[ResetPassword] checkSession error:', {
            retries,
            errorMessage: err instanceof Error ? err.message : 'unknown',
          })
          
          if (!sessionDetected && retries >= 10) {
            setError(t('auth.resetPassword.noToken'))
          } else if (!sessionDetected && retries < 10) {
            const delay = Math.min(100 * (retries + 1), 1000)
            setTimeout(() => checkSession(retries + 1), delay)
          }
        }
      }
      
      // Start checking after a delay to allow Supabase to process the hash
      // Similar to verify-email form which uses 1000ms
      setTimeout(() => checkSession(), 500)

      return () => {
        subscription.unsubscribe()
      }
    } else if (tokenInQuery) {
      console.log('[ResetPassword] Using query token')
      setHasValidToken(true)
    } else {
      // Hash is empty - might mean Supabase already processed it or redirect URL is wrong
      console.error('[ResetPassword] No token found in hash or query params')
      console.log('[ResetPassword] Checking if session exists despite empty hash...')
      
      // Give Supabase a moment to process, then check session
      setTimeout(async () => {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[ResetPassword] Delayed session check (after 1s):', {
          hasSession: !!session,
          hasError: !!error,
          errorMessage: error?.message,
          sessionUser: session?.user?.email,
        })
        if (session && !error) {
          console.log('[ResetPassword] ✓ Found session after delay, setting hasValidToken')
          setHasValidToken(true)
          // If we're on reset-password page with a session but no hash, it might be a recovery session
          // Check the session metadata or assume it's recovery if we got here
          setIsRecoverySession(true)
          console.log('[ResetPassword] ⚠️ Assuming recovery session - User must change password')
        } else {
          console.error('[ResetPassword] ✗ Still no session found, showing error')
          setError(t('auth.resetPassword.noToken'))
        }
      }, 1000)
    }
  }, [searchParams, t])

  // SECURITY: Prevent navigation away from reset password page during recovery session
  // This ensures users must change their password before accessing the app
  useEffect(() => {
    if (!isRecoverySession) return

    console.log('[ResetPassword] ⚠️ Recovery session active - blocking navigation away from reset password page')

    // Block browser back/forward navigation
    const handlePopState = (e: PopStateEvent) => {
      console.log('[ResetPassword] Navigation attempt blocked during recovery session')
      e.preventDefault()
      // Push current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname)
      // Show warning
      setError('Please complete the password reset before navigating away.')
    }

    // Block beforeunload (page refresh/close)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You must complete the password reset. Are you sure you want to leave?'
      return e.returnValue
    }

    // Push current state to prevent back navigation
    window.history.pushState(null, '', window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isRecoverySession])

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!hasValidToken) {
      setError(t('auth.resetPassword.noToken'))
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // updatePassword doesn't need token - Supabase session handles it
      const result = await updatePassword({
        password: data.password,
        confirmPassword: data.confirmPassword,
      })
      
      if (result.error) {
        // Check for specific error types
        if (result.error.message?.toLowerCase().includes('session')) {
          setError(t('auth.resetPassword.tokenExpired'))
        } else {
          setError(result.error.message)
        }
      } else {
        setSuccess(true)
        form.reset()
        
        // SECURITY: If this was a recovery session, sign out immediately after password change
        // This prevents the user from accessing the app with the recovery session
        if (isRecoverySession) {
          console.log('[ResetPassword] ⚠️ Recovery session detected - signing out after password change')
          await supabase.auth.signOut()
        }
        
        // Redirect to login after a short delay (user must log in with new password)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError(t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        {/* Show back button only when NOT in recovery session (security: prevent navigation during recovery) */}
        {!isRecoverySession && (
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/login')}
              className="h-8 w-8"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
        <CardDescription>
          {t('auth.resetPassword.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isRecoverySession && !success && (
              <Alert variant="default" className="border-orange-500 bg-orange-500/10">
                <AlertDescription>
                  <strong>Security Notice:</strong> You must complete the password reset before accessing your account. 
                  Please set a new password below.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <AlertDescription>
                  {t('auth.resetPassword.success')}
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.resetPassword.newPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading || success || !hasValidToken}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.resetPassword.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading || success || !hasValidToken}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || success || !hasValidToken}
            >
              {isLoading 
                ? t('auth.resetPassword.resetting') 
                : success 
                ? t('auth.resetPassword.reset') 
                : t('auth.resetPassword.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center text-muted-foreground w-full">
          {t('auth.resetPassword.rememberPassword')}{" "}
          <I18nLink href="/login" className="text-primary hover:underline">
            {t('auth.resetPassword.signIn')}
          </I18nLink>
        </div>
      </CardFooter>
    </Card>
  )
}

