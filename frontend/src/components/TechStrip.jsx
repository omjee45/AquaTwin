import React from 'react'

export default function TechStrip() {
  const technologies = [
    { name: 'Strands Agents SDK', cat: 'Agent Framework' },
    { name: 'Bedrock Nova Pro', cat: 'Multi-Tool Reasoning' },
    { name: 'AWS Cedar', cat: 'Formal Policy Engine' },
    { name: 'AWS Lambda', cat: 'Serverless Compute' },
    { name: 'Amazon SNS', cat: 'Emergency Broadcast' },
    { name: 'NetworkX', cat: 'Deterministic Pathfinding' },
    { name: 'Sentinel-1A SAR', cat: '5.4 GHz Radar' },
    { name: 'Copernicus 30m HAND', cat: 'Hydrologic DEM' },
    { name: 'MapLibre GL', cat: 'Vector Geospatial' },
    { name: 'Amazon S3', cat: 'RTC Scene Store' }
  ]

  return (
    <div className="w-full border-y border-white/[0.08] bg-[#05090D] py-3 overflow-hidden select-none font-mono text-[11px]">
      <div className="marquee-container">
        <div
          className="marquee-content flex gap-8 items-center"
          style={{ animation: 'marquee-scroll 35s linear infinite' }}
        >
          {technologies.concat(technologies).concat(technologies).map((tech, idx) => (
            <div key={idx} className="flex items-center gap-2.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
              <span className="text-zinc-200 tracking-wider uppercase font-semibold">
                {tech.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">
                [{tech.cat}]
              </span>
              <span className="text-zinc-700 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
