# AquaTwin

Autonomous flood emergency routing and policy-guarded dispatch digital twin for monsoon inundation.

[Live App (pending deploy) <!-- TODO(after deploy) -->](#) · [Demo Video (pending) <!-- TODO(after deploy) -->](#) · [Documentation](spec.md)

---

## Problem

Every monsoon, urban streets and underpasses in Indian cities flood within hours, stranding ambulances and rescue vehicles because control rooms lack real-time visibility into passable corridors. Standard optical satellites cannot see through dense monsoon cloud cover, rendering optical imagery blind during the crisis. Giving an AI model direct authority to issue public evacuation alerts is dangerous: a single hallucinated broadcast or false alert can trigger mass panic, gridlock, and severe real-world harm.

---

## What AquaTwin Does

| Capability | How it is implemented |
|---|---|
| **SAR flood extent** | Sentinel-1 C-band Synthetic Aperture Radar (RTC) backscatter thresholded at fixed -16.5 dB VV to penetrate monsoon clouds and extract vector water polygons. |
| **Terrain & rain risk scoring** | Copernicus DEM GLO-30 simplified HAND (Height Above Nearest Drainage) combined with Open-Meteo precipitation to calculate road pooling risk. |
| **Deterministic safe routing** | NetworkX directed graph routing that hard-blocks inundated segments ($\ge 0.50$) and applies a $4\times$ distance penalty to model-predicted risk ($0.40 \le P < 0.50$). |
| **Dispatcher agent** | Multi-provider tool loop (Groq primary, Google Gemini fallback) that inspects hydrology evidence, computes routes, and drafts alert requests without inventing data. |
| **Policy gate** | Formal Cedar authorization policy evaluated with `cedarpy` that blocks evacuation broadcasts unless radar confirmation and $> 85\%$ flood risk are cryptographically proven from data. |
| **Emergency SNS alerts** | Amazon Simple Notification Service (SNS) publishing emergency email notices to responders exclusively when permitted by the Cedar gate. |
| **Command Center UI** | Single-page console built in React, MapLibre GL, and Three.js displaying the SAR flood extent, dual-route comparison, reasoning trace, and live policy flash states. |

---

## System Overview

```mermaid
flowchart TB
  subgraph OFF["Offline data prep (run once, local)"]
    S1["Sentinel-1 RTC<br/>Planetary Computer"] --> MASK["Water mask<br/>fixed -16.5 dB, change detection"]
    DEM["Copernicus DEM 30 m"] --> HAND["Simplified HAND"]
    RAIN["Open-Meteo rainfall"] --> SCORE
    OSM["OpenStreetMap roads"] --> SCORE
    MASK --> SCORE["Per-segment score<br/>flood_probability + validation_source"]
    HAND --> SCORE
    SCORE --> FILES["roads_scored.json<br/>flood_extent.geojson<br/>stats.json"]
  end
  FILES --> S3[("Amazon S3")]
  subgraph ON["Online runtime on AWS"]
    UI["Web UI<br/>React + MapLibre"] -.->|HTTPS (pending)| APIGW["API Gateway HTTP API"]
    APIGW -.-> LAMBDA["AWS Lambda (Python)"]
    S3 -.-> LAMBDA
    LAMBDA --> AGENT["Agent tool loop"]
    AGENT <--> LLM["LLM provider chain"]
    AGENT --> T1["get_flood_status"]
    AGENT --> T2["compute_safe_route<br/>NetworkX"]
    AGENT --> T3["send_alert"]
    T3 --> GATE{"Policy gate<br/>cedarpy"}
    GATE -->|allow| SNS["Amazon SNS to email"]
    GATE -->|deny| BLOCK["BLOCKED BY POLICY"]
    LAMBDA --> CW["CloudWatch Logs"]
  end
```

*Note: The policy gate reads `flood_pct` and `validation_source` from S3-loaded data, never from the LLM.*

AquaTwin separates offline planetary-scale geospatial data preparation from the online emergency dispatch runtime. Offline data prep executes once locally using Python to ingest SAR radar scenes, digital elevation models, precipitation data, and OpenStreetMap road graphs, saving static scored datasets to Amazon S3. The online AWS runtime executes serverless: API Gateway proxies requests to an AWS Lambda function running the dispatcher agent. The agent invokes three deterministic tools, and alert broadcasts pass through a Cedar security gate evaluated by `cedarpy` before firing Amazon SNS notifications.

---

## How the Evidence is Built

All values reflect the Delhi Yamuna River flood (July 2023) within bounding box `[77.19, 28.62, 77.28, 28.70]` (78.04 km²):

| Source | Method | Output |
|---|---|---|
| **Sentinel-1 RTC** (Planetary Computer) | Pre-event scene `S1A_IW_GRDH_1SDV_20230630T005232_..._rtc` (30 Jun 2023 00:52:32 UTC / 06:22:32 IST) vs Event scene `S1A_IW_GRDH_1SDV_20230712T005233_..._rtc` (12 Jul 2023 00:52:33 UTC / 06:22:33 IST, -1.0 day before peak). Fixed threshold at -16.5 dB VV on 3×3 median filter with change detection ($\Delta < -3.0$ dB). | 1.898 km² flood extent across 82 polygons; 0.595 km physical flooded roads (1.191 km directed). |
| **Copernicus DEM GLO-30** | 30 m elevation raster; Euclidean distance transform (`distance_transform_edt`) from permanent river channel as simplified HAND. | Relative elevation above drainage: `low_hand_risk = 1.0 - clip(hand / 15.0, 0, 1)`. |
| **Open-Meteo Historical API** | Daily precipitation aggregation across Delhi bbox from 8–14 July 2023. | 118.2 mm cumulative rainfall (`rain_norm = clip(118.2 / 200, 0, 1) = 0.591`). |
| **OpenStreetMap** | Overpass API extraction filtered for drivable highways and hospital points of interest. | 15,738 physical road segments (20,012 directed edges) and Lok Nayak Hospital (LNJP). |
| **Hydrological Risk Scoring** | Multi-criteria formula: `0.5 * sar_overlap + 0.3 * low_hand + 0.2 * rain_norm`. | 13 physical segments $\ge 0.50$ (26 directed); 5 physical segments $\ge 0.85$ (10 directed); 24 directed segments confirmed by Sentinel-1. |

---

## Routing, Agent, and Policy Gate

### Deterministic Routing
Routing is executed entirely in NetworkX without LLM involvement. Edges with `flood_probability >= 0.50` are hard-blocked and excluded from the safe graph. Edges with model-predicted risk ($0.40 \le P < 0.50$, source `"model"`) receive a $4\times$ distance penalty (`weight = length_m * 4.0`), steering ambulances away from low-lying pooling corridors. In the demo corridor from Near Velodrome Rd to Lok Nayak Hospital (LNJP), safe routing avoids 93 model-risk edges, resulting in a 6.962 km safe path (+1.577 km detour over the 5.386 km direct route).

### Tools and Model Provider Chain
The agent operates with three discrete tools:
1. `get_flood_status(segment_id)`: Inspects ground-truth SAR overlap, simplified HAND, and flood probability.
2. `compute_safe_route(origin_node, destination_node)`: Computes deterministic NetworkX default vs safe routes.
3. `send_alert(segment_id, message)`: Requests an emergency broadcast guarded by the policy gate.

**Model Fallback Chain:**
1. **Primary**: Groq API running `openai/gpt-oss-120b` (configured via `OPENAI_COMPAT_MODEL`).
2. **Fallback**: Google Gemini API running `gemini-2.5-flash` (configured via `GEMINI_MODEL`), triggered automatically on HTTP 429 rate limits or provider failure.
3. **Deterministic Dispatch**: If all LLM providers fail, the system sets `llm_unavailable: true` and engages rule-based emergency dispatch without hallucinating.

### Cedar Policy Gate
The policy in [`cedar/policy.cedar`](cedar/policy.cedar) enforces strict authorization:

```cedar
// AquaTwin Emergency Alert Policy
// Environmental Hacks (Track 02: Heat and Water)
//
// Rule:
// Only an EmergencyManager can dispatch a public broadcast alert.
// The segment must have Sentinel-1 radar confirmation (validation_source == "Sentinel-1")
// AND the flood probability percentage must exceed 85% (flood_pct > 85).
// All other requests are denied by default.

permit(
  principal in Role::"EmergencyManager",
  action == Action::"SendAlert",
  resource
) when {
  context.flood_pct > 85 &&
  context.validation_source == "Sentinel-1"
};
```

**Key Security Design Rule:** The `send_alert` tool accepts *only* `segment_id` and `message` from the LLM. The evaluator reads `flood_pct` and `validation_source` directly from stored dataset records (`roads_scored.json`). The LLM cannot provide, modify, or hallucinate authorization attributes. The policy is evaluated in Python using the official `cedarpy` engine (with an automated fallback to `cedar-native` AST validation if Rust binary bindings are unavailable).

---

## AWS Services Used

| Service | Role | Status |
|---|---|---|
| **Amazon S3** | Static store for GeoJSON flood extent, scored road graphs, and summary statistics. | Configured in `deploy/setup_aws.py` <!-- TODO(after deploy) --> (pending deploy) |
| **AWS Lambda** | Serverless Python execution backend (`deploy/lambda_handler.py`) serving `/chat`, `/route`, and `/state`. | Packaged in `deploy/build_lambda.sh` <!-- TODO(after deploy) --> (pending deploy) |
| **Amazon API Gateway** | HTTP API exposing Lambda endpoints with CORS headers. | Scripted <!-- TODO(after deploy) --> (pending deploy) |
| **Amazon SNS** | Emergency broadcast topic (`AquaTwin-Emergency-Alerts`) dispatching email alerts. | Scripted in `deploy/setup_aws.py` <!-- TODO(after deploy) --> (pending deploy) |
| **Amazon CloudWatch** | Ingestion of Lambda runtime logs, token usage, and policy gate audits. | Configured <!-- TODO(after deploy) --> (pending deploy) |
| **Frontend Hosting** | Web client delivery (AWS Amplify Hosting or S3 + CloudFront). | Local Vite server <!-- TODO(after deploy) --> (pending deploy) |

> **Note on Model Providers:** Amazon Bedrock model invocation was blocked on this new free-plan AWS account due to account tier quotas. Consequently, the agent runtime calls Groq and Google Gemini instead. Strands Agents SDK is not used in `agent/handler.py`; the runtime uses direct OpenAI-compatible and Google GenAI SDK clients.

---

## Limitations

- **Revisit Period and Resolution:** Sentinel-1 has a 6-to-12-day orbital revisit cycle; 10 m pixel resolution cannot resolve narrow interior alleys, sidewalks, or micro-topography.
- **Scene Acquisition Timing:** The available post-event SAR scene was captured on 12 July 2023 (00:52 UTC), 1.0 day before the Yamuna River flood peaked on 13 July 2023.
- **Urban Double-Bounce Clutter:** Vertical concrete walls and dense structures produce high radar backscatter that can mask standing water in narrow street canyons.
- **Simplified HAND Approximation:** Drainage distance is computed via Euclidean distance transform from permanent water rather than rigorous D8 hydrological flow routing.
- **Unconfirmed Risk Band:** The 0.40–0.50 probability band denotes model-predicted pooling risk based on elevation and rain, not verified surface water.
- **Replay System:** AquaTwin currently replays the July 2023 event from pre-indexed scenes rather than live orbital telemetry streams.
- **Free-Tier Rate Limits:** Groq and Gemini free-tier endpoints have aggressive rate limits (mitigated by exponential backoff and deterministic degradation).

---

## Run Locally

### 1. Prerequisites and Installation
```bash
git clone https://github.com/omjee45/AquaTwin.git
cd AquaTwin
pip install -r requirements.txt
pip install -r prep/requirements.txt
```

### 2. Data Preparation (Optional — Pre-computed in `prep/out/`)
```bash
python prep/build_data.py
```

### 3. Start Local Backend Server
```bash
python deploy/lambda_handler.py
# Runs on http://localhost:8000 (serves /chat, /route, /state)
```

### 4. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Deploy

AWS deployment is automated via scripts in `deploy/`:

1. **Configure S3 and SNS:**
   ```bash
   python deploy/setup_aws.py dispatcher@example.com
   ```
2. **Package Lambda Backend:**
   ```bash
   bash deploy/build_lambda.sh
   # Builds deploy/lambda_package.zip excluding caches and secrets
   ```
3. **Deploy Lambda & API Gateway:** <!-- TODO(after deploy) -->
4. **Deploy Frontend to AWS Amplify / S3:** <!-- TODO(after deploy) -->

---

## Repository Structure

```
AquaTwin/
├── agent/                  # AI dispatcher agent and tools
│   ├── handler.py          # Multi-provider agent loop (Groq & Gemini)
│   └── tools.py            # get_flood_status, compute_safe_route, send_alert
├── cedar/                  # Authorization policy gate
│   ├── policy.cedar        # Cedar rule (permit if flood_pct > 85 & Sentinel-1)
│   └── evaluator.py        # cedarpy evaluation engine with fallback
├── routing/                # Deterministic graph algorithms
│   └── engine.py           # NetworkX routing with hard blocks and 4x penalty
├── prep/                   # One-time geospatial data pipeline
│   ├── build_data.py       # STAC ingestion, HAND, rainfall, and scoring
│   ├── requirements.txt    # GIS dependencies (rasterio, osmnx, geopandas)
│   └── out/                # Output datasets (stats.json, roads_scored.json, etc.)
├── deploy/                 # AWS deployment and serverless packaging
│   ├── build_lambda.sh     # Lambda packaging script (excludes secrets)
│   ├── lambda_handler.py   # Lambda entrypoint & local dev HTTP server
│   └── setup_aws.py        # Automated S3 bucket & SNS topic provisioning
├── frontend/               # Single-page dispatcher command center
│   ├── src/                # React components (MapLibre, Three.js orb, telemetry)
│   └── package.json        # Frontend dependencies (React, MapLibre GL, GSAP, Three.js)
├── docs/                   # System diagrams and visual assets
│   └── system-overview.svg # Architecture diagram
├── spec.md                 # Master project specification
├── requirements.txt        # Backend dependencies
└── LICENSE                 # MIT License
```

---

## Data Sources and Attributions

- **OpenStreetMap**: Road vectors and building footprints &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under the Open Database License (ODbL).
- **Copernicus Sentinel-1**: Contains modified Copernicus Sentinel data (2023) provided by the European Space Agency (ESA) via Microsoft Planetary Computer STAC API.
- **Copernicus DEM GLO-30**: European Space Agency / European Union Copernicus program.
- **Open-Meteo**: Weather data by [Open-Meteo.com](https://open-meteo.com/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Basemap Tiles**: Esri World Dark Gray Canvas &copy; Esri, HERE, Garmin, OpenStreetMap contributors.
- **Frontend Libraries**: React, MapLibre GL (`maplibre-gl`), Three.js (`three`), GSAP (`gsap`), Lucide React (`lucide-react`), Tailwind CSS, Vite.
- **Python Libraries**: NetworkX, `cedarpy`, `boto3`, `requests`, `python-dotenv`, `google-genai`, `openai`.
- **Typography**: Google Fonts ([Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), [Inter](https://fonts.google.com/specimen/Inter), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)).


---

## License

AquaTwin is released under the [MIT License](LICENSE).
