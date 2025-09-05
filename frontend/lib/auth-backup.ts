import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

// Completely bypass any user sync
const syncUserToDatabase = async (user: User) => {
  console.log('User authenticated successfully:', user.email)
  return
}

export const signInWithProvider = async (provider: 'google' | 'github') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          source: "social_auth"
        }
      },
    })

    return { data, error }
  } catch (err) {
    console.error('Social login error:', err)
    return { 
      data: null, 
      error: { 
        message: 'Social login failed. Please try again.',
        name: 'SocialLoginError',
        status: 500
      } as any
    }
  }
}

export interface AuthUser extends User {
  email: string
}

// Alternative signup using fetch directly
export const signUpDirect = async (email: string, password: string, fullName: string) => {
  try {
    console.log('Attempting direct signup for:', email)
    
    const response = await fetch(`https://pmsooebddaeddjyabghw.supabase.co/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc29vZWJkZGFlZGRqeWFiZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI4MjQsImV4cCI6MjA3MDQ2ODgyNH0.2BlwCRTvCsseKn75RaarZ9p1NM2AWVSpsZiPxsE2LDI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc29vZWJkZGFlZGRqeWFiZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI4MjQsImV4cCI6MjA3MDQ2ODgyNH0.2BlwCRTvCsseKn75RaarZ9p1NM2AWVSpsZiPxsE2LDI',
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Direct signup failed:', data)
      return {
        data: null,
        error: {
          message: data.msg || data.error_description || 'Direct signup failed',
          status: response.status
        }
      }
    }

    console.log('Direct signup successful:', data)
    return {
      data: {
        user: data.user,
        session: data.session
      },
      error: null
    }
  } catch (err) {
    console.error('Direct signup error:', err)
    return {
      data: null,
      error: {
        message: 'Network error during direct signup',
        status: 500
      }
    }
  }
}

export const signUp = async (email: string, password: string, fullName: string) => {
  console.log('Starting signup process for:', email)
  
  // First try the normal Supabase client method
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    })

    console.log('Supabase signup response:', { 
      user: data?.user ? 'User created' : 'No user', 
      session: data?.session ? 'Session created' : 'No session',
      error: error ? error.message : 'No error'
    })

    // If successful, return it
    if (!error && data?.user) {
      await syncUserToDatabase(data.user)
      return { data, error }
    }

    // If it failed with database error, try direct method
    if (error && error.message.includes('Database error')) {
      console.log('Trying direct signup method as fallback...')
      return await signUpDirect(email, password, fullName)
    }

    return { data, error }
  } catch (err) {
    console.error('Signup error, trying direct method:', err)
    return await signUpDirect(email, password, fullName)
  }
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
