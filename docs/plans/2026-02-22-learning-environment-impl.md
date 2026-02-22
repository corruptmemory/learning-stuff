# Learning Environment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the interactive learning repo infrastructure and first DiD exploration.

**Architecture:** Flat HTML explorations with vendored JS (Plotly, KaTeX, D3), shared CSS/JS helpers, and a `build.sh` managing vendor downloads and per-topic Python venvs.

**Tech Stack:** HTML/JS (Plotly, KaTeX, D3), Python (venvs), Bash

---

### Task 1: Repo Infrastructure

**Files:**
- Create: `.gitignore`
- Create: `build.sh`
- Create: `serve.sh`

**Step 1: Create `.gitignore`**
Ignore `.venv/`, `__pycache__/`, `*.pyc`, `node_modules/`, `shared/vendor/` (downloaded by build.sh).

**Step 2: Create `build.sh`**
Commands: `refresh-vendor`, `setup <path>`, `run <path> <script>`, `setup-all`.
Vendor downloads: Plotly 2.35.3, KaTeX 0.16.11 (JS+CSS+fonts), D3 v7.
Venv management: creates `.venv/` per topic, installs from `requirements.txt`.

**Step 3: Create `serve.sh`**
One-liner: `python3 -m http.server 8080` from repo root.

**Step 4: Run `./build.sh refresh-vendor` to download libraries**

**Step 5: Commit**

---

### Task 2: Shared CSS/JS Infrastructure

**Files:**
- Create: `shared/explore.css`
- Create: `shared/explore.js`

**Step 1: Create `explore.css`**
Clean typography, sandbox section layout, slider/control styling, Plotly container sizing, KaTeX integration, responsive basics.

**Step 2: Create `explore.js`**
Helpers: `renderAllMath()` (KaTeX auto-render), `createControl()` (labeled slider/input factory), `plotlyDefaults()` (consistent chart theming).

**Step 3: Commit**

---

### Task 3: DiD Exploration — Sandboxes 1-2

**Files:**
- Create: `data-science/difference-in-differences/explore.html`

**Step 1: Build HTML shell with all 4 sandbox placeholders**

**Step 2: Implement Sandbox 1 — "Two Groups, One Shock"**
Synthetic data, two group trendlines, treatment shock. Sliders: effect size, noise, trend slopes, timing.

**Step 3: Implement Sandbox 2 — "Why Not Just Before/After?"**
Three competing estimates shown side by side. Demonstrates why DiD is needed.

**Step 4: Commit**

---

### Task 4: DiD Exploration — Sandboxes 3-4

**Step 1: Implement Sandbox 3 — "The Parallel Trends Assumption"**
Slider to break parallel trends, shows DiD bias in real time.

**Step 2: Implement Sandbox 4 — "The Olympic Connection"**
Simulated multi-country medal data, hosting effect estimation.

**Step 3: Commit**

---

### Task 5: Final integration and initial commit

**Step 1: Test everything end-to-end (serve.sh, open in browser)**
**Step 2: Create initial commit with full working state**
