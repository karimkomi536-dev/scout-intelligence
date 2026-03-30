export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const playerName = url.searchParams.get('name')
  const club = url.searchParams.get('club')

  if (!playerName || !club) {
    return new Response(JSON.stringify({ status: 'fit' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ status: 'fit' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const searchResp = await fetch(
      `https://v3.football.api-sports.io/players?search=${encodeURIComponent(playerName)}&season=2024`,
      { headers: { 'x-apisports-key': apiKey } }
    )
    const searchData = await searchResp.json()
    const players = searchData.response || []

    if (!players.length) {
      return new Response(JSON.stringify({ status: 'fit' }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600',
        },
      })
    }

    const player = players[0]
    const rating = player.statistics?.[0]?.games?.rating || null

    return new Response(JSON.stringify({ status: 'fit', rating }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600',
      },
    })
  } catch {
    return new Response(JSON.stringify({ status: 'fit' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
