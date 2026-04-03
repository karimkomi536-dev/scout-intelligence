import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlobePin {
  lat:          number
  lng:          number
  count:        number
  country:      string
  label:        string
  labelCounts?: Partial<Record<string, number>>
}

interface GlobeProps {
  pins:             GlobePin[]
  onCountryClick?:  (country: string) => void
  onHover?:         (pin: GlobePin | null, x: number, y: number) => void
  selectedCountry?: string | null
  width?:           number
  height?:          number
}

interface TooltipState {
  x:       number
  y:       number
  country: string
  count:   number
  label:   string
}

// ── Globe component ───────────────────────────────────────────────────────────

export default function Globe({
  pins,
  onCountryClick,
  onHover,
  selectedCountry,
  width  = 480,
  height = 480,
}: GlobeProps) {
  const mountRef           = useRef<HTMLDivElement>(null)
  const onHoverRef         = useRef(onHover)
  const onClickRef         = useRef(onCountryClick)
  const globeRef           = useRef<ThreeGlobe | null>(null)
  const rendererRef        = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef          = useRef<THREE.PerspectiveCamera | null>(null)
  const selectedCountryRef = useRef(selectedCountry)
  const pinsRef            = useRef(pins)

  onHoverRef.current = onHover
  onClickRef.current = onCountryClick

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // ── Re-color points when selectedCountry changes (no scene rebuild) ──────────
  useEffect(() => {
    selectedCountryRef.current = selectedCountry
    globeRef.current?.pointsData([...pinsRef.current])
  }, [selectedCountry])

  // ── Update points when pin data changes (no scene rebuild) ───────────────────
  useEffect(() => {
    pinsRef.current = pins
    globeRef.current?.pointsData([...pins])
  }, [pins])

  // ── Hover detection — React synthetic event → single state update ─────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !globeRef.current) return

    const rect    = rendererRef.current.domElement.getBoundingClientRect()
    const mouseX  = ((e.clientX - rect.left) / rect.width)  * 2 - 1
    const mouseY  = -((e.clientY - rect.top)  / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current)

    const surfaceSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 104)
    const target        = new THREE.Vector3()
    if (!raycaster.ray.intersectSphere(surfaceSphere, target)) {
      setTooltip(null)
      onHoverRef.current?.(null, 0, 0)
      return
    }

    // World hit → globe-local → lat/lng (accounts for globe rotation)
    const localPos = globeRef.current.worldToLocal(target.clone())
    const r   = localPos.length()
    const lat = 90 - Math.acos(Math.max(-1, Math.min(1, localPos.y / r))) * 180 / Math.PI
    const lng = ((Math.atan2(localPos.z, -localPos.x) * 180 / Math.PI - 180 + 540) % 360) - 180

    let nearest: GlobePin | null = null
    let minDist = 8 // degrees threshold

    for (const pin of pinsRef.current) {
      const dist = Math.sqrt((lat - pin.lat) ** 2 + (lng - pin.lng) ** 2)
      if (dist < minDist) { minDist = dist; nearest = pin }
    }

    if (nearest) {
      setTooltip({ x: e.clientX, y: e.clientY, country: nearest.country, count: nearest.count, label: nearest.label })
      onHoverRef.current?.(nearest, e.clientX, e.clientY)
    } else {
      setTooltip(null)
      onHoverRef.current?.(null, 0, 0)
    }
  }, [pins])

  // ── Main scene (rebuilds only on size or pin count change) ───────────────────
  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Scene & Camera ─────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
    camera.position.z = 280
    cameraRef.current = camera

    // ── Lighting ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 3.0))
    const sun = new THREE.DirectionalLight(0xffffff, 4.0)
    sun.position.set(300, 200, 300); scene.add(sun)
    const fill = new THREE.DirectionalLight(0x8899ff, 2.0)
    fill.position.set(-200, 100, -100); scene.add(fill)
    const rim = new THREE.DirectionalLight(0x00E5A0, 1.5)
    rim.position.set(0, -200, -200); scene.add(rim)

    // ── ThreeGlobe ─────────────────────────────────────────────────────────────
    const globe = new ThreeGlobe({ waitForGlobeReady: false, animateIn: false })
    globeRef.current = globe

    globe
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.2)
      .hexPolygonUseDots(false)
      .hexPolygonAltitude(0.02)
      .showAtmosphere(false)
      .showGraticules(false)

    // Ocean material
    const mat = globe.globeMaterial() as THREE.MeshPhongMaterial
    mat.color             = new THREE.Color(0x0D2137)
    mat.emissive          = new THREE.Color(0x061018)
    mat.emissiveIntensity = 0.3
    mat.specular          = new THREE.Color(0x1a3a5c)
    mat.shininess         = 15

    // GeoJSON continents
    fetch('/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then((data: { features: object[] }) => {
        globe
          .hexPolygonsData(data.features)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .hexPolygonColor((feat: any) => {
            const c = feat?.properties?.CONTINENT ?? ''
            switch (c) {
              case 'Europe':        return 'rgba(61,142,255,0.95)'
              case 'Africa':        return 'rgba(255,159,67,0.95)'
              case 'North America': return 'rgba(0,229,160,0.95)'
              case 'South America': return 'rgba(34,211,238,0.95)'
              case 'Asia':          return 'rgba(185,127,255,0.95)'
              case 'Oceania':       return 'rgba(255,90,90,0.95)'
              case 'Antarctica':    return 'rgba(180,200,220,0.6)'
              default:              return 'rgba(100,150,255,0.95)'
            }
          })
      })
      .catch(console.error)

    // ── Native points API ──────────────────────────────────────────────────────
    globe
      .pointsData([...pinsRef.current])
      .pointLat((p: object) => (p as GlobePin).lat)
      .pointLng((p: object) => (p as GlobePin).lng)
      .pointColor((p: object) => {
        const pin = p as GlobePin
        if (selectedCountryRef.current && pin.country === selectedCountryRef.current) return '#FFFFFF'
        switch (pin.label) {
          case 'ELITE':        return '#00E5A0'
          case 'TOP PROSPECT': return '#3D8EFF'
          default:             return '#FF9F43'
        }
      })
      .pointRadius((p: object) => {
        const pin  = p as GlobePin
        const base = Math.min(0.4 + pin.count * 0.06, 1.8)
        return selectedCountryRef.current && pin.country === selectedCountryRef.current
          ? base * 1.8
          : base
      })
      .pointAltitude((p: object) => 0.02 + (p as GlobePin).count * 0.004)
      .pointResolution(12)
      .pointsMerge(false)

    scene.add(globe)

    // ── Atmosphère (BackSide halos) ────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(106, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, transparent: true, opacity: 0.15, side: THREE.BackSide }),
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(116, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x3D8EFF, transparent: true, opacity: 0.10, side: THREE.BackSide }),
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(132, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x6030CC, transparent: true, opacity: 0.06, side: THREE.BackSide }),
    ))

    // Wireframe grille néon
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(101, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, wireframe: true, transparent: true, opacity: 0.04 }),
    ))

    // ── Controls (drag + zoom + click) ─────────────────────────────────────────
    let autoRotate = true
    let isDragging = false
    let didDrag    = false
    let prevMouse  = { x: 0, y: 0 }
    let autoTimer: ReturnType<typeof setTimeout>

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 0.93
      camera.position.z = Math.max(150, Math.min(500, camera.position.z * factor))
    }
    const onDown = (e: MouseEvent) => {
      isDragging = true
      didDrag    = false
      autoRotate = false
      clearTimeout(autoTimer)
      prevMouse  = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouse.x
      const dy = e.clientY - prevMouse.y
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) didDrag = true
      globe.rotation.y += dx * 0.005
      globe.rotation.x += dy * 0.003
      prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: MouseEvent) => {
      if (!didDrag && onClickRef.current) {
        // Reuse the same raycasting logic for click
        const rect   = renderer.domElement.getBoundingClientRect()
        const mx     = ((e.clientX - rect.left) / rect.width)  * 2 - 1
        const my     = -((e.clientY - rect.top)  / rect.height) * 2 + 1
        const ray    = new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2(mx, my), camera)
        const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 104)
        const target = new THREE.Vector3()
        if (ray.ray.intersectSphere(sphere, target)) {
          const local = globe.worldToLocal(target.clone())
          const r   = local.length()
          const lat = 90 - Math.acos(Math.max(-1, Math.min(1, local.y / r))) * 180 / Math.PI
          const lng = ((Math.atan2(local.z, -local.x) * 180 / Math.PI - 180 + 540) % 360) - 180
          let nearest: GlobePin | null = null
          let minDist = 8
          for (const pin of pinsRef.current) {
            const dist = Math.sqrt((lat - pin.lat) ** 2 + (lng - pin.lng) ** 2)
            if (dist < minDist) { minDist = dist; nearest = pin }
          }
          if (nearest) onClickRef.current(nearest.country)
        }
      }
      isDragging = false
      didDrag    = false
      autoTimer  = setTimeout(() => { autoRotate = true }, 2500)
    }
    const onLeave = () => {
      setTooltip(null)
      onHoverRef.current?.(null, 0, 0)
    }

    renderer.domElement.addEventListener('wheel',      onWheel, { passive: false })
    renderer.domElement.addEventListener('mousedown',  onDown)
    renderer.domElement.addEventListener('mouseleave', onLeave)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)

    // ── Animation loop ─────────────────────────────────────────────────────────
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (autoRotate) globe.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      globeRef.current    = null
      rendererRef.current = null
      cameraRef.current   = null
      cancelAnimationFrame(rafId)
      clearTimeout(autoTimer)
      renderer.domElement.removeEventListener('wheel',      onWheel)
      renderer.domElement.removeEventListener('mousedown',  onDown)
      renderer.domElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, pins.length])

  const pinColor = (label: string) =>
    label === 'ELITE' ? '#00E5A0' : label === 'TOP PROSPECT' ? '#3D8EFF' : '#FF9F43'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={mountRef}
        style={{
          width,
          height,
          cursor:       tooltip ? 'pointer' : 'grab',
          borderRadius: 12,
          overflow:     'hidden',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); onHoverRef.current?.(null, 0, 0) }}
      />

      {tooltip && (
        <div style={{
          position:      'fixed',
          left:           tooltip.x + 14,
          top:            tooltip.y - 44,
          background:    'rgba(7,9,15,0.97)',
          border:        '1px solid rgba(0,229,160,0.4)',
          borderRadius:   8,
          padding:       '8px 14px',
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:       12,
          color:         '#E2EAF4',
          pointerEvents: 'none',
          zIndex:         9999,
          whiteSpace:    'nowrap',
          boxShadow:     '0 0 20px rgba(0,229,160,0.15)',
          display:       'flex',
          alignItems:    'center',
          gap:            8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: pinColor(tooltip.label),
            flexShrink: 0,
            boxShadow: `0 0 6px ${pinColor(tooltip.label)}`,
          }} />
          <span style={{ color: '#fff', fontWeight: 700 }}>{tooltip.country}</span>
          <span style={{ color: '#4A5568' }}>·</span>
          <span>{tooltip.count} joueur{tooltip.count !== 1 ? 's' : ''}</span>
          <span style={{ color: '#4A5568' }}>·</span>
          <span style={{ color: pinColor(tooltip.label), fontWeight: 700 }}>{tooltip.label}</span>
        </div>
      )}
    </div>
  )
}
