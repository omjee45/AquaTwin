import React, { useState } from 'react'
import { ArrowRight, BookOpen, ShieldCheck, Database, Cpu, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function Documentation({ onBackToCommand }) {
  const [activeArticle, setActiveArticle] = useState(null)

  const cards = [
    {
      id: 'simulator',
      tag: 'THE SIMULATOR',
      title: 'How deterministic routing actually works',
      text: 'NetworkX graph of OSM edges. Edges with flood probability ≥ 0.50 are blocked; model-risk edges (0.40-0.50) carry a 4× traversal cost penalty.',
      linkText: 'Read technical details ->',
      color: '#00E5B0',
      content: {
        intro: 'AquaTwin strictly isolates the AI agent from hydrologic pathfinding. The routing engine is 100% deterministic code executing over a physical road network.',
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
            body: 'Ambulance 4 (Near Qutab Road) to Lok Nayak Hospital:\n• Default unconstrained route: 5.386 km (crosses inundated corridor)\n• Safe route: 6.814 km (+1.428 km detour), successfully bypassing all 93 model-risk and radar-inundated edges.'
          }
        ]
      }
    },
    {
      id: 'data',
      tag: 'DATA ACCURACY',
      title: 'Where every number comes from',
      text: 'Sentinel-1A RTC interferometric scene (Otsu water mask), Copernicus 30m HAND low-lying zones, and historical cumulative precipitation.',
      linkText: 'Read data provenance ->',
      color: '#00D4FF',
      content: {
        intro: 'Every flood probability is grounded in physical satellite radar, digital elevation modeling, and storm precipitation measurements from the Delhi July 2023 flood event.',
        sections: [
          {
            heading: '1. Sentinel-1 SAR Radar (Ground Truth)',
            body: 'Radiometrically Terrain Corrected (RTC) VV polarization scene S1A_IW_GRDH_1SDV_20230712T005233 acquired 12-Jul-2023 00:52 UTC. Automatic Otsu thresholding at -16.5 dB identifies 1.898 km² of open water across 82 polygons.'
          },
          {
            heading: '2. Copernicus 30m DEM & HAND',
            body: 'Height Above Nearest Drainage (HAND) derived from Copernicus GLO-30 elevation data models relative drainage potential and isolates depressions prone to rapid waterlogging.'
          },
          {
            heading: '3. Storm Rainfall Reanalysis',
            body: 'GPM IMERG cumulative precipitation analysis records 118.2 mm over NCT Delhi during the peak 72-hour storm window, providing rainfall normalization weights.'
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
      color: '#FFB347',
      content: {
        intro: 'To prevent dangerous hallucinations and false alarms, public emergency alerts must pass a formal Cedar security policy executed natively in Rust (cedarpy).',
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
    <div className="w-full min-h-[calc(100vh-var(--nav-h))] bg-[#05090D] py-10 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top Breadcrumb / Navigation */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 uppercase tracking-wider">
              DOCUMENTATION
            </span>
            <span className="text-xs font-mono text-zinc-500">/ Technical Architecture</span>
          </div>
          {onBackToCommand && (
            <button
              onClick={onBackToCommand}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#070D14] hover:bg-[#0A1420] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back to Command Center</span>
            </button>
          )}
        </div>

        {/* Header matching requested text */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-white tracking-tight">
            Every claim, with its source
          </h1>
          <p className="text-base text-zinc-400 font-mono max-w-3xl leading-relaxed">
            Ground-truth data provenance, deterministic NetworkX routing formulas, and Cedar security proofs.
          </p>
        </div>

        {/* 3 Dark Glassmorphic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => setActiveArticle(card.id)}
              className="p-6 rounded-[22px] bg-[#070D14]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-5 hover:shadow-[0_12px_36px_rgba(0,212,255,0.08)] group active:scale-[0.99] relative overflow-hidden"
            >
              <div className="space-y-3">
                <span
                  style={{ color: card.color }}
                  className="text-[11px] font-mono font-bold tracking-wider uppercase block"
                >
                  {card.tag}
                </span>

                <h3 className="text-lg font-bold font-heading text-zinc-100 group-hover:text-white transition-colors leading-snug">
                  {card.title}
                </h3>

                <p className="text-xs text-zinc-400 font-mono leading-relaxed">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[85vh] rounded-[20px] bg-[#070D14] border border-white/[0.12] flex flex-col overflow-hidden shadow-2xl">
              
              {/* Modal Header */}
              {(() => {
                const current = cards.find(c => c.id === activeArticle)
                return (
                  <>
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#05090D]">
                      <div>
                        <span style={{ color: current.color }} className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                          {current.tag}
                        </span>
                        <h3 className="text-lg font-bold font-heading text-white">
                          {current.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveArticle(null)}
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all text-xs font-mono px-3"
                      >
                        Close
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs text-zinc-300 leading-relaxed">
                      <p className="text-sm text-zinc-400 border-b border-white/[0.06] pb-3">
                        {current.content.intro}
                      </p>

                      <div className="space-y-4">
                        {current.content.sections.map((sec, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-[#05090D] border border-white/[0.06] space-y-2">
                            <h4 style={{ color: current.color }} className="text-xs font-bold uppercase tracking-wider">
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
