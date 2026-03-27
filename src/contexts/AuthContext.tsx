import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      if (error) {
        // 429 = rate limit on token refresh — keep the current session if any,
        // don't surface as a hard error
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
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        if (event === 'INITIAL_SESSION') return
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setAuthError(null)
          setUser(session?.user ?? null)
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
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

  return (
    <AuthContext.Provider value={{ user, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
