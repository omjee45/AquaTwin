import React from 'react'
import { ShieldCheck, ShieldAlert, Shield, Radio, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function PolicyGateCard({ policyEvent, isEvaluating }) {
  const isBlocked = policyEvent?.decision === 'DENY'
  const isAllowed = policyEvent?.decision === 'ALLOW'

  return (
    <div
      className={`p-5 rounded-[22px] backdrop-blur-xl border transition-all duration-300 shadow-2xl relative overflow-hidden ${
        isBlocked
          ? 'border-rose-500 bg-rose-500/10 shake-once shadow-[0_0_35px_rgba(244,63,94,0.25)]'
          : isAllowed
          ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
          : 'border-white/[0.08] bg-[#070D14]/90 hover:border-cyan-500/30'
      }`}
    >
      {/* Top ambient color bar indicator */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        isBlocked ? 'bg-rose-500' : isAllowed ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-transparent'
      }`} />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${
            isBlocked
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : isAllowed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          }`}>
            {isBlocked ? <ShieldAlert className="w-5 h-5" /> : isAllowed ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
              <span>Cedar Formal Gate</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">
              Engine: <strong className="text-cyan-400 font-semibold">{policyEvent?.cedar_engine || 'cedarpy (Rust)'}</strong>
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isEvaluating ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
              EVALUATING...
            </span>
          ) : isBlocked ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-rose-500 text-white shadow-lg shadow-rose-500/40 tracking-wider">
              BLOCKED BY POLICY
            </span>
          ) : isAllowed ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-400 text-black shadow-lg shadow-emerald-400/40 tracking-wider">
              ALERT AUTHORIZED
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#0D1520] text-zinc-400 border border-white/10">
              ARMED & READY
            </span>
          )}
        </div>
      </div>

      {/* Decision Body */}
      {policyEvent ? (
        <div className="space-y-3 font-mono text-xs">
          
          {/* Target Road Segment */}
          <div className="p-3 rounded-xl bg-[#05090D] border border-white/[0.06]">
            <div className="text-zinc-400 text-[10px] uppercase tracking-wider mb-0.5">Target Road Segment:</div>
            <div className="text-white font-bold text-sm tracking-tight truncate">
              {policyEvent.display_name || policyEvent.segment_id}
            </div>
            <div className="text-zinc-500 text-[10px] mt-0.5">
              Segment ID: {policyEvent.segment_id}
            </div>
          </div>

          {/* Probability & Source Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-[#05090D] border border-white/[0.06]">
              <span className="text-zinc-400 block text-[10px] uppercase">Confidence:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className={`text-base font-heading ${policyEvent.flood_pct > 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {policyEvent.flood_pct}%
                </strong>
                <span className="text-[10px] text-zinc-500">/ &gt;85% required</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#05090D] border border-white/[0.06]">
              <span className="text-zinc-400 block text-[10px] uppercase">Validation:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className={`text-base font-heading truncate ${policyEvent.validation_source === 'Sentinel-1' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {policyEvent.validation_source}
                </strong>
              </div>
              <span className="text-[10px] text-zinc-500 block">Radar confirmed</span>
            </div>
          </div>

          {/* Reason explanation */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
            isBlocked
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 flex items-center justify-between">
              <span>SNS Topic: AquaTwin-Emergency-Alerts</span>
              <span className="font-mono text-[10px] text-white truncate max-w-[120px]">
                {policyEvent.sns_message_id}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center font-mono text-xs text-zinc-400 space-y-1">
          <div className="text-zinc-300 font-semibold">Cedar policy engine initialized.</div>
          <p className="text-[11px] text-zinc-500">
            Awaiting dispatcher alert request to verify emergency broadcast invariants.
          </p>
        </div>
      )}
    </div>
  )
}
