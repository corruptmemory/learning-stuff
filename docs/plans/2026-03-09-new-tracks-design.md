# Design: New Learning Tracks — WASM, React, Vulkan/GPU

Date: 2026-03-09

## Directory Structure

```
web-dev/
  react/explore.html              # single page, ground-zero
  wasm/
    explore.html                   # "WTF is WASM" + runtime model
    escape-the-web.html            # can I just WASM a frontend?
    cloudflare-workers.html        # why would I run WASM on a server?
graphics/
  vulkan/
    shaders.html                   # shader programs, GLSL, the mental model
    pipelines.html                 # pipeline composition, multiple shaders, render passes
    exercises/                     # code skeletons (Odin) with TODO comments
  gpu-programming/                 # future: CUDA, compute shaders, etc.
```

## Learner Profile

- Physics degree, intermediate in data science/finance/ML, comfortable with graduate-level math
- React: never used it, ground-zero
- WASM: has done Go/TinyGo experiments, wants to explore Jai, Odin, Rust
- Vulkan: completed vulkan-tutorial.com through Multisampling in Odin (partial in Go). Gaps in shader programming model, pipeline composition, multiple shader programs
- Prefers exploration over lectures. Wants problem sets for Vulkan to imprint learnings
- Developing polyglot systems fluency: Go, Odin, Jai, reluctantly Rust

## Build Order

1. WASM (3 pages)
2. React (1 page)
3. Vulkan/shaders (2 pages + exercises)

## WASM Track

### Page 1: explore.html — What WASM Is and Isn't

- Execution model: stack machine, linear memory, no GC, no DOM access
- Interactive sandbox: inspect a .wasm binary, see sections
- Language comparison: Go vs TinyGo vs Rust vs Odin vs Jai — what each brings/loses
- Sandbox: same function compiled from multiple languages, compare binary sizes + runtime overhead
- The boundary problem: WASM can't touch outside world without imports/exports (key insight)

### Page 2: escape-the-web.html — Can I Just WASM a Frontend?

- The honest answer: what you need from browser (DOM, events, canvas, networking) and how WASM accesses it
- The spectrum: "thin JS glue + WASM logic" → "canvas-only, WASM draws everything" → "full framework replacements"
- Interactive comparison: same mini-app three ways (JS, WASM+glue, WASM+canvas)
- Rosetta Stone: glue code in Go/TinyGo, Odin, Jai, Rust
- Decision tree: "for YOUR use case, here's what makes sense"

### Page 3: cloudflare-workers.html — Why WASM on a Server?

- The pitch: cold start times, sandboxing, polyglot
- What Workers actually are vs containers vs Lambda
- Interactive: latency/cold-start comparison visualizations
- Use cases that make sense vs use cases where you're fighting it
- Hands-on: deploy a tiny Worker in Go/Rust (code skeleton + walkthrough)

### Key WASM Question

"Can I bypass the entire web frontend madness and just WASM a frontend in a sane language?"
Answer is nuanced — the exploration should give an honest, experience-informed verdict.

## React Track

### Single page: explore.html — Why Crazy People Use React

- The problem: manual DOM manipulation is a nightmare at scale (interactive demo of the pain)
- The idea: UI = f(state). Describe what it should look like, React figures out what changed
- Sandbox: same widget in vanilla JS vs React — toggle between, see complexity difference
- Virtual DOM / reconciliation — interactive visualization of diffing
- Components, props, state — the three concepts
- "When do you actually need this?" — decision framework
- No build tooling, no JSX — CDN React only, understand the mental model

## Vulkan/Graphics Track

### Page 1: shaders.html — The Shader Mental Model

- What a shader program actually is (function per-vertex or per-fragment, runs in parallel)
- Yes, multiple shader programs — when and why
- GLSL walkthrough with interactive WebGL/WebGPU canvas: edit shader, see result
- Vertex vs fragment vs geometry vs compute — what each stage sees and produces
- Uniforms, varyings, attributes — data flow between CPU↔GPU, between stages
- Problem sets: "make this gradient," "add a light source," "implement fog"

### Page 2: pipelines.html — Pipeline Architecture

- Full pipeline as interactive data flow diagram (click each stage, see what it does)
- Multiple pipelines: when needed, how to switch
- Render passes, subpasses, attachments — Vulkan framing with shader context
- Pipeline state: baked vs dynamic
- Problem sets: "draw two objects with different shaders," "implement post-processing pass"

### Exercises Directory

- Odin project skeletons with TODO comments
- Each builds on previous
- Compile and run locally

## New Format Elements (beyond existing slider sandboxes)

- **Editable code panels** — for shaders (edit + run in browser via WebGL/WebGPU)
- **Code skeletons** — for Vulkan exercises (Odin files with TODOs)
- **Rosetta Stone expanded** — Go/TinyGo/Odin/Jai/Rust where relevant
- **Decision trees** — interactive "should I use this?" flowcharts
- **Problem sets** — exercises with hints and reveal-answer panels

## Shared Infrastructure Changes

- Add WebGPU/WebGL utilities to `shared/` for shader sandboxes
- Vendor a code editor component (CodeMirror or similar) for editable shader panels
- Extend `build.sh` for Odin/Jai compilation support (exercise checking)
- Add problem set CSS/JS to `shared/` (collapsible hints, reveal answers)
