/* finance/valuation/valuation.js — pure math for the valuation exploration.
   Loaded by explore.html via <script src>; require()-able from Node for tests. */

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
    if (!Number.isFinite(price)) return { ok: false, g: null, lowValue: NaN, highValue: NaN };
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
    const impliedSynergy = inp.pS * K <= 0 ? null : (pricePaid + inp.I + fees - VT.value) / (inp.pS * K);
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
    if (a <= 0) return 0;
    if (b <= 0) return 1;
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
    const revNaN = impliedGrowth({ price: NaN, fcf1: 100, n: 10, r: 0.10, gT: 0.025 });
    total++; if (revNaN.ok !== false) failures.push('S2 reverse NaN price: ok should be false');
    total++; if (revNaN.g !== null) failures.push('S2 reverse NaN price: g should be null');
    total++; if (impliedGrowth({ price: 50000, fcf1: 100, n: 10, r: 0.10, gT: 0.025 }).ok !== false) failures.push('S2 reverse out-of-range price: ok should be false');
    close('S3 V_T', dcf({ fcf1: 40, g: 0.05, n: 10, r: 0.10, gT: 0.02 }).value, 602.6256194868424);
    close('S3 V_A', dcf({ fcf1: 300, g: 0.04, n: 10, r: 0.10, gT: 0.02 }).value, 4245.471062688277);
    const m = mergerModel(MERGER_DEFAULTS);
    const mStar = mergerModel({ ...MERGER_DEFAULTS, S: m.impliedSynergy });
    close('S3 implied synergy zeroes VC', mStar.valueCreated + 1, 1, 1e-9);
    total++; if (mergerModel({ ...MERGER_DEFAULTS, pS: 0 }).impliedSynergy !== null) failures.push('S3 impliedSynergy at pS=0 should be null');
    total++; if (!(Math.abs(mergerModel({ ...MERGER_DEFAULTS, stockShare: 0 }).wealthTransfer) < 1e-9)) failures.push('S3 wealthTransfer at stockShare=0 should be ~0');
    close('S4 paretoMean', paretoMean(0.20, 1.5), 0.6, 1e-12);
    total++; if (paretoMean(0.20, 1.0) !== Infinity) failures.push('S4 paretoMean(alpha=1) should be Infinity');
    close('S5 kelly', kellyFraction(0.5, 1.5, 0.6), 0.25, 1e-12);
    close('S5 g(0.25)', timeAverageGrowth(0.25, 0.5, 1.5, 0.6), 0.006211259999278587);
    close('S5 g(1.0)', timeAverageGrowth(1.0, 0.5, 1.5, 0.6), -0.05268025782891317);
    close('S5 g_ens(1.0)', ensembleGrowth(1.0, 0.5, 1.5, 0.6), 0.04879016416943205);
    close('S5 lottery kelly', kellyFraction(0.05, 20, 0.7), 0.11666666666666667, 1e-12);
    close('S5 kelly degenerate: a<=0, q=1', kellyFraction(1, 1, 0.6), 0, 1e-12);
    close('S5 kelly degenerate: a<=0 wins over b<=0', kellyFraction(0.5, 1, 1), 0, 1e-12);
    close('S5 kelly degenerate: b<=0', kellyFraction(0, 1.5, 1), 1, 1e-12);
    total++; if ([kellyFraction(1, 1, 0.6), kellyFraction(0.5, 1, 1), kellyFraction(0, 1.5, 1)].some(Number.isNaN)) failures.push('S5 kelly degenerate: NaN present');
    const sim = simulatePaths({ f: 1.0, q: 0.5, G: 1.5, B: 0.6, c: 0, T: 60, eps: 0.05, nPaths: 200, seed: 42 });
    total++; if (!(sim.medianFinal < 1 && sim.meanFinal > 1)) failures.push(`S5 sim: median ${sim.medianFinal} should be < 1 < mean ${sim.meanFinal}`);
    total++; if (sim.paths.length !== 200 || sim.paths[0].length !== 61) failures.push('S5 sim: wrong shape');
    total++;
    {
        let ok = true;
        for (let i = 0; i < sim.paths.length && ok; i++) {
            if (sim.ruinedBy[i] !== 1) continue;
            const w = sim.paths[i];
            if (w[w.length - 1] !== 0.05) { ok = false; break; }
            let frozen = false;
            for (let t = 0; t < w.length; t++) {
                if (frozen) { if (w[t] !== 0.05) { ok = false; break; } }
                else if (w[t] === 0.05) { frozen = true; }
            }
        }
        if (!ok) failures.push('S5 ruin freezing: a ruined path did not stay at eps for all periods after ruin');
    }
    const rngThin = seededRandom(7);
    const retsThin = sampleReturns(rngThin, { mu: 0.08, sigma: 0.10, p: 0.05, xm: 0.20, alpha: 1.5, n: 200000, thin: true });
    const rmThin = runningMean(retsThin);
    total++; if (!(Math.abs(rmThin[rmThin.length - 1] - 0.05) < 0.005)) failures.push(`S4 thin regime running mean: got ${rmThin[rmThin.length - 1]}, want within 0.005 of 0.05`);
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
