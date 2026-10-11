import React, { useState } from 'react'
import { Terminal, ChevronRight, ChevronDown, CheckCircle, Cpu, ShieldAlert, ArrowRight } from 'lucide-react'

export default function ReasoningTracePanel({ trace, isLoading, modelName }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx)
  }

  return (
    <div className="p-5 rounded-2xl glass-panel border border-cyan-500/25 flex flex-col h-[520px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide text-white uppercase">
            Agent Reasoning Trace
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>{modelName || 'gemini-flash-latest'}</span>
        </div>
      </div>

      {/* Trajectory Steps Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-cyan-400/80 space-y-2">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Strands Agent reasoning with tools & policy gate...</p>
          </div>
        ) : (!trace || trace.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-6 space-y-2">
            <Terminal className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400">Dispatcher Agent Idle</p>
            <p className="text-[11px] text-gray-600">
              Run a route calculation or alert simulation to observe the live tool-calling trajectory.
            </p>
          </div>
        ) : (
          trace.map((step, idx) => {
            const isCall = step.stage === 'tool_call'
            const isResult = step.stage === 'tool_result'
            const isInput = step.stage === 'input'
            const isFallback = step.stage === 'fallback'
            const isExpanded = expandedIndex === idx

            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all ${
                  isCall
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : isResult
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isFallback
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-black/30 border-gray-800'
                }`}
              >
                {/* Step Header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full p-2.5 flex items-center justify-between text-left gap-2 hover:bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] text-gray-500 font-bold min-w-[20px]">
                      #{idx + 1}
                    </span>

                    {/* Stage Label */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isCall
                        ? 'bg-blue-500/20 text-blue-300'
                        : isResult
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isFallback
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {step.stage}
                    </span>

                    {/* Step Title / Tool Name */}
                    <span className="text-gray-200 truncate font-semibold">
                      {step.tool || step.message || step.action || 'Inference'}
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-800/80 bg-black/60 rounded-b-xl overflow-x-auto text-[11px] leading-relaxed">
                    {step.input && (
                      <div className="mb-2">
                        <strong className="text-blue-300 block mb-1">Tool Input Arguments:</strong>
                        <pre className="text-gray-300 bg-black/40 p-2 rounded border border-gray-800">
                          {JSON.stringify(step.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {step.output && (
                      <div>
                        <strong className="text-emerald-300 block mb-1">Tool Result Output:</strong>
                        <pre className="text-gray-300 bg-black/40 p-2 rounded border border-gray-800 max-h-48 overflow-y-auto">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {step.reason && (
                      <div className="text-amber-300">
                        <strong>Reason:</strong> {step.reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
