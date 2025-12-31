"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth initialization if we're in a build environment
    if (typeof window === "undefined") {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log("[AuthProvider] Initial session:", session ? `User: ${session.user.email}` : "No session")
        setUser(session?.user ?? null)
      } catch (error) {
        console.warn("[AuthProvider] Failed to get session:", error)
        setUser(null)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes (OAuth redirects, email signups, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] Auth state change:", event, "User:", session?.user?.email ?? "None")
      setUser(session?.user ?? null)
      setLoading(false)

      // Auto-sync user to database after OAuth or email signup
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        try {
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", session.user.id)
            .single()
          
          if (!existingUser) {
            const userName =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Unknown User"
            
            console.log("[AuthProvider] Creating user profile:", session.user.email)
            await supabase
              .from("users")
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: userName,
              })
          }
        } catch (err) {
          console.warn("[AuthProvider] User sync failed (non-critical):", err)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
