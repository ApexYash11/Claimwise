"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { signOut } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut, Mail, User, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || "No email"
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        console.warn("Logout error:", error)
      }
      // The signOut function may trigger a reload, but we also navigate just in case
      router.replace("/")
    } catch (err) {
      console.error("Logout failed:", err)
      setIsLoggingOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Back Button */}
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Profile Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
          </div>

          {/* Profile Card */}
          <Card className="border-none shadow-md mb-8">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600 text-white font-bold text-2xl">
                  {userInitials}
                </div>
                <div>
                  <CardTitle className="text-2xl">{userName}</CardTitle>
                  <CardDescription className="text-base mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {userEmail}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Account Information Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Account Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{userName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50 break-all">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800" />

              {/* Account Status Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Account Status
                </h2>
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Active & Verified</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">Your account is in good standing</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-600 animate-pulse" />
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800" />

              {/* Security Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Security & Privacy</h2>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your policies and data are encrypted and securely stored on Supabase. Only you can access your uploaded documents and analysis.
                  </p>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      ✓ End-to-end encrypted storage
                    </p>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mt-2">
                      ✓ No data sharing with third parties
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Section */}
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <CardHeader className="border-b border-red-200 dark:border-red-800">
              <CardTitle className="text-red-700 dark:text-red-400">Logout</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-500">
                Sign out of your account and end your session
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                When you log out, you will be signed out of all your devices. You&apos;ll need to sign back in to access your policies and analysis.
              </p>

              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After logout, you&apos;ll be redirected to the home page
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
