import { useState, useEffect } from 'react'

export interface AlertPrefs {
  transfer:          boolean
  contract_expiring: boolean
}

const LS_KEY   = 'vizion_alert_prefs'
const DEFAULTS: AlertPrefs = { transfer: true, contract_expiring: true }
// Custom event name used to sync state across hook instances in the same window
const PREFS_EVENT = 'vizion_alert_prefs_changed'

function readFromStorage(): AlertPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useAlertPrefs() {
  const [prefs, setPrefs] = useState<AlertPrefs>(readFromStorage)

  // Listen for changes emitted by OTHER instances of this hook in the same tab
  useEffect(() => {
    function onPrefsChanged() {
      setPrefs(readFromStorage())
    }
    window.addEventListener(PREFS_EVENT, onPrefsChanged)
    // Also handle cross-tab changes via the storage event
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setPrefs(readFromStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PREFS_EVENT, onPrefsChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function toggle(key: keyof AlertPrefs) {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      // Notify other hook instances in the same window
      window.dispatchEvent(new CustomEvent(PREFS_EVENT))
      return next
    })
  }

  return { prefs, toggle }
}
