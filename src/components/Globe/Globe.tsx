import { useEffect, useRef } from 'react'
import * as THREE from 'three'

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

// ── Land detection ────────────────────────────────────────────────────────────

const LAND_POINTS: [number, number][] = [
  [48,2],[51,0],[52,13],[48,16],[41,12],[40,-3],[38,-9],
  [51,4],[56,10],[60,11],[64,26],[59,18],[47,8],[46,14],
  [42,23],[38,22],[37,14],[53,18],[50,20],[47,19],[44,26],
  [55,37],[59,30],[56,24],[54,25],[52,21],[48,35],[60,30],
  [36,3],[33,-5],[14,-14],[12,-2],[5,-1],[-4,15],
  [-26,28],[-30,31],[-4,40],[15,32],[9,38],[0,37],
  [7,2],[4,18],[-11,17],[20,13],[30,31],[24,15],[16,43],
  [40,-74],[38,-77],[42,-83],[45,-73],[37,-122],[34,-118],
  [47,-122],[29,-95],[43,-79],[39,-105],[35,-90],[33,-84],
  [25,-80],[48,-98],[51,-114],[54,-124],[19,-99],[21,-102],
  [-23,-46],[-34,-58],[-12,-77],[-16,-68],[-4,-39],
  [-8,-35],[-15,-47],[-3,-60],[5,-52],[-33,-71],[-38,-63],
  [35,139],[34,108],[39,116],[55,82],[43,76],[51,71],
  [23,113],[13,100],[1,103],[14,120],[22,88],[28,77],
  [19,73],[17,82],[31,121],[37,127],[35,136],[33,130],
  [56,44],[52,55],[48,68],[43,51],[41,69],[38,35],
  [33,44],[36,52],[32,53],[25,55],[24,46],[21,39],
  [-33,151],[-37,145],[-27,153],[-35,138],[-31,116],[-23,133],
]

function isLand(lat: number, lng: number): boolean {
  return LAND_POINTS.some(([pLat, pLng]) =>
    Math.sqrt((lat - pLat) ** 2 + (lng - pLng) ** 2) < 7
  )
}

// ── Canvas texture builder ────────────────────────────────────────────────────

function buildGlobeTexture(): HTMLCanvasElement {
  const W = 2048, H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond océan
  ctx.fillStyle = '#060914'
  ctx.fillRect(0, 0, W, H)

  // Grille hexagonale
  const R = 18
  const HW = R * Math.sqrt(3)
  const HH = R * 1.5

  let row = 0
  for (let y = R; y < H + R; y += HH) {
    const offset = row % 2 === 1 ? HW / 2 : 0
    for (let x = offset; x < W + HW; x += HW) {
      const lng  = (x / W) * 360 - 180
      const lat  = 90 - (y / H) * 180
      const land = isLand(lat, lng)

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const hx = x + (R - 1) * Math.cos(angle)
        const hy = y + (R - 1) * Math.sin(angle)
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy)
      }
      ctx.closePath()

      if (land) {
        ctx.fillStyle = '#1C1050'
        ctx.fill()
        ctx.strokeStyle = 'rgba(100,70,220,0.7)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      } else {
        ctx.fillStyle = '#080C1A'
        ctx.fill()
        ctx.strokeStyle = 'rgba(20,35,80,0.5)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
    row++
  }

  // Grille de coordonnées néon
  ctx.strokeStyle = 'rgba(0,229,160,0.07)'
  ctx.lineWidth = 0.8
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath(); ctx.moveTo(i * W / 12, 0); ctx.lineTo(i * W / 12, H); ctx.stroke()
  }
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * H / 6); ctx.lineTo(W, i * H / 6); ctx.stroke()
  }

  return canvas
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
  const mountRef    = useRef<HTMLDivElement>(null)
  const onHoverRef  = useRef(onHover)
  const onClickRef  = useRef(onCountryClick)
  onHoverRef.current  = onHover
  onClickRef.current  = onCountryClick

  const pinMeshesRef = useRef<Array<{ mesh: THREE.Mesh; pin: GlobePin }>>([])

  // Selected-country glow (reactive, no scene rebuild)
  useEffect(() => {
    pinMeshesRef.current.forEach(({ mesh, pin }) => {
      const sel = selectedCountry != null && pin.country === selectedCountry
      mesh.scale.setScalar(sel ? 2.2 : 1)
    })
  }, [selectedCountry])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    pinMeshesRef.current = []

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 2.6

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── Globe texture ──────────────────────────────────────────────────────
    const texture = new THREE.CanvasTexture(buildGlobeTexture())
    const globe   = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        map:       texture,
        specular:  new THREE.Color(0x111111),
        shininess: 5,
      }),
    )

    // ── Atmosphère ─────────────────────────────────────────────────────────
    const atm1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.04, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, transparent: true, opacity: 0.06, side: THREE.FrontSide }),
    )
    const atm2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.10, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x3D8EFF, transparent: true, opacity: 0.025, side: THREE.FrontSide }),
    )

    // ── Globe group (globe + pins tournent ensemble) ───────────────────────
    const globeGroup = new THREE.Group()
    globeGroup.add(globe)
    scene.add(globeGroup)
    scene.add(atm1)   // atmosphère fixe
    scene.add(atm2)

    // ── Éclairage ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x222244, 2.0))
    const light1 = new THREE.DirectionalLight(0x00E5A0, 1.2)
    light1.position.set(3, 2, 4); scene.add(light1)
    const light2 = new THREE.DirectionalLight(0x3D8EFF, 0.8)
    light2.position.set(-4, -1, 2); scene.add(light2)
    const light3 = new THREE.DirectionalLight(0xffffff, 0.6)
    light3.position.set(0, 4, 1); scene.add(light3)

    // ── Pins ───────────────────────────────────────────────────────────────
    const toVec3 = (lat: number, lng: number, r = 1.05) => {
      const phi   = (90 - lat) * Math.PI / 180
      const theta = (lng + 180) * Math.PI / 180
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta),
      )
    }

    const pinObjects: Array<{ mesh: THREE.Mesh; pin: GlobePin }> = []

    pins.forEach(pin => {
      const pos   = toVec3(pin.lat, pin.lng)
      const color = pin.label === 'ELITE'        ? 0x00E5A0
                  : pin.label === 'TOP PROSPECT' ? 0x3D8EFF
                  : 0xFF9F43
      const size  = Math.min(0.018 + pin.count * 0.003, 0.045)

      // Halo
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(size * 2.5, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
      )
      halo.position.copy(pos)
      globeGroup.add(halo)

      // Pin
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 12),
        new THREE.MeshBasicMaterial({ color }),
      )
      mesh.position.copy(pos)
      mesh.userData = { country: pin.country }
      globeGroup.add(mesh)
      pinObjects.push({ mesh, pin })
    })

    pinMeshesRef.current = pinObjects

    // ── Interaction ────────────────────────────────────────────────────────
    let autoRotate = true
    let isDragging = false
    let prevMouse  = { x: 0, y: 0 }
    let autoTimer: ReturnType<typeof setTimeout>

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
        globeGroup.rotation.y += dx * 0.005
        globeGroup.rotation.x += dy * 0.003
        prevMouse = { x: e.clientX, y: e.clientY }
      }
      // Hover
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
    const onUp = () => {
      isDragging = false
      autoTimer  = setTimeout(() => { autoRotate = true }, 2500)
    }
    const onLeave = () => { onHoverRef.current?.(null, 0, 0) }

    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()
    const onClick   = (e: MouseEvent) => {
      if (!onClickRef.current) return
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

    renderer.domElement.addEventListener('mousedown',  onDown)
    window.addEventListener('mousemove',               onMove)
    window.addEventListener('mouseup',                 onUp)
    renderer.domElement.addEventListener('mouseleave', onLeave)
    renderer.domElement.addEventListener('click',      onClick)

    // ── Animation ──────────────────────────────────────────────────────────
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (autoRotate) globeGroup.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(autoTimer)
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
