import React, { useState } from 'react'
import { Send, Terminal, AlertTriangle, ArrowRight, Sparkles, Navigation, ShieldAlert, ShieldCheck, Cpu } from 'lucide-react'

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
      sub: 'Deterministic detour bypassing flooded edges',
      icon: Navigation,
      iconColor: 'text-[#5AA9FF]',
      query: `Check flood status and route ambulance from Ambulance 4 start (Near Qutab Road) to ${hospitalName}.`
    },
    {
      label: `Send alert for ${blockedRoadName}`,
      sub: 'Unconfirmed model (41%) • Expect Cedar DENY',
      icon: ShieldAlert,
      iconColor: 'text-[#F43F5E]',
      query: `Dispatch emergency evacuation alert for Sansad Marg segment 5799663725_4083435383_0.`
    },
    {
      label: `Send alert for ${allowedRoadName}`,
      sub: 'Radar confirmed (91%) • Expect Cedar ALLOW',
      icon: ShieldCheck,
      iconColor: 'text-[#34D399]',
      query: `Broadcast emergency flood alert for confirmed high-risk radar segment 9789474393_9789474394_0.`
    }
  ]

  return (
    <div className="space-y-4">
      
      {/* llm_unavailable state */}
      {llmUnavailable && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-[#F59E0B]/40 text-[#F59E0B] flex items-center justify-between gap-3 text-xs font-mono shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <strong className="text-amber-200">LLM Throttled:</strong> {llmReason || 'Model quota reached. Deterministic engine ready.'}
            </div>
          </div>
          <button
            onClick={onManualRoute}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-amber-300 text-black font-bold text-xs whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
          >
            Manual route
          </button>
        </div>
      )}

      {/* AI Panel Glass Container */}
      <div className="glass-card p-5 space-y-4">
        
        {/* Model Badge Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-500/15">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-600/20 text-[#5AA9FF] border border-blue-400/30">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="font-mono text-xs font-semibold text-white">
              gpt-oss-120b <span className="text-[#8EA0C4] font-normal">via Groq</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-400/25 text-[#93C5FD]">
              calls: 1
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-400/25 text-[#93C5FD]">
              cached
            </span>
          </div>
        </div>

        {/* Scenario triggers header */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-[#8EA0C4] uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5AA9FF]" />
              <span className="text-zinc-200 font-semibold">Scenario Triggers</span>
            </div>
            <span className="text-[10px] text-[#52658A]">1-CLICK RUN</span>
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
                  className="w-full text-left p-3 rounded-xl bg-[#02060F]/70 hover:bg-blue-950/40 border border-blue-500/15 hover:border-blue-400/40 transition-all flex items-center justify-between group active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <IconComp className={`w-4 h-4 ${chip.iconColor} flex-shrink-0`} />
                    <div className="truncate">
                      <div className="text-xs font-mono font-medium text-zinc-200 group-hover:text-white truncate">
                        {chip.label}
                      </div>
                      <div className="text-[10px] font-mono text-[#8EA0C4]">
                        {chip.sub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#52658A] group-hover:text-[#5AA9FF] flex-shrink-0 transition-colors" />
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
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#02060F]/80 border border-blue-500/25 focus:border-[#5AA9FF] focus:outline-none text-xs font-mono text-white placeholder-[#52658A] disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || llmUnavailable}
            className="btn-primary py-2 px-3 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Reasoning Trace Section */}
        <div className="pt-2 border-t border-blue-500/15 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <Terminal className="w-3.5 h-3.5 text-[#5AA9FF]" />
              <span>Reasoning Trace</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#5AA9FF]">
                <span className="w-2 h-2 rounded-full bg-[#5AA9FF] animate-ping" />
                <span>Evaluating...</span>
              </div>
            )}
          </div>

          {/* Trace Items List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {isLoading && trace.length === 0 ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-10 bg-[#02060F]/80 rounded-xl" />
                <div className="h-10 bg-[#02060F]/80 rounded-xl" />
              </div>
            ) : trace.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#02060F]/60 border border-blue-500/10 text-center text-xs font-mono text-[#8EA0C4]">
                Trigger any scenario above to observe multi-tool reasoning and Cedar policy decisions.
              </div>
            ) : (
              trace.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[#02060F]/80 border border-blue-500/15 font-mono text-xs space-y-1 hover:border-blue-400/30 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold uppercase text-[#5AA9FF]">
                      {item.tool || item.stage || 'step'}
                    </span>
                    <span className="text-[#52658A]">#{i + 1}</span>
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
