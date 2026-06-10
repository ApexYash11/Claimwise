"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signUp, signInWithProvider } from "@/lib/auth"
import { Github, Globe, Eye, EyeOff } from "lucide-react"
import { Loader2, Shield, CheckCircle } from "lucide-react"

export function SignupForm() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSocialSignup = async (provider: "google" | "github") => {
    setSocialLoading(provider)
    setError("")
    try {
      const { error: authError } = await signInWithProvider(provider)

      if (authError) {
        setError(`${provider} signup failed. Please try again or use email signup.`)
        setSocialLoading(null)
        return
      }
    } catch {
      setError(`An error occurred during ${provider} sign up. Please try again or use email signup.`)
      setSocialLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (loading) return

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address")
      return
    }
    if (!fullName.trim()) {
      setError("Please enter your full name")
      return
    }

    setLoading(true)

    try {
      const { data, error: authError } = await signUp(email, password, fullName.trim())

      if (authError) {
        let errorMessage = authError.message

        if (authError.message.includes('User already registered') ||
            authError.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please use the login page instead.'
        } else if (authError.message.includes('Invalid email') ||
                   authError.message.includes('invalid_email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (authError.message.includes('Password should be at least') ||
                   authError.message.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long.'
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link.'
        } else if (authError.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid email or password format.'
        } else if (authError.message.includes('Email signup is temporarily unavailable') ||
                   authError.message.includes('server configuration')) {
          errorMessage = 'Email signup is temporarily unavailable. Please use Google or GitHub signup instead.'
        } else if (authError.message.includes('Account creation failed')) {
          errorMessage = 'Having trouble with email signup? Try Google or GitHub signup for instant access.'
        } else if (authError.message.includes('rate limit') ||
                   authError.message.includes('too many')) {
          errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.'
        } else if (authError.message.includes('network') ||
                   authError.message.includes('connection')) {
          errorMessage = 'Connection issue. Please check your internet and try again.'
        } else {
          errorMessage = `Signup failed: ${authError.message}`
        }

        setError(errorMessage)
        setLoading(false)
        return
      }

      if (data?.user) {
        if (data.session) {
          setSuccess(true)
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setSuccess(true)
        }
      } else {
        setError('Account creation incomplete. Please try again or use social login.')
      }

    } catch {
      setError('An unexpected error occurred. Please try again or use Google/GitHub signup.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-50">Account Created!</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Welcome to ClaimWise! You can now sign in to analyze your insurance policies.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-sm text-teal-800 dark:text-teal-200">
                📧 <strong>Check your email</strong> if you don&apos;t get redirected automatically. 
                Some email providers may require you to confirm your account.
              </p>
            </div>
            <Button onClick={() => router.push("/login")} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-50">Create account</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Join ClaimWise to analyze your insurance policies
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 mb-2">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => handleSocialSignup("google")}
                disabled={socialLoading === "google" || loading}
              >
                <Globe className="w-5 h-5 text-teal-600" />
                {socialLoading === "google" ? "Signing up with Google..." : "Sign up with Google"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => handleSocialSignup("github")}
                disabled={socialLoading === "github" || loading}
              >
                <Github className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                {socialLoading === "github" ? "Signing up with GitHub..." : "Sign up with GitHub"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-950 dark:text-white"
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-500 dark:bg-slate-950 dark:text-white"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-500 pr-10 dark:bg-slate-950 dark:text-white"
                  placeholder="Create a password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-500 pr-10 dark:bg-slate-950 dark:text-white"
                  placeholder="Confirm your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account? {" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
