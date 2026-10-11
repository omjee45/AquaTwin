import React from 'react'
import { ShieldCheck, ShieldAlert, Shield, Radio, CheckCircle2, XCircle } from 'lucide-react'

export default function PolicyGateCard({ policyEvent, isEvaluating }) {
  const isBlocked = policyEvent?.decision === 'DENY'
  const isAllowed = policyEvent?.decision === 'ALLOW'

  return (
    <div
      className={`glass-card p-5 relative overflow-hidden transition-all duration-300 ${
        isBlocked
          ? 'border-[#F43F5E] bg-rose-950/20 shake-once shadow-[0_0_35px_rgba(244,63,94,0.3)]'
          : isAllowed
          ? 'border-[#34D399] bg-emerald-950/20 shadow-[0_0_35px_rgba(52,211,153,0.3)]'
          : ''
      }`}
    >
      {/* Top ambient color bar indicator */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        isBlocked
          ? 'bg-[#F43F5E]'
          : isAllowed
          ? 'bg-[#34D399]'
          : 'bg-gradient-to-r from-[#3B82F6] via-[#5AA9FF] to-transparent'
      }`} />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-blue-500/15 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${
            isBlocked
              ? 'bg-rose-500/20 text-[#F43F5E] border border-rose-500/30'
              : isAllowed
              ? 'bg-emerald-500/20 text-[#34D399] border border-emerald-500/30'
              : 'bg-blue-600/15 text-[#5AA9FF] border border-blue-400/30'
          }`}>
            {isBlocked ? <ShieldAlert className="w-5 h-5" /> : isAllowed ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
              <span>Cedar Policy Gate</span>
            </h3>
            <span className="text-[10px] text-[#8EA0C4] font-mono">
              Engine: <strong className="text-[#5AA9FF] font-medium">{policyEvent?.cedar_engine || 'cedarpy'}</strong>
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isEvaluating ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-blue-600/20 text-[#93C5FD] border border-blue-400/30 animate-pulse">
              EVALUATING...
            </span>
          ) : isBlocked ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-[#F43F5E] text-white shadow-lg shadow-rose-500/40 tracking-wider">
              BLOCKED BY POLICY
            </span>
          ) : isAllowed ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-[#34D399] text-black shadow-lg shadow-emerald-400/40 tracking-wider animate-pulse">
              ALERT SENT
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#050B1E] text-[#8EA0C4] border border-blue-500/20">
              ARMED
            </span>
          )}
        </div>
      </div>

      {/* Decision Body */}
      {policyEvent ? (
        <div className="space-y-3 font-mono text-xs">
          
          {/* Target Road Segment */}
          <div className="p-3 rounded-xl bg-[#02060F]/80 border border-blue-500/15">
            <div className="text-[#8EA0C4] text-[10px] uppercase tracking-wider mb-0.5">Target Road Segment:</div>
            <div className="text-white font-bold text-sm tracking-tight truncate">
              {policyEvent.display_name || policyEvent.segment_id}
            </div>
            <div className="text-[#52658A] text-[10px] mt-0.5">
              Segment ID: {policyEvent.segment_id}
            </div>
          </div>

          {/* Probability & Source Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-[#02060F]/80 border border-blue-500/15">
              <span className="text-[#8EA0C4] block text-[10px] uppercase">Confidence:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className={`text-base font-heading ${policyEvent.flood_pct > 85 ? 'text-[#34D399]' : 'text-[#F59E0B]'}`}>
                  {policyEvent.flood_pct}%
                </strong>
                <span className="text-[10px] text-[#52658A]">/ &gt;85% required</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#02060F]/80 border border-blue-500/15">
              <span className="text-[#8EA0C4] block text-[10px] uppercase">Validation:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className={`text-base font-heading truncate ${policyEvent.validation_source === 'Sentinel-1' ? 'text-[#34D399]' : 'text-[#F43F5E]'}`}>
                  {policyEvent.validation_source}
                </strong>
              </div>
              <span className="text-[10px] text-[#52658A] block">Source verification</span>
            </div>
          </div>

          {/* Reason explanation */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
            isBlocked
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
          }`}>
            <strong className="block mb-1 text-[11px] font-bold uppercase tracking-wider">
              {isBlocked ? 'Rejection Verification:' : 'Formal Authorization Verified:'}
            </strong>
            <p className="text-[11px] text-zinc-300">
              {policyEvent.policy_reason || (isBlocked ? 'Flood confidence below 85% threshold or validation source unconfirmed by radar.' : 'Verified Sentinel-1 SAR evidence & flood confidence > 85%.')}
            </p>
          </div>

          {/* SNS publication indicator if allowed */}
          {isAllowed && policyEvent.sns_message_id && (
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-[#34D399] flex items-center justify-between">
              <span>SNS Topic: AquaTwin-Emergency-Alerts</span>
              <span className="font-mono text-[10px] text-white truncate max-w-[130px]">
                {policyEvent.sns_message_id}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center font-mono text-xs text-[#8EA0C4] space-y-1">
          <div className="text-zinc-300 font-medium">Cedar policy gate armed.</div>
          <p className="text-[11px] text-[#52658A]">
            Blocked by policy, evaluated outside the LLM.
          </p>
        </div>
      )}
    </div>
  )
}
