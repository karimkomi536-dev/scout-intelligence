import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user:               User | null
  loading:            boolean
  authError:          string | null
  needsOnboarding:    boolean
  completeOnboarding: () => void
  signIn:             (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut:            () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .single()
  // !data means no profile yet → needs onboarding
  // data.onboarding_completed === false → needs onboarding
  return !(data?.onboarding_completed)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                       = useState<User | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [authError, setAuthError]             = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return

      if (error) {
        const is429 = error.status === 429 || error.message?.includes('rate limit')
        if (is429) {
          console.warn('Auth rate-limited (429) — keeping existing session')
          setUser(session?.user ?? null)
        } else {
          console.warn('getSession error:', error.message)
          setAuthError(error.message)
        }
        setLoading(false)
        return
      }

      const userId = session?.user?.id
      if (userId) {
        const needs = await fetchOnboardingStatus(userId)
        if (mounted) setNeedsOnboarding(needs)
      }

      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_IN') {
          setAuthError(null)
          setUser(session?.user ?? null)
          // Check onboarding status for the newly signed-in user
          if (session?.user?.id) {
            fetchOnboardingStatus(session.user.id).then(needs => {
              if (mounted) setNeedsOnboarding(needs)
            })
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          setAuthError(null)
          setUser(session?.user ?? null)
        }

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setNeedsOnboarding(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const completeOnboarding = () => setNeedsOnboarding(false)

  return (
    <AuthContext.Provider value={{
      user, loading, authError,
      needsOnboarding, completeOnboarding,
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
