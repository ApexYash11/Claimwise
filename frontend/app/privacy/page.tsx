import Link from "next/link"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 mb-8">
          <Shield className="w-5 h-5" />
          <span className="font-serif font-bold text-lg text-slate-900 dark:text-slate-50">ClaimWise</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8">Privacy Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
          <p>Last updated: June 2025</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">1. Information We Collect</h2>
          <p>ClaimWise collects information you provide when creating an account, uploading insurance policies, and using our analysis features. This includes your name, email address, and insurance policy documents.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">2. How We Use Your Information</h2>
          <p>We use your information to provide, maintain, and improve our insurance policy analysis service. Your policy documents are processed solely for analysis and are not shared with third parties.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">3. Data Security</h2>
          <p>We implement industry-standard encryption and security measures to protect your data. All document processing occurs in secure environments with access controls.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">4. Data Retention</h2>
          <p>Your account data and policy documents are retained for as long as your account is active. You may request deletion of your data at any time.</p>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-8">5. Contact</h2>
          <p>For privacy-related inquiries, contact us at support@claimwise.com.</p>
        </div>
      </div>
    </div>
  )
}
