export const config = { runtime: 'edge' }

import Stripe from 'stripe'
import { corsHeaders } from './cors.js'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const secretKey     = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // Verify webhook signature
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
  } catch (err) {
    return new Response(JSON.stringify({ error: `Webhook signature invalid: ${(err as Error).message}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Handle relevant events ──────────────────────────────────────────────────

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    apikey:         serviceKey,
    Authorization:  `Bearer ${serviceKey}`,
    Prefer:         'return=minimal',
  }

  async function updateOrg(orgId: string, patch: Record<string, unknown>) {
    await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}`, {
      method:  'PATCH',
      headers: supabaseHeaders,
      body:    JSON.stringify(patch),
    })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.org_id
      if (!orgId) break

      const subscriptionId = session.subscription as string | null
      const customerId     = session.customer     as string | null

      await updateOrg(orgId, {
        plan:                'pro',
        stripe_customer_id:  customerId,
        stripe_subscription_id: subscriptionId,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const orgRes = await fetch(
        `${supabaseUrl}/rest/v1/organizations?stripe_customer_id=eq.${sub.customer}&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      const [org] = await orgRes.json()
      if (!org?.id) break

      const plan = sub.status === 'active' ? 'pro' : 'free'
      await updateOrg(org.id, { plan })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgRes = await fetch(
        `${supabaseUrl}/rest/v1/organizations?stripe_customer_id=eq.${sub.customer}&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      const [org] = await orgRes.json()
      if (!org?.id) break

      await updateOrg(org.id, { plan: 'free', stripe_subscription_id: null })
      break
    }

    default:
      // Unhandled event — return 200 to acknowledge receipt
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
