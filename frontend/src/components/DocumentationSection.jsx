import React, { useState } from 'react'
import { BookOpen, Layers, ShieldCheck, Cpu, ArrowRight, X, ExternalLink, Code2, Database } from 'lucide-react'

export default function DocumentationSection() {
  const [activeTab, setActiveTab] = useState(null) // null = cards view, string = open doc modal

  const docArticles = {
    simulator: {
      tag: 'THE SIMULATOR',
      title: 'How deterministic routing actually works',
      summary: 'NetworkX graph of 20,012 OSM edges. Edges with flood probability ≥ 0.50 are blocked; model-risk edges (0.40–0.50) carry a 4× traversal cost penalty.',
      content: `
### Deterministic Routing Architecture
AquaTwin separates hydrologic computation from the AI reasoning loop. The LLM never invents coordinates, distance estimations, or flood risks.

#### 1. Graph Construction
- Extracted from OpenStreetMap for the NCT Delhi Yamuna catchment area (Bounding Box: 77.19°E to 77.28°E, 28.62°N to 28.70°N).
- 20,012 directed road segments across 14,904 OSM nodes.

#### 2. Risk Weighting & Cost Function
For every directed edge $e = (u, v)$ with physical length $L(e)$ and scored flood probability $P(e)$:
- If $P(e) \\ge 0.50$: **Hard Inundation Block**. The edge is removed from the traversable graph.
- If $0.40 \\le P(e) < 0.50$ (Hydrology model risk zone): **Penalty Multiplier** $W(e) = 4.0 \\times L(e)$.
- If $P(e) < 0.40$: Traversed at standard baseline length $W(e) = L(e)$.

#### 3. Operational Result
- **Ambulance 4 Start (Near Qutab Road, Node 6720363005) → Lok Nayak Hospital (Node 458640629)**:
  - Baseline unconstrained path: **5.386 km** (crosses flooded Yamuna floodplain).
  - Safe route: **6.814 km** (Detour: **+1.428 km**), completely bypassing 93 at-risk segments.
      `
    },
    data: {
      tag: 'DATA ACCURACY',
      title: 'Where every number comes from',
      summary: 'Sentinel-1A RTC interferometric scene (12-Jul-2023, -16.5 dB Otsu water mask), Copernicus 30m HAND low-lying zones, and 118.2 mm cumulative precipitation.',
      content: `
### Ground Truth Hydrologic Data Provenance
AquaTwin rejects synthetic mock hydrology. Every road segment is calibrated against real satellite radar and precipitation measurements during the peak July 2023 Delhi floods.

#### 1. Sentinel-1 SAR (Synthetic Aperture Radar)
- **Scene ID**: \`S1A_IW_GRDH_1SDV_20230712T005233_20230712T005258_049383_05F03C_rtc\`
- **Date**: 12-July-2023 00:52 UTC (1 day prior to peak Yamuna water level of 208.66 m at Old Railway Bridge).
- **Processing**: Radiometrically Terrain Corrected (RTC) VV polarization.
- **Water Mask**: Otsu automatic thresholding at **-16.5 dB**. Water surface area: **1.898 km²** across 82 polygons.
- **Validation**: Road segments intersecting radar polygons receive \`validation_source = 'Sentinel-1'\`.

#### 2. Digital Elevation Model (DEM) & HAND
- **Source**: Copernicus 30m DEM (GLO-30).
- **HAND**: Height Above Nearest Drainage calculated to isolate low-lying floodplain depressions where water pools.

#### 3. Precipitation Measurement
- **Source**: GPM IMERG / Open-Meteo precipitation reanalysis.
- **Total Event Rainfall**: **118.2 mm** cumulative rainfall recorded over NCT Delhi during the 72-hour storm window.
      `
    },
    cedar: {
      tag: 'CEDAR POLICY GATE',
      title: 'How the security gate protects the public',
      summary: 'AWS Cedar policy enforces role authorization and requires flood_pct > 85 with Sentinel-1 radar confirmation before allowing any public evacuation alert.',
      content: `
### Formal Cedar Security Policy Specification
An AI agent capable of dispatching public emergency broadcasts cannot be allowed to hallucinate hazard notifications. AquaTwin wraps the broadcast tool in an immutable Cedar policy gate executed natively via the Cedar Rust engine (\`cedarpy\`).

#### 1. Formal Policy Definition (\`cedar/policy.cedar\`)
\`\`\`cedar
permit(
  principal in Role::"EmergencyManager",
  action == Action::"SendAlert",
  resource
) when {
  context.flood_pct > 85 &&
  context.validation_source == "Sentinel-1"
};
\`\`\`

#### 2. Guaranteed Invariants
1. **Model Probabilities Blocked**: If an edge has a 41% flood probability predicted by the hydrologic model without radar confirmation (\`validation_source == 'model'\`), Cedar evaluates to **DENY**.
2. **Confidence Threshold**: Alerts require verified flood extent exceeding **85%**.
3. **Hardware-Level Enforcement**: The evaluator queries stored ground-truth database records directly, guaranteeing that the LLM cannot tamper with confidence metrics or spoof validation sources.
4. **AWS SNS Dispatch**: Upon Cedar \`ALLOW\`, alerts are published to topic \`AquaTwin-Emergency-Alerts\` with real message IDs.
      `
    }
  }

  return (
    <section className="w-full py-14 px-6 border-t border-[rgba(255,255,255,0.06)] bg-[#070B14]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header matching Screenshot 2 */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#94A3B8] text-[11px] font-mono tracking-wider uppercase mb-3">
            <BookOpen className="w-3 h-3 text-[#00F0FF]" />
            DOCUMENTATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#E6EDF7] tracking-tight">
            Every claim, with its source
          </h2>
          <p className="text-sm text-[#94A3B8] font-mono mt-1">
            Ground-truth data provenance, deterministic NetworkX routing formulas, and Cedar security proofs.
          </p>
        </div>

        {/* Three Cards Grid matching Screenshot 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Simulator */}
          <div
            onClick={() => setActiveTab('simulator')}
            className="p-6 rounded-[14px] glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[#00F0FF]/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-[#00F0FF]/10 active:scale-[0.99]"
          >
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#00F0FF] tracking-wider uppercase block">
                {docArticles.simulator.tag}
              </span>
              <h3 className="text-lg font-bold font-heading text-[#E6EDF7] group-hover:text-white transition-colors">
                {docArticles.simulator.title}
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
                {docArticles.simulator.summary}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#00F0FF] group-hover:translate-x-1 transition-transform">
              <span>Read technical details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Data Accuracy */}
          <div
            onClick={() => setActiveTab('data')}
            className="p-6 rounded-[14px] glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[#38BDF8]/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-[#38BDF8]/10 active:scale-[0.99]"
          >
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#38BDF8] tracking-wider uppercase block">
                {docArticles.data.tag}
              </span>
              <h3 className="text-lg font-bold font-heading text-[#E6EDF7] group-hover:text-white transition-colors">
                {docArticles.data.title}
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
                {docArticles.data.summary}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#38BDF8] group-hover:translate-x-1 transition-transform">
              <span>Read data provenance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Cedar Policy Gate */}
          <div
            onClick={() => setActiveTab('cedar')}
            className="p-6 rounded-[14px] glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[#10B981]/50 transition-all cursor-pointer group flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-[#10B981]/10 active:scale-[0.99]"
          >
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#10B981] tracking-wider uppercase block">
                {docArticles.cedar.tag}
              </span>
              <h3 className="text-lg font-bold font-heading text-[#E6EDF7] group-hover:text-white transition-colors">
                {docArticles.cedar.title}
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed font-mono">
                {docArticles.cedar.summary}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#10B981] group-hover:translate-x-1 transition-transform">
              <span>Read policy specification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

        {/* Modal / Expanded Documentation Drawer matching Screenshot 3 */}
        {activeTab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl max-h-[85vh] rounded-[16px] glass-panel border border-[rgba(255,255,255,0.12)] bg-[#0A0F1D] flex flex-col overflow-hidden shadow-2xl">
              
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#0E1626]">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#00F0FF]" />
                  <div>
                    <h3 className="text-base font-bold font-heading text-white">
                      AquaTwin Technical Documentation
                    </h3>
                    <span className="text-[11px] font-mono text-[#94A3B8]">
                      {docArticles[activeTab]?.tag}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#94A3B8] hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content with Left Sidebar Navigation (Screenshot 3 style) */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Navigation Sidebar */}
                <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.08)] p-4 space-y-1 bg-[#080D1A]/60 font-mono text-xs flex-shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#64748B] mb-2 px-2">SECTIONS</div>
                  
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      activeTab === 'simulator'
                        ? 'bg-[#00F0FF]/15 text-[#00F0FF] font-semibold border border-[#00F0FF]/30'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    The Simulator
                  </button>

                  <button
                    onClick={() => setActiveTab('data')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      activeTab === 'data'
                        ? 'bg-[#38BDF8]/15 text-[#38BDF8] font-semibold border border-[#38BDF8]/30'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Data Accuracy
                  </button>

                  <button
                    onClick={() => setActiveTab('cedar')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      activeTab === 'cedar'
                        ? 'bg-[#10B981]/15 text-[#10B981] font-semibold border border-[#10B981]/30'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Cedar Policy Gate
                  </button>
                </div>

                {/* Right Markdown/Content Pane */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs text-[#CBD5E1] leading-relaxed">
                  <h3 className="text-xl font-bold font-heading text-white mb-2">
                    {docArticles[activeTab]?.title}
                  </h3>
                  
                  <div className="prose prose-invert max-w-none text-xs space-y-3">
                    {docArticles[activeTab]?.content.trim().split('\n\n').map((block, i) => {
                      if (block.startsWith('### ')) {
                        return <h4 key={i} className="text-sm font-bold text-[#00F0FF] pt-2 border-b border-[rgba(255,255,255,0.06)] pb-1">{block.replace('### ', '')}</h4>
                      }
                      if (block.startsWith('#### ')) {
                        return <h5 key={i} className="text-xs font-bold text-white pt-1">{block.replace('#### ', '')}</h5>
                      }
                      if (block.startsWith('```')) {
                        const code = block.replace(/```[a-z]*/g, '').trim()
                        return (
                          <pre key={i} className="p-3 rounded-lg bg-black/60 border border-[rgba(255,255,255,0.08)] text-[#00F0FF] overflow-x-auto text-[11px]">
                            <code>{code}</code>
                          </pre>
                        )
                      }
                      return <p key={i} className="text-[#94A3B8]">{block.replace(/\\ge/g, '≥').replace(/\\le/g, '≤').replace(/\\times/g, '×')}</p>
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  )
}
