"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signIn, signInWithProvider } from "@/lib/auth"
import { Github, Globe, Loader2, Eye, EyeOff, Lock, FileText, BarChart3, MessageSquareText } from "lucide-react"

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSocialLogin = async (provider: "google" | "github") => {
    setSocialLoading(provider)
    setError("")
    const { error: authError } = await signInWithProvider(provider)
    if (authError) {
      setError(authError.message)
      setSocialLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error: authError } = await signIn(email, password)

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else if (data.user) {
      router.push("/dashboard")
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Sign in to ClaimWise</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Analyze policies, detect exclusions, and compare coverage
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => handleSocialLogin("google")}
          disabled={socialLoading === "google" || loading}
        >
          <Globe className="h-4 w-4" />
          {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => handleSocialLogin("github")}
          disabled={socialLoading === "github" || loading}
        >
          <Github className="h-4 w-4" />
          {socialLoading === "github" ? "Signing in..." : "Continue with GitHub"}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4 hover:text-foreground">
          Create one
        </Link>
      </p>

      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">After signing in you can:</p>
        <div className="space-y-2">
          {[
            { icon: FileText, label: "Upload and analyze policy documents" },
            { icon: BarChart3, label: "Compare coverage across multiple plans" },
            { icon: MessageSquareText, label: "Ask AI questions about your policies" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
