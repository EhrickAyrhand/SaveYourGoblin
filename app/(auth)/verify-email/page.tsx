import { Suspense } from "react"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"

function VerifyEmailFormWrapper() {
  return <VerifyEmailForm />
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailFormWrapper />
      </Suspense>
    </div>
  )
}
