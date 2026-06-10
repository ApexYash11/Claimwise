"use client"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between border-r bg-muted/30 p-12">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
              CW
            </div>
            ClaimWise
          </div>
        </div>
        <div className="max-w-sm space-y-6">
          <blockquote className="font-serif text-xl leading-relaxed">
            &ldquo;We reduced policy review time from hours to minutes while catching exclusions we would have missed.&rdquo;
          </blockquote>
          <div>
            <p className="text-sm font-medium">— Risk Management Director</p>
            <p className="text-xs text-muted-foreground">Fortune 500 Benefits Team</p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {["AI-powered clause extraction & risk scoring", "Traceable insights with source citations", "SOC 2 compliant, encrypted at rest"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} ClaimWise. All rights reserved.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  )
}
