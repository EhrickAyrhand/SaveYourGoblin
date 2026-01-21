import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm p-4">
      <ForgotPasswordForm />
    </div>
  )
}