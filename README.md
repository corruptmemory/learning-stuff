# learning-stuff

Interactive learning environment for data science, finance, and machine learning. Each topic is an exploration-first HTML sandbox with interactive charts, rendered math (KaTeX), and tweakable parameters — built to be driven by conversation with Claude Code.

## Tracks

- **data-science/** — statistics, probability, causal inference
- **web-dev/** — WebAssembly, React
- **graphics/** — Vulkan, GPU programming (planned)
- **finance/** — valuation (DCF, whose number it is, fat tails, ergodicity); derivatives and greeks planned
- **ml/** — modern machine learning (planned)

## Quick Start

```bash
# Download vendored JS libraries (Plotly, KaTeX, D3)
./build.sh refresh-vendor

# Start a local server
./serve.sh

# Open an exploration
# http://localhost:8080/data-science/difference-in-differences/explore.html
# http://localhost:8080/web-dev/wasm/explore.html
# http://localhost:8080/web-dev/react/explore.html
# http://localhost:8080/finance/valuation/explore.html
```

## Structure

Each topic directory contains:
- `explore.html` — the interactive exploration (standalone, runs in browser)
- `requirements.txt` — Python dependencies (if needed)
- `scripts/` — Python scripts for heavier computation

Shared infrastructure:
- `shared/vendor/` — vendored JS libraries (Plotly, KaTeX, D3), downloaded by `build.sh`
- `shared/explore.css` — consistent styling across all explorations
- `shared/explore.js` — shared utilities (math rendering, slider controls, chart theming)

Docs:
- `docs/plans/` — design and implementation plans per exploration
- `docs/brainstorming/` — research notes: raw Plaud voice-note transcripts beside their synthesized dives

## build.sh

```bash
./build.sh refresh-vendor                    # Download/update vendored JS libraries
./build.sh setup <topic-path>                # Create venv + install requirements
./build.sh setup-all                         # Setup all topics with requirements.txt
./build.sh run <topic-path> <script>         # Run a Python script in topic's venv
```

Each topic gets its own `.venv/` — no global Python environment, no dependency conflicts.

## Philosophy

- **Exploration-first**: interact with sliders and charts, not lectures
- **Git-versioned**: your learning journey is tracked and portable across machines
- **Vendored and offline**: no CDN dependencies, works on a plane
- **Rosetta Stone**: concepts shown in both R and Python side by side (data science), or multi-language tabs (systems programming)
- **Python as plumbing**: HTML is the primary interface, Python handles heavy computation
