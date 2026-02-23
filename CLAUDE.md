# Project: learning-stuff

Interactive learning environment for data science, finance, and ML.

## Architecture

- Each topic is a self-contained directory under its track (`data-science/`, `finance/`, `ml/`)
- The primary interface is `explore.html` — standalone HTML with interactive charts (Plotly), rendered math (KaTeX), and controls
- Python scripts sit alongside for heavier computation, managed by per-topic venvs
- Shared CSS/JS infrastructure lives in `shared/`

## Key Conventions

- **Never edit vendored files** in `shared/vendor/` — they're downloaded by `./build.sh refresh-vendor`
- **HTML explorations reference shared libs via relative paths** (e.g., `../../shared/vendor/plotly.min.js`)
- **Python deps are per-topic**: each topic has its own `requirements.txt` and `.venv/`
- **Use `./build.sh`** for all Python venv operations — never create venvs manually
- **Explorations are exploration-first**: interactive sandboxes with sliders and charts, not lectures. Short conceptual intros, then hands-on.
- **Rosetta Stone pattern**: when showing code, show both R and Python side by side with annotations mapping to the concepts explored in the sandboxes

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

## Technical Notes

- **KaTeX in dynamic content**: Call `renderAllMath()` after any `innerHTML` update that contains LaTeX — auto-render only runs once on page load
- **`generateDiDData()`** supports: `trendDivergence` (breaks parallel trends) and `anticipation` (leaks treatment into pre-period). Both are demonstrated in Sandbox 3.
- **Notation reference**: collapsible `<details>` panel using `.notation-ref` CSS class. Add new entries as concepts are introduced.
- **Serve locally**: `./serve.sh` or `python3 -m http.server 8080` from repo root

## Current State and Next Steps

**Completed:** DiD exploration with 5 sandboxes:
1. Two Groups, One Shock (with four-dot centroid visualization)
2. Why Not Just Before/After? (three competing estimators)
3. Parallel Trends + Anticipation (two assumption violations)
4. Olympic Connection (multi-country staggered treatment)
5. Rosetta Stone (R + Python side by side)

**Natural next explorations (in rough order of priority):**
- **Permutation testing** — distribution-free hypothesis testing, connects to "is this DiD result noise?"
- **Fixed effects** — what "controlling for" means mechanically
- **Decomposition** — separating delegation size from judging bias (Cremieux's key insight)
- **Event studies** — per-period treatment effects, the standard parallel trends diagnostic

**Anchoring article:** Cremieux, "Why Do Olympic Hosts Win More Medals?" (https://www.cremieux.xyz/p/why-do-olympic-hosts-win-more-medals) — code not publicly available, author uses R/fixest.

## User Context

The learner has a physics degree, is intermediate in data science/finance/ML, comfortable with graduate-level math. Prefers exploration over lectures. Has working Python skills but prefers to minimize friction. Developing fluency in both Python and R for statistical work. Maps physics intuitions to stats concepts (systematic error → bias, statistical error → variance, chi-squared → p-values). Reads Cremieux (Substack), familiar with Judea Pearl's "Book of Why," aware of Taleb's critiques of CLT overuse in fat-tailed domains.
