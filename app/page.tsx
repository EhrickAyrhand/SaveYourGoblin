"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/types/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    checkAuth()
  }, [])

  async function handleSignOut() {
    try {
      const { signOut } = await import("@/lib/auth")
      await signOut()
      window.location.href = "/login"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="flex w-full max-w-6xl mx-auto flex-col items-center text-center p-4 pt-8">
        {/* CTA Buttons at the top */}
        <div className="flex flex-col gap-4 sm:flex-row w-full justify-center">
          {user ? (
            <>
              <Button asChild size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/generator">Start Generating</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/library">My Library</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/profile">Profile</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="min-w-[160px] font-display text-lg"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/register">Begin Your Quest</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/login">Sign In</Link>
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
          <h1 className="font-display text-5xl font-bold tracking-wide sm:text-6xl md:text-7xl lg:text-8xl">
            RPG Master's Assistant
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>

        {/* Gap before description */}
        <div className="h-6" />

        {/* Description */}
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
          When your players go off-script, let AI help you create characters, NPCs, missions, 
          and environments on-the-fly. Never be caught unprepared again.
        </p>

        {/* Gaps before cards */}
        <div className="h-6" />

        {/* Feature Cards */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">🎭 Characters & NPCs</CardTitle>
              <CardDescription className="font-body">
                Generate fully fleshed-out characters with names, backgrounds, skills, spells, 
                and personality traits in seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                "In this tavern there's a Bard..." becomes a complete character with history, 
                voice lines, and mission hooks.
              </p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">🗺️ Environments</CardTitle>
              <CardDescription className="font-body">
                Create immersive locations with ambient details, mood, lighting, and interactive 
                features that bring your world to life.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                Transform a simple description into a rich, atmospheric setting your players 
                will remember.
              </p>
            </CardContent>
          </Card>

          <Card className="parchment ornate-border sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-2xl">⚔️ Missions & Quests</CardTitle>
              <CardDescription className="font-body">
                Instantly generate quests with objectives, rewards, difficulty levels, and 
                connections to your existing story.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-left text-sm text-muted-foreground">
                Turn unexpected player actions into engaging side quests that enhance your 
                main campaign.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="w-full max-w-3xl mt-16">
          <h2 className="mb-8 font-display text-3xl font-bold sm:text-4xl">
            How It Works
          </h2>
          <div className="grid gap-6 text-left sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  1
                </div>
                <h3 className="font-display text-xl font-semibold">Describe</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Simply describe the situation or what you need. No complex forms or templates required.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  2
                </div>
                <h3 className="font-display text-xl font-semibold">Generate</h3>
              </div>
            <p className="text-sm text-muted-foreground">
                Our AI creates detailed, D&D 5e-compatible content tailored to your scenario.
            </p>
          </div>
          
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 font-display text-xl font-bold text-primary">
                  3
                </div>
                <h3 className="font-display text-xl font-semibold">Save & Use</h3>
              </div>
            <p className="text-sm text-muted-foreground">
                Save your generated content and use it immediately in your campaign.
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
              <h3 className="font-display text-xl font-semibold mb-2">RPG Master's Assistant</h3>
              <p className="font-body text-sm text-muted-foreground">
                AI-powered content generation for D&D 5e campaigns
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 text-center md:text-left">
              <div>
                <h4 className="font-display font-semibold mb-2">Quick Links</h4>
                <ul className="space-y-1 font-body text-sm text-muted-foreground">
                  <li>
                    {user ? (
                      <Link href="/generator" className="hover:text-primary transition-colors">
                        Generator
                      </Link>
                    ) : (
                      <Link href="/register" className="hover:text-primary transition-colors">
                        Register
                      </Link>
                    )}
                  </li>
                  <li>
                    {user ? (
                      <Link href="/library" className="hover:text-primary transition-colors">
                        Library
                      </Link>
                    ) : (
                      <Link href="/login" className="hover:text-primary transition-colors">
                        Login
                      </Link>
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-display font-semibold mb-2">About</h4>
                <ul className="space-y-1 font-body text-sm text-muted-foreground">
                  <li>Powered by OpenAI</li>
                  <li>Built with Next.js</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              © {new Date().getFullYear()} RPG Master's Assistant. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
