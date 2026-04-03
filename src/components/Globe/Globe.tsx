import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface GlobePin {
  lat:         number
  lng:         number
  count:       number
  country:     string
  label:       string
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

function toXYZ(lat: number, lng: number, r = 1.02): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

function pinColor(label: string): number {
  if (label === 'ELITE')        return 0x00e5a0
  if (label === 'TOP PROSPECT') return 0x3d8eff
  return 0xff9f43
}

export default function Globe({
  pins,
  onCountryClick,
  onHover,
  selectedCountry,
  width  = 600,
  height = 500,
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  const onHoverRef   = useRef(onHover)
  const onClickRef   = useRef(onCountryClick)
  onHoverRef.current = onHover
  onClickRef.current = onCountryClick

  const stateRef = useRef({
    autoRotate: true,
    isDragging: false,
    prevMouse:  { x: 0, y: 0 },
  })

  const pinMeshesRef = useRef<Array<{
    mesh: THREE.Mesh
    pin:  GlobePin
    mat:  THREE.MeshPhongMaterial
  }>>([])

  // ── Main scene ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    pinMeshesRef.current = []

    // Scene & camera
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.z = 2.8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // Globe mesh — custom canvas texture (no external URL)
    const globeGeo = new THREE.SphereGeometry(1, 64, 64)

    const canvas2d = document.createElement('canvas')
    canvas2d.width = 2048; canvas2d.height = 1024
    const ctx2d = canvas2d.getContext('2d')!

    // Fond océan très sombre
    const oceanGrad = ctx2d.createLinearGradient(0, 0, 0, 1024)
    oceanGrad.addColorStop(0, '#010810')
    oceanGrad.addColorStop(0.5, '#020C18')
    oceanGrad.addColorStop(1, '#010810')
    ctx2d.fillStyle = oceanGrad
    ctx2d.fillRect(0, 0, 2048, 1024)

    // Dessine les continents approximatifs
    ctx2d.fillStyle = '#0D1F14'
    // Europe + Asie
    ctx2d.fillRect(750, 100, 900, 400)
    // Afrique
    ctx2d.fillRect(820, 350, 350, 450)
    // Amérique du Nord
    ctx2d.fillRect(50, 80, 500, 400)
    // Amérique du Sud
    ctx2d.fillRect(150, 450, 350, 420)
    // Australie
    ctx2d.fillRect(1600, 450, 300, 250)

    // Grille de coordonnées néon
    ctx2d.strokeStyle = 'rgba(0,229,160,0.06)'
    ctx2d.lineWidth = 1
    for (let i = 0; i <= 12; i++) {
      const x = i * (2048 / 12)
      ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, 1024); ctx2d.stroke()
    }
    for (let i = 0; i <= 6; i++) {
      const y = i * (1024 / 6)
      ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(2048, y); ctx2d.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas2d)
    const globeMat = new THREE.MeshPhongMaterial({
      map:               texture,
      emissive:          new THREE.Color(0x001508),
      emissiveIntensity: 0.3,
      shininess:         5,
    })
    const globe = new THREE.Mesh(globeGeo, globeMat)
    scene.add(globe)

    // Atmosphere — inner green glow
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.08, side: THREE.FrontSide }),
    ))
    // Atmosphere — outer blue halo
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x3d8eff, transparent: true, opacity: 0.03, side: THREE.FrontSide }),
    ))

    // Lights — neon scheme
    scene.add(new THREE.AmbientLight(0x0a1520, 0.8))
    const greenLight = new THREE.PointLight(0x00e5a0, 0.6)
    greenLight.position.set(3, 2, 3)
    scene.add(greenLight)
    const blueLight = new THREE.PointLight(0x3d8eff, 0.3)
    blueLight.position.set(-3, -1, 2)
    scene.add(blueLight)

    // Coordinate grid
    const gridPoints: THREE.Vector3[] = []
    const GRID_STEPS = 64
    for (const lat of [-60, -30, 0, 30, 60]) {
      for (let i = 0; i < GRID_STEPS; i++) {
        const a1 = (i / GRID_STEPS) * 360 - 180
        const a2 = ((i + 1) / GRID_STEPS) * 360 - 180
        gridPoints.push(toXYZ(lat, a1, 1.002), toXYZ(lat, a2, 1.002))
      }
    }
    for (let lng = 0; lng < 360; lng += 30) {
      const l = lng - 180
      for (let i = 0; i < GRID_STEPS; i++) {
        const a1 = (i / GRID_STEPS) * 180 - 90
        const a2 = ((i + 1) / GRID_STEPS) * 180 - 90
        gridPoints.push(toXYZ(a1, l, 1.002), toXYZ(a2, l, 1.002))
      }
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00e5a0, transparent: true, opacity: 0.06 })
    globe.add(new THREE.LineSegments(gridGeo, gridMat))

    // Pins + ring halos
    const pinMeshes: Array<{ mesh: THREE.Mesh; pin: GlobePin; mat: THREE.MeshPhongMaterial }> = []
    const rings: Array<{ mesh: THREE.Mesh; phase: number }> = []

    pins.forEach((pin, idx) => {
      const pos    = toXYZ(pin.lat, pin.lng)
      const radius = Math.min(0.012 + pin.count * 0.003, 0.05)
      const color  = pinColor(pin.label)

      // Pin sphere
      const mat  = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat)
      mesh.position.copy(pos)
      globe.add(mesh)
      pinMeshes.push({ mesh, pin, mat })

      // Ring halo
      const ringGeo = new THREE.RingGeometry(radius * 1.8, radius * 2.8, 32)
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      const ring    = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(pos)
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize())
      globe.add(ring)
      rings.push({ mesh: ring, phase: idx * 0.7 })
    })

    pinMeshesRef.current = pinMeshes

    // Raycaster
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    // Events
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true
      stateRef.current.autoRotate = false
      stateRef.current.prevMouse  = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isDragging) {
        const dx = e.clientX - stateRef.current.prevMouse.x
        const dy = e.clientY - stateRef.current.prevMouse.y
        globe.rotation.y += dx * 0.005
        globe.rotation.x += dy * 0.005
        stateRef.current.prevMouse = { x: e.clientX, y: e.clientY }
      }
      if (onHoverRef.current) {
        const rect = renderer.domElement.getBoundingClientRect()
        const x    = e.clientX - rect.left
        const y    = e.clientY - rect.top
        mouse.x    =  (x / width)  * 2 - 1
        mouse.y    = -(y / height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(pinMeshes.map(p => p.mesh))
        if (hits.length > 0) {
          const hit = pinMeshes.find(p => p.mesh === hits[0].object)
          if (hit) onHoverRef.current(hit.pin, x, y)
        } else {
          onHoverRef.current(null, 0, 0)
        }
      }
    }
    const onMouseUp    = () => { stateRef.current.isDragging = false; setTimeout(() => { stateRef.current.autoRotate = true }, 2000) }
    const onMouseLeave = () => { onHoverRef.current?.(null, 0, 0) }
    const handleClick  = (e: MouseEvent) => {
      if (!onClickRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      const x    = e.clientX - rect.left
      const y    = e.clientY - rect.top
      mouse.x    =  (x / width)  * 2 - 1
      mouse.y    = -(y / height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(pinMeshes.map(p => p.mesh))
      if (hits.length > 0) {
        const hit = pinMeshes.find(p => p.mesh === hits[0].object)
        if (hit) onClickRef.current(hit.pin.country)
      }
    }

    renderer.domElement.addEventListener('mousedown',  onMouseDown)
    renderer.domElement.addEventListener('mousemove',  onMouseMove)
    renderer.domElement.addEventListener('mouseup',    onMouseUp)
    renderer.domElement.addEventListener('mouseleave', onMouseLeave)
    renderer.domElement.addEventListener('click',      handleClick)

    // Animation loop
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (stateRef.current.autoRotate) globe.rotation.y += 0.003
      // Pulse rings
      const t = performance.now() / 1000
      rings.forEach(({ mesh, phase }) => {
        const s = 0.8 + 0.4 * Math.sin(t * 2 + phase)
        mesh.scale.setScalar(s)
      })
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      renderer.domElement.removeEventListener('mousedown',  onMouseDown)
      renderer.domElement.removeEventListener('mousemove',  onMouseMove)
      renderer.domElement.removeEventListener('mouseup',    onMouseUp)
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave)
      renderer.domElement.removeEventListener('click',      handleClick)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, pins.length])

  // Selected-country glow
  useEffect(() => {
    pinMeshesRef.current.forEach(({ mesh, pin, mat }) => {
      const isSelected = selectedCountry != null && pin.country === selectedCountry
      mesh.scale.setScalar(isSelected ? 2 : 1)
      mat.emissiveIntensity = isSelected ? 1.4 : 0.6
    })
  }, [selectedCountry])

  return (
    <div
      ref={mountRef}
      style={{ width, height, cursor: 'grab', userSelect: 'none', position: 'relative' }}
    />
  )
}
