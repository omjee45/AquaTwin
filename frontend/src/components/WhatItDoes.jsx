import React from 'react'
import {
  Radio,
  Navigation,
  ShieldCheck,
  Layers,
  Cpu,
  Share2,
  MapPin,
  Waves
} from 'lucide-react'

export default function WhatItDoes() {
  const cards = [
    // Row 1: 2 large cards (col-span-3 each on lg)
    {
      id: 'radar',
      colSpan: 'lg:col-span-3',
      icon: Radio,
      iconColor: '#00D4FF',
      iconBg: 'bg-[#00D4FF]/10 border-[#00D4FF]/30',
      title: 'Storm-Piercing Radar Truth',
      text: 'Monsoon clouds and night darkness blind optical satellites and traffic cameras. Sentinel-1A SAR microwave radar penetrates cloud cover at 5.4 GHz, isolating 1.898 km² of active surface water across NCT Delhi via Otsu radiometric thresholding (-16.5 dB).',
      footer: 'sentinel-1a rtc · otsu -16.5 db · zero optical blindness'
    },
    {
      id: 'routing',
      colSpan: 'lg:col-span-3',
      icon: Navigation,
      iconColor: '#00E5B0',
      iconBg: 'bg-[#00E5B0]/10 border-[#00E5B0]/30',
      title: 'Deterministic Safe Corridors',
      text: 'Never lets an LLM guess navigational coordinates or risk live ambulances. Traverses 20,012 physical OpenStreetMap edges with strict mathematical penalties: edges with flood probability ≥ 0.50 are hard-blocked; 0.40–0.50 risk corridors carry a 4× traversal cost penalty.',
      footer: 'networkx · 93 flood edges avoided · +1.43 km safe detour'
    },

    // Row 2: 3 cards (col-span-2 each on lg)
    {
      id: 'elevation',
      colSpan: 'lg:col-span-2',
      icon: Layers,
      iconColor: '#38BDF8',
      iconBg: 'bg-[#38BDF8]/10 border-[#38BDF8]/30',
      title: 'Copernicus 30m HAND Elevation',
      text: 'Combines Height Above Nearest Drainage (HAND) with GPM IMERG cumulative rainfall (118.2 mm) to identify bowl-shaped underpasses and drainage traps before water even rises to surface level.',
      footer: 'copernicus glo-30 · hydrological basins · underpass risk'
    },
    {
      id: 'cedar',
      colSpan: 'lg:col-span-2',
      icon: ShieldCheck,
      iconColor: '#FFB347',
      iconBg: 'bg-[#FFB347]/10 border-[#FFB347]/30',
      title: 'Zero-Hallucination Policy Gate',
      text: 'An open-source AWS Cedar policy engine compiled in Rust intercepts every agent broadcast. Requires verified role permissions and physical radar flood evidence > 85% before alerting the public.',
      footer: 'cedarpy · formal verification · unconfirmed alerts blocked'
    },
    {
      id: 'sns',
      colSpan: 'lg:col-span-2',
      icon: Share2,
      iconColor: '#FF4560',
      iconBg: 'bg-[#FF4560]/10 border-[#FF4560]/30',
      title: 'Amazon SNS Emergency Dispatch',
      text: 'Once cleared by the Cedar policy gate, high-priority evacuation alerts immediately publish to Amazon SNS (AquaTwin-Emergency-Alerts), pushing verified critical safety warnings to first responders.',
      footer: 'amazon sns · zero-latency broadcast · push notification'
    },

    // Row 3: 2 large cards (col-span-3 each on lg)
    {
      id: 'strands',
      colSpan: 'lg:col-span-3',
      icon: Cpu,
      iconColor: '#A78BFA',
      iconBg: 'bg-[#A78BFA]/10 border-[#A78BFA]/30',
      title: 'Multi-Tool Reasoning Dispatcher',
      text: 'AWS Bedrock Nova Pro / Groq multi-provider reasoning inspects live hydrologic state, queries deterministic routing matrices, and formats dispatcher advisories with an inspectable step-by-step reasoning trace.',
      footer: 'strands sdk · bedrock nova · auditable tool calling'
    },
    {
      id: 'digitaltwin',
      colSpan: 'lg:col-span-3',
      icon: MapPin,
      iconColor: '#00D4FF',
      iconBg: 'bg-[#00D4FF]/10 border-[#00D4FF]/30',
      title: 'Delhi July 2023 Flood Replay',
      text: 'Replays the historic Yamuna flood peak with 14,904 nodes, live ambulance routes, and real road closures across Kashmere Gate, Ring Road, and Pragati Maidan with zero synthetic placeholders.',
      footer: 'yamuna peak · 14,904 nodes · real ground truth'
    }
  ]

  return (
    <section id="what-it-does" className="max-w-7xl mx-auto w-full px-6 py-20 space-y-12">
      
      {/* Section Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 uppercase tracking-wider">
            WHAT IT DOES
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-white tracking-tight leading-tight">
          Standard GPS blindly routes into rising floodwaters.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            AquaTwin proves the safe road before wheels roll.
          </span>
        </h2>

        <p className="text-sm md:text-base text-zinc-400 font-mono max-w-3xl leading-relaxed">
          Crowdsourced navigation fails when underpasses submerge and cloud cover blinds optical satellites.
          Emergency dispatch is a physical life-safety system — water depth is real, radar penetrates storm darkness,
          and every diversion must be mathematically proven. AquaTwin models the physical ground truth.
        </p>
      </div>

      {/* Modular Cards Grid matching 2-3-2 architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5 pt-2">
        {cards.map((card) => {
          const IconComp = card.icon
          return (
            <div
              key={card.id}
              className={`${card.colSpan} p-6 rounded-[22px] bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/35 transition-all duration-300 flex flex-col justify-between space-y-6 hover:shadow-[0_12px_40px_rgba(0,212,255,0.08)] group relative overflow-hidden`}
            >
              {/* Subtle top light sheen on hover */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-cyan-400/40 transition-all duration-500" />

              <div className="space-y-4">
                {/* Icon in top-left badge */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${card.iconBg} group-hover:scale-105 transition-transform duration-300`}>
                  <IconComp className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>

                {/* Card Title */}
                <h3 className="text-lg font-bold font-heading text-white group-hover:text-cyan-300 transition-colors leading-snug">
                  {card.title}
                </h3>

                {/* Card Body */}
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {card.text}
                </p>
              </div>

              {/* Monospace Micro Tag Footer */}
              <div className="pt-3 border-t border-white/[0.06] font-mono text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase tracking-wider">
                {card.footer}
              </div>
            </div>
          )
        })}
      </div>

    </section>
  )
}
