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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <main className="flex w-full max-w-6xl flex-col items-center justify-center gap-12 text-center">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-5xl font-bold tracking-wide sm:text-6xl md:text-7xl lg:text-8xl">
              RPG Master's Assistant
          </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
            When your players go off-script, let AI help you create characters, NPCs, missions, 
            and environments on-the-fly. Never be caught unprepared again.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {user ? (
            <>
              <Button asChild size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/generator">Start Generating</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px] font-display text-lg">
                <Link href="/profile">Profile</Link>
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

        {/* Feature Cards */}
        <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="mt-12 w-full max-w-3xl">
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

        {/* Footer CTA */}
        {!user ? (
          <div className="mt-12 w-full max-w-2xl rounded-lg border-2 border-primary/20 bg-card/50 p-8 parchment">
            <h3 className="mb-4 font-display text-2xl font-bold">
              Ready to Enhance Your Campaign?
            </h3>
            <p className="mb-6 text-muted-foreground">
              Join RPG masters who never get caught off-guard. Create an account to start generating 
              content today.
            </p>
            <Button asChild size="lg" className="font-display">
              <Link href="/register">Start Your Journey</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-12 w-full max-w-2xl rounded-lg border-2 border-primary/20 bg-card/50 p-8 parchment">
            <h3 className="mb-4 font-display text-2xl font-bold">
              Ready to Enhance Your Campaign?
            </h3>
            <p className="mb-6 text-muted-foreground">
              Start generating characters, NPCs, missions, and environments for your next session.
            </p>
            <Button asChild size="lg" className="font-display">
              <Link href="/generator">Start Generating</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
