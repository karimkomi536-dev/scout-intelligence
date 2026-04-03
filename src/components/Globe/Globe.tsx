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

// ── Land detection (rayon 5°, points étendus) ─────────────────────────────────

const LAND_POINTS: [number, number][] = [
  // === EUROPE ===
  [71,25],[70,28],[69,18],[68,20],[67,15],[66,14],[65,25],
  [64,26],[63,10],[62,6],[61,5],[60,11],[59,18],[58,7],
  [57,12],[56,10],[55,9],[54,18],[53,14],[52,5],[51,4],
  [50,8],[49,2],[48,7],[47,8],[46,8],[45,7],[44,8],
  [43,3],[42,12],[41,14],[40,16],[39,16],[38,15],[37,14],
  [36,5],[35,33],[34,33],[51,24],[50,20],[49,18],[48,22],
  [47,19],[46,20],[45,16],[44,20],[43,22],[42,23],[41,23],
  [40,22],[39,22],[38,22],[37,22],[36,22],[38,-9],[39,-8],
  [40,-4],[41,-8],[42,-8],[43,-6],[44,-1],[52,20],[53,18],
  [54,22],[55,24],[56,22],[57,22],[58,26],[59,24],[60,24],
  [61,24],[62,24],[63,24],[46,30],[47,30],[48,30],[49,30],
  // === AFRIQUE ===
  [37,10],[36,8],[35,9],[34,9],[33,11],[32,13],[31,20],
  [30,29],[29,30],[28,30],[27,30],[26,30],[25,30],[24,32],
  [23,32],[22,30],[21,29],[20,20],[19,18],[18,16],[17,14],
  [16,13],[15,12],[14,14],[13,14],[12,14],[11,14],[10,14],
  [9,8],[8,8],[7,4],[6,2],[5,2],[4,10],[3,18],[2,20],
  [1,15],[0,15],[-1,15],[-2,15],[-3,18],[-4,22],[-5,22],
  [-6,22],[-7,22],[-8,22],[-9,22],[-10,22],[-11,18],
  [-12,16],[-13,14],[-14,14],[-15,14],[-16,14],[-17,14],
  [-18,22],[-19,28],[-20,28],[-22,28],[-24,28],[-26,28],
  [-28,28],[-30,29],[-32,27],[-34,26],[-33,18],[-32,18],
  [-28,20],[-25,20],[-22,20],[-20,20],[-17,20],[-14,20],
  [36,3],[30,2],[24,3],[18,2],[12,2],[6,3],[0,3],
  // === AMERIQUE DU NORD ===
  [70,-140],[68,-136],[66,-130],[64,-124],[62,-140],
  [60,-130],[58,-130],[56,-130],[54,-130],[52,-128],
  [50,-125],[48,-124],[47,-122],[46,-122],[45,-76],
  [44,-76],[43,-79],[42,-83],[41,-74],[40,-74],[39,-77],
  [38,-77],[37,-122],[36,-121],[35,-120],[34,-118],
  [33,-117],[32,-117],[30,-98],[29,-98],[28,-97],
  [27,-97],[26,-97],[25,-80],[24,-80],[23,-82],
  [48,-98],[49,-98],[50,-98],[51,-98],[52,-98],
  [48,-90],[49,-84],[50,-84],[51,-84],[52,-84],
  [54,-84],[56,-78],[58,-78],[60,-78],[62,-78],
  [64,-83],[66,-83],[68,-83],[56,-68],[54,-66],
  [52,-66],[50,-66],[48,-70],[46,-64],[44,-66],
  [19,-99],[20,-99],[21,-87],[22,-87],[23,-87],
  [25,-77],[26,-77],[27,-77],[28,-81],[29,-81],
  // === AMERIQUE DU SUD ===
  [12,-72],[10,-67],[8,-65],[6,-60],[4,-52],[2,-52],
  [0,-50],[-2,-44],[-4,-38],[-6,-35],[-8,-35],
  [-10,-38],[-12,-42],[-14,-44],[-16,-42],[-18,-42],
  [-20,-42],[-22,-42],[-24,-46],[-26,-50],[-28,-52],
  [-30,-52],[-32,-52],[-34,-56],[-36,-58],[-38,-62],
  [-40,-64],[-42,-64],[-44,-66],[-46,-66],[-48,-68],
  [-50,-68],[-52,-70],[-54,-70],[-2,-60],[-4,-62],
  [-6,-64],[-8,-66],[-10,-68],[-12,-70],[-14,-72],
  [-16,-68],[-18,-66],[-20,-62],[-22,-56],[0,-60],
  [2,-60],[4,-60],[6,-60],[8,-72],[10,-72],
  // === ASIE ===
  [70,30],[68,30],[66,44],[64,44],[62,52],[60,52],
  [58,52],[56,52],[54,60],[52,60],[50,60],[48,68],
  [46,68],[44,68],[42,76],[40,68],[38,44],[36,36],
  [34,36],[32,36],[30,48],[28,48],[26,50],[24,46],
  [22,44],[20,44],[18,44],[16,42],[14,44],[12,44],
  [35,140],[36,140],[37,140],[38,140],[39,140],[40,140],
  [33,130],[34,130],[31,120],[30,120],[29,120],[28,116],
  [27,108],[26,108],[25,108],[24,102],[23,102],[22,102],
  [21,102],[20,102],[18,100],[16,100],[14,100],[12,100],
  [10,78],[12,78],[14,78],[16,78],[18,78],[20,78],
  [22,88],[24,88],[26,88],[28,77],[30,77],[32,77],
  [34,77],[36,72],[38,72],[40,72],[60,30],[58,28],
  [56,38],[54,38],[52,38],[50,30],[48,30],[46,30],
  [44,42],[42,42],[40,42],[38,50],[36,50],[34,50],
  [32,50],[30,50],[28,50],[26,50],[24,56],[22,58],
  [20,56],[18,42],[16,42],[14,42],[12,42],
  // === AUSTRALIE ===
  [-14,132],[-16,136],[-18,136],[-20,136],[-22,136],
  [-24,132],[-26,128],[-28,122],[-30,116],[-32,116],
  [-34,116],[-36,148],[-38,148],[-40,148],[-42,148],
  [-44,170],[-20,148],[-22,148],[-24,148],[-26,148],
  [-28,148],[-30,148],[-32,148],[-34,148],[-36,148],
  [-26,116],[-28,116],[-30,120],[-32,124],[-34,136],
  [-36,140],[-38,144],[-40,146],[-16,130],[-18,130],
  [-20,130],[-22,130],[-24,130],[-14,128],[-12,132],
]

function isLand(lat: number, lng: number): boolean {
  return LAND_POINTS.some(([pLat, pLng]) =>
    Math.sqrt((lat - pLat) ** 2 + (lng - pLng) ** 2) < 5
  )
}

// ── Canvas texture builder ────────────────────────────────────────────────────

function buildGlobeTexture(): HTMLCanvasElement {
  const W = 4096, H = 2048
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond océan
  ctx.fillStyle = '#050810'
  ctx.fillRect(0, 0, W, H)

  const R  = 14
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
        ctx.fillStyle = '#1E3A5F'
        ctx.fill()
        ctx.strokeStyle = 'rgba(100,180,255,0.9)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        // Brillance centrale
        ctx.beginPath()
        ctx.arc(x, y, R * 0.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(150,210,255,0.15)'
        ctx.fill()
      } else {
        ctx.fillStyle = '#080C1A'
        ctx.fill()
        ctx.strokeStyle = 'rgba(15,25,60,0.8)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
    row++
  }

  // Grille de coordonnées néon
  ctx.strokeStyle = 'rgba(0,229,160,0.12)'
  ctx.lineWidth = 1.5
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

    // ── Globe (texture canvas hexagonale) ──────────────────────────────────
    const texture = new THREE.CanvasTexture(buildGlobeTexture())
    const globe   = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        map:       texture,
        specular:  new THREE.Color(0x111122),
        shininess: 8,
      }),
    )

    // ── Globe group (globe + pins tournent ensemble) ───────────────────────
    const globeGroup = new THREE.Group()
    globeGroup.add(globe)
    scene.add(globeGroup)

    // ── Atmosphère style Orion (BackSide = halo vu de l'extérieur) ─────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, transparent: true, opacity: 0.08, side: THREE.BackSide }),
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x3D8EFF, transparent: true, opacity: 0.12, side: THREE.BackSide }),
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x6030CC, transparent: true, opacity: 0.06, side: THREE.BackSide }),
    ))

    // Wireframe grille style Orion
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.015, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0x00E5A0, wireframe: true, transparent: true, opacity: 0.06 }),
    ))

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

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(size * 2.5, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
      )
      halo.position.copy(pos)
      globeGroup.add(halo)

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
