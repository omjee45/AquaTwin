import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import DigitalTwinHub from './DigitalTwinHub'
import { ArrowDown, Play, X, ExternalLink } from 'lucide-react'

export default function Hero({ onOpenCommandCenter, nodeCount = '14,904' }) {
  const line1Ref = useRef(null)
  const line2Ref = useRef(null)
  const sublineRef = useRef(null)
  const ctaRef = useRef(null)
  const pillRef = useRef(null)

  const [showDemoModal, setShowDemoModal] = useState(false)
  const demoUrl = import.meta.env.VITE_DEMO_VIDEO_URL || ''

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      if (line1Ref.current) line1Ref.current.style.transform = 'none'
      if (line2Ref.current) line2Ref.current.style.transform = 'none'
      if (sublineRef.current) sublineRef.current.style.opacity = '1'
      if (ctaRef.current) ctaRef.current.style.opacity = '1'
      if (pillRef.current) pillRef.current.style.opacity = '1'
      return
    }

    // GSAP staggered line reveal in overflow:hidden masks
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(
      pillRef.current,
      { y: -10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 }
    )
      .fromTo(
        [line1Ref.current, line2Ref.current],
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.12, clearProps: 'transform' },
        '-=0.3'
      )
      .fromTo(
        sublineRef.current,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, clearProps: 'transform' },
        '-=0.25'
      )
      .fromTo(
        ctaRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55 },
        '-=0.2'
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
    <section className="relative min-h-[90vh] flex flex-col justify-start items-center text-center px-4 overflow-hidden pt-12 pb-16">

      {/* ── Max Container 1200px ── */}
      <div className="relative z-10 max-w-[1200px] w-full mx-auto flex flex-col items-center">

        {/* 1. Small Status Pill above headline */}
        <div ref={pillRef} className="mb-5">
          <div className="pill-status">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5AA9FF] shadow-[0_0_8px_#5AA9FF] animate-pulse" />
            <span className="font-mono text-[11px] font-medium tracking-wider uppercase text-[#93C5FD]">
              Replay: Delhi, July 2023
            </span>
          </div>
        </div>

        {/* 2. Headline: Centred, ~72px on desktop, light weight, white */}
        <div className="space-y-1 mb-4">
          <div className="overflow-hidden">
            <h1
              ref={line1Ref}
              className="text-4xl sm:text-6xl lg:text-[70px] font-light tracking-[-0.03em] text-white font-heading leading-[1.08]"
            >
              Roads don't flood on schedule.
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1
              ref={line2Ref}
              className="text-4xl sm:text-6xl lg:text-[70px] font-light tracking-[-0.03em] font-heading leading-[1.08] text-transparent bg-clip-text bg-gradient-to-r from-[#5AA9FF] via-[#3B82F6] to-[#22D3EE]"
            >
              Dispatch shouldn't be blind.
            </h1>
          </div>
        </div>

        {/* 3. Subline: Muted, 16px, max-width 560px */}
        <p
          ref={sublineRef}
          className="text-sm sm:text-base text-[#8EA0C4] max-w-[560px] mx-auto font-normal leading-relaxed mb-7 font-sans"
        >
          SAR-confirmed flood extent. Deterministic safe routes. An AI that cannot send a false alert.
        </p>

        {/* 4. Buttons: Primary & Secondary */}
        <div
          ref={ctaRef}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {/* Primary Button */}
          <button
            onClick={handleScrollToCommand}
            className="btn-primary"
          >
            <span>Open command center</span>
            <ArrowDown className="w-4 h-4 text-white" />
          </button>

          {/* Secondary Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="btn-secondary"
          >
            <Play className="w-3.5 h-3.5 text-[#5AA9FF] fill-[#5AA9FF]" />
            <span>Watch the demo</span>
          </button>
        </div>

        {/* 5. Orb Cluster (56px below buttons, 440px height, 3 columns, 4 cards + connectors) */}
        <DigitalTwinHub
          onOpenCommandCenter={handleScrollToCommand}
          nodeCount={nodeCount}
        />

      </div>

      {/* ── Demo Video Modal ── */}
      {showDemoModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl bg-[#050B1E] border border-blue-500/30 overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-blue-500/20 bg-[#02060F]">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#5AA9FF]" />
                <span className="font-heading font-semibold text-sm text-white">
                  AquaTwin Demonstration · Autonomous Delhi Flood Dispatch
                </span>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Body or Placeholder */}
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {demoUrl ? (
                <iframe
                  className="w-full h-full"
                  src={demoUrl}
                  title="AquaTwin Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center space-y-3 font-mono text-xs text-[#8EA0C4]">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-400/30 flex items-center justify-center mx-auto text-[#5AA9FF]">
                    <Play className="w-6 h-6 fill-[#5AA9FF]" />
                  </div>
                  <div className="text-white font-semibold text-sm">
                    Interactive Simulation Loaded Below
                  </div>
                  <p className="max-w-md mx-auto text-zinc-400 leading-relaxed">
                    Set <code className="text-[#5AA9FF] bg-blue-950/60 px-1.5 py-0.5 rounded">VITE_DEMO_VIDEO_URL</code> in <code className="text-white">.env</code> to link a YouTube walkthrough, or test live interactive dispatching in the Command Center below.
                  </p>
                  <button
                    onClick={() => {
                      setShowDemoModal(false)
                      handleScrollToCommand()
                    }}
                    className="btn-primary mt-2"
                  >
                    Launch Command Center
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  )
}
