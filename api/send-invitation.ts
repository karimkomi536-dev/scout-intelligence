export const config = { runtime: 'edge' }

import {
  corsHeaders,
  preflightResponse,
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from './cors.js'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method === 'OPTIONS') {
    return preflightResponse(origin)
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)
  if (!allowed) {
    return rateLimitedResponse(resetAt, origin)
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    const body = await request.json()
    const { email, token, orgName, role } = body

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'email and token are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    const inviteOrigin = request.headers.get('origin') || 'https://vizion.app'
    const inviteUrl    = `${inviteOrigin}/invite/${token}`

    const roleLabels: Record<string, string> = {
      admin:  'Administrateur',
      scout:  'Scout',
      viewer: 'Lecteur',
    }
    const roleLabel = roleLabels[role] || role

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Invitation VIZION</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">
    <div style="padding:32px 40px;border-bottom:1px solid #1f2937;text-align:center;">
      <span style="font-size:22px;font-weight:700;color:#3b82f6;">&#9889; VIZION</span>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Football Scouting Intelligence</p>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 12px;">
        Vous avez été invité${orgName ? ` à rejoindre <strong>${orgName}</strong>` : ''}
      </h2>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 8px;">
        Vous avez été invité en tant que <strong style="color:white;">${roleLabel}</strong>.
      </p>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 28px;">
        Cette invitation expire dans 7 jours.
      </p>
      <a href="${inviteUrl}"
         style="display:inline-block;padding:12px 32px;background:#3b82f6;color:white;
                text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">
        Accepter l'invitation &rarr;
      </a>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #1f2937;text-align:center;">
      <p style="font-size:11px;color:#4b5563;margin:0;">
        Ou copiez ce lien : <span style="color:#6b7280;">${inviteUrl}</span>
      </p>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'VIZION <invitations@vizion.app>',
        to:      email,
        subject: `Invitation à rejoindre ${orgName || 'votre équipe'} sur VIZION`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return new Response(
        JSON.stringify({ error: 'Resend error', details: err }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type':          'application/json',
          'X-RateLimit-Remaining': String(remaining),
          ...corsHeaders(origin),
        },
      }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }
}
