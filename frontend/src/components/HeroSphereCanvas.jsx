import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function HeroSphereCanvas({ nodeCount = '14,904' }) {
  const mountRef = useRef(null)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Reduced motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setHasWebGL(false)
      return
    }

    // Canvas dimensions (260px square)
    const size = 260
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 3.6

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      mount.appendChild(renderer.domElement)
    } catch (e) {
      setHasWebGL(false)
      return
    }

    // ── 1. Central Core Sphere with Custom ShaderMaterial (Fresnel Rim + Swirl) ──
    const sphereGeo = new THREE.SphereGeometry(1.0, 48, 48)
    const sphereShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRimColor: { value: new THREE.Color('#3B82F6') },
        uCoreColor: { value: new THREE.Color('#030A1F') },
        uHighlight: { value: new THREE.Color('#93C5FD') },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          vPosition = position;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uRimColor;
        uniform vec3 uCoreColor;
        uniform vec3 uHighlight;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vPosition;

        void main() {
          float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float rim = pow(fresnel, 2.8);
          float softGlow = pow(fresnel, 1.4) * 0.45;

          // Subtle internal wave noise
          float wave = sin(vPosition.y * 5.0 + uTime * 1.5) * 0.5 + 0.5;
          float wave2 = cos(vPosition.x * 4.0 - uTime * 1.2) * 0.5 + 0.5;
          vec3 internalSwirl = mix(uCoreColor, uRimColor * 0.4, wave * wave2 * 0.5);

          vec3 finalColor = mix(internalSwirl, uRimColor, rim);
          finalColor += uHighlight * pow(fresnel, 5.0) * 0.8;

          float alpha = clamp(0.75 + rim * 0.35, 0.0, 1.0);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
    })
    const coreSphere = new THREE.Mesh(sphereGeo, sphereShaderMat)
    scene.add(coreSphere)

    // ── 2. 8 to 10 Thin Ribbon Loops (LineLoop tilted ellipses with noise) ──
    const ribbonGroup = new THREE.Group()
    const ribbonCount = 9
    const ribbons = []

    for (let i = 0; i < ribbonCount; i++) {
      const radius = 1.03 + (i / ribbonCount) * 0.16 // Radii 1.03 to 1.19
      const points = []
      const segments = 120

      // Slightly deformed tilted ellipse
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2
        const rNoise = 1.0 + Math.sin(theta * 3.0 + i) * 0.025
        const x = Math.cos(theta) * radius * rNoise
        const y = Math.sin(theta) * (radius * 0.94) * rNoise
        const z = Math.sin(theta * 2.0) * 0.08
        points.push(new THREE.Vector3(x, y, z))
      }

      const loopGeo = new THREE.BufferGeometry().setFromPoints(points)
      // Colors from deep blue to near-white
      const colorMix = i / (ribbonCount - 1)
      const ribbonColor = new THREE.Color().lerpColors(
        new THREE.Color('#2563EB'),
        new THREE.Color('#E0F2FE'),
        colorMix
      )

      const loopMat = new THREE.LineBasicMaterial({
        color: ribbonColor,
        transparent: true,
        opacity: 0.55 + colorMix * 0.35,
        blending: THREE.AdditiveBlending,
        linewidth: 1,
      })

      const lineLoop = new THREE.LineLoop(loopGeo, loopMat)

      // Tilt each ellipse on different axes
      lineLoop.rotation.x = (i * Math.PI) / 4 + (i * 0.2)
      lineLoop.rotation.y = (i * Math.PI) / 3.5
      lineLoop.rotation.z = i * 0.45

      const speedX = (0.2 + (i % 3) * 0.12) * (i % 2 === 0 ? 1 : -1)
      const speedY = (0.15 + (i % 4) * 0.08) * (i % 2 === 0 ? -1 : 1)

      ribbonGroup.add(lineLoop)
      ribbons.push({ loop: lineLoop, speedX, speedY })
    }
    scene.add(ribbonGroup)

    // ── 3. Shell of ~1,500 Tiny Luminous Points ──
    const pointCount = 1400
    const pointPositions = new Float32Array(pointCount * 3)
    for (let i = 0; i < pointCount; i++) {
      // Points on a spherical shell of radius 1.12 to 1.35
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 1.12 + Math.random() * 0.24

      pointPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pointPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pointPositions[i * 3 + 2] = r * Math.cos(phi)
    }

    const pointGeo = new THREE.BufferGeometry()
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
    const pointMat = new THREE.PointsMaterial({
      color: '#60A5FA',
      size: 0.022,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    })
    const pointCloud = new THREE.Points(pointGeo, pointMat)
    scene.add(pointCloud)

    // ── 4. Soft Outer Halo (Glow Sprite) ──
    const createHaloTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.45)')
      grad.addColorStop(0.35, 'rgba(37, 99, 235, 0.18)')
      grad.addColorStop(0.7, 'rgba(29, 78, 216, 0.05)')
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 128, 128)
      return new THREE.CanvasTexture(canvas)
    }

    const haloMat = new THREE.SpriteMaterial({
      map: createHaloTexture(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
    })
    const haloSprite = new THREE.Sprite(haloMat)
    haloSprite.scale.set(3.2, 3.2, 1.0)
    scene.add(haloSprite)

    // ── 5. Mouse Parallax & Intersection Observer ──
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e) => {
      const rect = mount.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      targetX = (e.clientX - cx) * 0.0006
      targetY = (e.clientY - cy) * 0.0006
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Pause when off-screen
    let isVisible = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.1 }
    )
    observer.observe(mount)

    // ── 6. Animation Loop ──
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (!isVisible) return

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // Smooth mouse parallax
      mouseX += (targetX - mouseX) * 0.05
      mouseY += (targetY - mouseY) * 0.05

      scene.rotation.y = mouseX
      scene.rotation.x = mouseY

      // Update shader time
      sphereShaderMat.uniforms.uTime.value = elapsed

      // Rotate ribbons at distinct speeds
      ribbons.forEach(({ loop, speedX, speedY }) => {
        loop.rotation.x += speedX * delta * 0.6
        loop.rotation.y += speedY * delta * 0.8
      })

      // Point cloud gentle spin
      pointCloud.rotation.y = elapsed * 0.08
      pointCloud.rotation.z = elapsed * 0.04

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      observer.disconnect()
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      
      {/* 260px Three.js Canvas Container */}
      <div
        ref={mountRef}
        style={{ width: '260px', height: '260px' }}
        className="relative flex items-center justify-center"
      >
        {!hasWebGL && (
          /* CSS Fallback for Reduced Motion or no WebGL */
          <div
            className="w-56 h-56 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #93C5FD 0%, #3B82F6 40%, #030A1F 80%)',
              boxShadow: '0 0 50px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(147, 197, 253, 0.4)',
            }}
          />
        )}
      </div>

      {/* Caption under the orb */}
      <div className="mt-3 text-center">
        <span
          className="font-mono text-[11px] font-normal tracking-wide text-[#8EA0C4]"
          style={{ textShadow: '0 0 12px rgba(59, 130, 246, 0.3)' }}
        >
          NCT Delhi floodplain · {nodeCount} nodes loaded
        </span>
      </div>

    </div>
  )
}
