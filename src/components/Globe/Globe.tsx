import { useEffect, useRef } from 'react'
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

// three-globe uses radius = 100 units by default
const R = 100

function toVec3(lat: number, lng: number, r = R + 2): THREE.Vector3 {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
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
  const mountRef   = useRef<HTMLDivElement>(null)
  const onHoverRef = useRef(onHover)
  const onClickRef = useRef(onCountryClick)
  onHoverRef.current = onHover
  onClickRef.current = onCountryClick

  const pinMeshesRef = useRef<Array<{ mesh: THREE.Mesh; pin: GlobePin }>>([])

  // Reactive: highlight selected country pin without rebuilding scene
  useEffect(() => {
    pinMeshesRef.current.forEach(({ mesh, pin }) => {
      mesh.scale.setScalar(selectedCountry != null && pin.country === selectedCountry ? 2.2 : 1)
    })
  }, [selectedCountry])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    pinMeshesRef.current = []

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

    // ── ThreeGlobe (hexagones GeoJSON sur sphère) ──────────────────────────────
    const globe = new ThreeGlobe({ waitForGlobeReady: false, animateIn: false })
    globe
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.3)
      .hexPolygonUseDots(false)
      .hexPolygonAltitude(0.005)
      .showAtmosphere(false)
      .showGraticules(false)

    // Ocean material
    const mat = globe.globeMaterial() as THREE.MeshPhongMaterial
    mat.color            = new THREE.Color(0x0D2137)
    mat.emissive         = new THREE.Color(0x061018)
    mat.emissiveIntensity = 0.3
    mat.specular         = new THREE.Color(0x1a3a5c)
    mat.shininess        = 15

    // Load GeoJSON countries (served from /public)
    fetch('/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then((data: { features: object[] }) => {
        globe
          .hexPolygonsData(data.features)
          .hexPolygonMargin(0.2)
          .hexPolygonAltitude(0.02)
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
              case 'Antarctica':    return 'rgba(180,200,220,0.95)'
              default:              return 'rgba(100,150,255,0.95)'
            }
          })
      })
      .catch(console.error)

    scene.add(globe)

    // ── Atmosphère style Orion (BackSide = halo vu de l'extérieur) ─────────────
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

    // Wireframe grille néon (tourne avec le globe)
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(101, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, wireframe: true, transparent: true, opacity: 0.04 }),
    ))

    // ── Pins joueurs ───────────────────────────────────────────────────────────
    const pinObjects: Array<{ mesh: THREE.Mesh; pin: GlobePin }> = []

    pins.forEach(pin => {
      const pos   = toVec3(pin.lat, pin.lng)
      const color = pin.label === 'ELITE'        ? 0x00E5A0
                  : pin.label === 'TOP PROSPECT' ? 0x3D8EFF
                  : 0xFF9F43
      const size  = Math.min(1.8 + pin.count * 0.3, 5)

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(size * 2.5, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
      )
      halo.position.copy(pos)
      globe.add(halo)

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 12),
        new THREE.MeshBasicMaterial({ color }),
      )
      mesh.position.copy(pos)
      mesh.userData = { country: pin.country }
      globe.add(mesh)
      pinObjects.push({ mesh, pin })
    })

    pinMeshesRef.current = pinObjects

    // ── Controls ───────────────────────────────────────────────────────────────
    let autoRotate = true
    let isDragging = false
    let prevMouse  = { x: 0, y: 0 }
    let autoTimer: ReturnType<typeof setTimeout>

    // Zoom molette
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 0.93
      camera.position.z = Math.max(150, Math.min(600, camera.position.z * factor))
    }

    const onDown = (e: MouseEvent) => {
      isDragging = true
      autoRotate = false
      clearTimeout(autoTimer)
      prevMouse  = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevMouse.x
        const dy = e.clientY - prevMouse.y
        globe.rotation.y += dx * 0.005
        globe.rotation.x += dy * 0.003
        prevMouse = { x: e.clientX, y: e.clientY }
      }
      if (onHoverRef.current) {
        const rect = renderer.domElement.getBoundingClientRect()
        const mx   = ((e.clientX - rect.left) / width)  * 2 - 1
        const my   = -((e.clientY - rect.top)  / height) * 2 + 1
        const ray  = new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2(mx, my), camera)
        const hits = ray.intersectObjects(pinObjects.map(p => p.mesh))
        if (hits.length > 0) {
          const found = pinObjects.find(p => p.mesh === hits[0].object)
          if (found) onHoverRef.current(found.pin, e.clientX - rect.left, e.clientY - rect.top)
        } else {
          onHoverRef.current(null, 0, 0)
        }
      }
    }
    const onUp    = () => { isDragging = false; autoTimer = setTimeout(() => { autoRotate = true }, 2500) }
    const onLeave = () => { onHoverRef.current?.(null, 0, 0) }

    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()
    const onClick   = (e: MouseEvent) => {
      if (!onClickRef.current || isDragging) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(pinObjects.map(p => p.mesh))
      if (hits.length > 0) {
        const found = pinObjects.find(p => p.mesh === hits[0].object)
        if (found) onClickRef.current(found.pin.country)
      }
    }

    renderer.domElement.addEventListener('wheel',      onWheel, { passive: false })
    renderer.domElement.addEventListener('mousedown',  onDown)
    window.addEventListener('mousemove',               onMove)
    window.addEventListener('mouseup',                 onUp)
    renderer.domElement.addEventListener('mouseleave', onLeave)
    renderer.domElement.addEventListener('click',      onClick)

    // ── Animation loop ─────────────────────────────────────────────────────────
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (autoRotate) globe.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(autoTimer)
      renderer.domElement.removeEventListener('wheel',      onWheel)
      renderer.domElement.removeEventListener('mousedown',  onDown)
      window.removeEventListener('mousemove',               onMove)
      window.removeEventListener('mouseup',                 onUp)
      renderer.domElement.removeEventListener('mouseleave', onLeave)
      renderer.domElement.removeEventListener('click',      onClick)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, pins.length])

  return (
    <div
      ref={mountRef}
      style={{ width, height, cursor: 'grab', borderRadius: 12, overflow: 'hidden' }}
    />
  )
}
