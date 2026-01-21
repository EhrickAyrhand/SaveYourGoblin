import { LoginForm } from "@/components/auth/login-form"

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm p-4">
      <LoginForm />
    </div>
  )
}