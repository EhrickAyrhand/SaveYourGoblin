import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

function ResetPasswordFormWrapper() {
  return <ResetPasswordForm />
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordFormWrapper />
      </Suspense>
    </div>
  )
}

