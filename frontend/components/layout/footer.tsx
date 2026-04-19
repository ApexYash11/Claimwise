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
              ClaimWise turns policy jargon into clear risk intelligence, so teams can make faster, better coverage decisions.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#demo" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Demo Flow
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Book Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-4">Access</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Create account
                </Link>
              </li>
              <li>
                <a href="mailto:support@claimwise.com" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Contact support
                </a>
              </li>
              <li>
                <a href="https://claimwise.onrender.com/docs" target="_blank" rel="noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  API docs
                </a>
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
