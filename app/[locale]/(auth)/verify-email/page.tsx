import { Suspense } from "react"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"

export const dynamic = 'force-dynamic'

function VerifyEmailFormWrapper() {
  return <VerifyEmailForm />
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailFormWrapper />
      </Suspense>
    </div>
  )
}
