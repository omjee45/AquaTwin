import React, { useState } from 'react'
import { Send, Terminal, AlertTriangle, ArrowRight, Sparkles, Navigation, ShieldAlert, ShieldCheck } from 'lucide-react'

export default function AIPanel({
  trace,
  isLoading,
  llmUnavailable,
  llmReason,
  onSendMessage,
  onManualRoute,
  places,
  demoSegments
}) {
  const [input, setInput] = useState('')

  const hospitalName = places?.find(p => p.role === 'hospital_main')?.name || 'Lok Nayak Hospital (LNJP)'
  const blockedRoadName = 'Sansad Marg'
  const allowedRoadName = 'Unnamed road near Delhi–Dehradun Expressway'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading || llmUnavailable) return
    onSendMessage(input.trim())
    setInput('')
  }

  const chips = [
    {
      label: `Safe route for Ambulance 4 to LNJP`,
      sub: 'Deterministic detour bypassing 93 flooded edges',
      icon: Navigation,
      iconColor: 'text-cyan-400',
      query: `Check flood status and route ambulance from Ambulance 4 start (Near Qutab Road) to ${hospitalName}.`
    },
    {
      label: `Send alert for ${blockedRoadName}`,
      sub: 'Low confidence (41%) • Expect Cedar DENY',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      query: `Dispatch emergency evacuation alert for Sansad Marg segment 5799663725_4083435383_0.`
    },
    {
      label: `Send alert for ${allowedRoadName}`,
      sub: 'Radar confirmed (91%) • Expect Cedar ALLOW',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      query: `Broadcast emergency flood alert for confirmed high-risk radar segment 9789474393_9789474394_0.`
    }
  ]

  return (
    <div className="space-y-4">
      
      {/* llm_unavailable state: amber banner, chat disabled, manual route button */}
      {llmUnavailable && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 text-xs font-mono shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <div>
              <strong className="text-amber-200">LLM Throttled:</strong> {llmReason || 'Model quota reached. Deterministic engine ready.'}
            </div>
          </div>
          <button
            onClick={onManualRoute}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
          >
            Manual route
          </button>
        </div>
      )}

      {/* AI Panel Glass Container */}
      <div className="p-5 rounded-[22px] bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl space-y-4">
        
        {/* Scenario triggers header */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-200 font-semibold">Dispatcher Scenarios</span>
            </div>
            <span className="text-[10px] text-zinc-500">1-CLICK RUN</span>
          </div>

          {/* Three One-Click Scenario Buttons */}
          <div className="flex flex-col gap-2">
            {chips.map((chip, idx) => {
              const IconComp = chip.icon
              return (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip.query)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-xl bg-[#05090D] hover:bg-[#0A1420] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex items-center justify-between group active:scale-[0.99] disabled:opacity-50 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <IconComp className={`w-4 h-4 ${chip.iconColor} flex-shrink-0`} />
                    <div className="truncate">
                      <div className="text-xs font-mono font-medium text-zinc-200 group-hover:text-white truncate">
                        {chip.label}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {chip.sub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Dispatch Prompt Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || llmUnavailable}
            placeholder={llmUnavailable ? "Chat disabled (LLM unavailable) — use Manual Route above" : "Instruct dispatch agent..."}
            className="flex-1 px-4 py-2.5 rounded-full bg-[#05090D] border border-white/10 focus:border-cyan-400 focus:outline-none text-xs font-mono text-white placeholder-zinc-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || llmUnavailable}
            className="p-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Reasoning Trace Section */}
        <div className="pt-2 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reasoning Trace</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Evaluating...</span>
              </div>
            )}
          </div>

          {/* Trace Items List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {isLoading && trace.length === 0 ? (
              // Loading Skeleton
              <div className="space-y-2 animate-pulse">
                <div className="h-10 bg-[#05090D] rounded-xl" />
                <div className="h-10 bg-[#05090D] rounded-xl" />
              </div>
            ) : trace.length === 0 ? (
              // Empty State
              <div className="p-4 rounded-xl bg-[#05090D] border border-white/[0.04] text-center text-xs font-mono text-zinc-500">
                Trigger any scenario above to observe multi-tool reasoning and policy decisions.
              </div>
            ) : (
              trace.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[#05090D] border border-white/[0.06] font-mono text-xs space-y-1 hover:border-cyan-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-cyan-400">
                      {item.tool || item.stage || 'step'}
                    </span>
                    <span className="text-zinc-600">#{i + 1}</span>
                  </div>
                  <div className="text-zinc-300 text-[11px] leading-relaxed">
                    {item.message || item.action || (item.output ? JSON.stringify(item.output).slice(0, 95) + '...' : 'Processing')}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
