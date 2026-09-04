# Valuation Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `finance/valuation/explore.html`, a six-sandbox interactive page on DCF valuation, whose number it is, the post-acquisition layer, fat-tailed premium estimation, ergodicity and the founder's bet, and a Python + spreadsheet Rosetta Stone.

**Architecture:** One HTML page plus a small pure-math module `finance/valuation/valuation.js` that the page loads with a `<script src>` and that Node can also `require()` for shell-side verification. A Python script `scripts/dcf.py` is the numeric oracle and the Rosetta source. Charts are Plotly, math is KaTeX, controls come from `shared/explore.js`. Sandboxes are independent of each other.

**Tech Stack:** Vanilla JS (browser + Node 26 for tests), Plotly (vendored), KaTeX (vendored), Python 3.14 + numpy (per-topic venv via `build.sh`).

**Spec:** `docs/plans/2026-09-04-valuation-design.md`

**One refinement over the spec:** the spec put the pure functions "first in the page's script block." This plan moves them into `valuation.js` (same directory, loaded by the page) so the self-test can run from the shell with `node` as well as in the browser console. Behavior is identical; the page still calls `runSelfTest()` on load and logs the result.

**Executed 2026-09-04** on branch `valuation-exploration`, thirteen commits, one per task plus three review fixes. Deviations from the text below are listed in the spec's "Execution Amendments" section; the self-test grew from 22 to 33 assertions in the final fix commit, so expected console lines below that say `22/22` read `33/33` on the merged page.

## Global Constraints

- Never edit `shared/vendor/`; never run `go build`/`templ` directly; use `./build.sh` for venvs.
- Page loads shared assets via relative paths `../../shared/...` exactly as the DiD page does.
- Call `renderAllMath()` after any `innerHTML` update containing `$...$`.
- All randomness through `seededRandom(seed)` from `shared/explore.js`; every stochastic sandbox has a reseed button.
- Terminal growth `gT` must stay at least 0.005 below `r` everywhere the Gordon term appears.
- Callout classes are additive in `shared/explore.css`: `.callout`, `.callout.take`, `.callout.siren`. Seven callouts on the page, as listed per sandbox in the spec.
- Sandbox sections use the DiD markup: `section.sandbox > h2 + .description + .sandbox-content(.chart-container + .controls) + .readout`.
- Commit after every task with the trailer:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019QjZRDSqit1aJLTFWpo5P8
```

## File Structure

| File | Responsibility |
|---|---|
| `finance/valuation/scripts/dcf.py` | Numeric oracle + Rosetta source. Prints default readouts for Sandboxes 1, 2, 5. |
| `finance/valuation/requirements.txt` | `numpy` |
| `finance/valuation/valuation.js` | Pure functions: `dcf`, `impliedGrowth`, `mergerModel`, `paretoMean`, `paretoSample`, `sampleReturns`, `runningMean`, `kellyFraction`, `timeAverageGrowth`, `ensembleGrowth`, `simulatePaths`, `runSelfTest`. Exports for Node when `module` exists. |
| `finance/valuation/explore.html` | Page: intro, notation panel, six sandboxes, references. Sandbox wiring only; no math. |
| `shared/explore.css` | Add `.callout` rules (additive). |
| `README.md`, `CLAUDE.md` | Track list + "Completed" entry (last task). |

## Expected values (computed once, used by every test below)

| Case | Inputs | Expected |
|---|---|---|
| S1 value | fcf1=100, g=0.08, n=10, r=0.10, gT=0.025 | `value = 1891.4986279412533`, `pvExplicit = 838.2047745990345`, `pvTerminal = 1053.2938533422189`, `tv = 2731.972990376058`, `terminalShare = 0.5568567895228378` |
| S1 grid | r ∈ {0.09,0.10,0.11} × gT ∈ {0.02,0.025,0.03} | row r=0.09: 2110.8806, 2212.0232, 2330.0228; row r=0.10: 1820.8509, 1891.4986, 1972.2389; row r=0.11: 1596.7546, 1647.8305, 1705.2908 |
| S2 reverse | price = 1891.4986279412533, same fixed inputs | `g = 0.08` within 1e-6 |
| S2 parties | A: fcf1=100·1.00, g=0.08, r=0.09; B: fcf1=100·1.15, g=0.10, r=0.11; S: fcf1=100, g=0.08, r=0.12; all n=10, gT=0.025 | A `2212.023170226492`, B `2146.642472089947`, S `1456.64839556544` |
| S3 standalone | T: fcf1=40, g=0.05, n=10, r=0.10, gT=0.02; A: fcf1=300, g=0.04, n=10, r=0.10, gT=0.02 | `V_T = 602.6256194868424`, `V_A = 4245.471062688277` |
| S4 mean | xm=0.20, alpha=1.5, p=0.05, mu=0.08 | `paretoMean = 0.6`, `E[R] = 0.05` (tolerance 1e-12) |
| S5 Kelly | q=0.5, G=1.5, B=0.6 | `f* = 0.25`; `g(0.25) = 0.006211259999278587`; `g(1.0) = -0.05268025782891317`; ensemble `g_e(1.0) = 0.04879016416943205` |
| S5 lottery | q=0.05, G=20, B=0.7 | `f* = 0.11666666666666667` |

---

### Task 1: Python oracle — `scripts/dcf.py`

**Files:**
- Create: `finance/valuation/requirements.txt`
- Create: `finance/valuation/scripts/dcf.py`

**Interfaces:**
- Produces: `dcf(fcf1, g, n, r, g_t) -> dict(value, pv_explicit, pv_terminal, tv, terminal_share)`, `implied_growth(price, fcf1, n, r, g_t) -> float|None`, `kelly(q, G, B) -> float`, `time_avg_growth(f, q, G, B) -> float`, `simulate_paths(f, q, G, B, c, T, eps, n_paths, seed) -> np.ndarray[n_paths, T+1]`. The Rosetta panels in Task 9 copy these function bodies verbatim.

- [ ] **Step 1: Create requirements and the script**

`finance/valuation/requirements.txt`:
```
numpy
```

`finance/valuation/scripts/dcf.py`:
```python
"""Numeric oracle for finance/valuation/explore.html.

Prints the page's default readouts so the JS self-test can be checked
against an independent implementation. Also the Rosetta Stone source.
"""
import math
import numpy as np


def dcf(fcf1, g, n, r, g_t):
    """Discounted cash flow with a Gordon terminal value.

    fcf1: first-year cash; g: explicit growth; n: explicit years;
    r: discount rate; g_t: terminal growth (must be < r).
    """
    if g_t >= r:
        raise ValueError("terminal growth must be below the discount rate")
    pv_explicit = 0.0
    fcf = fcf1
    for t in range(1, n + 1):
        if t > 1:
            fcf *= 1 + g
        pv_explicit += fcf / (1 + r) ** t
    fcf_n = fcf1 * (1 + g) ** (n - 1)
    tv = fcf_n * (1 + g_t) / (r - g_t)
    pv_terminal = tv / (1 + r) ** n
    value = pv_explicit + pv_terminal
    return dict(value=value, pv_explicit=pv_explicit, pv_terminal=pv_terminal,
                tv=tv, terminal_share=pv_terminal / value)


def implied_growth(price, fcf1, n, r, g_t, lo=-0.20, hi=0.60, tol=1e-12):
    """Reverse DCF: the explicit growth rate at which dcf(...) == price.

    Value is monotone in g, so bisection is valid. Returns None when the
    price is outside [dcf(lo), dcf(hi)].
    """
    if price < dcf(fcf1, lo, n, r, g_t)["value"] or price > dcf(fcf1, hi, n, r, g_t)["value"]:
        return None
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if dcf(fcf1, mid, n, r, g_t)["value"] < price:
            lo = mid
        else:
            hi = mid
        if hi - lo < tol:
            break
    return 0.5 * (lo + hi)


def kelly(q, G, B):
    """Kelly fraction for a two-outcome multiplicative bet, clamped to [0, 1]."""
    a, b = G - 1.0, 1.0 - B
    return max(0.0, min(1.0, q / b - (1 - q) / a))


def time_avg_growth(f, q, G, B):
    """Per-period growth of log wealth when committing fraction f (no burn)."""
    return q * math.log(1 - f + f * G) + (1 - q) * math.log(1 - f + f * B)


def ensemble_growth(f, q, G, B):
    """Per-period growth of the ensemble-average wealth."""
    return math.log(1 - f + f * (q * G + (1 - q) * B))


def pareto_mean(xm, alpha):
    return math.inf if alpha <= 1 else xm * alpha / (alpha - 1)


def simulate_paths(f, q, G, B, c, T, eps, n_paths=200, seed=42):
    """Wealth paths W[t+1] = W[t]*(1 - f + f*M) - c, frozen at eps once ruined."""
    rng = np.random.default_rng(seed)
    W = np.ones((n_paths, T + 1))
    alive = np.ones(n_paths, dtype=bool)
    for t in range(T):
        M = np.where(rng.random(n_paths) < q, G, B)
        nxt = W[:, t] * (1 - f + f * M) - c
        ruined = nxt <= eps
        nxt = np.where(ruined, eps, nxt)
        alive &= ~ruined
        W[:, t + 1] = np.where(alive | ruined, nxt, eps)
    return W


def main():
    s1 = dcf(100, 0.08, 10, 0.10, 0.025)
    print("S1", {k: repr(v) for k, v in s1.items()})
    for r in (0.09, 0.10, 0.11):
        print("S1 grid r=%.2f" % r, ["%.4f" % dcf(100, 0.08, 10, r, gt)["value"] for gt in (0.02, 0.025, 0.03)])
    print("S2 implied_growth(V) =", repr(implied_growth(s1["value"], 100, 10, 0.10, 0.025)))
    print("S2 A =", repr(dcf(100 * 1.00, 0.08, 10, 0.09, 0.025)["value"]))
    print("S2 B =", repr(dcf(100 * 1.15, 0.10, 10, 0.11, 0.025)["value"]))
    print("S2 S =", repr(dcf(100, 0.08, 10, 0.12, 0.025)["value"]))
    print("S3 V_T =", repr(dcf(40, 0.05, 10, 0.10, 0.02)["value"]), "V_A =", repr(dcf(300, 0.04, 10, 0.10, 0.02)["value"]))
    print("S4 E[X] =", repr(pareto_mean(0.20, 1.5)), "E[R] =", repr(0.08 - 0.05 * pareto_mean(0.20, 1.5)))
    print("S5 kelly =", repr(kelly(0.5, 1.5, 0.6)), "g(0.25) =", repr(time_avg_growth(0.25, 0.5, 1.5, 0.6)),
          "g(1.0) =", repr(time_avg_growth(1.0, 0.5, 1.5, 0.6)), "g_ens(1.0) =", repr(ensemble_growth(1.0, 0.5, 1.5, 0.6)))
    print("S5 lottery kelly =", repr(kelly(0.05, 20, 0.7)))
    W = simulate_paths(1.0, 0.5, 1.5, 0.6, 0.0, 60, 0.05)
    print("S5 sim: median W_T = %.4f  mean W_T = %.4f  ruin = %.3f" % (
        np.median(W[:, -1]), W[:, -1].mean(), (W[:, -1] <= 0.05).mean()))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Set up the venv and run the oracle**

Run: `./build.sh setup finance/valuation && ./build.sh run finance/valuation scripts/dcf.py`
Expected: the S1 line shows `value` `'1891.4986279412533'` and `terminal_share` `'0.5568567895228378'`; S2 implied growth prints `0.0799999999999…`; S5 prints `kelly = 0.25`, `g(0.25) = 0.006211259999278587`, `g(1.0) = -0.05268025782891317`; the S5 sim line prints a median well below 1 and a mean well above 1 (exact values depend on numpy's generator and are not asserted).

- [ ] **Step 3: Commit**

```bash
git add finance/valuation/requirements.txt finance/valuation/scripts/dcf.py
git commit -m "Add valuation Python oracle and requirements"
```

---

### Task 2: Math module — `valuation.js` with a Node-runnable self-test

**Files:**
- Create: `finance/valuation/valuation.js`
- Test: run via `node -e` (no test framework)

**Interfaces:**
- Produces (all plain functions on the global scope in the browser, and on `module.exports` in Node):
  - `dcf({fcf1, g, n, r, gT}) -> {value, pvExplicit, pvTerminal, tv, terminalShare, flows: [{t, fcf, df, pv}]}`; throws `RangeError` if `gT >= r`.
  - `impliedGrowth({price, fcf1, n, r, gT, lo = -0.20, hi = 0.60}) -> {ok: boolean, g: number|null, lowValue, highValue}`
  - `mergerModel(inputs) -> outputs` (defined in full in Task 6; exported from this file so Node can test its invariant)
  - `paretoMean(xm, alpha) -> number` (`Infinity` when `alpha <= 1`)
  - `paretoSample(rng, xm, alpha) -> number`
  - `sampleReturns(rng, {mu, sigma, p, xm, alpha, n, thin}) -> Float64Array`
  - `runningMean(arr) -> Float64Array`
  - `kellyFraction(q, G, B) -> number in [0,1]`
  - `timeAverageGrowth(f, q, G, B) -> number`
  - `ensembleGrowth(f, q, G, B) -> number`
  - `simulatePaths({f, q, G, B, c, T, eps, nPaths, seed}) -> {paths: Float64Array[], ruinedBy: Uint8Array, meanPath: Float64Array, medianPath: Float64Array, ruinProb: number, medianFinal, meanFinal}`
  - `runSelfTest() -> {passed, total, failures: string[]}` and logs one line.
- Consumes: `seededRandom`, `normalRandom` from `shared/explore.js` in the browser. In Node the self-test defines a local `seededRandom` copy of mulberry32 so the module has no import.

- [ ] **Step 1: Write the self-test first (it will fail because nothing is defined)**

Create `finance/valuation/valuation.js` containing only the test harness and exports:

```js
/* finance/valuation/valuation.js — pure math for the valuation exploration.
   Loaded by explore.html via <script src>; require()-able from Node for tests. */

// ── Self-test ──────────────────────────────────────────────────
function runSelfTest() {
    const failures = [];
    let total = 0;
    const close = (name, got, want, tol = 1e-9) => {
        total++;
        const rel = Math.abs(got - want) / Math.max(1e-12, Math.abs(want));
        if (!(rel <= tol)) failures.push(`${name}: got ${got}, want ${want}`);
    };
    const S1 = dcf({ fcf1: 100, g: 0.08, n: 10, r: 0.10, gT: 0.025 });
    close('S1 value', S1.value, 1891.4986279412533);
    close('S1 pvExplicit', S1.pvExplicit, 838.2047745990345);
    close('S1 pvTerminal', S1.pvTerminal, 1053.2938533422189);
    close('S1 tv', S1.tv, 2731.972990376058);
    close('S1 terminalShare', S1.terminalShare, 0.5568567895228378);
    const rev = impliedGrowth({ price: S1.value, fcf1: 100, n: 10, r: 0.10, gT: 0.025 });
    total++; if (!rev.ok) failures.push('S2 reverse: not ok');
    close('S2 reverse g', rev.g, 0.08, 1e-6);
    close('S2 A', dcf({ fcf1: 100, g: 0.08, n: 10, r: 0.09, gT: 0.025 }).value, 2212.023170226492);
    close('S2 B', dcf({ fcf1: 115, g: 0.10, n: 10, r: 0.11, gT: 0.025 }).value, 2146.642472089947);
    close('S2 S', dcf({ fcf1: 100, g: 0.08, n: 10, r: 0.12, gT: 0.025 }).value, 1456.64839556544);
    close('S3 V_T', dcf({ fcf1: 40, g: 0.05, n: 10, r: 0.10, gT: 0.02 }).value, 602.6256194868424);
    close('S3 V_A', dcf({ fcf1: 300, g: 0.04, n: 10, r: 0.10, gT: 0.02 }).value, 4245.471062688277);
    const m = mergerModel(MERGER_DEFAULTS);
    const mStar = mergerModel({ ...MERGER_DEFAULTS, S: m.impliedSynergy });
    close('S3 implied synergy zeroes VC', mStar.valueCreated + 1, 1, 1e-9);
    close('S4 paretoMean', paretoMean(0.20, 1.5), 0.6, 1e-12);
    total++; if (paretoMean(0.20, 1.0) !== Infinity) failures.push('S4 paretoMean(alpha=1) should be Infinity');
    close('S5 kelly', kellyFraction(0.5, 1.5, 0.6), 0.25, 1e-12);
    close('S5 g(0.25)', timeAverageGrowth(0.25, 0.5, 1.5, 0.6), 0.006211259999278587);
    close('S5 g(1.0)', timeAverageGrowth(1.0, 0.5, 1.5, 0.6), -0.05268025782891317);
    close('S5 g_ens(1.0)', ensembleGrowth(1.0, 0.5, 1.5, 0.6), 0.04879016416943205);
    close('S5 lottery kelly', kellyFraction(0.05, 20, 0.7), 0.11666666666666667, 1e-12);
    const sim = simulatePaths({ f: 1.0, q: 0.5, G: 1.5, B: 0.6, c: 0, T: 60, eps: 0.05, nPaths: 200, seed: 42 });
    total++; if (!(sim.medianFinal < 1 && sim.meanFinal > 1)) failures.push(`S5 sim: median ${sim.medianFinal} should be < 1 < mean ${sim.meanFinal}`);
    total++; if (sim.paths.length !== 200 || sim.paths[0].length !== 61) failures.push('S5 sim: wrong shape');
    const passed = total - failures.length;
    console.log(`valuation selftest: ${passed}/${total} passed`);
    failures.forEach(f => console.error('  FAIL ' + f));
    return { passed, total, failures };
}

if (typeof module !== 'undefined') {
    module.exports = { dcf, impliedGrowth, mergerModel, MERGER_DEFAULTS, paretoMean, paretoSample,
        sampleReturns, runningMean, kellyFraction, timeAverageGrowth, ensembleGrowth,
        simulatePaths, runSelfTest, seededRandom, normalRandom };
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node -e "require('./finance/valuation/valuation.js').runSelfTest()"`
Expected: `ReferenceError: dcf is not defined` (the exports line evaluates before anything exists).

- [ ] **Step 3: Implement the functions above the self-test**

Insert this block at the top of `valuation.js`, before `runSelfTest`:

```js
// ── RNG (browser gets these from shared/explore.js; Node needs local copies) ──
if (typeof seededRandom === 'undefined') {
    var seededRandom = function (seed) {
        let s = seed | 0;
        return function () {
            s = (s + 0x6d2b79f5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    var normalRandom = function (rng, mean = 0, std = 1) {
        const u1 = rng(), u2 = rng();
        return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
}

// ── Sandbox 1: DCF ─────────────────────────────────────────────
function dcf({ fcf1, g, n, r, gT }) {
    if (gT >= r) throw new RangeError('terminal growth must be below the discount rate');
    const flows = [];
    let fcf = fcf1, pvExplicit = 0;
    for (let t = 1; t <= n; t++) {
        if (t > 1) fcf *= 1 + g;
        const df = Math.pow(1 + r, -t);
        const pv = fcf * df;
        pvExplicit += pv;
        flows.push({ t, fcf, df, pv });
    }
    const fcfN = fcf1 * Math.pow(1 + g, n - 1);
    const tv = fcfN * (1 + gT) / (r - gT);
    const pvTerminal = tv * Math.pow(1 + r, -n);
    const value = pvExplicit + pvTerminal;
    return { value, pvExplicit, pvTerminal, tv, terminalShare: pvTerminal / value, flows };
}

// ── Sandbox 2: reverse DCF ─────────────────────────────────────
function impliedGrowth({ price, fcf1, n, r, gT, lo = -0.20, hi = 0.60 }) {
    const lowValue = dcf({ fcf1, g: lo, n, r, gT }).value;
    const highValue = dcf({ fcf1, g: hi, n, r, gT }).value;
    if (price < lowValue || price > highValue) return { ok: false, g: null, lowValue, highValue };
    for (let i = 0; i < 200 && hi - lo > 1e-12; i++) {
        const mid = 0.5 * (lo + hi);
        if (dcf({ fcf1, g: mid, n, r, gT }).value < price) lo = mid; else hi = mid;
    }
    return { ok: true, g: 0.5 * (lo + hi), lowValue, highValue };
}

// ── Sandbox 3: merger model ────────────────────────────────────
const MERGER_DEFAULTS = {
    target:   { fcf1: 40,  g: 0.05, n: 10, gT: 0.02, shares: 50 },
    acquirer: { fcf1: 300, g: 0.04, n: 10, gT: 0.02, shares: 100, rE: 0.10 },
    offerPerShare: 14, S: 15, pS: 0.70, I: 30, feeRate: 0.02,
    debtShare: 0.3, stockShare: 0.3, interest: 0.06, taxRate: 0.25, pClose: 0.85,
};
const RAMP = [1 / 3, 2 / 3, 1];
function mergerModel(inp) {
    const { target: T, acquirer: A } = inp;
    const r0 = A.rE;
    const VT = dcf({ fcf1: T.fcf1, g: T.g, n: T.n, r: r0, gT: T.gT });
    const VA = dcf({ fcf1: A.fcf1, g: A.g, n: A.n, r: r0, gT: A.gT });
    const pricePaid = inp.offerPerShare * T.shares;
    const premium = pricePaid - VT.value;
    const fees = inp.feeRate * pricePaid;
    const debt = inp.debtShare * pricePaid;
    const E = VA.value + VT.value;
    const rC = (E * r0 + debt * inp.interest * (1 - inp.taxRate)) / (E + debt);
    let K = 0;
    const ramp = t => (t <= 3 ? RAMP[t - 1] : 1);
    for (let t = 1; t <= T.n; t++) K += ramp(t) * Math.pow(1 + rC, -t);
    const pvSyn = inp.pS * inp.S * K;
    const valueCreated = VT.value + pvSyn - inp.I - fees - pricePaid;
    const impliedSynergy = (pricePaid + inp.I + fees - VT.value) / (inp.pS * K);
    const acqPerShareBefore = VA.value / A.shares;
    const newShares = inp.stockShare * pricePaid / acqPerShareBefore;
    const equityAfter = VA.value + VT.value + pvSyn - inp.I - fees - (1 - inp.stockShare) * pricePaid;
    const acqPerShareAfter = equityAfter / (A.shares + newShares);
    const vcViaShares = acqPerShareAfter * A.shares - VA.value;
    const cashStrip = [];
    for (let t = 1; t <= T.n; t++) {
        const fa = A.fcf1 * Math.pow(1 + A.g, t - 1), ft = T.fcf1 * Math.pow(1 + T.g, t - 1);
        // cfTarget: does the acquired business cover its own integration cost and deal-debt service?
        const cfTarget = ft + inp.pS * inp.S * ramp(t) - (t === 1 ? inp.I : 0) - debt * inp.interest;
        cashStrip.push({ t, cf: fa + cfTarget, cfTarget, needsFinancing: cfTarget < 0 });
    }
    return { VT: VT.value, VA: VA.value, pricePaid, premium, fees, debt, rC, K, pvSyn,
        valueCreated, valueCreatedToday: inp.pClose * valueCreated / (1 + rC),
        impliedSynergy, acqPerShareBefore, acqPerShareAfter, newShares,
        wealthTransfer: vcViaShares - valueCreated, cashStrip };
}

// ── Sandbox 4: fat tails ───────────────────────────────────────
function paretoMean(xm, alpha) { return alpha <= 1 ? Infinity : xm * alpha / (alpha - 1); }
function paretoSample(rng, xm, alpha) { return xm * Math.pow(1 - rng(), -1 / alpha); }
function sampleReturns(rng, { mu, sigma, p, xm, alpha, n, thin }) {
    const out = new Float64Array(n);
    const constLoss = paretoMean(xm, alpha);
    for (let i = 0; i < n; i++) {
        const z = normalRandom(rng);
        const hit = rng() < p;
        const loss = hit ? (thin ? constLoss : paretoSample(rng, xm, alpha)) : 0;
        out[i] = mu + sigma * z - loss;
    }
    return out;
}
function runningMean(arr) {
    const out = new Float64Array(arr.length);
    let s = 0;
    for (let i = 0; i < arr.length; i++) { s += arr[i]; out[i] = s / (i + 1); }
    return out;
}

// ── Sandbox 5: ergodicity ──────────────────────────────────────
function kellyFraction(q, G, B) {
    const a = G - 1, b = 1 - B;
    return Math.max(0, Math.min(1, q / b - (1 - q) / a));
}
function timeAverageGrowth(f, q, G, B) {
    return q * Math.log(1 - f + f * G) + (1 - q) * Math.log(1 - f + f * B);
}
function ensembleGrowth(f, q, G, B) {
    return Math.log(1 - f + f * (q * G + (1 - q) * B));
}
function simulatePaths({ f, q, G, B, c, T, eps, nPaths = 200, seed = 42 }) {
    const rng = seededRandom(seed);
    const paths = [], ruinedBy = new Uint8Array(nPaths);
    for (let i = 0; i < nPaths; i++) {
        const w = new Float64Array(T + 1);
        w[0] = 1;
        let alive = true;
        for (let t = 0; t < T; t++) {
            if (!alive) { w[t + 1] = eps; continue; }
            const M = rng() < q ? G : B;
            let nxt = w[t] * (1 - f + f * M) - c;
            if (nxt <= eps) { nxt = eps; alive = false; ruinedBy[i] = 1; }
            w[t + 1] = nxt;
        }
        paths.push(w);
    }
    const meanPath = new Float64Array(T + 1), medianPath = new Float64Array(T + 1);
    const col = new Float64Array(nPaths);
    for (let t = 0; t <= T; t++) {
        let s = 0;
        for (let i = 0; i < nPaths; i++) { col[i] = paths[i][t]; s += col[i]; }
        meanPath[t] = s / nPaths;
        const sorted = Float64Array.from(col).sort();
        medianPath[t] = sorted[Math.floor(nPaths / 2)];
    }
    let ruined = 0; for (let i = 0; i < nPaths; i++) ruined += ruinedBy[i];
    return { paths, ruinedBy, meanPath, medianPath, ruinProb: ruined / nPaths,
        medianFinal: medianPath[T], meanFinal: meanPath[T] };
}
```

- [ ] **Step 4: Run the self-test and confirm it passes**

Run: `node -e "process.exitCode = require('./finance/valuation/valuation.js').runSelfTest().failures.length"`
Expected: prints `valuation selftest: 22/22 passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add finance/valuation/valuation.js
git commit -m "Add valuation math module with Node-runnable self-test"
```

---

### Task 3: Page skeleton, callout CSS, intro, notation panel, references

**Files:**
- Modify: `shared/explore.css` (append at end)
- Create: `finance/valuation/explore.html`

**Interfaces:**
- Produces: six empty `section.sandbox` elements with ids `sandbox1`…`sandbox6`, each containing `#chartN`, `#controlsN`, `#readoutN` (Sandbox 6 has only a body div `#rosetta6`). Tasks 4–9 fill `initSandboxN()` functions and their markup in place.
- Consumes: `valuation.js` from Task 2, `shared/explore.js`, `shared/explore.css`.

- [ ] **Step 1: Append callout styles to `shared/explore.css`**

```css
/* ── Callouts (valuation exploration) ─────────────────────── */
.callout {
    margin: 1rem 0;
    padding: 0.9rem 1.1rem;
    border-radius: 6px;
    border-left: 4px solid var(--color-border);
    background: var(--color-surface);
    font-size: 0.95rem;
    line-height: 1.55;
}
.callout .callout-tag {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.35rem;
    color: var(--color-text-muted);
}
.callout.take { border-left-color: var(--color-accent); background: var(--color-accent-light); }
.callout.take .callout-tag { color: var(--color-accent); }
.callout.siren { border-left-color: var(--color-highlight); background: #fffbeb; }
.callout.siren .callout-tag { color: #b45309; }
.callout.warn { border-left-color: var(--color-treatment); background: #fef2f2; }
.sens-grid { border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; margin-top: 0.5rem; }
.sens-grid th, .sens-grid td { padding: 0.3rem 0.6rem; border: 1px solid var(--color-border); text-align: right; }
.sens-grid th { background: var(--color-bg); font-weight: 600; }
.sens-grid td.base { background: var(--color-accent-light); font-weight: 700; }
.two-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 800px) { .two-charts { grid-template-columns: 1fr; } }
.preset-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.number-input { font-family: var(--font-mono); padding: 0.3rem 0.5rem; width: 8em; border: 1px solid var(--color-border); border-radius: 4px; }
```

- [ ] **Step 2: Create `finance/valuation/explore.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>What Is This Cash Stream Worth to Me?</title>

    <!-- KaTeX -->
    <link rel="stylesheet" href="../../shared/vendor/katex/katex.min.css">
    <script src="../../shared/vendor/katex/katex.min.js"></script>
    <script src="../../shared/vendor/katex/contrib/auto-render.min.js"></script>

    <!-- Plotly -->
    <script src="../../shared/vendor/plotly.min.js"></script>

    <!-- Shared styles and utilities -->
    <link rel="stylesheet" href="../../shared/explore.css">
    <script src="../../shared/explore.js"></script>

    <!-- Pure math for this page (also runnable under Node) -->
    <script src="valuation.js"></script>
</head>
<body>

<div class="exploration">

    <header>
        <h1>What Is This Cash Stream Worth to Me?</h1>
        <div class="subtitle">
            Discounted cash flow, whose number it is, and where the arithmetic stops being honest
        </div>
    </header>

    <section class="intro">
        <p>
            This page takes a position. A discounted cash flow model is not an alternative to
            subjective value theory; it is that theory's arithmetic. The arithmetic is one line.
            The assumptions are the entire content.
        </p>
        <div class="math-block">
            $$V = \sum_{t=1}^{N} \frac{FCF_t}{(1+r)^t} + \frac{TV}{(1+r)^N}, \qquad TV = \frac{FCF_N\,(1+g_T)}{r - g_T}$$
        </div>
        <p>
            Six sandboxes. The first shows what the machine computes and how much of the answer
            lives in one term. The second shows that three parties looking at the same company get
            three numbers, by construction. The third stacks a merger on top. The fourth shows why a
            risk premium estimated from history is a thin-tailed assumption. The fifth shows why a
            founder betting a single path needs a different average than the one the model
            computes. The sixth is the code.
        </p>
    </section>

    <details class="notation-ref">
        <summary>Notation Reference</summary>
        <div class="notation-content">
            <table>
                <thead><tr><th>Symbol</th><th>Name</th><th>Meaning</th></tr></thead>
                <tbody>
                    <tr><td class="notation-symbol">$FCF_t$</td><td>Free cash flow</td><td>Cash left in year $t$ after running the business and reinvesting enough to keep it running. What the owners could take out.</td></tr>
                    <tr><td class="notation-symbol">$r$</td><td>Discount rate</td><td>The annual return you require for tying up money in something this risky. Time preference plus a risk premium. The time part is anchored to an observed price; the risk part is a judgment.</td></tr>
                    <tr><td class="notation-symbol">$g_e$, $g_T$</td><td>Growth rates</td><td>Explicit-period growth for years $1..N$, and the perpetual growth assumed forever after. $g_T$ must stay below $r$ or the terminal value diverges.</td></tr>
                    <tr><td class="notation-symbol">$DF_t = (1+r)^{-t}$</td><td>Discount factor</td><td>The geometric kernel. $r$ plays the role of a decay constant.</td></tr>
                    <tr><td class="notation-symbol">$TV$</td><td>Terminal value</td><td>One lump standing in for every year after $N$. Closed form of a geometric series with ratio $(1+g_T)/(1+r)$.</td></tr>
                    <tr><td class="notation-symbol">ZOPA</td><td>Zone of possible agreement</td><td>Prices between the seller's minimum and the highest buyer's maximum. A deal lands somewhere inside it; where is negotiation, not valuation.</td></tr>
                    <tr><td class="notation-symbol">$S$, $p_s$, $p_c$</td><td>Merger terms</td><td>Annual run-rate synergy, probability it is realized, probability the deal closes at all.</td></tr>
                    <tr><td class="notation-symbol">$\alpha$, $x_m$</td><td>Pareto tail</td><td>Tail exponent and scale. Mean exists only for $\alpha > 1$, variance only for $\alpha > 2$.</td></tr>
                    <tr><td class="notation-symbol">$\bar{R}_n$</td><td>Running mean</td><td>Sample mean after $n$ draws. With finite variance its error falls like $n^{-1/2}$. For $1 < \alpha < 2$ it falls like $n^{1/\alpha - 1}$, whose exponent goes to zero as $\alpha \to 1$. At $\alpha \le 1$ there is nothing to converge to.</td></tr>
                    <tr><td class="notation-symbol">$f$, $G$, $B$, $q$</td><td>The bet</td><td>Fraction of wealth committed; multiplier on a good period; multiplier on a bad period; probability of a good period.</td></tr>
                    <tr><td class="notation-symbol">$g(f)$, $f^*$</td><td>Time-average growth, Kelly fraction</td><td>Growth rate of $\ln W$ along one path as a function of $f$; the $f$ that maximizes it. The ensemble mean grows at a different, higher rate that no single path experiences.</td></tr>
                    <tr><td class="notation-symbol">$\varepsilon$, $c$</td><td>Ruin barrier, burn</td><td>Wealth level below which the path stops; fixed per-period drain on wealth. Ruin is absorbing, which is what makes the process non-ergodic.</td></tr>
                </tbody>
            </table>
        </div>
    </details>

    <!-- SANDBOX 1 -->
    <section class="sandbox" id="sandbox1">
        <h2>Sandbox 1: The Machine</h2>
        <div class="description"><p>Filled in Task 4.</p></div>
        <div class="sandbox-content">
            <div class="chart-container" id="chart1"></div>
            <div class="controls" id="controls1"></div>
        </div>
        <div class="readout" id="readout1"></div>
    </section>

    <!-- SANDBOX 2 -->
    <section class="sandbox" id="sandbox2">
        <h2>Sandbox 2: Whose Number Is It?</h2>
        <div class="description"><p>Filled in Task 5.</p></div>
        <div class="sandbox-content">
            <div class="chart-container" id="chart2"></div>
            <div class="controls" id="controls2"></div>
        </div>
        <div class="readout" id="readout2"></div>
    </section>

    <!-- SANDBOX 3 -->
    <section class="sandbox" id="sandbox3">
        <h2>Sandbox 3: After the Deal</h2>
        <div class="description"><p>Filled in Task 6.</p></div>
        <div class="sandbox-content">
            <div class="chart-container" id="chart3"></div>
            <div class="controls" id="controls3"></div>
        </div>
        <div class="readout" id="readout3"></div>
    </section>

    <!-- SANDBOX 4 -->
    <section class="sandbox" id="sandbox4">
        <h2>Sandbox 4: The Premium That Can't Be Estimated</h2>
        <div class="description"><p>Filled in Task 7.</p></div>
        <div class="sandbox-content">
            <div class="chart-container" id="chart4"></div>
            <div class="controls" id="controls4"></div>
        </div>
        <div class="readout" id="readout4"></div>
    </section>

    <!-- SANDBOX 5 -->
    <section class="sandbox" id="sandbox5">
        <h2>Sandbox 5: One Path, Not an Ensemble: The Founder's Bet</h2>
        <div class="description"><p>Filled in Task 8.</p></div>
        <div class="sandbox-content">
            <div class="chart-container" id="chart5"></div>
            <div class="controls" id="controls5"></div>
        </div>
        <div class="readout" id="readout5"></div>
    </section>

    <!-- SANDBOX 6 -->
    <section class="sandbox" id="sandbox6">
        <h2>Sandbox 6: The Code: Python and Spreadsheet Side by Side</h2>
        <div class="description"><p>Filled in Task 9.</p></div>
        <div id="rosetta6"></div>
    </section>

    <section class="intro" id="references">
        <h2>References</h2>
        <ul>
            <li>Nate B Jones, <em>Claude Fable 5.1: Not Just Code. It Made Me A Film, 7 Sheets And 13 Slides</em> (video, 2026). <a href="https://youtu.be/55rDzRkUVdE">youtu.be/55rDzRkUVdE</a>. The post-acquisition workbook exercise that started this page.</li>
            <li>Eugen von Böhm-Bawerk, <em>Capital and Interest</em>; Irving Fisher, <em>The Theory of Interest</em> (1930). Time preference as the origin of interest, and present value as its arithmetic.</li>
            <li>Alfred Rappaport and Michael Mauboussin, <em>Expectations Investing</em>. Reverse DCF: read the price, back out what it requires, judge that.</li>
            <li>Nassim Nicholas Taleb, <em>Statistical Consequences of Fat Tails</em> (2020). Why sample means of fat-tailed variables do not settle.</li>
            <li>Ole Peters, "The ergodicity problem in economics," <em>Nature Physics</em> 15 (2019). Ensemble average versus time average for multiplicative wealth.</li>
            <li>J. L. Kelly Jr., "A New Interpretation of Information Rate" (1956). The growth-optimal fraction.</li>
        </ul>
    </section>

</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    runSelfTest();
    renderAllMath();
    // initSandbox1() … initSandbox6() are appended by Tasks 4–9.
});

// ── Formatting helpers used by every sandbox ────────────────
const fmtMoney = v => v.toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtPct = v => (v * 100).toFixed(1) + '%';
const fmtPct2 = v => (v * 100).toFixed(2) + '%';
const debounce = (fn, ms = 50) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
function callout(kind, tag, html) {
    return `<div class="callout ${kind}"><div class="callout-tag">${tag}</div>${html}</div>`;
}
</script>
</body>
</html>
```

- [ ] **Step 3: Serve and check**

Run: `./serve.sh` (or `python3 -m http.server 8080`), open `http://localhost:8080/finance/valuation/explore.html` in Brave, open the console.
Expected: header, intro with the rendered formula, notation table with rendered symbols, six empty sandbox sections, references; console shows `valuation selftest: 22/22 passed`; no errors.

- [ ] **Step 4: Commit**

```bash
git add shared/explore.css finance/valuation/explore.html
git commit -m "Add valuation page skeleton, notation panel, and callout styles"
```

---

### Task 4: Sandbox 1 — The Machine

**Files:**
- Modify: `finance/valuation/explore.html` (replace the Sandbox 1 description; append `initSandbox1` to the script; add the call in `DOMContentLoaded`)

**Interfaces:**
- Consumes: `dcf(...)` from `valuation.js`; `createSlider`, `createButton`, `plotlyDefaults`, `renderAllMath` from `shared/explore.js`; `fmtMoney`, `fmtPct`, `callout`, `debounce` from Task 3.
- Produces: `initSandbox1()`; the constant `S1_DEFAULTS = { fcf1: 100, g: 0.08, n: 10, r: 0.10, gT: 0.025 }` which Sandbox 2 reuses.

- [ ] **Step 1: Replace the Sandbox 1 description**

```html
<div class="description">
    <p>
        A business is treated as a machine that emits cash to its owners. Each year's cash is
        shrunk by $(1+r)^{-t}$, and everything after year $N$ is folded into one terminal lump.
        Drag $r$ and $g_T$ and watch which bar does the work.
    </p>
</div>
<div class="sandbox-content">
    <div>
        <div class="chart-container" id="chart1"></div>
        <div class="chart-container" id="chart1b" style="min-height:120px"></div>
    </div>
    <div class="controls" id="controls1"></div>
</div>
```
(Replace the existing `.sandbox-content` block in Sandbox 1 with the one above so the two charts stack in the left column.)

- [ ] **Step 2: Append `initSandbox1` to the page script**

```js
// ── SANDBOX 1 ───────────────────────────────────────────────
const S1_DEFAULTS = { fcf1: 100, g: 0.08, n: 10, r: 0.10, gT: 0.025 };

function initSandbox1() {
    const controls = document.getElementById('controls1');
    const state = { ...S1_DEFAULTS };
    let gTSlider;

    const update = debounce(() => {
        // Guard: keep gT at least 0.5 points below r, and say so.
        let clamped = false;
        if (state.gT > state.r - 0.005) { state.gT = state.r - 0.005; clamped = true; }
        if (gTSlider) { gTSlider.value = state.gT; gTSlider.nextElementSibling.textContent = fmtPct(state.gT); }
        const res = dcf(state);
        drawS1(res, state);
        renderS1Readout(res, state, clamped);
    });

    createSlider(controls, { label: 'Explicit growth g', id: 's1-g', min: 0, max: 0.30, step: 0.005, value: state.g, format: fmtPct, onChange: v => { state.g = v; update(); } });
    createSlider(controls, { label: 'Explicit years N', id: 's1-n', min: 3, max: 15, step: 1, value: state.n, onChange: v => { state.n = v; update(); } });
    createSlider(controls, { label: 'Discount rate r', id: 's1-r', min: 0.03, max: 0.30, step: 0.005, value: state.r, format: fmtPct, onChange: v => { state.r = v; update(); } });
    gTSlider = createSlider(controls, { label: 'Terminal growth g_T', id: 's1-gt', min: 0, max: 0.06, step: 0.0025, value: state.gT, format: fmtPct, onChange: v => { state.gT = v; update(); } });
    createButton(controls, { label: 'Reset', onClick: () => { Object.assign(state, S1_DEFAULTS); ['s1-g','s1-n','s1-r','s1-gt'].forEach((id, i) => { const el = document.getElementById(id); el.value = [state.g, state.n, state.r, state.gT][i]; el.dispatchEvent(new Event('input')); }); } });

    update();
}

function drawS1(res, state) {
    const years = res.flows.map(f => f.t);
    const traces = [
        { type: 'bar', name: 'Nominal cash', x: years, y: res.flows.map(f => f.fcf), marker: { color: '#cbd5e1' } },
        { type: 'bar', name: 'Present value', x: years, y: res.flows.map(f => f.pv), marker: { color: '#2563eb' } },
        { type: 'bar', name: 'PV of terminal value', x: ['TV'], y: [res.pvTerminal], marker: { color: '#f59e0b' } },
    ];
    Plotly.react('chart1', traces, plotlyDefaults({
        barmode: 'group', xaxis: { title: 'Year', type: 'category' }, yaxis: { title: 'Cash' },
        legend: { orientation: 'h', y: 1.12 },
    }), { responsive: true, displayModeBar: false });

    Plotly.react('chart1b', [
        { type: 'bar', orientation: 'h', name: 'Explicit years', x: [res.pvExplicit / res.value], y: ['share of V'], marker: { color: '#2563eb' }, text: fmtPct(res.pvExplicit / res.value), textposition: 'inside' },
        { type: 'bar', orientation: 'h', name: 'Terminal value', x: [res.terminalShare], y: ['share of V'], marker: { color: '#f59e0b' }, text: fmtPct(res.terminalShare), textposition: 'inside' },
    ], plotlyDefaults({ barmode: 'stack', margin: { t: 10, b: 30, l: 80, r: 20 }, xaxis: { range: [0, 1], tickformat: '.0%' }, showlegend: false }), { responsive: true, displayModeBar: false });
}

function renderS1Readout(res, state, clamped) {
    const rs = [state.r - 0.01, state.r, state.r + 0.01];
    const gs = [state.gT - 0.005, state.gT, state.gT + 0.005];
    let grid = '<table class="sens-grid"><tr><th>V</th>' + gs.map(g => `<th>g_T ${fmtPct(g)}</th>`).join('') + '</tr>';
    for (const r of rs) {
        grid += `<tr><th>r ${fmtPct(r)}</th>`;
        for (const g of gs) {
            const ok = g < r - 0.001;
            const v = ok ? fmtMoney(dcf({ ...state, r, gT: g }).value) : '—';
            grid += `<td class="${r === state.r && g === state.gT ? 'base' : ''}">${v}</td>`;
        }
        grid += '</tr>';
    }
    grid += '</table>';
    const warn = clamped ? `<div class="callout warn"><div class="callout-tag">Clamped</div>$g_T$ was pulled down to ${fmtPct(state.gT)} to stay below $r$. At $g_T \\to r$ the terminal value diverges: the geometric series has ratio $(1+g_T)/(1+r) \\to 1$.</div>` : '';
    document.getElementById('readout1').innerHTML = `
        ${warn}
        <p><strong>Value</strong> <span class="estimate">${fmtMoney(res.value)}</span>
        &nbsp;·&nbsp; explicit years ${fmtMoney(res.pvExplicit)} &nbsp;·&nbsp; terminal lump ${fmtMoney(res.pvTerminal)}
        &nbsp;·&nbsp; <strong>terminal share ${fmtPct(res.terminalShare)}</strong></p>
        <p>Sensitivity of $V$ to one point of $r$ and half a point of $g_T$:</p>
        ${grid}
        ${callout('take', 'Your take', `At the defaults the terminal lump is over half the value. Most of "the value" is two parameters, $r$ and $g_T$, applied to a year-$N$ number that is itself a forecast. Move $r$ by one point and watch the total move by more than the entire first three years of cash.`)}
    `;
    renderAllMath();
}
```

Add `initSandbox1();` after `renderAllMath();` in the `DOMContentLoaded` handler.

- [ ] **Step 3: Check in the browser**

Reload the page. Expected: bars for 10 years plus a TV bar; the stacked share bar reads about 44% / 56% at defaults; readout shows `1,891.5` and the 3×3 grid with the center cell highlighted and matching the S1 grid table above; dragging `g_T` above `r − 0.5pt` shows the red clamp box; Reset restores defaults; no console errors.

- [ ] **Step 4: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 1: the DCF machine and terminal-value share"
```

---

### Task 5: Sandbox 2 — Whose Number Is It?

**Files:**
- Modify: `finance/valuation/explore.html` (Sandbox 2 description + markup; append `initSandbox2`; add the call)

**Interfaces:**
- Consumes: `dcf`, `impliedGrowth` from `valuation.js`; `S1_DEFAULTS` from Task 4; shared helpers.
- Produces: `initSandbox2()`.

- [ ] **Step 1: Replace the Sandbox 2 description and markup**

```html
<div class="description">
    <p>
        Same company as Sandbox 1, at its default numbers. A financial buyer, a strategic buyer,
        and the seller each run a DCF with their own required return, their own forecast, and
        their own synergies. Three numbers. Then the honest use: type a price and ask what growth it
        requires.
    </p>
</div>
<div class="sandbox-content">
    <div class="chart-container" id="chart2"></div>
    <div class="controls" id="controls2"></div>
</div>
<div class="readout" id="readout2"></div>
<div class="readout" id="reverse2">
    <p><strong>Reverse DCF.</strong> Hold $N$, $r$, $g_T$ at Sandbox 1's defaults. Enter a price:</p>
    <p><input class="number-input" id="s2-price" type="number" step="10" value="1891.5">
       <button id="s2-solve">What must be true?</button></p>
    <div id="reverse2-out"></div>
</div>
```

- [ ] **Step 2: Append `initSandbox2`**

```js
// ── SANDBOX 2 ───────────────────────────────────────────────
function initSandbox2() {
    const controls = document.getElementById('controls2');
    const base = S1_DEFAULTS;
    const st = { A: { r: 0.09, g: 0.08, s: 0.00 }, B: { r: 0.11, g: 0.10, s: 0.15 }, rS: 0.12, price: null };
    let priceSlider;

    const values = () => ({
        A: dcf({ fcf1: base.fcf1 * (1 + st.A.s), g: st.A.g, n: base.n, r: st.A.r, gT: base.gT }).value,
        B: dcf({ fcf1: base.fcf1 * (1 + st.B.s), g: st.B.g, n: base.n, r: st.B.r, gT: base.gT }).value,
        S: dcf({ fcf1: base.fcf1, g: base.g, n: base.n, r: st.rS, gT: base.gT }).value,
    });

    const update = debounce(() => {
        const v = values();
        const top = Math.max(v.A, v.B);
        const deal = top > v.S;
        if (deal) {
            priceSlider.min = v.S; priceSlider.max = top; priceSlider.step = (top - v.S) / 200;
            if (st.price === null || st.price < v.S || st.price > top) st.price = 0.5 * (v.S + top);
            priceSlider.value = st.price;
            priceSlider.nextElementSibling.textContent = fmtMoney(st.price);
        }
        drawS2(v, st, deal);
        renderS2Readout(v, st, deal);
    });

    const pct = (label, id, obj, key, min, max) => createSlider(controls, { label, id, min, max, step: 0.005, value: obj[key], format: fmtPct, onChange: x => { obj[key] = x; update(); } });
    pct('Buyer A: required return r', 's2-ra', st.A, 'r', 0.03, 0.30);
    pct('Buyer A: growth forecast g', 's2-ga', st.A, 'g', 0, 0.30);
    pct('Buyer A: synergy uplift', 's2-sa', st.A, 's', 0, 0.40);
    pct('Buyer B: required return r', 's2-rb', st.B, 'r', 0.03, 0.30);
    pct('Buyer B: growth forecast g', 's2-gb', st.B, 'g', 0, 0.30);
    pct('Buyer B: synergy uplift', 's2-sb', st.B, 's', 0, 0.40);
    pct("Seller: alternative return r", 's2-rs', st, 'rS', 0.03, 0.30);
    priceSlider = createSlider(controls, { label: 'Deal price (inside the zone)', id: 's2-price-slider', min: 0, max: 1, step: 1, value: 0, format: fmtMoney, onChange: x => { st.price = x; update(); } });

    document.getElementById('s2-solve').addEventListener('click', () => {
        const price = parseFloat(document.getElementById('s2-price').value);
        const res = impliedGrowth({ price, fcf1: base.fcf1, n: base.n, r: base.r, gT: base.gT });
        const out = document.getElementById('reverse2-out');
        if (!res.ok) {
            out.innerHTML = `<p>No growth rate between −20% and +60% reaches ${fmtMoney(price)}. At those bounds the model gives ${fmtMoney(res.lowValue)} and ${fmtMoney(res.highValue)}. The price is outside what this forecast shape can produce; the model is not the thing to adjust.</p>`;
        } else {
            out.innerHTML = `<p>For <strong>${fmtMoney(price)}</strong> to be right, cash must grow at
                <span class="estimate">${fmtPct2(res.g)}</span> per year for ${base.n} years, then ${fmtPct(base.gT)} forever,
                with ${fmtPct(base.r)} as your required return.</p>
                ${callout('siren', 'Siren check', `That is a claim about the world, not about the spreadsheet. Do you believe this business grows at ${fmtPct(res.g)} for a decade? Compare it to what you have seen, not to what sounds reasonable in the room.`)}`;
        }
        renderAllMath();
    });

    update();
}

function drawS2(v, st, deal) {
    const names = ['Seller minimum', 'Buyer A maximum', 'Buyer B maximum'];
    const vals = [v.S, v.A, v.B];
    const shapes = [], annotations = [];
    if (deal) {
        const top = Math.max(v.A, v.B);
        shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: v.S, x1: top, y0: 0, y1: 1, fillcolor: 'rgba(37,99,235,0.08)', line: { width: 0 } });
        shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: st.price, x1: st.price, y0: 0, y1: 1, line: { color: '#16a34a', width: 2, dash: 'dash' } });
        annotations.push({ x: st.price, y: 1.02, xref: 'x', yref: 'paper', text: 'price', showarrow: false, font: { color: '#16a34a' } });
    }
    Plotly.react('chart2', [{ type: 'bar', orientation: 'h', x: vals, y: names, marker: { color: ['#dc2626', '#2563eb', '#7c3aed'] }, text: vals.map(fmtMoney), textposition: 'outside' }],
        plotlyDefaults({ showlegend: false, shapes, annotations, xaxis: { title: 'Value of the same company, to each party' }, margin: { l: 130, t: 30 } }),
        { responsive: true, displayModeBar: false });
}

function renderS2Readout(v, st, deal) {
    const top = Math.max(v.A, v.B), best = v.A >= v.B ? 'A' : 'B';
    let body;
    if (!deal) {
        body = `<p><strong>No deal.</strong> Neither buyer's maximum (${fmtMoney(v.A)}, ${fmtMoney(v.B)}) exceeds the seller's minimum (${fmtMoney(v.S)}). No price makes both sides better off than their alternatives.</p>`;
    } else {
        const bs = top - st.price, ss = st.price - v.S;
        body = `<p>Zone of possible agreement: <strong>${fmtMoney(v.S)}</strong> to <strong>${fmtMoney(top)}</strong>.
            At price ${fmtMoney(st.price)}, Buyer ${best} keeps ${fmtMoney(bs)} of surplus and the seller keeps ${fmtMoney(ss)}.
            Where inside the zone the price lands is negotiation, not valuation.</p>`;
    }
    const note = v.A > v.B ? `<p>Note the default result: the strategic buyer's 15% synergy and two extra points of growth <em>lose</em> to the financial buyer's two points of cheaper capital. The exponent beats the numerator.</p>` : '';
    document.getElementById('readout2').innerHTML = body + note +
        callout('take', 'Your take', 'Same asset, three numbers, by construction. Each party discounts at their own alternative return and forecasts what they would do with the business. The DCF is not opposed to marginal-utility value theory. It is that theory\'s arithmetic, and the transaction happens only where the buyer\'s number exceeds the seller\'s: gains from trade, nothing more mystical.');
    renderAllMath();
}
```

Add `initSandbox2();` to the `DOMContentLoaded` handler.

- [ ] **Step 3: Check in the browser**

Expected at defaults: bars 1,456.6 / 2,212.0 / 2,146.6 with the zone shaded from 1,456.6 to 2,212.0 and a dashed price line at the midpoint; readout shows the surplus split and the "exponent beats the numerator" note; raising the seller's return to 30% with buyers at 3% still shows a deal; setting both buyers' r to 30% shows the no-deal state. Reverse DCF with 1891.5 returns 8.00%; with 50000 returns the out-of-range message.

- [ ] **Step 4: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 2: three parties, the zone of agreement, and reverse DCF"
```

---

### Task 6: Sandbox 3 — After the Deal

**Files:**
- Modify: `finance/valuation/explore.html` (Sandbox 3 description + markup; append `initSandbox3`; add the call)

**Interfaces:**
- Consumes: `mergerModel`, `MERGER_DEFAULTS` from `valuation.js`; shared helpers.
- Produces: `initSandbox3()`.

**Refinement over the spec:** the per-year cash strip shows the acquired business's own coverage, `FCF^T_t + p_s S\,\text{ramp}_t - I[t=1] - D\,i`, rather than the combined total. With the acquirer's 300 per year included the flag could never fire; scoped to the target it answers "does the acquired business pay for its own deal?", which is what the flag was for.

- [ ] **Step 1: Replace the Sandbox 3 description and markup**

```html
<div class="description">
    <p>
        Two standalone DCFs, then the merger layer: synergies that ramp in, a one-time integration
        cost, fees, an offer price, a financing mix that moves the discount rate and the share count,
        and the probability the deal closes at all. Synthetic numbers shaped like the video's exercise.
    </p>
</div>
<div class="sandbox-content">
    <div>
        <div class="chart-container" id="chart3"></div>
        <div class="chart-container" id="chart3b" style="min-height:200px"></div>
    </div>
    <div class="controls" id="controls3"></div>
</div>
<div class="readout" id="readout3"></div>
```

- [ ] **Step 2: Append `initSandbox3`**

```js
// ── SANDBOX 3 ───────────────────────────────────────────────
function initSandbox3() {
    const controls = document.getElementById('controls3');
    const st = JSON.parse(JSON.stringify(MERGER_DEFAULTS));
    const standalonePerShare = mergerModel(st).VT / st.target.shares;
    let debtSlider, stockSlider;

    const update = debounce(() => {
        // Guard: debt + stock ≤ 1; the slider that did not move gives way.
        if (st.debtShare + st.stockShare > 1) {
            if (st._last === 'debt') st.stockShare = 1 - st.debtShare; else st.debtShare = 1 - st.stockShare;
            debtSlider.value = st.debtShare; debtSlider.nextElementSibling.textContent = fmtPct(st.debtShare);
            stockSlider.value = st.stockShare; stockSlider.nextElementSibling.textContent = fmtPct(st.stockShare);
        }
        const m = mergerModel(st);
        drawS3(m, st);
        renderS3Readout(m, st);
    });

    createSlider(controls, { label: 'Offer price per target share', id: 's3-p', min: +(0.5 * standalonePerShare).toFixed(2), max: +(2 * standalonePerShare).toFixed(2), step: 0.25, value: st.offerPerShare, format: v => v.toFixed(2), onChange: v => { st.offerPerShare = v; update(); } });
    createSlider(controls, { label: 'Annual synergy S (run-rate)', id: 's3-s', min: 0, max: 40, step: 0.5, value: st.S, onChange: v => { st.S = v; update(); } });
    createSlider(controls, { label: 'Synergy realization p_s', id: 's3-ps', min: 0, max: 1, step: 0.05, value: st.pS, format: fmtPct, onChange: v => { st.pS = v; update(); } });
    createSlider(controls, { label: 'Integration cost I (year 1)', id: 's3-i', min: 0, max: 60, step: 1, value: st.I, onChange: v => { st.I = v; update(); } });
    debtSlider = createSlider(controls, { label: 'Financing: debt share', id: 's3-d', min: 0, max: 1, step: 0.05, value: st.debtShare, format: fmtPct, onChange: v => { st.debtShare = v; st._last = 'debt'; update(); } });
    stockSlider = createSlider(controls, { label: 'Financing: stock share (rest is cash)', id: 's3-st', min: 0, max: 1, step: 0.05, value: st.stockShare, format: fmtPct, onChange: v => { st.stockShare = v; st._last = 'stock'; update(); } });
    createSlider(controls, { label: 'Interest on deal debt', id: 's3-int', min: 0.03, max: 0.12, step: 0.005, value: st.interest, format: fmtPct, onChange: v => { st.interest = v; update(); } });
    createSlider(controls, { label: 'Close probability p_c', id: 's3-pc', min: 0.5, max: 1, step: 0.05, value: st.pClose, format: fmtPct, onChange: v => { st.pClose = v; update(); } });

    update();
}

function drawS3(m, st) {
    Plotly.react('chart3', [{
        type: 'waterfall', orientation: 'v',
        measure: ['absolute', 'relative', 'relative', 'relative', 'relative', 'total'],
        x: ['Target standalone', '+ PV synergies', '− integration', '− fees', '− price paid', 'Value created'],
        y: [m.VT, m.pvSyn, -st.I, -m.fees, -m.pricePaid, 0],
        text: [m.VT, m.pvSyn, -st.I, -m.fees, -m.pricePaid, m.valueCreated].map(fmtMoney), textposition: 'outside',
        increasing: { marker: { color: '#16a34a' } }, decreasing: { marker: { color: '#dc2626' } }, totals: { marker: { color: m.valueCreated >= 0 ? '#2563eb' : '#dc2626' } },
        connector: { line: { color: '#cbd5e1' } },
    }], plotlyDefaults({ showlegend: false, yaxis: { title: 'Value to the acquirer\'s owners' }, margin: { b: 80 } }), { responsive: true, displayModeBar: false });

    Plotly.react('chart3b', [{
        type: 'bar', x: m.cashStrip.map(c => c.t), y: m.cashStrip.map(c => c.cfTarget),
        marker: { color: m.cashStrip.map(c => c.needsFinancing ? '#dc2626' : '#2563eb') },
        text: m.cashStrip.map(c => c.needsFinancing ? 'needs financing' : ''), textposition: 'outside',
    }], plotlyDefaults({ showlegend: false, xaxis: { title: 'Year', dtick: 1 }, yaxis: { title: 'Acquired business: cash after deal costs' }, margin: { t: 10 } }), { responsive: true, displayModeBar: false });
}

function renderS3Readout(m, st) {
    const flagged = m.cashStrip.filter(c => c.needsFinancing).map(c => c.t);
    document.getElementById('readout3').innerHTML = `
        <p><strong>Standalone:</strong> target ${fmtMoney(m.VT)} (${(m.VT / st.target.shares).toFixed(2)}/share), acquirer ${fmtMoney(m.VA)} (${m.acqPerShareBefore.toFixed(2)}/share).
           Offer ${st.offerPerShare.toFixed(2)}/share = ${fmtMoney(m.pricePaid)} paid, a premium of ${fmtMoney(m.premium)} (${fmtPct(m.premium / m.VT)}).</p>
        <p><strong>Value created for the acquirer's owners:</strong> <span class="estimate ${m.valueCreated >= 0 ? 'correct' : 'wrong'}">${fmtMoney(m.valueCreated)}</span> at close;
           <strong>${fmtMoney(m.valueCreatedToday)}</strong> today after weighting by the ${fmtPct(st.pClose)} chance it closes and discounting one year at the blended rate ${fmtPct2(m.rC)}.</p>
        <p><strong>Per share:</strong> acquirer ${m.acqPerShareBefore.toFixed(2)} before, ${m.acqPerShareAfter.toFixed(2)} after, with ${fmtMoney(m.newShares)} new shares issued.
           ${Math.abs(m.wealthTransfer) > 0.01 ? `The per-share route gives value created of ${fmtMoney(m.valueCreated + m.wealthTransfer)}, which differs from the waterfall by ${fmtMoney(m.wealthTransfer)}: that gap is the wealth transfer from issuing stock at the standalone price rather than the post-deal price. It is labeled here rather than hidden.` : 'With no stock issued the per-share route and the waterfall agree exactly.'}</p>
        <p><strong>Financing:</strong> ${flagged.length ? `the acquired business does not cover its own integration cost and deal-debt service in year${flagged.length > 1 ? 's' : ''} ${flagged.join(', ')}. Someone raises money or the plan changes.` : 'the acquired business covers its own integration cost and deal-debt service every year.'}</p>
        ${callout('siren', 'Siren check', `This offer needs <strong>${fmtMoney(m.impliedSynergy)}</strong> per year of realized synergy to break even, against a target that generates ${fmtMoney(st.target.fcf1)} in its first year. Has anyone in this industry ever realized that? The synergy line is the free parameter that fits any premium.`)}
        ${callout('take', 'Your take', 'The standalone DCF approximates value-to-anyone. The synergy term is value-to-this-buyer, and it is different for every bidder because each brings different overlap, distribution, and financing. Same asset, different buyers, different numbers, by construction. This is your marginal-utility point made literal.')}
    `;
    renderAllMath();
}
```

Add `initSandbox3();` to the `DOMContentLoaded` handler.

- [ ] **Step 3: Check in the browser**

At defaults: waterfall starts at 602.6, ends at about −85 in red (the acquirer overpays at the default offer, which is the honest default); implied synergy reads about 38 per year against a target producing 40; the strip's year 1 sits near zero and turns red when integration cost is raised to 45 or debt share to 60%; pushing the debt slider to 90% pulls the stock slider down automatically; per-share paragraph shows the wealth-transfer sentence whenever stock share is above zero.

- [ ] **Step 4: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 3: the post-acquisition layer, waterfall, and implied synergy"
```

---

### Task 7: Sandbox 4 — The Premium That Can't Be Estimated

**Files:**
- Modify: `finance/valuation/explore.html` (Sandbox 4 description + markup; append `initSandbox4`; add the call)

**Interfaces:**
- Consumes: `sampleReturns`, `runningMean`, `paretoMean` from `valuation.js`; `seededRandom` from `shared/explore.js`; shared helpers.
- Produces: `initSandbox4()`.

- [ ] **Step 1: Replace the Sandbox 4 description and markup**

```html
<div class="description">
    <p>
        A risk premium is calibrated from a historical sample mean. Here each period's return is a
        normal draw minus a loss that arrives with probability $p$. On the left the loss, when it
        comes, is a fixed size. On the right it is Pareto with tail exponent $\alpha$. Both regimes
        have the <em>same true mean</em>. Only the tail differs. Watch which one settles.
    </p>
</div>
<div class="sandbox-content">
    <div>
        <div class="chart-container" id="chart4"></div>
        <div class="chart-container" id="chart4b" style="min-height:260px"></div>
    </div>
    <div class="controls" id="controls4"></div>
</div>
<div class="readout" id="readout4"></div>
```

- [ ] **Step 2: Append `initSandbox4`**

```js
// ── SANDBOX 4 ───────────────────────────────────────────────
function initSandbox4() {
    const controls = document.getElementById('controls4');
    const st = { mu: 0.08, sigma: 0.10, p: 0.05, xm: 0.20, alpha: 1.5, nMax: 10000, histLen: 30, reps: 500, seed: 1 };

    const update = debounce(() => {
        const trueMean = st.alpha > 1 ? st.mu - st.p * paretoMean(st.xm, st.alpha) : null;
        const seeds = [0, 1, 2, 3, 4].map(k => st.seed * 1000 + k);
        const runs = { thin: [], fat: [] };
        for (const thin of [true, false]) {
            for (const s of seeds) {
                const r = sampleReturns(seededRandom(s), { ...st, n: st.nMax, thin });
                runs[thin ? 'thin' : 'fat'].push(runningMean(r));
            }
        }
        const est = { thin: [], fat: [] };
        for (const thin of [true, false]) {
            const rng = seededRandom(st.seed * 7919 + (thin ? 1 : 2));
            for (let k = 0; k < st.reps; k++) {
                const r = sampleReturns(rng, { ...st, n: st.histLen, thin });
                let s = 0; for (let i = 0; i < r.length; i++) s += r[i];
                est[thin ? 'thin' : 'fat'].push(s / r.length);
            }
        }
        drawS4(runs, est, trueMean, st);
        renderS4Readout(est, trueMean, st);
    });

    createSlider(controls, { label: 'Tail exponent α', id: 's4-alpha', min: 1.0, max: 5.0, step: 0.1, value: st.alpha, format: v => v.toFixed(1), onChange: v => { st.alpha = v; update(); } });
    createSlider(controls, { label: 'Loss probability p', id: 's4-p', min: 0.0, max: 0.20, step: 0.01, value: st.p, format: fmtPct, onChange: v => { st.p = v; update(); } });
    createSlider(controls, { label: 'Loss scale x_m', id: 's4-xm', min: 0.05, max: 0.50, step: 0.05, value: st.xm, format: fmtPct, onChange: v => { st.xm = v; update(); } });
    createSlider(controls, { label: 'History length (periods)', id: 's4-h', min: 10, max: 100, step: 5, value: st.histLen, onChange: v => { st.histLen = v; update(); } });
    createButton(controls, { label: 'Reseed', onClick: () => { st.seed++; update(); } });

    update();
}

// Log-spaced indices so a 10,000-point running mean plots as ~300 points.
function logIndices(n) {
    const out = []; let last = -1;
    for (let i = 0; i < 300; i++) {
        const idx = Math.min(n - 1, Math.round(Math.pow(10, i / 300 * Math.log10(n))));
        if (idx !== last) { out.push(idx); last = idx; }
    }
    return out;
}

function drawS4(runs, est, trueMean, st) {
    const idx = logIndices(st.nMax);
    const x = idx.map(i => i + 1);
    const traces = [];
    ['thin', 'fat'].forEach((k, j) => {
        runs[k].forEach((rm, s) => traces.push({ type: 'scatter', mode: 'lines', x, y: idx.map(i => rm[i]),
            xaxis: j ? 'x2' : 'x', yaxis: j ? 'y2' : 'y', showlegend: false,
            line: { width: 1.2, color: j ? `rgba(220,38,38,${0.5 + s * 0.1})` : `rgba(37,99,235,${0.5 + s * 0.1})` } }));
    });
    const shapes = trueMean === null ? [] : [0, 1].map(j => ({ type: 'line', xref: j ? 'x2' : 'x', yref: j ? 'y2' : 'y', x0: 1, x1: st.nMax, y0: trueMean, y1: trueMean, line: { color: '#111', width: 1.5, dash: 'dot' } }));
    const yr = trueMean === null ? undefined : [trueMean - 0.15, trueMean + 0.15];
    Plotly.react('chart4', traces, plotlyDefaults({
        grid: { rows: 1, columns: 2, pattern: 'independent' },
        xaxis: { type: 'log', title: 'n (thin tail: fixed loss)', domain: [0, 0.47] }, yaxis: { title: 'running mean', range: yr },
        xaxis2: { type: 'log', title: `n (fat tail: Pareto α = ${st.alpha.toFixed(1)})`, domain: [0.53, 1] }, yaxis2: { range: yr },
        shapes, showlegend: false, margin: { t: 20 },
    }), { responsive: true, displayModeBar: false });

    Plotly.react('chart4b', [
        { type: 'histogram', name: 'thin tail', x: est.thin, opacity: 0.65, marker: { color: '#2563eb' }, nbinsx: 60 },
        { type: 'histogram', name: 'fat tail', x: est.fat, opacity: 0.65, marker: { color: '#dc2626' }, nbinsx: 60 },
    ], plotlyDefaults({ barmode: 'overlay', xaxis: { title: `mean return you would have estimated from ${st.histLen} periods` }, yaxis: { title: 'count of histories' }, margin: { t: 10 }, legend: { orientation: 'h', y: 1.15 } }), { responsive: true, displayModeBar: false });
}

function quantile(arr, q) { const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

function renderS4Readout(est, trueMean, st) {
    const w = k => quantile(est[k], 0.95) - quantile(est[k], 0.05);
    const banner = trueMean === null ? `<div class="callout warn"><div class="callout-tag">No finite mean</div>At $\\alpha \\le 1$ the Pareto loss has no expectation. There is nothing for the running mean to converge to, so no sample size helps. The reference line is gone because there is no true value to draw.</div>` : '';
    document.getElementById('readout4').innerHTML = `
        ${banner}
        <p>${trueMean === null ? '' : `True mean in both regimes: <span class="estimate">${fmtPct2(trueMean)}</span>. `}
           Spread of the estimate (5th to 95th percentile) across ${st.reps} histories of ${st.histLen} periods:
           thin tail <strong>${fmtPct2(w('thin'))}</strong>, fat tail <strong>${fmtPct2(w('fat'))}</strong>.</p>
        <p>Thirty periods is a typical equity-premium sample. In the fat regime the number you would have plugged into $r$ depends on which history you happened to live through, and no history contains the loss that dominates the expectation.</p>
        ${callout('take', 'Your take', 'This is the risk premium the DCF asked you to put in the exponent. A scalar premium assumes the estimator converges and that risk shaves off the same fraction every year. Under a power-law tail neither holds. The fix is not a better estimate of the premium; it is to stop hiding risk in the exponent and put it in the cash flows as explicit scenarios, with ruin as its own scenario.')}
    `;
    renderAllMath();
}
```

Add `initSandbox4();` to the `DOMContentLoaded` handler.

- [ ] **Step 3: Check in the browser**

Expected at defaults: left panel's five blue lines settle onto the dotted 5.00% line by n ≈ 1,000; right panel's red lines lurch downward at irregular n and have not settled at 10,000; histogram shows a narrow blue bump and a wide, left-skewed red one; readout spreads differ by a factor of several. Dragging α to 1.0 shows the red "No finite mean" box and removes the dotted line; α = 4.0 makes the two panels nearly indistinguishable. Reseed changes the pictures but not the conclusion. Slider response stays under about 200 ms.

- [ ] **Step 4: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 4: running means under thin and fat tails"
```

---

### Task 8: Sandbox 5 — One Path, Not an Ensemble: The Founder's Bet

**Files:**
- Modify: `finance/valuation/explore.html` (Sandbox 5 description + markup; append `initSandbox5`; add the call)

**Interfaces:**
- Consumes: `simulatePaths`, `kellyFraction`, `timeAverageGrowth`, `ensembleGrowth` from `valuation.js`; shared helpers.
- Produces: `initSandbox5()`.

- [ ] **Step 1: Replace the Sandbox 5 description and markup**

```html
<div class="description">
    <p>
        Wealth starts at 1. Each period you commit a fraction $f$ to a venture that multiplies it
        by $G$ with probability $q$ or by $B$ otherwise, and a fixed burn $c$ comes out. Below
        $\varepsilon$ the path stops: ruin is absorbing. Two hundred founders run the same bet. The
        ensemble mean is what a DCF computes. The median is what a founder lives.
    </p>
</div>
<div class="sandbox-content">
    <div>
        <div class="chart-container" id="chart5"></div>
        <div class="chart-container" id="chart5b" style="min-height:280px"></div>
    </div>
    <div class="controls" id="controls5"></div>
</div>
<div class="readout" id="readout5"></div>
```

- [ ] **Step 2: Append `initSandbox5`**

```js
// ── SANDBOX 5 ───────────────────────────────────────────────
const S5_PRESETS = {
    peters:  { f: 1.0, q: 0.5,  G: 1.5, B: 0.6, c: 0.00, T: 60, eps: 0.05 },
    lottery: { f: 0.3, q: 0.05, G: 20,  B: 0.7, c: 0.01, T: 60, eps: 0.05 },
};

function initSandbox5() {
    const controls = document.getElementById('controls5');
    const st = { ...S5_PRESETS.peters, nPaths: 200, seed: 42 };
    const sliders = {};

    const update = debounce(() => {
        const sim = simulatePaths(st);
        const curve = growthCurve(st);
        drawS5(sim, curve, st);
        renderS5Readout(sim, curve, st);
    });

    const add = (key, label, min, max, step, format) => { sliders[key] = createSlider(controls, { label, id: 's5-' + key, min, max, step, value: st[key], format, onChange: v => { st[key] = v; update(); } }); };
    add('f', 'Fraction committed f', 0, 1, 0.02, fmtPct);
    add('q', 'Probability of a good period q', 0, 1, 0.01, fmtPct);
    add('G', 'Good multiplier G', 1, 30, 0.1, v => v.toFixed(1) + '×');
    add('B', 'Bad multiplier B', 0.05, 1, 0.01, v => v.toFixed(2) + '×');
    add('c', 'Burn per period c', 0, 0.05, 0.0025, v => (v * 100).toFixed(2) + '% of start');
    add('T', 'Periods T', 20, 120, 5, v => v);
    add('eps', 'Ruin barrier ε', 0.01, 0.2, 0.01, v => v.toFixed(2));
    const row = document.createElement('div'); row.className = 'control-group';
    const presets = document.createElement('div'); presets.className = 'preset-row';
    for (const [name, label] of [['peters', 'Peters coin'], ['lottery', 'Lottery-shaped']]) {
        const b = document.createElement('button'); b.textContent = label;
        b.addEventListener('click', () => { Object.assign(st, S5_PRESETS[name]); for (const k in sliders) { sliders[k].value = st[k]; sliders[k].dispatchEvent(new Event('input')); } });
        presets.appendChild(b);
    }
    row.appendChild(presets); controls.appendChild(row);
    createButton(controls, { label: 'Reseed', onClick: () => { st.seed++; update(); } });

    update();
}

// g(f) and P(ruin) on a grid of f. Analytic growth when c = 0, simulated otherwise.
function growthCurve(st) {
    const fs = [], g = [], ruin = [];
    for (let f = 0; f <= 1.0001; f += 0.02) {
        const sim = simulatePaths({ ...st, f, nPaths: 100, seed: st.seed + 17 });
        let gf;
        if (st.c === 0) gf = timeAverageGrowth(f, st.q, st.G, st.B);
        else { const logs = sim.paths.map(p => Math.log(p[st.T]) / st.T).sort((a, b) => a - b); gf = logs[Math.floor(logs.length / 2)]; }
        fs.push(f); g.push(gf); ruin.push(sim.ruinProb);
    }
    return { fs, g, ruin, kelly: kellyFraction(st.q, st.G, st.B) };
}

function drawS5(sim, curve, st) {
    // All 200 paths as one trace with null gaps: far cheaper than 200 traces.
    const xs = [], ys = [];
    for (const p of sim.paths) { for (let t = 0; t <= st.T; t++) { xs.push(t); ys.push(p[t]); } xs.push(null); ys.push(null); }
    const t = Array.from({ length: st.T + 1 }, (_, i) => i);
    Plotly.react('chart5', [
        { type: 'scatter', mode: 'lines', x: xs, y: ys, line: { color: 'rgba(100,116,139,0.18)', width: 1 }, name: 'one founder each', hoverinfo: 'skip' },
        { type: 'scatter', mode: 'lines', x: t, y: Array.from(sim.meanPath), line: { color: '#f59e0b', width: 3 }, name: 'ensemble mean (what the DCF computes)' },
        { type: 'scatter', mode: 'lines', x: t, y: Array.from(sim.medianPath), line: { color: '#2563eb', width: 3 }, name: 'median founder (what you live)' },
    ], plotlyDefaults({
        yaxis: { type: 'log', title: 'wealth (log)' }, xaxis: { title: 'period' },
        shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: st.eps, y1: st.eps, line: { color: '#dc2626', dash: 'dash', width: 1.5 } }],
        legend: { orientation: 'h', y: 1.12 },
    }), { responsive: true, displayModeBar: false });

    Plotly.react('chart5b', [
        { type: 'scatter', mode: 'lines', x: curve.fs, y: curve.g, name: st.c === 0 ? 'time-average growth g(f)' : 'median growth g(f), simulated', line: { color: '#2563eb', width: 2.5 } },
        { type: 'scatter', mode: 'lines', x: curve.fs, y: curve.ruin, name: 'P(ruin by T)', yaxis: 'y2', line: { color: '#dc2626', width: 2, dash: 'dot' } },
        { type: 'scatter', mode: 'markers', x: [curve.kelly], y: [st.c === 0 ? timeAverageGrowth(curve.kelly, st.q, st.G, st.B) : curve.g[Math.round(curve.kelly / 0.02)]], name: `Kelly f* = ${fmtPct(curve.kelly)}${st.c ? ' (at zero burn)' : ''}`, marker: { color: '#16a34a', size: 12, symbol: 'diamond' } },
        { type: 'scatter', mode: 'markers', x: [st.f], y: [st.c === 0 ? timeAverageGrowth(st.f, st.q, st.G, st.B) : curve.g[Math.round(st.f / 0.02)]], name: `you: f = ${fmtPct(st.f)}`, marker: { color: '#111', size: 10 } },
    ], plotlyDefaults({
        xaxis: { title: 'fraction committed f', tickformat: '.0%' }, yaxis: { title: 'growth per period', zeroline: true, zerolinecolor: '#999' },
        yaxis2: { title: 'P(ruin)', overlaying: 'y', side: 'right', range: [0, 1], tickformat: '.0%' },
        legend: { orientation: 'h', y: 1.18 }, margin: { r: 60 },
    }), { responsive: true, displayModeBar: false });
}

function renderS5Readout(sim, curve, st) {
    const gHere = st.c === 0 ? timeAverageGrowth(st.f, st.q, st.G, st.B) : curve.g[Math.round(st.f / 0.02)];
    const gEns = ensembleGrowth(st.f, st.q, st.G, st.B);
    document.getElementById('readout5').innerHTML = `
        <p><strong>By period ${st.T}:</strong> probability of ruin <span class="estimate ${sim.ruinProb > 0.25 ? 'wrong' : 'correct'}">${fmtPct(sim.ruinProb)}</span>
           &nbsp;·&nbsp; median founder ends at <strong>${sim.medianFinal.toFixed(3)}</strong> &nbsp;·&nbsp; ensemble mean ends at <strong>${sim.meanFinal.toFixed(3)}</strong>.</p>
        <p><strong>Growth per period:</strong> along your path ${(gHere * 100).toFixed(2)}%${st.c ? ' (simulated, with burn)' : ''}; of the ensemble mean ${(gEns * 100).toFixed(2)}%${st.c ? ' (before burn)' : ''}.
           Kelly fraction $f^* = $ <strong>${fmtPct(curve.kelly)}</strong>${st.c ? ' at zero burn' : ''}.</p>
        <p>${st.c === 0 && st.f === 1 && Math.abs(st.G - 1.5) < 1e-9 && Math.abs(st.B - 0.6) < 1e-9 ? 'This is the Peters coin: +50% or −40% at even odds. The ensemble mean grows 5% per period. The typical founder shrinks 5% per period. Both statements are true, and only one of them is about you.' : 'Ensemble average equals time average only for ergodic processes. Wealth with an absorbing barrier is not one.'}</p>
        ${callout('take', 'Your take: the decision rule', `A DCF computes the orange line. You live the blue one. So the question is not "is the expected value positive." It is three questions in order. <strong>Is the worst case survivable?</strong> Bounded loss you can absorb and still play again. <strong>Is the upside convex?</strong> Good outcomes unbounded while bad ones are capped. <strong>Is $f$ sized so your own path stays off the barrier?</strong> The diamond marks the growth-optimal fraction; most people who bet their own single path should sit to its left. A DCF is at best a subroutine inside those three questions, useful for the cash forecast and useless as the verdict.`)}
    `;
    renderAllMath();
}
```

Add `initSandbox5();` to the `DOMContentLoaded` handler.

- [ ] **Step 3: Check in the browser**

Expected at the Peters preset: grey paths fan out on the log axis, the orange mean rises, the blue median falls, readout shows ruin probability well above zero, median final well below 1, mean final above 1, growth along the path about −5.27% and ensemble about +4.88%, Kelly 25%; the growth curve peaks at the green diamond at f = 0.25 with the black "you" dot at f = 1.0 below zero. Clicking Lottery-shaped moves every slider and shows Kelly about 11.7% at zero burn with a simulated curve. Setting c to 0.02 turns the curve label to "simulated" and raises the ruin line. Reseed reshuffles the paths but not the shape.

- [ ] **Step 4: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 5: ergodicity, the growth curve, and the founder's decision rule"
```

---

### Task 9: Sandbox 6 — Rosetta Stone: Python and Spreadsheet

**Files:**
- Modify: `finance/valuation/explore.html` (Sandbox 6 description + body)

**Interfaces:**
- Consumes: function bodies from `finance/valuation/scripts/dcf.py` (Task 1), copied verbatim into the Python panels. If the script changes, the panels change.
- Produces: static markup only; no JS beyond `renderAllMath()` already running on load.

- [ ] **Step 1: Replace the Sandbox 6 description and body**

HTML-escape `<`, `>`, `&` inside `<pre><code>` blocks. The three sections below use the existing `.rosetta-section`, `.rosetta-panels`, `.rosetta-panel`, `.rosetta-lang`, `.rosetta-note` classes.

```html
<div class="description">
    <p>
        The arithmetic is one line in either tool. What differs is the audit trail. The video's
        complaint about the low-effort workbook was not the numbers; it was the missing source sheet
        and checklist. Every assumption in its own labeled cell, referenced by name, is the
        deliverable.
    </p>
</div>
<div id="rosetta6">

    <div class="rosetta-section">
        <h3>The DCF (what Sandbox 1 computes)</h3>
        <p class="rosetta-concept">$V = \sum_{t=1}^{N} FCF_t\,(1+r)^{-t} + TV\,(1+r)^{-N}$, with $TV = FCF_N (1+g_T)/(r-g_T)$</p>
        <div class="rosetta-panels">
            <div class="rosetta-panel python">
                <div class="rosetta-lang">Python</div>
<pre><code>def dcf(fcf1, g, n, r, g_t):
    if g_t &gt;= r:
        raise ValueError("terminal growth must be below the discount rate")
    pv_explicit = 0.0
    fcf = fcf1
    for t in range(1, n + 1):
        if t &gt; 1:
            fcf *= 1 + g
        pv_explicit += fcf / (1 + r) ** t
    fcf_n = fcf1 * (1 + g) ** (n - 1)
    tv = fcf_n * (1 + g_t) / (r - g_t)
    pv_terminal = tv / (1 + r) ** n
    value = pv_explicit + pv_terminal
    return dict(value=value, pv_explicit=pv_explicit,
                pv_terminal=pv_terminal, tv=tv,
                terminal_share=pv_terminal / value)

dcf(100, 0.08, 10, 0.10, 0.025)["value"]   # 1891.4986…</code></pre>
            </div>
            <div class="rosetta-panel r">
                <div class="rosetta-lang">Spreadsheet (LibreOffice / Excel)</div>
<pre><code># Inputs sheet — one assumption per NAMED cell (Sheet ▸ Named Ranges)
fcf1   100        ← first-year cash
g      0.08       ← explicit growth
r      0.10       ← discount rate
gT     0.025      ← terminal growth
N      10         ← explicit years

# Model sheet — columns A:D, rows 2..11 for years 1..10
A: Year     B: FCF                 C: DF            D: PV
1           =fcf1                  =1/(1+r)^A2      =B2*C2
2           =B2*(1+g)              =1/(1+r)^A3      =B3*C3
…           (fill down)            (fill down)      (fill down)

TV          =B11*(1+gT)/(r-gT)               ← year-N cash, grown once, capitalized
Value       =SUM(D2:D11) + TV/(1+r)^N        ← 1891.50
TV share    =(TV/(1+r)^N) / Value            ← 55.7%

# Why not =NPV(r, B2:B11)?  It works, but it silently assumes end-of-period cash
# and excludes t = 0. Writing the columns out keeps every step inspectable.</code></pre>
            </div>
        </div>
        <div class="rosetta-note">
            <strong>Key mapping:</strong> the loop over <code>t</code> is the fill-down. The Gordon term is one cell in
            both. The spreadsheet's only real advantage is that a reviewer can click any number and see where it came from,
            which is exactly the property the video found missing.
        </div>
    </div>

    <div class="rosetta-section">
        <h3>Reverse DCF (what Sandbox 2 solves)</h3>
        <p class="rosetta-concept">Given a price, find the $g_e$ that makes $V(g_e) = P$. $V$ is monotone in $g_e$, so bisection or Goal Seek is safe.</p>
        <div class="rosetta-panels">
            <div class="rosetta-panel python">
                <div class="rosetta-lang">Python</div>
<pre><code>def implied_growth(price, fcf1, n, r, g_t, lo=-0.20, hi=0.60, tol=1e-12):
    if price &lt; dcf(fcf1, lo, n, r, g_t)["value"] or \
       price &gt; dcf(fcf1, hi, n, r, g_t)["value"]:
        return None                      # outside what this shape can produce
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if dcf(fcf1, mid, n, r, g_t)["value"] &lt; price:
            lo = mid
        else:
            hi = mid
        if hi - lo &lt; tol:
            break
    return 0.5 * (lo + hi)

implied_growth(1891.4986, 100, 10, 0.10, 0.025)   # 0.0800</code></pre>
            </div>
            <div class="rosetta-panel r">
                <div class="rosetta-lang">Spreadsheet</div>
<pre><code># Goal Seek (Tools ▸ Goal Seek in LibreOffice; Data ▸ What-If ▸ Goal Seek in Excel)
Formula cell:   Value          (the =SUM(...)+TV/(1+r)^N cell)
Target value:   1891.50        (the price you were quoted)
Variable cell:  g              (the named growth input)

# Result: g = 0.0800. Now the sheet is a claim about the world:
# "this price requires 8% growth for 10 years, then 2.5% forever."
# Goal Seek has no range guard; if it fails to converge, the price is
# outside what the forecast shape can produce. Do not widen the shape
# to reach it.</code></pre>
            </div>
        </div>
        <div class="rosetta-note">
            <strong>Key mapping:</strong> bisection and Goal Seek are the same operation. The Python version refuses
            out-of-range prices explicitly; the spreadsheet version fails silently or converges to nonsense, which is why
            the guard sentence is written into the recipe.
        </div>
    </div>

    <div class="rosetta-section">
        <h3>The founder's paths (what Sandbox 5 simulates)</h3>
        <p class="rosetta-concept">$W_{t+1} = W_t\,(1 - f + f M_t) - c$, frozen at $\varepsilon$; Kelly $f^* = q/b - (1-q)/a$ with $a = G-1$, $b = 1-B$.</p>
        <div class="rosetta-panels">
            <div class="rosetta-panel python">
                <div class="rosetta-lang">Python</div>
<pre><code>import math
import numpy as np

def kelly(q, G, B):
    a, b = G - 1.0, 1.0 - B
    return max(0.0, min(1.0, q / b - (1 - q) / a))

def time_avg_growth(f, q, G, B):
    return q * math.log(1 - f + f * G) + (1 - q) * math.log(1 - f + f * B)

def simulate_paths(f, q, G, B, c, T, eps, n_paths=200, seed=42):
    rng = np.random.default_rng(seed)
    W = np.ones((n_paths, T + 1))
    alive = np.ones(n_paths, dtype=bool)
    for t in range(T):
        M = np.where(rng.random(n_paths) &lt; q, G, B)
        nxt = W[:, t] * (1 - f + f * M) - c
        ruined = nxt &lt;= eps
        nxt = np.where(ruined, eps, nxt)
        alive &amp;= ~ruined
        W[:, t + 1] = np.where(alive | ruined, nxt, eps)
    return W

kelly(0.5, 1.5, 0.6)                 # 0.25
time_avg_growth(1.0, 0.5, 1.5, 0.6)  # -0.0527  (the Peters coin, all in)
W = simulate_paths(1.0, 0.5, 1.5, 0.6, 0.0, 60, 0.05)
np.median(W[:, -1]), W[:, -1].mean() # median « 1 « mean</code></pre>
            </div>
            <div class="rosetta-panel r">
                <div class="rosetta-lang">Spreadsheet</div>
<pre><code># No twin.

# Two hundred paths × sixty periods is twelve thousand cells that each
# carry branching state (alive or frozen at ε) and a random draw. It can
# be done; it cannot be audited. The moment the model needs a distribution
# of outcomes rather than one row of them, the spreadsheet stops being the
# right tool and the source sheet + checklist become the argument for
# moving to code.</code></pre>
            </div>
        </div>
        <div class="rosetta-note">
            <strong>Key mapping:</strong> the DCF is a single row of arithmetic and belongs in a spreadsheet with named
            cells. The founder's question is a distribution over paths and belongs in code. Knowing which tool a question
            wants is most of the skill.
        </div>
    </div>

</div>
```

- [ ] **Step 2: Check in the browser**

Expected: three Rosetta sections render with the concept formulas typeset, Python on the left and the spreadsheet panel on the right, code blocks preserved verbatim (no unescaped `<` swallowing text). Confirm the Python shown matches `scripts/dcf.py` by eye for the three functions.

- [ ] **Step 3: Commit**

```bash
git add finance/valuation/explore.html
git commit -m "Add Sandbox 6: Python and spreadsheet Rosetta Stone"
```

---

### Task 10: Docs, final pass

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README**

In the Tracks list, change the finance line to:
```
- **finance/** — valuation (DCF, whose number it is, fat tails, ergodicity); derivatives and greeks planned
```
In Quick Start, add after the react URL:
```
# http://localhost:8080/finance/valuation/explore.html
```

- [ ] **Step 2: CLAUDE.md**

Under "Completed", after the React entry, add:
```
Valuation exploration (finance/valuation/) — first finance page, 6 sandboxes:
1. The Machine (DCF as a geometric-kernel sum; terminal-value share; sensitivity grid)
2. Whose Number Is It? (two buyers + seller, ZOPA, reverse DCF via bisection)
3. After the Deal (merger layer: synergies, financing mix, close probability, implied synergy, waterfall)
4. The Premium That Can't Be Estimated (running means under Pareto vs fixed losses; estimate spread)
5. One Path, Not an Ensemble (multiplicative wealth with ruin barrier; ensemble vs median; Kelly; decision rule)
6. Rosetta Stone (Python from scripts/dcf.py + spreadsheet cell layouts and Goal Seek)
Pure math lives in finance/valuation/valuation.js and is Node-testable:
`node -e "require('./finance/valuation/valuation.js').runSelfTest()"`.
```
Under "Shared Utilities", add:
```
- `.callout`, `.callout.take`, `.callout.siren`, `.callout.warn` (explore.css) — annotated boxes for the learner's own arguments, plausibility warnings, and guard states
```
Under "Technical Notes", add:
```
- **Valuation page guards**: `gT` is clamped below `r` with a visible warning; reverse DCF reports out-of-range instead of a boundary value; Sandbox 4 removes its reference line at `α ≤ 1`; financing shares are clamped to sum to one.
```

- [ ] **Step 3: Final verification**

Run: `node -e "process.exitCode = require('./finance/valuation/valuation.js').runSelfTest().failures.length" && ./build.sh run finance/valuation scripts/dcf.py`
Expected: `22/22 passed`; the Python S1 line agrees with the JS expected values in the table at the top of this plan.

Open the page once more, top to bottom, and confirm: no console errors, `22/22` in the console, every slider moves its chart, every callout renders its tag, and every `$…$` is typeset (no raw dollar signs visible).

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "Update project docs with valuation exploration"
```
