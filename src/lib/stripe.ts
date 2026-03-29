import { loadStripe } from '@stripe/stripe-js'

const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string

if (!key) {
  console.warn('[stripe] VITE_STRIPE_PUBLIC_KEY is not set')
}

// Singleton — loadStripe deduplicates by key
export const stripePromise = loadStripe(key ?? '')

/** Redirect the current browser tab to a Stripe Checkout session. */
export async function redirectToCheckout(priceId: string, orgId: string): Promise<void> {
  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, orgId }),
  })

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error ?? `HTTP ${res.status}`)
  }

  const { url } = await res.json()
  window.location.href = url
}

/** Redirect to the Stripe Customer Portal. */
export async function redirectToPortal(orgId: string): Promise<void> {
  const res = await fetch('/api/stripe-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId }),
  })

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error ?? `HTTP ${res.status}`)
  }

  const { url } = await res.json()
  window.location.href = url
}
