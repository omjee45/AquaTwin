import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function HeroSphereCanvas() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 1. Scene setup
    const w = mount.clientWidth || window.innerWidth || 800
    const h = mount.clientHeight || window.innerHeight || 600

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
    camera.position.z = 4.8

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    // 2. Vertex & Fragment Shader with Simplex Noise
    const vertexShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uDistort;
      attribute vec3 aNormal;
      varying vec3 vNormal;
      varying float vDist;

      // 3D Simplex Noise generator
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vNormal = normal;
        vec3 pos = position;
        
        // Simplex noise wave displacement over time
        float noise = snoise(pos * 1.8 + vec3(uTime * 0.45));
        
        // Extra cursor proximity distortion
        vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        vec2 normScreen = screenPos.xy / screenPos.w;
        float mouseDist = distance(normScreen, uMouse);
        float mouseWave = smoothstep(1.2, 0.0, mouseDist) * uDistort * 0.35;

        pos += normal * (noise * 0.22 + mouseWave);
        vDist = noise;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (1.8 + noise * 1.2) * (180.0 / -screenPos.z);
      }
    `

    const fragmentShader = `
      varying vec3 vNormal;
      varying float vDist;

      void main() {
        // Ethereal starry graphite silver with subtle emerald radar phosphor
        vec3 baseColor = mix(vec3(0.82, 0.85, 0.90), vec3(0.25, 0.82, 0.55), clamp(vDist * 0.4, 0.0, 1.0));
        float alpha = 0.20 + vDist * 0.15;
        
        // Circular soft particles
        vec2 coord = gl_PointCoord - vec2(0.5);
        if (length(coord) > 0.5) discard;

        gl_FragColor = vec4(baseColor, alpha);
      }
    `

    // 3. Icosahedron with ~4,500 points (detail=5)
    const geometry = new THREE.IcosahedronGeometry(2.1, 5)

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uDistort: { value: prefersReducedMotion ? 0.0 : 1.0 }
    }

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Subtle neutral wireframe architectural layer (almost invisible, zero blue glare)
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.025
    })
    const wireMesh = new THREE.Mesh(geometry, wireframeMat)
    scene.add(wireMesh)

    // 4. Mouse movement tracking
    const handleMouseMove = (e) => {
      const rect = mount.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1
      const y = -(((e.clientY - rect.top) / mount.clientHeight) * 2 - 1)
      uniforms.uMouse.value.set(x, y)
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 5. Animation loop
    let clock = new THREE.Clock()
    let reqId

    const animate = () => {
      reqId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      if (!prefersReducedMotion) {
        uniforms.uTime.value = elapsed
        points.rotation.y = elapsed * 0.08
        points.rotation.x = elapsed * 0.04
        wireMesh.rotation.y = elapsed * 0.08
        wireMesh.rotation.x = elapsed * 0.04
      }

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const handleResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(reqId)
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60 z-0 overflow-hidden"
    />
  )
}
