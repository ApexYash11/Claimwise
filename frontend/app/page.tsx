"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import {
  Shield,
  FileText,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Activity,
  Sparkles,
  ScanSearch,
} from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 premium-grid opacity-60 dark:opacity-40" />
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-600/20 glow-pulse" />
        <div className="absolute -bottom-16 right-12 h-64 w-64 rounded-full bg-slate-300/30 blur-3xl dark:bg-slate-700/30 float-soft float-soft-delay" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-24">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-14 items-center">
            <div className="reveal-on-load reveal-delay-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/70 bg-teal-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800 dark:border-teal-700/70 dark:bg-teal-900/20 dark:text-teal-200 reveal-on-load reveal-delay-150">
                <ShieldCheck className="h-3.5 w-3.5" />
                Policy Intelligence For High-Stakes Decisions
              </div>

              <h1 className="mt-7 text-5xl font-serif font-black leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl reveal-on-load reveal-delay-200">
                Stop Guessing.
                <br />
                <span className="text-teal-700 dark:text-teal-300">Know What Your Policy Really Covers.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-700 dark:text-slate-300 lg:text-xl reveal-on-load reveal-delay-250">
                ClaimWise converts dense insurance language into a boardroom-ready risk brief. Surface exclusions,
                compare options, and walk into every claim conversation with evidence instead of uncertainty.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center reveal-on-load reveal-delay-300">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-md bg-slate-950 px-8 text-base font-semibold text-white shadow-[0_12px_30px_-16px_rgba(2,6,23,0.8)] transition-transform hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                >
                  <Link href="/signup">
                    Book Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-md border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Link href="#demo">See Analysis Flow</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-600 dark:text-slate-400 reveal-on-load reveal-delay-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Audit-ready policy summaries</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Zero setup for first review</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Enterprise-grade data controls</span>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 reveal-on-load reveal-delay-500">
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Coverage Clarity
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">98%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Risk Flags
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">6x Faster</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Decision Time
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Minutes</p>
                </div>
              </div>
            </div>

            <Card className="reveal-on-load reveal-delay-300 float-soft border-slate-200/80 bg-white/85 shadow-xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
              <CardContent className="p-7 lg:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Executive Snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-serif font-bold text-slate-900 dark:text-slate-50">
                      Policy Risk Brief
                    </h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                    Live
                  </span>
                </div>

                <div className="mt-7 space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Critical Exclusions
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      4 clauses may reduce payout eligibility under emergency hospitalization.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Optimization Opportunity
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Comparable plans indicate potential 18% premium optimization with stronger OPD coverage.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <ScanSearch className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Recommendation
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Run a focused comparison before renewal to close outpatient and maternity waiting-period gaps.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-load">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
              Built For Precision
            </p>
            <h2 className="mt-3 text-3xl lg:text-5xl font-serif font-black text-slate-900 dark:text-slate-50">
              A Faster Route From Policy PDF To Clear Action
            </h2>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400">
              Every module is designed to reduce review time while increasing confidence in coverage decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="group reveal-on-load reveal-delay-150 border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:shadow-black/30">
              <CardContent className="p-7">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Clause-Level Extraction</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  Convert unstructured policies into searchable, decision-ready intelligence with high-fidelity parsing.
                </p>
              </CardContent>
            </Card>

            <Card className="group reveal-on-load reveal-delay-250 border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:shadow-black/30">
              <CardContent className="p-7">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Comparative Risk Scoring</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  Benchmark plans side by side to expose hidden gaps, waiting-period traps, and premium inefficiencies.
                </p>
              </CardContent>
            </Card>

            <Card className="group reveal-on-load reveal-delay-400 border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:shadow-black/30">
              <CardContent className="p-7">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Claim Readiness Intelligence</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  Understand payout vulnerability before a claim event, with explicit recommendations to harden coverage.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="demo" className="py-24 bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="reveal-on-load reveal-delay-100">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Demo Flow</p>
              <h2 className="mt-3 text-3xl lg:text-5xl font-serif font-black text-slate-900 dark:text-slate-50">
                Three Steps To A Defensible Coverage Decision
              </h2>

              <div className="mt-8 space-y-7">
                <div className="flex gap-4 reveal-on-load reveal-delay-150">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm dark:bg-teal-500 dark:text-slate-950">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Upload And Normalize</h3>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Drag in your policy. ClaimWise extracts and structures key terms, limits, and riders automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 reveal-on-load reveal-delay-250">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm dark:bg-teal-500 dark:text-slate-950">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Surface Risk Signals</h3>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      The engine highlights exclusions, waiting periods, and weak spots that can impact claim outcomes.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 reveal-on-load reveal-delay-400">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm dark:bg-teal-500 dark:text-slate-950">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Act With Confidence</h3>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Review recommendations, compare alternatives, and finalize decisions with transparent evidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal-on-load reveal-delay-250">
              <Card className="float-soft border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
                <CardContent className="p-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Sample Insight Sheet</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Preview</span>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30 reveal-on-load reveal-delay-150">
                      <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">High Impact Exclusion</p>
                      <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-300/90">
                        Room rent capping may reduce reimbursement above threshold hospitals.
                      </p>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 reveal-on-load reveal-delay-250">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Medium Risk Alert</p>
                      <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-300/90">
                        Maternity cover activates after 3 years, creating a near-term gap.
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 reveal-on-load reveal-delay-400">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Optimization Signal</p>
                      <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/90">
                        Switch option can improve OPD coverage while reducing annual premium.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 dark:bg-slate-950 border-t border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),transparent_55%)]" />
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10 reveal-on-load reveal-delay-150">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
            Ready For A Better Coverage Conversation?
          </p>
          <h2 className="mt-4 text-3xl lg:text-5xl font-serif font-black text-white">
            Book A Demo And Turn Every Policy Review Into A Strategic Advantage
          </h2>
          <p className="mt-6 text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto">
            See how ClaimWise flags claim risk and uncovers optimization opportunities before they become expensive surprises.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-md bg-teal-500 px-9 text-base font-semibold text-slate-950 hover:bg-teal-400"
            >
              <Link href="/signup">
                Book Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-slate-500 bg-transparent px-7 text-base text-slate-200 hover:bg-slate-800"
            >
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
