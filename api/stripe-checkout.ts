export const config = { runtime: 'edge' }

import Stripe from 'stripe'
import { corsHeaders, preflightResponse } from './cors.js'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  let priceId: string, orgId: string
  try {
    const body = await request.json()
    priceId = body.priceId
    orgId   = body.orgId
    if (!priceId || !orgId) throw new Error('priceId and orgId are required')
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // Look up existing Stripe customer for this org (if any)
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  let customerId: string | undefined

  if (supabaseUrl && serviceKey) {
    const orgRes = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}&select=stripe_customer_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    if (orgRes.ok) {
      const [org] = await orgRes.json()
      customerId = org?.stripe_customer_id ?? undefined
    }
  }

  const returnUrl = origin ?? 'https://scout-intelligence-ten.vercel.app'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(customerId ? { customer: customerId } : {}),
    metadata: { org_id: orgId },
    success_url: `${returnUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${returnUrl}/settings/billing?canceled=1`,
  })

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}
