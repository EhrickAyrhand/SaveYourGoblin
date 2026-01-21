"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { getCurrentUser, signOut } from "@/lib/auth"
import { isRecoverySessionActive } from "@/lib/recovery-session"
import type { User } from "@/types/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function checkAuth() {
      // SECURITY: If recovery session is active, don't show user as logged in
      // This prevents users from accessing the app without changing their password
      // Even though Supabase session exists, we treat it as not logged in
      if (isRecoverySessionActive()) {
        setUser(null) // Don't show user as logged in during recovery session
        return
      }

      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    checkAuth()
  }, [])

  async function handleSignOut() {
    try {
      await signOut()
      window.location.href = `/${locale}/login`
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background/50 backdrop-blur-sm">
      <main className="flex w-full max-w-6xl mx-auto flex-col items-center text-center p-4 pt-8">
        {/* CTA Buttons at the top */}
        <div className="flex flex-col gap-4 sm:flex-row w-full justify-center">
          {user ? (
            <>
              <Button asChild size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/generator">{t('common.generator')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/library">{t('common.library')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/profile">{t('common.profile')}</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="min-w-[160px] font-display text-lg"
                onClick={handleSignOut}
              >
                {t('profile.signOut')}
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/register">{t('home.beginQuest')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/login">{t('auth.login.title')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Gaps before title */}
        <div className="h-12" />
        <div className="h-12" />
        <div className="h-12" />

        {/* Title - Centered */}
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <h1 className="font-display text-5xl font-bold tracking-wide sm:text-6xl md:text-7xl lg:text-8xl animate-fade-in-up animate-title-glow bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent transition-all duration-500 hover:scale-105 hover:brightness-110 select-none">
            {t('home.title')}
          </h1>
          <div className="h-1 w-32 sm:w-40 md:w-48 bg-gradient-to-r from-transparent via-primary to-transparent animate-divider-glow rounded-full transition-all duration-300" />
        </div>

        {/* Gap before description */}
        <div className="h-6" />

        {/* Description */}
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
          {t('home.description')}
        </p>

        {/* Gaps before cards */}
        <div className="h-6" />

        {/* Feature Cards */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">🎭 {t('home.features.characters.title')}</CardTitle>
              <CardDescription className="font-body">
                {t('home.features.characters.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                {t('home.features.characters.example')}
              </p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">🗺️ {t('home.features.environments.title')}</CardTitle>
              <CardDescription className="font-body">
                {t('home.features.environments.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                {t('home.features.environments.example')}
              </p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-2xl">⚔️ {t('home.features.missions.title')}</CardTitle>
              <CardDescription className="font-body">
                {t('home.features.missions.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                {t('home.features.missions.example')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="w-full max-w-3xl mt-16">
          <h2 className="mb-8 font-display text-3xl font-bold sm:text-4xl">
            {t('home.howItWorks.title')}
          </h2>
          <div className="grid gap-6 text-left sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  1
                </div>
                <h3 className="font-display text-xl font-semibold">{t('home.howItWorks.step1.title')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('home.howItWorks.step1.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  2
                </div>
                <h3 className="font-display text-xl font-semibold">{t('home.howItWorks.step2.title')}</h3>
              </div>
            <p className="text-sm text-muted-foreground">
                {t('home.howItWorks.step2.description')}
            </p>
          </div>
          
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  3
                </div>
                <h3 className="font-display text-xl font-semibold">{t('home.howItWorks.step3.title')}</h3>
              </div>
            <p className="text-sm text-muted-foreground">
                {t('home.howItWorks.step3.description')}
            </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border mt-16 bg-background/50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-display text-xl font-semibold mb-2">{t('home.footerTitle')}</h3>
              <p className="font-body text-sm text-muted-foreground">
                {t('home.footer.tagline')}
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 text-center md:text-left">
              <div>
                <h4 className="font-display font-semibold mb-2">{t('home.footer.quickLinks')}</h4>
                <ul className="space-y-1 font-body text-sm text-muted-foreground">
                  <li>
                    {user ? (
                      <Link href="/generator" className="hover:text-primary transition-colors">
                        {t('common.generator')}
                      </Link>
                    ) : (
                      <Link href="/register" className="hover:text-primary transition-colors">
                        {t('home.footer.register')}
                      </Link>
                    )}
                  </li>
                  <li>
                    {user ? (
                      <Link href="/library" className="hover:text-primary transition-colors">
                        {t('common.library')}
                      </Link>
                    ) : (
                      <Link href="/login" className="hover:text-primary transition-colors">
                        {t('auth.login.title')}
                      </Link>
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-display font-semibold mb-2">{t('home.footer.about')}</h4>
                <ul className="space-y-1 font-body text-sm text-muted-foreground">
                  <li>{t('home.footer.poweredBy')}</li>
                  <li>{t('home.footer.builtWith')}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {t('home.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
