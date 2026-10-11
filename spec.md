# AquaTwin: Master Plan (finalised idea)

Flood-aware emergency routing for monsoon waterlogging.
Environmental Hacks (WeMakeDevs x AWS), **Track 02: Heat and Water**, Monsoon waterlogging / Floods. Build type: Ship It.

---

## 0. How to use this document

- **Antigravity (build):** save as `SPEC.md` in the repo root. Sections 6-11 are the build spec; Section 12 has the prompts.
- **Gemini:** use it to polish copy, the blog post and the video script. The idea is final; do not add or remove features.
- **NotebookLM (intro video):** Section 16 is the story brief and Section 17 is the fact sheet. Fill in Section 17 with real numbers after the build, then add screenshots and this file as sources.
- **Time available:** 1 hour today (Sat Oct 10) + 6 hours tomorrow (Sun Oct 11). Check the exact submission deadline on the rules page.

---

## 1. One-line pitch

"SAR confirms where the water is. Terrain and rainfall predict where it will pool next. An AWS agent reroutes ambulances around it, and a Cedar policy decides whether a public alert is allowed to fire."

---

## 2. Problem statement

Every monsoon, city streets and underpasses flood within hours. Control rooms have no real-time picture of which roads are unsafe, so ambulances and pump trucks get sent down routes that are already waterlogged. Standard optical satellites are useless under dense storm cloud. And while software could help recommend reroutes, an AI that can send public alerts on its own is dangerous: one false alert can cause real harm.

---

## 3. Solution

AquaTwin gives a flood control-room dispatcher a map where every road segment carries a flood probability, plus an AI assistant that finds safe routes and drafts alerts.

1. **Evidence:** Sentinel-1 radar (works through cloud) confirms flood extent. Terrain (HAND / low-lying zones) and rainfall estimate where water will pool next. Each road segment gets a `flood_probability`, with `validation_source = "Sentinel-1"` where radar confirms water.
2. **Deterministic routing:** plain code removes or penalises flooded edges and finds the shortest safe path. This is the "simulation". The LLM never invents hydrology.
3. **Agent:** a Strands agent on Amazon Nova explains the reasoning, picks tools and drafts alerts. Code does the math.
4. **Cedar gate:** before any public alert goes out through SNS, a policy checks the role and the evidence. The LLM cannot bypass it.

**Honest framing (use these words):** Sentinel-1 is used for flood *extent confirmation*, not "real-time street flooding". Cedar is pitched as "the LLM cannot bypass this gate", not as "mathematically proven safe".

---

## 4. Who it's for and demo scenario

**User:** a flood control-room dispatcher in an Indian city during monsoon. They need to know which roads and underpasses are unsafe, and what route to send an ambulance or pump truck on instead.

**Event replayed (so the demo is reproducible):** Delhi July 2023 Yamuna flood. DTU and the judges are in Delhi, so it resonates. Check that a Sentinel-1 scene covers it. Fallbacks: Chennai Dec 2023, or Himachal/Punjab July 2023 floods.

---

## 5. What gets built (and nothing more)

1. Offline data prep (one Python script, output saved as static files)
2. Deterministic routing (plain code, no LLM)
3. Agent layer (Strands SDK + Amazon Nova)
4. Cedar gate
5. UI
6. Lean AWS deployment

**Cut list (not built):** Aurora, pgvector, the knowledge graph, the 3-agent swarm, live satellite ingestion, Transcribe voice commands. The architecture story survives because the pipeline is still clear.

---

## 6. Data prep (one Python script, run once)

- **Sentinel-1 flood extent:** Otsu threshold on VV, water mask for the event, saved as GeoJSON
- **DEM:** Copernicus 30 m, giving low-lying and HAND risk zones
- **Rainfall:** event window, from Open-Meteo or GPM IMERG
- **Roads:** OSM road graph for the area
- **Output:** each road segment gets a `flood_probability`, a simple weighted score of SAR overlap, low HAND and rainfall, with `validation_source` set to "Sentinel-1" where SAR confirms it

Files go to S3 as static data: flood extent GeoJSON and the scored road graph.

---

## 7. Deterministic routing (no LLM)

- NetworkX or OSMnx graph
- Remove or penalise edges above a threshold, then find the shortest safe path
- Output for the UI: route coordinates, distance, flooded segments avoided, detour vs the unconstrained route

---

## 8. Agent layer (Strands SDK + Amazon Nova)

- One orchestrator on **Nova Pro** with three tools: `get_flood_status`, `compute_safe_route`, `send_alert`
- Optionally **Nova Lite** for multilingual alert text (Hindi / English)
- The LLM explains the reasoning, picks tools and drafts the alert. Code does the math.
- On Bedrock failure, return an `llm_unavailable` flag, with a clean UI degradation state (no silent fallbacks)

`send_alert` receives only a segment id and message text from the LLM. The gate reads the flood probability and validation source from the stored data, so a hallucinated value cannot get through.

---

## 9. Cedar gate (the memorable moment)

Policy on `send_alert` requires: role `EmergencyManager`, `flood_probability > 0.85`, and `validation_source == "Sentinel-1"`.

```cedar
permit(
  principal in Role::"EmergencyManager",
  action == Action::"SendAlert",
  resource
) when {
  context.flood_probability > 0.85 &&
  context.validation_source == "Sentinel-1"
};
```

Implementation note: Cedar has no plain float type, so pass the probability as a scaled integer (for example `flood_pct`, compare `> 85`) or use Cedar's decimal extension. The rule is the same.

- Evaluate locally with the open-source Cedar library (this satisfies the "AWS open source tool" requirement).
- **Demo:** the agent tries to send an alert on a low-confidence segment, the UI flashes **BLOCKED BY POLICY**, then it fires on a confirmed segment via SNS to your email.

---

## 10. AWS deployment (lean)

- Frontend on Amplify Hosting, or S3 + CloudFront
- Backend on Lambda + API Gateway with the Strands agent, calling Bedrock
- SNS for alerts; static GeoJSON and graph files in S3
- Seed secrets manually in Secrets Manager after deploy
- Deploy without provisioned concurrency (new accounts have low limits); document it and absorb the cold start in the video
- Enable Bedrock model access for Nova; the IAM policy and the env var must use the matching model ID or inference profile
- Confirm the SNS email subscription

---

## 11. UI (your proven winning components, unchanged)

Components, in build order of importance:

1. **Map dashboard:** MapLibre or deck.gl map with flood polygons, risk-coloured roads and a route that visibly reroutes
2. **Reasoning trace panel:** each tool call and result appears step by step
3. **Policy gate card:** idle, then BLOCKED BY POLICY (red flash) or ALERT SENT (green)
4. **Hero with 3D particle sphere:** Three.js, wireframe sphere with Perlin/Simplex noise on the vertices, morphing and reacting to the cursor ("satellite processing")
5. **Staggered text entrances:** GSAP, text in overflow-hidden masks, lines sliding up with stagger
6. **GSAP stat counters (ScrollTrigger):** routes rerouted, km avoided, alerts blocked, counting up from zero. Use real values from the data.
7. **CSS marquee:** native keyframes, duplicated row translated by 50%, streaming telemetry (segment ids, probabilities, rainfall, reroute events)
8. **Narrator (Polly + word highlighting):** last, only if there's time

Design direction (suggestion): dark command-center look, cyan for water, blue for flood polygons, green for safe route, amber for at-risk, red for blocked. Space Grotesk for headings, Inter for body, JetBrains Mono for the trace and marquee. Glass-style panels with a thin border. Honour `prefers-reduced-motion`, cap particle count for smooth screen recording, and add loading and empty states.

Page flow: Hero, then stat counters, then the command center (map left, AI panel right), with the marquee along the bottom.

Tech: Vite + React, `maplibre-gl`, `three`, `gsap` with ScrollTrigger.

---

## 12. Antigravity prompts

Work one step at a time and run the output before moving on.

1. **Data:** "Read SPEC.md Sections 6. Write `prep/build_data.py` producing the flood extent GeoJSON and the scored road graph for a small bbox around the demo area, using the Sentinel-1 VV Otsu water mask, DEM/HAND, rainfall and OSM roads. Print a summary: segments, number above 0.85, number confirmed by Sentinel-1. Do not invent data."
2. **Routing + agent:** "Read Sections 7 and 8. Implement NetworkX routing with removal/penalty of flooded edges and the Strands agent on Nova Pro with the three tools. `send_alert` must look up probability and validation source by segment id. Add a CLI and the `llm_unavailable` flag."
3. **Cedar gate + API:** "Read Section 9 and 10. Add the Cedar check around `send_alert` and a Lambda handler for chat, state and route with CORS. Publish to SNS only if allowed."
4. **UI:** "Read Section 11. Build the frontend in the listed order, mocking the API first, then pointing at the live URL."
5. **Deploy:** "Follow Section 10. Produce the deploy scripts. No provisioned concurrency, no hardcoded secrets."

---

## 13. Time plan (1 hour today, 6 hours tomorrow)

Same blocks as the finalised timeline, fitted to the hours you have.

### Today (Sat): 60 minutes: "Sat evening" block

| Min | Task |
|---|---|
| 0-10 | AWS account and credits ready, Bedrock model access for Nova Pro / Lite, student verification on Builder Center |
| 10-50 | Antigravity builds the data script, producing the flood extent GeoJSON and the scored road graph |
| 50-60 | Repo scaffold with this file as `SPEC.md` |

### Tomorrow (Sun): 6 hours

| Time | Block | Goal |
|---|---|---|
| 0:00-1:30 | "Sat night" block | Routing + Strands agent working locally; Cedar gate with the blocked/allowed demo |
| 1:30-2:30 | "Sun morning" block | Deploy to Lambda / API Gateway / Amplify; wire up SNS |
| 2:30-4:30 | "Sun midday" block | UI: map, sphere, counters, marquee |
| 4:30-5:15 | | Record the 3-minute video |
| 5:15-6:00 | "Sun afternoon" block | Blog post on Builder Center, submit with buffer |

Build the blocked-then-allowed alert path first, so the strongest part of the demo is guaranteed to work. The Polly narrator comes last, only if time remains. Assume you need to be done earlier than the deadline.

---

## 14. Deployment checklist

- [ ] Bedrock access granted for the Nova model; IAM resource and env var match the model ID / inference profile
- [ ] No provisioned concurrency
- [ ] Python dependencies built for Linux for the Lambda package (including the Cedar library and Strands)
- [ ] Data files in S3; Lambda role can read them
- [ ] SNS topic created and **email subscription confirmed**
- [ ] Secrets added manually after the stack deploys
- [ ] CORS allows the frontend origin
- [ ] Full flow tested from the public URL
- [ ] One warm-up request just before recording, so the cold start doesn't hurt the take

---

## 15. Demo video (3 minutes)

| Time | Content |
|---|---|
| 0:00-0:30 | The problem: waterlogged underpasses and blind dispatch |
| 0:30-1:15 | Map: SAR flood extent plus risk layer, an ambulance route reroutes live |
| 1:15-2:00 | The agent's reasoning trace and its Nova/Strands tool calls |
| 2:00-2:30 | The Cedar block, then the allowed alert (show the email) |
| 2:30-3:00 | Where AWS fits, and what scales next (live Sentinel-1 ingestion, provisioned concurrency) |

The strongest part is the contrast between a blocked alert and a real alert going out.

---

## 16. Judging criteria mapping

| Criterion | How AquaTwin answers it |
|---|---|
| Idea and Impact | One real problem (monsoon waterlogging), one user (dispatcher), clear outcome (safe routes, false alerts blocked) |
| Built on AWS | Strands (open source), Cedar (open source), Bedrock Nova, Lambda, API Gateway, S3, SNS |
| Design and usability | Single-page flow, clear states for loading, blocked, allowed and AI-unavailable |
| Execution | One working path end to end on a public URL |
| Demo video | Section 15, with the block/allow moment as the peak |

---

## 17. Story brief for NotebookLM (intro video)

**Audience:** judges and general viewers. **Length:** about 60-90 seconds. **Tone:** confident and human, not hype.

**Arc:** (1) a monsoon downpour, an underpass fills, an ambulance is on its way; (2) optical satellites can't see through cloud and dispatchers work blind; (3) radar confirms the water, terrain and rain say where it will pool, and code finds the safe road; (4) an AI assistant helps but cannot send a public alert unless a policy reading real evidence says yes; (5) proof: a blocked alert, then an allowed one; (6) next: live satellite ingestion and more cities.

**Must say:** the demo replays a real past event; radar confirms flood extent; the policy gate means the AI cannot bypass the rules.
**Must not say:** "real-time street-level flooding", "mathematically proven safe", or any number not in the fact sheet.

### Fact sheet (fill in after the build)

| Fact | Value |
|---|---|
| Event replayed | Delhi, July 2023 Yamuna flood (confirm after data step) |
| Area covered | ___ km² |
| Road segments analysed | ___ |
| Segments above 0.85 flood probability | ___ |
| Segments confirmed by Sentinel-1 | ___ |
| Demo route: normal vs safe distance | ___ m vs ___ m |
| Flooded segments avoided | ___ |
| Alerts blocked / allowed in demo | ___ / ___ |
| AWS services used | Strands SDK, Bedrock (Nova), Cedar, Lambda, API Gateway, S3, SNS, Amplify/CloudFront |
| Public URL / Repo | ___ / ___ |
