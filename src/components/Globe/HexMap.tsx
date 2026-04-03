import { useEffect, useRef, useState, useCallback } from 'react'

interface Pin {
  lat: number; lng: number; count: number
  country: string; label: string
}

interface Props {
  pins: Pin[]
  onCountryClick?: (country: string) => void
  width?: number
  height?: number
}

// ── Land detection (même liste étendue que Globe.tsx, rayon 5°) ───────────────

const LAND_POINTS: [number, number][] = [
  // === EUROPE ===
  [71,25],[70,28],[69,18],[68,20],[67,15],[66,14],[65,25],
  [64,26],[63,10],[62,6],[61,5],[60,11],[59,18],[58,7],
  [57,12],[56,10],[55,9],[54,18],[53,14],[52,5],[51,4],
  [50,8],[49,2],[48,7],[47,8],[46,8],[45,7],[44,8],
  [43,3],[42,12],[41,14],[40,16],[39,16],[38,15],[37,14],
  [36,5],[35,33],[34,33],[51,24],[50,20],[49,18],[48,22],
  [47,19],[46,20],[45,16],[44,20],[43,22],[42,23],[41,23],
  [40,22],[39,22],[38,22],[37,22],[36,22],[38,-9],[39,-8],
  [40,-4],[41,-8],[42,-8],[43,-6],[44,-1],[52,20],[53,18],
  [54,22],[55,24],[56,22],[57,22],[58,26],[59,24],[60,24],
  [61,24],[62,24],[63,24],[46,30],[47,30],[48,30],[49,30],
  // === AFRIQUE ===
  [37,10],[36,8],[35,9],[34,9],[33,11],[32,13],[31,20],
  [30,29],[29,30],[28,30],[27,30],[26,30],[25,30],[24,32],
  [23,32],[22,30],[21,29],[20,20],[19,18],[18,16],[17,14],
  [16,13],[15,12],[14,14],[13,14],[12,14],[11,14],[10,14],
  [9,8],[8,8],[7,4],[6,2],[5,2],[4,10],[3,18],[2,20],
  [1,15],[0,15],[-1,15],[-2,15],[-3,18],[-4,22],[-5,22],
  [-6,22],[-7,22],[-8,22],[-9,22],[-10,22],[-11,18],
  [-12,16],[-13,14],[-14,14],[-15,14],[-16,14],[-17,14],
  [-18,22],[-19,28],[-20,28],[-22,28],[-24,28],[-26,28],
  [-28,28],[-30,29],[-32,27],[-34,26],[-33,18],[-32,18],
  [-28,20],[-25,20],[-22,20],[-20,20],[-17,20],[-14,20],
  [36,3],[30,2],[24,3],[18,2],[12,2],[6,3],[0,3],
  // === AMERIQUE DU NORD ===
  [70,-140],[68,-136],[66,-130],[64,-124],[62,-140],
  [60,-130],[58,-130],[56,-130],[54,-130],[52,-128],
  [50,-125],[48,-124],[47,-122],[46,-122],[45,-76],
  [44,-76],[43,-79],[42,-83],[41,-74],[40,-74],[39,-77],
  [38,-77],[37,-122],[36,-121],[35,-120],[34,-118],
  [33,-117],[32,-117],[30,-98],[29,-98],[28,-97],
  [27,-97],[26,-97],[25,-80],[24,-80],[23,-82],
  [48,-98],[49,-98],[50,-98],[51,-98],[52,-98],
  [48,-90],[49,-84],[50,-84],[51,-84],[52,-84],
  [54,-84],[56,-78],[58,-78],[60,-78],[62,-78],
  [64,-83],[66,-83],[68,-83],[56,-68],[54,-66],
  [52,-66],[50,-66],[48,-70],[46,-64],[44,-66],
  [19,-99],[20,-99],[21,-87],[22,-87],[23,-87],
  [25,-77],[26,-77],[27,-77],[28,-81],[29,-81],
  // === AMERIQUE DU SUD ===
  [12,-72],[10,-67],[8,-65],[6,-60],[4,-52],[2,-52],
  [0,-50],[-2,-44],[-4,-38],[-6,-35],[-8,-35],
  [-10,-38],[-12,-42],[-14,-44],[-16,-42],[-18,-42],
  [-20,-42],[-22,-42],[-24,-46],[-26,-50],[-28,-52],
  [-30,-52],[-32,-52],[-34,-56],[-36,-58],[-38,-62],
  [-40,-64],[-42,-64],[-44,-66],[-46,-66],[-48,-68],
  [-50,-68],[-52,-70],[-54,-70],[-2,-60],[-4,-62],
  [-6,-64],[-8,-66],[-10,-68],[-12,-70],[-14,-72],
  [-16,-68],[-18,-66],[-20,-62],[-22,-56],[0,-60],
  [2,-60],[4,-60],[6,-60],[8,-72],[10,-72],
  // === ASIE ===
  [70,30],[68,30],[66,44],[64,44],[62,52],[60,52],
  [58,52],[56,52],[54,60],[52,60],[50,60],[48,68],
  [46,68],[44,68],[42,76],[40,68],[38,44],[36,36],
  [34,36],[32,36],[30,48],[28,48],[26,50],[24,46],
  [22,44],[20,44],[18,44],[16,42],[14,44],[12,44],
  [35,140],[36,140],[37,140],[38,140],[39,140],[40,140],
  [33,130],[34,130],[31,120],[30,120],[29,120],[28,116],
  [27,108],[26,108],[25,108],[24,102],[23,102],[22,102],
  [21,102],[20,102],[18,100],[16,100],[14,100],[12,100],
  [10,78],[12,78],[14,78],[16,78],[18,78],[20,78],
  [22,88],[24,88],[26,88],[28,77],[30,77],[32,77],
  [34,77],[36,72],[38,72],[40,72],[60,30],[58,28],
  [56,38],[54,38],[52,38],[50,30],[48,30],[46,30],
  [44,42],[42,42],[40,42],[38,50],[36,50],[34,50],
  [32,50],[30,50],[28,50],[26,50],[24,56],[22,58],
  [20,56],[18,42],[16,42],[14,42],[12,42],
  // === AUSTRALIE ===
  [-14,132],[-16,136],[-18,136],[-20,136],[-22,136],
  [-24,132],[-26,128],[-28,122],[-30,116],[-32,116],
  [-34,116],[-36,148],[-38,148],[-40,148],[-42,148],
  [-44,170],[-20,148],[-22,148],[-24,148],[-26,148],
  [-28,148],[-30,148],[-32,148],[-34,148],[-36,148],
  [-26,116],[-28,116],[-30,120],[-32,124],[-34,136],
  [-36,140],[-38,144],[-40,146],[-16,130],[-18,130],
  [-20,130],[-22,130],[-24,130],[-14,128],[-12,132],
]

function isLandPoint(lat: number, lng: number): boolean {
  return LAND_POINTS.some(([pLat, pLng]) =>
    Math.sqrt((lat - pLat) ** 2 + (lng - pLng) ** 2) < 5
  )
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HexMap({ pins, onCountryClick, width = 900, height = 480 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const animRef    = useRef<number>(0)
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null)
  const [tooltip,    setTooltip]    = useState<{ x: number; y: number } | null>(null)

  const toXY = useCallback((lat: number, lng: number) => ({
    x: (lng + 180) / 360 * width,
    y: (90 - lat)  / 180 * height,
  }), [width, height])

  // Précalcule la grille (une seule fois par dimensions)
  const hexGridRef = useRef<Array<{ x: number; y: number; isLand: boolean }>>([])

  useEffect(() => {
    const HEX_R = 8
    const HEX_W = HEX_R * Math.sqrt(3)
    const HEX_H = HEX_R * 2 * 0.75
    const grid: Array<{ x: number; y: number; isLand: boolean }> = []
    let row = 0
    for (let y = HEX_R; y < height; y += HEX_H) {
      const offset = row % 2 === 1 ? HEX_W / 2 : 0
      for (let x = offset + HEX_R; x < width; x += HEX_W) {
        const lng  = (x / width)  * 360 - 180
        const lat  = 90 - (y / height) * 180
        grid.push({ x, y, isLand: isLandPoint(lat, lng) })
      }
      row++
    }
    hexGridRef.current = grid
  }, [width, height])

  // ── Draw ───────────────────────────────────────────────────────────────────

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const HEX_R = 8

    ctx.fillStyle = '#07090F'
    ctx.fillRect(0, 0, width, height)

    // ── Hexagones heatmap ─────────────────────────────────────────────────
    hexGridRef.current.forEach(({ x, y, isLand }) => {
      // Calcule la chaleur (influence des pins proches)
      let heat = 0
      pins.forEach(pin => {
        const { x: px, y: py } = toXY(pin.lat, pin.lng)
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
        const influence = Math.max(0, 1 - dist / (pin.count * 8 + 40))
        heat += influence * (pin.count / 10)
      })
      heat = Math.min(heat, 1)

      // Couleur de remplissage
      let fillColor: string
      let strokeColor: string

      if (!isLand) {
        fillColor   = '#080B18'
        strokeColor = 'rgba(15,25,60,0.4)'
      } else if (heat <= 0.05) {
        fillColor   = '#1C1050'
        strokeColor = 'rgba(80,50,200,0.5)'
      } else if (heat <= 0.3) {
        fillColor   = interpolateColor('#1C1050', '#3D8EFF', heat / 0.3)
        strokeColor = 'rgba(80,50,200,0.5)'
      } else if (heat <= 0.7) {
        fillColor   = interpolateColor('#3D8EFF', '#00E5A0', (heat - 0.3) / 0.4)
        strokeColor = 'rgba(0,229,160,0.6)'
      } else {
        fillColor   = '#00E5A0'
        strokeColor = 'rgba(0,229,160,0.6)'
      }

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const hx = x + (HEX_R - 1) * Math.cos(angle)
        const hy = y + (HEX_R - 1) * Math.sin(angle)
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fillStyle   = fillColor
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth   = 0.5
      ctx.stroke()
    })

    // ── Arcs animés ───────────────────────────────────────────────────────
    drawArcs(ctx, pins, time)

    // ── Pins ──────────────────────────────────────────────────────────────
    pins.forEach(pin => {
      const { x, y } = toXY(pin.lat, pin.lng)
      drawPin(ctx, x, y, pin, hoveredPin?.country === pin.country, time)
    })
  }, [pins, hoveredPin, toXY, width, height])

  function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, pin: Pin, isHovered: boolean, time: number) {
    const color   = pin.label === 'ELITE' ? '#00E5A0'
                  : pin.label === 'TOP PROSPECT' ? '#3D8EFF'
                  : '#FF9F43'
    const baseR   = Math.min(6 + pin.count * 1.5, 18)
    const pulse   = isHovered ? Math.sin(time * 0.003) * 3 : 0
    const r       = baseR + pulse

    // Halo pulsant
    const haloR  = r + 10 + Math.sin(time * 0.002 + pin.lat) * 4
    const haloGr = ctx.createRadialGradient(x, y, r, x, y, haloR)
    haloGr.addColorStop(0, color + '40')
    haloGr.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2)
    ctx.fillStyle = haloGr; ctx.fill()

    // Cercle principal
    ctx.shadowColor = color
    ctx.shadowBlur  = isHovered ? 20 : 12
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = color + 'CC'; ctx.fill()

    // Point central blanc
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'; ctx.fill()
    ctx.shadowBlur = 0

    // Label style Orion
    if (pin.count > 8 || isHovered) {
      const label     = pin.country
      const countStr  = pin.count.toString()
      ctx.font        = 'bold 11px Inter, sans-serif'
      const labelW    = ctx.measureText(label).width
      const totalW    = 28 + labelW + 16 + ctx.measureText(countStr).width + 12
      const totalH    = 26

      let bx = x + r + 10
      let by = y - totalH / 2
      if (bx + totalW > width - 10) bx = x - totalW - r - 10
      if (by < 5) by = 5
      if (by + totalH > height - 5) by = height - totalH - 5

      // Fond bulle
      ctx.fillStyle   = 'rgba(8,10,25,0.94)'
      ctx.strokeStyle = color + 'AA'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.roundRect(bx, by, totalW, totalH, 6)
      ctx.fill(); ctx.stroke()

      // Icône carrée colorée à gauche
      ctx.fillStyle = color
      ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, 18, 18, 3)
      ctx.fill()
      // Initiale pays dans l'icône
      ctx.fillStyle = '#000000'
      ctx.font      = 'bold 9px Inter, sans-serif'
      ctx.fillText(label.slice(0, 1), bx + 9, by + 15)

      // Nom du pays
      ctx.fillStyle = '#E2EAF4'
      ctx.font      = 'bold 11px Inter, sans-serif'
      ctx.fillText(label, bx + 28, by + 17)

      // Nombre en grand à droite
      ctx.fillStyle = color
      ctx.font      = 'bold 14px Inter, sans-serif'
      const numX    = bx + 28 + labelW + 8
      ctx.fillText(countStr, numX, by + 18)

      // Ligne de connexion
      const lineEndX = bx > x ? bx : bx + totalW
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lineEndX, by + totalH / 2)
      ctx.strokeStyle = color + '60'; ctx.lineWidth = 1; ctx.stroke()
    }
  }

  function drawArcs(ctx: CanvasRenderingContext2D, allPins: Pin[], time: number) {
    const topPins = [...allPins].sort((a, b) => b.count - a.count).slice(0, 8)

    for (let i = 0; i < topPins.length; i++) {
      for (let j = i + 1; j < Math.min(topPins.length, i + 3); j++) {
        const from = toXY(topPins[i].lat, topPins[i].lng)
        const to   = toXY(topPins[j].lat, topPins[j].lng)
        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
        if (dist < 50 || dist > 600) continue

        const cpX      = (from.x + to.x) / 2
        const cpY      = Math.min(from.y, to.y) - dist * 0.35
        const progress = (time * 0.0005 + i * 0.3 + j * 0.1) % 1

        for (let s = 0; s < 40; s++) {
          const t1 = s / 40, t2 = (s + 1) / 40
          const bx1 = (1-t1)**2*from.x + 2*(1-t1)*t1*cpX + t1**2*to.x
          const by1 = (1-t1)**2*from.y + 2*(1-t1)*t1*cpY + t1**2*to.y
          const bx2 = (1-t2)**2*from.x + 2*(1-t2)*t2*cpX + t2**2*to.x
          const by2 = (1-t2)**2*from.y + 2*(1-t2)*t2*cpY + t2**2*to.y
          const alpha = Math.max(0, 0.6 - Math.abs(t1 - progress) * 3)
          ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2)
          ctx.strokeStyle = `rgba(0,229,160,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke()
        }

        const px = (1-progress)**2*from.x + 2*(1-progress)*progress*cpX + progress**2*to.x
        const py = (1-progress)**2*from.y + 2*(1-progress)*progress*cpY + progress**2*to.y
        ctx.shadowColor = '#00E5A0'; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#00E5A0'; ctx.fill(); ctx.shadowBlur = 0
      }
    }
  }

  // Loop d'animation
  useEffect(() => {
    const loop = (time: number) => {
      draw(time)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect   = canvasRef.current!.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const mx     = (e.clientX - rect.left) * scaleX
    const my     = (e.clientY - rect.top)  * scaleY

    let found: Pin | null = null
    let minDist = Infinity
    pins.forEach(pin => {
      const { x, y } = toXY(pin.lat, pin.lng)
      const d = Math.sqrt((mx - x) ** 2 + (my - y) ** 2)
      const r = Math.min(6 + pin.count * 1.5, 18) + 10
      if (d < r && d < minDist) { found = pin; minDist = d }
    })

    setHoveredPin(found)
    setTooltip(found ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', borderRadius: 12, cursor: hoveredPin ? 'pointer' : 'default', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredPin(null); setTooltip(null) }}
        onClick={() => { if (hoveredPin && onCountryClick) onCountryClick(hoveredPin.country) }}
      />
      {hoveredPin && tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 36,
          background: 'rgba(7,9,15,0.96)', border: '1px solid rgba(0,229,160,0.4)',
          borderRadius: 8, padding: '8px 14px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#E2EAF4',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 0 20px rgba(0,229,160,0.15)',
        }}>
          <span style={{ color: '#00E5A0', fontWeight: 700 }}>{hoveredPin.country}</span>
          <span style={{ color: '#64748B', margin: '0 6px' }}>·</span>
          {hoveredPin.count} joueurs
          <span style={{ color: '#64748B', margin: '0 6px' }}>·</span>
          <span style={{
            color: hoveredPin.label === 'ELITE' ? '#00E5A0' : hoveredPin.label === 'TOP PROSPECT' ? '#3D8EFF' : '#FF9F43',
            fontWeight: 700,
          }}>{hoveredPin.label}</span>
        </div>
      )}
    </div>
  )
}
