import React from 'react'

export default function BuiltOnBar() {
  const stack = [
    'Sentinel-1 SAR (RTC)',
    'Copernicus 30m DEM',
    'GPM IMERG Rainfall',
    'OpenStreetMap NCT',
    'NetworkX Routing Engine',
    'Amazon SNS',
    'Amazon S3',
    'Cedar Policy (Rust Native)',
    'Strands Agents SDK',
    'MapLibre GL',
    'Three.js'
  ]

  return (
    <div className="w-full border-b border-[rgba(255,255,255,0.06)] bg-[#070B14]/90 py-2.5 px-6 font-mono text-xs select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#94A3B8] tracking-wider uppercase flex-shrink-0">
          BUILT ON
        </span>
        <div className="flex items-center gap-4 text-[#94A3B8] text-[11px]">
          {stack.map((item, idx) => (
            <React.Fragment key={idx}>
              <span className="hover:text-[#00F0FF] transition-colors">{item}</span>
              {idx < stack.length - 1 && (
                <span className="text-[rgba(255,255,255,0.15)]">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
