"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Link as I18nLink } from '@/i18n/routing'
import { signUp } from "@/lib/auth"
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

type RegisterFormValues = {
  email: string
  password: string
  confirmPassword: string
}

export function RegisterForm() {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const registerSchema = z
    .object({
      email: z.string().email(t('auth.register.validation.emailInvalid')),
      password: z
        .string()
        .min(6, t('auth.register.validation.passwordMin'))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t('auth.register.validation.passwordStrength')
        ),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.register.validation.passwordsDontMatch'),
      path: ["confirmPassword"],
    })

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
      })
      
      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess(true)
        setRegisteredEmail(data.email)
        form.reset()
        // Redirect to verify-email page after a short delay to show success message
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
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
        <CardTitle>{t('auth.register.title')}</CardTitle>
        <CardDescription>
          {t('auth.register.description')}
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
                  {t('auth.register.successMessage')}
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('auth.register.emailPlaceholder')}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.password')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
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
                  <FormLabel>{t('auth.register.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.register.creating') : t('auth.register.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button asChild variant="outline" className="w-full font-body">
          <I18nLink href="/">
            {t('auth.register.backToHome')}
          </I18nLink>
        </Button>
        <div className="text-sm text-center text-muted-foreground w-full">
          {t('auth.register.hasAccount')}{" "}
          <I18nLink href="/login" className="text-primary hover:underline">
            {t('auth.register.signIn')}
          </I18nLink>
        </div>
      </CardFooter>
    </Card>
  )
}
