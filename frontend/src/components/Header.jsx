import React, { useState, useEffect } from 'react'
import { Clock, Menu, X, Droplets, Radar } from 'lucide-react'

export default function Header({
  currentView,
  onNavigate,
  isCedarActive = true,
  isApiOffline = false
}) {
  const [timeStr, setTimeStr] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('command-center')

  // Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Scroll detection
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)

      // Simple scroll spy when in command view
      if (currentView === 'command') {
        const sections = ['command-center', 'what-it-does', 'how-it-works']
        for (const s of sections) {
          const el = document.getElementById(s)
          if (el) {
            const rect = el.getBoundingClientRect()
            if (rect.top <= 120 && rect.bottom >= 120) {
              setActiveSection(s)
              break
            }
          }
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [currentView])

  const navItems = [
    { id: 'command-center', label: 'Command Center', view: 'command' },
    { id: 'what-it-does', label: 'What It Does', view: 'command' },
    { id: 'how-it-works', label: 'How It Works', view: 'command' },
    { id: 'docs', label: 'Documentation', view: 'docs' },
  ]

  const handleNavClick = (item) => {
    setMobileOpen(false)
    if (item.view === 'docs') {
      onNavigate('docs')
    } else {
      onNavigate('command', item.id)
    }
  }

  return (
    <header
      id="site-nav"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all duration-300"
      style={{
        height: 'var(--nav-h)',
        backgroundColor: scrolled ? 'rgba(2, 6, 15, 0.88)' : 'rgba(2, 6, 15, 0.55)',
        borderBottom: '1px solid rgba(90, 150, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        
        {/* ── Logo on Left: AquaTwin wordmark + small water-drop radar icon ── */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          onClick={() => onNavigate('command', 'command-center')}
        >
          {/* Water-drop Radar Icon */}
          <div className="relative w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-400/35 flex items-center justify-center text-[#5AA9FF] shadow-[0_0_12px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform">
            <Droplets className="w-4 h-4 text-[#5AA9FF]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22D3EE] animate-ping" />
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-extrabold text-lg tracking-tight text-white">
              AQUA<span className="text-[#5AA9FF]">TWIN</span>
            </span>
            <span className="hidden sm:inline-block font-mono text-[9px] text-[#8EA0C4] uppercase tracking-wider">
              Replay
            </span>
          </div>
        </div>

        {/* ── Centered Links (Desktop) with Scroll-Spy Highlight ── */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.view === 'docs'
                ? currentView === 'docs'
                : currentView === 'command' && activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`px-3.5 py-1.5 rounded-full font-mono text-xs tracking-tight transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-white bg-blue-600/20 border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.25)] font-medium'
                    : 'text-[#8EA0C4] hover:text-white border border-transparent'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* ── Right: Cedar Active pill & IST Clock ── */}
        <div className="hidden sm:flex items-center gap-3">
          
          {/* Cedar Active Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] border transition-all ${
              isApiOffline
                ? 'bg-rose-950/30 border-rose-500/30 text-[#F43F5E]'
                : isCedarActive
                ? 'bg-emerald-950/30 border-emerald-500/30 text-[#34D399]'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isApiOffline
                  ? 'bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]'
                  : isCedarActive
                  ? 'bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="font-medium tracking-wide">
              {isApiOffline ? 'Offline' : isCedarActive ? 'Cedar Active' : 'Cedar Idle'}
            </span>
          </div>

          {/* IST Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#050B1E]/80 border border-blue-500/20 font-mono text-[11px] text-[#8EA0C4]">
            <Clock className="w-3 h-3 text-[#5AA9FF]" />
            <span>{timeStr}</span>
          </div>

        </div>

        {/* ── Mobile Hamburger Menu Toggle ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-1.5 rounded-lg text-[#8EA0C4] hover:text-white hover:bg-white/5 border border-blue-500/20"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

      {/* ── Mobile Sheet Drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed top-[var(--nav-h)] left-0 right-0 bottom-0 bg-[#02060F]/95 backdrop-blur-2xl z-40 p-6 flex flex-col justify-between"
          style={{ height: 'calc(100vh - var(--nav-h))' }}
        >
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="text-left py-3 px-4 rounded-xl font-heading text-lg font-medium text-zinc-200 hover:text-white hover:bg-blue-600/10 border border-transparent hover:border-blue-500/30"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-6 border-t border-blue-500/20 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#8EA0C4]">
              <span>Status</span>
              <span className="text-[#34D399] font-semibold">Cedar Active</span>
            </div>
            <div className="flex items-center justify-between text-[#8EA0C4]">
              <span>Time</span>
              <span>{timeStr}</span>
            </div>
          </div>
        </div>
      )}

    </header>
  )
}
