import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import HeroSphereCanvas from './HeroSphereCanvas'
import DigitalTwinHub from './DigitalTwinHub'
import { ArrowDown, Play, Waves } from 'lucide-react'

export default function Hero({ onOpenCommandCenter }) {
  const line1Ref = useRef(null)
  const line2Ref = useRef(null)
  const sublineRef = useRef(null)
  const ctaRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      if (line1Ref.current) line1Ref.current.style.transform = 'none'
      if (line2Ref.current) line2Ref.current.style.transform = 'none'
      if (sublineRef.current) sublineRef.current.style.opacity = '1'
      if (ctaRef.current) ctaRef.current.style.opacity = '1'
      return
    }

    // GSAP staggered line reveals in overflow:hidden masks
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(
      [line1Ref.current, line2Ref.current],
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.12, clearProps: 'transform' }
    )
    .fromTo(
      sublineRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, clearProps: 'transform' },
      '-=0.3'
    )
    .fromTo(
      ctaRef.current,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 },
      '-=0.4'
    )
  }, [])

  const handleScrollToCommand = () => {
    if (onOpenCommandCenter) {
      onOpenCommandCenter()
    } else {
      const el = document.getElementById('command-center')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center items-center text-center px-6 overflow-hidden bg-[#05090D] pt-24 pb-20 topo-bg">
      
      {/* Full-screen 3D Particle Icosphere in background */}
      <HeroSphereCanvas />

      {/* Hero Foreground Content */}
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        
        {/* Radar Room Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono text-cyan-300 tracking-wider uppercase font-semibold">
            Radar Digital Twin · NCT Delhi Yamuna Floodplain
          </span>
        </div>

        {/* Staggered Line Reveal Headline */}
        <div className="space-y-1">
          <div className="overflow-hidden">
            <h1
              ref={line1Ref}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-heading"
            >
              Roads don't flood on schedule.
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1
              ref={line2Ref}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-white font-heading"
            >
              Dispatch shouldn't be blind.
            </h1>
          </div>
        </div>

        {/* Subline */}
        <p
          ref={sublineRef}
          className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          SAR-confirmed flood extent. Deterministic safe routes. An AI that cannot send a false alert.
        </p>

        {/* Pill CTAs matching modern aesthetic */}
        <div
          ref={ctaRef}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={handleScrollToCommand}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm font-heading transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] active:scale-95"
          >
            <span>Open command center</span>
            <ArrowDown className="w-4 h-4 text-black" />
          </button>

          <button
            onClick={handleScrollToCommand}
            className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0A1420] hover:bg-[#0E1E30] border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-200 font-semibold text-sm transition-all shadow-lg active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>Watch the demo</span>
          </button>
        </div>

        {/* Central Connected Telemetry Console Hub */}
        <DigitalTwinHub onOpenCommandCenter={handleScrollToCommand} />

      </div>

      {/* Rising Waterline Atmosphere at bottom of hero */}
      <div className="hero-waterline" />

    </section>
  )
}
