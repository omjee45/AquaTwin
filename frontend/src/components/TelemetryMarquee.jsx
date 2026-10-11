import React from 'react'

export default function TelemetryMarquee({ stats, demoSegments, recentEvent }) {
  const rainTotal = stats?.rain_total_mm ? `${stats.rain_total_mm} mm` : '118.2 mm'
  const allowSeg = demoSegments?.allow_candidates?.[0]?.id || '9789474393_9789474394_0'
  const allowProb = demoSegments?.allow_candidates?.[0]?.flood_pct || 91
  const allowSource = demoSegments?.allow_candidates?.[0]?.validation_source || 'Sentinel-1'

  const items = [
    { tag: 'PRECIPITATION', text: `GPM IMERG 72-Hr Rainfall: ${rainTotal}`, color: 'text-cyan-400', tagColor: 'bg-cyan-500/10 border-cyan-500/30' },
    { tag: 'CONFIRMED SEGMENT', text: `ID ${allowSeg} • Flood: ${allowProb}% • Source: ${allowSource} (Verified)`, color: 'text-emerald-400', tagColor: 'bg-emerald-500/10 border-emerald-500/30' },
    { tag: 'UNCONFIRMED RISK', text: `Sansad Marg 5799663725 • Flood: 41% • Source: model (Cedar Gate Blocked)`, color: 'text-rose-400', tagColor: 'bg-rose-500/10 border-rose-500/30' },
    { tag: 'ACTIVE DISPATCH', text: recentEvent || 'Ambulance 4 Start (Near Qutab Road) → Lok Nayak Hospital (+1.43 km detour)', color: 'text-cyan-300', tagColor: 'bg-cyan-500/10 border-cyan-500/30' },
    { tag: 'SAR RADAR SCENE', text: 'Sentinel-1A IW GRD 2023-07-12 00:52 UTC (RTC VV Otsu Mask -16.5 dB)', color: 'text-zinc-300', tagColor: 'bg-white/5 border-white/10' },
    { tag: 'CEDAR POLICY GATE', text: 'permit(principal in Role::EmergencyManager) when { flood_pct > 85 }', color: 'text-violet-400', tagColor: 'bg-violet-500/10 border-violet-500/30' },
  ]

  return (
    <div className="w-full border-t border-white/[0.08] bg-[#05090D]/95 backdrop-blur-md py-2 overflow-hidden font-mono text-xs select-none sticky bottom-0 z-40">
      <div className="marquee-container">
        <div className="marquee-content flex gap-8 items-center">
          {items.concat(items).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0">
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${item.color} ${item.tagColor}`}>
                {item.tag}
              </span>
              <span className="text-zinc-300 text-[11px]">{item.text}</span>
              <span className="text-zinc-700 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
