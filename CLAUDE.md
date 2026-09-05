# Project: learning-stuff

Interactive learning environment for data science, finance, ML, web technologies, and graphics programming.

## Architecture

- Each topic is a self-contained directory under its track (`data-science/`, `finance/`, `ml/`, `web-dev/`, `graphics/`)
- The primary interface is `explore.html` — standalone HTML with interactive charts (Plotly), rendered math (KaTeX), and controls
- Some topics span multiple pages (e.g., `web-dev/wasm/` has `explore.html`, `escape-the-web.html`, `cloudflare-workers.html`)
- Python scripts sit alongside for heavier computation, managed by per-topic venvs
- Shared CSS/JS infrastructure lives in `shared/`

## Key Conventions

- **Never edit vendored files** in `shared/vendor/` — they're downloaded by `./build.sh refresh-vendor`
- **HTML explorations reference shared libs via relative paths** (e.g., `../../shared/vendor/plotly.min.js`)
- **Python deps are per-topic**: each topic has its own `requirements.txt` and `.venv/`
- **Use `./build.sh`** for all Python venv operations — never create venvs manually
- **Explorations are exploration-first**: interactive sandboxes with sliders and charts, not lectures. Short conceptual intros, then hands-on.
- **Rosetta Stone pattern**: when showing code, show both R and Python side by side with annotations mapping to the concepts explored in the sandboxes
- **Tabbed Rosetta Stone**: for multi-language comparisons (WASM track), use `createTabbedCode()` with language tabs (Go, TinyGo, Rust, Odin, Jai, WAT, JS)
- **Research notes live in `docs/brainstorming/`**: `YYYY-MM-DD-<topic>-plaud-note.md` (raw Plaud transcript + AI summary, verbatim) beside `YYYY-MM-DD-<topic>-dive.md` (the synthesis, with a sources section marking primary-landed vs from-memory). Plaud AI summaries are leads, not sources: verify every citation (2026-09-05: one invented two SEP entries).

## Adding a New Topic

1. Create directory: `<track>/<topic-name>/`
2. Create `explore.html` using shared CSS/JS (copy structure from an existing exploration)
3. Add `requirements.txt` if Python scripts are needed
4. Run `./build.sh setup <track>/<topic-name>` to create the venv
5. Python scripts go in `scripts/` subdirectory and output JSON to `data/` for HTML consumption

## Shared Utilities (shared/explore.js)

- `renderAllMath()` — KaTeX auto-render for `$...$` and `$$...$$`
- `createSlider(container, opts)` — labeled slider with live value display
- `createButton(container, opts)` — button control
- `plotlyDefaults(overrides)` — consistent Plotly chart theming
- `seededRandom(seed)` — reproducible pseudo-random number generator
- `normalRandom(rng, mean, std)` — Box-Muller normal distribution
- `createTabbedCode(container, tabs)` — multi-language tabbed code panels
- `instantiateWasm(bytes, imports)` — WebAssembly.instantiate wrapper
- `createBinaryViewer(container, bytes, regions)` — color-coded hex dump of WASM binaries
- `benchmark(fn1, fn2, iterations)` — timing comparison for two functions
- `.callout`, `.callout.take`, `.callout.siren`, `.callout.warn` (explore.css) — annotated boxes for the learner's own arguments, plausibility warnings, and guard states

## Technical Notes

- **KaTeX in dynamic content**: Call `renderAllMath()` after any `innerHTML` update that contains LaTeX — auto-render only runs once on page load
- **`generateDiDData()`** supports: `trendDivergence` (breaks parallel trends) and `anticipation` (leaks treatment into pre-period). Both are demonstrated in Sandbox 3.
- **Notation reference**: collapsible `<details>` panel using `.notation-ref` CSS class. Add new entries as concepts are introduced.
- **Serve locally**: `./serve.sh` or `python3 -m http.server 8080` from repo root
- **Valuation page guards**: `gT` is clamped below `r` with a visible warning; reverse DCF reports out-of-range instead of a boundary value; Sandbox 4 removes its reference line at `α ≤ 1`; financing shares are clamped to sum to one.
- **`.claude/settings.local.json` is tracked in git** here (unlike most repos), so MCP permission changes show as diffs and get committed. Regenerate it from the global CLAUDE.md MCP-permissions recipe rather than editing entries by hand.
- **`.playwright-mcp/`** is Playwright MCP tool output and is gitignored.

## Current State and Next Steps

**Completed:**

DiD exploration (data-science/difference-in-differences/) with 5 sandboxes:
1. Two Groups, One Shock (with four-dot centroid visualization)
2. Why Not Just Before/After? (three competing estimators)
3. Parallel Trends + Anticipation (two assumption violations)
4. Olympic Connection (multi-country staggered treatment)
5. Rosetta Stone (R + Python side by side)

WASM exploration (web-dev/wasm/) with 3 pages:
1. Runtime Model (explore.html) — binary viewer, boundary demo, JS vs WASM benchmark, language tax
2. Can I Just WASM a Frontend? (escape-the-web.html) — browser API checklist, spectrum of approaches, canvas escape hatch, decision tree
3. Cloudflare Workers (cloudflare-workers.html) — containers vs isolates, edge latency, use cases, Worker anatomy

**Data science next explorations:**
- **Permutation testing** — distribution-free hypothesis testing, connects to "is this DiD result noise?"
- **Fixed effects** — what "controlling for" means mechanically
- **Decomposition** — separating delegation size from judging bias (Cremieux's key insight)
- **Event studies** — per-period treatment effects, the standard parallel trends diagnostic

React exploration (web-dev/react/) — single page:
1. The Problem React Solves (vanilla JS vs React side-by-side filterable/sortable table)
2. Virtual DOM reconciliation visualization (SVG tree diff, keyed vs unkeyed)
3. Render lifecycle, hooks internals, stale closure gotcha (pipeline animation, hooks array, conditional hook bug, useEffect timing)
4. Decision framework (comparison matrix + interactive questionnaire: React vs HTMX vs Alpine vs Svelte vs Vanilla)
5. Rosetta Stone (same widget in 5 frameworks via tabbed code)

Valuation exploration (finance/valuation/) — first finance page, 6 sandboxes:
1. The Machine (DCF as a geometric-kernel sum; terminal-value share; sensitivity grid)
2. Whose Number Is It? (two buyers + seller, ZOPA, reverse DCF via bisection)
3. After the Deal (merger layer: synergies, financing mix, close probability, implied synergy, waterfall)
4. The Premium That Can't Be Estimated (running means under Pareto vs fixed losses; estimate spread)
5. One Path, Not an Ensemble (multiplicative wealth with ruin barrier; ensemble vs median; Kelly; decision rule)
6. Rosetta Stone (Python from scripts/dcf.py + spreadsheet cell layouts and Goal Seek)
Pure math lives in finance/valuation/valuation.js and is Node-testable:
`node -e "require('./finance/valuation/valuation.js').runSelfTest()"`.

Research notes (docs/brainstorming/):
1. Naturalistic fallacy (2026-09-04 Plaud note, 2026-09-05 dive): Hume's is-ought gap vs Moore's naturalistic fallacy vs the appeal to nature, with primary quotes from Treatise 3.1.1.27 and Principia Ethica §§10, 13, 27–28. §9 records the follow-up exchange: Harris, Humean naturalism as the landing point, entropy/time, the measurement problem, and the utopia maxim as a stability result.

**Planned tracks (see docs/plans/2026-03-09-new-tracks-design.md):**
- **graphics/vulkan/** — shader mental model, pipeline architecture, Odin exercises
- **graphics/gpu-programming/** — CUDA, compute shaders (future)

**Anchoring article:** Cremieux, "Why Do Olympic Hosts Win More Medals?" (https://www.cremieux.xyz/p/why-do-olympic-hosts-win-more-medals) — code not publicly available, author uses R/fixest.

## User Context

The learner has a physics degree, is intermediate in data science/finance/ML, comfortable with graduate-level math. Prefers exploration over lectures. Has working Python skills but prefers to minimize friction. Developing fluency in both Python and R for statistical work. Maps physics intuitions to stats concepts (systematic error → bias, statistical error → variance, chi-squared → p-values). Reads Cremieux (Substack), familiar with Judea Pearl's "Book of Why," aware of Taleb's critiques of CLT overuse in fat-tailed domains.

Systems programming polyglot: Go (primary), Odin, Jai, reluctantly Rust. Has done Vulkan tutorial through Multisampling in Odin. Has done WASM experiments with Go/TinyGo. React: ground-zero. Prefers "sane" languages and tooling over the JavaScript ecosystem.
