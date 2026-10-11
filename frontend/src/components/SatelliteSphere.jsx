import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function SatelliteSphere() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 360
    const height = container.clientHeight || 360

    // 1. Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 4.2

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // 2. Wireframe Icosahedron (Earth core)
    const geometry = new THREE.IcosahedronGeometry(1.6, 4)
    const originalPositions = geometry.attributes.position.clone()

    const material = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // 3. Orbital Radar Rings (Sentinel-1 SAR track)
    const ringGeo1 = new THREE.RingGeometry(2.1, 2.14, 64)
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1)
    ring1.rotation.x = Math.PI / 3.2
    scene.add(ring1)

    const ringGeo2 = new THREE.RingGeometry(2.35, 2.37, 64)
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    })
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2)
    ring2.rotation.x = -Math.PI / 4.5
    ring2.rotation.y = Math.PI / 5
    scene.add(ring2)

    // 4. Points Cloud (Satellite Radar Reflections)
    const particlesCount = 350
    const particlesGeo = new THREE.BufferGeometry()
    const posArray = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i += 3) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 1.6 + Math.random() * 0.4
      const sinPhi = Math.sin(phi)
      posArray[i] = r * sinPhi * Math.cos(theta)
      posArray[i + 1] = r * sinPhi * Math.sin(theta)
      posArray[i + 2] = r * Math.cos(phi)
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    const particlesMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    })
    const pointCloud = new THREE.Points(particlesGeo, particlesMat)
    scene.add(pointCloud)

    // Mouse interactivity
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2
      mouseY = -((e.clientY - rect.top) / height - 0.5) * 2
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 5. Animation Loop
    let clock = new THREE.Clock()
    let frameId

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05

      sphere.rotation.y = elapsedTime * 0.15 + targetX * 0.5
      sphere.rotation.x = targetY * 0.3
      pointCloud.rotation.y = -elapsedTime * 0.12
      ring1.rotation.z = elapsedTime * 0.08
      ring2.rotation.z = -elapsedTime * 0.05

      // Vertex displacement wave (Hydrology radar simulation)
      const positionAttribute = geometry.attributes.position
      for (let i = 0; i < positionAttribute.count; i++) {
        const ox = originalPositions.getX(i)
        const oy = originalPositions.getY(i)
        const oz = originalPositions.getZ(i)

        const length = Math.sqrt(ox * ox + oy * oy + oz * oz)
        const wave = Math.sin(ox * 3.0 + elapsedTime * 1.8) * 0.04 +
                     Math.cos(oy * 3.0 + elapsedTime * 1.5) * 0.04

        const ratio = (length + wave) / length
        positionAttribute.setXYZ(i, ox * ratio, oy * ratio, oz * ratio)
      }
      positionAttribute.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    // Handle Resize
    const handleResize = () => {
      if (!container) return
      const newW = container.clientWidth
      const newH = container.clientHeight
      camera.aspect = newW / newH
      camera.updateProjectionMatrix()
      renderer.setSize(newW, newH)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full h-[340px] flex items-center justify-center">
      <div ref={containerRef} className="w-[340px] h-[340px] cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2 text-center text-[11px] font-mono text-cyan-400/70 tracking-widest uppercase pointer-events-none">
        Sentinel-1 SAR Orbit: 693 km • RTC Interferometry
      </div>
    </div>
  )
}
