import React from 'react'
import {
  Radio,
  Navigation,
  ShieldCheck,
  Layers,
  Cpu,
  Share2,
  MapPin
} from 'lucide-react'

export default function WhatItDoes() {
  const cards = [
    // Row 1: 2 large cards (col-span-3 each on lg)
    {
      id: 'radar',
      colSpan: 'lg:col-span-3',
      icon: Radio,
      iconColor: '#22D3EE',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30',
      title: 'Storm-Piercing Radar Truth',
      text: 'Monsoon clouds and night darkness blind optical satellites and traffic cameras. Sentinel-1A SAR microwave radar penetrates cloud cover at 5.4 GHz, isolating 1.898 km² of active surface water across NCT Delhi via fixed -16.5 dB thresholding.',
      footer: 'sentinel-1a rtc · fixed -16.5 db · zero optical blindness'
    },
    {
      id: 'routing',
      colSpan: 'lg:col-span-3',
      icon: Navigation,
      iconColor: '#34D399',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      title: 'Deterministic Safe Corridors',
      text: 'No LLM in the routing step. Traverses 20,012 physical OpenStreetMap edges with strict mathematical penalties: edges with flood probability ≥ 0.50 are hard-blocked; 0.40–0.50 risk corridors carry a 4× traversal cost penalty.',
      footer: 'networkx · deterministic routing matrix · safe detour'
    },

    // Row 2: 3 cards (col-span-2 each on lg)
    {
      id: 'elevation',
      colSpan: 'lg:col-span-2',
      icon: Layers,
      iconColor: '#5AA9FF',
      iconBg: 'bg-blue-500/10 border-blue-500/30',
      title: 'Simplified HAND from Copernicus 30 m DEM',
      text: 'Combines Height Above Nearest Drainage (HAND) with Open-Meteo cumulative rainfall (118.2 mm) to identify bowl-shaped underpasses and drainage traps before water even rises to surface level.',
      footer: 'copernicus glo-30 · hydrological drainage · underpass risk'
    },
    {
      id: 'cedar',
      colSpan: 'lg:col-span-2',
      icon: ShieldCheck,
      iconColor: '#F59E0B',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      title: 'Policy Gate Protection',
      text: 'An open-source AWS Cedar policy engine intercepts every agent broadcast. Requires verified role permissions and physical radar flood evidence > 85% before alerting the public.',
      footer: 'cedarpy · evaluated outside the llm · unconfirmed alerts blocked'
    },
    {
      id: 'sns',
      colSpan: 'lg:col-span-2',
      icon: Share2,
      iconColor: '#F43F5E',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      title: 'Amazon SNS Emergency Dispatch',
      text: 'Once cleared by the Cedar policy gate, high-priority evacuation alerts publish to Amazon SNS (AquaTwin-Emergency-Alerts), pushing verified critical safety warnings to first responders.',
      footer: 'amazon sns · zero-latency broadcast · push notification'
    },

    // Row 3: 2 large cards (col-span-3 each on lg)
    {
      id: 'strands',
      colSpan: 'lg:col-span-3',
      icon: Cpu,
      iconColor: '#A78BFA',
      iconBg: 'bg-violet-500/10 border-violet-500/30',
      title: 'Multi-Tool Reasoning Dispatcher',
      text: 'Dual-provider reasoning via Groq (gpt-oss-120b) and Gemini inspects live hydrologic state, queries deterministic routing matrices, and formats advisories with an auditable step-by-step reasoning trace.',
      footer: 'groq & gemini · auditable tool calling · fast fallback'
    },
    {
      id: 'digitaltwin',
      colSpan: 'lg:col-span-3',
      icon: MapPin,
      iconColor: '#22D3EE',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30',
      title: 'Delhi July 2023 Flood Replay',
      text: 'Replays the historic Yamuna flood peak with 14,904 nodes, live ambulance routes, and real road closures across Kashmere Gate, Ring Road, and Pragati Maidan with zero synthetic placeholders.',
      footer: 'yamuna replay · 14,904 nodes loaded · real ground truth'
    }
  ]

  return (
    <section id="what-it-does" className="max-w-[1200px] mx-auto w-full px-4 py-20 space-y-12">
      
      {/* Section Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="pill-status">
            WHAT IT DOES
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-light font-heading text-white tracking-tight leading-tight">
          Standard GPS blindly routes into rising floodwaters.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AA9FF] via-[#3B82F6] to-[#22D3EE]">
            AquaTwin proves the safe road before wheels roll.
          </span>
        </h2>

        <p className="text-sm md:text-base text-[#8EA0C4] font-sans max-w-3xl leading-relaxed">
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
              className={`${card.colSpan} glass-card p-6 flex flex-col justify-between space-y-6 group relative overflow-hidden`}
            >
              <div className="space-y-4">
                {/* Icon in badge */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${card.iconBg} group-hover:scale-105 transition-transform duration-300`}>
                  <IconComp className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>

                {/* Card Title */}
                <h3 className="text-lg font-semibold font-heading text-white group-hover:text-[#5AA9FF] transition-colors leading-snug">
                  {card.title}
                </h3>

                {/* Card Body */}
                <p className="text-xs text-[#8EA0C4] font-sans leading-relaxed">
                  {card.text}
                </p>
              </div>

              {/* Monospace Micro Tag Footer */}
              <div className="pt-3 border-t border-blue-500/15 font-mono text-[10px] text-[#52658A] group-hover:text-[#8EA0C4] transition-colors uppercase tracking-wider">
                {card.footer}
              </div>
            </div>
          )
        })}
      </div>

    </section>
  )
}
