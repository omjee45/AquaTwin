import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Route, ShieldX, Waves } from 'lucide-react'

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
    const targets = currentValues.current
    const newRoutes = sessionStats.routes_rerouted || 0
    const newKm = sessionStats.km_avoided || 0
    const newBlocked = sessionStats.alerts_blocked || 0

    gsap.to(targets, {
      routes: newRoutes,
      km: newKm,
      blocked: newBlocked,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (routesRef.current) routesRef.current.textContent = Math.round(targets.routes).toString()
        if (kmRef.current) kmRef.current.textContent = targets.km.toFixed(2)
        if (blockedRef.current) blockedRef.current.textContent = Math.round(targets.blocked).toString()
      }
    })
  }, [sessionStats])

  return (
    <div className="w-full border-b border-blue-500/10 px-4 py-8 relative">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Routes Rerouted */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#8EA0C4] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5AA9FF]" />
              <span>Routes rerouted</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white flex items-baseline gap-1.5">
              <span ref={routesRef}>{sessionStats.routes_rerouted}</span>
              <span className="text-xs text-[#8EA0C4] font-mono font-normal">active runs</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-400/30 flex items-center justify-center text-[#5AA9FF] shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <Route className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Km of flooded road avoided */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#8EA0C4] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
              <span>Km flooded road avoided</span>
            </div>
            <div className="text-3xl font-bold font-heading text-[#22D3EE] flex items-baseline gap-1.5">
              <span ref={kmRef}>{(sessionStats.km_avoided || 0).toFixed(2)}</span>
              <span className="text-xs text-[#8EA0C4] font-mono font-normal">km safe</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.2)]">
            <Waves className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Public alerts blocked by policy */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-[#8EA0C4] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
              <span>Alerts blocked by policy</span>
            </div>
            <div className="text-3xl font-bold font-heading text-[#F43F5E] flex items-baseline gap-1.5">
              <span ref={blockedRef}>{sessionStats.alerts_blocked}</span>
              <span className="text-xs text-[#8EA0C4] font-mono font-normal">zero false panic</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-[#F43F5E] shadow-[0_0_12px_rgba(244,63,94,0.2)]">
            <ShieldX className="w-5 h-5" />
          </div>
        </div>

      </div>
    </div>
  )
}
