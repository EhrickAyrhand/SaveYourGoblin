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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:72',message:'useEffect entry',data:{fullUrl:window.location.href,pathname:window.location.pathname,hash:window.location.hash?.substring(0,100),search:window.location.search},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const hash = window.location.hash
    const hasRecoveryToken = hash && hash.includes('access_token') && hash.includes('type=recovery')
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:76',message:'hash check',data:{hashLength:hash?.length,hasAccessToken:hash?.includes('access_token'),hasTypeRecovery:hash?.includes('type=recovery'),hasRecoveryToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Check for token in query params (legacy support)
    const tokenInQuery = searchParams.get("token")

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:79',message:'token check',data:{hasRecoveryToken,tokenInQuery:!!tokenInQuery},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (hasRecoveryToken) {
      let sessionDetected = false
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:86',message:'setting up auth state listener',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Set up auth state listener as primary mechanism
      // This will fire when Supabase processes the hash and establishes the session
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:89',message:'auth state change',data:{event,hasSession:!!session,sessionDetected},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        // Listen for when session is established (either SIGNED_IN or PASSWORD_RECOVERY events)
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session && !sessionDetected) {
          sessionDetected = true
          setHasValidToken(true)
          // Clear hash from URL for security
          window.history.replaceState(null, '', window.location.pathname)
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:93',message:'session detected via listener',data:{event},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
      })

      // Also use retry mechanism as fallback (in case auth state change doesn't fire)
      const checkSession = async (retries = 0): Promise<void> => {
        if (sessionDetected) return // Stop checking if already detected via listener
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:99',message:'checkSession attempt',data:{retries,sessionDetected},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:103',message:'getSession result',data:{hasSession:!!session,hasError:!!error,errorMessage:error?.message,retries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (session && !error && !sessionDetected) {
            sessionDetected = true
            setHasValidToken(true)
            window.history.replaceState(null, '', window.location.pathname)
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:107',message:'session detected via retry',data:{retries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          } else if (!sessionDetected && retries < 10) {
            // Retry up to 10 times with increasing delays (total ~5.5 seconds)
            const delay = Math.min(100 * (retries + 1), 1000)
            setTimeout(() => checkSession(retries + 1), delay)
          } else if (!sessionDetected && retries >= 10) {
            // No session found after all retries
            setError(t('auth.resetPassword.noToken'))
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:114',message:'no session after retries',data:{retries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          }
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:117',message:'checkSession error',data:{retries,errorMessage:err instanceof Error?err.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:134',message:'using query token',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setHasValidToken(true)
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f36a4b61-b46c-4425-8755-db39bb2e81e7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reset-password-form.tsx:137',message:'no token found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setError(t('auth.resetPassword.noToken'))
    }
  }, [searchParams, t])

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
        // Redirect to login after a short delay
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
        <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
        <CardDescription>
          {t('auth.resetPassword.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

