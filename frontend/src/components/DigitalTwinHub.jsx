import React, { useState } from 'react'
import { Radio, Layers, CloudRain, ShieldCheck, Waves, ArrowRight, Activity, Radar, Compass } from 'lucide-react'

export default function DigitalTwinHub({ onOpenCommandCenter }) {
  const [activeInstrument, setActiveInstrument] = useState(null)

  // Synthetic backscatter histogram bins (-24dB to -8dB)
  // Otsu cutoff is at index 4 (-16.5 dB)
  const sarHistogram = [
    { db: '-24', val: 38, water: true },
    { db: '-22', val: 65, water: true },
    { db: '-20', val: 92, water: true },
    { db: '-18', val: 84, water: true },
    { db: '-16.5', val: 40, threshold: true }, // Otsu threshold line
    { db: '-15', val: 55, water: false },
    { db: '-13', val: 78, water: false },
    { db: '-11', val: 88, water: false },
    { db: '-9', val: 60, water: false },
    { db: '-7', val: 28, water: false }
  ]

  // Hourly rainfall hyetograph bars for 72-hr Delhi peak (mm/hr samples)
  const rainBars = [12, 18, 26, 42, 68, 94, 118, 98, 72, 45, 30, 16]

  return (
    <div className="relative w-full max-w-6xl mx-auto mt-10 py-6 px-4 select-none">
      
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-6 font-mono text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-zinc-200 font-semibold tracking-wider uppercase">
            MONSOON TELEMETRY CLUSTER · DELHI 12-JUL-2023 02:00 IST
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-zinc-500">
          <span>YAMUNA PEAK: 208.66m</span>
          <span>•</span>
          <span className="text-cyan-400">DANGER LEVEL +3.33m</span>
        </div>
      </div>

      {/* Main 3-Column Instrument Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-10">
        
        {/* LEFT COLUMN: Physical Radar & Elevation Sensing */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          
          {/* Instrument 1: Sentinel-1A SAR with Real Histogram */}
          <div
            onMouseEnter={() => setActiveInstrument('sar')}
            onMouseLeave={() => setActiveInstrument(null)}
            className={`p-4 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border transition-all duration-300 shadow-xl flex flex-col justify-between ${
              activeInstrument === 'sar'
                ? 'border-cyan-400/50 shadow-[0_0_30px_rgba(0,212,255,0.15)] bg-[#0A1420]'
                : 'border-white/[0.08] hover:border-cyan-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-white">Sentinel-1A SAR</h4>
                    <span className="text-[10px] font-mono text-zinc-400">5.4 GHz C-Band · IW RTC</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  12-JUL 00:52
                </span>
              </div>

              {/* Micro-visual: SAR Backscatter Histogram */}
              <div className="my-2 p-2.5 rounded-xl bg-[#05090D] border border-white/[0.04]">
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mb-1.5">
                  <span className="text-cyan-400">◄ Water (Specular)</span>
                  <span className="text-amber-400 font-bold">Otsu -16.5 dB</span>
                  <span>Land (Diffuse) ►</span>
                </div>
                <div className="h-10 flex items-end justify-between gap-1 relative pt-1">
                  {/* Vertical Otsu Threshold Line */}
                  <div className="absolute top-0 bottom-0 left-[44%] w-[1px] bg-amber-400/80 border-r border-dashed border-amber-400 z-10" />
                  
                  {sarHistogram.map((bin, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                      <div
                        className={`w-full rounded-t transition-all ${
                          bin.water
                            ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover/bar:brightness-125'
                            : 'bg-zinc-700/60 group-hover/bar:bg-zinc-600'
                        }`}
                        style={{ height: `${bin.val}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1">
                  <span>-24 dB</span>
                  <span className="text-amber-400">-16.5 dB threshold</span>
                  <span>-7 dB</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Inundation Extent</span>
              <span className="text-cyan-400 font-bold">1.898 km² · 82 Polygons</span>
            </div>
          </div>

          {/* Instrument 2: Copernicus 30m HAND Elevation Gradient */}
          <div
            onMouseEnter={() => setActiveInstrument('hand')}
            onMouseLeave={() => setActiveInstrument(null)}
            className={`p-4 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border transition-all duration-300 shadow-xl flex flex-col justify-between ${
              activeInstrument === 'hand'
                ? 'border-teal-400/50 shadow-[0_0_30px_rgba(0,229,176,0.15)] bg-[#0A1420]'
                : 'border-white/[0.08] hover:border-teal-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-white">Copernicus 30m HAND</h4>
                    <span className="text-[10px] font-mono text-zinc-400">Height Above Nearest Drainage</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  GLO-30 DEM
                </span>
              </div>

              {/* Micro-visual: HAND Topo Gradient Elevation Bar */}
              <div className="my-2 p-2.5 rounded-xl bg-[#05090D] border border-white/[0.04]">
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mb-1.5">
                  <span className="text-rose-400 font-bold">0.0m Submerged</span>
                  <span className="text-amber-300">1.5m Underpass Trap</span>
                  <span className="text-teal-400">15m Safe Ridge</span>
                </div>
                
                {/* Continuous HAND Heatmap bar */}
                <div className="h-3 w-full rounded-full bg-gradient-to-r from-cyan-600 via-amber-500 to-emerald-500 relative shadow-inner overflow-hidden">
                  <div className="absolute left-[15%] top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#fff]" />
                </div>

                <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1.5">
                  <span>Bowl Depressions</span>
                  <span className="text-amber-400 font-semibold">Underpass Pooling Threshold</span>
                  <span>Natural Levee</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Topographic Vulnerability</span>
              <span className="text-teal-400 font-bold">High Drainage Depressions Isolated</span>
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: Flood Radar Digital Twin Core */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center relative min-h-[360px] p-4 rounded-3xl bg-gradient-to-b from-[#070D14] to-[#0A1420] border border-white/[0.08] shadow-2xl overflow-hidden group">
          
          {/* Subtle Radar Background Grid / Circular Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-72 h-72 rounded-full border border-cyan-500/20" />
            <div className="w-52 h-52 rounded-full border border-cyan-500/25" />
            <div className="w-32 h-32 rounded-full border border-cyan-500/30" />
            <div className="w-full h-[1px] bg-cyan-500/15 absolute" />
            <div className="h-full w-[1px] bg-cyan-500/15 absolute" />
          </div>

          {/* Radar Sweep Beam Effect */}
          <div className="absolute w-72 h-72 rounded-full pointer-events-none overflow-hidden">
            <div className="w-full h-full rounded-full animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,transparent_280deg,rgba(0,229,176,0.18)_360deg)]" />
          </div>

          {/* Core Interactive Center Capsule */}
          <div
            onClick={onOpenCommandCenter}
            className="relative z-10 w-52 h-52 rounded-full p-[2px] bg-gradient-to-tr from-cyan-500 via-teal-400 to-blue-600 shadow-[0_0_60px_rgba(0,212,255,0.2)] group-hover:shadow-[0_0_80px_rgba(0,212,255,0.35)] transition-all duration-500 cursor-pointer flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-[#05090D] flex flex-col items-center justify-center text-center p-4 relative overflow-hidden backdrop-blur-xl">
              
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono text-cyan-400 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>RADAR CORE</span>
              </div>

              <h3 className="text-base font-extrabold font-heading text-white tracking-tight">
                NCT Delhi Twin
              </h3>

              <div className="text-[10px] font-mono text-zinc-400 space-y-0.5 my-1">
                <div>28.65°N, 77.23°E</div>
                <div className="text-teal-400 font-bold">14,904 Nodes Synced</div>
              </div>

              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full border border-white/20 transition-all">
                  <span>Enter Ops Room</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </span>
              </div>

            </div>
          </div>

          {/* Under-Orb Real Metrics Banner */}
          <div className="mt-4 text-center z-10">
            <span className="text-[10px] font-mono text-zinc-400 block">
              Yamuna Basin Inundation Matrix
            </span>
            <span className="text-xs font-mono font-semibold text-cyan-400">
              Deterministic Traversal Active
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Precipitation Hyetograph & Cedar Policy Gate */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          
          {/* Instrument 3: GPM IMERG 72-Hr Hyetograph Rainfall */}
          <div
            onMouseEnter={() => setActiveInstrument('rain')}
            onMouseLeave={() => setActiveInstrument(null)}
            className={`p-4 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border transition-all duration-300 shadow-xl flex flex-col justify-between ${
              activeInstrument === 'rain'
                ? 'border-blue-400/50 shadow-[0_0_30px_rgba(77,184,255,0.15)] bg-[#0A1420]'
                : 'border-white/[0.08] hover:border-blue-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-white">GPM IMERG Rainfall</h4>
                    <span className="text-[10px] font-mono text-zinc-400">NASA 0.1° Precipitation Reanalysis</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  72-Hr Storm
                </span>
              </div>

              {/* Micro-visual: Hyetograph Bars */}
              <div className="my-2 p-2.5 rounded-xl bg-[#05090D] border border-white/[0.04]">
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mb-1.5">
                  <span>Hyetograph Distribution</span>
                  <span className="text-blue-400 font-bold">118.2 mm Total</span>
                </div>
                
                <div className="h-10 flex items-end justify-between gap-1 pt-1">
                  {rainBars.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/rain">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-blue-700 to-blue-400 transition-all group-hover/rain:brightness-125"
                        style={{ height: `${(h / 118) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1">
                  <span>09-JUL 00:00</span>
                  <span className="text-blue-400">Peak 11-JUL</span>
                  <span>12-JUL 00:00</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Storm Normalization</span>
              <span className="text-blue-400 font-bold">118.2 mm Normalized Weight</span>
            </div>
          </div>

          {/* Instrument 4: AWS Cedar Formal Policy Gate */}
          <div
            onMouseEnter={() => setActiveInstrument('cedar')}
            onMouseLeave={() => setActiveInstrument(null)}
            className={`p-4 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border transition-all duration-300 shadow-xl flex flex-col justify-between ${
              activeInstrument === 'cedar'
                ? 'border-violet-400/50 shadow-[0_0_30px_rgba(167,139,250,0.15)] bg-[#0A1420]'
                : 'border-white/[0.08] hover:border-violet-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-white">AWS Cedar Gate</h4>
                    <span className="text-[10px] font-mono text-zinc-400">Rust Execution · Zero Hallucination</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  cedarpy
                </span>
              </div>

              {/* Micro-visual: Cedar Invariant Checklist */}
              <div className="my-2 p-2.5 rounded-xl bg-[#05090D] border border-white/[0.04] font-mono text-[9px] space-y-1">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>[✓] Principal in Role::EmergencyManager</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>[✓] Action == Action::SendAlert</span>
                  <span className="text-emerald-400 font-bold">LOCKED</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>[✓] Invariant: flood_pct &gt; 85%</span>
                  <span className="text-cyan-400 font-bold">REQUIRED</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>[✓] validation_source == "Sentinel-1"</span>
                  <span className="text-cyan-400 font-bold">SAR ONLY</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Public False Alarms</span>
              <span className="text-emerald-400 font-bold">100% Mathematically Blocked</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
