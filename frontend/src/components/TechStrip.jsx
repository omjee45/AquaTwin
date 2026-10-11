import React from 'react'

export default function TechStrip() {
  const technologies = [
    { name: 'Strands Agents SDK', cat: 'Agent Framework' },
    { name: 'Bedrock Nova Pro', cat: 'Multi-Tool Reasoning' },
    { name: 'AWS Cedar', cat: 'Formal Policy Engine' },
    { name: 'AWS Lambda', cat: 'Serverless Compute' },
    { name: 'Amazon SNS', cat: 'Emergency Broadcast' },
    { name: 'NetworkX', cat: 'Deterministic Routing' },
    { name: 'Sentinel-1A SAR', cat: '5.4 GHz Radar' },
    { name: 'Simplified HAND', cat: 'Copernicus 30m DEM' },
    { name: 'MapLibre GL', cat: 'Vector Geospatial' },
    { name: 'Amazon S3', cat: 'RTC Scene Store' }
  ]

  return (
    <div className="w-full border-b border-blue-500/10 bg-[#02060F]/60 py-2.5 overflow-hidden select-none font-mono text-[11px]">
      <div className="marquee-container">
        <div
          className="marquee-content flex gap-8 items-center"
          style={{ animation: 'marquee-horizontal 35s linear infinite' }}
        >
          {technologies.concat(technologies).concat(technologies).map((tech, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]/60" />
              <span className="text-zinc-300 tracking-wider uppercase font-medium">
                {tech.name}
              </span>
              <span className="text-[10px] text-[#8EA0C4] font-normal">
                [{tech.cat}]
              </span>
              <span className="text-blue-900/40 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
