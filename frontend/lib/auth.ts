import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

const syncUserToDatabase = async (user: User) => {
  const { error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      email: user.email || '',
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  
  if (error) {
    console.error('Error syncing user to database:', error)
  }
}

export const signInWithProvider = async (provider: 'google' | 'github') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
      queryParams: {
        source: "social_auth"
      }
    },
  })

  // If we have a session, sync the user
  const session = await supabase.auth.getSession()
  if (session.data.session?.user) {
    await syncUserToDatabase(session.data.session.user)
  }
  
  return { data, error }
}

export interface AuthUser extends User {
  email: string
}

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
      data: {
        full_name: fullName,
      },
    },
  })

  // If signup was successful, sync the user to the database
  if (data.user) {
    await syncUserToDatabase(data.user)
  }

  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}
