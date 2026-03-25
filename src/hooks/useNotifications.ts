import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Notification {
  id: string
  user_id: string
  type: 'score_change' | 'new_player' | 'shortlist_update'
  title: string
  message: string
  player_id: string | null
  read: boolean
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Use user?.id (stable string primitive) — not `user` (object ref)
  // Avoids TOKEN_REFRESHED loop: Supabase creates a new User object on each
  // token refresh, but user.id stays the same.
  const userId = user?.id

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Initial fetch — 10 most recent
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[])
        setLoading(false)
      })

    // Realtime — new notifications pushed by the Python script
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev =>
            [payload.new as Notification, ...prev].slice(0, 10)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead }
}
