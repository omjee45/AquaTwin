import React, { useState } from 'react'
import { Radio, Layers, CloudRain, Map, ShieldCheck, Navigation, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function HowItWorks() {
  const [activeInput, setActiveInput] = useState(null)

  const steps = [
    {
      num: 'Step 1',
      title: 'Satellite SAR Ingestion',
      desc: 'Sentinel-1A 5.4 GHz microwave radar penetrates clouds at night (fixed -16.5 dB mask).'
    },
    {
      num: 'Step 2',
      title: 'Topographic Drainage',
      desc: 'Simplified HAND from Copernicus 30 m DEM isolates low-lying basins and underpass pooling zones.'
    },
    {
      num: 'Step 3',
      title: 'Deterministic Routing',
      desc: 'NetworkX blocks edges P ≥ 0.50 and applies 4× traversal penalty on risk corridors. No LLM in routing.'
    },
    {
      num: 'Step 4',
      title: 'Cedar Gate Verification',
      desc: 'Policy gate validates flood_pct > 85% outside the LLM before firing Amazon SNS alerts.'
    }
  ]

  const inputs = [
    { id: 'sar', label: 'Sentinel-1A SAR Radar', meta: 'VV Polarization · fixed -16.5 dB', icon: Radio, color: '#22D3EE' },
    { id: 'hand', label: 'Simplified HAND', meta: 'Copernicus 30m DEM Basins', icon: Layers, color: '#5AA9FF' },
    { id: 'rain', label: 'Open-Meteo Precipitation', meta: '118.2 mm Total (Peak 8 Jul: 36.1 mm)', icon: CloudRain, color: '#93C5FD' },
    { id: 'osm', label: 'Delhi OSM Road Graph', meta: '20,012 Directed Segments', icon: Map, color: '#A78BFA' }
  ]

  const handleScrollToDemo = () => {
    const el = document.getElementById('command-center')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="max-w-[1200px] mx-auto w-full px-4 py-20 space-y-16 select-none">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="pill-status">
            HOW IT WORKS
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-light font-heading text-white tracking-tight">
          Three steps to a route you trust
        </h2>

        <p className="text-sm sm:text-base text-[#8EA0C4] font-sans leading-relaxed">
          No guesswork, no hallucinated coordinates, and no unverified public panic.
        </p>
      </div>

      {/* Horizontal Illuminated Timeline */}
      <div className="relative max-w-5xl mx-auto pt-4">
        
        {/* Continuous Illuminated Beam */}
        <div className="hidden md:block absolute top-[14px] left-12 right-12 h-[2px] bg-gradient-to-r from-blue-500/20 via-[#3B82F6]/50 to-blue-500/20 z-0 shadow-[0_0_12px_rgba(59,130,246,0.3)]" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {steps.map((st, idx) => (
            <div key={idx} className="space-y-3 group text-center md:text-left">
              
              {/* Glowing Node Dot */}
              <div className="flex items-center justify-center md:justify-start">
                <div className="w-7 h-7 rounded-full bg-[#050B1E] border-2 border-[#5AA9FF] shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-[#5AA9FF]" />
                </div>
              </div>

              <span className="text-[11px] font-mono font-medium text-[#5AA9FF] uppercase tracking-wider block">
                {st.num}
              </span>

              <h4 className="text-base font-semibold font-heading text-white">
                {st.title}
              </h4>

              <p className="text-xs text-[#8EA0C4] leading-relaxed font-sans">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* Illuminated Convergence Architecture Diagram */}
      <div className="glass-card relative max-w-5xl mx-auto p-6 sm:p-10 overflow-hidden">
        
        {/* Ambient subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-xs font-mono uppercase tracking-wider text-[#8EA0C4] mb-8 pb-3 border-b border-blue-500/15 flex items-center justify-between">
          <span>Deterministic Telemetry Pipeline</span>
          <span className="text-[#5AA9FF] font-medium">Physical Ground Truth · End to End</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Inputs (4 Data Feeds) */}
          <div className="lg:col-span-4 space-y-3">
            {inputs.map((inp) => {
              const IconComp = inp.icon
              const isHov = activeInput === inp.id
              return (
                <div
                  key={inp.id}
                  onMouseEnter={() => setActiveInput(inp.id)}
                  onMouseLeave={() => setActiveInput(null)}
                  className={`p-3 rounded-xl bg-[#02060F]/80 border transition-all duration-300 flex items-center justify-between shadow-lg cursor-default ${
                    isHov ? 'border-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.2)] -translate-x-1' : 'border-blue-500/15 hover:border-blue-400/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20">
                      <IconComp className="w-4 h-4" style={{ color: inp.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold font-heading text-white">{inp.label}</div>
                      <div className="text-[10px] font-mono text-[#8EA0C4]">{inp.meta}</div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full border ${isHov ? 'bg-[#5AA9FF] border-[#5AA9FF] shadow-[0_0_8px_#5AA9FF]' : 'bg-transparent border-blue-500/30'}`} />
                </div>
              )
            })}
          </div>

          {/* Center Processing Core */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#02060F]/90 border border-blue-500/30 shadow-[0_0_35px_rgba(59,130,246,0.15)] relative space-y-3">
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-900/30 border border-blue-400/30 text-[10px] font-mono text-[#93C5FD]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5AA9FF] animate-pulse" />
              <span>DETERMINISTIC ENGINE</span>
            </div>

            <h3 className="text-base font-semibold font-heading text-white">
              Hydrologic Cost & NetworkX
            </h3>

            <p className="text-[11px] font-mono text-[#8EA0C4] leading-relaxed">
              Traversal penalty function:
              <br />
              <code className="text-[#93C5FD] bg-blue-950/60 px-2 py-0.5 rounded text-[10px] mt-1 inline-block border border-blue-500/20">
                W(e) = 4.0 × L(e) [if P ≥ 0.40]
              </code>
              <br />
              Hard-blocks edges P ≥ 0.50
            </p>

            <div className="pt-2 text-[10px] font-mono text-[#34D399] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No LLM in the routing step</span>
            </div>
          </div>

          {/* Right Verified Outputs */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Output A: Safe Corridor */}
            <div className="p-4 rounded-xl bg-[#02060F]/80 border border-emerald-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#34D399]" />
                  <span className="text-xs font-semibold font-heading text-white">Safe Route Corridor</span>
                </div>
                <span className="text-[10px] font-mono text-[#34D399] font-medium">Bypasses Floods</span>
              </div>
              <p className="text-[11px] text-[#8EA0C4] font-mono leading-relaxed">
                Deterministic route computation traversing physical OSM edges safely to Lok Nayak Hospital.
              </p>
            </div>

            {/* Output B: Cedar Security Gate */}
            <div className="p-4 rounded-xl bg-[#02060F]/80 border border-amber-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold font-heading text-white">Cedar Policy Gate</span>
                </div>
                <span className="text-[10px] font-mono text-[#F59E0B] font-medium">cedarpy</span>
              </div>
              <p className="text-[11px] text-[#8EA0C4] font-mono leading-relaxed">
                Blocked by policy, evaluated outside the LLM. Requires flood_pct &gt; 85% before alerting Amazon SNS.
              </p>
            </div>

          </div>

        </div>

        {/* Bottom CTA Button */}
        <div className="mt-8 pt-6 border-t border-blue-500/15 flex justify-center">
          <button
            onClick={handleScrollToDemo}
            className="btn-primary"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </section>
  )
}
