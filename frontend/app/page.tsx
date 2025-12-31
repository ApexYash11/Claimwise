"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Shield, FileText, BarChart3, CheckCircle, ArrowRight, Loader2 } from "lucide-react"

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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-8 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300">
              <Shield className="w-3 h-3 mr-2" />
              Enterprise-Grade Policy Analysis
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif font-bold text-slate-900 dark:text-slate-50 mb-6 tracking-tight leading-tight">
              Insurance Clarity, <br />
              <span className="text-teal-700 dark:text-teal-400">Simplified.</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform complex policy documents into clear, actionable insights. 
              Identify coverage gaps and hidden clauses in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-slate-900 text-white hover:bg-slate-800 text-base px-8 h-12 rounded-md shadow-sm transition-all dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                <Link href="/signup">
                  Start Free Analysis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Link href="#demo">View Demo</Link>
              </Button>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>Bank-grade security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-slate-900 dark:text-slate-50 mb-4">
              Professional Analysis Tools
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Built for clarity and precision. Our platform handles the complexity so you can focus on the decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-3">Document Extraction</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Upload any PDF or image. We extract every clause, limit, and exclusion with high-fidelity OCR.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-3">Smart Comparison</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Compare policies side-by-side. Visualize coverage differences and premium value instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-3">Risk Assessment</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Identify hidden risks and exclusions. Get unbiased recommendations based on your needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="demo" className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-serif font-bold text-slate-900 dark:text-slate-50 mb-6">
                The Clarity Engine
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Secure Upload</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Drag and drop your policy PDF. Your data is encrypted at rest and in transit.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">AI Processing</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Our engine reads the fine print, cross-referencing medical codes and legal terms.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Instant Insights</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Receive a clear, summarized report highlighting what matters most.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-teal-100 dark:bg-teal-900/20 rounded-2xl transform rotate-3"></div>
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg">
                <div className="space-y-4">
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  <div className="h-32 w-full bg-slate-50 dark:bg-slate-800/50 rounded border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs text-slate-400">Processing Policy...</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-teal-50 dark:bg-teal-900/30 rounded border border-teal-100 dark:border-teal-800"></div>
                    <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-6">
            Ready to understand your coverage?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands of users who trust ClaimWise for their insurance analysis.
          </p>
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white text-base px-10 h-14 rounded-md">
            <Link href="/signup">
              Get Started for Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
