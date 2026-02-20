"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  userRole: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userRole: null,
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const resolveUserRole = async (user: User): Promise<{ role: string | null; isAdmin: boolean }> => {
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("role, is_admin")
        .eq("id", user.id)
        .single()

      const dbRole = String(userRow?.role || "").toLowerCase() || null
      const dbAdmin = Boolean(userRow?.is_admin)
      return { role: dbRole, isAdmin: dbAdmin || dbRole === "admin" }
    } catch {
      return { role: null, isAdmin: false }
    }
  }

  useEffect(() => {
    // Skip auth initialization if we're in a build environment
    if (typeof window === "undefined") {
      setLoading(false)
      return
    }

    let isMounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        
        if (isMounted) {
          console.log("[AuthProvider] Initial session:", session ? `User: ${session.user.email}` : "No session")
          setUser(session?.user ?? null)
          if (session?.user) {
            const roleInfo = await resolveUserRole(session.user)
            if (isMounted) {
              setUserRole(roleInfo.role)
              setIsAdmin(roleInfo.isAdmin)
            }
          } else {
            setUserRole(null)
            setIsAdmin(false)
          }
        }
      } catch (error) {
        // Ignore AbortError during cleanup
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug("[AuthProvider] Session request aborted (cleanup)")
          return
        }
        if (isMounted) {
          console.warn("[AuthProvider] Failed to get session:", error)
          setUser(null)
          setUserRole(null)
          setIsAdmin(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes (OAuth redirects, email signups, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      console.log("[AuthProvider] Auth state change:", event, "User:", session?.user?.email ?? "None")
      setUser(session?.user ?? null)
      setLoading(true)

      if (session?.user) {
        const roleInfo = await resolveUserRole(session.user)
        if (isMounted) {
          setUserRole(roleInfo.role)
          setIsAdmin(roleInfo.isAdmin)
          setLoading(false)
        }
      } else {
        setUserRole(null)
        setIsAdmin(false)
        setLoading(false)
      }

      // Auto-sync user to database after OAuth or email signup
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        try {
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", session.user.id)
            .single()
          
          if (!existingUser && isMounted) {
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
          if (isMounted) {
            console.warn("[AuthProvider] User sync failed (non-critical):", err)
          }
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading, isAdmin, userRole }}>{children}</AuthContext.Provider>
}
