import React, { useState } from 'react'
import { Radio, Layers, CloudRain, Map, ShieldCheck, Navigation, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function HowItWorks() {
  const [activeInput, setActiveInput] = useState(null)

  const steps = [
    {
      num: 'Step 1',
      title: 'Satellite SAR Ingestion',
      desc: 'Sentinel-1A 5.4 GHz microwave radar penetrates clouds at night (-16.5 dB Otsu mask).'
    },
    {
      num: 'Step 2',
      title: 'Topographic Drainage',
      desc: 'Copernicus 30m HAND isolates low-lying basins and storm pooling zones.'
    },
    {
      num: 'Step 3',
      title: 'Deterministic Routing',
      desc: 'NetworkX blocks edges P ≥ 0.50 and applies 4× traversal penalty on risk corridors.'
    },
    {
      num: 'Step 4',
      title: 'Cedar Gate Verification',
      desc: 'Rust policy gate validates flood_pct > 85% before firing Amazon SNS alerts.'
    }
  ]

  const inputs = [
    { id: 'sar', label: 'Sentinel-1A SAR Radar', meta: 'VV Polarization · Otsu -16.5 dB', icon: Radio, color: '#00D4FF' },
    { id: 'hand', label: 'Copernicus 30m HAND', meta: 'GLO-30 Drainage Basins', icon: Layers, color: '#00E5B0' },
    { id: 'rain', label: 'GPM IMERG Rain Reanalysis', meta: '118.2 mm 72-Hour Cumulative', icon: CloudRain, color: '#4DB8FF' },
    { id: 'osm', label: 'Delhi OSM Road Graph', meta: '20,012 Directed Segments', icon: Map, color: '#A78BFA' }
  ]

  const handleScrollToDemo = () => {
    const el = document.getElementById('command-center')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 py-20 space-y-16 select-none">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 backdrop-blur-md">
          <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
            HOW IT WORKS
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
          Three steps to a route you trust
        </h2>

        <p className="text-sm sm:text-base text-zinc-400 font-mono leading-relaxed">
          No guesswork, no hallucinated coordinates, and no unverified public panic.
        </p>
      </div>

      {/* Horizontal Illuminated Timeline */}
      <div className="relative max-w-5xl mx-auto pt-4">
        
        {/* Continuous Illuminated Beam */}
        <div className="hidden md:block absolute top-[14px] left-12 right-12 h-[2px] bg-gradient-to-r from-cyan-500/30 via-teal-500/40 to-cyan-500/30 z-0 shadow-[0_0_12px_rgba(0,212,255,0.3)]" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {steps.map((st, idx) => (
            <div key={idx} className="space-y-3 group text-center md:text-left">
              
              {/* Glowing Node Dot */}
              <div className="flex items-center justify-center md:justify-start">
                <div className="w-7 h-7 rounded-full bg-[#070D14] border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.4)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
              </div>

              <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                {st.num}
              </span>

              <h4 className="text-base font-bold font-heading text-white">
                {st.title}
              </h4>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* Illuminated Convergence Architecture Diagram */}
      <div className="relative max-w-5xl mx-auto rounded-3xl bg-[#070D14]/90 border border-white/[0.08] p-6 sm:p-10 shadow-2xl backdrop-blur-xl overflow-hidden">
        
        {/* Ambient subtle glow inside card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-8 pb-3 border-b border-white/[0.06] flex items-center justify-between">
          <span>Deterministic Telemetry Pipeline</span>
          <span className="text-cyan-400 font-semibold">Physical Ground Truth · End to End</span>
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
                  className={`p-3 rounded-xl bg-[#05090D] border transition-all duration-300 flex items-center justify-between shadow-lg cursor-default ${
                    isHov ? 'border-cyan-400/50 shadow-[0_0_20px_rgba(0,212,255,0.15)] -translate-x-1' : 'border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                      <IconComp className="w-4 h-4" style={{ color: inp.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold font-heading text-white">{inp.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400">{inp.meta}</div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full border ${isHov ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_#00D4FF]' : 'bg-transparent border-white/20'}`} />
                </div>
              )
            })}
          </div>

          {/* Center Processing Core */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#05090D] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,212,255,0.1)] relative space-y-3">
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>DETERMINISTIC ENGINE</span>
            </div>

            <h3 className="text-base font-bold font-heading text-white">
              Hydrologic Scorer & NetworkX
            </h3>

            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Calculates cost function:
              <br />
              <code className="text-cyan-300 bg-black/60 px-2 py-0.5 rounded text-[10px] mt-1 inline-block">
                W(e) = 4.0 × L(e) [if P ≥ 0.40]
              </code>
              <br />
              Hard-blocks edges P ≥ 0.50
            </p>

            <div className="pt-2 text-[10px] font-mono text-cyan-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero LLM Path Hallucination</span>
            </div>
          </div>

          {/* Right Verified Outputs */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Output A: Safe Corridor */}
            <div className="p-4 rounded-xl bg-[#05090D] border border-emerald-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-heading text-white">Safe Route Corridor</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">+1.43 km Detour</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                Ambulance 4 to LNJP safely rerouted (6.814 km) bypassing 93 flooded road segments.
              </p>
            </div>

            {/* Output B: Cedar Security Gate */}
            <div className="p-4 rounded-xl bg-[#05090D] border border-amber-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-heading text-white">AWS Cedar Policy Gate</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-bold">Rust Executed</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                Blocks hallucinated alerts; dispatches only verified radar alerts (flood_pct &gt; 85%) to Amazon SNS.
              </p>
            </div>

          </div>

        </div>

        {/* Bottom CTA Button */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex justify-center">
          <button
            onClick={handleScrollToDemo}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs font-heading transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95"
          >
            <span>Launch Command Center Simulation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </section>
  )
}
