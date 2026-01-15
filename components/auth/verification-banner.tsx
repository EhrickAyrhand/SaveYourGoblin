"use client"

import { useState } from "react"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Link as I18nLink } from '@/i18n/routing'
import { resendVerificationEmail, getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VerificationBannerProps {
  email?: string
}

export function VerificationBanner({ email }: VerificationBannerProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResend() {
    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      let emailToUse = email
      if (!emailToUse) {
        const user = await getCurrentUser()
        emailToUse = user?.email || undefined
      }

      if (!emailToUse) {
        setError(t('auth.verifyEmail.emailRequired'))
        return
      }

      const result = await resendVerificationEmail(emailToUse)
      
      if (result.error) {
        setError(result.error.message)
      } else {
        setResendSuccess(true)
        setTimeout(() => {
          setResendSuccess(false)
        }, 5000)
      }
    } catch (err) {
      setError(t('errors.generic'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
      <AlertDescription className="flex flex-col gap-3">
        <div>
          <strong>{t('auth.verificationBanner.title')}</strong>
          <p className="mt-1 text-sm">{t('auth.verificationBanner.description')}</p>
        </div>
        
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {resendSuccess && (
          <div className="text-sm text-green-600 dark:text-green-400">
            {t('auth.verifyEmail.resendSuccess')}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm"
          >
            {isResending 
              ? t('auth.verifyEmail.sending') 
              : t('auth.verificationBanner.resendEmail')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/verify-email')}
            className="text-sm"
          >
            {t('auth.verificationBanner.goToVerification')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
