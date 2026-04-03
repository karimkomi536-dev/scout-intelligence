import { useRef, useEffect, useState } from 'react'

interface HexMapPin {
  lat:     number
  lng:     number
  count:   number
  country: string
  label:   string
}

interface HexMapProps {
  pins:            HexMapPin[]
  onCountryClick?: (country: string) => void
  width?:          number
  height?:         number
}

type XY = { x: number; y: number }

export default function HexMap({ pins, onCountryClick, width = 800, height = 450 }: HexMapProps) {
  const canvasRef                 = useRef<HTMLCanvasElement>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltip, setTooltip]     = useState<{ x: number; y: number; text: string } | null>(null)

  // ── Drawing helpers (defined at module level to share between useEffect + events) ──

  function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30)
      const hx = x + size * Math.cos(angle)
      const hy = y + size * Math.sin(angle)
      i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy)
    }
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  function latLngToXY(lat: number, lng: number): XY {
    return {
      x: (lng + 180) / 360 * width,
      y: (90 - lat)  / 180 * height,
    }
  }

  function fillRegion(
    ctx: CanvasRenderingContext2D,
    latMin: number, latMax: number,
    lngMin: number, lngMax: number,
    color: string,
    hexSize: number,
  ) {
    const x1   = (lngMin + 180) / 360 * width
    const x2   = (lngMax + 180) / 360 * width
    const y1   = (90 - latMax)  / 180 * height
    const y2   = (90 - latMin)  / 180 * height
    const HEX_W = hexSize * 1.5
    const HEX_H = Math.sqrt(3) * hexSize * 0.9
    const stroke = color.replace(/[\d.]+\)$/, s => String(Math.min(1, parseFloat(s) * 2) + ')'))
    for (let x = x1; x < x2; x += HEX_W) {
      for (let y = y1; y < y2; y += HEX_H) {
        drawHex(ctx, x, y, hexSize * 0.85, color, stroke)
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = width
    canvas.height = height

    // Background
    ctx.fillStyle = '#07090F'
    ctx.fillRect(0, 0, width, height)

    const HEX_SIZE = 8
    const HEX_WIDTH  = HEX_SIZE * 2
    const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE
    const COLS = Math.ceil(width  / (HEX_WIDTH  * 0.75)) + 1
    const ROWS = Math.ceil(height / HEX_HEIGHT)  + 1

    // Background hex grid
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * HEX_WIDTH * 0.75
        const y = row * HEX_HEIGHT + (col % 2 === 0 ? 0 : HEX_HEIGHT / 2)
        drawHex(ctx, x, y, HEX_SIZE, 'rgba(0,229,160,0.04)', 'rgba(0,229,160,0.08)')
      }
    }

    // Continents
    fillRegion(ctx, 35,  70,  -10,  40, 'rgba(0,229,160,0.12)', HEX_SIZE) // Europe
    fillRegion(ctx, -35, 37,  -18,  52, 'rgba(0,229,160,0.10)', HEX_SIZE) // Africa
    fillRegion(ctx, 25,  70, -170, -50, 'rgba(0,229,160,0.10)', HEX_SIZE) // N America
    fillRegion(ctx, -55, 15,  -82, -34, 'rgba(0,229,160,0.10)', HEX_SIZE) // S America
    fillRegion(ctx, 5,   75,   40, 145, 'rgba(0,229,160,0.10)', HEX_SIZE) // Asia
    fillRegion(ctx, -44,-11,  113, 154, 'rgba(0,229,160,0.10)', HEX_SIZE) // Australia

    // Connection arcs (top 6 pins)
    const topPins = [...pins].filter(p => p.count > 10).slice(0, 6)
    for (let i = 0; i < topPins.length - 1; i++) {
      const from = latLngToXY(topPins[i].lat, topPins[i].lng)
      const to   = latLngToXY(topPins[i + 1].lat, topPins[i + 1].lng)
      const cpX  = (from.x + to.x) / 2
      const cpY  = Math.min(from.y, to.y) - 60
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
      grad.addColorStop(0,   '#00E5A080')
      grad.addColorStop(0.5, '#00E5A0FF')
      grad.addColorStop(1,   '#3D8EFF80')
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(cpX, cpY, to.x, to.y)
      ctx.strokeStyle = grad
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }

    // Pins
    ctx.font = '10px JetBrains Mono, monospace'
    pins.forEach(pin => {
      const { x, y }  = latLngToXY(pin.lat, pin.lng)
      const isHovered  = pin.country === hoveredCountry
      const color      = pin.label === 'ELITE' ? '#00E5A0'
                       : pin.label === 'TOP PROSPECT' ? '#3D8EFF'
                       : '#FF9F43'
      const size = Math.min(8 + pin.count * 2, 28)

      // Outer halo
      ctx.beginPath()
      ctx.arc(x, y, size + 6, 0, Math.PI * 2)
      ctx.fillStyle = color + '20'
      ctx.fill()

      // Main circle
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = color + (isHovered ? 'FF' : 'CC')
      ctx.fill()

      // Inner glow
      ctx.shadowColor  = color
      ctx.shadowBlur   = isHovered ? 20 : 10
      ctx.beginPath()
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.shadowBlur = 0

      // Floating label for big clusters or hovered
      if (pin.count > 5 || isHovered) {
        const labelText  = `${pin.country} · ${pin.count}`
        const labelWidth = ctx.measureText(labelText).width + 20
        const labelX     = x + size + 8
        const labelY     = y - 10
        ctx.fillStyle   = 'rgba(13,18,32,0.9)'
        ctx.strokeStyle = color + '80'
        ctx.lineWidth   = 1
        roundRect(ctx, labelX, labelY, labelWidth, 22, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#E2EAF4'
        ctx.fillText(labelText, labelX + 10, labelY + 14)
        ctx.beginPath()
        ctx.moveTo(x + size, y)
        ctx.lineTo(labelX, labelY + 11)
        ctx.strokeStyle = color + '60'
        ctx.lineWidth   = 1
        ctx.stroke()
      }
    })
  }, [pins, hoveredCountry, width, height])

  // ── Mouse events ────────────────────────────────────────────────────────────
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (width  / rect.width)
    const mouseY = (e.clientY - rect.top)  * (height / rect.height)
    let found    = false
    pins.forEach(pin => {
      const { x, y } = latLngToXY(pin.lat, pin.lng)
      const dist = Math.hypot(mouseX - x, mouseY - y)
      if (dist < 20) {
        setHoveredCountry(pin.country)
        setTooltip({ x: e.clientX - rect.left + 10, y: e.clientY - rect.top - 30, text: `${pin.country} · ${pin.count} joueurs` })
        found = true
      }
    })
    if (!found) { setHoveredCountry(null); setTooltip(null) }
  }

  function handleClick() {
    if (hoveredCountry && onCountryClick) onCountryClick(hoveredCountry)
  }

  return (
    <div style={{ position: 'relative', width, height, cursor: 'crosshair' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', borderRadius: 12 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredCountry(null); setTooltip(null) }}
        onClick={handleClick}
      />
      {tooltip && (
        <div style={{
          position:   'absolute',
          left:       tooltip.x,
          top:        tooltip.y,
          background: 'rgba(13,18,32,0.95)',
          border:     '1px solid rgba(0,229,160,0.3)',
          borderRadius: 6,
          padding:    '6px 12px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   11,
          color:      '#E2EAF4',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
