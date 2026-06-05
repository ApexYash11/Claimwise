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
  ShieldCheck,
  Activity,
  Sparkles,
  ScanSearch,
} from "lucide-react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

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
        <Skeleton className="h-8 w-8 rounded-full" />
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

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-md border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Link href="#demo">See Analysis Flow</Link>
                  </Button>
                </motion.div>
              </motion.div>

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

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: FileText, title: "Clause-Level Extraction", desc: "Convert unstructured policies into searchable, decision-ready intelligence with high-fidelity parsing." },
              { icon: BarChart3, title: "Comparative Risk Scoring", desc: "Benchmark plans side by side to expose hidden gaps, waiting-period traps, and premium inefficiencies." },
              { icon: Shield, title: "Claim Readiness Intelligence", desc: "Understand payout vulnerability before a claim event, with explicit recommendations to harden coverage." },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Card className="group border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:shadow-black/30">
                    <CardContent className="p-7">
                      <motion.div
                        className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                        whileHover={{ scale: 1.1, rotate: 4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <feature.icon className="h-5 w-5" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{feature.title}</h3>
                      <p className="mt-3 text-slate-600 dark:text-slate-400">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="demo" className="py-24 bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Demo Flow</p>
              </motion.div>
              <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="mt-3 text-3xl lg:text-5xl font-serif font-black text-slate-900 dark:text-slate-50">
                Three Steps To A Defensible Coverage Decision
              </motion.h2>

              <div className="mt-8 space-y-7">
                {[
                  { num: "1", title: "Upload And Normalize", desc: "Drag in your policy. ClaimWise extracts and structures key terms, limits, and riders automatically." },
                  { num: "2", title: "Surface Risk Signals", desc: "The engine highlights exclusions, waiting periods, and weak spots that can impact claim outcomes." },
                  { num: "3", title: "Act With Confidence", desc: "Review recommendations, compare alternatives, and finalize decisions with transparent evidence." },
                ].map((step, i) => (
                  <motion.div
                    key={step.num}
                    variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: i * 0.1 } } }}
                    className="flex gap-4"
                  >
                    <motion.div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-teal-500 dark:text-slate-950"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {step.num}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{step.title}</h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
                  <CardContent className="p-7 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Sample Insight Sheet</h3>
                      <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Preview</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { severity: "high", title: "High Impact Exclusion", desc: "Room rent capping may reduce reimbursement above threshold hospitals.", border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-800", dark: "dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300", descColor: "text-rose-700/90 dark:text-rose-300/90" },
                        { severity: "medium", title: "Medium Risk Alert", desc: "Maternity cover activates after 3 years, creating a near-term gap.", border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800", dark: "dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300", descColor: "text-amber-700/90 dark:text-amber-300/90" },
                        { severity: "low", title: "Optimization Signal", desc: "Switch option can improve OPD coverage while reducing annual premium.", border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", dark: "dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300", descColor: "text-emerald-700/90 dark:text-emerald-300/90" },
                      ].map((item, i) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: 16 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                          className={`rounded-lg border ${item.border} ${item.bg} p-4 ${item.dark}`}
                        >
                          <p className={`text-sm font-semibold ${item.text}`}>{item.title}</p>
                          <p className={`mt-1 text-sm ${item.descColor}`}>{item.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden border-t border-slate-800 bg-slate-900 py-24 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),transparent_55%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto max-w-5xl px-4 text-center"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300"
          >
            Ready For A Better Coverage Conversation?
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 text-3xl lg:text-5xl font-serif font-black text-white"
          >
            Book A Demo And Turn Every Policy Review Into A Strategic Advantage
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mx-auto mt-6 max-w-3xl text-lg text-slate-300 lg:text-xl"
          >
            See how ClaimWise flags claim risk and uncovers optimization opportunities before they become expensive surprises.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-10 flex flex-col sm:flex-row justify-center gap-3"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" className="h-12 rounded-md bg-teal-500 px-9 text-base font-semibold text-slate-950 hover:bg-teal-400">
                <Link href="/signup">
                  Book Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-md border-slate-500 bg-transparent px-7 text-base text-slate-200 hover:bg-slate-800">
                <Link href="#features">Explore Features</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
