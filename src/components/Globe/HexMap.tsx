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

// ── GeoJSON land detection ────────────────────────────────────────────────────

function pointInPolygon(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLandGeo(lng: number, lat: number, features: any[]): boolean {
  for (const feature of features) {
    const geo = feature.geometry
    if (!geo) continue
    if (geo.type === 'Polygon') {
      if (pointInPolygon([lng, lat], geo.coordinates[0])) return true
    } else if (geo.type === 'MultiPolygon') {
      for (const poly of geo.coordinates) {
        if (pointInPolygon([lng, lat], poly[0])) return true
      }
    }
  }
  return false
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HexMap({ pins, onCountryClick, width = 900, height = 480 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const animRef    = useRef<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoRef     = useRef<any[]>([])
  const [geoLoaded, setGeoLoaded] = useState(false)

  // Zoom + pan (refs for RAF loop — no re-render needed)
  const zoomRef    = useRef(1)
  const panRef     = useRef({ x: 0, y: 0 })
  const isDragRef  = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null)
  const [tooltip,    setTooltip]    = useState<{ x: number; y: number } | null>(null)

  const toXY = useCallback((lat: number, lng: number) => ({
    x: (lng + 180) / 360 * width,
    y: (90 - lat)  / 180 * height,
  }), [width, height])

  // ── Load GeoJSON ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then((data: { features: object[] }) => {
        geoRef.current = data.features
        setGeoLoaded(true)
      })
      .catch(console.error)
  }, [])

  // ── Hex grid (recompute when GeoJSON loaded or dimensions change) ────────────

  const hexGridRef = useRef<Array<{ x: number; y: number; isLand: boolean }>>([])

  useEffect(() => {
    if (!geoLoaded) return
    const HEX_R = 3
    const HEX_W = HEX_R * Math.sqrt(3)
    const HEX_H = HEX_R * 2 * 0.75
    const grid: Array<{ x: number; y: number; isLand: boolean }> = []
    let row = 0
    for (let y = HEX_R; y < height; y += HEX_H) {
      const offset = row % 2 === 1 ? HEX_W / 2 : 0
      for (let x = offset + HEX_R; x < width; x += HEX_W) {
        const lng = (x / width)  * 360 - 180
        const lat = 90 - (y / height) * 180
        grid.push({ x, y, isLand: isLandGeo(lng, lat, geoRef.current) })
      }
      row++
    }
    hexGridRef.current = grid
  }, [geoLoaded, width, height])

  // ── Zoom + pan native event handlers ────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top)  * scaleY
      const oldZoom = zoomRef.current
      const newZoom = Math.max(0.8, Math.min(4, oldZoom * (e.deltaY > 0 ? 0.9 : 1.1)))
      const ratio   = newZoom / oldZoom
      panRef.current = {
        x: mx - ratio * (mx - panRef.current.x),
        y: my - ratio * (my - panRef.current.y),
      }
      zoomRef.current = newZoom
    }

    const onDown = (e: MouseEvent) => {
      isDragRef.current    = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragRef.current) return
      const rect   = canvas.getBoundingClientRect()
      const scaleX = width  / rect.width
      const scaleY = height / rect.height
      panRef.current = {
        x: panRef.current.x + (e.clientX - lastMouseRef.current.x) * scaleX,
        y: panRef.current.y + (e.clientY - lastMouseRef.current.y) * scaleY,
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => { isDragRef.current = false }

    canvas.addEventListener('wheel',   onWheel, { passive: false })
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      canvas.removeEventListener('wheel',   onWheel)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [width, height])

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const HEX_R = 3
    const zoom  = zoomRef.current
    const pan   = panRef.current

    ctx.fillStyle = '#07090F'
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // ── Hexagones heatmap ───────────────────────────────────────────────────
    hexGridRef.current.forEach(({ x, y, isLand }) => {
      let heat = 0
      pins.forEach(pin => {
        const { x: px, y: py } = toXY(pin.lat, pin.lng)
        const dist     = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
        const influence = Math.max(0, 1 - dist / (pin.count * 8 + 40))
        heat += influence * (pin.count / 10)
      })
      heat = Math.min(heat, 1)

      let fillColor: string, strokeColor: string

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

    // ── Arcs animés ─────────────────────────────────────────────────────────
    drawArcs(ctx, pins, time)

    // ── Pins ─────────────────────────────────────────────────────────────────
    pins.forEach(pin => {
      const { x, y } = toXY(pin.lat, pin.lng)
      drawPin(ctx, x, y, pin, hoveredPin?.country === pin.country, time)
    })

    ctx.restore()
  }, [pins, hoveredPin, toXY, width, height])

  function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, pin: Pin, isHovered: boolean, time: number) {
    const color   = pin.label === 'ELITE' ? '#00E5A0' : pin.label === 'TOP PROSPECT' ? '#3D8EFF' : '#FF9F43'
    const baseR   = Math.min(6 + pin.count * 1.5, 18)
    const pulse   = isHovered ? Math.sin(time * 0.003) * 3 : 0
    const r       = baseR + pulse

    const haloR  = r + 10 + Math.sin(time * 0.002 + pin.lat) * 4
    const haloGr = ctx.createRadialGradient(x, y, r, x, y, haloR)
    haloGr.addColorStop(0, color + '40')
    haloGr.addColorStop(1, color + '00')
    ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2)
    ctx.fillStyle = haloGr; ctx.fill()

    ctx.shadowColor = color
    ctx.shadowBlur  = isHovered ? 20 : 12
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = color + 'CC'; ctx.fill()

    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'; ctx.fill()
    ctx.shadowBlur = 0

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

      ctx.fillStyle   = 'rgba(8,10,25,0.94)'
      ctx.strokeStyle = color + 'AA'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.roundRect(bx, by, totalW, totalH, 6)
      ctx.fill(); ctx.stroke()

      ctx.fillStyle = color
      ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, 18, 18, 3)
      ctx.fill()
      ctx.fillStyle = '#000000'
      ctx.font      = 'bold 9px Inter, sans-serif'
      ctx.fillText(label.slice(0, 1), bx + 9, by + 15)

      ctx.fillStyle = '#E2EAF4'
      ctx.font      = 'bold 11px Inter, sans-serif'
      ctx.fillText(label, bx + 28, by + 17)

      ctx.fillStyle = color
      ctx.font      = 'bold 14px Inter, sans-serif'
      ctx.fillText(countStr, bx + 28 + labelW + 8, by + 18)

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

  // ── Animation loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!geoLoaded) return
    const loop = (time: number) => {
      draw(time)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw, geoLoaded])

  // ── Mouse hover (accounts for zoom+pan) ─────────────────────────────────────

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragRef.current) return
    const rect   = canvasRef.current!.getBoundingClientRect()
    const scaleX = width  / rect.width
    const scaleY = height / rect.height
    const rawX   = (e.clientX - rect.left) * scaleX
    const rawY   = (e.clientY - rect.top)  * scaleY
    const zoom   = zoomRef.current
    const pan    = panRef.current
    const mx     = (rawX - pan.x) / zoom
    const my     = (rawY - pan.y) / zoom

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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!geoLoaded) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#07090F', borderRadius: 12,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00E5A0',
        letterSpacing: '0.1em',
      }}>
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width }}>
      <button
        onClick={() => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 } }}
        style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 10,
          background: 'rgba(7,9,15,0.85)', border: '1px solid rgba(0,229,160,0.3)',
          borderRadius: 6, color: '#00E5A0', fontSize: 11, fontWeight: 600,
          padding: '5px 10px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.05em',
        }}
      >
        Reset
      </button>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', borderRadius: 12, cursor: isDragRef.current ? 'grabbing' : hoveredPin ? 'pointer' : 'grab', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredPin(null); setTooltip(null) }}
        onClick={() => { if (!isDragRef.current && hoveredPin && onCountryClick) onCountryClick(hoveredPin.country) }}
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
