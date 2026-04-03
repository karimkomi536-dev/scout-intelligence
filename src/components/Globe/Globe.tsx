import { useEffect, useRef, useState } from 'react'
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
  const selectedCountryRef = useRef(selectedCountry)
  const pinsRef            = useRef(pins)

  onHoverRef.current = onHover
  onClickRef.current = onCountryClick

  const [tooltipContent, setTooltipContent] = useState<string | null>(null)
  const [tooltipPos,     setTooltipPos]     = useState({ x: 0, y: 0 })

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

  // ── Main scene (rebuilds only on size or pin count change) ───────────────────
  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── Scene & Camera ─────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
    camera.position.z = 280

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

    // ── Native points API — positionnement exact garanti par three-globe ───────
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

    // ── Hit detection : sphere intersection → lat/lng → pin search ─────────────
    // Raycasting against the globe sphere, then find the nearest pin by angle
    const raycaster = new THREE.Raycaster()
    const surfaceSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 104) // slightly above surface

    function getHitPin(clientX: number, clientY: number): GlobePin | null {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(
        new THREE.Vector2(
           ((clientX - rect.left) / width)  * 2 - 1,
          -((clientY - rect.top)  / height) * 2 + 1,
        ),
        camera,
      )

      const target = new THREE.Vector3()
      if (!raycaster.ray.intersectSphere(surfaceSphere, target)) return null

      // Convert world hit to globe-local space (accounts for rotation)
      const localPos = globe.worldToLocal(target.clone())
      const r   = localPos.length()
      const lat = 90 - Math.acos(Math.max(-1, Math.min(1, localPos.y / r))) * 180 / Math.PI
      const lng = ((Math.atan2(localPos.z, -localPos.x) * 180 / Math.PI - 180 + 540) % 360) - 180

      let nearest: GlobePin | null = null
      let minDist = Infinity
      const THRESHOLD = 10 // degrees

      for (const pin of pinsRef.current) {
        const dist = Math.sqrt((lat - pin.lat) ** 2 + (lng - pin.lng) ** 2)
        if (dist < THRESHOLD && dist < minDist) { minDist = dist; nearest = pin }
      }
      return nearest
    }

    // ── Controls ───────────────────────────────────────────────────────────────
    let autoRotate  = true
    let isDragging  = false
    let didDrag     = false
    let prevMouse   = { x: 0, y: 0 }
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
      if (isDragging) {
        const dx = e.clientX - prevMouse.x
        const dy = e.clientY - prevMouse.y
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) didDrag = true
        globe.rotation.y += dx * 0.005
        globe.rotation.x += dy * 0.003
        prevMouse = { x: e.clientX, y: e.clientY }
      } else {
        // Hover detection
        const pin = getHitPin(e.clientX, e.clientY)
        if (pin) {
          const label = pin.label
          setTooltipContent(`${pin.country} · ${pin.count} joueur${pin.count !== 1 ? 's' : ''} · ${label}`)
          onHoverRef.current?.(pin, e.clientX, e.clientY)
        } else {
          setTooltipContent(null)
          onHoverRef.current?.(null, 0, 0)
        }
      }
    }
    const onUp = (e: MouseEvent) => {
      if (!didDrag && onClickRef.current) {
        const pin = getHitPin(e.clientX, e.clientY)
        if (pin) onClickRef.current(pin.country)
      }
      isDragging = false
      didDrag    = false
      autoTimer  = setTimeout(() => { autoRotate = true }, 2500)
    }
    const onLeave = () => {
      setTooltipContent(null)
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
      globeRef.current = null
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

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={mountRef}
        style={{ width, height, cursor: 'grab', borderRadius: 12, overflow: 'hidden' }}
        onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
      />
      {tooltipContent && (
        <div style={{
          position:      'fixed',
          left:          tooltipPos.x + 12,
          top:           tooltipPos.y - 36,
          background:    'rgba(7,9,15,0.96)',
          border:        '1px solid rgba(0,229,160,0.4)',
          borderRadius:  8,
          padding:       '6px 12px',
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:       11,
          color:         '#E2EAF4',
          pointerEvents: 'none',
          zIndex:         1000,
          whiteSpace:    'nowrap',
          boxShadow:     '0 0 20px rgba(0,229,160,0.15)',
        }}>
          {tooltipContent}
        </div>
      )}
    </div>
  )
}
