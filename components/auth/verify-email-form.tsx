"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Link as I18nLink } from '@/i18n/routing'
import { verifyEmail, resendVerificationEmail, getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function VerifyEmailForm() {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)
  const searchParams = useSearchParams()
  
  // Get email from query params or current user
  useEffect(() => {
    const emailFromParams = searchParams.get("email")
    if (emailFromParams) {
      setUserEmail(emailFromParams)
    } else {
      // Try to get from current user
      getCurrentUser().then((user) => {
        if (user?.email) {
          setUserEmail(user.email)
        }
      })
    }
  }, [searchParams])
  
  // Check for Supabase email verification callback
  useEffect(() => {
    // Supabase sends verification via URL hash (e.g., #access_token=...&type=email)
    // Check if we have hash parameters
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Supabase automatically handles this via detectSessionInUrl
        // Check if user is now verified
        setTimeout(async () => {
          const user = await getCurrentUser()
          if (user?.emailVerified) {
            setSuccess(true)
            setIsVerifying(false)
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname)
          }
        }, 1000)
      } else {
        // Check for token in query params
        const token = searchParams.get("token")
        if (token) {
          handleVerification(token)
        } else {
          setIsVerifying(false)
        }
      }
    }
  }, [searchParams])

  async function handleVerification(token: string) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await verifyEmail({ token })
      
      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    // TODO: Implement resend verification email functionality
    // This would typically require the user's email address
    setError("Resend functionality will be available after Supabase setup.")
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.verifyEmail.title')}</CardTitle>
        <CardDescription>
          {isVerifying
            ? t('auth.verifyEmail.verifying')
            : t('auth.verifyEmail.status')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userEmail && !success && (
          <div className="mb-4 text-sm text-muted-foreground">
            {t('auth.verifyEmail.emailLabel')}: <strong>{userEmail}</strong>
          </div>
        )}

        {isVerifying && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">{t('auth.verifyEmail.pleaseWait')}</p>
          </div>
        )}

        {!isVerifying && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert>
            <AlertDescription>
              {t('auth.verifyEmail.resendSuccess')}
            </AlertDescription>
          </Alert>
        )}

        {!isVerifying && success && (
          <Alert>
            <AlertDescription>
              {t('auth.verifyEmail.success')}
            </AlertDescription>
          </Alert>
        )}

        {!isVerifying && !success && !error && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              {t('auth.verifyEmail.noToken')}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {!isVerifying && !success && (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isLoading || !userEmail}
            className="w-full"
          >
            {isLoading ? t('auth.verifyEmail.sending') : t('auth.verifyEmail.resend')}
          </Button>
        )}
        
        {success && (
          <Button 
            onClick={() => router.push('/login')}
            className="w-full"
          >
            {t('auth.verifyEmail.goToSignIn')}
          </Button>
        )}
        
        <div className="text-sm text-center text-muted-foreground w-full">
          <I18nLink href="/login" className="text-primary hover:underline">
            {t('auth.verifyEmail.backToSignIn')}
          </I18nLink>
        </div>
      </CardFooter>
    </Card>
  )
}

