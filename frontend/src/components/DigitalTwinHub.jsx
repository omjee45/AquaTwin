import React, { useState, useEffect, useRef } from 'react'
import HeroSphereCanvas from './HeroSphereCanvas'
import { Check, ArrowDown, ShieldAlert, ShieldCheck, BarChart3, Database } from 'lucide-react'

export default function DigitalTwinHub({ onOpenCommandCenter, nodeCount = '14,904' }) {
  const containerRef = useRef(null)
  const cardLT = useRef(null)
  const cardLB = useRef(null)
  const cardRT = useRef(null)
  const cardRB = useRef(null)
  const orbRef = useRef(null)

  const [paths, setPaths] = useState([])
  const [showHistogram, setShowHistogram] = useState(false)

  // 7 Real Daily Rainfall Values (Open-Meteo)
  // Total = 36.1 + 22.3 + 30.7 + 2.4 + 8.9 + 5.7 + 12.1 = 118.2 mm
  const rainfallDays = [
    { day: '08 Jul', val: 36.1, isPeak: true },
    { day: '09 Jul', val: 22.3 },
    { day: '10 Jul', val: 30.7 },
    { day: '11 Jul', val: 2.4 },
    { day: '12 Jul', val: 8.9 },
    { day: '13 Jul', val: 5.7 },
    { day: '14 Jul', val: 12.1 },
  ]
  const maxRain = 36.1

  // Dynamic connector path recalculation using ResizeObserver
  const updateConnectors = () => {
    if (!containerRef.current || !cardLT.current || !cardLB.current || !cardRT.current || !cardRB.current || !orbRef.current) return

    // Hide connectors on mobile / tablet
    if (window.innerWidth < 1024) {
      setPaths([])
      return
    }

    const cRect = containerRef.current.getBoundingClientRect()
    const ltRect = cardLT.current.getBoundingClientRect()
    const lbRect = cardLB.current.getBoundingClientRect()
    const rtRect = cardRT.current.getBoundingClientRect()
    const rbRect = cardRB.current.getBoundingClientRect()
    const oRect = orbRef.current.getBoundingClientRect()

    const r = 12 // corner radius

    // Orb center & connection points
    const orbCenterX = oRect.left + oRect.width / 2 - cRect.left
    const orbCenterY = oRect.top + oRect.height / 2 - cRect.top
    const orbRadius = 110 // visual landing target
    const orbLeftX = orbCenterX - orbRadius
    const orbRightX = orbCenterX + orbRadius

    // Left cards inner edge X
    const leftInnerX = ltRect.right - cRect.left
    const ltY = ltRect.top + ltRect.height / 2 - cRect.top
    const lbY = lbRect.top + lbRect.height / 2 - cRect.top

    // Right cards inner edge X
    const rightInnerX = rtRect.left - cRect.left
    const rtY = rtRect.top + rtRect.height / 2 - cRect.top
    const rbY = rbRect.top + rbRect.height / 2 - cRect.top

    // Midpoints for 90-deg turns
    const midLeftX = leftInnerX + (orbLeftX - leftInnerX) * 0.45
    const midRightX = rightInnerX - (rightInnerX - orbRightX) * 0.45

    // Helper for rounded elbow: M (x1, y1) -> H (corner1) -> V (corner2) -> H (x2)
    // Left-Top to Orb: (leftInnerX, ltY) -> (midLeftX, ltY) -> (midLeftX, orbCenterY) -> (orbLeftX, orbCenterY)
    const p1 = `M ${leftInnerX} ${ltY} H ${midLeftX - r} Q ${midLeftX} ${ltY} ${midLeftX} ${ltY + r} V ${orbCenterY - r} Q ${midLeftX} ${orbCenterY} ${midLeftX + r} ${orbCenterY} H ${orbLeftX}`

    // Left-Bottom to Orb: (leftInnerX, lbY) -> (midLeftX, lbY) -> (midLeftX, orbCenterY) -> (orbLeftX, orbCenterY)
    const p2 = `M ${leftInnerX} ${lbY} H ${midLeftX - r} Q ${midLeftX} ${lbY} ${midLeftX} ${lbY - r} V ${orbCenterY + r} Q ${midLeftX} ${orbCenterY} ${midLeftX + r} ${orbCenterY} H ${orbLeftX}`

    // Right-Top to Orb: (rightInnerX, rtY) -> (midRightX, rtY) -> (midRightX, orbCenterY) -> (orbRightX, orbCenterY)
    const p3 = `M ${rightInnerX} ${rtY} H ${midRightX + r} Q ${midRightX} ${rtY} ${midRightX} ${rtY + r} V ${orbCenterY - r} Q ${midRightX} ${orbCenterY} ${midRightX - r} ${orbCenterY} H ${orbRightX}`

    // Right-Bottom to Orb: (rightInnerX, rbY) -> (midRightX, rbY) -> (midRightX, orbCenterY) -> (orbRightX, orbCenterY)
    const p4 = `M ${rightInnerX} ${rbY} H ${midRightX + r} Q ${midRightX} ${rbY} ${midRightX} ${rbY - r} V ${orbCenterY + r} Q ${midRightX} ${orbCenterY} ${midRightX - r} ${orbCenterY} H ${orbRightX}`

    setPaths([
      { d: p1, dotX: leftInnerX, dotY: ltY },
      { d: p2, dotX: leftInnerX, dotY: lbY },
      { d: p3, dotX: rightInnerX, dotY: rtY },
      { d: p4, dotX: rightInnerX, dotY: rbY },
    ])
  }

  useEffect(() => {
    updateConnectors()
    const ro = new ResizeObserver(() => {
      updateConnectors()
    })
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', updateConnectors)
    const t = setTimeout(updateConnectors, 250)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateConnectors)
      clearTimeout(t)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1200px] mx-auto mt-14 select-none px-4"
      style={{ minHeight: '440px' }}
    >
      {/* ── Background SVG Connectors Layer (Z-index 0) ── */}
      <svg
        className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="blue-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {paths.map((p, idx) => (
          <g key={idx}>
            {/* Ambient Background Glow Line */}
            <path
              d={p.d}
              fill="none"
              stroke="#2F7BFF"
              strokeWidth="3"
              opacity="0.3"
              filter="url(#blue-glow)"
            />
            {/* Base Crisp Line */}
            <path
              d={p.d}
              fill="none"
              stroke="#2F7BFF"
              strokeWidth="1.5"
              opacity="0.85"
            />
            {/* Animated Pulse traveling along line */}
            <path
              d={p.d}
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2"
              className="pulse-line"
              opacity="0.95"
            />
            {/* 6px glowing dot at card inner edge */}
            <circle
              cx={p.dotX}
              cy={p.dotY}
              r="3.5"
              fill="#93C5FD"
              stroke="#3B82F6"
              strokeWidth="1.5"
              filter="url(#blue-glow)"
            />
          </g>
        ))}
      </svg>

      {/* ── Three-Column Grid matching Reference Composition ── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0">

        {/* ── LEFT COLUMN (2 Cards, ~300px width, 24px vertical gap) ── */}
        <div className="w-full lg:w-[300px] flex flex-col gap-6">

          {/* Card 1: Top-Left "Evidence" */}
          <div
            ref={cardLT}
            className="glass-card w-full p-4 flex flex-col justify-between"
            style={{ minHeight: '175px' }}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/15 mb-3">
                <span className="font-heading font-semibold text-sm text-white tracking-tight">
                  Evidence
                </span>
                <span className="pill-tag-card">
                  4 sources
                </span>
              </div>

              {/* Horizontally scrolling check pills */}
              <div className="pill-scroller py-1">
                <div className="pill-scroller-content">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>Sentinel-1 water mask</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>Terrain: simplified HAND</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>Rainfall 118.2 mm</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>OSM road graph</span>
                  </div>

                  {/* Duplicate for infinite seamless scroll */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>Sentinel-1 water mask</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/30 border border-blue-400/25 text-[11px] font-mono text-blue-200">
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span>Terrain: simplified HAND</span>
                  </div>
                </div>
              </div>

              {/* Secondary Visual: Small Sentinel-1 Histogram with fixed -16.5 dB line */}
              <div
                className="mt-2.5 pt-2 border-t border-blue-500/10 cursor-pointer"
                onClick={() => setShowHistogram(!showHistogram)}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8EA0C4] hover:text-white transition-colors">
                  <span>Threshold: fixed -16.5 dB</span>
                  <span className="text-[#5AA9FF] underline">{showHistogram ? 'Hide histogram' : 'View histogram'}</span>
                </div>

                {showHistogram && (
                  <div className="mt-2 p-2 rounded-lg bg-[#02060F]/80 border border-blue-500/20">
                    <div className="h-6 flex items-end justify-between gap-1 relative pt-1">
                      <div className="absolute top-0 bottom-0 left-[45%] w-[1px] bg-[#F59E0B] border-r border-dashed border-[#F59E0B] z-10" />
                      {[35, 60, 90, 80, 40, 52, 75, 85, 62, 30].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                          <div
                            className={`w-full rounded-t ${i < 4 ? 'bg-[#22D3EE]' : 'bg-blue-600/60'}`}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-[#8EA0C4] mt-1">
                      <span>-24 dB (Water)</span>
                      <span className="text-[#F59E0B]">-16.5 dB</span>
                      <span>-7 dB (Land)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8EA0C4] pt-1">
              Sentinel-1: 12 Jul 2023, 00:52 UTC (06:22 IST)
            </div>
          </div>

          {/* Card 2: Bottom-Left "Routing" */}
          <div
            ref={cardLB}
            className="glass-card w-full p-4 flex flex-col justify-between"
            style={{ minHeight: '175px' }}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/15 mb-3">
                <span className="font-heading font-semibold text-sm text-white tracking-tight">
                  Routing
                </span>
                <span className="pill-tag-card">
                  Deterministic
                </span>
              </div>

              {/* Vertical flow of pills with connecting line & arrows matching Workflows card */}
              <div className="flex flex-col gap-1.5 relative pl-4 border-l border-blue-400/30 ml-2">

                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#F43F5E] shadow-[0_0_6px_#F43F5E]" />
                  <div className="px-2.5 py-1 rounded bg-[#02060F]/60 border border-blue-500/20 text-[11px] font-mono text-zinc-200">
                    Block edges ≥ 0.50
                  </div>
                </div>

                <div className="text-[10px] text-blue-400/60 pl-1 font-mono">↓</div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <div className="px-2.5 py-1 rounded bg-[#02060F]/60 border border-blue-500/20 text-[11px] font-mono text-zinc-200">
                    Penalise 0.40 to 0.50 (×4)
                  </div>
                </div>

                <div className="text-[10px] text-blue-400/60 pl-1 font-mono">↓</div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_#34D399]" />
                  <div className="px-2.5 py-1 rounded bg-[#02060F]/60 border border-emerald-500/30 text-[11px] font-mono text-[#34D399] font-medium">
                    Safe route corridor
                  </div>
                </div>

              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8EA0C4] pt-2">
              No LLM in the routing step
            </div>
          </div>

        </div>

        {/* ── CENTER COLUMN (Three.js Orb, ~260px) ── */}
        <div ref={orbRef} className="w-full lg:w-[340px] flex items-center justify-center">
          <HeroSphereCanvas nodeCount={nodeCount} />
        </div>

        {/* ── RIGHT COLUMN (2 Cards, ~300px width, 24px vertical gap) ── */}
        <div className="w-full lg:w-[300px] flex flex-col gap-6">

          {/* Card 3: Top-Right "Rainfall" */}
          <div
            ref={cardRT}
            className="glass-card w-full p-4 flex flex-col justify-between"
            style={{ minHeight: '175px' }}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/15 mb-2">
                <span className="font-heading font-semibold text-sm text-white tracking-tight">
                  Rainfall
                </span>
                <span className="pill-tag-card text-[#5AA9FF]">
                  118.2 mm
                </span>
              </div>

              {/* Real 7-day daily bar chart from Open-Meteo (08 to 14 Jul) */}
              <div className="pt-2">
                <div className="h-14 flex items-end justify-between gap-1.5">
                  {rainfallDays.map((d, i) => {
                    const heightPct = Math.round((d.val / maxRain) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                        <div
                          className={`w-full rounded-t transition-all ${d.isPeak
                              ? 'bg-gradient-to-t from-blue-600 to-[#5AA9FF] shadow-[0_0_8px_rgba(90,169,255,0.4)]'
                              : 'bg-blue-600/40 group-hover/bar:bg-blue-500/70'
                            }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${d.day}: ${d.val} mm`}
                        />
                        <span className="text-[8px] font-mono text-[#8EA0C4] mt-1 leading-none">
                          {d.day.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8EA0C4] pt-2 border-t border-blue-500/10">
              <span>Peak: 8 Jul (36.1 mm)</span>
              <span className="text-[#5AA9FF]">Open-Meteo</span>
            </div>
          </div>

          {/* Card 4: Bottom-Right "Policy gate" */}
          <div
            ref={cardRB}
            className="glass-card w-full p-4 flex flex-col justify-between"
            style={{ minHeight: '175px' }}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/15 mb-3">
                <span className="font-heading font-semibold text-sm text-white tracking-tight">
                  Policy gate
                </span>
                <span className="pill-tag-card">
                  cedarpy
                </span>
              </div>

              {/* Horizontally scrolling real demo segment verification pills */}
              <div className="pill-scroller py-2">
                <div className="pill-scroller-content">

                  {/* Red Blocked Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-[#F43F5E]/40 text-[11px] font-mono text-[#F43F5E] shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>BLOCKED Sansad Marg 41% model</span>
                  </div>

                  {/* Green Allowed Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-[#34D399]/40 text-[11px] font-mono text-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ALLOWED Unnamed road 91% Sentinel-1</span>
                  </div>

                  {/* Duplicate for infinite loop */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-[#F43F5E]/40 text-[11px] font-mono text-[#F43F5E]">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>BLOCKED Sansad Marg 41% model</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-[#34D399]/40 text-[11px] font-mono text-[#34D399]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ALLOWED Unnamed road 91% Sentinel-1</span>
                  </div>

                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8EA0C4] pt-2">
              Blocked by policy, evaluated outside the LLM
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
