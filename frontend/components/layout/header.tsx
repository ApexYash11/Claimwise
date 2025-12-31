"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Menu, X, LogOut, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  // Ensure hydration compatibility
  useEffect(() => {
    setMounted(true)
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center group-hover:bg-teal-700 transition-colors">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-slate-900 dark:text-slate-50">ClaimWise</span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/dashboard" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                Dashboard
              </Link>
              <Link href="/upload" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                Upload
              </Link>
              <Link href="/analyze" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                Analyze
              </Link>
              <Link href="/chat" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                Chat
              </Link>
            </nav>
          )}

          {!user && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="#features" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                Features
              </Link>
              <Link href="#demo" className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all">
                How it Works
              </Link>
            </nav>
          )}

          {/* Desktop Auth & Theme Toggle */}
          <div className="hidden md:flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-md w-9 h-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              {!mounted ? (
                // Show a neutral icon during hydration
                <div className="w-5 h-5" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
            {user ? (
              <Link href="/profile">
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs font-medium">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-md text-slate-500"
            >
              {!mounted ? (
                // Show a neutral icon during hydration
                <div className="w-5 h-5" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
            <button className="p-2 text-slate-600 dark:text-slate-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 absolute left-0 right-0 px-4 shadow-lg">
            <nav className="flex flex-col space-y-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/upload"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Upload
                  </Link>
                  <Link
                    href="/analyze"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Analyze
                  </Link>
                  <Link
                    href="/chat"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Chat
                  </Link>
                  
                </>
              ) : (
                <>
                  <Link
                    href="#features"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="#demo"
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    How it Works
                  </Link>
                </>
              )}

              <div className="flex flex-col space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {user ? (
                  <>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <div className="flex items-center space-x-3 px-2 py-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs">{userInitials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{userName}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                        </div>
                      </div>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/login">Sign in</Link>
                    </Button>
                    <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
