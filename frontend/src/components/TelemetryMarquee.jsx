import React from 'react'

export default function TelemetryMarquee({ stats, demoSegments, recentEvent }) {
  const rainTotal = stats?.rain_total_mm ? `${stats.rain_total_mm} mm` : '118.2 mm'
  const floodArea = stats?.flood_extent_area_km2 ? `${stats.flood_extent_area_km2} km²` : '1.898 km²'
  const nodeCount = stats?.segment_count_directed ? `${stats.segment_count_directed.toLocaleString()}` : '20,012'

  const allowSeg = demoSegments?.allow_candidates?.[0]?.id || '9789474393_9789474394_0'
  const allowProb = demoSegments?.allow_candidates?.[0]?.flood_pct ?? 91
  const allowSource = demoSegments?.allow_candidates?.[0]?.validation_source || 'Sentinel-1'

  const items = [
    { tag: 'PRECIPITATION', text: `Open-Meteo Total: ${rainTotal} (Peak 8 Jul: 36.1 mm)`, color: 'text-[#93C5FD]' },
    { tag: 'RADAR EXTENT', text: `Sentinel-1A: 12 Jul 2023, 00:52 UTC (06:22 IST) • Water: ${floodArea}`, color: 'text-[#22D3EE]' },
    { tag: 'ROAD GRAPH', text: `NCT Delhi OSM Network: ${nodeCount} directed segments loaded`, color: 'text-[#8EA0C4]' },
    { tag: 'THRESHOLD', text: `Backscatter cutoff: fixed -16.5 dB`, color: 'text-[#F59E0B]' },
    { tag: 'POLICY GATE', text: `cedarpy: permit(principal in Role::EmergencyManager) when { flood_pct > 85 }`, color: 'text-[#A78BFA]' },
    { tag: 'VERIFIED SEGMENT', text: `ID ${allowSeg} • Flood: ${allowProb}% • Source: ${allowSource} (ALLOWED)`, color: 'text-[#34D399]' },
  ]

  if (recentEvent) {
    items.unshift({ tag: 'ACTIVE DISPATCH', text: recentEvent, color: 'text-[#5AA9FF]' })
  }

  return (
    <div className="w-full border-y border-blue-500/15 bg-[#050B1E]/80 backdrop-blur-md py-2 overflow-hidden font-mono text-xs select-none relative z-20">
      <div className="marquee-container">
        <div className="marquee-content flex gap-8 items-center">
          {items.concat(items).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0">
              <span className="font-medium px-2 py-0.5 rounded text-[10px] bg-blue-950/60 border border-blue-500/30 text-[#93C5FD]">
                [{item.tag}]
              </span>
              <span className={`text-[11px] ${item.color}`}>{item.text}</span>
              <span className="text-blue-900/60 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
