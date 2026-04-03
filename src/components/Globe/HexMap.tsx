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

// Points terrestres précalculés (lat, lng) pour les zones clés
const LAND_POINTS: [number, number][] = [
  // Europe
  [48, 2], [51, 0], [52, 13], [48, 16], [41, 12], [40, -3],
  [38, -9], [51, 4], [56, 10], [60, 11], [64, 26], [59, 18],
  [47, 8], [46, 14], [42, 23], [38, 22], [37, 14], [37, 25],
  [53, 18], [50, 20], [47, 19], [44, 26], [42, 43], [41, 44],
  [55, 37], [59, 30], [56, 24], [54, 25], [52, 21], [48, 35],
  // Afrique
  [36, 3], [33, -5], [14, -14], [12, -2], [5, -1], [-4, 15],
  [-26, 28], [-30, 31], [-4, 40], [15, 32], [9, 38], [0, 37],
  [-19, 47], [-13, 16], [7, 2], [4, 18], [-11, 17], [20, 13],
  [30, 31], [24, 15], [16, 43], [11, 8], [6, -4], [-29, 26],
  // Amérique du Nord
  [40, -74], [38, -77], [42, -83], [45, -73], [37, -122],
  [34, -118], [47, -122], [29, -95], [43, -79], [39, -105],
  [35, -90], [33, -84], [25, -80], [48, -98], [51, -114],
  [54, -124], [19, -99], [21, -102], [44, -76], [46, -64],
  // Amérique du Sud
  [-23, -46], [-34, -58], [-12, -77], [-16, -68], [-4, -39],
  [-8, -35], [-15, -47], [-3, -60], [5, -52], [-33, -71],
  [-38, -63], [7, -66], [4, -74], [10, -67], [-1, -78],
  // Asie
  [35, 139], [34, 108], [39, 116], [55, 82], [43, 76],
  [51, 71], [23, 113], [13, 100], [1, 103], [14, 120],
  [22, 88], [28, 77], [19, 73], [17, 82], [31, 121],
  [37, 127], [35, 136], [33, 130], [24, 121], [10, 77],
  [60, 30], [56, 44], [52, 55], [48, 68], [43, 51],
  // Australie + Océanie
  [-33, 151], [-37, 145], [-27, 153], [-35, 138],
  [-31, 116], [-23, 133], [-43, 172],
  // Asie centrale / Moyen orient
  [41, 69], [38, 35], [33, 44], [36, 52], [32, 53],
  [25, 55], [24, 46], [21, 39], [15, 44], [12, 42],
]

function isLandPoint(lat: number, lng: number): boolean {
  return LAND_POINTS.some(([pLat, pLng]) => {
    const dLat = lat - pLat
    const dLng = lng - pLng
    return Math.sqrt(dLat * dLat + dLng * dLng) < 6
  })
}

export default function HexMap({ pins, onCountryClick, width = 900, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  const toXY = useCallback((lat: number, lng: number) => ({
    x: (lng + 180) / 360 * width,
    y: (90 - lat) / 180 * height,
  }), [width, height])

  // Précalcule la grille d'hexagones (une seule fois)
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
        const lng = (x / width) * 360 - 180
        const lat = 90 - (y / height) * 180
        const land = isLandPoint(lat, lng)
        grid.push({ x, y, isLand: land })
      }
      row++
    }
    hexGridRef.current = grid
  }, [width, height])

  // Dessin
  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const HEX_R = 8

    // Fond
    ctx.fillStyle = '#07090F'
    ctx.fillRect(0, 0, width, height)

    // Grille hexagonale
    hexGridRef.current.forEach(({ x, y, isLand }) => {
      drawHexagon(ctx, x, y, HEX_R - 1, isLand)
    })

    // Arcs animés
    drawArcs(ctx, pins, time)

    // Pins
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
      ctx.fillStyle = '#1C1050'
      ctx.fill()
      ctx.strokeStyle = 'rgba(120,80,220,0.4)'
      ctx.lineWidth = 0.6
      ctx.stroke()
    } else {
      ctx.fillStyle = '#080B18'
      ctx.fill()
      ctx.strokeStyle = 'rgba(20,30,70,0.5)'
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

    // Label flottant (bulle + ligne de connexion)
    if (pin.count > 8 || isHovered) {
      const label = pin.country
      const countLabel = pin.count.toString()

      ctx.font = 'bold 10px JetBrains Mono, monospace'
      const labelW = ctx.measureText(label).width
      const totalW = labelW + 40
      const totalH = 24

      let bx = x + r + 10
      let by = y - totalH / 2
      if (bx + totalW > width - 10) bx = x - totalW - r - 10
      if (by < 5) by = 5
      if (by + totalH > height - 5) by = height - totalH - 5

      ctx.fillStyle = 'rgba(8,10,25,0.92)'
      ctx.strokeStyle = color + 'AA'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(bx, by, totalW, totalH, 5)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#E2EAF4'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText(label, bx + 8, by + 15)

      const badgeX = bx + totalW - 26
      ctx.fillStyle = color + '30'
      ctx.beginPath()
      ctx.roundRect(badgeX, by + 4, 22, 16, 3)
      ctx.fill()
      ctx.fillStyle = color
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText(countLabel, badgeX + 11 - ctx.measureText(countLabel).width / 2, by + 14)

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

        // Point lumineux animé
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
