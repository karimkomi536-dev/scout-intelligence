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

// Coordonnées des masses terrestres (polygones simplifiés)
// Chaque zone est définie par [latMin, latMax, lngMin, lngMax]
const LAND_ZONES = [
  // Europe
  { lat: [35, 71], lng: [-10, 40], density: 0.9 },
  // Afrique
  { lat: [-35, 37], lng: [-18, 52], density: 0.85 },
  // Amérique du Nord
  { lat: [24, 72], lng: [-168, -52], density: 0.85 },
  // Amérique Centrale + Caraïbes
  { lat: [7, 24], lng: [-92, -60], density: 0.7 },
  // Amérique du Sud
  { lat: [-56, 12], lng: [-82, -34], density: 0.85 },
  // Russie / Asie du Nord
  { lat: [50, 75], lng: [40, 180], density: 0.8 },
  // Asie Centrale + Moyen Orient
  { lat: [15, 50], lng: [40, 100], density: 0.85 },
  // Asie du Sud + Inde
  { lat: [5, 35], lng: [68, 100], density: 0.9 },
  // Asie du Sud-Est
  { lat: [-10, 25], lng: [95, 140], density: 0.75 },
  // Chine + Japon
  { lat: [20, 55], lng: [100, 145], density: 0.9 },
  // Australie
  { lat: [-45, -10], lng: [113, 155], density: 0.85 },
  // Groenland
  { lat: [60, 83], lng: [-58, -17], density: 0.6 },
  // Scandinavie
  { lat: [55, 71], lng: [5, 32], density: 0.9 },
  // Îles britanniques
  { lat: [50, 61], lng: [-10, 2], density: 0.9 },
]

export default function HexMap({ pins, onCountryClick, width = 900, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  // Conversion coordonnées géographiques → pixels
  const toXY = useCallback((lat: number, lng: number) => ({
    x: (lng + 180) / 360 * width,
    y: (90 - lat) / 180 * height,
  }), [width, height])

  // Vérifie si un point est dans une zone terrestre
  const isLand = useCallback((lat: number, lng: number) => {
    return LAND_ZONES.some(zone =>
      lat >= zone.lat[0] && lat <= zone.lat[1] &&
      lng >= zone.lng[0] && lng <= zone.lng[1] &&
      Math.random() < zone.density
    )
  }, [])

  // Précalcule la grille d'hexagones (une seule fois)
  const hexGridRef = useRef<Array<{ x: number; y: number; isLand: boolean }>>([])

  useEffect(() => {
    const HEX_R = 7 // rayon hexagone
    const HEX_W = HEX_R * Math.sqrt(3)
    const HEX_H = HEX_R * 2
    const grid: Array<{ x: number; y: number; isLand: boolean }> = []

    let row = 0
    for (let y = HEX_R; y < height + HEX_R; y += HEX_H * 0.75) {
      const offset = row % 2 === 0 ? 0 : HEX_W / 2
      for (let x = offset; x < width + HEX_W; x += HEX_W) {
        const lng = (x / width) * 360 - 180
        const lat = 90 - (y / height) * 180
        const land = isLand(lat, lng)
        grid.push({ x, y, isLand: land })
      }
      row++
    }
    hexGridRef.current = grid
  }, [width, height, isLand])

  // Dessin
  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const HEX_R = 7

    // Fond
    ctx.fillStyle = '#07090F'
    ctx.fillRect(0, 0, width, height)

    // Dessine la grille hexagonale
    hexGridRef.current.forEach(({ x, y, isLand }) => {
      drawHexagon(ctx, x, y, HEX_R - 0.8, isLand)
    })

    // Arcs de connexion (animés)
    drawArcs(ctx, pins, time)

    // Pins pays
    pins.forEach(pin => {
      const { x, y } = toXY(pin.lat, pin.lng)
      const isHovered = hoveredPin?.country === pin.country
      drawPin(ctx, x, y, pin, isHovered, time)
    })
  }, [pins, hoveredPin, toXY, width, height])

  function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, land: boolean) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()

    if (land) {
      ctx.fillStyle = '#1a1040'
      ctx.fill()
      ctx.strokeStyle = 'rgba(100,80,200,0.35)'
      ctx.lineWidth = 0.6
      ctx.stroke()
    } else {
      ctx.fillStyle = '#0a0d1a'
      ctx.fill()
      ctx.strokeStyle = 'rgba(30,40,80,0.3)'
      ctx.lineWidth = 0.4
      ctx.stroke()
    }
  }

  function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, pin: Pin, isHovered: boolean, time: number) {
    const color = pin.label === 'ELITE' ? '#00E5A0'
      : pin.label === 'TOP PROSPECT' ? '#3D8EFF'
      : '#FF9F43'

    const baseR = Math.min(6 + pin.count * 1.5, 18)
    const pulse = isHovered ? Math.sin(time * 0.003) * 3 : 0
    const r = baseR + pulse

    // Halo externe pulsant
    const haloR = r + 10 + Math.sin(time * 0.002 + pin.lat) * 4
    const haloGrad = ctx.createRadialGradient(x, y, r, x, y, haloR)
    haloGrad.addColorStop(0, color + '40')
    haloGrad.addColorStop(1, color + '00')
    ctx.beginPath()
    ctx.arc(x, y, haloR, 0, Math.PI * 2)
    ctx.fillStyle = haloGrad
    ctx.fill()

    // Cercle glow
    ctx.shadowColor = color
    ctx.shadowBlur = isHovered ? 20 : 12
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = color + 'CC'
    ctx.fill()

    // Point central
    ctx.beginPath()
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.shadowBlur = 0

    // Label flottant style Orion (bulle avec ligne de connexion)
    if (pin.count > 8 || isHovered) {
      const label = pin.country
      const countLabel = pin.count.toString()

      ctx.font = 'bold 10px JetBrains Mono, monospace'
      const labelW = ctx.measureText(label).width
      const totalW = labelW + 40
      const totalH = 24

      // Position bulle (évite les bords)
      let bx = x + r + 10
      let by = y - totalH / 2
      if (bx + totalW > width - 10) bx = x - totalW - r - 10
      if (by < 5) by = 5
      if (by + totalH > height - 5) by = height - totalH - 5

      // Fond bulle
      ctx.fillStyle = 'rgba(8,10,25,0.92)'
      ctx.strokeStyle = color + 'AA'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(bx, by, totalW, totalH, 5)
      ctx.fill()
      ctx.stroke()

      // Texte pays
      ctx.fillStyle = '#E2EAF4'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText(label, bx + 8, by + 15)

      // Badge count
      const badgeX = bx + totalW - 26
      ctx.fillStyle = color + '30'
      ctx.beginPath()
      ctx.roundRect(badgeX, by + 4, 22, 16, 3)
      ctx.fill()
      ctx.fillStyle = color
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText(countLabel, badgeX + 11 - ctx.measureText(countLabel).width / 2, by + 14)

      // Ligne de connexion
      const lineEndX = bx > x ? bx : bx + totalW
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(lineEndX, by + totalH / 2)
      ctx.strokeStyle = color + '60'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  function drawArcs(ctx: CanvasRenderingContext2D, allPins: Pin[], time: number) {
    const topPins = [...allPins].sort((a, b) => b.count - a.count).slice(0, 8)

    for (let i = 0; i < topPins.length; i++) {
      for (let j = i + 1; j < Math.min(topPins.length, i + 3); j++) {
        const from = toXY(topPins[i].lat, topPins[i].lng)
        const to = toXY(topPins[j].lat, topPins[j].lng)

        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
        if (dist < 50 || dist > 600) continue

        const cpX = (from.x + to.x) / 2
        const cpY = Math.min(from.y, to.y) - dist * 0.35

        const progress = ((time * 0.0005 + i * 0.3 + j * 0.1) % 1)

        // Trace l'arc en gradient
        const steps = 40
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps
          const t2 = (s + 1) / steps
          const x1 = (1 - t1) ** 2 * from.x + 2 * (1 - t1) * t1 * cpX + t1 ** 2 * to.x
          const y1 = (1 - t1) ** 2 * from.y + 2 * (1 - t1) * t1 * cpY + t1 ** 2 * to.y
          const x2 = (1 - t2) ** 2 * from.x + 2 * (1 - t2) * t2 * cpX + t2 ** 2 * to.x
          const y2 = (1 - t2) ** 2 * from.y + 2 * (1 - t2) * t2 * cpY + t2 ** 2 * to.y

          const distToProgress = Math.abs(t1 - progress)
          const alpha = Math.max(0, 0.6 - distToProgress * 3)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `rgba(0,229,160,${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Point lumineux qui se déplace le long de l'arc
        const px = (1 - progress) ** 2 * from.x + 2 * (1 - progress) * progress * cpX + progress ** 2 * to.x
        const py = (1 - progress) ** 2 * from.y + 2 * (1 - progress) * progress * cpY + progress ** 2 * to.y
        ctx.shadowColor = '#00E5A0'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#00E5A0'
        ctx.fill()
        ctx.shadowBlur = 0
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

  // Gestion hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

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
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 36,
          background: 'rgba(7,9,15,0.96)',
          border: '1px solid rgba(0,229,160,0.4)',
          borderRadius: 8,
          padding: '8px 14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#E2EAF4',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
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
