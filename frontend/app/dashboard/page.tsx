"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { useEffect, useState, useCallback } from "react"
import { PolicySummary } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { getPolicies } from "@/lib/api"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ChatWidget } from "@/components/chat/chat-widget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// ...existing code...
import { FileText, IndianRupee, Shield, Calendar, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"
import Link from "next/link"


export default function DashboardPage() {
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  const [policies, setPolicies] = useState<PolicySummary[]>([])
  const [loading, setLoading] = useState(true)

  // Helper: Format money in Indian lakhs/crores
  const formatINR = (amount: number) => {
    if (amount >= 1e7) {
      return `₹${(amount / 1e7).toFixed(2)} Cr`
    } else if (amount >= 1e5) {
      return `₹${(amount / 1e5).toFixed(2)} Lakh`
    } else {
      return `₹${amount.toLocaleString("en-IN")}`
    }
  }

  // Helper: Parse money string to number (if needed)
  const parseAmount = (str: string) => {
    if (!str) return 0
    const cleaned = str.replace(/[^\d.]/g, "")
    return Number(cleaned) || 0
  }

  // Fetch policies for the user
  const fetchPolicies = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Replace with real API call
      const res = await getPolicies(user.id)
      setPolicies(res || [])
    } catch (e) {
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  // Calculate stats
  const totalPolicies = policies.length
  const totalPremium = policies.reduce((sum, p) => sum + parseAmount(p.premium), 0)
  const totalCoverage = policies.reduce((sum, p) => sum + parseAmount(p.coverageAmount), 0)
  // Find next renewal (soonest expirationDate in future)
  const now = new Date()
  const nextRenewal = policies
    .map(p => p.expirationDate)
    .filter(date => date)
    .map(date => new Date(date))
    .filter(date => date > now)
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const daysToNextRenewal = nextRenewal ? Math.ceil((nextRenewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {userName}!</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">Here's an overview of your insurance portfolio and recent activity.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Policies"
              value={loading ? "--" : totalPolicies}
              description="Across health, auto, and home"
              icon={FileText}
            />
            <StatsCard
              title="Annual Premiums"
              value={loading ? "--" : formatINR(totalPremium)}
              description="Total yearly cost"
              icon={IndianRupee}
              // Optionally, you can add trend calculation here
            />
            <StatsCard
              title="Coverage Amount"
              value={loading ? "--" : formatINR(totalCoverage)}
              description="Total protection value"
              icon={Shield}
            />
            <StatsCard
              title="Next Renewal"
              value={loading ? "--" : (daysToNextRenewal !== null ? `${daysToNextRenewal} days` : "N/A")}
              description={loading ? "" : (daysToNextRenewal !== null ? `${policies.find(p => p.expirationDate && new Date(p.expirationDate).getTime() === nextRenewal?.getTime())?.policyType || "Policy"} expires` : "No upcoming renewals")}
              icon={Calendar}
            />
          </div>

          {/* Quick Actions Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <QuickActions />
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <RecentActivity />
          </div>

          {/* Insights and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Key Insights */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Key Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Potential Savings Identified</p>
                    <p className="text-sm text-green-700">You could save ₹50,000/year by adjusting deductibles</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Good Coverage Balance</p>
                    <p className="text-sm text-blue-700">Your policies provide comprehensive protection</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">Bundle Opportunity</p>
                    <p className="text-sm text-purple-700">Consider bundling auto and home for discounts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts and Reminders */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span>Alerts & Reminders</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Auto Policy Renewal</p>
                      <p className="text-sm text-orange-700">Expires in 45 days - June 15, 2024</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">Soon</Badge>
                </div>
                <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Premium Payment Due</p>
                      <p className="text-sm text-blue-700">Health insurance - Due in 2 weeks</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
                </div>
                <div className="pt-2">
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <Link href="/history">View All Notifications</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat Widget */}
        <ChatWidget />
      </div>
    </ProtectedRoute>
  )
}
