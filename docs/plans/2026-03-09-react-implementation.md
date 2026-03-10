# React Exploration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page interactive exploration of React — why it exists, how it works mechanically, and when to use it — for a learner with 30 years of web development experience but zero React exposure.

**Architecture:** One HTML file (`web-dev/react/explore.html`) with 5 sandboxes, following the same patterns as the WASM and DiD explorations. React and Babel standalone are vendored via `build.sh`. All sandboxes are self-contained with inline JS.

**Tech Stack:** React 18 (CDN/vendored), Babel standalone (vendored for in-browser JSX transform), Plotly for charts, shared CSS/JS from `shared/`.

---

### Task 1: Vendor React and Babel, create directory

**Files:**
- Modify: `build.sh` — add React 18 + Babel standalone to `refresh_vendor()`
- Create: `web-dev/react/` directory

**Step 1: Add React and Babel to build.sh**

Add to `refresh_vendor()` after the D3 download section:

```bash
# React
echo "  React 18..."
curl -sL "https://unpkg.com/react@18/umd/react.development.js" \
    -o "$VENDOR_DIR/react.development.js"
curl -sL "https://unpkg.com/react-dom@18/umd/react-dom.development.js" \
    -o "$VENDOR_DIR/react-dom.development.js"

# Babel standalone (in-browser JSX transform)
echo "  Babel standalone..."
curl -sL "https://unpkg.com/@babel/standalone/babel.min.js" \
    -o "$VENDOR_DIR/babel.min.js"
```

**Step 2: Create directory and run vendor download**

```bash
mkdir -p web-dev/react
./build.sh refresh-vendor
```

**Step 3: Commit**

```bash
git add build.sh web-dev/
git commit -m "Add React 18 and Babel standalone to vendor, create react directory"
```

---

### Task 2: Sandbox 1 — "The Problem React Solves"

**Files:**
- Create: `web-dev/react/explore.html`

**Step 1: Create the page with skeleton and Sandbox 1**

Create `web-dev/react/explore.html` with the standard exploration boilerplate (same as WASM pages) plus Sandbox 1.

**HTML boilerplate:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React: Why Crazy People Use It</title>

    <!-- KaTeX -->
    <link rel="stylesheet" href="../../shared/vendor/katex/katex.min.css">
    <script src="../../shared/vendor/katex/katex.min.js"></script>
    <script src="../../shared/vendor/katex/contrib/auto-render.min.js"></script>

    <!-- Plotly -->
    <script src="../../shared/vendor/plotly.min.js"></script>

    <!-- React + Babel (for JSX in browser) -->
    <script src="../../shared/vendor/react.development.js"></script>
    <script src="../../shared/vendor/react-dom.development.js"></script>
    <script src="../../shared/vendor/babel.min.js"></script>

    <!-- Shared styles and utilities -->
    <link rel="stylesheet" href="../../shared/explore.css">
    <script src="../../shared/explore.js"></script>
</head>
```

**Sandbox 1 concept:**

Build a filterable, sortable list of items (e.g., a list of programming languages with name, year, and paradigm). Two implementations side by side:

**Left: Vanilla JS** — The widget works but the code is a mess:
- State is scattered: the current sort column is in a data attribute, the filter text is read from the input element, the list items are the DOM itself
- Adding sort+filter interaction creates ordering bugs (sort then filter vs filter then sort)
- Each operation manually clears and rebuilds DOM nodes
- Event listeners are added/removed manually
- A "Break it" button triggers rapid sort+filter to show the state inconsistency

**Right: React** — The same widget, same behavior:
- State is one object: `{ items, sortBy, sortDir, filter }`
- Render is a pure function of state
- No manual DOM manipulation
- Changes call `setState`, React handles the rest

**Display:**
- The two widgets side by side, both functional
- A "Show code" toggle below each that reveals the source
- A counter showing "DOM operations performed" for each (vanilla JS does many, React does the minimal diff)
- A "Rapid fire" button that triggers 20 sort/filter changes in sequence — vanilla JS may flicker or glitch, React stays consistent

**The widget (both versions):** A table of ~10 programming languages:
```
| Language | Year | Paradigm      |
|----------|------|---------------|
| Go       | 2009 | Imperative    |
| Rust     | 2010 | Multi-paradigm|
| Odin     | 2016 | Imperative    |
| Jai      | 2014 | Imperative    |
| Python   | 1991 | Multi-paradigm|
| Haskell  | 1990 | Functional    |
| Scala    | 2004 | Multi-paradigm|
| Ruby     | 1995 | OO            |
| C        | 1972 | Imperative    |
| Zig      | 2016 | Imperative    |
```

Sortable by any column (click header). Filterable by text input matching any field.

**Readout:** "The vanilla JS version is 80+ lines of direct DOM manipulation. The React version is ~40 lines. But the real difference isn't lines of code — it's that the React version *can't* get into an inconsistent state. The UI is always a function of the state object. Change the state, get the correct UI. That's the entire idea."

**Step 2: Commit**

```bash
git add web-dev/react/explore.html
git commit -m "Add React exploration page with Sandbox 1: the problem React solves"
```

**Step 3: Verify in browser**

Open `http://localhost:8080/web-dev/react/explore.html` and verify:
- Both widgets render and are interactive (sort, filter)
- "Show code" toggles work
- "Rapid fire" demonstrates the consistency difference
- DOM operation counters update

---

### Task 3: Sandbox 2 — "The Virtual DOM"

**Files:**
- Modify: `web-dev/react/explore.html` — add Sandbox 2

**Step 1: Add Sandbox 2 after Sandbox 1**

Interactive tree visualization of React's reconciliation algorithm.

**The visualization:** Two tree diagrams (using SVG or Canvas2D) side by side:
- Left: "Current" virtual DOM tree (a small component tree: App → Header + List → ListItem × N)
- Right: "Next" virtual DOM tree (after a state change — e.g., item added, item text changed, item removed)

**Interactive elements:**
- Buttons to trigger different state changes:
  - "Change text" — modifies one leaf node's content
  - "Add item" — appends a new node
  - "Remove item" — removes a node
  - "Reorder items" — moves nodes (demonstrates key importance)
- Animation showing the diff walk: nodes flash green (unchanged), yellow (updated), red (removed), blue (added)
- Counter panel: "Nodes compared: X | DOM mutations: Y | Naive approach would do: Z"
- Slider: tree size (5-50 nodes) to show scaling

**The tree rendering:** Use SVG for the tree diagrams. Each node is a rounded rect with the component/element name. Lines connect parent to children. The diff animation highlights nodes with colored borders/fills and draws arrows showing mutations.

**Key insight in readout:** "React's diff is O(n) — it walks both trees simultaneously, comparing node by node. The textbook optimal tree diff is O(n³), which is unusable for real UIs. React cheats with two heuristics: (1) different element types produce different trees (don't bother diffing), (2) `key` props tell React which items moved vs. which were added/removed. This is why you get that warning about missing keys in lists."

**Step 2: Commit**

```bash
git add web-dev/react/explore.html
git commit -m "Add Sandbox 2: virtual DOM reconciliation visualization"
```

---

### Task 4: Sandbox 3 — "useState, useEffect, and the Render Cycle"

**Files:**
- Modify: `web-dev/react/explore.html` — add Sandbox 3

**Step 1: Add Sandbox 3**

Interactive timeline/pipeline visualization of React's render lifecycle.

**The timeline:** A horizontal pipeline with 5 stages, displayed as connected boxes:
1. **setState called** — "Something changed"
2. **Render phase** — "React calls your component function, builds new virtual DOM"
3. **Reconciliation** — "Diff old vs new virtual DOM"
4. **Commit phase** — "Apply minimal DOM mutations"
5. **Effects run** — "useEffect callbacks fire (after paint)"

**Interactive "Trigger" button** that animates a state change flowing through the pipeline, with each stage lighting up in sequence with a brief description of what's happening.

**useState deep dive:**
Show a visual representation of React's internal hooks array:
```
Component: Counter
Hooks array: [0]  ← useState(0) reads/writes index 0
                     useState returns [value, setter]
                     setter triggers re-render
                     on re-render, useState reads same index → gets current value
```

Button: "Increment" → show the hooks array updating, trigger a re-render animation.

Add a second `useState` to show the array growing: `[0, "hello"]` — demonstrating why hooks can't be called conditionally (the index would shift).

**useEffect deep dive:**
Show effect timing relative to the render cycle:
- `useEffect(() => {}, [])` — runs once after first paint (mount)
- `useEffect(() => {}, [count])` — runs after paint when `count` changes
- `useEffect(() => { return cleanup }, [])` — cleanup runs on unmount

Interactive: toggle a component on/off to see mount/unmount effects fire.

**The stale closure gotcha:**
```javascript
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setTimeout(() => {
      // This captures count at the time handleClick was called
      // NOT the current count when the timeout fires
      console.log(count); // Always logs 0!
    }, 3000);
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

Interactive demo: click the button, quickly increment count 5 times, wait 3 seconds — the timeout logs `0`, not `5`. Show why: the closure captured the value from render #1.

**Readout:** "React components are just functions. Every render is a function call with a snapshot of the current state. `useState` is an array index. `useEffect` is a callback that runs after paint. The 'magic' is bookkeeping — React tracks which component is rendering, which hook index you're on, and which effects need to run. There is no magic."

**Step 2: Commit**

```bash
git add web-dev/react/explore.html
git commit -m "Add Sandbox 3: render lifecycle, hooks internals, stale closure demo"
```

---

### Task 5: Sandbox 4 — "Should I Use This?"

**Files:**
- Modify: `web-dev/react/explore.html` — add Sandbox 4

**Step 1: Add Sandbox 4**

Decision framework with comparison matrix and interactive questionnaire.

**Comparison matrix** (styled table):

| | React | HTMX | Alpine.js | Vanilla JS | Svelte | WASM (Leptos) |
|---|---|---|---|---|---|---|
| Mental model | UI = f(state) | Server-rendered HTML | Sprinkle interactivity | Direct DOM | Compiler magic | Rust components |
| Bundle size | ~45KB | ~14KB | ~15KB | 0KB | ~2KB (compiled) | ~200KB+ |
| Build step | Yes (usually) | No | No | No | Yes | Yes (Rust) |
| Client state | Excellent | Minimal (server owns state) | Good for small state | Manual | Excellent | Excellent |
| Server model | Any (API-driven) | Server-rendered HTML | Any | Any | Any (API-driven) | Any |
| Learning curve | Steep | Gentle | Gentle | None | Moderate | Steep |
| Ecosystem | Massive | Small | Small | N/A | Growing | Tiny |
| Best for | Complex SPAs | Server-driven apps | Enhancing static pages | Simple interactions | Complex SPAs | Systems programmers |

**Interactive questionnaire** using the decision tree pattern from the WASM page:

Q1: "How much client-side state does your app manage?"
  - "Almost none — server has the truth" → leans HTMX
  - "Some — form state, UI toggles" → leans Alpine.js
  - "A lot — complex interactive UI" → leans React/Svelte

Q2: "Do you control the server?"
  - "Yes, and I like rendering HTML there" → leans HTMX
  - "Yes, but I want a JSON API" → leans React
  - "No — static hosting / third-party API" → leans React/Svelte

Q3: "How big is your team?"
  - "Just me" → leans simpler (HTMX/Alpine)
  - "2-5 developers" → any is fine
  - "Large team / hiring from job market" → leans React (hiring pool)

Q4: "What's your tolerance for build tooling?"
  - "None — I want to open an HTML file and go" → HTMX or Alpine
  - "Minimal — I'll accept a simple bundler" → Svelte
  - "Whatever it takes — I'm used to it" → React

Verdicts are color-coded cards with honest recommendations.

**Honest verdict section** specifically for the learner:
"Given your stack (Go + templ + HTMX): React adds a build step, a virtual DOM, and a JavaScript-heavy client to a stack that already works. The only scenario where React makes sense for you is if you're building something with *heavy* client-side interactivity — a code editor, a real-time dashboard, a drawing tool. For most web applications, you already have the better tool."

**Step 2: Commit**

```bash
git add web-dev/react/explore.html
git commit -m "Add Sandbox 4: decision framework and comparison matrix"
```

---

### Task 6: Sandbox 5 — Rosetta Stone

**Files:**
- Modify: `web-dev/react/explore.html` — add Sandbox 5

**Step 1: Add Sandbox 5**

The same filterable/sortable language table from Sandbox 1, shown in 5 different frameworks via `createTabbedCode()`.

**Tabs:**

**Vanilla JS** — direct DOM manipulation, event listeners, manual state tracking.

**React (JSX + hooks)** — `useState` for sort/filter state, JSX for declarative rendering, `useMemo` for derived data.

**HTMX + Go/templ** — server-side rendering, `hx-get` for sort/filter endpoints, templ components for the table. Show both the Go handler and the templ template.

**Alpine.js** — `x-data` for state, `x-for` for list rendering, `x-on:click` for sort, `x-model` for filter input. No build step, no virtual DOM.

**Svelte** — `.svelte` component with reactive `$:` declarations, `{#each}` blocks, event handlers. Looks like enhanced HTML.

Each tab shows the complete, working code (or as close to complete as practical). Annotations highlight the conceptual parallels: "this is where state lives," "this is the render path," "this is how events are handled."

**Readout:** "Five frameworks, one widget. React isn't wrong — it's one answer. The question is whether your problem needs React's answer (complex client state, large team, rich ecosystem) or a simpler one (server-rendered HTML, sprinkled interactivity). For most CRUD apps, HTMX with a server-side language you already know is less code, less complexity, and fewer things to break."

**Step 2: Commit**

```bash
git add web-dev/react/explore.html
git commit -m "Add Sandbox 5: Rosetta Stone comparing 5 frameworks"
```

---

### Task 7: Update project docs

**Files:**
- Modify: `CLAUDE.md` — add React exploration to current state
- Modify: `README.md` — update web-dev track listing

**Step 1: Update CLAUDE.md**

Add to the "Completed" section under WASM:
```
React exploration (web-dev/react/) — single page:
1. The Problem React Solves (vanilla JS vs React side-by-side)
2. Virtual DOM reconciliation visualization
3. Render lifecycle, hooks internals, stale closure gotcha
4. Decision framework (React vs HTMX vs Alpine vs Svelte vs Vanilla)
5. Rosetta Stone (same widget in 5 frameworks)
```

**Step 2: Update README.md**

Add React URL to quick start section.

**Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "Update project docs with React exploration"
```
