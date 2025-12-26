import Link from "next/link"
import { Shield } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-slate-900 dark:text-slate-50">ClaimWise</span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 max-w-md">
              AI-powered insurance policy analysis that helps you understand, compare, and optimize your coverage with
              confidence.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#demo" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 mt-8 pt-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">© 2025 ClaimWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
