import React, { useState } from 'react'
import { ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react'

export default function Documentation({ onBackToCommand }) {
  const [activeArticle, setActiveArticle] = useState(null)

  const cards = [
    {
      id: 'simulator',
      tag: 'THE SIMULATOR',
      title: 'How deterministic routing actually works',
      text: 'NetworkX graph of OSM edges. Edges with flood probability ≥ 0.50 are blocked; risk edges (0.40-0.50) carry a 4× traversal cost penalty.',
      linkText: 'Read technical details ->',
      color: '#34D399',
      content: {
        intro: 'No LLM in the routing step. AquaTwin strictly isolates the AI agent from hydrologic pathfinding. The routing engine is 100% deterministic code executing over a physical road network.',
        sections: [
          {
            heading: '1. Network Topology',
            body: 'OpenStreetMap directed graph of NCT Delhi containing 20,012 physical segments and 14,904 nodes covering the Yamuna floodplain between 77.19°E–77.28°E and 28.62°N–28.70°N.'
          },
          {
            heading: '2. Penalty Cost Formulation',
            body: 'For an edge e with physical length L(e) and flood score P(e):\n• P(e) ≥ 0.50: Hard block (edge removed from traversal graph)\n• 0.40 ≤ P(e) < 0.50: Penalized traversal weight W(e) = 4.0 × L(e)\n• P(e) < 0.40: Standard baseline traversal W(e) = L(e)'
          },
          {
            heading: '3. Real Operational Benchmark',
            body: 'Ambulance 4 (Near Qutab Road) to Lok Nayak Hospital:\n• Default unconstrained route: 5.386 km (crosses inundated corridor)\n• Safe route: 6.814 km (+1.428 km detour), successfully bypassing all model-risk and radar-inundated edges.'
          }
        ]
      }
    },
    {
      id: 'data',
      tag: 'DATA ACCURACY',
      title: 'Where every number comes from',
      text: 'Sentinel-1A RTC interferometric scene (fixed -16.5 dB water mask), Simplified HAND from Copernicus 30 m DEM, and Open-Meteo precipitation reanalysis.',
      linkText: 'Read data provenance ->',
      color: '#22D3EE',
      content: {
        intro: 'Every flood probability is grounded in physical satellite radar, digital elevation modeling, and storm precipitation measurements from the Delhi July 2023 flood event.',
        sections: [
          {
            heading: '1. Sentinel-1 SAR Radar (Ground Truth)',
            body: 'Radiometrically Terrain Corrected (RTC) VV polarization scene S1A_IW_GRDH_1SDV_20230712T005233 acquired 12 Jul 2023, 00:52 UTC (06:22 IST). Fixed thresholding at -16.5 dB identifies 1.898 km² of open water across 82 polygons.'
          },
          {
            heading: '2. Simplified HAND from Copernicus 30 m DEM',
            body: 'Height Above Nearest Drainage (HAND) derived from Copernicus GLO-30 elevation data models relative drainage potential and isolates depressions prone to rapid waterlogging.'
          },
          {
            heading: '3. Storm Rainfall Reanalysis (Open-Meteo)',
            body: 'Open-Meteo historical weather reanalysis records 118.2 mm total precipitation over NCT Delhi between 08 Jul and 14 Jul 2023, peaking on 08 Jul at 36.1 mm.'
          },
          {
            heading: '4. Yamuna Water Level Record Source',
            body: 'Central Water Commission (CWC) Official Bulletin & Press Information Bureau (PIB Delhi):\nOn 13 July 2023, the Yamuna river at the Old Railway Bridge (ORB) Delhi reached its all-time historical peak of 208.66 m, standing 3.33 m above the danger level mark of 205.33 m (exceeding the previous 1978 record of 207.49 m).'
          }
        ]
      }
    },
    {
      id: 'cedar',
      tag: 'CEDAR POLICY GATE',
      title: 'How the security gate protects the public',
      text: 'AWS Cedar policy enforces role authorization and requires flood_pct > 85 with Sentinel-1 radar confirmation before allowing any public evacuation alert.',
      linkText: 'Read policy specification ->',
      color: '#F59E0B',
      content: {
        intro: 'Blocked by policy, evaluated outside the LLM. To prevent false alarms, public emergency alerts must pass a formal Cedar security policy executed in cedarpy.',
        sections: [
          {
            heading: '1. Cedar Policy Definition (cedar/policy.cedar)',
            body: 'permit(\n  principal in Role::"EmergencyManager",\n  action == Action::"SendAlert",\n  resource\n) when {\n  context.flood_pct > 85 &&\n  context.validation_source == "Sentinel-1"\n};'
          },
          {
            heading: '2. Enforced Invariants',
            body: '• Model-only predictions (e.g., Sansad Marg 41%) are denied: DENY\n• Alerts require Sentinel-1 radar confirmation and flood_pct > 85%: ALLOW\n• Context metrics are read directly from stored data, preventing the LLM from fabricating confidence values.'
          },
          {
            heading: '3. Amazon SNS Dispatch',
            body: 'Only upon policy evaluation returning ALLOW is the message dispatched to the Amazon SNS topic AquaTwin-Emergency-Alerts.'
          }
        ]
      }
    }
  ]

  return (
    <div
      className="w-full min-h-[calc(100vh-var(--nav-h))] py-12 px-6"
      style={{
        marginTop: 'var(--nav-h)', // Fix: toolbar sits strictly below the nav and never overlaps it
      }}
    >
      <div className="max-w-[1200px] mx-auto space-y-10">
        
        {/* Top Breadcrumb / Navigation Toolbar */}
        <div className="flex items-center justify-between border-b border-blue-500/15 pb-4">
          <div className="flex items-center gap-2">
            <span className="pill-status">
              DOCUMENTATION
            </span>
            <span className="text-xs font-mono text-[#8EA0C4]">/ Technical Architecture</span>
          </div>
          {onBackToCommand && (
            <button
              onClick={onBackToCommand}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#5AA9FF]" />
              <span>Back to Command Center</span>
            </button>
          )}
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light font-heading text-white tracking-tight">
            Every claim, with its source
          </h1>
          <p className="text-base text-[#8EA0C4] font-sans max-w-3xl leading-relaxed">
            Ground-truth data provenance, deterministic NetworkX routing formulas, and Cedar security proofs.
          </p>
        </div>

        {/* 3 Dark Glassmorphic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => setActiveArticle(card.id)}
              className="glass-card p-6 cursor-pointer flex flex-col justify-between space-y-5 group relative overflow-hidden"
            >
              <div className="space-y-3">
                <span
                  style={{ color: card.color }}
                  className="text-[11px] font-mono font-medium tracking-wider uppercase block"
                >
                  {card.tag}
                </span>

                <h3 className="text-lg font-semibold font-heading text-zinc-100 group-hover:text-white transition-colors leading-snug">
                  {card.title}
                </h3>

                <p className="text-xs text-[#8EA0C4] font-sans leading-relaxed">
                  {card.text}
                </p>
              </div>

              <div
                style={{ color: card.color }}
                className="flex items-center gap-1.5 text-xs font-mono group-hover:translate-x-1 transition-transform pt-2"
              >
                <span>{card.linkText}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Article Modal / Detail Pane */}
        {activeArticle && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveArticle(null)}
          >
            <div
              className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#050B1E] border border-blue-500/30 flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const current = cards.find(c => c.id === activeArticle)
                return (
                  <>
                    <div className="flex items-center justify-between p-5 border-b border-blue-500/15 bg-[#02060F]">
                      <div>
                        <span style={{ color: current.color }} className="text-[10px] font-mono font-medium uppercase tracking-wider block">
                          {current.tag}
                        </span>
                        <h3 className="text-lg font-semibold font-heading text-white">
                          {current.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveArticle(null)}
                        className="btn-secondary py-1 px-3 text-xs"
                      >
                        Close
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs text-zinc-300 leading-relaxed">
                      <p className="text-sm text-[#8EA0C4] border-b border-blue-500/15 pb-3">
                        {current.content.intro}
                      </p>

                      <div className="space-y-4">
                        {current.content.sections.map((sec, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-[#02060F]/80 border border-blue-500/15 space-y-2">
                            <h4 style={{ color: current.color }} className="text-xs font-semibold uppercase tracking-wider">
                              {sec.heading}
                            </h4>
                            <pre className="text-zinc-200 text-[11px] whitespace-pre-wrap font-mono leading-relaxed">
                              {sec.body}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
