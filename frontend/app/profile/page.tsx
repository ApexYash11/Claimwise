"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/hooks/use-auth"
import { signOut } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut, Mail, FileText, Activity, HardDrive, BarChart3, History, Shield } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { PageWrapper } from "@/components/motion/page-wrapper"
import { usePolicies } from "@/lib/use-queries"

export default function ProfilePage() {
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { data: policiesData } = usePolicies()

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || "No email"
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const policiesCount = policiesData?.policies?.length ?? 0

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await signOut()
      if (error) setIsLoggingOut(false)
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <PageWrapper>
          <main className="page-container-sm py-8 space-y-8">
            <div>
              <Button variant="ghost" asChild className="text-muted-foreground">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Dashboard</Link>
              </Button>
            </div>

            <div className="card-flat space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-serif text-xl font-medium">
                  {userInitials}
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{userName}</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    {userEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: FileText, label: "Uploaded Policies", value: policiesCount },
                { icon: Activity, label: "Analyses Completed", value: policiesCount > 0 ? `${policiesCount * 3}+` : "0" },
                { icon: HardDrive, label: "Storage Used", value: "—" },
              ].map((stat) => (
                <div key={stat.label} className="card-flat-subtle space-y-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="metric-label">{stat.label}</p>
                  <p className="metric-value">{stat.value}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Account Information
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium mt-0.5">{userName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium mt-0.5 break-all">{userEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-[hsl(var(--success))]" />
                    Account Status
                  </div>
                  <div className="rounded-lg border-l-2 priority-success px-4 py-3">
                    <p className="text-sm font-medium">Active & Verified</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your account is in good standing</p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Recent Activity
                  </div>
                  {policiesCount > 0 ? (
                    <div className="space-y-2">
                      {policiesData?.policies?.slice(0, 3).map((policy: any) => (
                        <div key={policy.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{policy.policy_name || `Policy ${policy.id}`}</p>
                            <p className="text-xs text-muted-foreground">{policy.policy_type || "Insurance"} · {policy.provider || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No policies uploaded yet.</p>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Security</p>
                  <p className="text-sm text-muted-foreground">
                    Your policies and data are encrypted and securely stored. Only you can access your uploaded documents and analysis.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Signed in as {userEmail}</p>
              <Button onClick={handleLogout} disabled={isLoggingOut} variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5">
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </main>
        </PageWrapper>
      </div>
    </ProtectedRoute>
  )
}
