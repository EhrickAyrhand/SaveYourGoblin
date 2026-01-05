"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { verifyEmail } from "@/lib/auth"
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (token) {
      handleVerification(token)
    } else {
      setError("Invalid or missing verification token.")
      setIsVerifying(false)
    }
  }, [token])

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
        <CardTitle>Verify Email</CardTitle>
        <CardDescription>
          {isVerifying
            ? "Verifying your email address..."
            : "Email verification status"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isVerifying && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Please wait while we verify your email...</p>
          </div>
        )}

        {!isVerifying && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isVerifying && success && (
          <Alert>
            <AlertDescription>
              Your email has been verified successfully! You can now sign in to your account.
            </AlertDescription>
          </Alert>
        )}

        {!isVerifying && !success && !error && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              No verification token found. Please check your email for the verification link.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {!isVerifying && !success && (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isLoading}
            className="w-full"
          >
            Resend Verification Email
          </Button>
        )}
        
        {success && (
          <Button asChild className="w-full">
            <Link href="/login">Go to Sign In</Link>
          </Button>
        )}
        
        <div className="text-sm text-center text-muted-foreground w-full">
          <Link href="/login" className="text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

