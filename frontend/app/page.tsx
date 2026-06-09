"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  FileText,
  ArrowRight,
  ShieldCheck,
  Search,
  BarChart3,
  MessageSquareText,
  Building2,
  Users,
  UserCircle,
  ScrollText,
  AlertTriangle,
  Scale,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

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
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden border-b pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="absolute inset-0 premium-grid opacity-40" />
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[hsl(var(--success)/0.12)] blur-3xl" />
        <div className="absolute -bottom-20 right-16 h-72 w-72 rounded-full bg-[hsl(var(--foreground)/0.03)] blur-3xl" />

        <div className="page-container relative z-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground reveal-on-load">
                <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                AI-powered insurance intelligence
              </div>

              <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl reveal-on-load">
                From Policy
                <br />
                PDF To
                <br />
                <span className="text-[hsl(var(--success))]">Clear Coverage</span>
                <br />
                Decisions.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg reveal-on-load">
                ClaimWise extracts, analyzes, and explains insurance policies so brokers, risk managers, and policyholders
                can make confident coverage decisions — without reading every clause.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 reveal-on-load">
                <Button asChild size="lg" className="h-12 px-7 text-base font-medium">
                  <Link href="/signup">
                    Upload Your Policy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base font-medium">
                  <Link href="#how-it-works">
                    See How It Works
                  </Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground reveal-on-load">
                {[
                  { icon: Building2, label: "Insurance Brokers" },
                  { icon: Users, label: "HR & Benefits Teams" },
                  { icon: UserCircle, label: "Policyholders" },
                  { icon: Scale, label: "Risk Managers" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-on-load">
              <div className="rounded-xl border bg-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Comprehensive Health Plus</p>
                      <p className="text-xs text-muted-foreground">Uploaded 2 min ago • 24 pages</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
                    Analyzed
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Coverage Score", value: "82/100", color: "text-[hsl(var(--success))]" },
                    { label: "Exclusions Found", value: "4", color: "text-[hsl(var(--warning))]" },
                    { label: "Optimization", value: "$840/yr", color: "text-[hsl(var(--info))]" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`mt-0.5 font-serif text-2xl leading-none tracking-tight ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  {[
                    { icon: AlertTriangle, label: "Critical", desc: "Room rent capping may reduce emergency claim payout", priority: "critical" },
                    { icon: AlertTriangle, label: "Warning", desc: "Maternity cover activates after 3-year waiting period", priority: "warning" },
                    { icon: Lightbulb, label: "Recommendation", desc: "Switch to Network D to save 18% with identical OPD cover", priority: "info" },
                  ].map((item) => (
                    <div key={item.label} className={`flex gap-3 rounded-lg border-l-2 p-3.5 priority-${item.priority}`}>
                      <item.icon className={`mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--${item.priority}))]`} />
                      <div>
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b py-20 lg:py-28">
        <div className="page-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Workflow</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
              From PDF to decision-ready intelligence
            </h2>
            <p className="mt-4 text-muted-foreground">
              Six minutes. That is the average time from upload to a complete coverage brief.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload & Extract",
                items: ["Drag-and-drop any policy PDF", "OCR + structure extraction", "Clause-level normalization"],
              },
              {
                step: "02",
                icon: Search,
                title: "Analyze & Surface Risks",
                items: ["AI identifies exclusions & limits", "Severity scoring per clause", "Coverage gap detection"],
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Compare & Decide",
                items: ["Side-by-side policy comparison", "Optimization recommendations", "Export-ready coverage briefs"],
              },
            ].map((phase) => (
              <motion.div
                key={phase.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="rounded-xl border bg-card p-6 lg:p-8"
              >
                <motion.div variants={fadeUp} custom={0}>
                  <p className="text-xs font-medium text-muted-foreground">{phase.step}</p>
                </motion.div>
                <motion.div variants={fadeUp} custom={1}>
                  <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                    <phase.icon className="h-5 w-5" />
                  </div>
                </motion.div>
                <motion.h3 variants={fadeUp} custom={2} className="mt-4 text-lg font-semibold tracking-tight">
                  {phase.title}
                </motion.h3>
                <motion.ul variants={fadeUp} custom={3} className="mt-4 space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
                      {item}
                    </li>
                  ))}
                </motion.ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b py-20 lg:py-28 bg-muted/30">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Trust Infrastructure</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
                Built for regulated environments
              </h2>
              <p className="mt-4 text-muted-foreground">
                Insurance intelligence demands accuracy, privacy, and auditability. Every claim insight is sourced,
                scored, and traceable to the original clause.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, title: "SOC 2 Type II", desc: "Enterprise-grade data protection and access controls" },
                  { icon: ScrollText, title: "Audit Trails", desc: "Every insight links back to its source clause and page" },
                  { icon: BarChart3, title: "Confidence Scoring", desc: "Each recommendation includes a confidence rating and evidence chain" },
                  { icon: MessageSquareText, title: "Expert Review", desc: "Export briefs for broker or legal review before decisions" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 lg:p-8 space-y-6">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Real Output</p>

              <div className="space-y-4">
                {[
                  { icon: ScrollText, title: "Source Clause", body: "\"Coverage for hospitalization shall be limited to 1% of sum insured per day for room rent.\"", ref: "Section 4.2, Page 12" },
                  { icon: AlertTriangle, title: "AI Finding", body: "Room rent capping at $200/day may leave 40% of costs uncovered in metro hospitals.", severity: "critical", score: "High confidence (94%)" },
                  { icon: Lightbulb, title: "Recommendation", body: "Upgrade to the Premier plan to remove room rent sub-limits. Estimated premium increase: $180/yr.", score: "Based on 3 comparable plans" },
                ].map((item) => (
                  <div key={item.title} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <item.icon className={`h-4 w-4 ${item.severity === "critical" ? "text-[hsl(var(--critical))]" : "text-[hsl(var(--info))]"}`} />
                      {item.title}
                      {item.ref && <span className="text-xs text-muted-foreground font-normal ml-auto">{item.ref}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                    {item.score && <p className="text-xs text-muted-foreground">{item.score}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="page-container text-center max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Get Started</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            Turn your first policy PDF into a decision-ready brief
          </h2>
          <p className="mt-4 text-muted-foreground">
            No onboarding calls, no sales process. Upload a policy and see the analysis immediately.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base font-medium">
              <Link href="/signup">
                Upload Your First Policy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base font-medium">
              <Link href="/signup">
                Book Demo
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {["No credit card", "Free tier available", "GDPR compliant", "Delete your data anytime"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
