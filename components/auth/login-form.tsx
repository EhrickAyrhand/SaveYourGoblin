"use client"

import { useState } from "react"
import { useRouter } from '@/i18n/routing'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useTranslations } from 'next-intl'
import { Link as I18nLink } from '@/i18n/routing'
import { signIn } from "@/lib/auth"
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

type LoginFormValues = {
  email: string
  password: string
}

export function LoginForm() {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginSchema = z.object({
    email: z.string().email(t('auth.login.validation.emailInvalid')),
    password: z.string().min(6, t('auth.login.validation.passwordMin')),
  })

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn(data)
      
      if (result.error) {
        setError(result.error.message)
      } else {
        // Redirect to profile after successful login
        router.push("/profile")
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
        <CardTitle>{t('auth.login.title')}</CardTitle>
        <CardDescription>
          {t('auth.login.description')}
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
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.login.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('auth.login.emailPlaceholder')}
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
                  <FormLabel>{t('auth.login.password')}</FormLabel>
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
              {isLoading ? t('auth.login.signingIn') : t('auth.login.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button asChild variant="outline" className="w-full font-body">
          <I18nLink href="/">
            {t('auth.login.backToHome')}
          </I18nLink>
        </Button>
        <div className="text-sm text-center text-muted-foreground">
          <I18nLink
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            {t('auth.login.forgotPassword')}
          </I18nLink>
        </div>
        <div className="text-sm text-center text-muted-foreground">
          {t('auth.login.noAccount')}{" "}
          <I18nLink href="/register" className="text-primary hover:underline">
            {t('auth.login.signUp')}
          </I18nLink>
        </div>
      </CardFooter>
    </Card>
  )
}

