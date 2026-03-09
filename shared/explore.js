/* ── Learning Environment Shared Utilities ───────────────── */

/**
 * Render all LaTeX math on the page using KaTeX auto-render.
 * Call once after DOM is ready. Handles both inline ($...$) and display ($$...$$).
 */
function renderAllMath() {
    if (typeof renderMathInElement === 'undefined') {
        console.warn('KaTeX auto-render not loaded');
        return;
    }
    renderMathInElement(document.body, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
    });
}

/**
 * Create a labeled slider control and append it to a container.
 *
 * @param {HTMLElement} container - Parent element for the control
 * @param {object} opts - Configuration
 * @param {string} opts.label - Display label
 * @param {string} opts.id - Unique ID for the input
 * @param {number} opts.min - Minimum value
 * @param {number} opts.max - Maximum value
 * @param {number} opts.step - Step size
 * @param {number} opts.value - Initial value
 * @param {function} opts.onChange - Callback(value) on change
 * @param {function} [opts.format] - Format function for display value
 * @returns {HTMLInputElement} The range input element
 */
function createSlider(container, opts) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('label');
    label.setAttribute('for', opts.id);
    label.textContent = opts.label;

    const row = document.createElement('div');
    row.className = 'control-row';

    const input = document.createElement('input');
    input.type = 'range';
    input.id = opts.id;
    input.min = opts.min;
    input.max = opts.max;
    input.step = opts.step;
    input.value = opts.value;

    const display = document.createElement('span');
    display.className = 'value-display';
    const fmt = opts.format || (v => v);
    display.textContent = fmt(opts.value);

    input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        display.textContent = fmt(val);
        if (opts.onChange) opts.onChange(val);
    });

    row.appendChild(input);
    row.appendChild(display);
    group.appendChild(label);
    group.appendChild(row);
    container.appendChild(group);

    return input;
}

/**
 * Create a button control and append it to a container.
 */
function createButton(container, opts) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const btn = document.createElement('button');
    btn.textContent = opts.label;
    btn.addEventListener('click', opts.onClick);

    group.appendChild(btn);
    container.appendChild(group);

    return btn;
}

/**
 * Default Plotly layout settings for consistent chart theming.
 */
function plotlyDefaults(overrides = {}) {
    const defaults = {
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#ffffff',
        font: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 13,
            color: '#1a1a1a',
        },
        margin: { t: 30, r: 20, b: 50, l: 60 },
        xaxis: {
            gridcolor: '#f0f0f0',
            zerolinecolor: '#e0e0e0',
        },
        yaxis: {
            gridcolor: '#f0f0f0',
            zerolinecolor: '#e0e0e0',
        },
        showlegend: true,
        legend: {
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#e0e0e0',
            borderwidth: 1,
        },
    };

    return deepMerge(defaults, overrides);
}

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Useful for reproducible "random" data that changes only when you want.
 */
function seededRandom(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generate normally distributed random number using Box-Muller transform.
 */
function normalRandom(rng, mean = 0, std = 1) {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
}

/**
 * Deep merge two objects (simple implementation for config merging).
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object'
        ) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

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
 * Instantiate a WASM module from a Uint8Array with optional imports.
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

    // Build legend from unique classes
    const seenForLegend = new Set();
    for (const region of regions) {
        if (!seenClasses.has(region.cls) || seenForLegend.has(region.cls)) continue;
        seenForLegend.add(region.cls);
        const item = document.createElement('span');
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
