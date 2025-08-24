"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Shield, FileText, BarChart3, MessageSquare, CheckCircle, ArrowRight, Brain, Clock, Users, Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // If user is authenticated, redirect to dashboard
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // If user is authenticated, don't render the landing page (will redirect)
  if (user) {
    return null
  }
  return (
  <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      {/* Hero Section */}
  <section className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-gray-950 dark:via-blue-950 dark:to-gray-950 py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-repeat opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 dark:bg-blue-900/30 dark:border-blue-800/40 dark:text-blue-300">
              <Shield className="w-4 h-4 mr-2" />
              AI-Powered Insurance Analysis
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white dark:text-white mb-6 tracking-tight">
              Understand Your Insurance
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text block">
                With Complete Clarity
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
              Upload your insurance policies and receive comprehensive analysis, coverage insights, 
              and expert recommendations to make informed decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-10 py-4 rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 dark:bg-gradient-to-r dark:from-blue-700 dark:to-purple-800 dark:text-white">
                <Link href="/signup">
                  Start Free Analysis
                  <ArrowRight className="ml-3 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-10 py-4 rounded-xl border-2 border-gray-400 text-gray-300 hover:bg-white hover:text-gray-900 bg-transparent backdrop-blur-sm transition-all duration-300 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-white">
                <Link href="#demo">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
  <section id="features" className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-6 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <BarChart3 className="w-4 h-4 mr-2" />
              Powerful Features
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Advanced Insurance Analysis
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our AI-powered platform transforms complex insurance documents into clear, 
              actionable insights you can understand and act upon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-blue-50 to-indigo-50 group dark:from-gray-900 dark:to-blue-950/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Document Analysis</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Upload any insurance document and receive instant, comprehensive analysis 
                  of coverage terms, conditions, and exclusions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-green-50 to-emerald-50 group dark:from-gray-900 dark:to-emerald-950/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Policy Comparison</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Compare multiple policies side-by-side to identify coverage differences, 
                  gaps, and optimization opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-purple-50 to-violet-50 group dark:from-gray-900 dark:to-violet-950/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI Assistant</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Ask specific questions about your policies and get instant, 
                  accurate answers in plain English.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-orange-50 to-amber-50 group dark:from-gray-900 dark:to-amber-950/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Coverage Insights</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Identify coverage gaps, overlaps, and optimization opportunities 
                  to maximize your protection and value.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
  <section id="demo" className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium mb-6 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300">
              <Clock className="w-4 h-4 mr-2" />
              Simple Process
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">How ClaimWise Works</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get comprehensive insurance analysis in three streamlined steps. 
              Our advanced AI handles the complexity so you don't have to.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-20 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-orange-200 transform -translate-y-1/2"></div>
            
            <div className="text-center relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/25">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg dark:from-gray-900 dark:to-blue-950/30">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Upload Documents</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  Simply upload your insurance documents in any format. 
                  Our AI processes PDFs, images, and text files with precision.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/25">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 shadow-lg dark:from-gray-900 dark:to-violet-950/30">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI Analysis</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  Our advanced AI analyzes your policies, extracting key information 
                  and identifying important coverage details and exclusions.
                </p>
              </div>
            </div>

            <div className="text-center relative">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/25">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 shadow-lg dark:from-gray-900 dark:to-amber-950/30">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Get Insights</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  Receive detailed analysis, coverage comparisons, and personalized 
                  recommendations to optimize your insurance portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
  <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">Why we built this</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Insurance is confusing</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      We've all been there - staring at pages of dense legal text, wondering what we actually bought.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Claims get denied</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Too often because people didn't understand what their policy covered in the first place.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">You deserve clarity</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Insurance is important. You should know exactly what you're paying for.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                    {/* Removed 'No sales pitch' section as requested */}
                </div>
              </div>
            </div>

            <div className="lg:pl-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 dark:from-gray-900 dark:to-blue-950/30">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ready to understand?</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Upload your first policy and see what it actually covers. It's free to try.
                  </p>
                  <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                    <Link href="/signup">
                      Try it now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
  <section className="py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 dark:from-blue-900 dark:via-blue-950 dark:to-purple-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl lg:text-6xl font-bold text-white dark:text-white mb-6">
            Understand Your Insurance
            <span className="block text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text">
              Coverage Better
            </span>
          </h2>
          <p className="text-xl lg:text-2xl text-blue-100 dark:text-blue-200 mb-12 max-w-4xl mx-auto leading-relaxed">
            Start analyzing your insurance policies today and gain the clarity you need 
            to make informed decisions about your coverage.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-12 py-4 rounded-xl bg-white text-blue-700 hover:bg-gray-50 shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:scale-105 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800">
              <Link href="/signup">
                Start Free Analysis
                <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-12 py-4 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 bg-transparent backdrop-blur-sm transition-all duration-300 hover:border-white/50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900 dark:hover:border-gray-500"
            >
              <Link href="/login">Sign In to Your Account</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
