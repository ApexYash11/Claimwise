import Link from "next/link"
import { Shield } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 mb-8">
          <Shield className="w-5 h-5" />
          <span className="font-serif font-bold text-lg text-slate-900 dark:text-slate-50">ClaimWise</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8">Terms of Service</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
          <p>Last updated: June 2025</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">1. Acceptance of Terms</h2>
          <p>By accessing or using ClaimWise, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">2. Description of Service</h2>
          <p>ClaimWise provides AI-powered analysis of insurance policy documents. The service is provided &quot;as is&quot; and should not be used as the sole basis for insurance decisions.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">3. User Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to provide accurate information and not misuse the service.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">4. Limitations</h2>
          <p>ClaimWise analysis is for informational purposes only and does not constitute professional insurance advice. Always verify critical policy details with your insurance provider.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">5. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in prohibited activities.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">6. Contact</h2>
          <p>For questions about these terms, contact us at support@claimwise.com.</p>
        </div>
      </div>
    </div>
  )
}
