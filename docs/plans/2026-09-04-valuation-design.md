# Design: Valuation Exploration — "What Is This Cash Stream Worth to Me?"

Date: 2026-09-04

First page in the `finance/` track. Grew out of a conversation about a Nate B Jones
video (linked in References) in which a model built a post-acquisition DCF workbook,
and the discussion that followed about what a DCF actually is, who the number belongs
to, and where the framework breaks under fat tails and single-path decisions.

## Learner Profile

Physics degree, comfortable with graduate-level math, rudimentary understanding of how
actual businesses work, and figuring out how to go into business for themselves.
Understands marginal-utility value theory and is skeptical of "objective" valuation
methods. Reads Taleb, buys the fat-tail critique, and is alert to plausible-sounding
theories that cannot lose against reality. Prefers exploration over lectures.

## Stance

This page takes a position and says so in the intro. The DCF is subjective value
theory's arithmetic, not an alternative to it. The arithmetic is one line; the
assumptions are the entire content. A scalar risk premium in the discount rate is a
thin-tailed assumption. A founder betting a single path needs the time average of
their own wealth, not the ensemble expectation. The page's job is to make each of
those claims something the learner can drag a slider on and watch.

## Structure

Single page: `finance/valuation/explore.html`. Six sandboxes, a notation panel, an
intro that states the stance, and a references section.

Supporting files:

- `finance/valuation/scripts/dcf.py` — the Rosetta Stone source; prints the page's
  default readouts for Sandboxes 1, 2, and 5.
- `finance/valuation/requirements.txt` — `numpy` only.
- `shared/explore.css` — two additive callout classes (see Callouts).

## Technical Approach

- All math runs in the browser. Pure functions first in the page's script block:
  `dcf`, `terminalValue`, `impliedGrowth`, `paretoSample`, `simulatePaths`,
  `kellyFraction`, `timeAverageGrowth`. Sandbox wiring follows.
- Shared helpers reused: `createSlider`, `createButton`, `plotlyDefaults`,
  `seededRandom`, `normalRandom`, `renderAllMath`. Rosetta uses the existing
  side-by-side `.rosetta-panels` classes, Python left, spreadsheet right.
- Every stochastic sandbox uses the seeded generator and has a "reseed" button, so a
  picture can be reproduced or refreshed on purpose.
- Sliders debounce at ~50 ms. Largest workload is the growth-versus-fraction curve in
  Sandbox 5 (about a million multiplies). No workers.
- Python via `./build.sh setup finance/valuation` and
  `./build.sh run finance/valuation scripts/dcf.py`.

## Callouts

Two additive classes in `shared/explore.css`, used seven times on the page (listed per
sandbox below):

- `.callout.take` — "Your take": marks a sandbox demonstrating something the learner
  argued (terminal-value dominance, whose number it is, estimator non-convergence,
  ensemble vs time average).
- `.callout.siren` — "Siren check": a plausibility warning where a plausible-sounding
  input can justify any answer (the synergy line, the implied growth rate). Phrased as
  questions to the learner, never as an oracle.

## Notation Reference (collapsible panel)

$FCF_t$ free cash flow in year $t$; $r$ discount rate; $g_e$ explicit-period growth;
$g_T$ terminal growth; $N$ explicit years; $DF_t = (1+r)^{-t}$ discount factor;
$TV = FCF_N (1+g_T)/(r-g_T)$ terminal value; reservation price; ZOPA (zone of possible
agreement); $S$ annual synergy; $p_s$ synergy realization probability; $p_c$ close
probability; $\alpha$ tail exponent; $x_m$ Pareto scale; running mean $\bar{R}_n$;
$f$ fraction of wealth committed; $G, B, q$ good multiplier, bad multiplier, probability
of good; $f^*$ Kelly fraction; $g(f)$ time-average growth; $\varepsilon$ ruin barrier;
$c$ per-period burn. Convergence-rate note: for finite variance the estimator error
falls like $n^{-1/2}$; for $1<\alpha<2$ it falls like $n^{1/\alpha-1}$, whose exponent
goes to zero as $\alpha \to 1$; for $\alpha \le 1$ there is no finite mean.

## Sandbox 1: The Machine

A DCF as a weighted sum with a geometric kernel.

Model:

$$FCF_t = FCF_1 (1+g_e)^{t-1}, \quad
V = \sum_{t=1}^{N} \frac{FCF_t}{(1+r)^t} + \frac{TV}{(1+r)^N}, \quad
TV = \frac{FCF_N (1+g_T)}{r - g_T}$$

Controls and defaults: $FCF_1 = 100$ (fixed); $g_e$ 8% (0–30%); $N$ 10 (3–15);
$r$ 10% (3–30%); $g_T$ 2.5% (0–6%, clamped to at most $r - 0.5$ points with a
visible warning when the clamp engages).

Charts:
- A: per-year grouped bars, nominal $FCF_t$ faint and $PV_t$ solid, plus the
  terminal value's PV as a final bar in its own color.
- B: one stacked horizontal bar: PV of explicit years vs PV of terminal value, as
  shares of $V$.

Readouts: $V$; terminal share $PV(TV)/V$; a 3×3 sensitivity grid of $V$ at
$r \pm 1$ point crossed with $g_T \pm 0.5$ point.

Callout (take): at the defaults the terminal lump is over half the value. Most of
"the value" is two parameters applied to a year-$N$ number that is itself a forecast.

## Sandbox 2: Whose Number Is It?

Same company as Sandbox 1, using Sandbox 1's *defaults* rather than its live slider
state; sandboxes are independent, as on the DiD page. Two buyers and a seller each
compute their own number.

Model: each party $i$ values $V_i = \text{DCF}(FCF_1 (1+s_i), g_i, N, r_i, g_T)$ where
$s_i$ is a synergy uplift applied to every year's cash. Seller has $s = 0$ and
$g = g_e$ from Sandbox 1; the seller's $r_S$ is their alternative return.

Defaults: Buyer A (financial buyer) $r_A$ 9%, $g_A$ 8%, $s_A$ 0%. Buyer B
(strategic buyer) $r_B$ 11%, $g_B$ 10%, $s_B$ 15%. Seller $r_S$ 12%. All rates
sliderable in the same ranges as Sandbox 1; $s_i$ 0–40%.

Chart: three horizontal bars (seller minimum, Buyer A maximum, Buyer B maximum) with
the ZOPA shaded between the seller minimum and the highest buyer value. A price
slider spanning that zone shows the surplus split: buyer surplus $V_i - P$, seller
surplus $P - V_S$. If no buyer exceeds the seller minimum the chart shows a "no
deal" state instead of a zone.

Reverse DCF (below the chart): a price input. Bounded bisection on $g_e \in
[-20\%, 60\%]$, holding $N$, $r$, $g_T$ at Sandbox 1 values, finds the explicit
growth rate at which $V(g_e) = P$. $V$ is monotone increasing in $g_e$, so bisection
is valid. Out-of-range prices report "no growth rate in range reaches this price."
Readout: "For this price to be right, cash must grow $X\%$ per year for $N$ years and
$g_T$ forever after." No plausibility oracle; the comparison is against what the
learner believes.

Callout (take): same asset, three numbers, by construction. The DCF is
marginal-utility theory's arithmetic. Callout (siren) on the reverse-DCF readout.

## Sandbox 3: After the Deal

The post-acquisition layer on top of two standalone DCFs. Synthetic numbers shaped
like the video's exercise; no claim to model a real company.

Standalone inputs (Sandbox 1 formula, $N = 10$):
- Target: $FCF_1^T = 40$, $g^T$ 5%, $g_T$ 2%, shares$_T$ = 50. Standalone $V_T$,
  per-share $V_T/50$.
- Acquirer: $FCF_1^A = 300$, $g^A$ 4%, $g_T$ 2%, $r_e$ 10%, shares$_A$ = 100.
  Standalone $V_A$, per-share $V_A/100$.

Merger controls and defaults:
- Offer price per target share $P$ (slider spanning 0.5× to 2× standalone
  per-share). Price paid $= P \cdot \text{shares}_T$; premium $= P \cdot \text{shares}_T - V_T$.
- Annual run-rate synergy $S$ (0–40, default 15), ramping $1/3, 2/3, 1$ in years
  1–3 and full thereafter; realization probability $p_s$ (0–100%, default 70%).
  $PV(\text{syn}) = p_s \sum_t S \cdot \text{ramp}_t (1+r_c)^{-t}$.
- Integration cost $I$, one-time in year 1 (0–60, default 30). Fees $F = 2\%$ of
  price paid, fixed.
- Financing mix: debt share $d$ and stock share $s$ sliders, cash $= 1 - d - s$
  (clamped so the three sum to one). Debt $D = d \cdot$ price paid at interest $i$
  (3–12%, default 6%); tax rate 25% fixed. Blended discount rate
  $r_c = \dfrac{E\, r_e + D\, i (1-\tau)}{E + D}$ with $E = V_A + V_T$ as the
  equity proxy. New shares $= s \cdot \text{price paid} / (V_A / \text{shares}_A)$.
- Close probability $p_c$ (50–100%, default 85%); close lag fixed at one year.

Outputs:
- Waterfall chart: $V_T$ standalone $\to$ $+PV(\text{syn})$ $\to$ $-I$ $\to$ $-F$
  $\to$ $-$ price paid $\to$ value created for the acquirer's owners
  $VC = V_T + PV(\text{syn}) - I - F - \text{price paid}$.
- Combined cash strip: per-year $FCF_t^A + FCF_t^T + p_s S\, \text{ramp}_t - I[t=1] - D\, i$,
  with years below zero flagged as needing outside financing.
- Readouts: $VC$; probability-weighted $VC$ today $= p_c \cdot VC / (1 + r_c)$;
  per-share before ($V_A/\text{shares}_A$) and after
  $\big(V_A + V_T + PV(\text{syn}) - I - F - (1-s)\cdot\text{price paid}\big) /
  (\text{shares}_A + \text{new shares})$; implied synergy
  $S^* = (\text{price paid} + I + F - V_T) / (p_s K)$ with
  $K = \sum_t \text{ramp}_t (1+r_c)^{-t}$, which is closed-form because $PV(\text{syn})$
  is linear in $S$.
- Note: $VC$ and (per-share after $\times$ shares$_A$ $- V_A$) agree exactly only when
  no stock is issued or new shares are issued at the post-deal per-share value. Any
  gap between them is the wealth transfer from issuing stock at the standalone price,
  and the readout panel labels it as such rather than hiding it.

Callout (siren) on $S^*$: the offer requires this much synergy; has anyone in this
industry ever realized it? Callout (take): the synergy term is value-to-this-buyer
made literal.

## Sandbox 4: The Premium That Can't Be Estimated

Why a scalar risk premium calibrated from history is a thin-tailed assumption.

Model: per-period return $R_t = \mu + \sigma Z_t - J_t$ with $Z_t \sim N(0,1)$ and
$J_t = X_t \cdot \mathbf{1}[U_t < p]$, $X_t \sim \text{Pareto}(x_m, \alpha)$ sampled by
inverse CDF $X = x_m U'^{-1/\alpha}$. True mean for $\alpha > 1$:
$E[R] = \mu - p\, x_m\, \alpha/(\alpha - 1)$.

Thin-tailed comparison: identical $\mu$, $\sigma$, $p$, but the loss when it arrives is
the constant $x_m \alpha/(\alpha-1)$. Both regimes therefore share the same true mean;
only the tail differs.

Defaults: $\mu$ 8%, $\sigma$ 10%, $p$ 5%, $x_m$ 20%, $\alpha$ 1.5 (slider 1.0–5.0,
step 0.1), $n_{\max} = 10{,}000$, history length 30 periods (10–100), 500 replications.

Charts:
- A: running sample mean $\bar{R}_n$ against $n$ on a log axis, five seeds overlaid,
  thin regime left panel and fat regime right panel, with $E[R]$ as a reference line.
- B: histogram of the mean estimated from each of 500 simulated histories of the
  chosen length, both regimes overlaid. Readout: 5th–95th percentile width of the
  estimate per regime.

Guard: $\alpha \le 1$ removes the reference line and shows a banner: no finite mean
exists, so no sample size converges.

Callout (take): this is the risk premium the DCF asked you to plug into $r$. In the
fat regime the number you would have estimated depends on which history you happened
to live through.

## Sandbox 5: One Path, Not an Ensemble — The Founder's Bet

Ergodicity: the ensemble average and the time average of a multiplicative process
with an absorbing barrier are different quantities, and a founder lives one path.

Model: $W_0 = 1$. Each period commit fraction $f$ of wealth:
$W_{t+1} = W_t (1 - f + f M_t) - c$, with $M_t = G$ with probability $q$ else $B$,
and $c$ a fixed per-period burn. Ruin when $W_t \le \varepsilon$; the path freezes at
$\varepsilon$.

Analytic pieces (valid at $c = 0$): time-average growth
$g(f) = q \ln(1 - f + fG) + (1-q)\ln(1 - f + fB)$; ensemble growth
$\ln\!\big(1 - f + f(qG + (1-q)B)\big)$; Kelly fraction with $a = G-1$, $b = 1-B$:
$f^* = q/b - (1-q)/a$, clamped to $[0, 1]$. With $c > 0$ the curve $g(f)$ is
simulated (median of $\ln W_T / T$ over paths) and $f^*$ is reported as "at zero burn."

Defaults (Peters coin preset): $G = 1.5$, $B = 0.6$, $q = 0.5$, $f = 1.0$, $c = 0$,
$\varepsilon = 0.05$, $T = 60$, 200 paths. Lottery preset: $G = 20$, $B = 0.7$,
$q = 0.05$, $f = 0.3$, $c = 0.01$. Sliders: $f$ (0–1), $q$ (0–1), $G$ (1–30),
$B$ (0–1), $c$ (0–0.05), $T$ (20–120), $\varepsilon$ (0.01–0.2).

Charts:
- A: 200 paths on a log-$y$ axis with the ensemble mean and the median drawn bold and
  a dashed line at $\varepsilon$.
- B: $g(f)$ for $f \in [0, 1]$ in steps of 0.02, $f^*$ marked, probability of ruin by
  $T$ on a secondary axis.

Readouts: $P(\text{ruin by } T)$; median $W_T$; mean $W_T$; $g(f)$ per period; $f^*$.

Closing callout (take): three questions, in order. Is the worst case survivable? Is
the upside convex? Is the fraction committed sized so your own path stays off the
barrier? A DCF is at best a subroutine inside those.

## Sandbox 6: Rosetta Stone — Python and Spreadsheet

Three concept sections, each with a Python panel (left) sourced verbatim from
`scripts/dcf.py` and a spreadsheet panel (right).

1. **The DCF (Sandbox 1).** Python: `dcf(fcf1, g, n, r, g_t)`. Spreadsheet: named
   input cells `fcf1`, `g`, `r`, `gT`, `N`; columns Year, FCF (`=B2*(1+g)`), DF
   (`=1/(1+r)^A`), PV (`=B*C`); a TV cell `=B_N*(1+gT)/(r-gT)`; total
   `=SUM(PV) + TV/(1+r)^N`. Note: the built-in `NPV()` assumes end-of-period cash and
   excludes $t = 0$, which is why the columns are written out.
2. **Reverse DCF (Sandbox 2).** Python: `implied_growth(price, ...)` by bisection.
   Spreadsheet: Goal Seek recipe (set the total cell to the price by changing `g`).
3. **The founder's paths (Sandbox 5).** Python: vectorized numpy simulation of 200
   paths over $T$ periods plus `kelly(q, G, B)` and `time_avg_growth(f, q, G, B)`.
   No spreadsheet twin, with one sentence on why (per-path branching state across
   thousands of cells is exactly what spreadsheets are worst at).

Rosetta note, tying back to the video: every assumption in its own labeled cell, one
source sheet, one checklist. The arithmetic is trivial; the audit trail is the
deliverable.

## Guards and Failure States

- $g_T$ clamped below $r$ with a visible warning (Sandbox 1; the same constraint
  applies wherever the Gordon term appears).
- Reverse DCF reports out-of-range instead of returning a boundary value.
- $\alpha \le 1$ switches Sandbox 4 to an explicit "no finite mean" state.
- Financing shares clamped to sum to one.
- Log-scale wealth charts floor at $\varepsilon$; frozen paths are drawn flat.
- `renderAllMath()` is called after every readout update that contains LaTeX.

## Verification

The repo has no JS test harness and this page does not justify adding one. Instead:

- `scripts/dcf.py` prints the default readouts. Its outputs for three or four fixed
  cases are hardcoded into a self-test block in the page that runs on load and logs
  `valuation selftest: k/n passed` to the console, with values on any failure.
- Fixed cases: Sandbox 1 defaults ($V$ and terminal share, relative tolerance
  $10^{-9}$); `impliedGrowth(V_default)` round-trips to 8% within $10^{-6}$;
  Peters-coin Kelly $f^* = 0.25$, $g(0.25)$ and $g(1.0)$ from the closed form; the
  Pareto true-mean formula at defaults ($E[X] = 0.6$).
- Visual checks through `./serve.sh` in Brave.
- Commits land one per sandbox, matching the React and WASM pages.

## Docs Updates (final commit)

- `README.md`: add `finance/valuation` to the tracks list and quick-start URLs.
- `CLAUDE.md`: add the exploration to "Completed" with its six sandboxes; note the
  callout classes in Shared Utilities.

## Out of Scope

Real company data or live market feeds; accretion/dilution EPS analysis; CAPM or
beta-based discount rates; continuous-time models; any persistence of the learner's
own numbers; a JS test framework.

## References

- Nate B Jones, "Claude Fable 5.1: Not Just Code. It Made Me A Film, 7 Sheets And
  13 Slides." https://youtu.be/55rDzRkUVdE (the anchoring video)
- Böhm-Bawerk (time preference as the origin of interest) and Irving Fisher,
  *The Theory of Interest* (1930) — lineage of present value
- Mauboussin and Rappaport, *Expectations Investing* — reverse DCF as the honest use
- Taleb, *Statistical Consequences of Fat Tails* (2020) — estimator non-convergence
- Peters, "The ergodicity problem in economics," *Nature Physics* 15 (2019)
- Kelly, "A New Interpretation of Information Rate" (1956)
