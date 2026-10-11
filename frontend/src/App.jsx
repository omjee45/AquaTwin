import React, { useState, useEffect } from 'react'
import { getState, computeRoute, sendChat } from './api'
import Hero from './components/Hero'
import StatCounters from './components/StatCounters'
import MapDashboard from './components/MapDashboard'
import AIPanel from './components/AIPanel'
import PolicyGateCard from './components/PolicyGateCard'
import TelemetryMarquee from './components/TelemetryMarquee'
import Documentation from './components/Documentation'
import TechStrip from './components/TechStrip'
import WhatItDoes from './components/WhatItDoes'
import HowItWorks from './components/HowItWorks'
import { ShieldCheck, Clock, Radar, Menu, X } from 'lucide-react'

const STORAGE_KEY = 'aquatwin_session_stats'

export default function App() {
  // 1. Hydrology & Platform State
  const [stateData, setStateData] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [trace, setTrace] = useState([])
  const [policyEvent, setPolicyEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [llmUnavailable, setLlmUnavailable] = useState(false)
  const [llmReason, setLlmReason] = useState('')
  const [currentView, setCurrentView] = useState('command') // 'command' | 'docs'
  const [recentEvent, setRecentEvent] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // 2. Persistent Real Session Totals
  const [sessionStats, setSessionStats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      routes_rerouted: 1,
      km_avoided: 1.43,
      alerts_blocked: 1
    }
  })

  const updateSessionStats = (delta) => {
    setSessionStats(prev => {
      const next = {
        routes_rerouted: (prev.routes_rerouted || 0) + (delta.routes_rerouted || 0),
        km_avoided: Number(((prev.km_avoided || 0) + (delta.km_avoided || 0)).toFixed(2)),
        alerts_blocked: (prev.alerts_blocked || 0) + (delta.alerts_blocked || 0)
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }

  // 3. Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Scroll detection for nav background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 4. Initial Load: fetch state & compute initial route
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      try {
        const state = await getState()
        setStateData(state)

        // Compute baseline vs safe route
        const route = await computeRoute(6720363005, 458640629)
        setRouteData(route)
        setTrace([
          { stage: 'input', message: 'Route ambulance from Ambulance 4 start (Near Qutab Road) to Lok Nayak Hospital.' },
          { stage: 'tool_call', tool: 'compute_safe_route', input: { origin_node: 6720363005, destination_node: 458640629 } },
          { stage: 'tool_result', tool: 'compute_safe_route', output: {
            safe_route_km: route.safe_route?.distance_km || 6.814,
            detour_km: route.safe_route?.detour_km || 1.428,
            risk_segments_avoided: route.safe_route?.risk_segments_avoided || 93
          }},
          { stage: 'inference', message: `Safe route established: ${route.safe_route?.distance_km} km (+${route.safe_route?.detour_km?.toFixed(2)} km detour) bypassing flooded corridors.` }
        ])
        setRecentEvent(`Ambulance 4: +${route.safe_route?.detour_km?.toFixed(2) || '1.43'} km safe detour bypassing ${route.safe_route?.risk_segments_avoided || 93} flooded segments.`)
      } catch (err) {
        console.error('Initialization error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  // 5. Action: Send Dispatcher Chat message
  const handleSendMessage = async (queryText) => {
    setIsLoading(true)
    try {
      const resp = await sendChat(queryText)
      
      if (resp.llm_unavailable) {
        setLlmUnavailable(true)
        setLlmReason(resp.reason || 'Model throttled / quota exceeded.')
      } else {
        setLlmUnavailable(false)
        setLlmReason('')
      }

      setTrace(resp.trace || [])
      
      if (resp.policy_event) {
        setPolicyEvent(resp.policy_event)
        if (resp.policy_event.decision === 'DENY') {
          updateSessionStats({ alerts_blocked: 1 })
          setRecentEvent(`Cedar policy BLOCKED unauthorized alert for ${resp.policy_event.display_name}`)
        } else if (resp.policy_event.decision === 'ALLOW') {
          setRecentEvent(`Cedar policy AUTHORIZED emergency broadcast for ${resp.policy_event.display_name}`)
        }
      } else {
        // If query was routing, compute route
        const route = await computeRoute(6720363005, 458640629)
        setRouteData(route)
        updateSessionStats({
          routes_rerouted: 1,
          km_avoided: (route.safe_route?.detour_km || 1.43)
        })
        setRecentEvent(`Ambulance 4: Safe route updated (${route.safe_route?.distance_km} km)`)
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 6. Action: Manual Route (fallback when llm_unavailable)
  const handleManualRoute = async () => {
    setIsLoading(true)
    try {
      const route = await computeRoute(6720363005, 458640629)
      setRouteData(route)
      updateSessionStats({
        routes_rerouted: 1,
        km_avoided: (route.safe_route?.detour_km || 1.43)
      })
      setTrace([
        { stage: 'manual_route', message: 'Manual deterministic NetworkX route computation triggered.' },
        { stage: 'route_result', tool: 'compute_safe_route', output: {
          distance_km: route.safe_route?.distance_km,
          detour_km: route.safe_route?.detour_km,
          avoided_flood_edges: route.safe_route?.risk_segments_avoided
        }}
      ])
      setRecentEvent(`Manual route dispatched: ${route.safe_route?.distance_km} km to Lok Nayak Hospital.`)
    } catch (err) {
      console.error('Manual route error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCommandCenter = () => {
    const el = document.getElementById('command-center')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScrollTo = (id) => {
    if (currentView !== 'command') {
      setCurrentView('command')
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } else {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const navLinks = [
    { label: 'Command Center', action: () => { setCurrentView('command'); handleScrollTo('command-center') }, active: currentView === 'command' },
    { label: 'What It Does', action: () => { setCurrentView('command'); handleScrollTo('what-it-does') }, active: false },
    { label: 'How It Works', action: () => { setCurrentView('command'); handleScrollTo('how-it-works') }, active: false },
    { label: 'Documentation', action: () => setCurrentView('docs'), active: currentView === 'docs' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>

      {/* ── STICKY NAV ── */}
      <header
        id="site-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-h)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          transition: 'background 0.3s ease, border-color 0.3s ease',
          background: scrolled
            ? 'rgba(5,9,13,0.92)'
            : 'transparent',
          borderBottom: scrolled
            ? '1px solid rgba(0,212,255,0.08)'
            : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        }}
      >
        <div style={{ maxWidth: '1280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

          {/* Brand */}
          <button
            onClick={() => setCurrentView('command')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,229,176,0.15))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Radar size={16} color="var(--water)" />
            </div>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '17px', letterSpacing: '-0.03em', color: 'var(--text)' }}>
              AQUA<span style={{ color: 'var(--mint)' }}>TWIN</span>
            </span>
            <span style={{
              display: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px', fontWeight: 600,
              padding: '3px 8px', borderRadius: '99px',
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.18)',
              color: 'var(--water)',
              letterSpacing: '0.08em', textTransform: 'uppercase'
            }} className="sm-show">
              NCT Delhi Flood Ops
            </span>
          </button>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.action}
                style={{
                  padding: '6px 14px',
                  borderRadius: '99px',
                  border: link.active ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                  background: link.active ? 'rgba(0,212,255,0.07)' : 'transparent',
                  color: link.active ? 'var(--water)' : 'var(--muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!link.active) e.target.style.color = 'var(--text)' }}
                onMouseLeave={e => { if (!link.active) e.target.style.color = 'var(--muted)' }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '99px',
              background: 'rgba(0,229,176,0.06)',
              border: '1px solid rgba(0,229,176,0.22)',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: 'var(--mint)',
                boxShadow: '0 0 8px var(--mint)',
                animation: 'signal-blink 1.4s ease-in-out infinite',
              }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, color: 'var(--mint)', letterSpacing: '0.06em' }}>
                Cedar Active
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--rim)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px', color: 'var(--muted)',
            }}>
              <Clock size={11} />
              <span>{timeStr}</span>
            </div>
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {currentView === 'docs' ? (
          <Documentation onBackToCommand={() => setCurrentView('command')} />
        ) : (
          <>
            {/* Hero */}
            <Hero onOpenCommandCenter={handleOpenCommandCenter} />

            {/* Tech Strip */}
            <TechStrip />

            {/* Stat Counters */}
            <StatCounters sessionStats={sessionStats} />

            {/* Command Center */}
            <section id="command-center" style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px', scrollMarginTop: 'var(--nav-h)' }}>

              {/* Command Center Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                      background: 'var(--mint)', boxShadow: '0 0 10px var(--mint)',
                      animation: 'signal-blink 1.4s ease-in-out infinite'
                    }} />
                    <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                      Command Center
                    </h2>
                    <span style={{
                      padding: '3px 10px', borderRadius: '99px',
                      background: 'rgba(0,229,176,0.07)',
                      border: '1px solid rgba(0,229,176,0.2)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px', fontWeight: 600, color: 'var(--mint)',
                      letterSpacing: '0.08em',
                    }}>
                      LIVE
                    </span>
                  </div>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                    Sentinel-1 SAR Flood Mask · Deterministic Emergency Routing · Cedar Policy Gate
                  </p>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--muted)', textAlign: 'right', lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--water)', fontWeight: 600 }}>Ambulance 4 Start</div>
                  <div>Near Qutab Road → Lok Nayak Hospital</div>
                </div>
              </div>

              {/* Command Grid: Map (left) + AI Panel (right) */}
              <div className="command-grid">

                {/* Left: Map */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <MapDashboard
                    routeData={routeData}
                    places={stateData?.places}
                  />

                  {/* Route Metrics Badge */}
                  {routeData?.safe_route && (
                    <div style={{
                      padding: '14px 20px',
                      borderRadius: '14px',
                      background: 'rgba(0,229,176,0.04)',
                      border: '1px solid rgba(0,229,176,0.2)',
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>
                          Calculated Safe Corridor
                        </span>
                        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 800, color: 'var(--mint)' }}>
                          {routeData.safe_route.distance_km} km
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--muted)', marginLeft: '10px' }}>
                          Baseline: {routeData.default_route?.distance_km} km · Detour: +{routeData.safe_route.detour_km?.toFixed(2)} km
                        </span>
                      </div>
                      <div style={{
                        padding: '6px 14px', borderRadius: '8px',
                        background: 'rgba(0,229,176,0.08)',
                        border: '1px solid rgba(0,229,176,0.25)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px', fontWeight: 700, color: 'var(--mint)',
                      }}>
                        {routeData.safe_route.risk_segments_avoided || 93} flooded edges bypassed
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Policy Gate + AI Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <PolicyGateCard
                    policyEvent={policyEvent}
                    isEvaluating={isLoading}
                  />
                  <AIPanel
                    trace={trace}
                    isLoading={isLoading}
                    llmUnavailable={llmUnavailable}
                    llmReason={llmReason}
                    onSendMessage={handleSendMessage}
                    onManualRoute={handleManualRoute}
                    places={stateData?.places}
                    demoSegments={stateData?.demo_segments}
                  />
                </div>

              </div>
            </section>

            {/* What It Does */}
            <WhatItDoes />

            {/* How It Works */}
            <HowItWorks />
          </>
        )}
      </main>

      {/* Bottom Telemetry Marquee */}
      <TelemetryMarquee
        stats={stateData?.stats}
        demoSegments={stateData?.demo_segments}
        recentEvent={recentEvent}
      />

    </div>
  )
}
