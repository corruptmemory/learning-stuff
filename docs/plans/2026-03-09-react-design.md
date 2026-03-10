# Design: React Exploration — "Why Crazy People Use React"

Date: 2026-03-09

## Learner Profile

Physics degree, 30 years of production web development across C/C++, C#/ASP.NET, PHP, Ruby on Rails, Scala. Has shipped sites with 1M+ page views/day. Current preferred stack: Go + templ + HTMX. Ground-zero on React specifically. Needs all three angles: why it exists, how it works mechanically, and whether to use it.

## Structure

Single page: `web-dev/react/explore.html`

## Technical Approach

- React via vendored CDN files (react.development.js + react-dom.development.js)
- Babel standalone (vendored) for in-browser JSX transform — no build tools
- Download via `build.sh refresh-vendor` alongside existing Plotly/KaTeX/D3

## Sandbox 1: "The Problem React Solves"

Build a filterable, sortable list in vanilla JS. User sees it working, then "Show the code" reveals the DOM manipulation spaghetti: event listeners modifying multiple elements, state scattered across the DOM, insertion-order bugs when combining filter + sort.

Interactive: break it by clicking fast enough to trigger a state inconsistency.

Then show the same widget as React's `UI = f(state)`. One state object, one render path. Side-by-side code comparison showing lines of code and number of direct DOM manipulation calls.

## Sandbox 2: "The Virtual DOM — What's Actually Happening"

Interactive tree diff visualization:
- Left: current virtual DOM tree
- Right: next virtual DOM tree (after state change)
- Animated reconciliation: walks both trees, highlights changes, shows minimal real DOM mutations
- Slider: tree complexity (few nodes → many nodes)
- Counter: real DOM ops vs. naive "replace everything" count
- Key insight: React's diffing is O(n) via heuristics, not O(n³) optimal tree diff

## Sandbox 3: "useState, useEffect, and the Render Cycle"

Interactive timeline of React's render lifecycle:
- Timeline: state change → render → diff → commit → effects
- "Trigger setState" button animates through each phase
- Show useState internals (array index into fiber)
- Show useEffect (side effects after paint, dependency array comparison)
- Gotcha demo: stale closure problem (count always 0 in setTimeout)

## Sandbox 4: "Should I Use This?"

Decision framework:
- Comparison matrix: React vs HTMX vs Alpine.js vs Vanilla JS vs Svelte vs WASM frameworks
- Axes: client-state complexity, team size, ecosystem needs, bundle size, server model
- Interactive: answer 3-4 project questions, get a recommendation
- Honest verdict for the learner's specific stack (Go + templ + HTMX)

## Sandbox 5: Rosetta Stone

Same interactive widget from Sandbox 1 in:
- Vanilla JS (DOM manipulation)
- React (JSX + hooks)
- HTMX + server-side (Go/templ)
- Alpine.js
- Svelte

Tabbed code panels via `createTabbedCode()`.
