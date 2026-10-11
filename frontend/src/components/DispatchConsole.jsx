import React, { useState } from 'react'
import { Send, Navigation, ShieldX, ShieldCheck, Sparkles } from 'lucide-react'

export default function DispatchConsole({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
  }

  const quickActions = [
    {
      label: 'Route Ambulance 4',
      icon: Navigation,
      query: 'Check flood status and route ambulance from Ambulance 4 start (Near Qutab Road) to Lok Nayak Hospital.',
      color: 'border-emerald-500/30 text-emerald-300 hover:border-emerald-400',
    },
    {
      label: 'Test Blocked Alert (41%)',
      icon: ShieldX,
      query: 'Dispatch emergency evacuation alert for Sansad Marg segment 5799663725_4083435383_0.',
      color: 'border-red-500/30 text-red-300 hover:border-red-400',
    },
    {
      label: 'Broadcast Radar Alert (91%)',
      icon: ShieldCheck,
      query: 'Broadcast emergency flood alert for confirmed high-risk radar segment 9789474393_9789474394_0.',
      color: 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400',
    },
  ]

  return (
    <div className="w-full glass-panel p-4 rounded-2xl border border-cyan-500/20 space-y-3">
      
      {/* Quick Action Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          QUICK SCENARIOS:
        </span>
        {quickActions.map((action, i) => {
          const Icon = action.icon
          return (
            <button
              key={i}
              onClick={() => onSendMessage(action.query)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border text-xs font-mono transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50 ${action.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Interactive Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Instruct the Strands dispatch agent (e.g., 'Check flood risk for segment 9789474393...')"
            className="w-full px-4 py-3 rounded-xl bg-black/60 border border-gray-700 focus:border-cyan-400 focus:outline-none text-white placeholder-gray-500 text-sm font-mono transition-all pr-10"
          />
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex items-center justify-center px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold transition-all shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  )
}
