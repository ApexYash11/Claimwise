import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

// Enhanced user sync for existing database schema
const syncUserToDatabase = async (user: User, providedName?: string) => {
  try {
    console.log('🔄 Starting user sync to database for:', user.email)
    
    // Check if user already exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      console.log('✅ User already exists in database:', user.email)
      return
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('⚠️ Error checking existing user:', fetchError.message)
    }

    // Determine the best name to use
    const userName = providedName || 
                    user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.user_metadata?.display_name ||
                    user.email?.split('@')[0] || 
                    'Unknown User'

    console.log('👤 Creating user profile with name:', userName)

    // User doesn't exist, create them
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: userName
      })
      .select()

    if (error) {
      console.warn('⚠️ Failed to sync user to database:', error.message)
      // Don't throw error - auth should still succeed
    } else {
      console.log('✅ User synced to database successfully:', user.email)
    }
  } catch (err) {
    console.warn('⚠️ Error during user sync (non-critical):', err)
    // Don't throw - this shouldn't block authentication
  }
}

export const signInWithProvider = async (provider: 'google' | 'github') => {
  try {
    const redirectUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`
    console.log(`[Auth] Initiating ${provider} OAuth with redirect:`, redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          source: "social_auth"
        }
      },
    })

    if (error) {
      console.error(`[Auth] ${provider} OAuth error:`, error)
    } else {
      console.log(`[Auth] ${provider} OAuth initiated, redirecting...`)
    }
    
    return { data, error }
  } catch (err) {
    console.error(`[Auth] Social login exception:`, err)
    return { 
      data: null, 
      error: { 
        message: 'Social login failed. Please try again or use email signup.',
        name: 'SocialLoginError',
        status: 500
      } as any
    }
  }
}

export interface AuthUser extends User {
  email: string
}

export const signUp = async (email: string, password: string, fullName: string) => {
  console.log('🚀 Starting 3-strategy signup process for:', email)
  
  // Strategy 1: Normal Supabase signup with full metadata
  try {
    console.log('📧 Strategy 1: Attempting normal Supabase signup with metadata...')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          name: fullName,
          display_name: fullName
        },
      },
    })

    console.log('Strategy 1 result:', { 
      user: data?.user ? 'User created' : 'No user', 
      session: data?.session ? 'Session created' : 'No session',
      error: error ? error.message : 'No error'
    })

    // If successful with Strategy 1, proceed with user sync
    if (!error && data?.user) {
      console.log('✅ Strategy 1 successful - proceeding with user sync')
      await syncUserToDatabase(data.user)
      return { data, error }
    }

    // Check if it's the specific database error we're trying to handle
    if (error && (
      error.message.includes('Database error saving new user') ||
      error.message.includes('trigger') ||
      error.message.includes('function')
    )) {
      console.log('⚠️ Database error detected, trying Strategy 2...')
      
      // Strategy 2: Minimal signup without metadata
      console.log('📧 Strategy 2: Attempting minimal signup (no metadata)...')
      const { data: data2, error: error2 } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      console.log('Strategy 2 result:', { 
        user: data2?.user ? 'User created' : 'No user', 
        session: data2?.session ? 'Session created' : 'No session',
        error: error2 ? error2.message : 'No error'
      })

      if (!error2 && data2?.user) {
        console.log('✅ Strategy 2 successful - proceeding with manual user sync')
        // Manually sync user with the name from form input
        await syncUserToDatabase(data2.user, fullName)
        return { data: data2, error: error2 }
      }

      console.log('❌ Strategy 2 also failed, proceeding to Strategy 3')

      // Strategy 3: Return helpful error message with alternatives
      console.log('💡 Strategy 3: Providing user-friendly alternatives')
      return {
        data: null,
        error: {
          message: 'Email signup is temporarily unavailable due to server configuration. Please use Google or GitHub signup instead.',
          name: 'ConfigurationError',
          status: 503
        } as any
      }
    }

    // For other types of errors, return them directly
    console.log('❌ Strategy 1 failed with non-database error:', error?.message)
    return { data, error }

  } catch (err) {
    console.error('💥 All signup strategies failed with exception:', err)
    return {
      data: null,
      error: {
        message: 'Account creation failed due to a system error. Please try using Google or GitHub signup, or contact support.',
        name: 'SignupError',
        status: 500
      } as any
    }
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
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.warn("supabase.auth.signOut error:", error)
      // Attempt a best-effort client-side cleanup and reload so the auth state
      // is re-evaluated by the `AuthProvider` subscription.
      try {
        // Force a session check; if session still present, reload the page
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          window.location.reload()
        }
      } catch (e) {
        // If anything goes wrong, still reload as a fallback
        try { window.location.reload() } catch (_) {}
      }

      return { error }
    }

    // No error from signOut — give the auth subscription a moment to update.
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        // If a session remains for some reason, force reload to clear cached state
        window.location.reload()
      }
    } catch (_) {
      // Ignore and continue
    }

    return { error: null }
  } catch (err) {
    console.error("Unexpected error during signOut:", err)
    try { window.location.reload() } catch (_) {}
    return { error: err }
  }
}

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}
