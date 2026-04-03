import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface GlobePin {
  lat:     number
  lng:     number
  count:   number
  country: string
  label:   string
}

interface GlobeProps {
  pins:            GlobePin[]
  onCountryClick?: (country: string) => void
  width?:          number
  height?:         number
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
  if (label === 'ELITE')         return 0x00e5a0
  if (label === 'TOP PROSPECT')  return 0x3d8eff
  return 0xff9f43
}

export default function Globe({
  pins,
  onCountryClick,
  width  = 600,
  height = 500,
}: GlobeProps) {
  const mountRef   = useRef<HTMLDivElement>(null)
  const stateRef   = useRef({
    autoRotate: true,
    isDragging: false,
    prevMouse:  { x: 0, y: 0 },
  })

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.z = 2.8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // ── Globe ──────────────────────────────────────────────────────────────
    const globeGeo  = new THREE.SphereGeometry(1, 64, 64)
    const loader    = new THREE.TextureLoader()
    const texture   = loader.load(
      'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
      () => renderer.render(scene, camera),
    )
    const globeMat  = new THREE.MeshPhongMaterial({ map: texture })
    const globe     = new THREE.Mesh(globeGeo, globeMat)
    scene.add(globe)

    // ── Atmosphere ─────────────────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.02, 64, 64)
    const atmMat = new THREE.MeshPhongMaterial({
      color:       0x00e5a0,
      transparent: true,
      opacity:     0.04,
      side:        THREE.FrontSide,
    })
    globe.add(new THREE.Mesh(atmGeo, atmMat))

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 3, 5)
    scene.add(dirLight)

    // ── Pins ───────────────────────────────────────────────────────────────
    const pinMeshes: Array<{ mesh: THREE.Mesh; pin: GlobePin }> = []

    pins.forEach(pin => {
      const pos    = toXYZ(pin.lat, pin.lng)
      const radius = Math.min(0.012 + pin.count * 0.003, 0.05)
      const geo    = new THREE.SphereGeometry(radius, 16, 16)
      const mat    = new THREE.MeshPhongMaterial({
        color:     pinColor(pin.label),
        emissive:  pinColor(pin.label),
        emissiveIntensity: 0.4,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      globe.add(mesh)
      pinMeshes.push({ mesh, pin })
    })

    // ── Raycaster ──────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    const getCanvasPos = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      if (e instanceof MouseEvent) {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }
      const t = (e as TouchEvent).touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }

    const handleClick = (e: MouseEvent) => {
      if (!onCountryClick) return
      const { x, y } = getCanvasPos(e)
      mouse.x =  (x / width)  * 2 - 1
      mouse.y = -(y / height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(pinMeshes.map(p => p.mesh))
      if (hits.length > 0) {
        const hit = pinMeshes.find(p => p.mesh === hits[0].object)
        if (hit) onCountryClick(hit.pin.country)
      }
    }

    // ── Drag rotation ──────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging  = true
      stateRef.current.autoRotate  = false
      stateRef.current.prevMouse   = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return
      const dx = e.clientX - stateRef.current.prevMouse.x
      const dy = e.clientY - stateRef.current.prevMouse.y
      globe.rotation.y += dx * 0.005
      globe.rotation.x += dy * 0.005
      stateRef.current.prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => {
      stateRef.current.isDragging = false
      // resume auto-rotate after 2 s of inactivity
      setTimeout(() => { stateRef.current.autoRotate = true }, 2000)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup',   onMouseUp)
    renderer.domElement.addEventListener('click',     handleClick)

    // ── Animation loop ─────────────────────────────────────────────────────
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (stateRef.current.autoRotate) globe.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup',   onMouseUp)
      renderer.domElement.removeEventListener('click',     handleClick)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, pins.length])

  return (
    <div
      ref={mountRef}
      style={{ width, height, cursor: 'grab', userSelect: 'none' }}
    />
  )
}
