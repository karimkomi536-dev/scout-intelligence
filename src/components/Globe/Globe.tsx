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

const LAND_LATLNG: [number, number][] = [
  // Europe
  [48,2],[51,0],[52,13],[48,16],[41,12],[40,-3],[38,-9],
  [51,4],[56,10],[60,11],[64,26],[59,18],[47,8],[46,14],
  [42,23],[38,22],[37,14],[53,18],[50,20],[47,19],[44,26],
  [55,37],[59,30],[56,24],[54,25],[52,21],[48,35],
  // Afrique
  [36,3],[33,-5],[14,-14],[12,-2],[5,-1],[-4,15],
  [-26,28],[-30,31],[-4,40],[15,32],[9,38],[0,37],
  [7,2],[4,18],[-11,17],[20,13],[30,31],[24,15],
  // Amérique du Nord
  [40,-74],[38,-77],[42,-83],[45,-73],[37,-122],[34,-118],
  [47,-122],[29,-95],[43,-79],[39,-105],[35,-90],[33,-84],
  [25,-80],[48,-98],[51,-114],[54,-124],[19,-99],[21,-102],
  // Amérique du Sud
  [-23,-46],[-34,-58],[-12,-77],[-16,-68],[-4,-39],
  [-8,-35],[-15,-47],[-3,-60],[5,-52],[-33,-71],[-38,-63],
  // Asie
  [35,139],[34,108],[39,116],[55,82],[43,76],[51,71],
  [23,113],[13,100],[1,103],[14,120],[22,88],[28,77],
  [19,73],[17,82],[31,121],[37,127],[35,136],[33,130],
  [60,30],[56,44],[52,55],[48,68],[43,51],[41,69],
  [38,35],[33,44],[36,52],[32,53],[25,55],[24,46],
  // Australie
  [-33,151],[-37,145],[-27,153],[-35,138],[-31,116],[-23,133],
]

function isLand(lat: number, lng: number): boolean {
  return LAND_LATLNG.some(([pLat, pLng]) => {
    return Math.sqrt((lat - pLat) ** 2 + (lng - pLng) ** 2) < 7
  })
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

    // ── Globe base sphere (sphère sombre, séparée du hexGroup) ──────────────
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x030608 }),
    )
    scene.add(globe)

    // ── Grille hexagonale sur la surface ────────────────────────────────────
    const hexGroup = new THREE.Group()
    const STEP_LAT = 8
    const STEP_LNG = 10
    const UP = new THREE.Vector3(0, 0, 1)

    for (let lat = -80; lat <= 80; lat += STEP_LAT) {
      for (let lng = -180; lng < 180; lng += STEP_LNG) {
        const land   = isLand(lat, lng)
        const center = toXYZ(lat, lng, 1.001)
        const normal = center.clone().normalize()

        // Hexagone plat
        const hexGeo = new THREE.CircleGeometry(0.042, 6)
        const hexMat = new THREE.MeshBasicMaterial({
          color:       land ? 0x3D2090 : 0x0D1128,
          transparent: true,
          opacity:     land ? 1.0 : 0.7,
          side:        THREE.DoubleSide,
        })
        const hex = new THREE.Mesh(hexGeo, hexMat)
        hex.position.copy(center)
        hex.quaternion.setFromUnitVectors(UP, normal)
        hexGroup.add(hex)

        // Contour hexagone
        const edgeGeo = new THREE.EdgesGeometry(hexGeo)
        const edgeMat = new THREE.LineBasicMaterial({
          color:       land ? 0x8060FF : 0x1A2040,
          transparent: true,
          opacity:     land ? 0.8 : 0.4,
        })
        const edge = new THREE.LineSegments(edgeGeo, edgeMat)
        edge.position.copy(center)
        edge.quaternion.setFromUnitVectors(UP, normal)
        hexGroup.add(edge)
      }
    }
    scene.add(hexGroup)
    console.log('[Globe] hexGroup children:', hexGroup.children.length)

    // ── Atmosphère néon ──────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, transparent: true, opacity: 0.04, side: THREE.FrontSide }),
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x3D8EFF, transparent: true, opacity: 0.02, side: THREE.FrontSide }),
    ))

    // ── Éclairage fort ───────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x303060, 2.0))
    const light1 = new THREE.PointLight(0x00E5A0, 3.0)
    light1.position.set(4, 3, 4)
    scene.add(light1)
    const light2 = new THREE.PointLight(0x6040FF, 2.0)
    light2.position.set(-4, -2, 3)
    scene.add(light2)
    const light3 = new THREE.DirectionalLight(0xffffff, 1.5)
    light3.position.set(2, 5, 3)
    scene.add(light3)

    // ── Pins (r=1.08, au-dessus des hexagones) ───────────────────────────────
    const pinMeshes: Array<{ mesh: THREE.Mesh; pin: GlobePin; mat: THREE.MeshPhongMaterial }> = []
    const rings: Array<{ mesh: THREE.Mesh; phase: number }> = []

    pins.forEach((pin, idx) => {
      const pos    = toXYZ(pin.lat, pin.lng, 1.08)
      const radius = Math.min(0.012 + pin.count * 0.003, 0.05)
      const color  = pinColor(pin.label)

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
        globe.rotation.y    += dx * 0.005
        globe.rotation.x    += dy * 0.005
        hexGroup.rotation.y  = globe.rotation.y
        hexGroup.rotation.x  = globe.rotation.x
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

    // ── Animation ────────────────────────────────────────────────────────────
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)

      if (stateRef.current.autoRotate) {
        globe.rotation.y    += 0.003
        hexGroup.rotation.y += 0.003
      } else {
        hexGroup.rotation.y = globe.rotation.y
        hexGroup.rotation.x = globe.rotation.x
      }

      // Pulse rings
      const t = performance.now() / 1000
      rings.forEach(({ mesh, phase }) => {
        mesh.scale.setScalar(0.8 + 0.4 * Math.sin(t * 2 + phase))
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
      const sel = selectedCountry != null && pin.country === selectedCountry
      mesh.scale.setScalar(sel ? 2 : 1)
      mat.emissiveIntensity = sel ? 1.4 : 0.6
    })
  }, [selectedCountry])

  return (
    <div
      ref={mountRef}
      style={{ width, height, cursor: 'grab', userSelect: 'none', position: 'relative' }}
    />
  )
}
