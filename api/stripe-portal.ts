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

  let orgId: string
  try {
    const body = await request.json()
    orgId = body.orgId
    if (!orgId) throw new Error('orgId is required')
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  // Fetch stripe_customer_id from Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase env vars missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const orgRes = await fetch(
    `${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}&select=stripe_customer_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const [org] = await orgRes.json()
  const customerId: string | undefined = org?.stripe_customer_id

  if (!customerId) {
    return new Response(JSON.stringify({ error: 'No Stripe customer found for this org' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const returnUrl = origin ?? 'https://scout-intelligence-ten.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${returnUrl}/settings/billing`,
  })

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}
