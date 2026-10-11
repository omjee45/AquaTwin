import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Route, ShieldX, Waves, Activity } from 'lucide-react'

export default function StatCounters({ sessionStats }) {
  const routesRef = useRef(null)
  const kmRef = useRef(null)
  const blockedRef = useRef(null)

  // Track currently animated display numbers
  const currentValues = useRef({
    routes: sessionStats.routes_rerouted || 0,
    km: sessionStats.km_avoided || 0,
    blocked: sessionStats.alerts_blocked || 0
  })

  useEffect(() => {
    // GSAP tween from current displayed numbers to incoming session totals over 1.6s with power2.out
    const targets = currentValues.current
    const newRoutes = sessionStats.routes_rerouted || 0
    const newKm = sessionStats.km_avoided || 0
    const newBlocked = sessionStats.alerts_blocked || 0

    gsap.to(targets, {
      routes: newRoutes,
      km: newKm,
      blocked: newBlocked,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => {
        if (routesRef.current) routesRef.current.textContent = Math.round(targets.routes).toString()
        if (kmRef.current) kmRef.current.textContent = targets.km.toFixed(2)
        if (blockedRef.current) blockedRef.current.textContent = Math.round(targets.blocked).toString()
      }
    })
  }, [sessionStats])

  return (
    <div className="w-full border-y border-white/[0.08] bg-[#05090D] px-6 py-6 relative">
      
      {/* Top subtle contour rule */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Routes Rerouted */}
        <div className="p-5 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/30 transition-all flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Routes rerouted</span>
            </div>
            <div className="text-3xl font-extrabold font-heading text-white flex items-baseline gap-1.5">
              <span ref={routesRef}>{sessionStats.routes_rerouted}</span>
              <span className="text-xs text-zinc-500 font-mono font-normal">active runs</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
            <Route className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Km of flooded road avoided */}
        <div className="p-5 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>Km flooded road avoided</span>
            </div>
            <div className="text-3xl font-extrabold font-heading text-teal-400 flex items-baseline gap-1.5">
              <span ref={kmRef}>{(sessionStats.km_avoided || 0).toFixed(2)}</span>
              <span className="text-xs text-zinc-500 font-mono font-normal">km safe</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
            <Waves className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Public alerts blocked by policy */}
        <div className="p-5 rounded-2xl bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] hover:border-rose-500/30 transition-all flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Alerts blocked by policy</span>
            </div>
            <div className="text-3xl font-extrabold font-heading text-rose-400 flex items-baseline gap-1.5">
              <span ref={blockedRef}>{sessionStats.alerts_blocked}</span>
              <span className="text-xs text-zinc-500 font-mono font-normal">zero false panic</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
            <ShieldX className="w-5 h-5" />
          </div>
        </div>

      </div>
    </div>
  )
}
