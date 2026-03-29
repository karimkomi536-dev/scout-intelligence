export const config = { runtime: 'edge' }

import { corsHeaders, preflightResponse, checkRateLimit, getClientIp, rateLimitedResponse } from './cors.js'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method === 'OPTIONS') return preflightResponse(origin)

  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)
  if (!allowed) return rateLimitedResponse(resetAt, origin)

  try {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const { email, firstName } = await request.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const name = firstName || email.split('@')[0]
    const appUrl = origin ?? 'https://scout-intelligence-ten.vercel.app'

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Bienvenue sur VIZION</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

    <div style="padding:32px 40px;border-bottom:1px solid #1f2937;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#00C896;letter-spacing:-0.02em;">⚡ VIZION</span>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0;letter-spacing:0.08em;text-transform:uppercase;">Football Scouting Intelligence</p>
    </div>

    <div style="padding:32px 40px;">
      <h2 style="font-size:22px;font-weight:800;color:white;margin:0 0 12px;letter-spacing:-0.02em;">
        Bienvenue, ${name} ! 🎉
      </h2>
      <p style="font-size:14px;color:#9ca3af;line-height:1.7;margin:0 0 24px;">
        Votre compte VIZION est prêt. Vous pouvez maintenant explorer les joueurs, gérer vos shortlists et générer des rapports de scouting professionnels.
      </p>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px;">
        ${[
          ['🔍', 'Base de joueurs', 'Explorez et filtrez les joueurs par position, stats, et score.'],
          ['❤️', 'Shortlists', 'Organisez vos prospects par groupes et partagez avec votre staff.'],
          ['🤖', 'Rapport IA', 'Générez des rapports de scouting en quelques secondes (Pro).'],
        ].map(([icon, title, desc]) => `
        <div style="background:#1f2937;border-radius:10px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:18px;flex-shrink:0;">${icon}</span>
          <div>
            <p style="font-size:13px;font-weight:700;color:white;margin:0 0 3px;">${title}</p>
            <p style="font-size:12px;color:#6b7280;margin:0;">${desc}</p>
          </div>
        </div>`).join('')}
      </div>

      <a href="${appUrl}/dashboard"
         style="display:block;text-align:center;padding:13px 32px;background:linear-gradient(135deg,#00C896,#4D7FFF);color:white;
                text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;
                box-shadow:0 0 24px rgba(0,200,150,0.25);">
        Ouvrir VIZION →
      </a>
    </div>

    <div style="padding:20px 40px;border-top:1px solid #1f2937;text-align:center;">
      <p style="font-size:11px;color:#4b5563;margin:0;line-height:1.6;">
        Vous recevez cet email car vous venez de créer un compte sur VIZION.<br>
        <a href="${appUrl}" style="color:#6b7280;">vizion.app</a>
      </p>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'VIZION <bonjour@vizion.app>',
        to:      email,
        subject: `Bienvenue sur VIZION, ${name} ! ⚡`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return new Response(JSON.stringify({ error: 'Resend error', details: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining), ...corsHeaders(origin) },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }
}
