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
