# Interactive Learning Environment Design

**Date:** 2026-02-22
**Status:** Approved

## Overview

An interactive, git-versioned learning environment for data science, finance, and ML. Each topic is an exploration-first HTML sandbox with interactive charts, rendered math, and tweakable parameters. Python handles heavy computation, managed by per-topic venvs and a single `build.sh`.

## User Profile

- Physics degree, comfortable with graduate-level math
- Intermediate in data science/finance/ML
- Prefers exploration over lectures — interact first, read second
- Pragmatic about Python (necessary, not loved)
- Wants cross-machine portability via git

## Tracks

1. **data-science** (starting here) — statistics, probability, causal inference
2. **finance** — market analysis, derivatives, greeks (future)
3. **ml** — modern machine learning (future)

## First Topic: Difference-in-Differences

Anchored to Cremieux's Olympic medal analysis. Four sandboxes:
1. Two Groups, One Shock — core visual intuition
2. Why Not Just Before/After? — comparing naive vs DiD estimates
3. The Parallel Trends Assumption — break it and see what happens
4. The Olympic Connection — simulated medal data

## Repo Structure

```
learning-stuff/
├── data-science/
│   └── difference-in-differences/
│       ├── explore.html
│       ├── requirements.txt
│       └── scripts/
├── shared/
│   ├── vendor/          (plotly, katex, d3 — vendored, gitignored downloads)
│   ├── explore.css
│   └── explore.js
├── build.sh
├── serve.sh
└── .gitignore
```

## Key Decisions

- **HTML is primary interface**, Python is data plumbing
- **Vendored JS** — offline-capable, no CDN
- **Per-topic venvs** — `build.sh setup <path>` creates `.venv/` in each topic dir
- **Exploration-first** — sliders/charts/controls, not lectures
- **Python outputs JSON**, HTML consumes it via fetch()
- **build.sh** manages all machinery (venvs, vendor downloads, script execution)
