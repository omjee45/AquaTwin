import React, { useState, useEffect } from 'react'
import { ShieldCheck, Radio, Server, Activity, Clock } from 'lucide-react'

export default function Header({ modelInfo, isConnected }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="w-full border-b border-cyan-500/20 bg-[#070b14]/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & Mission Tag */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/40 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight font-heading text-white">
                AQUA<span className="text-cyan-400">TWIN</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 uppercase tracking-wider">
                v2.0 • Delhi Flood Ops
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Sentinel-1 SAR Radar Digital Twin & Cedar Policy Gate
            </p>
          </div>
        </div>

        {/* Live Operational Badges */}
        <div className="flex items-center gap-3 text-xs font-mono">
          
          {/* Radar Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>SAR EXTENT: <strong className="text-white">JULY 2023</strong></span>
          </div>

          {/* Cedar Gate */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>CEDAR: <strong className="text-white">ACTIVE</strong></span>
          </div>

          {/* AI Model */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>MODEL: <strong className="text-white">{modelInfo?.model_name || 'gemini-flash-latest'}</strong></span>
          </div>

          {/* Local IST Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800/60 border border-gray-700/60 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{time}</span>
          </div>
        </div>

      </div>
    </header>
  )
}
