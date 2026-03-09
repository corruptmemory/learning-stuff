# WASM Learning Track Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 3-page interactive exploration of WebAssembly — what it is, whether it can replace frontend web dev, and why you'd run it on a server.

**Architecture:** Each page is a self-contained HTML file under `web-dev/wasm/`, following the same patterns as `data-science/difference-in-differences/explore.html`. Interactive sandboxes use the WebAssembly JS API to run actual WASM in the browser. Pre-compiled `.wasm` binaries live in `web-dev/wasm/samples/` for the language comparison sandbox.

**Tech Stack:** HTML + shared CSS/JS, Plotly for charts, KaTeX for math, WebAssembly JS API (`WebAssembly.instantiate`), hand-crafted WAT (WebAssembly Text Format) compiled to binary inline via helper functions.

---

### Task 1: Directory structure and shared infrastructure

**Files:**
- Create: `web-dev/wasm/` directory
- Create: `web-dev/wasm/samples/` directory (for pre-compiled .wasm files)
- Modify: `shared/explore.css` — add new CSS classes for WASM-specific elements
- Modify: `shared/explore.js` — add WASM helper utilities

**Step 1: Create directory structure**

```bash
mkdir -p web-dev/wasm/samples
```

**Step 2: Add WASM-specific CSS to shared/explore.css**

Append to `shared/explore.css`:

```css
/* ── Binary Viewer ─────────────────────────────────────────── */

.binary-viewer {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    line-height: 1.8;
    padding: 1rem;
    background: #1a1a2e;
    color: #a0a0c0;
    border-radius: 6px;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
}

.binary-viewer .byte {
    display: inline-block;
    padding: 0.1em 0.3em;
    margin: 0.1em;
    border-radius: 3px;
    cursor: default;
    transition: background 0.15s;
}

.binary-viewer .byte:hover {
    background: rgba(255, 255, 255, 0.1);
}

.binary-viewer .byte.magic { color: #f59e0b; background: rgba(245, 158, 11, 0.15); }
.binary-viewer .byte.version { color: #3b82f6; background: rgba(59, 130, 246, 0.15); }
.binary-viewer .byte.section-type { color: #ef4444; background: rgba(239, 68, 68, 0.15); }
.binary-viewer .byte.section-data { color: #a78bfa; background: rgba(167, 139, 250, 0.1); }
.binary-viewer .byte.active { background: rgba(255, 255, 255, 0.2); outline: 1px solid rgba(255,255,255,0.4); }

.binary-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.5rem 0;
    font-size: 0.8rem;
}

.binary-legend .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 0.3em;
    vertical-align: middle;
}

/* ── Size Comparison Bar Chart ─────────────────────────────── */

.size-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.size-bar-row {
    display: grid;
    grid-template-columns: 100px 1fr 80px;
    align-items: center;
    gap: 0.75rem;
}

.size-bar-label {
    font-size: 0.85rem;
    font-weight: 600;
    text-align: right;
}

.size-bar-track {
    height: 24px;
    background: var(--color-bg);
    border-radius: 4px;
    border: 1px solid var(--color-border);
    overflow: hidden;
}

.size-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.size-bar-value {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-muted);
}

/* ── Imports/Exports Diagram ───────────────────────────────── */

.boundary-diagram {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0;
    align-items: center;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 6px;
    border: 1px solid var(--color-border);
}

.boundary-side {
    padding: 1rem;
    border-radius: 6px;
    min-height: 120px;
}

.boundary-side.host {
    background: #dbeafe;
    border: 2px solid #3b82f6;
}

.boundary-side.wasm {
    background: #fef3c7;
    border: 2px solid #f59e0b;
}

.boundary-wall {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0 0.75rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.boundary-arrow {
    font-size: 1.2rem;
    color: var(--color-accent);
}

/* ── Expandable Rosetta (multi-language) ───────────────────── */

.rosetta-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--color-border);
    margin-bottom: 0;
}

.rosetta-tab {
    padding: 0.4rem 1rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: transparent;
    color: var(--color-text-muted);
    transition: all 0.15s;
}

.rosetta-tab:hover {
    background: var(--color-bg);
}

.rosetta-tab.active {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
    margin-bottom: -2px;
    border-bottom: 2px solid var(--color-surface);
}

.rosetta-tab-content {
    display: none;
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    overflow: hidden;
}

.rosetta-tab-content.active {
    display: block;
}

.rosetta-tab-content pre {
    margin: 0;
    padding: 0.75rem;
    overflow-x: auto;
    background: #fafafa;
}

.rosetta-tab-content pre code {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.55;
    background: none;
    border: none;
    padding: 0;
}

/* ── Language color accents ────────────────────────────────── */

.rosetta-tab[data-lang="go"] { border-top-color: #00ADD8; }
.rosetta-tab[data-lang="go"].active { color: #00ADD8; }
.rosetta-tab[data-lang="tinygo"] { border-top-color: #5DC9E2; }
.rosetta-tab[data-lang="tinygo"].active { color: #5DC9E2; }
.rosetta-tab[data-lang="rust"] { border-top-color: #CE422B; }
.rosetta-tab[data-lang="rust"].active { color: #CE422B; }
.rosetta-tab[data-lang="odin"] { border-top-color: #3882D6; }
.rosetta-tab[data-lang="odin"].active { color: #3882D6; }
.rosetta-tab[data-lang="jai"] { border-top-color: #9B59B6; }
.rosetta-tab[data-lang="jai"].active { color: #9B59B6; }
.rosetta-tab[data-lang="wat"] { border-top-color: #654FF0; }
.rosetta-tab[data-lang="wat"].active { color: #654FF0; }
.rosetta-tab[data-lang="js"] { border-top-color: #F7DF1E; }
.rosetta-tab[data-lang="js"].active { color: #b8a600; }

/* ── Decision Tree ─────────────────────────────────────────── */

.decision-tree {
    padding: 1rem;
}

.decision-node {
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    border-radius: 6px;
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all 0.15s;
}

.decision-node:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
}

.decision-node.question {
    background: var(--color-surface);
    font-weight: 600;
}

.decision-node.answer-yes {
    background: #f0fdf4;
    border-color: var(--color-success);
    margin-left: 1.5rem;
}

.decision-node.answer-no {
    background: #fef2f2;
    border-color: var(--color-treatment);
    margin-left: 1.5rem;
}

.decision-node.verdict {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
    font-weight: 600;
    margin-left: 3rem;
}
```

**Step 3: Add WASM utilities to shared/explore.js**

Append to `shared/explore.js`:

```javascript
/**
 * Create a tabbed code panel (multi-language Rosetta Stone).
 *
 * @param {HTMLElement} container - Parent element
 * @param {Array<{lang: string, label: string, code: string}>} tabs - Tab definitions
 * @returns {HTMLElement} The tab container element
 */
function createTabbedCode(container, tabs) {
    const wrapper = document.createElement('div');
    wrapper.className = 'rosetta-tabbed';

    const tabBar = document.createElement('div');
    tabBar.className = 'rosetta-tabs';

    const contents = [];

    tabs.forEach((tab, i) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'rosetta-tab' + (i === 0 ? ' active' : '');
        tabBtn.dataset.lang = tab.lang;
        tabBtn.textContent = tab.label;

        const content = document.createElement('div');
        content.className = 'rosetta-tab-content' + (i === 0 ? ' active' : '');
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = tab.code;
        pre.appendChild(code);
        content.appendChild(pre);

        tabBtn.addEventListener('click', () => {
            tabBar.querySelectorAll('.rosetta-tab').forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tabBtn.classList.add('active');
            content.classList.add('active');
        });

        tabBar.appendChild(tabBtn);
        contents.push(content);
    });

    wrapper.appendChild(tabBar);
    contents.forEach(c => wrapper.appendChild(c));
    container.appendChild(wrapper);

    return wrapper;
}

/**
 * Compile WAT (WebAssembly Text Format) string to a Uint8Array of WASM binary.
 * This is a minimal hand-rolled compiler for simple WAT modules used in the
 * learning sandboxes. For anything complex, use pre-compiled .wasm files.
 *
 * For the sandboxes, we store pre-compiled bytes and use this as documentation.
 */
function wasmFromBytes(...bytes) {
    return new Uint8Array(bytes);
}

/**
 * Instantiate a WASM module from bytes with optional imports.
 * Returns a Promise of the exports object.
 */
async function instantiateWasm(bytes, imports = {}) {
    const result = await WebAssembly.instantiate(bytes, imports);
    return result.instance.exports;
}

/**
 * Create an interactive binary viewer that color-codes WASM sections.
 *
 * @param {HTMLElement} container - Parent element
 * @param {Uint8Array} bytes - The WASM binary
 * @param {Array<{start: number, end: number, cls: string, label: string}>} regions - Color regions
 */
function createBinaryViewer(container, bytes, regions) {
    const viewer = document.createElement('div');
    viewer.className = 'binary-viewer';

    const legend = document.createElement('div');
    legend.className = 'binary-legend';

    const classColors = {
        magic: '#f59e0b',
        version: '#3b82f6',
        'section-type': '#ef4444',
        'section-data': '#a78bfa',
    };

    const seenClasses = new Set();

    for (let i = 0; i < bytes.length; i++) {
        const span = document.createElement('span');
        span.className = 'byte';
        span.textContent = bytes[i].toString(16).padStart(2, '0');
        span.title = `offset ${i} (0x${i.toString(16)})`;

        for (const region of regions) {
            if (i >= region.start && i < region.end) {
                span.classList.add(region.cls);
                span.title += ` — ${region.label}`;
                seenClasses.add(region.cls);
                break;
            }
        }

        viewer.appendChild(span);
    }

    // Build legend
    for (const region of regions) {
        if (!seenClasses.has(region.cls)) continue;
        // Deduplicate by class
        if (legend.querySelector(`[data-cls="${region.cls}"]`)) continue;
        const item = document.createElement('span');
        item.dataset.cls = region.cls;
        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = classColors[region.cls] || '#666';
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(region.label));
        legend.appendChild(item);
    }

    container.appendChild(legend);
    container.appendChild(viewer);
}

/**
 * Run a benchmark comparing two functions, returns { times1, times2, iterations }.
 */
function benchmark(fn1, fn2, iterations = 100) {
    // Warmup
    for (let i = 0; i < 10; i++) { fn1(); fn2(); }

    const times1 = [];
    const times2 = [];

    for (let i = 0; i < iterations; i++) {
        let t0 = performance.now();
        fn1();
        times1.push(performance.now() - t0);

        t0 = performance.now();
        fn2();
        times2.push(performance.now() - t0);
    }

    return { times1, times2, iterations };
}
```

**Step 4: Commit**

```bash
git add web-dev/ shared/explore.css shared/explore.js
git commit -m "Add WASM track directory structure and shared infrastructure"
```

---

### Task 2: Page 1 — explore.html — The WASM Runtime Model

This is the foundation page. Four sandboxes teaching what WASM actually is.

**Files:**
- Create: `web-dev/wasm/explore.html`

**Step 1: Create the page skeleton with intro**

Create `web-dev/wasm/explore.html` with:
- Standard HTML boilerplate following the DiD pattern (same vendor paths adjusted for depth: `../../shared/`)
- Title: "WebAssembly"
- Subtitle: "What it actually is, what it can't do, and why that matters"
- Intro section explaining WASM in one paragraph: it's a binary instruction format for a stack-based virtual machine. NOT "compiled JavaScript." NOT "native code in the browser." It's a sandboxed, portable bytecode with a very specific set of limitations that are features, not bugs.

**Step 2: Sandbox 1 — "What's in a .wasm File?"**

An interactive binary viewer showing a minimal hand-written WASM module (an `add` function). The binary is color-coded by section: magic number, version, type section, function section, export section, code section.

The sandbox includes:
- The binary viewer (color-coded hex dump)
- Side panel showing the equivalent WAT (text format) for readability
- A "Run it" button that actually instantiates the module and calls the exported function
- Slider for the two input arguments
- Readout showing the result

The WASM module (hand-assembled bytes):
```javascript
// (module
//   (func $add (param i32 i32) (result i32)
//     local.get 0
//     local.get 1
//     i32.add)
//   (export "add" (func $add)))
const addModule = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d,  // magic: \0asm
    0x01, 0x00, 0x00, 0x00,  // version: 1
    // Type section
    0x01, 0x07, 0x01,        // section id=1, size=7, count=1
    0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,  // (i32, i32) -> i32
    // Function section
    0x03, 0x02, 0x01, 0x00,  // section id=3, size=2, count=1, type[0]
    // Export section
    0x07, 0x07, 0x01,        // section id=7, size=7, count=1
    0x03, 0x61, 0x64, 0x64, 0x00, 0x00,  // "add", func, index 0
    // Code section
    0x0a, 0x09, 0x01,        // section id=10, size=9, count=1
    0x07, 0x00,              // body size=7, local count=0
    0x20, 0x00,              // local.get 0
    0x20, 0x01,              // local.get 1
    0x6a,                    // i32.add
    0x0b,                    // end
]);
```

Alongside the hex view, show the WAT text:
```wat
(module
  (func $add (param i32 i32) (result i32)
    local.get 0    ;; push first param
    local.get 1    ;; push second param
    i32.add)       ;; pop both, push sum
  (export "add" (func $add)))
```

Readout explains: "This is 41 bytes. The entire module. No runtime, no garbage collector, no standard library. Just the function, the types, and the export. That's the WASM value proposition: *it's exactly what you asked for, nothing more.*"

**Step 3: Sandbox 2 — "The Boundary: WASM Can't Do Anything Alone"**

Demonstrates that WASM has NO built-in I/O. It can't print. It can't read files. It can't touch the DOM. It can't make network requests. Everything goes through imports/exports.

Interactive elements:
- A WASM module that *tries* to log a message — it calls an imported `log` function
- Toggle: "Provide the import" vs "Don't provide it" — without the import, instantiation fails
- A second example: WASM module that writes to linear memory, JS reads it back — show the shared memory boundary
- A boundary diagram: Host (JS/browser) on the left, WASM sandbox on the right, arrows showing imports flowing in and exports flowing out

The key insight (in readout): "WASM is a *guest* in someone else's house. The host decides what the guest can do. In a browser, the host is JavaScript. On Cloudflare, the host is the Workers runtime. Same WASM module, different capabilities — because the *imports* are different."

**Step 4: Sandbox 3 — "JS vs WASM: When Does It Actually Matter?"**

Live benchmark comparing JS and WASM implementations of:
- Fibonacci (naive recursive) — WASM wins on compute
- String manipulation — JS wins (WASM has no string type)
- Array sum — roughly equal (JIT is good at this)

Controls:
- Slider: problem size N (Fibonacci: N=20-40, array: N=1000-1000000)
- Button: "Run Benchmark"
- Chart: Plotly bar chart showing JS vs WASM execution time, updating live

The WASM modules for each benchmark are hand-assembled bytes (fibonacci, array_sum). String manipulation stays JS-only to prove the point.

Readout: dynamic, changes based on results. Key message: "WASM isn't universally faster than JS. Modern JS engines (V8, SpiderMonkey) are *very good* at optimizing hot paths. WASM wins when: (1) you need predictable performance (no JIT warmup/deopt), (2) heavy numerical computation, (3) you're porting existing C/Rust/etc code. WASM loses when: strings, DOM, anything requiring many host calls."

**Step 5: Sandbox 4 — "The Language Tax: What Your Compiler Brings Along"**

NOT a live compilation sandbox (would need toolchains). Instead, a pre-researched comparison showing binary sizes and what each language's WASM output includes.

Display: horizontal bar chart showing .wasm file sizes for the same `add` function:
- Hand-written WAT: 41 bytes
- Rust (wasm32-unknown-unknown, no_std): ~200 bytes
- Rust (with std): ~2MB
- TinyGo: ~5KB (minimal runtime)
- Go: ~2.5MB (full runtime + GC)
- Zig: ~200 bytes (no runtime)

Each bar is clickable, expanding to explain *what* is in that binary (runtime, GC, allocator, panic handler, etc).

Rosetta Stone section below: the same `add` function in each language, with annotations about what the compiler adds.

Use `createTabbedCode()` for the multi-language code display:
- WAT
- Go
- TinyGo
- Rust
- Odin (note: WASM target is experimental)
- Jai (note: WASM target status TBD)

Readout: "The 'language tax' is everything your compiler adds beyond your actual code. For a trivial function, the tax is the entire binary. For a real application, the tax becomes a smaller fraction — but it determines your floor. Go's 2.5MB floor means WASM Go is impractical for small modules. TinyGo and Rust sit in the sweet spot for most use cases."

**Step 6: Commit**

```bash
git add web-dev/wasm/explore.html
git commit -m "Add WASM Page 1: runtime model exploration with 4 sandboxes"
```

**Step 7: Verify in browser**

Open `http://localhost:8080/web-dev/wasm/explore.html` and verify:
- Binary viewer renders with color-coded bytes
- Add function sandbox actually runs WASM and shows results
- Boundary diagram is clear
- Benchmark runs and produces a chart
- Language tax bars render correctly
- Tabbed code panels switch between languages
- KaTeX renders (if any math is used)
- Responsive layout works

---

### Task 3: Page 2 — escape-the-web.html — Can I Just WASM a Frontend?

**Files:**
- Create: `web-dev/wasm/escape-the-web.html`

**Step 1: Create the page with intro**

Title: "Can I Just WASM a Frontend?"
Subtitle: "The honest answer to 'do I need JavaScript?'"

Intro: "You know a systems language. You hate JavaScript. WebAssembly exists. The question is obvious: can you skip the entire web frontend stack and just... write your UI in a real language? The answer is nuanced, and depends on what you mean by 'frontend.'"

**Step 2: Sandbox 1 — "What You Need From the Browser"**

An interactive checklist/diagram of browser capabilities:
- DOM manipulation — WASM: NO (must call JS)
- Event handling (click, keyboard) — WASM: NO (must register via JS)
- Canvas 2D/WebGL/WebGPU — WASM: YES (via imported bindings)
- Fetch/networking — WASM: NO (must call JS)
- LocalStorage/IndexedDB — WASM: NO (must call JS)
- Web Audio — WASM: NO (must call JS)
- WASI (filesystem, sockets) — Browser: NOT YET, Workers: PARTIAL

Each item is interactive — click to expand and see what the glue code looks like.

Key insight: "The DOM is the browser's API. WASM can't bypass it. If you want text, forms, and layout — you're either writing JS glue or using a framework that writes it for you. If you want pixels on a canvas — you can mostly stay in WASM land."

**Step 3: Sandbox 2 — "The Spectrum"**

Three approaches visualized side by side, each building the same tiny app (a counter with a button):

1. **"Thin glue"** — Business logic in WASM, UI in JS. The JS calls WASM for computation, renders DOM itself. Minimal WASM surface.
2. **"Canvas-only"** — WASM draws everything to a `<canvas>`. No DOM at all. Like a game engine. Show actual WebGL rendering from WASM.
3. **"Framework"** — use a Rust/WASM framework (Leptos, Yew, Dioxus) or Go/WASM framework that generates DOM-manipulating glue for you.

Interactive toggle between the three approaches, showing:
- Code complexity (LOC bar chart)
- Binary size
- What you give up (accessibility, SEO, text selection, browser dev tools)
- What you gain (type safety, no JS, familiar language)

**Step 4: Sandbox 3 — "The Canvas Escape Hatch"**

A live demo: a small interactive widget rendered entirely via WASM → Canvas2D. No DOM elements except the canvas itself. User interacts via mouse events forwarded from JS → WASM.

Demonstrates: this is the closest you get to "no JavaScript." You still have a tiny JS shim that:
1. Creates the canvas
2. Forwards events
3. Calls WASM's `render()` each frame

Show the shim code (it's ~20 lines of JS that never changes).

Rosetta Stone: the same canvas-drawing app in Go, Rust, and Odin (code panels, not runnable — just to show what it looks like in each language).

**Step 5: Sandbox 4 — "The Verdict: Decision Tree"**

An interactive decision tree:
- "Do you need server-side rendering / SEO?" → YES → "WASM-only is not your path. Use a traditional framework (or HTMX)."
- "Is your UI mostly text, forms, and layout?" → YES → "DOM-based. You need JS (or a framework that generates JS). WASM for logic only."
- "Is your UI a canvas/game/visualization?" → YES → "Canvas + WASM is viable. Minimal JS shim. Go for it."
- "Do you already have a C/C++/Rust codebase?" → YES → "Port to WASM, add thin JS glue. This is WASM's sweet spot."
- "Are you starting fresh and hate JS?" → "Consider: HTMX + server-side language might be simpler than WASM + JS glue."

Each node is clickable, expanding with examples and trade-off details.

**Step 6: Commit**

```bash
git add web-dev/wasm/escape-the-web.html
git commit -m "Add WASM Page 2: 'Can I Just WASM a Frontend?' with decision tree"
```

**Step 7: Verify in browser**

Open `http://localhost:8080/web-dev/wasm/escape-the-web.html` and verify all sandboxes render and interact correctly.

---

### Task 4: Page 3 — cloudflare-workers.html — Why WASM on a Server?

**Files:**
- Create: `web-dev/wasm/cloudflare-workers.html`

**Step 1: Create the page with intro**

Title: "WASM on the Edge: Cloudflare Workers"
Subtitle: "Why you'd run WebAssembly on a server, and when it makes sense"

Intro: "WebAssembly was designed for the browser. Then people realized: the same properties that make it good for browsers — sandboxing, near-native speed, language-agnostic — make it interesting for servers too. Cloudflare Workers run your code at the edge, in V8 isolates, and they can run WASM. The question isn't whether you *can* — it's whether you *should*."

**Step 2: Sandbox 1 — "Containers vs Isolates vs WASM"**

Interactive comparison of three execution models:
- **Container (Docker/Lambda)**: full OS, slow cold start (~100-500ms), full language runtime, GB memory
- **V8 Isolate (Workers JS)**: shared V8, fast cold start (~5ms), JS/WASM only, MB memory
- **WASM in Isolate (Workers WASM)**: V8 isolate + WASM module, same cold start, any compiled language

Visualization: Plotly grouped bar chart comparing cold start time, memory overhead, and request latency. Sliders to adjust assumptions (module size, etc).

Readout: "Workers don't use containers. They use V8 isolates — lightweight execution contexts within a single V8 process. A single machine can run thousands of isolates. WASM modules load *inside* these isolates. The cold start is V8's isolate creation, not your module's compilation (that's cached)."

**Step 3: Sandbox 2 — "The Edge: Geography as Architecture"**

Interactive world map (using Plotly's geo/scattergeo) showing:
- Cloudflare's edge network (~300 cities)
- Slider: pick a user location, see which PoP handles the request
- Latency comparison: edge vs single-region vs multi-region

Key insight: "The 'edge' isn't about speed of computation — it's about proximity. A Worker running at the edge is physically closer to the user. The computation might be identical to what you'd run in us-east-1, but the round-trip latency is halved."

**Step 4: Sandbox 3 — "Good Use Cases vs Fighting It"**

Two-column interactive display:

**Good use cases (green):**
- URL routing/rewriting
- Auth token validation (JWT decode)
- Image transformation pipeline
- A/B testing at the edge
- API gateway / rate limiting
- Running existing C/Rust libraries (e.g., image processing, crypto)

**Fighting it (red):**
- CRUD apps with a database (latency to DB dominates)
- Long-running computations (Workers have CPU time limits)
- Stateful applications (Workers are stateless)
- Anything that needs the full language ecosystem (limited to WASM-compilable deps)

Each item is clickable, expanding to explain *why* it's good/bad with latency/architecture reasoning.

**Step 5: Sandbox 4 — "Anatomy of a Worker"**

Side-by-side code showing the same Worker in:
- JavaScript (native)
- Rust (via wasm-bindgen + worker-rs)
- Go (via TinyGo)

Use `createTabbedCode()` for the code panels.

The Worker does something simple but real: accepts a request, validates an API key from a header, transforms a JSON payload, returns the result.

Readout explains the trade-offs: "The JS version is 20 lines. The Rust version is 45 lines but you get type safety and can use any Rust crate that compiles to WASM. The TinyGo version is 30 lines but the binary is 5x larger. The *runtime behavior* is identical — only the developer experience differs."

**Step 6: Commit**

```bash
git add web-dev/wasm/cloudflare-workers.html
git commit -m "Add WASM Page 3: Cloudflare Workers and edge computing"
```

**Step 7: Verify in browser**

Open `http://localhost:8080/web-dev/wasm/cloudflare-workers.html` and verify all sandboxes.

---

### Task 5: Update project docs and CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — add web-dev track, WASM exploration details
- Modify: `README.md` — add web-dev track to project overview

**Step 1: Update CLAUDE.md**

Add to the architecture section:
- `web-dev/` track with `wasm/` topic (3 pages: explore, escape-the-web, cloudflare-workers)
- Note about multi-page topics
- Tabbed Rosetta Stone pattern (createTabbedCode)
- New shared CSS classes for binary viewer, boundary diagrams, decision trees

**Step 2: Update README.md**

Add the WASM exploration to the topic list.

**Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "Update project docs with WASM track"
```
