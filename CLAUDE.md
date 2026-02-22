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

## User Context

The learner has a physics degree, is intermediate in data science/finance/ML, comfortable with graduate-level math. Prefers exploration over lectures. Has working Python skills but prefers to minimize friction. Developing fluency in both Python and R for statistical work.
