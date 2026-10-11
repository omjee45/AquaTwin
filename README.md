# AquaTwin

Flood-aware emergency routing for monsoon waterlogging.  
Environmental Hacks (WeMakeDevs × AWS) · Track 02: Heat and Water.

Event replayed: **Delhi Yamuna flood, July 2023.**

See [SPEC.md](./spec.md) for the full build specification.

## Repo layout

| Directory | Step | Contents |
|-----------|------|----------|
| `prep/`   | 1    | `build_data.py` — one-time data prep; outputs go to `prep/out/` |
| `routing/`| 2    | Deterministic NetworkX routing (no LLM) |
| `agent/`  | 2    | Strands SDK agent on Amazon Nova |
| `cedar/`  | 3    | Cedar policy gate for `send_alert` |
| `frontend/`| 4   | Vite + React UI (MapLibre, Three.js, GSAP) |
| `deploy/` | 5    | Lambda / API Gateway / Amplify deploy scripts |

## Quick start — data prep

```bash
cd prep
pip install -r requirements.txt
python build_data.py
# outputs written to prep/out/
```

No login needed for Planetary Computer (anonymous STAC access).
