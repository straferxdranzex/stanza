'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let THREE: any, GSAP: any
    let renderer: any, scene: any, camera: any, animId: number
    let keys: any[] = [], particles: any[] = []

    async function init() {
      // Dynamically import to avoid SSR issues
      const [threeModule, gsapModule] = await Promise.all([
        import('three'),
        import('gsap'),
      ])
      THREE = threeModule
      GSAP = gsapModule.gsap ?? (gsapModule as any).default

      const canvas = canvasRef.current
      if (!canvas) return

      // Renderer
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(canvas.clientWidth, canvas.clientHeight)
      renderer.setClearColor(0x000000, 0)

      // Scene
      scene = new THREE.Scene()

      // Camera
      camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
      camera.position.set(0, 2.5, 8)
      camera.lookAt(0, 0, 0)

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
      scene.add(ambientLight)

      const goldLight = new THREE.PointLight(0xC9A84C, 3, 20)
      goldLight.position.set(0, 5, 3)
      scene.add(goldLight)

      const blueLight = new THREE.PointLight(0x4466ff, 1.5, 15)
      blueLight.position.set(-5, 2, 2)
      scene.add(blueLight)

      const rimLight = new THREE.PointLight(0xffffff, 0.8, 10)
      rimLight.position.set(5, 3, -2)
      scene.add(rimLight)

      // ─── Piano keyboard ───────────────────────────────────────
      const whiteKeyMat = new THREE.MeshStandardMaterial({
        color: 0xf5edd6,
        roughness: 0.1,
        metalness: 0.05,
      })
      const blackKeyMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.15,
        metalness: 0.3,
      })
      const goldAccentMat = new THREE.MeshStandardMaterial({
        color: 0xC9A84C,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xC9A84C,
        emissiveIntensity: 0.1,
      })

      const NUM_WHITE = 22
      const WHITE_W = 0.18
      const WHITE_H = 0.22
      const WHITE_D = 1.1
      const BLACK_W = 0.11
      const BLACK_H = 0.14
      const BLACK_D = 0.68
      const totalWidth = NUM_WHITE * WHITE_W + (NUM_WHITE - 1) * 0.02
      const startX = -totalWidth / 2

      // Piano body
      const bodyGeo = new THREE.BoxGeometry(totalWidth + 0.4, 0.35, WHITE_D + 0.5)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0f,
        roughness: 0.05,
        metalness: 0.6,
      })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.position.set(0, -0.3, 0)
      scene.add(body)

      // Gold trim on piano body
      const trimGeo = new THREE.BoxGeometry(totalWidth + 0.4, 0.02, WHITE_D + 0.5)
      const trim = new THREE.Mesh(trimGeo, goldAccentMat)
      trim.position.set(0, -0.11, 0)
      scene.add(trim)

      // White keys
      const blackKeyPattern = [false, true, false, true, false, false, true, false, true, false, true, false]
      let whiteIndex = 0

      for (let i = 0; i < NUM_WHITE; i++) {
        const geo = new THREE.BoxGeometry(WHITE_W, WHITE_H, WHITE_D)
        const mesh = new THREE.Mesh(geo, whiteKeyMat.clone())
        const x = startX + i * (WHITE_W + 0.02) + WHITE_W / 2
        mesh.position.set(x, 0, 0)
        scene.add(mesh)
        keys.push({ mesh, isWhite: true, baseY: 0, index: i })
      }

      // Black keys
      const blackPositions: number[] = []
      let wi = 0
      for (let i = 0; i < NUM_WHITE; i++) {
        const noteInOctave = wi % 12
        if (blackKeyPattern[noteInOctave]) {
          const x = startX + i * (WHITE_W + 0.02) + (WHITE_W + 0.02) - BLACK_W / 2
          blackPositions.push(x)
        }
        wi++
      }

      // Simplified: place black keys at correct positions
      const blackOffsets = [0.5, 1.5, 3.5, 4.5, 5.5, 7.5, 8.5, 10.5, 11.5, 12.5, 14.5, 15.5, 17.5, 18.5, 19.5]
      blackOffsets.slice(0, 15).forEach(offset => {
        const geo = new THREE.BoxGeometry(BLACK_W, BLACK_H, BLACK_D)
        const mesh = new THREE.Mesh(geo, blackKeyMat.clone())
        const x = startX + offset * (WHITE_W + 0.02) + WHITE_W
        mesh.position.set(x, BLACK_H / 2 + WHITE_H / 2 - 0.01, -(WHITE_D - BLACK_D) / 2)
        scene.add(mesh)
        keys.push({ mesh, isWhite: false, baseY: mesh.position.y, index: offset })
      })

      // ─── Floating particles ────────────────────────────────────
      const particleGeo = new THREE.BufferGeometry()
      const positions = new Float32Array(200 * 3)
      const colors = new Float32Array(200 * 3)

      for (let i = 0; i < 200; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2
        const isGold = Math.random() > 0.5
        colors[i * 3] = isGold ? 0.788 : 0.3
        colors[i * 3 + 1] = isGold ? 0.659 : 0.4
        colors[i * 3 + 2] = isGold ? 0.298 : 1.0
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const particleMat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      })

      const particleSystem = new THREE.Points(particleGeo, particleMat)
      scene.add(particleSystem)

      // ─── Animate random key presses ───────────────────────────
      function pressRandomKey() {
        const whiteKeys = keys.filter(k => k.isWhite)
        const key = whiteKeys[Math.floor(Math.random() * whiteKeys.length)]
        if (!key) return

        // Change key color briefly
        const mat = key.mesh.material as import('three').MeshStandardMaterial
        GSAP.to(mat, {
          emissiveIntensity: 0.8,
          duration: 0.1,
          onStart: () => { mat.emissive.set(0xC9A84C) },
          onComplete: () => {
            GSAP.to(mat, { emissiveIntensity: 0, duration: 0.8 })
          }
        })

        // Press down
        GSAP.to(key.mesh.position, {
          y: key.baseY - 0.04,
          duration: 0.08,
          ease: 'power2.in',
          onComplete: () => {
            GSAP.to(key.mesh.position, { y: key.baseY, duration: 0.3, ease: 'elastic.out(1,0.5)' })
          }
        })

        // Schedule next
        setTimeout(pressRandomKey, 300 + Math.random() * 600)
      }
      setTimeout(pressRandomKey, 1000)

      // ─── Camera float animation ────────────────────────────────
      GSAP.to(camera.position, {
        y: 3.5,
        duration: 4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })

      // ─── Mouse parallax ───────────────────────────────────────
      let mouseX = 0, mouseY = 0
      function onMouseMove(e: MouseEvent) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('mousemove', onMouseMove)

      // ─── Render loop ──────────────────────────────────────────
      let t = 0
      function animate() {
        animId = requestAnimationFrame(animate)
        t += 0.005

        // Gentle camera parallax
        camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03
        camera.lookAt(0, 0, 0)

        // Rotate particles slowly
        particleSystem.rotation.y = t * 0.1
        particleSystem.rotation.x = Math.sin(t * 0.3) * 0.05

        // Gold light pulse
        goldLight.intensity = 2.5 + Math.sin(t * 2) * 0.5

        renderer.render(scene, camera)
      }
      animate()

      // Resize handler
      function onResize() {
        if (!canvas) return
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h, false)
      }
      window.addEventListener('resize', onResize)

      // Entry animation — fade piano in
      scene.children.forEach((child: any, i: number) => {
        if (child !== particleSystem) {
          child.scale.set(0, 0, 0)
          GSAP.to(child.scale, {
            x: 1, y: 1, z: 1,
            duration: 1.2,
            delay: 0.5 + i * 0.03,
            ease: 'elastic.out(1, 0.6)',
          })
        }
      })
    }

    init()

    return () => {
      cancelAnimationFrame(animId)
      if (renderer) renderer.dispose()
    }
  }, [])

  // GSAP text animations
  useEffect(() => {
    async function animateText() {
      const gsapModule = await import('gsap')
      const gsap = gsapModule.gsap ?? (gsapModule as any).default

      gsap.fromTo('.hero-badge', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3 })
      gsap.fromTo('.hero-h1 span', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, delay: 0.5, stagger: 0.12, ease: 'power3.out' })
      gsap.fromTo('.hero-sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, delay: 1.0 })
      gsap.fromTo('.hero-ctas', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, delay: 1.2 })
      gsap.fromTo('.hero-stats', { opacity: 0 }, { opacity: 1, duration: 1, delay: 1.6 })
    }
    animateText()
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1a1520] via-[#07070d] to-[#050508]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Three.js canvas */}
      <div className="absolute inset-x-0 bottom-0 h-[65%]">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        {/* Fade to dark at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050508] to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-28 pb-48">
        {/* Badge */}
        <div className="hero-badge opacity-0 inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-xs text-[#C9A84C] font-medium tracking-wide uppercase">
            Art &amp; Music Lessons Online
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-h1 text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6 tracking-tight">
          <span className="inline-block opacity-0">Master</span>{' '}
          <span className="inline-block opacity-0">Your</span>{' '}
          <br />
          <span className="inline-block opacity-0 gradient-text">Art</span>{' '}
          <span className="inline-block opacity-0">Online</span>
        </h1>

        {/* Subhead */}
        <p className="hero-sub opacity-0 text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect with world-class teachers for Piano, Violin, Cello, Animation &amp; 2D Art.
          Book lessons in seconds, learn at your own pace via Zoom, and grow from beginner to master.
        </p>

        {/* CTAs */}
        <div className="hero-ctas opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/register?role=student" className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto">
            Start learning today
          </Link>
          <Link href="/teachers" className="btn-ghost px-8 py-3.5 text-base w-full sm:w-auto">
            Browse teachers →
          </Link>
        </div>

        {/* Stats row */}
        <div className="hero-stats opacity-0 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {[
            { value: '2,400+', label: 'Students enrolled' },
            { value: '180+', label: 'Verified teachers' },
            { value: '4.9★', label: 'Average rating' },
            { value: '50k+', label: 'Lessons taught' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
        <span className="text-xs text-white/50 tracking-widest uppercase">Scroll</span>
        <div className="w-0.5 h-8 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  )
}
