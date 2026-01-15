"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslations } from 'next-intl'
import { Link as I18nLink } from '@/i18n/routing'
import { resetPassword } from "@/lib/auth"
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

type ForgotPasswordFormValues = {
  email: string
}

export function ForgotPasswordForm() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const forgotPasswordSchema = z.object({
    email: z.string().email(t('auth.forgotPassword.validation.emailInvalid')),
  })

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await resetPassword(data)
      
      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess(true)
        form.reset()
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
        <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
        <CardDescription>
          {t('auth.forgotPassword.description')}
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
                  {t('auth.forgotPassword.success')}
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.forgotPassword.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                      disabled={isLoading || success}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading || success}>
              {isLoading 
                ? t('auth.forgotPassword.sending') 
                : success 
                ? t('auth.forgotPassword.emailSent') 
                : t('auth.forgotPassword.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center text-muted-foreground w-full">
          {t('auth.forgotPassword.rememberPassword')}{" "}
          <I18nLink href="/login" className="text-primary hover:underline">
            {t('auth.forgotPassword.signIn')}
          </I18nLink>
        </div>
      </CardFooter>
    </Card>
  )
}

