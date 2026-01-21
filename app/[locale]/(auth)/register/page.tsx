import { RegisterForm } from "@/components/auth/register-form"

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm p-4">
      <RegisterForm />
    </div>
  )
}
